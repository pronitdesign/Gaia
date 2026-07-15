"use client";

/*
ScrollPhone — um único iPhone 3D persistente que viaja com o scroll.
Nasce reto de frente no card de Prontuário (Features) mostrando a tela do
prontuário, atravessa o Manifesto girando 360º e, quando vira de costas no
miolo, TROCA de tela — de modo que ao pousar no slot do Pricing já mostra a
tela "Início". Um único aparelho, duas telas. No caminho ele cruza a superfície
de água que nasce ao fim do texto do Manifesto, e reflete nela.

Técnica: overlay `fixed` full-viewport (pointer-events-none). A cada frame lê o
rect vivo de dois âncoras no DOM — [data-phone-start] e [data-phone-end] — e
interpola posição/escala/rotação por um progresso derivado do scroll. Como os
âncoras são lidos vivos, o pouso no Pricing é sempre pixel-exato, responsivo.
Desktop-only: no mobile o Pricing mantém seu próprio phone estático.

POR QUE O CANVAS É DO VIEWPORT (e não 506×900 como era):
A água usa reflexão planar, que só reflete objetos da MESMA cena 3D. Pra o phone
aparecer no reflexo, phone e água precisam dividir o Canvas — e a água atravessa
a página inteira, então o Canvas tem que cobrir o viewport.

Isso custou a posição: antes o canvas inteiro era empurrado por translate3d no
wrapper (CSS); agora o canvas está parado e quem se move é o grupo 3D. A conta de
progresso e as easings NÃO mudaram — os mesmos cx/cy em pixels são desprojetados
pro espaço do mundo em placeWorld(). Ver COMPENSAÇÃO DE ESCALA abaixo, que é a
única coisa que a mudança realmente quebrou.
*/

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera, Html } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import IPhoneModel from "@/components/iphone3d/IPhoneModel";
import Lights from "@/components/iphone3d/Lights";
import PhoneScreen from "@/components/iphone3d/PhoneScreen";
import Sky3D from "@/components/iphone3d/Sky3D";
import WaterScene, { type WaterState } from "@/components/iphone3d/WaterScene";

const TWO_PI = Math.PI * 2;
// Yaw nas duas pontas: Features reto de frente (Math.PI), Pricing em 3/4 mais
// inclinado. O giro completo (eS·2π) some por cima, então p=0 e p=1 caem
// nessas poses.
const START_YAW = Math.PI; // reto de frente, dentro do Features
const END_YAW = Math.PI - 0.34; // 3/4 mais tortinho = PHONE_POSE do Pricing
const START_TILT: [number, number] = [0, 0]; // reto, sem inclinação
const END_TILT: [number, number] = [0.1, -0.19]; // [x, z] = PHONE_POSE do Pricing
const START_G = 1.06; // grande e dominante, centralizado no card de Prontuário
const END_G = 820 / 900; // 0.911… → casa o slot 461×820 do Pricing

/* CÂMERA — precisa ser conhecida aqui fora, não só no JSX: placeWorld() roda no
   gsap.ticker (fora do React) e desprojeta pixels→mundo na mão. Se mudar no
   <PerspectiveCamera>, mude aqui. */
const CAM_Z = 4;
const CAM_FOV = 50; // default do drei <PerspectiveCamera>

/* COMPENSAÇÃO DE ESCALA — a única regressão real do canvas viewport.
   O canvas era 506×900 FIXO, então a altura visível do frustum (2·tan(fov/2)·z
   ≈ 3.73 unidades) mapeava sempre em 900px: o phone tinha tamanho em pixels
   constante em qualquer janela. Com canvas do viewport, as mesmas 3.73 unidades
   mapeiam em innerHeight px — o phone passaria a inchar/encolher com a altura da
   janela. Reescalar por 900/innerHeight desfaz exatamente isso e devolve o
   enquadramento que o Features e o Pricing foram desenhados em cima. */
const REF_H = 900;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/* posição/escala: acelera saindo do card, desacelera pousando no preço */
const easePos = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/* horizontal: fica travado no X do card até o Pricing entrar (p ≥ X_HOLD), só
   então desliza pro slot. O phone desce reto pelo Manifesto. */
const X_HOLD = 0.7;
const easeX = (t: number) => {
  const s = Math.min(1, Math.max(0, (t - X_HOLD) / (1 - X_HOLD)));
  return s * s * (3 - 2 * s); // smoothstep: sai e chega sem solavanco
};
/* giro: smootherstep concentra a rotação no miolo (Manifesto) → de costas no centro */
const easeSpin = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/* ÁGUA — a janela de vida.
   O canvas é z-[60], por cima da página inteira. Água que exista fora do
   Manifesto taparia Features, Pricing e CTA Final. Então ela nasce e morre com
   a âncora [data-water-start]: o "nascer quando o texto acaba" é consequência
   da arquitetura, não um efeito por cima dela.
   FADE_PX = distância em pixels de tela pra resolver o fade nas duas pontas. */
const FADE_PX = 260;

/** Altura visível do frustum na profundidade da câmera. */
const visibleHeight = () => 2 * Math.tan((CAM_FOV * Math.PI) / 180 / 2) * CAM_Z;

/** pixels de tela (y) → Y do mundo no plano z=0 */
const screenYToWorld = (py: number) => {
  const vh = visibleHeight();
  return -(py / window.innerHeight - 0.5) * vh;
};

export default function ScrollPhone() {
  const group = useRef<THREE.Group>(null);
  const [enabled, setEnabled] = useState(false);
  // Qual tela mostrar: false = prontuário (Features), true = Início (Pricing).
  const [showAlt, setShowAlt] = useState(false);
  // Água montada? Estado (não ref) porque montar/desmontar é o que evita pagar
  // os passes de reflexão+refração nas seções que não têm água.
  const [waterOn, setWaterOn] = useState(false);
  const water = useRef<WaterState>({ y: -10, amount: 0 });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const altRef = { current: false };
    const wetRef = { current: false };

    /* Posiciona o grupo 3D a partir de coordenadas de TELA. É aqui, e só aqui,
       que mora a diferença do canvas viewport: a conta de p, as easings e os
       cx/cy em pixels são idênticos ao que eram quando isto era CSS. */
    const placeWorld = (cx: number, cy: number, g: number) => {
      const el = group.current;
      if (!el) return;
      const vh = visibleHeight();
      const vw = vh * (window.innerWidth / window.innerHeight);
      el.position.set(
        (cx / window.innerWidth - 0.5) * vw,
        screenYToWorld(cy),
        0,
      );
      el.scale.setScalar(g * (REF_H / window.innerHeight));
    };

    const place = (p: number) => {
      const start = document.querySelector<HTMLElement>("[data-phone-start]");
      const end = document.querySelector<HTMLElement>("[data-phone-end]");
      if (!start || !end) return;
      const a = start.getBoundingClientRect();
      const b = end.getBoundingClientRect();
      const eP = easePos(p);
      const eS = easeSpin(p);
      const cx = lerp(a.left + a.width / 2, b.left + b.width / 2, easeX(p));
      const cy = lerp(a.top + a.height / 2, b.top + b.height / 2, eP);
      placeWorld(cx, cy, lerp(START_G, END_G, eP));
      if (group.current) {
        group.current.rotation.set(
          lerp(START_TILT[0], END_TILT[0], eP),
          lerp(START_YAW, END_YAW, eP) + eS * TWO_PI, // 3/4 nas pontas + giro completo
          lerp(START_TILT[1], END_TILT[1], eP),
        );
      }
      // Troca de tela quando o aparelho passa das costas (eS > 0.5) — a troca
      // fica escondida atrás dele. Só dispara render no cruzamento.
      const wantAlt = eS > 0.5;
      if (wantAlt !== altRef.current) {
        altRef.current = wantAlt;
        setShowAlt(wantAlt);
      }
    };

    /* A água segue a âncora do Manifesto. amount cai a zero nas duas pontas pra
       ela não vazar por cima das seções vizinhas (o canvas é z-[60]). */
    const placeWater = () => {
      const anchor = document.querySelector<HTMLElement>("[data-water-start]");
      if (!anchor) {
        water.current.amount = 0;
        if (wetRef.current) {
          wetRef.current = false;
          setWaterOn(false);
        }
        return;
      }
      const y = anchor.getBoundingClientRect().top;
      const H = window.innerHeight;
      // Entra quando a âncora sobe pela base da tela; sai quando cruza o topo.
      const fadeIn = Math.min(1, Math.max(0, (H - y) / FADE_PX));
      const fadeOut = Math.min(1, Math.max(0, y / FADE_PX));
      const amount = Math.min(fadeIn, fadeOut);
      water.current.amount = amount;
      water.current.y = screenYToWorld(y);

      const wet = amount > 0.001;
      if (wet !== wetRef.current) {
        wetRef.current = wet;
        setWaterOn(wet);
      }
    };

    // reduced-motion: sem viagem — estaciona no slot do Pricing (tela Início).
    // E sem água: ela é movimento por definição, e o custo dos passes de
    // reflexão não se justifica pra quem pediu pra não se mexer.
    if (reduce) {
      const park = () => place(1);
      park();
      window.addEventListener("resize", park);
      window.addEventListener("scroll", park, { passive: true });
      return () => {
        window.removeEventListener("resize", park);
        window.removeEventListener("scroll", park);
      };
    }

    const update = () => {
      const start = document.querySelector<HTMLElement>("[data-phone-start]");
      const end = document.querySelector<HTMLElement>("[data-phone-end]");
      if (!start || !end) return;
      const a = start.getBoundingClientRect();
      const b = end.getBoundingClientRect();
      const startC = a.top + a.height / 2;
      const endC = b.top + b.height / 2;
      // Pouso (p=1) quando o centro do slot cruza 72% do viewport — não 50%
      // (centro), pra dar tempo do phone assentar visualmente no slot antes
      // que a seção termine de entrar no viewport.
      const target = window.innerHeight * 0.72;
      const dist = endC - startC; // ~constante (distância entre os âncoras)
      const p = dist === 0 ? 0 : Math.min(1, Math.max(0, (target - startC) / dist));
      place(p);
      placeWater();
    };

    gsap.ticker.add(update);
    update();
    return () => gsap.ticker.remove(update);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] hidden lg:block">
      <Canvas className="!absolute inset-0" gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
        <ambientLight intensity={0.3} />
        <PerspectiveCamera makeDefault position={[0, 0, CAM_Z]} fov={CAM_FOV} />
        <Lights />
        {/* Céu e água só existem na janela do Manifesto — ver placeWater(). */}
        {waterOn && (
          <Suspense fallback={null}>
            <Sky3D />
            <WaterScene stateRef={water} />
          </Suspense>
        )}
        <Suspense fallback={<Html center>Carregando…</Html>}>
          <group ref={group}>
            <IPhoneModel
              glb="/models/scene.glb"
              bodyColor="#8F8A81"
              screen={showAlt ? <PhoneScreen variant="inicio" /> : <PhoneScreen variant="prontuario" />}
              scale={[16.5, 16.5, 16.5]}
            />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}

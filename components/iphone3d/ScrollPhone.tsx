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
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Html } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import IPhoneModel from "@/components/iphone3d/IPhoneModel";
import Lights from "@/components/iphone3d/Lights";
import PhoneScreen from "@/components/iphone3d/PhoneScreen";
import Sky3D from "@/components/iphone3d/Sky3D";
import WaterScene, { WATER_Y, type WaterState } from "@/components/iphone3d/WaterScene";

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

/* CÂMERA — conhecida aqui fora porque place() roda no gsap.ticker, fora do
   React. Se mudar no <PerspectiveCamera>, mude aqui. */
const CAM_Z = 4;
const CAM_FOV = 50; // default do drei <PerspectiveCamera>

/* O MERGULHO.

   A câmera não fica parada: conforme o Manifesto acaba, ela DESCE e INCLINA em
   direção à superfície, até a água tomar o quadro. É isso que faz "entrar na
   água" em vez de "olhar a água de longe".

   Por que a inclinação é necessária, e não decoração: pra uma câmera nivelada, o
   horizonte de um plano horizontal cai SEMPRE na linha do olho — o centro exato
   da tela — e a água nunca passa da metade de baixo. Não tem tuning que escape
   disso; é geometria. Inclinando pra baixo, o horizonte sobe e a água engole o
   quadro. (A peachweb resolve o mesmo problema por outro caminho: colinas atrás
   da água escondem a borda e o horizonte verdadeiro nunca aparece. Nós não temos
   paisagem, então inclinamos.)

   DIVE_PITCH — quanto a câmera baixa o olhar no fundo do mergulho.
   DIVE_DROP  — quanto ela desce, em unidades de mundo, rumo à superfície.
                Para logo ACIMA de WATER_Y: a câmera não atravessa de fato — quem
                entrega o "dentro d'água" é o Pricing (ver Underwater.tsx), e o
                shader do Water2 não foi feito pra ser olhado por baixo. */
const DIVE_PITCH = -0.30; // ~17°
const DIVE_DROP = 0.9;
/** Quanto o phone encolhe no pico do mergulho. Ver o uso em placeWorld. */
const DIVE_SHRINK = 0.42;

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

/* ÁGUA E MERGULHO — a janela, em p (o progresso do PHONE).

   Isto já foi dirigido pela âncora [data-water-start] do Manifesto, e estava
   errado de um jeito que só a medição mostrou: durante o mergulho inteiro o
   phone estava em cy ≈ 1105–1153, com viewport de 900 — ou seja, 250px ABAIXO
   da dobra. A água chegava quando ele já tinha saído de quadro. Nenhum ângulo de
   câmera conserta isso, porque o problema era tempo, não geometria: a
   trajetória do phone pertence às âncoras Features→Pricing, o mergulho pertencia
   ao Manifesto, e os dois foram calibrados sem saber um do outro.

   Agora os dois saem de p. Eles se encontram por construção, e continuam se
   encontrando se alguém retunar X_HOLD, easePos ou a altura das seções — que é
   justamente o tipo de coisa que muda sem avisar.

   A janela é um bump: 0 no Features, cheia no miolo do Manifesto, 0 de volta no
   Pricing. A câmera volta a nivelar pra o phone pousar certo no slot, e quem
   carrega o "ainda estamos dentro d'água" dali em diante é o Pricing (ver
   Underwater.tsx). O canvas é z-[60], por cima da página inteira: a água PRECISA
   morrer antes do Pricing, senão boia sobre os cards. */
const DIVE_FROM = 0.3;
const DIVE_TO = 0.72;

/* Onde o phone deita.
   No fundo do mergulho ele fica NA HORIZONTAL e entra pela metade — deitado na
   superfície, cortado por ela. É a pose do mergulho, e ela tem que resolver de
   volta em 0 nas duas pontas, senão o phone chega torto no slot do Pricing (que
   espera END_TILT) ou no card do Features (que espera reto). Daí ser um bump e
   não um lerp. */
const DIVE_ROLL = Math.PI / 2;

/** bump: 0 nas pontas, 1 no meio, sem canto vivo. */
const bump = (t: number) => {
  const s = Math.min(1, Math.max(0, t));
  return Math.sin(s * Math.PI) ** 2;
};

/* Entrega a câmera ATIVA pro gsap.ticker, que roda fora do React.

   Pega do useThree e não de um ref no <PerspectiveCamera> de propósito: o
   makeDefault do drei resolve qual câmera é a default por efeito, e o ticker
   começa a rodar antes disso. Com o ref cru, placeWorld() saía cedo no
   `if (!camera) return` e o grupo ficava na origem — com o modelo em escala 16.5
   e a câmera em z=4, isso põe a câmera DENTRO do aparelho, olhando as faces
   internas, que são descartadas. A tela ficava vazia e não havia erro nenhum
   pra explicar. useThree devolve a câmera que o renderer realmente usa. */
function CameraBridge({
  camRef,
}: {
  camRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useEffect(() => {
    camRef.current = camera;
    return () => {
      camRef.current = null;
    };
  }, [camera, camRef]);
  return null;
}

export default function ScrollPhone() {
  const group = useRef<THREE.Group>(null);
  const cam = useRef<THREE.PerspectiveCamera>(null);
  const [enabled, setEnabled] = useState(false);
  // Qual tela mostrar: false = prontuário (Features), true = Início (Pricing).
  const [showAlt, setShowAlt] = useState(false);
  // Água montada? Estado (não ref) porque montar/desmontar é o que evita pagar
  // os passes de reflexão+refração nas seções que não têm água.
  const [waterOn, setWaterOn] = useState(false);
  const water = useRef<WaterState>({ amount: 0 });
  // 0→1 do mergulho. Escrito por placeWater(), lido por place() — o phone deita
  // no mesmo compasso em que a câmera afunda.
  const dive = useRef(0);

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

    const ndc = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const onScreen = new THREE.Vector3();
    const onWater = new THREE.Vector3();

    /* Posiciona o grupo 3D a partir de coordenadas de TELA, usando a MATRIZ da
       câmera — não trigonometria à mão.

       A primeira versão calculava a altura visível do frustum e dividia
       (`-(cy/H - 0.5) · 2·tan(fov/2)·z`). Aquilo assume câmera nivelada olhando
       por -Z, e era verdade até a câmera começar a inclinar no mergulho. Com
       pitch, aquela conta põe o phone no lugar errado — e pior, erra mais quanto
       mais dramático o mergulho, que é exatamente onde se olha.

       unproject() usa a matrizWorld real, então funciona pra qualquer pose. O
       phone fica na tela onde o layout mandou, inclinando a câmera ou não.
       Manter a distância fixa em CAM_Z preserva o tamanho em tela: perspectiva
       encolhe com a distância, e é a distância que seguramos. */
    const placeWorld = (cx: number, cy: number, g: number) => {
      const el = group.current;
      const camera = cam.current;
      if (!el || !camera) return;
      camera.updateMatrixWorld();
      ndc.set(
        (cx / window.innerWidth) * 2 - 1,
        -((cy / window.innerHeight) * 2 - 1),
        0.5,
      );
      ndc.unproject(camera);
      dir.copy(ndc).sub(camera.position).normalize();
      onScreen.copy(camera.position).addScaledVector(dir, CAM_Z);

      /* NO MERGULHO O PHONE SOLTA DO DOM.

         Fora do mergulho ele é escravo do layout: nasce no card de Prontuário e
         pousa no slot do Pricing, pixel-exato, lendo os rects vivos. Isso é
         inegociável nas duas pontas.

         No meio, não dá pra ser as três coisas ao mesmo tempo — colado à tela,
         com a câmera se movendo, e cruzando uma água estática. É uma posição com
         três donos. Medido: com pitch de 17° e queda de 0.9, a tela em cy=698
         cai no mundo em y ≈ -3.0, e a água está em -1.2. O phone não cruzava a
         superfície, afundava 1.8 abaixo dela e escurecia.

         Então no pico do mergulho ele vai pra SUPERFÍCIE (mesmo x, y = WATER_Y):
         deitado, cortado pela linha d'água, entrando pela metade. O lerp por dive
         devolve ele ao layout nas duas pontas, sem costura, porque dive é um bump
         que morre em 0 lá. */
      onWater.set(onScreen.x, WATER_Y, onScreen.z);
      el.position.lerpVectors(onScreen, onWater, dive.current);

      /* Na superfície o phone fica mais perto da câmera (ela desceu até quase
         rasar a água), e perspectiva o infla até encher o quadro. DIVE_SHRINK
         devolve o respiro — é enquadramento, não escala real. */
      const shrink = 1 - DIVE_SHRINK * dive.current;
      el.scale.setScalar(g * (REF_H / window.innerHeight) * shrink);
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
        // No fundo do mergulho o phone deita na superfície, no MESMO compasso da
        // câmera. dive já é um bump (0 → 1 → 0), então ele resolve sozinho de
        // volta em 0 nas duas pontas — o Features espera reto, o Pricing espera
        // END_TILT. Não passar por bump() de novo: bump(bump(x)) é outra curva.
        const roll = DIVE_ROLL * dive.current;
        group.current.rotation.set(
          lerp(START_TILT[0], END_TILT[0], eP),
          lerp(START_YAW, END_YAW, eP) + eS * TWO_PI, // 3/4 nas pontas + giro completo
          lerp(START_TILT[1], END_TILT[1], eP) + roll,
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

    /* A água é FIXA no mundo; quem se move é a CÂMERA. Ela baixa o olhar e
       afunda rumo à superfície — a água toma o quadro porque nos aproximamos
       dela, não porque ela cresceu.

       Dirigido por p: ver ÁGUA E MERGULHO acima pro porquê. */
    const placeWater = (p: number) => {
      const camera = cam.current;
      const d = bump((p - DIVE_FROM) / (DIVE_TO - DIVE_FROM));
      dive.current = d;
      water.current.amount = d;

      if (camera) {
        camera.rotation.x = DIVE_PITCH * d;
        camera.position.y = -DIVE_DROP * d;
      }

      const wet = d > 0.001;
      if (wet !== wetRef.current) {
        wetRef.current = wet;
        setWaterOn(wet);
      }
    };

    // reduced-motion: sem viagem — estaciona no slot do Pricing (tela Início).
    // E sem água: ela é movimento por definição, e o custo dos passes de
    // reflexão não se justifica pra quem pediu pra não se mexer.
    if (reduce) {
      // placeWater(1) primeiro: em p=1 o bump vale 0, então isso nivela a câmera
      // e zera a água. Sem ele a câmera fica com a pose do último frame e o
      // phone pousa desprojetado de uma câmera torta.
      const park = () => {
        placeWater(1);
        place(1);
      };
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
      // placeWater ANTES de place: ele move a câmera e escreve dive, e place lê
      // os dois (desprojeta pela matriz da câmera, e deita o phone por dive).
      // Invertido, o phone fica um frame atrás da câmera — e um frame de atraso
      // num mergulho com pitch aparece como tremor.
      placeWater(p);
      place(p);
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
        <CameraBridge camRef={cam} />
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

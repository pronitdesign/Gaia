"use client";

/*
ScrollPhone — um único iPhone 3D persistente que viaja com o scroll.
Nasce reto de frente no card de Prontuário (Features) mostrando a tela do
prontuário, atravessa o Manifesto girando 360º e, quando vira de costas no
miolo, TROCA de tela — de modo que ao pousar no slot do Pricing já mostra a
tela "Início". Um único aparelho, duas telas. Entre o Manifesto e o Pricing ele
atravessa a seção Mergulho, onde deita na superfície da água e reflete nela.

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
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Html } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import { getLenis } from "@/lib/lenis";
import IPhoneModel from "@/components/iphone3d/IPhoneModel";
import Lights from "@/components/iphone3d/Lights";
import PhoneScreen from "@/components/iphone3d/PhoneScreen";
import Sky3D from "@/components/iphone3d/Sky3D";
import WaterScene, { WATER_Y, type WaterState } from "@/components/iphone3d/WaterScene";
import { DIVE_STOPS, SKY_STOPS, sampleStops } from "@/lib/sky";

const TWO_PI = Math.PI * 2;
// Yaw nas duas pontas: Features reto de frente (Math.PI), Pricing em 3/4 mais
// inclinado. O giro completo (eS·2π) some por cima, então p=0 e p=1 caem
// nessas poses.
const START_YAW = Math.PI; // reto de frente, dentro do Features
const END_YAW = Math.PI - 0.34; // 3/4 mais tortinho = PHONE_POSE do Pricing
const START_TILT: [number, number] = [0, 0]; // reto, sem inclinação
const END_TILT: [number, number] = [0.1, -0.19]; // [x, z] = PHONE_POSE do Pricing
const START_G = 1.06; // grande e dominante, centralizado no card de Prontuário
// END_G morreu como constante — virou lerp(START_G, endG, eP) em place(), com
// endG derivado do rect AO VIVO de [data-phone-end] a cada frame (ver
// PHONE_FILL abaixo pra fórmula exata). Era 820/900 fixo, calibrado à mão
// pro slot 461×820 do Pricing; quando o Pricing mudou de tamanho (405×720,
// depois breakpoints em px), o número ficou pra trás e o phone passou a
// renderizar maior que o espaço reservado, cobrindo o texto ao lado.
// Constante e DOM não têm como ficar sincronizados por acordo tácito — só
// lendo o rect é que o slot vira fonte única da verdade.
//
// Mas ler `rect.height/REF_H` sozinho não bastou: medido no render, o phone
// só preenchia ~75% da altura do slot (508/676 em xl, 372/498 em lg) — o
// resto virava buraco morto no rodapé do card, porque o slot dita a altura
// do CARD (ver Pricing.tsx) mas o phone não dita a altura do SLOT. PHONE_FILL
// é essa razão medida; dividir endG por ela faz a altura RENDERIZADA do
// phone igualar a altura do slot, então "reservar 500px" passa a significar
// "o phone tem 500px", não "o phone tem 375px dentro de uma moldura de
// 500px". Não é uma constante que sobrevive a qualquer mudança de
// modelo/pose sem reconferir — é a mesma calibração manual que END_G sempre
// foi, só que agora RELATIVA (fração do slot), não absoluta (px fixo), e
// por isso sobrevive a qualquer tamanho de slot que o Pricing declarar.
const PHONE_FILL = 0.75;
// Com PHONE_FILL certo, o phone ainda pousava DESLOCADO pra cima dentro do
// slot — 30px de folga em cima contra 138px embaixo, medido @1440 (14 vs
// 112 @1024, mesma proporção). Não é erro de escala: é o PIVOT do glb, que
// não fica no centro visual do aparelho (ver IPhoneModel — a malha nunca
// foi centrada no local origin). placeWorld mira a ORIGEM do group no
// centro do slot; se a malha visual fica acima dessa origem, o efeito é o
// aparelho inteiro nascer alto. Corrigido em place(): o alvo vertical usado
// pro pouso soma uma fração da altura do slot, então a origem mira um pouco
// ABAIXO do centro geométrico — o suficiente pra o CENTRO VISUAL do phone
// (não a origem) acabar no centro do slot.
const PHONE_PIVOT_BIAS = 0.12; // fração de rect.height, medida no render (xl/lg)

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
/* DIVE_PITCH era -0.30 (~17°), que punha o horizonte a 17% da tela. Fundo o
   bastante pra água tomar a metade de baixo, raso demais pra ela tomar o
   QUADRO — e era por isso que a saída lia como "a água evaporou": quando
   u_amount caía, ainda havia 17% de céu e um horizonte visível pra contrastar
   com o que sumia.

   -0.44 (~25°) põe o horizonte em ~2%: água de borda a borda. É o quadro
   uniforme em que o fade não tem contra o que ser visto. A conta é
   horizonFrac(pitch) = 0.5·(1 + tan(pitch)/tan(fov/2)); com fov 50, tan(25°) =
   0.466, e tan(0.44) = 0.472 zera a fração. Não é gosto: é o ângulo em que a
   linha d'água encosta no topo. */
/* O PLANO-PARTIDO — e por que o pitch é ZERO.

   Este número já foi -0.30 e -0.44, sempre pela mesma ideia: baixar o olhar pra
   água tomar mais quadro. A ideia era errada pro que a seção quer ser.

   horizonFrac(pitch) = 0.5·(1 + tan(pitch)/tan(fov/2)). Em ZERO ela dá 0.5 —
   e dá 0.5 pra QUALQUER altura de câmera, porque o horizonte de um plano
   horizontal cai na altura do olho e ponto. Ou seja: nivelada, a linha d'água
   é um risco reto no CENTRO da tela, sempre, de graça. Céu em cima, água
   embaixo, corte duro no meio — a composição do tiro do iceberg sai da
   geometria, não de tuning.

   Inclinar um grau que seja reabre o plano em perspectiva e o risco vira faixa
   enevoada. Era exatamente o que se via antes: um campo lavanda sem linha.

   DIVE_DROP continua parando ACIMA da água (0.9 < WATER_Y 1.2): o Water2 é
   FrontSide e SOME visto por baixo — renderizado e conferido, o quadro fica só
   o skydome. A câmera não atravessa; quem atravessa é o PHONE. */
const DIVE_PITCH = 0; // nivelada: o risco cai no centro, em qualquer altura
const DIVE_DROP = 0.9;
/* Quanto o pico da CÂMERA vem depois do pico da água, em p.

   Zero = o comportamento antigo (câmera e água no mesmo bump, a linha d'água
   desce junto com o fade e dá pra ver a água apagando). Positivo atrasa a
   câmera: quando u_amount começa a cair (dive < 0.22, ~p = wp+0.21), o pitch
   ainda está perto do fundo e o quadro é quase só água.

   0.12 é o maior atraso que ainda deixa a câmera NIVELAR em p=1 com folga —
   ver camSpan em place(). Mais que isso e o phone chega ao slot do Pricing
   visto por uma câmera ainda inclinada. */
const CAM_LAG = 0.12;
/** Quanto o phone encolhe no pico do mergulho. Ver o uso em placeWorld. */
const DIVE_SHRINK = 0.42;
/** Abaixo deste dive o piso da água larga o phone. Ver o uso em placeWorld. */
const FLOOR_FADE = 0.15;
/** Em quanto de p, depois de wp, o piso solta o phone pra ele afundar. Ver
 *  floorGrip: curto demais e ele cai 150px de uma vez; longo demais e ele
 *  cavalga a linha d'água subindo, que é o bug que isto conserta. */
const FLOOR_RELEASE = 0.14;

/* A TINTA DO SUBMERSO — a metade de baixo do plano-partido (ver splitPaint).

   O risco sai da geometria (pitch 0 põe o horizonte no centro), mas sozinho ele
   é invisível: céu lavanda contra água lavanda não é corte, é um campo só. Foi
   o que se viu no render. O que faz o tiro do iceberg é o CONTRASTE — pálido em
   cima, fundo embaixo — e é isto que o pinta.

   multiply: branco não mexe, cor tinge. Mesma física de Underwater.tsx — sobre
   o phone claro a água TINGE, jamais lava, e o corpo escuro não vira azul.

   Da MESMA família do uDeep do Pricing (#7FA3CE): quem cruza esta linha cai no
   submerso de lá segundos depois, e trocar de água no meio do caminho é o tipo
   de emenda que esta seção existe pra evitar. Raso e claro logo abaixo da
   linha; fundo no pé do quadro. */
const SUBMERGED_TOP = "#A8C2E0";
const SUBMERGED_DEEP = "#5E87B8";
/** Espessura do corte, em % da tela. O risco é DURO — mas 0 serrilha e cintila
 *  quando a linha anda entre frames. */
const SPLIT_FEATHER = 0.3;
/** Em que faixa de p a tinta entrega o dentro-d'água pro submerso do Pricing.
 *  Tem que FECHAR antes do pouso: o canvas é z-[60] e uma tinta viva em p=1
 *  pintaria de azul a metade de baixo dos cards e do preço. */
const TINT_OUT: [number, number] = [0.86, 0.96];

/* NÉVOA — o que entrega a seção nas bordas da janela.

   ATENÇÃO: ela NÃO apaga o horizonte, e este arquivo já afirmou que sim. Não
   afirma mais porque foi medido. Quem apaga o horizonte é o alpha da água (ver
   u_fade em WaterComplex).

   Por que a névoa não pode fazer aquilo, e nenhum número salvaria: no pico do
   mergulho o olho fica ~0.38 acima da superfície. Num plano horizontal, distância
   vira altura de tela por atan(0.38/r) — que satura brutalmente. Com FOG_FAR=320,
   o ponto 100% enevoado cai a 0.05° abaixo do horizonte: UM PIXEL. A rampa
   inteira da névoa vivia dentro do último pixel do quadro, enquanto os ~700px de
   água visível estavam todos em r<30, praticamente sem névoa nenhuma. Medido: a
   água em y=190 tinha 3.7% de névoa, e de y=182 a y=900 a cor não se movia — um
   degrau seco de (181,165,207) pra (151,123,187) na linha do horizonte. Foi por
   isso que ele sobreviveu a tantas rodadas de tuning aqui.

   O que a névoa AINDA faz, e bem: fechar (near→0, far→HAZE_FAR) nas pontas da
   janela e engolir a cena até o quadro virar uma cor só. É nesse quadro que a
   água desmonta sem ninguém ver, e é o oposto na entrada — ela nasce de dentro da
   névoa. Isso é distância CURTA (HAZE_FAR=3, menor que CAM_Z), e distância curta
   a geometria acima não estraga. É como a peachweb entrega a seção dela.

   A cor da névoa não pode ser fixa: tem que ser a cor do céu na altura do
   horizonte, e essa altura muda por frame (a câmera inclina, a seção rola). Um
   hex fixo casa num frame e deixa degrau em todos os outros. Por isso FogSync
   amostra os stops por frame — e continua valendo pro fechamento das pontas.

   FOG_NEAR/FOG_FAR são a névoa ABERTA, no pico: na prática, névoa nenhuma no que
   se vê. Mantidos porque são o alvo do lerp de abertura, não porque a distância
   deles signifique alguma coisa em quadro.

   É como a peachweb resolve, e é o oposto do que eu vinha tentando. Eu passei
   rodadas caçando a linha do horizonte pra escondê-la. Eles não escondem: no fim
   do mergulho a cena INTEIRA deles — água, horizonte, colinas, peixe — dissolve
   num leite uniforme, e o conteúdo emerge de dentro dele. Não há linha porque não
   há contraste; tudo virou um valor só.

   Então a névoa fecha (near→0, far→HAZE_FAR) conforme dive cai. No limite o
   quadro inteiro é uma cor chapada — a cor do céu ali — e é NESSE quadro que a
   água desmonta. Desmontar sem contraste é invisível: acabou o corte, acabou o
   pop, acabou o véu translúcido. E na entrada é o mesmo de trás pra frente: a
   água NASCE de dentro da névoa em vez de aparecer. */
const FOG_NEAR = 20;
const FOG_FAR = 320;
/** Névoa fechada: menor que CAM_Z (4), então engole até o phone. */
const HAZE_FAR = 3;
/** Acima deste dive a névoa já abriu por completo. Abaixo, ela vai fechando. */
const HAZE_UNTIL = 0.42;

/* Onde o horizonte cai, em fração da tela, dada a inclinação da câmera.
   Elevação 0 ⇒ screenFrac = 0.5·(1 + tan(pitch)/tan(fov/2)). Nivelada dá 0.5 (o
   centro, como manda a geometria); inclinando pra baixo o horizonte sobe. */
const horizonFrac = (pitch: number) =>
  0.5 * (1 + Math.tan(pitch) / Math.tan((CAM_FOV * Math.PI) / 180 / 2));

function FogSync({ diveRef }: { diveRef: React.MutableRefObject<number> }) {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useFrame(() => {
    const fog = scene.fog as THREE.Fog | null;
    if (!fog) return;

    /* A névoa fecha nas bordas da janela — ver NÉVOA. No pico ela é só
       distância; saindo, ela engole a cena até o quadro virar uma cor só, e é
       nesse quadro que a água desmonta sem ninguém ver. */
    const open = smoothstep(0, HAZE_UNTIL, diveRef.current);
    fog.near = lerp(0, FOG_NEAR, open);
    fog.far = lerp(HAZE_FAR, FOG_FAR, open);

    const hy = horizonFrac(camera.rotation.x) * window.innerHeight;

    /* QUAL céu está na altura do horizonte?

       Não é sempre o do Mergulho, e supor que era foi o bug: no pico a câmera
       inclina ~17°, o horizonte sobe pra ~19% da tela, e nessa altura quem está
       atrás ainda é o MANIFESTO. Medido: emenda das seções em y=315, horizonte
       em y=176 — 140px acima dela.

       Com a névoa amostrando DIVE_STOPS ali, ela dava #FAF9F5 (branco) contra um
       céu que era #EFEBEC — e a diferença aparecia como uma faixa branca
       atravessando a tela. Exatamente o corte que a névoa existia pra apagar.

       Então perguntamos ao DOM de quem é aquela altura, e amostramos o gradiente
       DAQUELA seção. */
    const dive = document.querySelector<HTMLElement>("[data-sky-dive]");
    const manifesto = document.querySelector<HTMLElement>("[data-sky-manifesto]");
    const pick = (el: HTMLElement | null, stops: typeof DIVE_STOPS) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || hy < r.top || hy > r.bottom) return null;
      return sampleStops(stops, (hy - r.top) / r.height);
    };

    const rgb = pick(dive, DIVE_STOPS) ?? pick(manifesto, SKY_STOPS);
    if (rgb) fog.color.setRGB(rgb[0], rgb[1], rgb[2]);
  });
  return null;
}

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

/* ÁGUA E MERGULHO — a janela nasce da ÂNCORA, não de constantes.

   Duas tentativas anteriores erraram por fixar a janela num número:

     - dirigida pela âncora do Manifesto: durante o mergulho inteiro o phone
       estava em cy 1105–1153, com viewport de 900. A água chegava depois dele
       sair de quadro.
     - dirigida por um p fixo: o pico caía em p=0.51, com o segundo texto ainda
       em cena (base 149). Empurrar a janela pra frente fazia o mergulho
       atropelar o pouso no Pricing.

   O phone está na água quando o percurso dele chega ao ponto de passagem — isto
   é, quando eP == wp, com wp derivado do rect VIVO de [data-phone-water]. Então
   é wp que dita o pico. Assim a janela se realinha sozinha se alguém mudar a
   altura do Mergulho, do Manifesto, das seções acima, ou retunar easePos/X_HOLD.
   Nada disso precisa saber que a água existe.

   DIVE_SPAN — quanto de eP o mergulho ocupa de cada lado de wp. O bump morre nas
   duas pontas, então a câmera nivela e o phone pousa certo no slot. Quem carrega
   o "ainda estamos dentro d'água" dali em diante é o Pricing (Underwater.tsx). O
   canvas é z-[60], sobre a página inteira: a água PRECISA morrer antes do
   Pricing, senão boia sobre os cards. */
const DIVE_SPAN = 0.3;

/* Quanto o phone se inclina ao cruzar a água. TETO: 20°.

   Já foi 90° — o aparelho deitava na horizontal, encostava na superfície e era
   cortado por ela. Bonito parado, demais em movimento: lia como o phone
   tombando, não como uma travessia.

   20° é teto, não alvo. O ângulo final soma com o tilt de percurso:

     rotation.z = lerp(START_TILT[1], END_TILT[1], eP) + roll

   e END_TILT[1] é NEGATIVO (-0.19, a pose que ele leva pro slot do Pricing), então
   ele cancela parte disto em vez de somar — no pico o total fica em ~11°. Se um
   dia END_TILT virar positivo, esta soma passa dos 20° sem ninguém perceber.

   Continua sendo dirigido por dive, que é um bump: resolve em 0 nas duas pontas,
   senão o phone chega torto no slot do Pricing ou no card do Features. */
const DIVE_ROLL = (20 * Math.PI) / 180;

/** bump: 0 nas pontas, 1 no meio, sem canto vivo. */
const bump = (t: number) => {
  const s = Math.min(1, Math.max(0, t));
  return Math.sin(s * Math.PI) ** 2;
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
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
  // flow começa em 1 (mar correndo): a ENTREGA (ver deliver()) é a única
  // coisa que o zera, e só no trecho travado do pico.
  const water = useRef<WaterState>({ amount: 0, flow: 1 });
  // 0→1 do mergulho. Escrito por setDive() e lido por placeWorld() no MESMO
  // frame — o phone deita no mesmo compasso em que a câmera afunda.
  const dive = useRef(0);
  // PISO do mergulho: fora da entrega fica 0 e dive volta a ser só o bump de
  // sempre (Math.max com 0 é no-op). Durante a entrega ele é o que segura o
  // phone deitado na água enquanto o gsap rola a página sozinho — sem um
  // piso, dive voltaria a cair assim que p passasse de wp, e o "quadro
  // travado" da entrega nunca existiria.
  const hold = useRef(0);
  /* Quanto a superfície ainda SEGURA o phone (piso). Ref, não constante,
     porque a resposta muda no meio do mergulho.

     Na APROXIMAÇÃO ele tem que boiar: sem piso o alvo do DOM o põe em worldY
     -3.08 contra uma água em -1.2 — medido — e ele afunda 1.9 abaixo da
     superfície e escurece em vez de cruzá-la. Esse foi o bug que criou o
     clamp.

     Depois de wp, AFUNDAR É O PONTO: é o phone entrando no Pricing enquanto a
     linha d'água sobe por cima dele. O piso, que antes salvava, passa a
     prender os dois justo quando têm que se separar — com a câmera funda
     (DIVE_PITCH -0.44) ele fazia o aparelho CAVALGAR a linha d'água até o topo
     e sair de quadro. Não era o clamp errado: era o clamp certo, tarde demais. */
  const floorGrip = useRef(0);
  /* O elemento DOM que pinta o "dentro d'água" abaixo do risco. Ref e escrito
     por frame de dentro do gsap.ticker — ver splitPaint. Estado seria
     re-render do React a 120fps. */
  const submergedEl = useRef<HTMLDivElement>(null);
  /** Quanto do dentro-d'água pintar. Curva própria, não o bump — ver TINT. */
  const tint = useRef(0);

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
    // armed: pode disparar a entrega. Começa FALSE — o gatilho é uma
    // TRAVESSIA (armar embaixo, cruzar em cima), não um estado, e só quem foi
    // visto ACIMA da linha d'água pode cruzá-la. Começar true sequestraria
    // quem chega com o scroll já restaurado abaixo de wp: reload no meio da
    // página, voltar pelo histórico, ou um deep-link direto pro Pricing — o
    // browser restaura o scrollY ANTES deste efeito montar, o primeiro
    // update() já acha p >= wp, e alguém que nunca olhou pra água seria
    // arrastado por ela. O mesmo branch de histerese que rearma subindo
    // (p < wp − 0.02, abaixo) também arma na carga: quem carrega no topo
    // passa por cima da água antes de chegar em wp e arma no caminho — o
    // fluxo normal não muda em nada. delivering: a cena já tomou o scroll —
    // existe pra barrar retrigger (o phone continua cruzando p>=wp durante a
    // própria entrega) e pra place() saber que hold, não bump, é quem manda.
    const armed = { current: false };
    const delivering = { current: false };
    // referência viva da timeline em voo — o escape (item d) e o cleanup
    // (item f) precisam matar a MESMA instância, não uma nova.
    let deliverTl: gsap.core.Timeline | null = null;

    const ndc = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const onScreen = new THREE.Vector3();

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
       encolhe com a distância, e é a distância que seguramos.

       NO MERGULHO O PHONE SOLTA DO DOM.

       Fora do mergulho ele é escravo do layout: nasce no card de Prontuário e
       pousa no slot do Pricing, pixel-exato, lendo os rects vivos. Isso é
       inegociável nas duas pontas.

       No meio, não dá pra ser as três coisas ao mesmo tempo — colado à tela,
       com a câmera se movendo, e cruzando uma água estática. É uma posição com
       três donos. Medido: com pitch de 17° e queda de 0.9, a tela em cy=698
       cai no mundo em y ≈ -3.0, e a água está em -1.2. O phone não cruzava a
       superfície, afundava 1.8 abaixo dela e escurecia.

       Este bloco escreve a posição PROJETADA (onScreen) e já resolve o
       encontro com a água: clamp da ORIGEM do group em WATER_Y logo abaixo
       (ver o comentário ali pro porquê do clamp simples, e não por bbox). */
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
      // CLAMP DA ORIGEM, NÃO DA BBOX — esta segunda tentativa (a primeira foi
      // a origem crua, sem clamp nenhum, que afundava o phone visivelmente
      // abaixo d'água) já passou por um caminho mais sofisticado e ele
      // FALHOU. Registrando pra ninguém repetir:
      //
      // A tentativa era medir a bbox REAL do group depois da rotação
      // (box.setFromObject(el, false)) e subir o group só o quanto faltasse
      // pro FUNDO da bbox — não a origem — encostar em WATER_Y. Parecia mais
      // correto (o pivot do glb não é o centro visual, ver PHONE_PIVOT_BIAS),
      // mas box.setFromObject no modo não-preciso transforma os 8 CANTOS do
      // bbox local cacheado de cada mesh pela matriz de mundo — não os
      // vértices reais. Pra um corpo fino e comprido como o phone, rotacionado
      // (~40° de yaw efetivo no pico do mergulho, mais tilt/roll), isso infla
      // o AABB muito além do que o corpo ocupa de verdade: a rotação joga os
      // cantos da caixa local pra longe, em direções que a malha real nunca
      // alcança.
      //
      // Medido no pico (dive≈0.96): bbox não-precisa deu minY = -4.04; a bbox
      // PRECISA (setFromObject(el, true), por vértice) deu minY = -1.17 — e o
      // fundo visível REAL já estava a 0.025 de WATER_Y (-1.2), praticamente
      // encostado. Overshoot de ~2.87 unidades, quase 2× a altura do próprio
      // phone (~1.40). O lift calculado em cima do número errado erguia o
      // aparelho bem mais que o necessário e abria um vão visível entre a
      // ponta dele e o começo do reflexo — "o phone não entra na água".
      //
      // Voltamos ao clamp direto na ORIGEM. É mais grosseiro (não sabe onde
      // o corpo termina), mas não mente: WATER_Y é uma constante confiável,
      // o bbox não-preciso rotacionado não é.
      // O PISO SÓ TEM A AUTORIDADE QUE A ÁGUA TEM.
      //
      // Este clamp já foi incondicional, e foi assim que o phone vazou pra FORA
      // do mergulho — o bug que originou este bloco. Acima do card do Features,
      // p fica preso em 0 (update() clampeia em [0,1]) mas cy NÃO: ele segue o
      // rect vivo da âncora e vai a 8402 com a página no topo. O phone está em
      // worldY -33, muito abaixo da dobra, corretamente fora de quadro — e o
      // Math.max o erguia pra WATER_Y assim mesmo, que é screenY 740, dentro da
      // tela. Em escala 1.06, num overlay z-[60], o aparelho cobria o
      // ComoComeçar e o ARoberta inteiros. "Abaixo da dobra" não é "afundado";
      // o clamp não sabia a diferença porque não perguntava se havia água ali.
      //
      // Agora pergunta. O gate segue dive — a MESMA grandeza que monta a água e
      // dita a opacidade dela (water.amount = dive, ver setDive). Onde não há
      // água não há piso, e fora do mergulho gate=0 faz disto um no-op exato.
      //
      // FLOOR_FADE é menor que o dive de qualquer frame visível do mergulho,
      // então no miolo gate=1 e o clamp é bit a bit o de antes: o phone segue de
      // pé na superfície, com reflexo. O fade existe só pra o piso SOLTAR o
      // phone de forma contínua nas pontas. Um gate seco (if dive > 0) não
      // serve: ele largaria o aparelho em p≈0.91 caindo de -1.2 pra -1.9, um
      // salto de 150px em quadro, porque o piso também mascara o cy real do
      // trecho final (ver CY PASSA PELO MERGULHO — o alvo do DOM só volta a
      // subir acima de WATER_Y em p≈0.98). Onde o gate ainda desliza, a água
      // está abaixo de 15% e ninguém vê o phone cruzá-la.
      const gate = floorGrip.current;
      onScreen.y = lerp(onScreen.y, Math.max(onScreen.y, WATER_Y), gate);
      el.position.copy(onScreen);

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

      /* CY PASSA PELO MERGULHO.

         Antes o cy era um lerp direto do card do Features até o slot do Pricing.
         Como as duas âncoras ficam a ~2 viewports uma da outra, o MEIO desse
         lerp cai fora da tela: medido, o phone chegava a cy 1150 com viewport de
         900 e desaparecia justamente no trecho onde a água acontece. Isso é
         anterior a esta feature — sempre foi assim, só não incomodava enquanto
         não havia nada pra ver ali.

         [data-phone-water] quebra o lerp em dois trechos e ancora o meio na
         linha d'água. O phone passa por onde a água está, não por baixo da
         dobra.

         wp sai dos rects VIVOS, não de constante: se alguém mudar a altura do
         Mergulho, do Manifesto ou das seções acima, o ponto de passagem
         acompanha sozinho. É o mesmo motivo de tudo aqui ler rect vivo. */
      const waterEl = document.querySelector<HTMLElement>("[data-phone-water]");
      const aC = a.top + a.height / 2;
      // bC não é o centro geométrico do slot — é o ALVO de pouso, deslocado
      // pra baixo por PHONE_PIVOT_BIAS pra compensar o pivot do glb (ver
      // comentário da constante). Feito aqui, não só no ponto final: bC
      // também é o destino de todo o segundo trecho do lerp (depois da
      // água), então a correção já nasce embutida em toda a curva de pouso,
      // em vez de ser um remendo aplicado só depois do cy calculado.
      const bC = b.top + b.height / 2 + PHONE_PIVOT_BIAS * b.height;
      let cy: number;
      if (waterEl) {
        const w = waterEl.getBoundingClientRect();
        const wC = w.top + w.height / 2;
        const span = bC - aC;
        const wp = span === 0 ? 0.5 : Math.min(0.98, Math.max(0.02, (wC - aC) / span));

        /* O GATILHO. Fora do reduced-motion (ver item e): quando o phone TOCA
           a água descendo, a cena assume — o usuário parou de dirigir, a
           entrega dirige. A histerese (rearma só abaixo de wp − 0.02, não
           logo que p < wp) existe pra quem oscila bem em cima da linha não
           reativar o gatilho a cada frame tremido. */
        if (!reduce) {
          if (p >= wp && armed.current && !delivering.current) {
            deliver();
          } else if (p < wp - 0.02) {
            armed.current = true;
          }
        }

        /* A divisão é em p, NÃO em eP — e isto é a diferença entre funcionar e
           não funcionar, não estilo.

           Com o corte em eP, o phone chega à âncora quando eP == wp; nesse
           instante ela está em 0.72·H + span·(wp − easePos⁻¹(wp)) na tela. Como
           easePos é um cubic in-out, esse termo só zera se wp for exatamente
           0.5 — e wp vem do layout, não é escolha nossa. Medido: dava wp≈0.66, o
           termo virava ~400px, e a travessia acontecia em cy 1049, abaixo da
           dobra. De novo.

           Cortando em p, o termo desaparece por álgebra: em p == wp o phone está
           na âncora e a âncora está em 0.72·H = onde o pouso é medido. Em quadro,
           qualquer que seja a altura das seções. O easing continua inteiro —
           aplicado DENTRO de cada perna. */
        cy =
          p < wp
            ? lerp(aC, wC, easePos(p / wp))
            : lerp(wC, bC, easePos((p - wp) / (1 - wp)));

        /* Mergulho centrado em wp: pico exato no frame em que o phone toca a
           superfície. É isto que impede água e phone de se desencontrarem quando
           alguém mexer em qualquer altura da página.

           max(bump, hold): fora da entrega hold é 0 e isto é bump puro, bit a
           bit igual a antes. Durante a entrega hold segura 1 (ver deliver()) —
           o mergulho não pode voltar a cair só porque o scroll automático
           empurrou p pra além de wp + DIVE_SPAN, senão o phone sairia da água
           antes da cena decidir soltá-lo. */
        const d = Math.max(bump((p - wp + DIVE_SPAN) / (2 * DIVE_SPAN)), hold.current);

        /* A CÂMERA NÃO SEGUE MAIS O MESMO BUMP DA ÁGUA — e é isto que faz a
           segunda metade ler como DESCIDA em vez de "a água evaporou".

           Antes, pitch e água eram o MESMO d. Então na saída a câmera nivelava
           no exato compasso em que u_amount caía: a linha d'água voltava pro
           centro da tela e a água sumia ali, em quadro, na metade de baixo. É
           o "apagar a água" — dá pra ver acontecendo.

           A linha d'água depende SÓ do pitch (o horizonte de um plano
           horizontal cai na altura do olho; inclinar é o único jeito de movê-
           lo). Medido: -17° põe o horizonte a 17% da tela, -25° a 0%. Ou seja
           inclinar mais não tira a água de quadro — faz ela TOMAR o quadro.

           Então o pico da câmera vem DEPOIS do pico da água (CAM_LAG): quando
           u_amount começa a cair, o pitch ainda está fundo e o quadro é quase
           só água. O fade acontece dentro de um campo uniforme — sem contraste,
           sem borda, invisível — e quem continua o look dali é o submerso do
           Pricing. Mesmo princípio da NÉVOA no topo do arquivo.

           camSpan resolve em 0 nas duas pontas por construção (o min com
           1 - camCenter garante que a câmera esteja NIVELADA em p=1): o slot do
           Pricing é lido em coordenadas de tela e o phone pousa por unproject,
           mas a POSE dele é relativa à câmera — chegar torto ao slot é o bug
           que PHONE_PIVOT_BIAS e END_TILT existem pra evitar. */
        /* O PISO SOLTA DEPOIS DE wp — ver floorGrip.

           smoothstep, não degrau: o alvo do DOM está ~1.9 abaixo de WATER_Y no
           trecho (medido), então largar de uma vez derruba o aparelho 150px em
           quadro. Soltando ao longo de FLOOR_RELEASE ele DESCE — que é o que se
           quer ver: o phone afundando enquanto a superfície sobe.

           Multiplica o gate antigo em vez de substituí-lo: FLOOR_FADE continua
           respondendo "existe água aqui?" (fora do mergulho dive=0 e o piso não
           tem autoridade nenhuma — ver o comentário em placeWorld), e este
           termo responde "ainda é hora de boiar?". As duas perguntas são
           diferentes e as duas precisam ser feitas. */
        floorGrip.current =
          smoothstep(0, FLOOR_FADE, d) * (1 - smoothstep(wp, wp + FLOOR_RELEASE, p));

        /* TINT — quanto do "dentro d'água" pintar abaixo do risco.

           NÃO é o bump do dive, e essa foi a lição cara: a tinta sobe até o
           phone tocar a superfície e FICA. Dentro d'água não é um pico por onde
           se passa — é onde se está dali em diante. Amarrada ao bump, ela
           evaporava embaixo do aparelho justamente enquanto ele terminava de
           girar submerso.

           Ela só solta no fim, e não porque a água acabou: é o submerso do
           PRICING (Underwater.tsx, mesma família de azul) assumindo o mesmo
           papel. Duas camadas pintando o mesmo dentro-d'água somariam e o
           quadro fecharia. Por isso o cross-fade termina antes do pouso — e é
           por isso que a cor daqui tem que continuar sendo a cor de lá. */
        tint.current =
          smoothstep(wp - DIVE_SPAN, wp, p) * (1 - smoothstep(TINT_OUT[0], TINT_OUT[1], p));

        const camCenter = wp + CAM_LAG;
        const camSpan = Math.min(camCenter - (wp - DIVE_SPAN), 1 - camCenter);
        const camAmt =
          camSpan <= 0
            ? d
            : Math.max(bump((p - camCenter + camSpan) / (2 * camSpan)), hold.current);
        setDive(d, camAmt);
      } else {
        cy = lerp(aC, bC, eP);
        setDive(0, 0);
      }
      // escala final derivada do rect VIVO do slot — ver comentário de
      // START_G/PHONE_FILL acima. REF_H é o mesmo 900 de referência usado na
      // COMPENSAÇÃO DE ESCALA (ver topo do arquivo): o slot foi desenhado
      // pensando numa janela de 900px, então dividir por REF_H (não por
      // window.innerHeight) devolve a mesma fração que 820/900 já entregava.
      // /PHONE_FILL é o que faz a altura RENDERIZADA igualar a altura do
      // slot em vez de só 75% dela — ver comentário da constante.
      const endG = b.height / PHONE_FILL / REF_H;
      placeWorld(cx, cy, lerp(START_G, endG, eP));
      if (group.current) {
        // No fundo do mergulho o phone deita na superfície, no MESMO compasso da
        // câmera. dive já é um bump (0 → 1 → 0), então ele resolve sozinho de
        // volta em 0 nas duas pontas — o Features espera reto, o Pricing espera
        // END_TILT. Não passar por bump() de novo: bump(bump(x)) é outra curva.
        const roll = DIVE_ROLL * dive.current;
        const el = group.current;
        el.rotation.set(
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

       Chamado de dentro de place(), ANTES de placeWorld(): move a câmera, e é a
       matriz dela que placeWorld desprojeta. Invertido, o phone fica um frame
       atrás da câmera — e um frame de atraso num mergulho com pitch aparece
       como tremor. */
    /* Pinta a metade submersa. `frac` = onde o risco cai (0 = topo), `amt` =
       quanto aplicar.

       Dois stops quase no mesmo ponto: o corte é DURO, é ele que faz o risco
       do iceberg. Um degradê ali devolveria o véu chapado que esta seção já
       teve. SPLIT_FEATHER não é zero só porque um corte de 0px serrilha e
       cintila quando a linha anda entre frames. */
    const splitPaint = (frac: number, amt: number) => {
      const el = submergedEl.current;
      if (!el) return;
      el.style.opacity = String(amt);
      if (amt <= 0.001) return;
      const a = (frac * 100).toFixed(2);
      const b = (frac * 100 + SPLIT_FEATHER).toFixed(2);
      el.style.background =
        `linear-gradient(to bottom, rgba(255,255,255,0) ${a}%,` +
        ` ${SUBMERGED_TOP} ${b}%, ${SUBMERGED_DEEP} 100%)`;
    };

    const setDive = (d: number, camAmt: number) => {
      dive.current = d;
      water.current.amount = d;

      const camera = cam.current;
      if (camera) {
        // camAmt, não d: a câmera tem curva PRÓPRIA, atrasada e mais funda que
        // a da água — ver o comentário em place(). É o desacople que faz a
        // linha d'água subir enquanto a água some, em vez de descer com ela.
        camera.rotation.x = DIVE_PITCH * camAmt;
        camera.position.y = -DIVE_DROP * camAmt;

        /* A linha da TINTA é a MESMA linha da GEOMETRIA, por construção.
           horizonFrac() é a fórmula que já diz onde o plano cruza a tela; um
           0.5 fixo casaria só enquanto o pitch fosse exatamente zero e
           descolaria no dia em que alguém o mexesse. Um risco que descola do
           próprio reflexo lê como bug, não como superfície.

           tintRef, não `d`: a tinta tem curva PRÓPRIA — ver TINT em place().
           Amarrá-la ao bump do dive foi meu erro e reproduzia o bug de origem
           da seção: em p=0.82 o phone já estava submerso, de frente, e o azul
           tinha evaporado embaixo dele. Estar dentro d'água não é um pico por
           onde se passa; é um estado em que se fica. */
        splitPaint(horizonFrac(camera.rotation.x), tint.current);
      }

      const wet = d > 0.001;
      if (wet !== wetRef.current) {
        wetRef.current = wet;
        setWaterOn(wet);
      }
    };

    /* O USUÁRIO SEMPRE PODE ESCAPAR.

       A entrega toma o scroll de propósito — mas só enquanto ninguém pediu o
       contrário. wheel/touchstart/keydown são o único sinal que conta como
       "eu quero dirigir": scroll NÃO serve, porque é o próprio scrollTo quem
       dispara evento de scroll, e usar scroll como sinal faria a entrega se
       auto-abortar no primeiro frame.

       armed fica false depois de um escape — quem recusou a entrega não deve
       ser resequestrado assim que o dedo sair da tela; só rearma subindo de
       volta pra cima de wp (a mesma histerese de sempre). */
    const onUserEscape = () => {
      if (!delivering.current) return;
      deliverTl?.kill();
      deliverTl = null;
      gsap.to(hold, { current: 0, duration: 0.3, ease: "power2.out" });
      water.current.flow = 1;
      delivering.current = false;
      armed.current = false;
      stopEscapeListeners();
    };

    function startEscapeListeners() {
      window.addEventListener("wheel", onUserEscape, { passive: true });
      window.addEventListener("touchstart", onUserEscape, { passive: true });
      window.addEventListener("keydown", onUserEscape);
    }
    function stopEscapeListeners() {
      window.removeEventListener("wheel", onUserEscape);
      window.removeEventListener("touchstart", onUserEscape);
      window.removeEventListener("keydown", onUserEscape);
    }

    /* A ENTREGA. Dispara quando o phone TOCA a água (ver o gatilho em place()):
       o mar para, o mergulho trava no pico, e a página termina sozinha o
       trajeto até o pouso — a mesma conta de scroll que update() já usa pra
       decidir p=1, não um segundo dono da posição de pouso. */
    const deliver = () => {
      const end = document.querySelector<HTMLElement>("[data-phone-end]");
      if (!end) return;
      const b = end.getBoundingClientRect();
      // endC é o CENTRO cru do slot — o mesmo que update() usa pra achar
      // p=1 (target = innerHeight·0.72). Não é bC de place(): aquele soma
      // PHONE_PIVOT_BIAS porque mira onde a ORIGEM do group deve ficar, não
      // onde o scroll deve parar. Somar os dois aqui pousaria o phone um
      // pouco além do ponto que update() considera "chegou".
      const endC = b.top + b.height / 2;

      armed.current = false;
      delivering.current = true;
      water.current.flow = 0; // pare o mar — ver FLOW_SPEED/WaterAmount
      hold.current = 1; // trava o mergulho no pico enquanto a cena dirige

      startEscapeListeners();

      // scrollY + (endC - alvo) é o delta que faz endC CAIR no alvo — a
      // mesma equação de update(), resolvida pra scrollY em vez de p.
      const targetY = window.scrollY + (endC - window.innerHeight * 0.72);

      deliverTl = gsap.timeline({
        onComplete: () => {
          delivering.current = false;
          water.current.flow = 1;
          stopEscapeListeners();
          deliverTl = null;
        },
      });
      // O SCROLL VAI PELO LENIS, NÃO POR CIMA DELE.
      //
      // Isto já foi `gsap.to(window, { scrollTo: targetY })`, e o Lenis
      // desmanchava: os dois escrevem window.scrollTo por frame, o Lenis roda
      // por último no gsap.ticker (ver SmoothScroll) e sobrescrevia o GSAP.
      // Medido: a página CONGELAVA em 10333 por ~270ms — o tempo da animação
      // do flick do Lenis, o mesmo duration:1.1 dele — e no frame em que ele
      // parava de escrever, o tween do GSAP (já a ~70% do curso) colava de
      // uma vez: 892px NUM FRAME. Um viewport de teleporte, bem no meio da
      // água. Não era tuning; eram dois donos do mesmo scrollY.
      //
      // lib/lenis.ts existe exatamente por isso ("window.scrollTo — que o
      // Lenis desabilita e causaria salto/desync") e o ComoComecar já rolava
      // certo. Esta era a única chamada que ainda rolava contra ele.
      //
      // Os números não mudaram: mesmo targetY, mesmo 1.4s, mesmo power2.inOut
      // (reescrito à mão porque o easing do Lenis é uma função t→t, não a
      // string do gsap). O escape continua de graça: uma roda do usuário
      // reancora o target do Lenis e interrompe este scrollTo sozinha — sem
      // lock, que é o default.
      getLenis()?.scrollTo(targetY, {
        duration: 1.4,
        easing: (t: number) =>
          t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
      });
      // A timeline agora só governa o hold: metade da entrega é o frame
      // TRAVADO (mar parado, phone deitado na superfície); a outra metade
      // dissolve o hold — a névoa fecha sozinha quando dive cai abaixo de
      // HAZE_UNTIL (ver NÉVOA no topo do arquivo), então não há corte pra
      // esconder aqui, só o piso caindo. Duração total segue 1.4s (0.7 + 0.7),
      // então o onComplete cai no mesmo instante de antes.
      deliverTl.to(hold, { current: 0, duration: 0.7, ease: "power2.in" }, 0.7);
    };

    // reduced-motion: sem viagem — estaciona no slot do Pricing (tela Início).
    // E sem água: ela é movimento por definição, e o custo dos passes de
    // reflexão não se justifica pra quem pediu pra não se mexer.
    if (reduce) {
      // place(1) já chama setDive: em p=1 o bump morre em 0, então a câmera
      // nivela e a água some sozinha — quem pediu pra nada se mexer não paga os
      // passes de reflexão nem vê o mergulho.
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
    };

    gsap.ticker.add(update);
    update();
    return () => {
      gsap.ticker.remove(update);
      // sem isto, um resize/unmount no meio da entrega deixa a timeline
      // órfã mexendo em window.scrollTo depois que ninguém mais lê dive —
      // e os listeners de escape ficariam presos ao document para sempre.
      deliverTl?.kill();
      stopEscapeListeners();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] hidden lg:block">
      {/* pointerEvents:none NÃO é redundante com o pointer-events-none do
          wrapper: o R3F escreve pointerEvents:'auto' no style inline do seu
          container, e pointer-events é herdado — mas um descendente pode
          reativar. Sem isto o canvas volta a capturar o hit-testing e, como
          este overlay é fixed inset-0 z-[60] sobre a página inteira, MATA o
          clique de tudo no desktop (toggle do Pricing, CTAs, ComoComeçar).
          Não remover. */}
      <Canvas
        className="!absolute inset-0"
        style={{ pointerEvents: "none" }}
        /* ACES: a peachweb usa (TONE_MAPPING mode 6) e é o único item do
           stack de render dela que nos faltava — o resto (DOF, vignette, bloom)
           eles têm praticamente desligado.
           alpha:true preservado — o Canvas é overlay sobre o DOM. */
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.3} />
        <PerspectiveCamera makeDefault position={[0, 0, CAM_Z]} fov={CAM_FOV} />
        <CameraBridge camRef={cam} />
        <Lights />
        {/* Céu e água só existem na janela do Mergulho — ver setDive(). */}
        {waterOn && (
          <Suspense fallback={null}>
            {/* Ver NÉVOA no topo. O shader vendorizado já vinha com fog:true e
                o #include <fog_fragment> — faltava a cena ter névoa. O Sky3D não
                usa fog e fica intacto, que é o certo: o céu é o destino da
                névoa, não vítima dela. */}
            <fog attach="fog" args={["#EFEAF4", FOG_NEAR, FOG_FAR]} />
            <FogSync diveRef={dive} />
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
      {/* A METADE DE BAIXO DO PLANO-PARTIDO — e ela é DOM, não WebGL.

          A primeira tentativa foi um ScreenQuad dentro do Canvas com
          renderOrder alto. Renderizou, tingiu a água e o CORPO do phone — e
          deixou a TELA dele nítida e SECA dentro do azul. Porque a tela não é
          WebGL: é DOM real montado por <Html transform> (ver PhoneScreen),
          numa camada CSS3D FORA do canvas. Nenhum shader alcança aquilo — é a
          mesma razão de ela ignorar a névoa da cena.

          Irmã do <Canvas> e depois dele no DOM: cai por cima do canvas E da
          camada CSS3D, então pega os dois de uma vez. */}
      <div
        aria-hidden
        ref={submergedEl}
        className="pointer-events-none absolute inset-0 mix-blend-multiply"
        style={{ opacity: 0 }}
      />
    </div>
  );
}

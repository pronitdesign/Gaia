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
import PhoneScreen, { SCREEN_RADIUS } from "@/components/iphone3d/PhoneScreen";
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
/* O PITCH NÃO É MAIS UMA CONSTANTE — ELE É LIDO DO DOM.

   Este número já foi -0.30, -0.44 e 0, e as três rodadas perguntavam a mesma
   coisa errada: "que ângulo faz a água tomar o quadro?". A pergunta certa é
   "onde está a linha?", e a resposta nunca esteve aqui — está no layout.

   A REGRA: a linha da superfície É o topo da seção de Pricing. Sempre.
   O pitch é o que for preciso pra isso ser verdade.

   Era o oposto: o pitch era escolhido e a linha caía onde a geometria mandasse
   (com pitch 0, em 50% da tela, em qualquer altura de câmera — ver o comentário
   do PLANO-PARTIDO, que está certo e é justamente o problema). A emenda das
   seções ficava onde o scroll a pusesse. Medido: 472px de distância entre as
   duas. Duas linhas em quadro, e a que o olho lê como "a superfície" era a
   errada — a de CSS, reta, sem crista, sem onda.

   Invertendo o horizonFrac() que já existe aqui:

     frac  = (topo do Pricing na tela) / innerHeight
     pitch = atan( tan(fov/2) · (2·frac − 1) )

   Medido @1440×780, com o Pricing subindo pelo scroll — o que a regra exige:

     Pricing em 92% (chegando)   pitch +21°   céu domina, mar é uma faixa
     Pricing em 52%              pitch  +1°   horizonte no meio
     Pricing em 13%              pitch −19°   o mar toma o quadro
     Pricing passou do topo      sem horizonte: a água É o quadro

   E É ISSO QUE ENTREGA A VIRADA DE GRAÇA. Ninguém anima 90º de câmera: colando
   o horizonte na emenda, quem vira a câmera é o SCROLL. E a virada não é
   decoração — é o que abre a água. theta no shader é dot(toEye, normal): 0 no
   rasante (espelho, Fresnel manda reflexo), 1 a pino (transparente, vê-se
   dentro). Nivelado o quadro inteiro vive em theta ≤ 0.42 e a água nunca abre
   por geometria; inclinando, theta sobe sozinho e o Pricing aparece POR BAIXO da
   superfície, que é a definição de submerso. Ver WATER_LENS em WaterScene.

   PITCH_CLAMP: a fórmula explode quando a aresta está longe da tela (frac→∞ ⇒
   pitch→90°). Fora da janela do mergulho isso não importa — camAmt é 0 e o lerp
   em setDive devolve a câmera nivelada —, mas importa NA BORDA, onde camAmt já
   é pequeno e o pitch já é absurdo: o produto dos dois ainda mexe a câmera. O
   clamp corta isso na raiz. 40° é folgado: a regra só precisa de +21°→−25° (em
   −25°, com fov 50, o horizonte encosta no topo e some — daí pra frente não há
   linha pra colar e o valor é livre). */
const PITCH_CLAMP = (40 * Math.PI) / 180;
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
/** Quanto o phone encolhe no pico do mergulho. ZERO por decisão da Laura
 *  ("não quero que o phone diminua de tamanho quando entra na água") — e o
 *  racional antigo ("a câmera desceu, perspectiva o infla, devolver respiro")
 *  era falso de qualquer jeito: placeWorld posiciona o aparelho a CAM_Z da
 *  câmera AO LONGO DO RAIO, então a descida não o infla — a distância é
 *  segurada por construção. Os 42% eram só o phone ficando 42% menor.
 *  A constante fica como dial documentado; 0 faz do shrink um no-op. */
const DIVE_SHRINK = 0;
/** Abaixo deste dive o piso da água larga o phone. Ver o uso em placeWorld. */
const FLOOR_FADE = 0.15;
/** Em quanto de p, depois de wp, o piso solta o phone pra ele afundar. Ver
 *  floorGrip: curto demais e ele cai 150px de uma vez; longo demais e ele
 *  cavalga a linha d'água subindo, que é o bug que isto conserta. */
const FLOOR_RELEASE = 0.14;

/* A TINTA DO SUBMERSO — ver lensPaint.

   ERA TINTA CHAPADA (#A8C2E0 → #5E87B8, opaca, com stop duro em 50%/50.3%) e
   isso fazia DUAS coisas erradas de uma vez.

   1. Tapava. Sobre a região transparente do canvas, multiply contra backdrop
      vazio devolve a cor de origem intacta (co = αs·Cs) — ou seja, uma tinta
      opaca aqui é uma PAREDE, não um véu. Nada da página podia aparecer abaixo
      da linha, por construção. Medido: o topo do Pricing em y=505, 100%
      invisível.
   2. Desenhava a linha. O stop duro repunha em CSS um horizonte reto de 1440px
      — enquanto o horizonte WebGL de verdade, que o pitch 0 entrega no centro
      da tela de graça, era apagado pelo u_fade logo abaixo. Dois horizontes, e
      o que sobrava em quadro era o falso: reto, sem crista, sem onda.

   Agora a linha nasce da RAMPA DE FRESNEL da água (u_lens em WaterComplex) e
   esta camada só tinge. Então: sem stop duro, e rgba em vez de hex.

   O ALPHA FAZ DOIS TRABALHOS, e é isso que deixa uma camada só dar conta das
   duas metades da cena — o phone é WebGL+CSS3D, o Pricing é DOM, e eles vivem
   em lados opostos do canvas:

     backdrop opaco (o corpo do phone, a água rasante):
       co = αs·B(Cb,Cs) + (1−αs)·Cb  →  multiply DOSADO. Tinge, jamais lava.
     backdrop vazio (onde a lente abriu):
       co = αs·Cs, αo = αs           →  véu translúcido, e o Pricing aparece
                                        por baixo, já borrado pelo lensEl.

   TEAL, não mais periwinkle. #A8C2E0/#5E87B8 eram da família do uDeep ANTIGO do
   Pricing (#7FA3CE) e ficaram pra trás quando ele virou teal (#8FC0CE sobre
   PRICING_STOPS, resolvendo em ~#5AA2B4 — ver Underwater.tsx). A divergência
   sobreviveu porque as duas cores nunca se encostavam: a parede garantia isso.
   A lente encosta as duas no mesmo pixel — tingir de periwinkle um Pricing teal
   é o mesmo erro que Underwater.tsx já registra duas vezes (lavanda sobre azul,
   periwinkle sobre recife).

   Alpha 0 na linha, subindo com a profundidade: logo abaixo da superfície a
   água é rasa e clara, e no pé do quadro é fundo. Zero no topo também é o que
   deixa a linha ser SÓ a rampa da água — qualquer alpha ali de volta e o CSS
   está desenhando horizonte outra vez.

   O ALPHA DO FUNDO É UM DOS DOIS DIAIS DO PEDIDO — "o Pricing meio ofuscado",
   não sumido. Onde a lente abriu, o backdrop está vazio e este alpha vira
   COBERTURA direta: 0.82 deixava passar 18% do Pricing e o devolvia ao invisível
   de antes, só que por outra porta (a parede saiu do canvas e virou tinta).

   0.48 ERA "presença sem legibilidade" no papel e NÃO era isso em quadro. Medido
   @1440×900, scroll 10709, contraste (desvio-padrão da luminância) na região do
   título do Pricing (200,730 → 596,890 — recorte SEM o phone, que é branco e
   contamina a conta):

     parede opaca do baseline ............ 5.40   ← o que a lente veio substituir
     blur 12 + tint 0.48 (era) ........... 9.81   ← +4.4 sobre a PAREDE
     blur 10 + tint 0.38 (é) ............ 13.18   ← +7.8

   Ou seja: a lente inteira estava comprando 4.4 de contraste sobre não ter lente
   nenhuma. Era esse o "sujeira em suspensão" — não uma escolha de gosto, um
   número perto do chão.

   QUAL DOS DOIS COMIA O PRICING, medido desligando um de cada vez (A/B em runtime,
   `!important` por cima das escritas por frame do lensPaint):

     desligar a TINTA .... +61% de contraste
     desligar o BLUR ..... +176%

   O blur manda, com folga — mas a tinta não é inocente, e por isso os DOIS
   andaram. Os dois fazem trabalhos DIFERENTES e é isso que deixa separá-los: blur
   mata alta frequência (as hastes das letras) e governa a LEGIBILIDADE; alpha
   corta amplitude e governa a PRESENÇA. Então a receita é blur alto o bastante pra
   não se ler, e tinta baixa o bastante pra se ver que há massa ali. Medido: blur 9
   + tint 0.38 dá o MESMO contraste que blur 10 + tint 0.38 (13.43 vs 13.18, dentro
   do ruído) e em 9 dá pra ler "Sem surp". Então 10 — o maior blur que ainda chega
   nos ~13.

   ATENÇÃO A QUEM FOR RETUNAR ISTO: a FASE DA ONDA move este número ±1.7 a 3.6 de
   sd, sozinha, sem ninguém tocar em dial nenhum — é da ordem do efeito dos dials.
   Um PNG só não decide nada aqui; foi preciso média de 4 fases por candidato. Uma
   matriz blur×tint tirada de um frame por célula chegou a dar blur 11 MAIS nítido
   que blur 10, que é fisicamente impossível: era a onda, não o dial. */
const SUBMERGED_TOP = "rgba(169, 198, 206, 0)";
const SUBMERGED_DEEP = "rgba(78, 143, 160, 0.38)";

/* A LENTE — o quanto o que está ATRÁS da água chega ofuscado.

   POR QUE ELA NÃO MORA DENTRO DO OVERLAY z-[60], e por que essa foi a única
   coisa difícil deste arquivo.

   backdrop-filter borra o que foi pintado atrás do elemento DENTRO do Backdrop
   Root. "Um stacking context de z-index puro não cria Backdrop Root" é verdade
   — e é uma meia-verdade que custa horas, porque o overlay z-[60] NÃO é um
   stacking context de z-index puro: ele tem um filho com mix-blend-mode (o
   submergedEl). Um filho blendado faz do pai um ISOLATION GROUP, e isolation
   group É Backdrop Root. O overlay vira um saco fechado: o backdrop de
   qualquer lente lá dentro passa a ser só o que o próprio overlay pintou —
   ou seja, nada, porque ela é o primeiro filho.

   O sintoma engana: o elemento pinta normalmente (um background vermelho de
   teste aparece), o computed style diz `blur(14px)`, e o borrão simplesmente
   não acontece. Medido, A/B, com blur(40px) nos dois lados: mix-blend do irmão
   DESLIGADO → o texto do Pricing vira fantasma; LIGADO → volta a navalha, sem
   mais nada mudar. Não adianta mexer no blur, no z-index ou na ordem do DOM
   dentro do overlay — enquanto o submergedEl blendar, o saco está fechado.

   Então a lente é IRMÃ do overlay, em z-[59]: aí o backdrop root dela é o
   documento e ela enxerga a página. E o submergedEl continua blendando lá
   dentro à vontade, que é o que ele precisa fazer.

   Isto não entrega nada sozinho — a água tem que abrir (u_lens em
   WaterComplex). Uma sem a outra é uma parede opaca com um borrão invisível
   atrás.

   LENS_BLUR CAIU DE 10 PRA 4, E É PORQUE O TRABALHO MUDOU DE DONO.

   Toda a calibração acima (10 = 13.18 de contraste, 12 = mancha, 9 = dá pra ler)
   foi medida contra uma água que era 92% TRANSPARENTE em quase todo o quadro —
   ver WATER_LENS em WaterScene, que estava esmagada em 1° de rasante pra fingir
   abertura com câmera parada. Naquele mundo não havia água entre o olho e o
   Pricing: este blur era, sozinho, a única coisa dizendo "isto está submerso".
   Daí precisar de 10.

   Agora existe água de verdade ali (rampa física + câmera virando, ver a
   derivação do pitch), e ela cobre, tinge, ondula e abre por Fresnel. Manter 10
   por cima é DOIS mecanismos cobrando pelo mesmo serviço — renderizado, o recife
   inteiro vira um borrão e o "ver o Pricing submerso" some justamente no frame
   que a seção existe pra entregar.

   4 é o que sobra pro que a água NÃO faz: o Pricing é DOM, não está na cena, logo
   não entra no passe de refração — nenhum shader o alcança (é a mesma razão de a
   tela do phone ignorar a névoa). Sem um blur de CSS ele apareceria por trás de
   uma janela perfeita, com as hastes das letras intactas. 4 é o amaciamento da
   refração, não uma parede.

   Os números velhos ficam registrados acima porque a régua deles ainda vale se
   alguém um dia desligar a água — mas não são mais comparáveis, e recalibrar
   contra eles é comparar dois mundos diferentes. */
const LENS_BLUR = 4; // px
const LENS_SATURATE = 1.18; // água rasa satura o que se vê através dela

/* A TELA MOLHADA — e por que ela é `filter` NA TELA, não mais uma lente.

   A tinta (submergedEl) SEMPRE alcançou a tela: o par zIndexRange [10,0] +
   z-[20] funciona, e eu conferi na árvore viva antes de mexer (o wrapper do
   <Html> é `position:absolute; z-index:10; perspective:965px`, e o container do
   canvas é z-index auto, que não cria stacking context — então o 10 sobe e
   perde do 20, como o comentário do submergedEl afirma). A hipótese de que o
   preserve-3d/perspective prendia o z-index num contexto interno é FALSA: a
   perspective está no MESMO elemento que carrega o z-index 10, então ela cria
   contexto pros FILHOS dele, não pra ele.

   O que faltava não era z-index: era que TINTA NÃO BORRA. A tela lia seca porque
   estava NAVALHA — sd de nitidez 1365 contra 1527 do baseline, ~11% de diferença,
   enquanto o texto do Pricing ao lado, na mesma profundidade de água, estava
   ilegível. Tingir não conserta isso: só o desfoque conserta.

   POR QUE NÃO UMA LENTE (backdrop-filter) DENTRO DO OVERLAY. Ela FUNCIONA — e eu
   cheguei a provar: um div em z-[15] (acima da camada CSS3D em 10, abaixo da
   tinta em 20) borra a tela de verdade, porque o overlay É um Backdrop Root (o
   mix-blend do submergedEl faz dele um isolation group) e o backdrop de quem mora
   lá dentro é exatamente o que o overlay já pintou: canvas + tela. O comentário
   de LENS_BLUR diz que o saco é fechado "porque ela é o primeiro filho" — a
   ressalva é essencial e é o que abre esta porta: quem entra DEPOIS do canvas
   enxerga o canvas.

   Foi REJEITADA por medição, não por gosto: o backdrop dela é o canvas INTEIRO,
   então ela leva a água junto. Medido @10709, nitidez da faixa da superfície
   (100,450 → 600,545) — a crista e o brilho especular:

     blur 2 → tela −91.2%, crista −52.8%
     blur 6 → tela −93.7%, crista −61.4%

   Não existe blur barato: a crista é sparkle de 1–2px, então até blur(2) já leva
   metade dela. O custo é um DEGRAU, não uma rampa — e a crista é justamente o que
   esta seção acabou de ganhar. Descer a borda do rect pra onde a água vira lente
   (θ=u_lens.y ≈ y543) salvaria a crista, mas aí a borda cai onde a água está
   ABERTA e o corte aparece em quadro, a 75px da linha d'água aparente — o oposto
   do que o rect do lensEl consegue fazer (aquele esconde a aresta atrás de água
   opaca, ver o comentário dele).

   `filter` na própria tela não tem esse dilema: a água não é entrada dele. Custa
   ZERO de crista, não tem aresta, e acerta o único elemento que estava seco. A
   tela é DOM real numa camada CSS3D fora do canvas — nenhum shader a alcança (é a
   mesma razão de ela ignorar a névoa), mas CSS alcança.

   Os valores são LOCAIS, não de tela: a tela é um frame de 390×844 CSS que a
   matriz do CSS3D encolhe pra ~200×400 em quadro, então o blur renderizado sai
   ~metade daqui. 6 local ≈ 3 em quadro — o bastante pra matar texto de 5–8px, que
   é o tamanho real do "Início" ali dentro.

   saturate/brightness porque a queixa era "nítidos, SATURADOS, secos": o card roxo
   atravessava o azul sem perder um grau de croma. Água tira croma e tira luz. O
   TOM (o teal) quem dá é a tinta, que já cai por cima — ver SUBMERGED_DEEP. */
const SCREEN_WET_BLUR = 6; // px no espaço LOCAL da tela (~metade disso em quadro)
const SCREEN_WET_SAT = 0.78;
const SCREEN_WET_BRIGHT = 0.94;
/* Quanto o phone precisa afundar (unidades de mundo, abaixo de WATER_Y) pra tela
   ler 100% molhada. O phone tem ~1.40 de altura, então 0.45 é ~um terço dele
   dentro d'água — cheio o bastante pra não haver dúvida, curto o bastante pra a
   transição acontecer enquanto ele cruza, não depois.

   A profundidade sai da POSIÇÃO JÁ CLAMPEADA (ver o piso em placeWorld), e é isso
   que faz o frame do TOQUE (9994) sair seco de graça: ali floorGrip=1 prende a
   origem em WATER_Y, então depth=0 e a tela é navalha — que é o certo, ele ainda
   não entrou. Depois de wp o piso solta, ele afunda, e a tela molha junto. Não é
   um segundo roteiro do mergulho: é a mesma geometria que já decide tudo aqui. */
const WET_DEPTH = 0.45;
/* O RELÓGIO DA ENTREGA.

   Era 1.4s de scroll com 0.7s de quadro travado por dentro. O pedido foi "assim
   que chegar na água já ocorra a transição rápida de section, não enrole" — e
   ele está certo pela estrutura, não só por gosto: o GATILHO é o toque na água,
   e o toque JÁ é o clímax da seção. Tudo que vem depois dele é entrega. Meio
   segundo de phone parado na superfície não constrói tensão nenhuma; a tensão
   foi construída na descida, e o toque é o pagamento dela.

   DELIVER_SCROLL — 0.7s pra ~1200px. É rápido de propósito: é uma transição de
   seção, na régua de um scroll-snap, não uma cutscene. Também é quanto tempo o
   lock do Lenis tira a roda do usuário (ver onUserEscape) — outro motivo pra ser
   curto: um sequestro de 0.7s é aceitável, um de 1.4s começa a ser sequestro.

   HOLD_BEAT — o respiro em que o mergulho fica travado no pico antes do piso
   começar a soltar. Não é zero: o toque precisa de UM frame reconhecível de
   phone na superfície com o mar parado, senão ele passa batido e a água vira
   um flash. É o menor tempo que ainda lê como "ele encostou".

   HOLD_RISE — hold sobe em rampa em vez de ser cravado em 1. O gatilho
   (TOUCH_FRAC) dispara ANTES do pico do dive, então `hold.current = 1` no ato
   arrancaria o dive num frame — e dive governa o roll e o DIVE_SHRINK do phone,
   que pipocariam junto. A rampa não aparece em quadro porque d = max(bump, hold)
   e o bump está subindo junto: até o fim da rampa o hold lidera o bump por
   pouco. Ele só passa a mandar de verdade depois de wp, que é onde o bump cai e
   alguém precisa segurar o pico. */
const DELIVER_SCROLL = 0.7;
const HOLD_BEAT = 0.12;
const HOLD_RISE = 0.22;

/* ONDE O PHONE "CHEGA NA ÁGUA" — a régua virou a ARESTA, e o registro abaixo
   explica por que ela já foi outras duas coisas.

   TOUCH_FRAC = 0.55: dispara quando o horizonte cruza pouco abaixo do meio da
   tela. É a composição que a Laura apontou — última frase do Manifesto em cima,
   linha d'água no meio, mar embaixo — e agora ela se diz numa linha, porque o
   horizonte É a aresta do Pricing (ver a regra em PITCH_CLAMP) e a aresta é um
   rect vivo. "O mar chegou no meio da tela" é a coisa que o olho de fato vê.

   ISTO JÁ FOI `p >= wp` (o phone cruzar a âncora — um evento geométrico que
   ninguém enxerga: 765px de scroll depois do phone já estar em pé na água) e
   depois `TOUCH_DIVE`, que invertia o bump do dive pra achar "quanto mar tem em
   quadro". O segundo estava certo pelo mundo em que foi escrito e MORREU com
   ele: naquele mundo a água era o bump do phone. Hoje a água é o gate da aresta
   (ver setDive) — o dive virou só o roll/shrink/piso do aparelho. Manter a
   inversão do bump seria medir o mar com a régua do phone: medido, dispararia em
   p≈0.51, com a aresta abaixo da dobra e ZERO água em quadro.

   A lição, que já custou três rodadas: o gatilho tem que ler a MESMA grandeza
   que pinta o quadro. Quando essa grandeza muda de dono, o gatilho muda junto —
   ou ele passa a medir um mundo que não existe mais. */
const TOUCH_FRAC = 0.55;

/* POR QUE NÃO É `p >= wp`, que é o que estava aqui — a espera que ninguém via.

   wp é o phone atingir a âncora [data-phone-water]: um evento GEOMÉTRICO, sem
   nada em quadro que o anuncie. O evento VISÍVEL acontecia muito antes. Medido
   @1440×780 no layout de então:

     p=0.36  o piso encosta no phone (grip 0.14)
     p=0.40  grip=1 — a superfície segura 1.45 de mundo. Ele está EM PÉ na água.
     p=0.50  o mar lê cheio, com horizonte. É o frame que a Laura apontou.
     p=0.62  wp — o gatilho finalmente disparava

   De 0.40 a 0.64 o piso prende o phone na superfície (ver floorGrip): 765px de
   scroll em que a posição vertical dele NÃO MUDA. Ele já tinha pousado; a
   máquina é que ficou esperando um número que o olho não tem como acompanhar.
   Era essa a enrolação — não a duração da entrega, a espera ANTES dela. */

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

   FOG_NEAR/FOG_FAR são a névoa ABERTA — e eles deixaram de ser decorativos.

   Eram 20/320, "na prática, névoa nenhuma no que se vê" — e era ISSO o erro de
   perspectiva que a Laura apontou ("a água deveria ir aparecendo de forma mais
   realista"). A análise no topo deste bloco já tinha feito a conta: com far=320
   e o olho a ~0.3 da superfície, o ponto 100% enevoado cai a 0.05° do horizonte
   — UM pixel. Sem perspectiva aérea, o horizonte é uma régua e o mar entra no
   quadro como um cartão chapado deslizando pra cima.

   4.5/16 põe a rampa onde o olho a vê: névoa cheia a atan(0.3/16) = 1.07° do
   horizonte (~17px @787) e o degradê começando a atan(0.3/4.5) = 3.8° (~60px).
   Os últimos ~17px antes da linha são pura cor de céu (a FogSync já amostra o
   céu na altura do horizonte, por frame), então a régua vira um derretimento —
   e o mar NASCE de dentro da bruma e ganha textura conforme chega perto, que é
   como mar de verdade aparece. Durante a entrada a câmera está mais alta
   (~0.66 de altura com camAmt parcial) e a banda dobra de tamanho sozinha:
   entrada mais brumosa, pico mais resolvido, de graça, da mesma conta.

   near=4.5 > CAM_Z=4 de propósito: o phone (r=4) fica FORA da névoa aberta —
   0% de leite no aparelho. Só o fechamento das pontas (HAZE_FAR=3 < CAM_Z) o
   engole, como sempre fez.

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
const FOG_NEAR = 4.5;
const FOG_FAR = 16;
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

    /* O fallback é o FIM do céu do Mergulho, e ele deixou de ser opcional.

       Com a regra do horizonte-na-aresta, hy cai EXATAMENTE na borda de baixo
       do rect do Mergulho — e por arredondamento fica 1px abaixo dela, fora dos
       DOIS rects que este sampler conhece. Sem fallback, ninguém escrevia a cor
       e a névoa ficava no #EFEAF4 de inicialização: uma banda BRANCA estourada
       coroando o horizonte, medida em quadro (frac 0.163). E esse não é um caso
       raro: é o estado PERMANENTE do mergulho inteiro, porque o horizonte mora
       na aresta por construção agora.

       DIVE_STOPS em t=1 é a resposta certa por definição: é a cor do céu NA
       linha d'água — que é onde o horizonte está sempre que os rects não o
       contêm (na aresta, ou acima do quadro com a câmera funda). */
    const rgb =
      pick(dive, DIVE_STOPS) ?? pick(manifesto, SKY_STOPS) ?? sampleStops(DIVE_STOPS, 1);
    /* SRGBColorSpace NO setRGB, e isso não é pedantismo — foi uma banda branca
       em quadro. sampleStops devolve frações sRGB (é o espaço do CSS, e o casar
       com o fundo é a razão dele existir), mas com o ColorManagement do three
       ligado, setRGB sem colorspace interpreta os valores como LINEAR — e o
       pipeline re-encoda no fim, aplicando um round de gamma por cima de valores
       que JÁ eram sRGB: 0.871 → 0.94, #DED7E8 → #F0EDF5. Medido no PNG: a faixa
       de névoa cheia (os ~17px sob o horizonte) rendia #EFECF4 contra um DOM que
       morre em #DED7E9 — a "linha branca estourada" coroando a linha d'água.
       Declarar o espaço faz o three armazenar o linear certo e a tela devolver o
       hex exato do gradiente: névoa e céu viram o MESMO pixel, que é o contrato
       desta função. */
    fog.color.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
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
  /* As duas camadas DOM do "dentro d'água" — ver lensPaint. Refs e escritas por
     frame de dentro do gsap.ticker; estado seria re-render do React a 120fps.
     lensEl BORRA a página (mora antes do canvas), submergedEl TINGE o que
     sobrou (mora depois). A ordem no DOM é o que separa os dois trabalhos. */
  const lensEl = useRef<HTMLDivElement>(null);
  const submergedEl = useRef<HTMLDivElement>(null);
  /* A TELA do phone — DOM real da camada CSS3D, entregue pelo forwardRef do
     <Html> do drei (em transform mode ele passa o ref pro div de CONTEÚDO, ver
     node_modules/@react-three/drei/web/Html.js). Ref e escrita por frame no
     ticker, como lensEl/submergedEl: `style` como prop do React seria re-render
     a 120fps.

     O useLayoutEffect interno do drei re-renderiza esse div com `style={style}`
     e apaga escritas imperativas (é o que IPhoneModel documenta pro `visibility`,
     que por isso é state) — mas ele só roda quando o <Html> re-renderiza, o que
     aqui acontece umas 2x por giro (setShowAlt/setWaterOn), não por frame. Como
     wetPaint reescreve TODO frame, o pior caso é 1 frame sem filtro. Medido no
     render dos 3 frames-chave: não aparece. */
  const screenEl = useRef<HTMLDivElement>(null);
  /** Quanto do dentro-d'água pintar. Curva própria, não o bump — ver TINT. */
  const tint = useRef(0);
  /** Quanta ÁGUA há em quadro — o gate da aresta, não o bump do phone. Ver
   *  setDive. A névoa lê isto (e não mais o dive) pelo mesmo motivo: ela fecha
   *  quando a água vai embora, e quem decide isso é a superfície. */
  const waterAmt = useRef(0);
  /* Meia altura do CORPO do phone, em unidades LOCAIS do group (antes da escala).
     Existe pro clamp poder mirar o MEIO VISUAL na linha d'água em vez da origem
     do glb — ver placeWorld. Medida uma vez, quando a malha aparece, e não por
     frame: o bbox local não roda e não muda, então escalar é multiplicação. Zero
     até o glb carregar, e nesse meio-tempo o clamp mira a origem, que é o
     comportamento antigo — degradar pro anterior é melhor que travar. */
  const bodyHalf = useRef(0);

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
      // METADE DENTRO, NÃO EM PÉ EM CIMA — e a diferença é o pivot do glb.
      //
      // O clamp mirava a ORIGEM em WATER_Y, e a origem não é o meio do aparelho:
      // o comentário do bbox aqui embaixo mediu que, com a origem em WATER_Y
      // (-1.2), o FUNDO visível cai em -1.17 — ou seja o phone inteiro fica ACIMA
      // da linha, apoiado nela. Renderizado, é exatamente o que se vê: ele fica
      // EM PÉ na água, com reflexo, sem nunca entrar. O pedido é outro — "o phone
      // entrar pela metade".
      //
      // halfDrop é meia altura do corpo, no espaço de MUNDO: bodyHalf é medido
      // uma vez do bbox LOCAL (ver mid/half no useEffect) e escalado pela escala
      // viva do group, que muda todo frame (START_G→endG, mais o DIVE_SHRINK).
      // Uma constante em unidades de mundo casaria com um frame do mergulho e
      // mentiria em todos os outros, porque o aparelho encolhe enquanto cruza.
      //
      // Local×escala, e NÃO bbox de mundo por frame: setFromObject no modo não
      // preciso infla o AABB de um corpo fino e rotacionado (medido: overshoot de
      // 2.87, quase 2× o phone — o registro inteiro está logo acima), e no modo
      // preciso percorre vértice a vértice, o que não se paga a 120fps. O bbox
      // LOCAL não roda, não muda nunca, e escalar é uma multiplicação.
      const gate = floorGrip.current;
      const halfDrop = bodyHalf.current * el.scale.y;
      const surface = WATER_Y - halfDrop; // origem AQUI ⇒ meio visual NA linha
      onScreen.y = lerp(onScreen.y, Math.max(onScreen.y, surface), gate);
      el.position.copy(onScreen);

      /* Na superfície o phone fica mais perto da câmera (ela desceu até quase
         rasar a água), e perspectiva o infla até encher o quadro. DIVE_SHRINK
         devolve o respiro — é enquadramento, não escala real. */
      const shrink = 1 - DIVE_SHRINK * dive.current;
      el.scale.setScalar(g * (REF_H / window.innerHeight) * shrink);
    };

    /* Meia altura do corpo, em unidades locais do group — pro clamp mirar o MEIO
       VISUAL na linha em vez da origem do glb (ver placeWorld).

       ZERA A ROTAÇÃO E A ESCALA ANTES DE MEDIR, e é isso que torna esta medição
       confiável onde a anterior falhou. O registro do bbox em placeWorld está
       certo: setFromObject num corpo fino e ROTACIONADO infla o AABB (medido,
       overshoot de 2.87). Mas ele infla porque a rotação joga os cantos da caixa
       pra longe — sem rotação não há cantos pra jogar, e o box vira o extent
       local, exato. Com `true` (por vértice) por cima, nem o modo não-preciso
       importa.

       Roda UMA vez: o glb chega por Suspense, então não há evento pra escutar —
       tenta-se por frame até o box existir e nunca mais. Custa uma travessia de
       vértices na vida da página, não por frame, que é o que condenou a outra
       tentativa. */
    const measureBody = () => {
      const el = group.current;
      if (!el || bodyHalf.current > 0) return;
      const rot = el.rotation.clone();
      const scl = el.scale.clone();
      el.rotation.set(0, 0, 0);
      el.scale.setScalar(1);
      el.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(el, true);
      el.rotation.copy(rot);
      el.scale.copy(scl);
      el.updateMatrixWorld(true);
      if (!box.isEmpty()) bodyHalf.current = (box.max.y - box.min.y) / 2;
    };

    const place = (p: number) => {
      const start = document.querySelector<HTMLElement>("[data-phone-start]");
      const end = document.querySelector<HTMLElement>("[data-phone-end]");
      if (!start || !end) return;
      measureBody();
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

        /* O GATILHO. Fora do reduced-motion (ver item e): quando o phone chega
           na água descendo, a cena assume — o usuário parou de dirigir, a
           entrega dirige. A histerese (rearma só abaixo de touchP − 0.02, não
           logo que p < touchP) existe pra quem oscila bem em cima da linha não
           reativar o gatilho a cada frame tremido.

           A ARESTA, não wp: o phone chega na água quando o HORIZONTE cruza o
           meio da tela — ver TOUCH_FRAC. wp continua mandando em tudo o mais (o
           pico do dive, a quebra do cy, o piso); só o gatilho deixou de esperar
           por ele.

           A histerese vive no espaço da ARESTA agora (px de tela, via frac), não
           no de p: são a mesma coisa a menos de escala, e frac é o que o gatilho
           de fato lê. +0.03 de frac ≈ 24px @787 — folga pra tremor de scroll sem
           chegar perto de rearmar sozinho. */
        const seamEl = document.querySelector<HTMLElement>("[data-water-start]");
        if (!reduce && seamEl) {
          const sf = seamEl.getBoundingClientRect().top / window.innerHeight;
          if (sf <= TOUCH_FRAC && armed.current && !delivering.current) {
            deliver();
          } else if (sf > TOUCH_FRAC + 0.03) {
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
        /* A SEGUNDA PERNA É LINEAR, E ISSO NÃO É EASING ESQUECIDO.

           Ela era easePos, como a primeira, e era ESSA a origem do phone saindo
           pela quina de baixo. Medido @1440×780, wp=0.62:

             p=0.62   cy 600   ← toca a água, no lugar certo
             p=0.72   cy 371   ← ACIMA do horizonte (390): sai da água pro céu
             p=0.90   cy 854   ← 74px ABAIXO da dobra, cortado, indo pra direita
             p=1.00   cy 623   ← volta e pousa

           Um S de 483px de amplitude entre dois pontos que estão praticamente no
           MESMO lugar da tela (600 e 623). A excursão inteira era artefato.

           De onde ela vinha, em uma linha:  cy(p) = wCs(p) + gap·e(p), wCs' = −dist.
           As duas âncoras galopam pra cima a `dist` por unidade de p (3189px aqui,
           Features→Pricing), CONSTANTE. Mas e' de um cubic in-out não é: vai de 0
           nas pontas a ~7.9 no miolo. Onde e'=0 o phone sobe a 3189px/p (voa pro
           céu); onde e' pica, desce a 6583px/p (fura a dobra). Curva EASED contra
           arrasto CONSTANTE = S. Não há número que conserte: é a forma da curva.

           Nada disso aparece na primeira perna porque lá o piso (floorGrip=1)
           prende o phone em WATER_Y e mascara o cy inteiro — por isso o bug só
           nasce DEPOIS de wp, exatamente quando o piso solta. O comentário de
           FLOOR_RELEASE dizia ter matado o "cavalga a linha d'água"; matou o
           degrau, não a cavalgada — quem erguia o phone era este easing.

           Linear casa por CONSTRUÇÃO, não por sorte: a perna vale 1237px de
           documento (wC→bC) e 1201px de scroll (dist·(1−wp)). É a MESMA viagem —
           o phone atravessando o documento no passo em que o documento atravessa
           a janela. Logo cy' = −dist + gap/(1−wp) = +95/p: 36px de descida em toda
           a perna, monótona. O phone boia parado e quem se move é o Pricing,
           subindo pra encontrá-lo. É o pouso que a seção sempre quis.

           E o easing não se perde: eP = easePos(p) continua governando escala, yaw
           e tilt. Só a POSIÇÃO DE TELA deixa de ter curva própria depois do toque
           — que é o ponto em que o phone deixa de ter trajetória e vira passageiro
           da página. */
        cy =
          p < wp
            ? lerp(aC, wC, easePos(p / wp))
            : lerp(wC, bC, (p - wp) / (1 - wp));

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

      /* A TELA MOLHA POR PROFUNDIDADE, não por dive nem por tint — e a diferença
         é o frame do TOQUE.

         dive é um bump: pica no instante em que o phone encosta na água e cai nas
         duas pontas, então molharia a tela na aproximação (ele ainda seco, no ar)
         e a secaria com ele submerso. tint chega a 1 no toque e FICA — molharia a
         tela em 9994, onde o aparelho está boiando, não afundado.

         Quem sabe se ele entrou é a POSIÇÃO, depois do clamp: enquanto o piso
         segura (floorGrip=1) a origem está presa em WATER_Y e depth=0; quando o
         piso solta depois de wp, ele afunda e depth cresce. Ler DEPOIS de
         placeWorld é o que dá acesso ao valor já clampeado.

         O ×tint.current é o desligamento: a tela tem que pousar NAVALHA no slot do
         Pricing, e TINT_OUT já é a curva que fecha o dentro-d'água antes de p=1
         (pelo mesmo motivo, e no mesmo compasso, que fecha a tinta e a lente).
         Sem ele o phone chegaria borrado no pouso. */
      if (group.current) {
        const depth = WATER_Y - group.current.position.y;
        wetPaint(smoothstep(0, WET_DEPTH, depth) * tint.current);
      }

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
    /* O dentro-d'água em DOM. `frac` = onde a linha cai (0 = topo), `amt` =
       quanto aplicar.

       Chamava-se splitPaint e pintava um plano partido; hoje não parte nada —
       quem corta o quadro é a rampa de Fresnel da água (u_lens). Aqui só se
       borra e se tinge o que está DEBAixo da linha.

       O RECORTE DA LENTE É UM RECT, NÃO UMA MÁSCARA. `mask-image` seria o jeito
       óbvio de dar borda macia ao borrão, e é justamente o que não se pode usar:
       mask CRIA Backdrop Root, e um backdrop root no próprio elemento que carrega
       o backdrop-filter reduz o backdrop dele a nada — o borrão simplesmente não
       acontece. Um rect com `top` na linha não tem esse problema, e não precisa de
       borda macia nenhuma: no topo da rampa a água ainda está OPACA (u_lens.x),
       então a aresta do rect cai atrás de água cheia e não existe em quadro. A
       gradação de quem enxerga o quê é da água, não daqui.

       frac não é sempre 0.5 por acidente: com DIVE_PITCH = 0 o horizonte cai no
       centro em qualquer altura de câmera (ver O PLANO-PARTIDO). Escrever o mesmo
       `top` todo frame é no-op pro browser — e no dia em que o pitch mudar, a
       lente acompanha a linha sozinha em vez de descolar dela. */
    /* `lensAmt` = quanto BORRAR (gated pela água — sem água não há através).
       `tintAmt` = quanto TINGIR (curva própria, entrega o azul pro Pricing).
       Eram um argumento só; ver o porquê da separação em setDive. */
    const lensPaint = (frac: number, lensAmt: number, tintAmt: number) => {
      const lens = lensEl.current;
      const el = submergedEl.current;
      if (!lens || !el) return;

      // A TINTA VEM PRIMEIRO E NÃO PASSA PELO EARLY-RETURN DA LENTE.
      // Enquanto os dois amounts eram o mesmo argumento, sair cedo aqui era
      // inofensivo: se não havia lente, não havia tinta. Agora a lente morre com
      // a água e a tinta sobrevive pra entregar o azul ao Pricing — sair cedo
      // CONGELARIA o gradiente da tinta no último valor escrito, bem no meio do
      // cross-fade que o TINT_OUT existe pra fazer.
      const top = (frac * 100).toFixed(2);
      el.style.opacity = String(tintAmt);
      el.style.background =
        `linear-gradient(to bottom, ${SUBMERGED_TOP} ${top}%, ${SUBMERGED_DEEP} 100%)`;

      // 'none', não opacity/alpha: backdrop-filter é caro (lê o backdrop e
      // borra o viewport inteiro por frame) e não pode ficar de pé fora do
      // mergulho, onde não há água nenhuma pra justificar. Também é o que
      // garante que o Pricing pouse NÍTIDO.
      if (lensAmt <= 0.001) {
        lens.style.backdropFilter = "none";
        // setProperty, não .webkitBackdropFilter: o prefixo não existe no
        // CSSStyleDeclaration do TS, e o Safari ainda só entende o prefixado.
        lens.style.setProperty("-webkit-backdrop-filter", "none");
        return;
      }

      lens.style.top = `${top}%`;
      const f =
        `blur(${(LENS_BLUR * lensAmt).toFixed(1)}px)` +
        ` saturate(${(1 + (LENS_SATURATE - 1) * lensAmt).toFixed(3)})`;
      lens.style.backdropFilter = f;
      lens.style.setProperty("-webkit-backdrop-filter", f);
    };

    /* A TELA MOLHADA — ver SCREEN_WET_BLUR pro porquê de ser filter e não lente.
       `amt` 0 = seca (navalha), 1 = submersa.

       O CLIP É METADE DO CONSERTO, e sem ele isto é uma REGRESSÃO, não um ganho:
       `filter` pinta pra FORA da caixa do elemento. O div da tela é um retângulo
       de 390×844 encostado no bisel, então o borrão sangra por cima dele e LAVA a
       borda do aparelho — o bisel escuro vira uma névoa branca e o phone perde o
       contorno. Renderizado, comparado a 4x, e é gritante: exatamente a parte do
       corpo que já estava boa.

       clip-path resolve porque roda DEPOIS do filter no pipeline (filter → clip →
       mask → opacity): o borrão acontece inteiro e só então é recortado na curva
       do display. Medido em A/B de 4 células (clip×blur): clip com blur DESLIGADO
       é indistinguível do original — o recorte sozinho não custa nada, porque cai
       exatamente sobre o borderRadius que o PhoneScreen já desenha. Por isso o
       raio vem de lá, importado, e não copiado.

       Não usar `overflow:hidden` no lugar: ele recorta os FILHOS, não o filter do
       próprio elemento. E não usar `mask`: mask cria Backdrop Root, que é a
       armadilha que o lensEl já documenta. */
    const wetPaint = (amt: number) => {
      const el = screenEl.current;
      if (!el) return;
      // 'none' e não blur(0px): filter cria containing block e força uma camada
      // de composição própria: fora do mergulho a tela não tem que pagar isso.
      // O clip sai junto: ele só existe pra conter o borrão.
      if (amt <= 0.001) {
        el.style.filter = "none";
        el.style.clipPath = "none";
        return;
      }
      el.style.filter =
        `blur(${(SCREEN_WET_BLUR * amt).toFixed(2)}px)` +
        ` saturate(${(1 + (SCREEN_WET_SAT - 1) * amt).toFixed(3)})` +
        ` brightness(${(1 + (SCREEN_WET_BRIGHT - 1) * amt).toFixed(3)})`;
      el.style.clipPath = `inset(0 round ${SCREEN_RADIUS}px)`;
    };

    /* `d` é o bump do PHONE (centrado em wp) e governa o que é do phone: o roll,
       o DIVE_SHRINK, o piso. `camAmt` é a curva atrasada da ALTURA da câmera.
       Quem governa a ÁGUA não é nenhum dos dois — ver waterAmt abaixo. */
    const setDive = (d: number, camAmt: number) => {
      dive.current = d;

      const camera = cam.current;
      /* DOIS gates, defasados de propósito — ver o bloco da inversão abaixo.
         pitchGate: quanto da regra a câmera obedece.
         waterGate: quanta água existe. Fecha ANTES, pra nunca haver água em
         quadro com o horizonte no lugar errado. */
      let pitchGate = 0;
      let waterGate = 0;
      if (camera) {
        /* O PITCH VEM DA ARESTA, NÃO DE UMA CONSTANTE — ver PITCH_CLAMP.

           seamPitch é o ângulo que põe o horizonte exatamente no topo do
           Pricing, que é a base do Mergulho ([data-water-start]). Rect VIVO,
           por frame: se alguém mexer na altura de qualquer seção, a câmera
           acompanha sozinha — o mesmo princípio de wp e do slot de pouso.

           camAmt continua sendo o lerp: fora do mergulho ele é 0 e a câmera fica
           NIVELADA, exatamente como antes, e o pouso no slot do Pricing não vê
           câmera torta nenhuma. A curva própria e atrasada dele (CAM_LAG)
           também segue valendo. O que mudou é só o ALVO do lerp: era um número
           cravado, virou uma leitura do DOM. */
        /* O GATE DO PITCH VEM DA ARESTA, NÃO DO BUMP DO PHONE — e isto era um
           bug em quadro, não um detalhe.

           Estava `seamPitch * camAmt`, reusando o bump que governa a água. Os
           dois não têm nada a ver: camAmt é centrado em wp+CAM_LAG (a passagem
           do PHONE) e a regra fala da ARESTA. Medido, o bump esmagava o pitch
           justo onde a regra ficava interessante — a câmera nunca passava de
           −8° dos −28° exigidos, e o erro entre o horizonte e a emenda ia a
           534px. Em quadro: uma faixa ciano de recife cru acima da linha d'água,
           que é a regra sendo violada em público.

           gate = 1 enquanto a aresta está em quadro; solta quando ela sai. As
           duas pontas existem por motivos DIFERENTES, e nenhuma é gosto:

             embaixo (frac 1.15→0.95): antes de a aresta entrar não há linha pra
               colar, e a fórmula manda +40° (o clamp). A câmera não pode tortar
               enquanto o phone ainda está no card do Features.
             em cima (frac −0.15→−0.55): depois de a aresta sair não há mais
               horizonte em quadro, então o pitch não tem alvo — e é aqui que ele
               PRECISA voltar a zero, porque o phone pousa no slot com a pose
               relativa à câmera. Câmera torta = phone torto (é o bug que
               END_TILT e PHONE_PIVOT_BIAS existem pra evitar).

           Só há espaço pra essa segunda rampa porque o Pricing ganhou 70vh de
           topo (ver Pricing.tsx). Com o layout antigo a aresta saía em p=0.97 e
           o pouso era em p=1.00: não havia onde desvirar, e nenhum número aqui
           resolvia isso. */
        const seam = document.querySelector<HTMLElement>("[data-water-start]");
        let seamPitch = 0;
        if (seam) {
          const frac = seam.getBoundingClientRect().top / window.innerHeight;
          seamPitch = Math.atan(
            Math.tan((CAM_FOV * Math.PI) / 180 / 2) * (2 * frac - 1),
          );
          seamPitch = Math.min(PITCH_CLAMP, Math.max(-PITCH_CLAMP, seamPitch));
          pitchGate = smoothstep(1.15, 0.95, frac) * smoothstep(-0.55, -0.15, frac);
          /* A ÁGUA MORRE ANTES DO PITCH RELAXAR, E ESSA DEFASAGEM É O CONSERTO.

             Os dois já foram o MESMO número, e isso produzia uma inversão em
             quadro: com o gate em 0.3, o pitch fica 70% errado (o horizonte
             desliza de volta pro meio da tela) mas ainda sobram 30% de água pra
             mostrar o estrago. O que se via: o recife NÍTIDO acima do horizonte
             falso — ali o canvas é transparente e o DOM do Pricing aparece cru —
             e abaixo dele o plano d'água visto rasante, um lodo leitoso
             espelhando o céu pálido. Oceano em cima, "fora d'água" embaixo: a
             cena de cabeça pra baixo.

             A regra continua a mesma ("a água só existe enquanto ela é
             verdade"), só que agora ela é aplicada com rigor: waterGate fecha na
             faixa −0.05→−0.30 e o pitchGate só começa a soltar em −0.15. Quando
             o pitch erra, não há mais água pra denunciar; enquanto há água, o
             horizonte está exato. Não há frame em que os dois se contradigam —
             que era o buraco de antes.

             O clímax não se perde: em frac −0.05 a aresta está no topo, a água
             cheia, o pitch em ~−26° e o Fresnel escancarado. Ela dissolve DEPOIS
             disso, num quadro que já é água de borda a borda — sem contraste,
             sem borda, invisível. É o princípio da NÉVOA, aplicado de novo. */
          waterGate = smoothstep(1.15, 0.95, frac) * smoothstep(-0.3, -0.05, frac);
        }
        camera.rotation.x = seamPitch * pitchGate;
        // A ALTURA segue o camAmt: ela não tem alvo no DOM (nada manda a câmera
        // estar a 0.3 da água), é enquadramento puro, e a curva atrasada dele
        // continua sendo a certa — ver CAM_LAG.
        camera.position.y = -DIVE_DROP * camAmt;

        /* A linha da LENTE é a MESMA linha da GEOMETRIA, por construção.
           horizonFrac() é a fórmula que já diz onde o plano cruza a tela; um
           0.5 fixo casaria só enquanto o pitch fosse exatamente zero e
           descolaria no dia em que alguém o mexesse. Uma lente que descola do
           próprio reflexo lê como bug, não como superfície.

           tintRef, não `d`: a tinta tem curva PRÓPRIA — ver TINT em place().
           Amarrá-la ao bump do dive foi meu erro e reproduzia o bug de origem
           da seção: em p=0.82 o phone já estava submerso, de frente, e o azul
           tinha evaporado embaixo dele. Estar dentro d'água não é um pico por
           onde se passa; é um estado em que se fica.

           MAS A LENTE NÃO É A TINTA, e tratar as duas como uma só era um bug em
           quadro. A tinta é a COR do dentro-d'água e ela sobrevive à água de
           propósito — quem a recebe é o submerso do Pricing, e o cross-fade
           entre as duas é o que impede o corte. Já a lente é O QUE SE VÊ ATRAVÉS
           DA ÁGUA: sem água, não há através. Com as duas no mesmo `tint`, medido
           em p≈0.90, o quadro tinha dive=0 — zero água, nenhuma — e ainda assim
           blur(6.5) sobre o Pricing inteiro. Uma parede de desfoque sem nada que
           a justificasse, bem no frame da transição. Era um dos defeitos
           apontados.

           Então a lente ganha o gate da água (`d`) e a tinta segue com a curva
           dela. min(), não produto: no pico os dois são 1 e nada muda; quando a
           água vai embora, a lente vai junto, no compasso dela — não no da
           tinta. */
        lensPaint(
          horizonFrac(camera.rotation.x),
          Math.min(tint.current, waterAmt.current),
          tint.current,
        );
      }

      /* A ÁGUA SEGUE A ARESTA, NÃO O PHONE — e este era o mesmo erro do pitch,
         uma camada abaixo.

         `water.amount` era `d`: o bump centrado em wp, a passagem do PHONE. Mas
         a pergunta "existe mar em quadro?" não é sobre o phone — é sobre a
         SUPERFÍCIE estar em quadro. Com o bump, medido: o mar enchia a 100% em
         p=0.63 (a emenda ainda lá embaixo, perto do pé da tela) e já tinha caído
         pra 41% em p=0.80, que é EXATAMENTE o clímax — a emenda no alto, a
         câmera a −20°, o Fresnel escancarado. A água evaporava no frame que ela
         existe pra entregar, e o que sobrava era uma névoa chapada sem nada
         atravessável. É o bug "a água evaporou" que este arquivo já registra
         duas vezes, reencarnado: das duas vezes anteriores o culpado foi
         amarrar a água a uma curva que não era a dela.

         `gate` é a curva certa e já está calculada: é 1 exatamente enquanto o
         horizonte está onde a regra manda, e cai quando a aresta sai de quadro.
         Ou seja — a água existe exatamente enquanto ela é VERDADE. Onde o gate
         desaba, o pitch também desaba (é o mesmo número), então nunca há um
         frame com água em quadro e horizonte no lugar errado. As duas coisas não
         podem se desencontrar porque são a mesma. */
      waterAmt.current = waterGate;
      water.current.amount = waterGate;

      const wet = waterGate > 0.001;
      if (wet !== wetRef.current) {
        wetRef.current = wet;
        setWaterOn(wet);
      }
    };

    /* O USUÁRIO PODE ESCAPAR — MAS A RODA NÃO ESCAPA MAIS, E ISSO É O CONSERTO.

       A roda ESTAVA aqui, e com ela a entrega NUNCA ACONTECIA. Medido: o phone
       toca a água, deliver() dispara — e o frame seguinte já traz um `wheel` que
       chama isto e mata tudo. Não é o usuário mudando de ideia: é a INÉRCIA do
       gesto que o trouxe até aqui. Trackpad de Mac cospe `wheel` de momentum por
       ~1s depois que o dedo levanta, e o toque na água acontece DENTRO dessa
       cauda, sempre — o gatilho está no fim de um scroll pra baixo, então quem
       chega nele chega com momentum por definição. A entrega se auto-abortava a
       100% das vezes no uso real, e o que sobrava era o usuário terminando o
       trecho na mão, atravessando o S da segunda perna (ver o cy acima). Os dois
       bugs que a Laura apontou eram o mesmo frame.

       Pior: `armed` ia a false no escape, então nem retentava — a única saída
       era subir acima de wp de novo. A página ficava parada dentro d'água em
       p=0.66, que é onde ela travou na medição.

       Não dá pra separar momentum de intenção numa roda: o evento é idêntico,
       o delta grande do flick chega no mesmo instante do gatilho. Então a roda
       sai, e quem segura a entrega contra ela é `lock:true` no Lenis (ver
       deliver()), que ignora e preventDefault o wheel enquanto rola.

       O princípio sobrevive onde ele é honesto: teclado e toque são gestos
       INEQUÍVOCOS — ninguém aperta uma tecla por inércia — e continuam abortando
       no ato. E o sequestro agora dura DELIVER_SCROLL (0.7s), não 1.4s: é da
       ordem de um scroll-snap, não de uma cutscene.

       O abort é stop()+start(), e o caminho óbvio é uma armadilha. Com o lock de
       pé, um scrollTo novo é engolido pelo `if (isLocked && !force) return`
       (lenis.mjs:747); e mesmo com force:true+immediate:true ele bate antes no
       `if (target === this.targetScroll) return` — e durante um scroll
       programático o Lenis reescreve targetScroll pro valor animado TODO frame,
       então mirar no scroll atual cai exatamente nesse early-return, sem nunca
       chegar no reset() que destravaria. A página ficaria presa até o fim do
       tween, com o lock de pé, e o "escape" seria um no-op.
       stop()+start() não tem essa porta: os dois passam por reset() por dentro
       (internalStop/internalStart), que destrava, para a animação e reancora o
       alvo no scroll atual. reset() em si é private no tipo — este é o mesmo
       efeito, pela API pública.

       armed fica false depois de um escape — quem recusou a entrega não deve ser
       resequestrado assim que o dedo sair da tela; só rearma subindo de volta pra
       cima de touchP (a mesma histerese de sempre). */
    const onUserEscape = () => {
      if (!delivering.current) return;
      deliverTl?.kill();
      deliverTl = null;
      const lenis = getLenis();
      lenis?.stop();
      lenis?.start();
      gsap.to(hold, { current: 0, duration: 0.3, ease: "power2.out" });
      water.current.flow = 1;
      delivering.current = false;
      armed.current = false;
      stopEscapeListeners();
    };

    function startEscapeListeners() {
      window.addEventListener("touchstart", onUserEscape, { passive: true });
      window.addEventListener("keydown", onUserEscape);
    }
    function stopEscapeListeners() {
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
      // hold NÃO é cravado em 1 aqui: a entrega agora dispara antes do pico
      // (TOUCH_FRAC), então cravar arrancaria dive de 0.63 pra 1 num frame. Quem
      // o leva a 1 é a rampa da timeline, abaixo.

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
      // O SCROLL VAI PELO LENIS, NÃO POR CIMA DELE — E COM O LOCK DELE.
      //
      // lock:true é o que faz a entrega EXISTIR. Sem ele, o Lenis reancora o
      // alvo dele em qualquer wheel e larga este scrollTo sozinho — e o wheel
      // que chega é o momentum do gesto que trouxe o phone até a água, todo
      // frame, sempre (ver onUserEscape). Este comentário já disse que "o
      // escape continua de graça: uma roda do usuário reancora o target do
      // Lenis e interrompe este scrollTo sozinha" — era verdade, e era exatamente
      // o bug: a roda que interrompia nunca foi do usuário. Com lock, o Lenis
      // ignora e preventDefault o wheel enquanto rola (lenis.mjs:611), e quem
      // decide soltar é o onUserEscape (tecla/toque) via reset().
      //
      // DELIVER_SCROLL, não 1.4s: "não enrole, faça isso mais rápido".
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
        duration: DELIVER_SCROLL,
        lock: true,
        easing: (t: number) =>
          t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
      });
      // A timeline só governa o hold, em três tempos que somam DELIVER_SCROLL —
      // então o onComplete cai no fim do scrollTo e o dive nunca é cortado no
      // meio da queda:
      //
      //   0 → HOLD_RISE .......... hold sobe 0→1 junto com o mar enchendo. Sem
      //                            pop: d = max(bump, hold) e o bump sobe junto.
      //   → +HOLD_BEAT ........... o quadro travado. Mar parado, phone na
      //                            superfície. É o beat do toque.
      //   → o resto .............. o piso cai e o phone afunda, com a página já
      //                            em movimento.
      //
      // O quadro travado era 0.7s — metade da entrega parada olhando pra própria
      // água, DEPOIS de já ter esperado 765px pra disparar. Era a enrolação de
      // dentro; TOUCH_FRAC cortou a de fora.
      deliverTl.to(hold, { current: 1, duration: HOLD_RISE, ease: "none" }, 0);
      deliverTl.to(
        hold,
        {
          current: 0,
          duration: DELIVER_SCROLL - HOLD_RISE - HOLD_BEAT,
          ease: "power2.in",
        },
        HOLD_RISE + HOLD_BEAT,
      );
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
      // e o lock do Lenis sai junto: quem desmonta no meio da entrega (resize
      // pra baixo de lg, que é o que derruba este efeito) levaria embora o
      // único código que sabe destravar. O scrollTo até se completaria sozinho
      // e destravaria no fim, mas só se o Lenis ainda estiver rodando — não é
      // uma aposta que vale a pena pra travar o scroll da página inteira.
      if (delivering.current) {
        const lenis = getLenis();
        lenis?.stop();
        lenis?.start();
        delivering.current = false;
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* A LENTE — ver LENS_BLUR e lensPaint.

          IRMÃ do overlay e em z-[59], NÃO filha dele: dentro do z-[60] o
          mix-blend do submergedEl fecha o Backdrop Root e o borrão não acontece
          (o porquê, e o A/B que provou, estão em LENS_BLUR). Aqui fora o
          backdrop dela é o documento — a página, e só a página. Em z-[59] ela
          entra por baixo do canvas, que é onde a lente de uma água tem que
          estar: o que se vê através da superfície, não a superfície.

          `top` é escrito por frame (fica em 50% enquanto DIVE_PITCH for 0) e
          backdropFilter volta a 'none' fora do mergulho. Sem inset-0: o rect
          começa NA linha e vai até o pé da tela — o céu não se borra. */}
      <div
        aria-hidden
        ref={lensEl}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[59] hidden lg:block"
        style={{ top: "50%" }}
      />
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
            {/* waterAmt, não dive: a névoa fecha pra engolir a água quando ela
                desmonta, então ela tem que seguir a MESMA curva da água. Com o
                bump do phone, medido, ela fechava no clímax (dive já em 41%
                enquanto o gate ainda era 1) e chapava justamente o frame em que
                se deve ver o Pricing através da superfície. Ver setDive. */}
            <FogSync diveRef={waterAmt} />
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
              // o DOM da tela, pra wetPaint borrar por frame — ver SCREEN_WET_BLUR
              screenRef={screenEl}
              scale={[16.5, 16.5, 16.5]}
            />
          </group>
        </Suspense>
      </Canvas>
      {/* A TINTA DO SUBMERSO — e ela é DOM, não WebGL.

          A primeira tentativa foi um ScreenQuad dentro do Canvas com
          renderOrder alto. Renderizou, tingiu a água e o CORPO do phone — e
          deixou a TELA dele nítida e SECA dentro do azul. Porque a tela não é
          WebGL: é DOM real montado por <Html transform> (ver PhoneScreen),
          numa camada CSS3D FORA do canvas. Nenhum shader alcança aquilo — é a
          mesma razão de ela ignorar a névoa da cena.

          SER IRMÃ DO <Canvas> E VIR DEPOIS DELE NÃO BASTAVA, e este comentário
          afirmou por várias rodadas que sim ("cai por cima do canvas E da camada
          CSS3D, então pega os dois de uma vez"). Era falso, e o bug que ele
          escondia é o MESMO que a tentativa do ScreenQuad tinha: a tela do phone
          renderizava seca dentro da água. Provado pintando este div de vermelho
          chapado com blend normal — ele cobria a água e o corpo 3D, e a tela
          sobrava INTACTA por cima.

          O motivo é que z-index auto não vence 16.7 MILHÕES: o <Html> do drei
          traz zIndexRange default [16777271, 0] e escreve isso no wrapper da
          camada CSS3D. Ordem de DOM só decide entre irmãos de MESMO z-index, e
          esses dois nunca estiveram empatados.

          O conserto é um PAR, e os dois lados precisam existir:
            · zIndexRange={[10, 0]} em IPhoneModel.tsx derruba a camada de 16.7M
              pra 0–10;
            · z-[20] AQUI passa por cima dela.
          Só a primeira metade não resolve — medido: com a camada em z-index 10 e
          esta em `auto`, a tela continuava seca. O container do canvas é
          position:absolute com z-index auto, ou seja NÃO cria stacking context,
          então o 10 da camada CSS3D sobe e disputa direto neste nível, onde
          `auto` conta como 0. 10 > 0 e a tela ganhava de novo.

          Se a tela voltar a ler seca dentro d'água, é esta desigualdade que
          quebrou: z-[20] tem que ser maior que o teto do zIndexRange de lá. */}
      <div
        aria-hidden
        ref={submergedEl}
        className="pointer-events-none absolute inset-0 z-[20] mix-blend-multiply"
        style={{ opacity: 0 }}
      />
      </div>
    </>
  );
}

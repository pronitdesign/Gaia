/*
Os stops dos dois céus da travessia.

  SKY_STOPS  → o Manifesto. Só CSS: quando a água morava lá, ela refletia o topo
               deste gradiente (#0A0C11, o preto do Features) e lia como piche.
               A água mudou de seção; este gradiente ficou.

  DIVE_STOPS → o Mergulho. Fonte ÚNICA, consumida por dois lugares:
                 1. Mergulho.tsx → o gradiente CSS de fundo da seção
                 2. Sky3D.tsx    → o skydome dentro do Canvas, que existe só pra
                                   reflexão planar da água ter o que refletir

Reflexão planar só reflete o que está na cena 3D. O céu do Manifesto é CSS, e
CSS não existe pro WebGL — sem o skydome, a água refletiria os Lightformers de
estúdio do Lights.tsx (cinza e branco) e leria como plástico, não como água.

Se estas duas listas divergirem, o reflexo mostra um céu diferente do céu. Por
isso elas são uma só.

NOTA: apesar do nome, isto não é um céu — vai de #0A0C11 (o escuro do Features)
no topo até #FAF9F5 (o creme do Pricing) embaixo, porque a seção inteira é a
costura entre as duas. Escuro em cima, claro embaixo. É a inversão de um céu, e
é de propósito.
*/

export type SkyStop = {
  /** hex, como aparece no CSS */
  color: string;
  /** 0 = topo da seção, 1 = base */
  pos: number;
};

/* Lido das pontas reais: nasce no #0A0C11 do Features e morre no #FAF9F5
   (neutro-50) do Pricing, então a costura some. No miolo floresce pelo roxo da
   marca em vez de passar por cinza neutro (que lia como sujeira/lavado). Os
   stops finais repetem #FAF9F5 pra chegar no tom do Pricing ANTES do fim e
   segurar — sem isso, qualquer arredondamento no último pixel vira uma linha
   visível. */
export const SKY_STOPS: SkyStop[] = [
  { color: "#0A0C11", pos: 0.0 },
  { color: "#0A0C11", pos: 0.12 },
  { color: "#150F22", pos: 0.24 },
  { color: "#241A38", pos: 0.36 },
  { color: "#372953", pos: 0.46 },
  { color: "#5F4590", pos: 0.56 },
  { color: "#6E52A0", pos: 0.64 },
  { color: "#A493C2", pos: 0.72 },
  { color: "#D5CCE0", pos: 0.81 },
  { color: "#EFEBEC", pos: 0.89 },
  { color: "#FAF9F5", pos: 0.95 },
  { color: "#FAF9F5", pos: 1.0 },
];

/* O céu do MERGULHO — a seção onde a água de fato vive.

   Nasce no #FAF9F5 exato em que o Manifesto morre e volta pra ele no fim, pra as
   duas costuras sumirem. Que ele seja CLARO não é escolha estética solta: a água
   reflete o céu da cena, então este creme é o que torna a água pálida e a faz
   entrar no submerso do Pricing sem salto de tom. No ângulo rasante quem manda é
   o reflexo, não a cor da água — foi a lição de quando a água morava no
   Manifesto e refletia o preto do Features.

   O miolo desce um fio pro lavanda: é a luz mudando conforme se aproxima da
   superfície. Sem isso a seção lê como um bloco chapado. */
export const DIVE_STOPS: SkyStop[] = [
  { color: "#FAF9F5", pos: 0.0 },
  { color: "#F4F1F7", pos: 0.34 },
  { color: "#E9E3F1", pos: 0.62 },
  { color: "#F3F0F6", pos: 0.84 },
  { color: "#FAF9F5", pos: 1.0 },
];

const gradientCss = (stops: SkyStop[], angle: string) =>
  `linear-gradient(${angle},` +
  stops.map((s) => `${s.color} ${+(s.pos * 100).toFixed(2)}%`).join(",") +
  ")";

/** O gradiente CSS do Manifesto. */
export const skyGradientCss = (angle = "180deg") => gradientCss(SKY_STOPS, angle);

/** O gradiente CSS do Mergulho. Sky3D lê os MESMOS stops. */
export const diveGradientCss = (angle = "180deg") => gradientCss(DIVE_STOPS, angle);

/**
 * Onde a superfície mora, em fração da seção do Mergulho.
 *
 * 0.5 põe a linha d'água no meio do capítulo: metade pra chegar, metade pra
 * atravessar e sair. O phone cruza aqui — ver [data-phone-water] em Mergulho.tsx.
 */
export const WATER_LINE = 0.5;

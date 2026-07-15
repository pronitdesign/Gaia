/*
Os stops do céu do Manifesto — fonte única, consumida por dois lugares:

  1. Manifesto.tsx  → o gradiente CSS de fundo da seção
  2. Sky3D.tsx      → o skydome dentro do Canvas, que existe só pra reflexão
                      planar da água ter o que refletir

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

/** O gradiente CSS da seção. */
export const skyGradientCss = (angle = "180deg") =>
  `linear-gradient(${angle},` +
  SKY_STOPS.map((s) => `${s.color} ${+(s.pos * 100).toFixed(2)}%`).join(",") +
  ")";

/**
 * Onde a água nasce, em fração da seção.
 *
 * 0.76 cai logo abaixo da segunda frase ("A Gaia cuida do resto.", que resolve
 * em ~72%) e antes de #FAF9F5 fechar a costura com o Pricing em 95% — ou seja,
 * a água vive na faixa lavanda pálida (#A493C2 → #EFEBEC) e sai de cena antes
 * de tocar a emenda. Mexer aqui sem olhar a costura do Pricing é como quebrá-la.
 */
export const WATER_LINE = 0.76;

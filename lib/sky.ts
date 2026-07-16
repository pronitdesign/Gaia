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

/* Nasce no #0A0C11 do Features e floresce pelo roxo da marca em vez de passar
   por cinza neutro (que lia como sujeira/lavado).

   MORRE EM LAVANDA, NÃO EM CREME — e isso mudou.

   Antes ele ia até #FAF9F5 porque emendava DIRETO no creme do Pricing. Não
   emenda mais: o Mergulho entrou no meio, e é ele quem resolve pro Pricing
   agora. Insistir no creme aqui tinha um custo que só apareceu na água: a água
   reflete o céu, e no pico do mergulho o horizonte cai DENTRO desta seção (~19%
   da tela, medido: horizonte em y=176, emenda das seções em y=315). Terminar em
   creme aqui significava água sem cor nenhuma — lavada, exatamente o que ela não
   pode ser.

   Os stops até 0.72 estão intactos de propósito: é sobre eles que "A Gaia cuida
   do resto." (text-ink) é lida, e essa legibilidade já estava calibrada. Só a
   cauda mudou. */
export const SKY_STOPS: SkyStop[] = [
  { color: "#0A0C11", pos: 0.0 },
  { color: "#0A0C11", pos: 0.12 },
  { color: "#150F22", pos: 0.24 },
  { color: "#241A38", pos: 0.36 },
  { color: "#372953", pos: 0.46 },
  { color: "#5F4590", pos: 0.56 },
  { color: "#6E52A0", pos: 0.64 },
  { color: "#A493C2", pos: 0.72 },
  { color: "#B4A3CE", pos: 0.86 },
  { color: "#C0B0D7", pos: 1.0 },
];

/* O céu do MERGULHO — e agora ele é SÓ CÉU, do topo à base.

   Nasce no #C0B0D7 exato em que o Manifesto morre e morre NO HORIZONTE — porque
   a base desta seção É o horizonte (ver Mergulho.tsx: a seção acabou virando o
   ar, e a aresta de baixo dela é a linha d'água).

   ELE RESOLVIA PRO CREME (#FAF9F5) E NÃO RESOLVE MAIS. Aquilo existia porque o
   Mergulho emendava direto no creme do topo do Pricing, e a cauda creme morava
   na metade de baixo, "abaixo da linha d'água, fora do que o horizonte
   amostra". Essa metade não existe mais: a seção acaba NA linha. Uma cauda
   creme aqui seria céu creme bem na altura em que a água o reflete — e céu
   creme é o bug já registrado duas vezes aqui (água lavada, sem cor nenhuma).

   O TOPO É LAVANDA DE VERDADE, e isso É A COR DA ÁGUA — não decoração de fundo.
   No ângulo rasante o Fresnel faz o reflexo mandar sobre a cor própria da água,
   então quem pinta a água é este gradiente. Isso vale MAIS agora, não menos: o
   horizonte não passeia mais pela seção, ele mora fixo na base — então é a cauda
   DAQUI que a água reflete o tempo todo.

   A cauda clareia pra #DED7E8 e para. Não é creme: é o embranquecimento que todo
   céu tem na altura do horizonte (a atmosfera espalha e desatura quanto mais
   rasante o olhar). Dá a distância sem entregar a cor.

   Os valores até 0.46 são os mesmos de quando esta lista ia até o creme —
   intactos de propósito, porque a metade de cima nunca foi o problema. */
export const DIVE_STOPS: SkyStop[] = [
  { color: "#C0B0D7", pos: 0.0 },
  { color: "#C8B9DD", pos: 0.44 },
  { color: "#D5CCE0", pos: 0.78 },
  { color: "#DED7E8", pos: 1.0 },
];

/* A ÁGUA DO PRICING — o terceiro da cadeia, e o primeiro que não é céu.

   Nasce no #FAF9F5 exato em que o Mergulho morre (ver DIVE_STOPS) e desce até o
   teal de /pricing-reef-bg.webp, o recife que ocupa os 40% de baixo da seção.

   ELE ERA PERIWINKLE (#5E87B8) E VIROU TEAL — a troca do asset é que mandou.

   O asset antigo era um monólito sobre musgo num céu de twilight, e o
   #5E87B8 não era escolha estética: era o céu DELE amostrado na altura exata em
   que o corte do object-cover caía, pra emenda não existir como linha. Trocado o
   asset, aquela cor virou uma dívida — periwinkle encostado num recife ciano lê
   como duas seções coladas, não como uma. Os stops de baixo agora perseguem o
   teal do recife pelo mesmo motivo que perseguiam o azul do céu antes: a emenda
   é com a imagem que está lá.

   E A EMENDA NÃO SE RESOLVE MAIS SÓ AQUI. O céu antigo era liso — uma cor só na
   borda do corte, então um stop bastava. A borda do recife varia no horizontal
   (cantos ~#02243C, god rays ~#86BFCD): cor nenhuma cobre isso. Quem fecha é a
   REEF_MASK em Pricing.tsx, que dissolve o topo do asset. Estes stops fazem
   metade do trabalho — chegar no teal certo; a máscara faz a outra metade.
   Mexer num sem olhar o outro é remendar meia emenda.

   POR QUE CLARO EM CIMA, E NÃO O TEAL FUNDO DO TOPO DO ASSET: é sobre esses 60%
   de cima que "Sem surpresa no fim do mês." (text-neutro-800) é lida, e texto
   escuro sobre água-noite não se lê. A mesma régua do Underwater ("por que a
   água é clara"): a profundidade vem da luz, não do escuro. Aqui isso deixou até
   de ser inversão e virou literal — água clara na superfície escurecendo pro
   fundo é o que água faz. O gradiente virou o que a seção sempre fingiu ser.

   O TOPO NÃO É MAIS CREME, E ISSO NÃO É AJUSTE DE GOSTO — É A REGRA NOVA.

   #FAF9F5 estava aqui porque o Mergulho MORRIA em creme e isto emendava com ele:
   ar encostando em ar, e o truque era as duas pontas terem o mesmo hex. Essa
   emenda não existe mais. O topo desta seção agora É A LINHA D'ÁGUA (ver
   Mergulho.tsx: a seção de cima acaba na superfície), então o que encosta aqui é
   AR EM ÁGUA. Manter o creme deixou de ser costura e virou artefato: renderizado,
   ele aparece como uma barra branca de ~10px atravessando a tela exatamente na
   linha — o Mergulho chega em lavanda (#DED7E8, o céu no horizonte) e isto
   respondia com quase-branco.

   Então o primeiro stop é o LAVANDA do horizonte, não o creme: é a mesma cor com
   que o Mergulho morre, porque é o mesmo pixel. A regra de sempre — as duas
   listas se encostam no mesmo hex —, só que agora a ponta de cima mudou de cor.

   E fisicamente é o que a água rasa faz: logo abaixo da superfície ela devolve o
   céu quase inteiro (é por isso que a espuma e o raso são da cor do dia), e só
   ganha corpo com a profundidade. Clara em cima escurecendo pro fundo continua
   sendo a régua da seção — ela só passou a começar no lugar certo.

   OS VALORES SÃO PRÉ-MULTIPLY, e é por isso que parecem claros demais pro que se
   vê na tela. As cáusticas do Underwater passam por cima em multiply (uDeep), e
   multiply só escurece: medido, o #5E87B8 antigo chegava ao olho como ~#375A92
   nos cantos. Quem calibrar estes stops contra screenshot sem descontar isso vai
   clareá-los pra "corrigir" e estourar a água. */
export const PRICING_STOPS: SkyStop[] = [
  /* o MESMO hex em que DIVE_STOPS morre — é o pixel da linha d'água */
  { color: "#DED7E8", pos: 0.0 },
  { color: "#D2DCE8", pos: 0.06 },
  { color: "#BCD8E1", pos: 0.26 },
  { color: "#8CBDCD", pos: 0.43 },
  { color: "#69B0C0", pos: 0.6 },
  { color: "#5AA2B4", pos: 1.0 },
];

/**
 * A cor do gradiente na fração `t`, em [r,g,b] 0–1.
 *
 * Interpola em sRGB entre os stops — igual ao linear-gradient do CSS e ao
 * createLinearGradient do canvas. É por isso que o resultado casa com o fundo
 * sem correção de cor.
 *
 * Existe pra névoa do Mergulho poder ser a cor do céu NA ALTURA DO HORIZONTE, a
 * cada frame. Névoa de cor fixa não some no céu: sobra um degrau, e o degrau lê
 * como corte de seção. Ver FOG em ScrollPhone.
 */
export const sampleStops = (
  stops: SkyStop[],
  t: number,
): [number, number, number] => {
  const x = Math.min(1, Math.max(0, t));
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (x >= stops[i].pos && x <= stops[i + 1].pos) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi.pos - lo.pos;
  const k = span === 0 ? 0 : (x - lo.pos) / span;
  const rgb = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
  ];
  const a = rgb(lo.color);
  const b = rgb(hi.color);
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
};

const gradientCss = (stops: SkyStop[], angle: string) =>
  `linear-gradient(${angle},` +
  stops.map((s) => `${s.color} ${+(s.pos * 100).toFixed(2)}%`).join(",") +
  ")";

/** O gradiente CSS do Manifesto. */
export const skyGradientCss = (angle = "180deg") => gradientCss(SKY_STOPS, angle);

/** O gradiente CSS do Mergulho. Sky3D lê os MESMOS stops. */
export const diveGradientCss = (angle = "180deg") => gradientCss(DIVE_STOPS, angle);

/** O gradiente CSS do Pricing — o fundo da seção, sob a faixa do asset. */
export const pricingGradientCss = (angle = "180deg") =>
  gradientCss(PRICING_STOPS, angle);

/* WATER_LINE (era 0.5 — "onde a superfície mora, em fração da seção do
   Mergulho") MORREU, e vale registrar por quê, pra ninguém trazer de volta.

   Ela dizia que a superfície morava no MEIO do Mergulho. Mas a superfície não
   obedece a CSS: o horizonte de um plano horizontal cai na altura do olho, e com
   a câmera nivelada isso é 50% da TELA — não 50% da seção. Os dois só coincidem
   por acidente de scroll, e medido eles estavam a 472px um do outro: um
   horizonte de WebGL no meio da tela e uma emenda de seção meio viewport abaixo.

   A resposta deixou de ser uma fração e virou uma ARESTA: a linha é a base do
   Mergulho, que é o topo do Pricing. Quem obedece a quem também inverteu — não
   se escolhe mais onde a linha cai e se torce pra câmera concordar; lê-se onde a
   aresta está e DERIVA-SE o pitch que põe o horizonte nela (ver ScrollPhone).
   Por isso não sobra número nenhum pra exportar daqui. */

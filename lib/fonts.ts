import localFont from "next/font/local";

// Títulos → Sentient (serifada). CONTEXT.md §5
// SÓ a face normal vive aqui — e portanto só ela é preloaded. O itálico morava
// nesta mesma chamada e vinha junto no preload: 52KB (o maior arquivo de fonte
// do site) em prioridade High na janela do LCP, pra servir meia dúzia de spans
// que só existem abaixo da dobra. Ver `sentientItalic` abaixo.
export const sentient = localFont({
  src: [
    {
      path: "../public/fonts/Sentient-Variable.woff2",
      weight: "200 700",
      style: "normal",
    },
  ],
  variable: "--font-title",
  display: "swap",
});

// Itálico do Sentient — chamada PRÓPRIA por causa do preload:false (o next/font
// não tem preload por arquivo, só por chamada). Preço da separação: vira outra
// família com hash próprio, então `font-style: italic` sob --font-title passa a
// ser SLANT SINTÉTICO — todo itálico de título tem que usar a utility
// `.font-title-italic` (globals.css), que aponta pra ESTA família. Auditoria
// Felix 2.2; a fonte chega on-demand quando o primeiro itálico entra em cena.
export const sentientItalic = localFont({
  src: [
    {
      path: "../public/fonts/Sentient-VariableItalic.woff2",
      weight: "200 700",
      style: "italic",
    },
  ],
  variable: "--font-title-italic",
  display: "swap",
  preload: false,
});

// Corpo → Clash Display. CONTEXT.md §5
export const clashDisplay = localFont({
  src: [
    {
      path: "../public/fonts/ClashDisplay-Variable.woff2",
      weight: "200 700",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
});

// Corpo do bloco do Kácio → Clash Grotesk (grotesca de trabalho, distinta da
// Display). Estáticas Regular/Medium; entra só no bloco dele via `font-grotesk`,
// sem mexer no corpo da Pronit (que segue Clash Display via --font-body).
export const clashGrotesk = localFont({
  src: [
    {
      path: "../public/fonts/ClashGrotesk-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/ClashGrotesk-Medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-grotesk",
  display: "swap",
});

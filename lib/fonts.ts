import localFont from "next/font/local";

// Títulos → Sentient (serifada). CONTEXT.md §5
export const sentient = localFont({
  src: [
    {
      path: "../public/fonts/Sentient-Variable.woff2",
      weight: "200 700",
      style: "normal",
    },
    {
      path: "../public/fonts/Sentient-VariableItalic.woff2",
      weight: "200 700",
      style: "italic",
    },
  ],
  variable: "--font-title",
  display: "swap",
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

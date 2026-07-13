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

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        azul: {
          50: "#EFF4F8",
          100: "#DFE9F1",
          200: "#C2D2E4",
          300: "#A6BAD5",
          400: "#95A9C4",
          500: "#7A90AE",
          600: "#617697",
          700: "#4B5D79",
          800: "#3A485E",
          900: "#2A3446",
        },
        roxo: {
          50: "#F5F1F7",
          100: "#EADFEF",
          200: "#D9C8E3",
          300: "#C1A9D3",
          400: "#A385C0",
          500: "#7454AA",
          600: "#5F4590",
          700: "#4A3670",
          800: "#372953",
          900: "#241A38",
        },
        sage: {
          50: "#EEF2E8",
          100: "#DDE4D2",
          200: "#C4CFB4",
          300: "#A6B58F",
          400: "#8B9E6F",
          500: "#6F8354",
          600: "#586B42",
          700: "#445333",
          800: "#333F27",
          900: "#232B1B",
        },
        neutro: {
          0: "#FFFFFF",
          50: "#FAF9F5",
          100: "#F4F2EC",
          200: "#E8E5DC",
          300: "#D7D5CB",
          400: "#B7B6AD",
          500: "#8E8E86",
          600: "#6A6B6E",
          700: "#4C4F5A",
          800: "#2B2E3A",
        },
        // Botões/CTA — padrão do DS (Figma node 17-38)
        brand: {
          DEFAULT: "#8A69D8",
          600: "#7A57CE",
          700: "#6B48BD",
        },
        ink: "#000A1A",
        hairline: "rgba(0,0,39,0.1)",
        success: "#6F8354",
        warning: "#D6A04E",
        error: "#C05B5B",
        info: "#7A90AE",
      },
      fontFamily: {
        title: ["var(--font-title)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      fontSize: {
        // Desktop scale — CONTEXT.md §5
        display: ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }], // 72
        h1: ["3.5rem", { lineHeight: "1.08", letterSpacing: "-0.02em" }], // 56
        h2: ["2.5rem", { lineHeight: "1.12", letterSpacing: "-0.01em" }], // 40
        h3: ["1.75rem", { lineHeight: "1.2" }], // 28
        "body-l": ["1.25rem", { lineHeight: "1.6" }], // 20
        body: ["1.0625rem", { lineHeight: "1.6" }], // 17
        small: ["0.875rem", { lineHeight: "1.5" }], // 14
        eyebrow: ["0.8125rem", { lineHeight: "1.4", letterSpacing: "0.08em" }], // 13
      },
      borderRadius: {
        sm: "8px",
        md: "16px",
        lg: "24px",
        card: "40px",
      },
      spacing: {
        18: "4.5rem", // 72
        22: "5.5rem", // 88
        30: "7.5rem", // 120
        128: "32rem",
      },
      backgroundImage: {
        // Gradientes "Fluxo" (assinatura) — CONTEXT.md §5
        bruma: "linear-gradient(135deg, #DFE9F1 0%, #C2D2E4 50%, #95A9C4 100%)",
        lavanda: "linear-gradient(135deg, #F1ECF2 0%, #E6DBE2 50%, #CFC5DA 100%)",
        afluente: "linear-gradient(135deg, #DFE9F1 0%, #E6DBE2 50%, #FAF9F5 100%)",
        aurora:
          "linear-gradient(135deg, #95A9C4 0%, #CFC5DA 35%, #E6DBE2 70%, #FAF9F5 100%)",
      },
      boxShadow: {
        // Elevação: baixa, suave, tint frio/lavanda — CONTEXT.md §5
        soft: "0 2px 8px -2px rgba(58, 72, 94, 0.08), 0 8px 24px -8px rgba(58, 72, 94, 0.10)",
        "soft-lg":
          "0 4px 16px -4px rgba(58, 72, 94, 0.10), 0 16px 40px -12px rgba(58, 72, 94, 0.14)",
        // vidro claro flutuante: inset highlight na quina de cima + sombra
        // externa larga/difusa, mesmo tint frio da elevação padrão do DS.
        glass:
          "inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 16px -4px rgba(58, 72, 94, 0.10), 0 32px 64px -24px rgba(58, 72, 94, 0.22)",
      },
      transitionTimingFunction: {
        // easing assinatura do brief
        gaia: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;

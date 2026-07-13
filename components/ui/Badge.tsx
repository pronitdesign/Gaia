import type { ReactNode } from "react";

/* Badge padrão do Gaia — eyebrow/label de seção, reutilizável na LP.
   Vidro real em camadas + anel de luz orbitando a borda (assinatura).
   tone="light" (fundos claros) | tone="dark" (fundos escuros, ex.: A Roberta).
   Tudo respeita prefers-reduced-motion. */

type Tone = "light" | "dark";

const TONES: Record<
  Tone,
  {
    shell: string;
    gloss: string;
    edge: string;
    ring: string;
    dot: string;
    icon: string;
  }
> = {
  light: {
    shell:
      "border-white/60 bg-neutro-0/45 text-neutro-700 shadow-soft [--gaia-halo:rgba(138,105,216,0.45)]",
    gloss: "from-white/55 via-white/12 to-transparent",
    edge: "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65),inset_0_-1px_0_0_rgba(255,255,255,0.28)]",
    ring: "[--gaia-ring:rgba(138,105,216,0.9)]",
    dot: "bg-brand",
    icon: "text-brand",
  },
  dark: {
    shell:
      "border-white/10 bg-white/[0.055] text-white/70 shadow-[0_2px_24px_-8px_rgba(0,0,0,0.6)] [--gaia-halo:rgba(163,133,192,0.5)]",
    gloss: "from-white/15 via-white/[0.04] to-transparent",
    edge: "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),inset_0_-1px_0_0_rgba(255,255,255,0.05)]",
    ring: "[--gaia-ring:rgba(178,150,206,0.95)]",
    dot: "bg-roxo-400",
    icon: "text-roxo-300",
  },
};

export function Badge({
  children,
  dot = true,
  icon,
  tone = "light",
  className = "",
}: {
  children: ReactNode;
  dot?: boolean;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={`group relative isolate inline-flex items-center gap-2 overflow-hidden rounded-full border px-4 py-2 font-body text-[12px] font-semibold uppercase leading-none tracking-[0.08em] backdrop-blur-md backdrop-saturate-150 ${t.shell} ${className}`}
    >
      {/* brilho superior — degradê suave que a pílula corta */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b ${t.gloss}`}
      />
      {/* rebordo de vidro: luz fina em cima e embaixo (refração) */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-full ${t.edge}`}
      />
      {/* anel de luz orbitando a borda (assinatura) */}
      <span
        aria-hidden
        className={`gaia-badge-ring pointer-events-none absolute inset-0 rounded-full p-px ${t.ring}`}
      />

      <span className="relative z-10 flex items-center gap-2">
        {icon ? (
          <span className={t.icon}>{icon}</span>
        ) : (
          dot && (
            <span
              className={`gaia-badge-halo h-1.5 w-1.5 rounded-full ${t.dot}`}
            />
          )
        )}
        {children}
      </span>
    </span>
  );
}

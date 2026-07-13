import type { ReactNode } from "react";

/* Badge padrão do Gaia — eyebrow/label de seção, reutilizável na LP.
   Vidro real em camadas: translúcido + blur saturado, brilho superior curvo,
   hairline dupla (luz em cima / sombra embaixo) e um sheen que cruza o vidro.
   Ponto brand com halo pulsando. Tudo respeita prefers-reduced-motion. */

export function Badge({
  children,
  dot = true,
  icon,
  className = "",
}: {
  children: ReactNode;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`group relative isolate inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/60 bg-neutro-0/45 px-4 py-2 font-body text-[12px] font-semibold uppercase leading-none tracking-[0.08em] text-neutro-700 shadow-soft backdrop-blur-md backdrop-saturate-150 ${className}`}
    >
      {/* brilho superior — degradê suave que a pílula corta (sem banda dura) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b from-white/55 via-white/12 to-transparent"
      />
      {/* rebordo de vidro: luz fina em cima E embaixo (refração), sem sombra dura */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65),inset_0_-1px_0_0_rgba(255,255,255,0.28)]"
      />
      {/* sheen — luz diagonal que atravessa de tempos em tempos */}
      <span
        aria-hidden
        className="gaia-badge-sheen pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
      />

      <span className="relative z-10 flex items-center gap-2">
        {icon ? (
          <span className="text-brand">{icon}</span>
        ) : (
          dot && (
            <span className="gaia-badge-halo h-1.5 w-1.5 rounded-full bg-brand" />
          )
        )}
        {children}
      </span>
    </span>
  );
}

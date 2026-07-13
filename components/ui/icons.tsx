import type { SVGProps } from "react";

/* Line icons — estilo fino premium (stroke 1.6, cantos redondos).
   currentColor herda a cor do texto. Tamanho via className (h-/w-). */

function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </Svg>
  );
}

/* Passo 01 — traga seus pacientes (add paciente) */
export function IconUserPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="8" r="3.6" />
      <path d="M4 19a6 6 0 0 1 12 0" />
      <path d="M19 8v6M22 11h-6" />
    </Svg>
  );
}

/* Passo 02 — envie a anamnese (enviar) */
export function IconSend(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M21.5 2.5 2 11l7 2.6L11.6 21 21.5 2.5Z" />
      <path d="M21.5 2.5 9 13.6" />
    </Svg>
  );
}

/* Passo 03 — receba pronta (resumo pronto) */
export function IconClipboardCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="m9 13.5 2 2 4-4" />
    </Svg>
  );
}

/* Feature — link que chega sozinho */
export function IconLink(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M8 12 5.8 14.2a3.1 3.1 0 0 0 4.4 4.4L12 16.6" />
      <path d="M16 12l2.2-2.2a3.1 3.1 0 0 0-4.4-4.4L12 7.4" />
    </Svg>
  );
}

/* Feature — perguntas que se adaptam */
export function IconSparkles(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 4.5c.4 2.8 1.7 4.1 4.5 4.5-2.8.4-4.1 1.7-4.5 4.5-.4-2.8-1.7-4.1-4.5-4.5 2.8-.4 4.1-1.7 4.5-4.5Z" />
      <path d="M18 14.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3Z" />
    </Svg>
  );
}

/* Feature — histórico numa linha do tempo */
export function IconTimeline(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M6 4v16" />
      <circle cx="6" cy="8" r="1.6" />
      <circle cx="6" cy="16" r="1.6" />
      <path d="M10 8h9M10 16h9" />
    </Svg>
  );
}

/* Check simples — itens da lista "Inclui" (Pricing) */
export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="m5 12 4.5 4.5L19 7" />
    </Svg>
  );
}

/* Feature — seguro por padrão (LGPD) */
export function IconShield(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 3 5 6v5.5c0 4.2 2.8 7.3 7 8.5 4.2-1.2 7-4.3 7-8.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

/* CTA — seta diagonal (eco do "↗" dos fechamentos Linear/Zipline) */
export function IconArrowUpRight(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M8 16 16 8" />
      <path d="M9 8h7v7" />
    </Svg>
  );
}

/* ── Sociais (footer) — glifos de marca. Instagram fica no estilo de linha do
   sistema; LinkedIn/YouTube são preenchidos (logos lêem melhor sólidos). */
export function IconInstagram(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconLinkedin(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M4.98 3.5A2 2 0 1 1 3 5.5a2 2 0 0 1 1.98-2ZM3.2 8.6h3.56V21H3.2Zm5.86 0h3.41v1.7h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46V21h-3.56v-5.32c0-1.27-.02-2.9-1.77-2.9s-2.04 1.38-2.04 2.81V21H9.06Z" />
    </svg>
  );
}

export function IconYoutube(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26.2 26.2 0 0 0 2 12a26.2 26.2 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26.2 26.2 0 0 0 22 12a26.2 26.2 0 0 0-.4-4.8ZM10 15.2V8.8l5.2 3.2Z" />
    </svg>
  );
}

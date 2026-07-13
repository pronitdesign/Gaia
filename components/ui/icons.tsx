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

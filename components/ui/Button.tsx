import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

/* Botão padrão do Gaia — DS Figma node 17-38.
   Pill, h-40, px-15, Clash Display Medium 14px, tracking -0.14px.
   Primário = brand (#8A69D8) · Secundário = borda hairline + ink. */

type Variant = "primary" | "secondary";

const base =
  "inline-flex h-10 items-center justify-center rounded-full px-[15px] font-body text-[14px] font-medium leading-[1.2] tracking-[-0.14px] whitespace-nowrap transition-all duration-200 ease-gaia outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutro-50 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0",
  secondary:
    "border border-hairline bg-transparent text-ink hover:border-neutro-400 hover:-translate-y-0.5 active:translate-y-0",
};

type CommonProps = { variant?: Variant; className?: string; children: ReactNode };

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/** Mesma aparência, renderizado como <a> (para CTAs que navegam). */
export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </a>
  );
}

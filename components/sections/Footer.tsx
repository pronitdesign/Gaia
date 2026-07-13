"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Logo } from "@/components/ui/Logo";

gsap.registerPlugin(ScrollTrigger);

/* ── Footer ──────────────────────────────────────────────────────────────
   Pouso final. Âncora: footers Stripe/Linear — densos mas organizados,
   calmos, foco em clareza e acessibilidade. Faixa escura fecha a leitura
   dando continuidade ao navy da Features/A Roberta. Logo + tagline à
   esquerda; colunas Produto · Empresa · Legal à direita. Border-top 1px
   Névoa (hairline no escuro). Motion: reveal fade-up simples; links com
   hover shift pro Roxo (150ms). Contraste AA + foco visível no teclado. */

type Link = { label: string; href: string };
type Column = { heading: string; links: Link[] };

// Âncoras existentes: #como-comecar · #features · #a-roberta.
// Preço / Contato / páginas legais ainda não existem — hrefs placeholder [confirmar].
const COLUMNS: Column[] = [
  {
    heading: "Produto",
    links: [
      { label: "Recursos", href: "#features" },
      { label: "Preço", href: "#preco" },
      { label: "Como começar", href: "#como-comecar" },
    ],
  },
  {
    heading: "Empresa",
    links: [
      { label: "A Roberta", href: "#a-roberta" },
      { label: "Contato", href: "mailto:contato@gaia.com.br" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacidade", href: "/privacidade" },
      { label: "Termos", href: "/termos" },
      { label: "LGPD", href: "/lgpd" },
    ],
  },
];

/* Link com hover shift pro Roxo (150ms) + foco visível no teclado. */
function FooterLink({ label, href }: Link) {
  return (
    <a
      href={href}
      className="inline-block whitespace-nowrap rounded-sm font-body text-body text-white/55 transition-colors duration-150 hover:text-roxo-300 focus-visible:text-roxo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roxo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1016]"
    >
      {label}
    </a>
  );
}

export default function Footer() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return; // pouso final: sem motion pesado, e nenhum se o usuário pediu menos

      gsap.from("[data-reveal]", {
        y: 24,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.06,
        scrollTrigger: { trigger: root.current, start: "top 88%", once: true },
      });
    },
    { scope: root },
  );

  return (
    <footer
      ref={root}
      className="relative border-t border-white/10 bg-[#0E1016] text-white"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:px-10 md:py-24 lg:px-16">
        {/* topo: marca à esquerda · colunas de links à direita */}
        <div className="grid grid-cols-1 gap-x-12 gap-y-14 md:grid-cols-[1.4fr_1fr] lg:grid-cols-[1.6fr_1fr]">
          {/* marca + tagline */}
          <div data-reveal className="max-w-sm">
            <Logo className="h-9 w-auto text-neutro-50" title="Gaia" />
            <p className="mt-6 font-body text-body-l leading-relaxed text-white/55">
              A anamnese que entende quem está do outro lado.
            </p>
          </div>

          {/* colunas Produto · Empresa · Legal */}
          <nav
            aria-label="Rodapé"
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3"
          >
            {COLUMNS.map((col) => (
              <div key={col.heading} data-reveal>
                <h2 className="font-body text-eyebrow font-semibold uppercase tracking-wide text-white/40">
                  {col.heading}
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink {...link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* rodapé legal — border-top Névoa fecha a faixa */}
        <div
          data-reveal
          className="mt-16 flex flex-col gap-2 border-t border-white/10 pt-8 font-body text-small text-white/40 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>© 2026 Gaia · [razão social / CNPJ a confirmar]</p>
          <p>Feito no consultório, para o consultório.</p>
        </div>
      </div>
    </footer>
  );
}

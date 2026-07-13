"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Logo } from "@/components/ui/Logo";
import {
  IconInstagram,
  IconLinkedin,
  IconYoutube,
} from "@/components/ui/icons";
import type { ComponentType, SVGProps } from "react";

gsap.registerPlugin(ScrollTrigger);

/* ── Footer ──────────────────────────────────────────────────────────────
   Pouso final, embutido no CTA como card de vidro sobre a imagem. Denso mas
   organizado (âncora: Function/Stripe). Conteúdo espelha o footer real do
   produto (gaianutri.app): marca + tagline + contato · colunas Produto ·
   Conta · Legal · bloco de newsletter · linha de confiança (Brasil/LGPD).
   Motion: reveal fade-up; links com hover shift pro Roxo (150ms). AA + foco. */

type Link = { label: string; href: string };
type Column = { heading: string; links: Link[] };
type Social = { label: string; href: string; Icon: ComponentType<SVGProps<SVGSVGElement>> };

// Links reais do produto (gaianutri.app). Âncoras de seção usam /#… pra
// funcionar tanto na LP quanto vindo de outra rota.
const COLUMNS: Column[] = [
  {
    heading: "Produto",
    links: [
      { label: "Workspace", href: "/#workspace" },
      { label: "Como funciona", href: "/#como-funciona" },
      { label: "Segurança", href: "/#seguranca" },
    ],
  },
  {
    heading: "Conta",
    links: [
      { label: "Entrar", href: "/login" },
      { label: "Começar grátis", href: "/login" },
      { label: "Acesso do paciente", href: "/app" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacidade", href: "/privacidade" },
      { label: "Termos de uso", href: "/termos" },
      { label: "Suporte", href: "/suporte" },
    ],
  },
];

const CONTATO = "contato@gaianutri.app";

// Perfis sociais — Instagram é o canal forte da Roberta (+1M). [handles a confirmar]
const SOCIAL: Social[] = [
  { label: "Instagram", href: "https://instagram.com/", Icon: IconInstagram },
  { label: "LinkedIn", href: "https://linkedin.com/", Icon: IconLinkedin },
  { label: "YouTube", href: "https://youtube.com/", Icon: IconYoutube },
];

/* Link de navegação — hover shift pro Roxo (150ms) + foco visível no teclado. */
function FooterLink({ label, href }: Link) {
  return (
    <a
      href={href}
      className="inline-block rounded-sm font-body text-[15px] text-white/55 transition-colors duration-150 hover:text-roxo-300 focus-visible:text-roxo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roxo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1016]"
    >
      {label}
    </a>
  );
}

/* embedded = footer vive DENTRO do CTA Final, como card de vidro sobre a
   imagem full-bleed: dispensa o próprio fundo escuro e afina o respiro. */
export default function Footer({ embedded = false }: { embedded?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return; // pouso final: sem motion pesado, e nenhum se pediram menos

      // "in" do footer: o card sobe, entra em foco (blur→nítido) e escala leve;
      // o conteúdo interno escalona logo em seguida, sobrepondo o fim do card.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 88%", once: true },
      });
      tl.from(card.current, {
        yPercent: 9,
        autoAlpha: 0,
        scale: 0.98,
        filter: "blur(10px)",
        transformOrigin: "50% 100%",
        duration: 1.05,
        ease: "power3.out",
        clearProps: "filter",
      }).from(
        "[data-reveal]",
        {
          y: 20,
          autoAlpha: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.07,
        },
        "-=0.72",
      );
    },
    { scope: root },
  );

  return (
    <footer
      ref={root}
      className={
        embedded
          ? // quase colado nas bordas — só um respiro deixa a imagem escapar
            "relative bg-transparent px-2 pb-2 text-white md:px-3 md:pb-3"
          : "relative border-t border-white/10 bg-[#0E1016] text-white"
      }
    >
      <div
        ref={card}
        className={
          embedded
            ? // glass premium: sem stroke — realce de luz interno no topo (refração),
              // preenchimento em degradê translúcido + blur + sombra funda
              "relative mx-auto w-full max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.09] to-white/[0.03] px-6 py-10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.14),inset_0_-1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-2xl backdrop-saturate-150 md:px-12 md:py-12"
            : "mx-auto w-full max-w-6xl px-6 py-20 md:px-10 md:py-24 lg:px-16"
        }
      >
        {/* topo: marca+contato · colunas · newsletter (12 colunas no desktop) */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-12">
          {/* marca + tagline + contato */}
          <div data-reveal className="lg:col-span-3">
            <Logo className="h-9 w-auto text-neutro-50" title="Gaia" />
            <p className="mt-6 max-w-xs font-body text-body leading-relaxed text-white/55">
              Workspace clínico para nutricionistas — a anamnese que entende
              quem está do outro lado.
            </p>
            <div className="mt-7">
              <p className="font-body text-eyebrow font-semibold uppercase tracking-wide text-white/40">
                Contato
              </p>
              <a
                href={`mailto:${CONTATO}`}
                className="mt-2 inline-block rounded-sm font-body text-[15px] text-white/70 transition-colors duration-150 hover:text-roxo-300 focus-visible:text-roxo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roxo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1016]"
              >
                {CONTATO}
              </a>
            </div>
            {/* sociais — chips de vidro */}
            <ul className="mt-7 flex items-center gap-2.5">
              {SOCIAL.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-white/65 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roxo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1016]"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* colunas de navegação — links reais do produto */}
          <nav
            aria-label="Rodapé"
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:col-span-5"
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

          {/* newsletter — um e-mail por mês, sem ruído */}
          <div data-reveal className="lg:col-span-4">
            <h2 className="font-title text-[1.4rem] font-medium leading-snug text-white">
              Novidades no seu e&#8288;-&#8288;mail
            </h2>
            <p className="mt-2 font-body text-small leading-relaxed text-white/55">
              Ideias de consultório e novidades do produto. Um e-mail por mês,
              sem ruído.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-5 flex flex-col gap-2.5 sm:flex-row"
            >
              <label htmlFor="footer-email" className="sr-only">
                Seu e-mail
              </label>
              <input
                id="footer-email"
                type="email"
                required
                placeholder="Seu melhor e-mail"
                className="h-11 w-full rounded-full bg-white/[0.06] px-4 font-body text-[14px] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] outline-none transition-colors duration-150 placeholder:text-white/40 focus-visible:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-brand/45"
              />
              <button
                type="submit"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-brand px-5 font-body text-[14px] font-medium text-white transition-all duration-200 ease-gaia hover:-translate-y-0.5 hover:bg-brand-600 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1016]"
              >
                Assinar
              </button>
            </form>
          </div>
        </div>

        {/* linha de confiança — espelha o footer real (Brasil · LGPD) */}
        <div
          data-reveal
          className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-8 font-body text-small text-white/40 md:flex-row md:items-center md:justify-between"
        >
          <p>© 2026 Gaia · Hospedado no Brasil.</p>
          <p className="text-white/30">
            Workspace clínico operado conforme a LGPD.
          </p>
        </div>
      </div>
    </footer>
  );
}

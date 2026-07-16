"use client";

import { useRef } from "react";
import Script from "next/script";
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

/* Link de navegação — hover shift pro Roxo (150ms) + foco visível no teclado.
   A paleta NÃO depende mais de `embedded`: os dois modos são noturnos hoje
   (ver o comentário do <footer> abaixo), então a escada de branco vale pros
   dois e o `embedded` só decide GEOMETRIA. A versão clara (neutro-600 +
   brand-600) morreu com o card creme.

   `ring-offset-[#0E1016]` serve os dois: no modo cheio é literalmente o bg;
   no vidro é a cor de que o vidro é feito — o offset cai sobre o próprio
   card, não sobre o que passa atrás. */
function FooterLink({ label, href }: Link) {
  return (
    <a
      href={href}
      /* py-1 -my-1 infla o ALVO de toque de ~20px pra ~28px (WCAG 2.5.8 pede
         24) sem mexer um pixel no layout — o -my devolve o espaço que o py
         toma, então o gap-3 da coluna não muda. */
      className="inline-block rounded-sm py-1 -my-1 font-body text-[15px] text-white/55 transition-colors duration-150 hover:text-roxo-300 focus-visible:text-roxo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roxo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1016]"
    >
      {label}
    </a>
  );
}

/* embedded = footer vive DENTRO do CTA Final, como card de VIDRO PRETO
   flutuando na folga do palco. Hoje `embedded` decide só GEOMETRIA (card
   com folga lateral vs. faixa cheia) — a paleta é noturna nos dois.

   O VIDRO É O PONTO, não decoração: é ele que deixa a FLOR aparecer atrás
   (ver o comentário dela em CTAFinal.tsx). Card opaco a engolia — a ordem do
   DOM faz o card pintar POR CIMA dela, então translucidez é a única via pra
   ela existir sob o rodapé em vez de só ao lado dele.

   ELE JÁ FOI VIDRO ANTES, branco (`from-white/[0.09] to-white/[0.03]` +
   `backdrop-blur-2xl`) sobre a cena escura. Virou card creme sólido quando a
   costura passou a fechar em `#FAF9F5`, e o blur foi junto (não havia mais o
   que refratar: só gradiente sólido atrás). Agora que o rodapé voltou pra
   noite, o vidro volta — preto, e com o que refratar de novo.

   0.72 DE TINTA não é gosto, é o piso do contraste. O que passa atrás é a
   flor (lavanda clara) sobre `#0E1016`; o tier mais frágil é `text-white/55`
   dos links. No pior caso — pico da flor, já borrado pelo `backdrop-blur-2xl`
   — o vidro assenta em ~#282031 e o link mede ~5.6:1: passa AA. Baixar a
   tinta mostra mais flor e derruba o link abaixo de 4.5:1. Se for abrir o
   vidro, o que sobe junto é o tier do link, não só o alpha.

   O fundo quase-preto atrás deste card é responsabilidade do CTAFinal (o
   `<body>` é creme, ver globals) — sem ele o vidro assenta sobre creme e nada
   disto vale. */
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
      {/* define <laura-signature>. type="module" já é deferido: não bloqueia
        render, e a assinatura só é interativa depois de hidratar de qualquer
        forma. Uma vez por página — o próprio arquivo guarda contra redefinir. */}
      <Script type="module" src="/laura-signature.js" strategy="afterInteractive" />

      <div
        ref={card}
        className={
          embedded
            ? // VIDRO PRETO. `backdrop-blur-2xl` é o que transforma a flor atrás
              // em presença difusa em vez de recorte legível através do card —
              // e é também o que salva o contraste, porque borra os picos claros
              // dela antes de a tinta ter que dar conta deles.
              // `border-white/10` + inset highlight = a quina de cima pegando
              // luz; sem eles o card não lê como vidro, lê como buraco.
              // `overflow-hidden` mantém o sheen e o grão dentro do raio.
              "relative mx-auto w-full max-w-7xl overflow-hidden rounded-card border border-white/10 bg-[rgba(14,16,22,0.72)] px-6 py-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-[1.2] md:px-12 md:py-12"
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
            {/* sociais — chips de vidro sobre vidro: `white/[0.06]` quase
              invisível até o hover, que abre pra `white/[0.12]`. Some com o
              card creme, a versão em tom (neutro-100→200) foi junto. */}
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
              {/* Input: chip de vidro `white/[0.06]` → abre pra `white/[0.1]`
                no foco. Placeholder em white/40 (o mesmo tier dos eyebrows). */}
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

        {/* linha de confiança — espelha o footer real (Brasil · LGPD).
          `border-white/10`: o mesmo traço de luz das outras quinas do vidro.
          (`border-hairline`, a versão quase-preta, era do card creme.) */}
        <div
          data-reveal
          className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-8 font-body text-small text-white/40 md:flex-row md:items-center md:justify-between"
        >
          <p>© 2026 Gaia · Hospedado no Brasil.</p>

          {/* assinatura de autoria — a janela do retrato abre no hover.
            `no-sync`: o arquivo, por default, busca foto/link em
            eckertlaura.com a cada load. Numa página que afirma LGPD uma linha
            acima, o IP do visitante não sai daqui. Congelado nos embutidos.
            `size` e `no-sync` como string: React 18 não trata custom element. */}
          <div className="inline-flex flex-col items-start gap-[7px]">
            <span className="font-body text-[11px] uppercase leading-none tracking-[0.09em] text-white/30">
              Designed by
            </span>
            <laura-signature size="16px" no-sync="" />
          </div>

          <p className="text-white/30">Workspace clínico operado conforme a LGPD.</p>
        </div>
      </div>
    </footer>
  );
}

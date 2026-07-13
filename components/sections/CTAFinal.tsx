"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconArrowUpRight } from "@/components/ui/icons";
import Footer from "@/components/sections/Footer";

gsap.registerPlugin(ScrollTrigger);

/* ── CTA Final ─────────────────────────────────────────────────────────────
   Fechamento da página — o momento mais quente (Figma 60:65 / 9:553).
   Âncora de motion: CTA da Zipline. UMA imagem full-bleed vive por baixo de
   toda a cena (hero + footer). Dois movimentos independentes sobre ela:
     · MÁSCARA — uma janela (clip-path) que abre quando a section entra: cantos
       arredondados no topo achatam e o recuo lateral fecha.
     · PARALLAX — a imagem é maior que o container e desliza mais devagar que o
       scroll (translateY em scrub) — o fundo "fica pra trás" como na Zipline.
   Por cima: wash de marca (lavanda→escuro) + scrim central (legibilidade AA) +
   scrim de base forte (o pé fica legível pro footer) + luz aurora fluindo.
   Hierarquia: eyebrow · headline grande em Sentient · sub · um único CTA com
   glow que respira (~3s) · microcopy. O Footer pousa DENTRO, sobre a imagem.
   Tudo respeita prefers-reduced-motion. */

// Imagem de fundo do CTA — soltar a imagem definitiva (Higgsfield) em /public
// e trocar aqui. (placeholder: retrato da Roberta, até a nova ficar pronta.)
const CTA_IMAGE = "/roberta.jpg";

/** Camadas por cima da imagem: wash de marca + scrims de legibilidade + aurora. */
function Wash() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {/* tint de marca (lavanda/roxo) — puxa a foto pro mundo da Gaia */}
      <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(36,26,56,0.52)_0%,rgba(58,72,94,0.28)_38%,rgba(14,16,22,0.70)_100%)]" />
      {/* scrim central — contraste AA da headline sobre qualquer foto */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,transparent_26%,rgba(14,16,22,0.5)_100%)]" />
      {/* scrim de base — escurece o pé só o suficiente; a imagem segue visível
          nas bordas ao redor do card de vidro flutuante do footer */}
      <div className="absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(to_top,rgba(14,16,22,0.80),rgba(14,16,22,0.38)_52%,transparent)]" />
      {/* luz aurora fluindo (o "momento mais quente") — bloom lavanda que respira */}
      <div className="gaia-aurora-flow absolute top-[8%] left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(163,133,192,0.42),rgba(122,144,174,0.15)_45%,transparent_70%)] blur-3xl" />
    </div>
  );
}

export default function CTAFinal() {
  const root = useRef<HTMLElement>(null);
  const clip = useRef<HTMLDivElement>(null); // janela do mask (clip-path abre aqui)
  const img = useRef<HTMLDivElement>(null); // camada da imagem (parallax translateY)
  const [motion, setMotion] = useState(false);

  // Decide uma vez se roda mask + parallax ou entrega estático (reduced-motion).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMotion(!reduce.matches);
    decide();
    reduce.addEventListener("change", decide);
    return () => reduce.removeEventListener("change", decide);
  }, []);

  useGSAP(
    () => {
      // reduced-motion: tudo estático e visível — imagem full-bleed (clip inset(0)),
      // sem entrada, sem mask, sem parallax. O Footer tem o próprio guard.
      if (!motion) return;

      // Entrada do conteúdo — headline em line-mask + resto fade-up (uma vez).
      gsap.from("[data-line-inner]", {
        yPercent: 118,
        autoAlpha: 0,
        duration: 1.1,
        ease: "power4.out",
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: "top 62%", once: true },
      });
      gsap.from("[data-cta-reveal]", {
        y: 26,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: root.current, start: "top 58%", once: true },
      });

      // MÁSCARA — a janela abre: p=0 imagem recuada com cantos arredondados no
      // topo → p=1 full-bleed. Roda só na entrada da section.
      const state = { p: 0 };
      const applyP = (p: number) => {
        const c = clip.current;
        if (!c) return;
        const top = (1 - p) * 15; // % — revela a partir de baixo
        const x = (1 - p) * 7; // % — recuo lateral
        const r = (1 - p) * 60; // px — cantos do topo achatam
        c.style.clipPath = `inset(${top}% ${x}% 0% ${x}% round ${r}px ${r}px 0px 0px)`;
      };
      applyP(0);
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "top 28%",
        scrub: 0.6,
        onUpdate: (self) => {
          state.p = self.progress;
          applyP(state.p);
        },
        onRefresh: () => applyP(state.p),
      });

      // PARALLAX — a imagem (114% de altura, folga de 14%) desliza de -7% a +7%
      // ao longo de toda a passagem da section: fica mais lenta que o scroll.
      gsap.fromTo(
        img.current,
        { yPercent: -7 },
        {
          yPercent: 7,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    },
    { scope: root, dependencies: [motion] },
  );

  return (
    <section
      ref={root}
      id="comecar"
      // base = mesmo creme da seção de cima (Pricing): aparece nos cantos do
      // mask ao abrir e no fio abaixo do footer, fundindo com a seção anterior.
      className="relative isolate overflow-hidden bg-neutro-50"
    >
      {/* imagem full-bleed — a JANELA (clip-path) abre por cima dela */}
      <div
        ref={clip}
        className="absolute inset-0 z-0 overflow-hidden will-change-[clip-path]"
        style={motion ? undefined : { clipPath: "inset(0)" }}
      >
        {/* camada maior que o container → espaço pro parallax não vazar borda */}
        <div
          ref={img}
          className="absolute inset-x-0 top-[-7%] h-[114%] will-change-transform"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CTA_IMAGE}
            alt=""
            className="h-full w-full object-cover object-[50%_28%]"
          />
        </div>
        <Wash />
      </div>

      {/* cena: hero + footer empilhados, ambos sobre a mesma imagem */}
      <div className="relative z-20 flex min-h-screen flex-col">
        {/* hero — clean (âncora Zipline): só a headline + um CTA, sem ruído */}
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center md:py-28">
          <h2 className="font-title text-[clamp(2rem,4.6vw,3.5rem)] font-medium leading-[1.06] tracking-[-0.015em] text-white">
            <span className="block overflow-hidden pb-[0.06em]">
              <span data-line-inner className="block">
                Sua próxima consulta
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <span data-line-inner className="block">
                pode começar{" "}
                <span className="italic text-roxo-300">diferente.</span>
              </span>
            </span>
          </h2>

          {/* CTA único — pill com glow que respira por trás */}
          <div data-cta-reveal className="relative mt-9">
            <span
              aria-hidden
              className="gaia-cta-breathe pointer-events-none absolute -inset-4 -z-10 rounded-full bg-[radial-gradient(circle,rgba(138,105,216,0.6),transparent_68%)] blur-xl"
            />
            <a
              href="#comecar"
              className="group inline-flex h-11 items-center gap-2 rounded-full bg-brand pl-5 pr-4 font-body text-[14px] font-medium tracking-[-0.01em] text-white shadow-[0_8px_28px_-8px_rgba(138,105,216,0.6)] outline-none transition-all duration-200 ease-gaia hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-[0_12px_36px_-8px_rgba(138,105,216,0.75)] focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1016] active:translate-y-0"
            >
              Começar grátis
              <IconArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-gaia group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>

        {/* Footer — pousa DENTRO do CTA, transparente, sobre o scrim de base */}
        <Footer embedded />
      </div>
    </section>
  );
}

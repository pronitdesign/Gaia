"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconCheck, IconArrowUpRight } from "@/components/ui/icons";

gsap.registerPlugin(ScrollTrigger);

/* iPhone 15 Pro Max 3D (R3F) — client-only: usa WebGL, nunca renderiza no server */
const IPhone3D = dynamic(() => import("@/components/iphone3d/IPhone3D"), {
  ssr: false,
});

/* ── Pricing ────────────────────────────────────────────────────────────────
   Card claro "Inclui" + card preto de preço com o phone CSS flutuando entre
   eles como coluna real do grid (não sobrepõe texto). Vibe: soft structuralism
   + editorial — cards com profundidade háptica (inset highlight, glow, hairline)
   sobre fundo com luz ambiente. Copy do briefing Figma (node 9:508).         */

/* pose fixa do iPhone 3D — [x, y, z] rad. tela de frente + leve giro 3/4 + lean editorial */
const PHONE_POSE: [number, number, number] = [0.08, Math.PI - 0.28, -0.1];

const INCLUDES = [
  "Anamnese ilimitada",
  "Pacientes ilimitados",
  "Celular e computador",
  "Suporte na migração",
] as const;

/* easing háptico (spring-like) para os hovers do CTA */
const HAPTIC = "ease-[cubic-bezier(0.32,0.72,0,1)]";

export default function Pricing() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gsap.set("[data-reveal]", { opacity: 1, y: 0, filter: "none" });
        return;
      }
      gsap.set("[data-reveal]", { opacity: 0, y: 44, filter: "blur(10px)" });
      gsap.to("[data-reveal]", {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.14,
        scrollTrigger: { trigger: root.current, start: "top 74%", once: true },
      });
    },
    { scope: root },
  );

  /* coluna esquerda — "Inclui" em barras soft */
  const ColInclui = (
    <div className="relative flex flex-col justify-center p-10 md:p-12 lg:min-h-[500px] lg:pr-24">
      <div className="relative lg:max-w-[20rem]">
        <h2 className="text-balance font-title text-h3 font-medium leading-[1.08] text-neutro-800 md:text-h2">
          Tudo incluído.
          <br />
          <span className="italic text-neutro-600">Sem add-on.</span>
        </h2>

        <ul className="mt-8 space-y-2.5">
          {INCLUDES.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3.5 rounded-2xl border border-white/50 bg-neutro-0/50 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-roxo-600 text-white shadow-[0_2px_8px_-2px_rgba(138,105,216,0.55)]">
                <IconCheck className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span className="font-body text-body font-medium text-neutro-700">
                {item}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-7 inline-flex w-fit items-center gap-2.5 rounded-full border border-white/60 bg-neutro-0/70 px-4 py-2 font-body text-small text-neutro-600 shadow-soft backdrop-blur">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          2 meses grátis na migração
        </div>
      </div>
    </div>
  );

  /* coluna direita — preço */
  const ColPreco = (
    <div className="relative flex flex-col justify-center p-10 md:p-12 lg:min-h-[500px] lg:pl-48">
      <div className="relative lg:ml-auto lg:max-w-[22rem]">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-neutro-0/70 px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-neutro-500 shadow-soft backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Plano único
        </span>

        <p className="mt-5 font-title text-h3 font-medium leading-[1.1] text-neutro-800">
          Um preço, sem letra miúda.
        </p>

        <div className="mt-7 flex items-start gap-1.5">
          <span className="mt-2.5 font-title text-h3 font-medium text-neutro-500">R$</span>
          <span className="font-title text-[4.75rem] font-semibold leading-[0.85] tracking-[-0.02em] text-neutro-800 tabular-nums">
            49,90
          </span>
          <span className="self-end pb-2.5 font-body text-body-l text-neutro-400">
            /mês
          </span>
        </div>

        <p className="mt-5 font-body text-body-l text-neutro-600">
          Comece com 2 meses grátis.
        </p>

        <div className="my-8 h-px w-full bg-neutro-200/70" />

        <a
          href="#"
          className={`group/cta flex w-full items-center justify-between gap-3 rounded-full bg-ink py-2 pl-6 pr-2 transition-all duration-500 ${HAPTIC} hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-afluente`}
        >
          <span className="font-body text-[15px] font-medium text-white">
            Migrar e ganhar 2 meses
          </span>
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-500 ${HAPTIC} group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5`}
          >
            <IconArrowUpRight className="h-4 w-4" />
          </span>
        </a>

        <p className="mt-4 text-center font-body text-small text-neutro-400">
          Sem fidelidade. Cancele quando quiser.
        </p>
      </div>
    </div>
  );

  return (
    <section
      ref={root}
      id="pricing"
      className="relative overflow-hidden bg-neutro-50 py-28 md:py-36"
    >
      <div className="relative mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        <div data-reveal className="relative">
          {/* CARD ÚNICO — o phone flutua no centro, atravessando o card */}
          <div className="relative">
            {/* bg do card: arredondado + clipado (glows contidos); fica atrás do
                phone pra que o aparelho possa ultrapassar as bordas sem cortar */}
            <div
              aria-hidden
              className="absolute inset-0 overflow-hidden rounded-card border border-hairline bg-afluente shadow-soft-lg"
            >
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
              <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-roxo-200/40 blur-3xl" />
              <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-roxo-200/40 blur-3xl" />
            </div>

            {/* conteúdo em duas colunas dentro do mesmo card */}
            <div className="relative grid grid-cols-1 lg:grid-cols-2 lg:items-center">
              {ColInclui}

              {/* iPhone 3D — mobile: em fluxo, entre as colunas */}
              <div className="lg:hidden">
                <div className="mx-auto h-[440px] w-[300px] motion-reduce:animate-none animate-[gaia-float_6s_ease-in-out_infinite]">
                  <IPhone3D
                    height="100%"
                    scale={16}
                    rotation={PHONE_POSE}
                    screenImg="/phone-screen.png"
                  />
                </div>
              </div>

              {ColPreco}
            </div>

            {/* iPhone 3D — desktop: flutua no centro do card, ultrapassando as bordas.
                sem data-reveal: o pai já revela tudo junto e o GSAP sobrescreveria
                o -translate que centraliza o phone. */}
            <div className="absolute left-1/2 top-1/2 z-20 hidden h-[640px] w-[360px] -translate-x-1/2 -translate-y-1/2 lg:block">
              <div className="h-full w-full motion-reduce:animate-none animate-[gaia-float_6s_ease-in-out_infinite]">
                <IPhone3D
                  height="100%"
                  scale={16.5}
                  rotation={PHONE_POSE}
                  screenImg="/phone-screen.png"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

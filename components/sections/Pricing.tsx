"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconCheck, IconArrowUpRight } from "@/components/ui/icons";
import PhoneScreen from "@/components/iphone3d/PhoneScreen";

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

/* grão fino (film grain) — textura física, aplicado como overlay estático */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

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
              className={`group/li flex items-center gap-3.5 rounded-2xl border border-white/50 bg-neutro-0/50 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm transition-all duration-500 ${HAPTIC} hover:-translate-y-0.5 hover:border-white/70 hover:bg-neutro-0/85 hover:shadow-soft`}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-roxo-600 text-white shadow-[0_2px_8px_-2px_rgba(138,105,216,0.55)] transition-transform duration-500 ${HAPTIC} group-hover/li:scale-110`}>
                <IconCheck className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span className="font-body text-body font-medium text-neutro-700 transition-colors duration-500 group-hover/li:text-neutro-800">
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

  /* coluna direita — preço.
     Card elevado que "flutua acima" do card principal: mais alto que ele
     (lg:min-h-[560px] vs 500 do container, items-center → ultrapassa topo e
     base ~30px), sombra maior e hairline claro. z-10: fica sobre o bg do card,
     abaixo do phone (z-20) que o atravessa como na referência. */
  const ColPreco = (
    <div className="relative flex flex-col justify-center p-6 md:p-8 lg:min-h-[500px] lg:items-end lg:justify-center lg:p-0 lg:pl-40">
      <div className="relative z-10 flex w-full flex-col justify-center overflow-hidden rounded-card border border-white/10 bg-ink p-10 shadow-[0_40px_90px_-30px_rgba(0,10,26,0.65)] md:p-12 lg:my-[-4rem] lg:min-h-[620px] lg:max-w-[24rem]">
        {/* glows internos + inset highlight pro card escuro respirar */}
        <div className="pointer-events-none absolute inset-0 rounded-card shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-roxo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-roxo-700/20 blur-3xl" />
        {/* sheen — luz diagonal varrendo o card escuro (premium glass) */}
        <span
          aria-hidden
          className="gaia-card-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 bg-gradient-to-r from-transparent via-white/12 to-transparent"
        />
        <div className="relative z-[1] lg:max-w-[22rem]">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Plano único
        </span>

        <p className="mt-5 font-title text-h3 font-medium leading-[1.1] text-white">
          Um preço, sem letra miúda.
        </p>

        <div className="mt-7 flex items-start gap-1.5">
          <span className="mt-2.5 font-title text-h3 font-medium text-white/50">R$</span>
          <span className="font-title text-[4.75rem] font-semibold leading-[0.85] tracking-[-0.02em] text-white tabular-nums">
            49,90
          </span>
          <span className="self-end pb-2.5 font-body text-body-l text-white/40">
            /mês
          </span>
        </div>

        <p className="mt-5 font-body text-body-l text-white/70">
          Comece com 2 meses grátis.
        </p>

        <div className="my-8 h-px w-full bg-white/10" />

        <a
          href="#"
          className={`group/cta flex w-full items-center justify-between gap-3 rounded-full bg-white py-2 pl-6 pr-2 transition-all duration-500 ${HAPTIC} hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink`}
        >
          <span className="font-body text-[15px] font-medium text-ink">
            Migrar e ganhar 2 meses
          </span>
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-500 ${HAPTIC} group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5`}
          >
            <IconArrowUpRight className="h-4 w-4" />
          </span>
        </a>

        <p className="mt-4 text-center font-body text-small text-white/40">
          Sem fidelidade. Cancele quando quiser.
        </p>
        </div>
      </div>
    </div>
  );

  return (
    <section
      ref={root}
      id="pricing"
      className="relative overflow-hidden bg-neutro-50 py-28 md:py-36"
    >
      {/* AMBIENTE — luz de aurora escorrendo atrás da seção (profundidade) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-6rem] h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-roxo-200/35 blur-[130px]" />
        <div className="absolute -left-40 bottom-[-4rem] h-[440px] w-[560px] rounded-full bg-[#DFE9F1]/60 blur-[120px]" />
        <div className="absolute -right-44 top-1/3 h-[440px] w-[560px] rounded-full bg-roxo-100/45 blur-[130px]" />
      </div>
      {/* film grain — overlay estático, mistura suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.045] mix-blend-soft-light"
        style={{ backgroundImage: NOISE, backgroundSize: "140px" }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        {/* framing editorial — eyebrow + linha de tensão */}
        <div
          data-reveal
          className="mb-14 flex flex-col items-center text-center md:mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-neutro-0/70 px-3.5 py-1.5 font-body text-[11px] font-semibold uppercase tracking-[0.22em] text-neutro-500 shadow-soft backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Preço
          </span>
          <h2 className="mt-6 max-w-[16ch] text-balance font-title text-h2 font-medium leading-[1.05] text-neutro-800 md:text-[3.25rem]">
            Sem surpresa no{" "}
            <span className="italic text-neutro-600">fim do mês.</span>
          </h2>
        </div>

        <div data-reveal className="relative">
          {/* DOUBLE-BEZEL — bandeja externa (hairline + folga) segurando o card
              como uma placa de vidro numa moldura usinada. curvas concêntricas. */}
          <div className="rounded-[3rem] border border-white/50 bg-white/40 p-2 shadow-soft-lg md:p-2.5">
            {/* CARD ÚNICO — o phone flutua no centro, atravessando o card */}
            <div className="relative">
              {/* bg do card: arredondado + clipado (glows contidos); fica atrás do
                  phone pra que o aparelho possa ultrapassar as bordas sem cortar */}
              <div
                aria-hidden
                className="absolute inset-0 overflow-hidden rounded-card border border-hairline bg-afluente shadow-soft"
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
                      screen={<PhoneScreen variant="inicio" />}
                    />
                  </div>
                </div>

                {ColPreco}
              </div>

              {/* iPhone 3D — desktop: SLOT/âncora de pouso. O aparelho em si é o
                  ScrollPhone persistente (overlay fixo em app/page.tsx) que viaja
                  desde o card de Prontuário e pousa exatamente aqui. Este div só
                  reserva a posição/tamanho (360×640) que o ScrollPhone lê vivo. */}
              <div
                data-phone-end
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden h-[640px] w-[360px] -translate-x-1/2 -translate-y-1/2 lg:block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

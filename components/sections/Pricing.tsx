"use client";

import { useRef, useState } from "react";
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
   Barra de VIDRO FUMÊ atravessando o palco: o phone sobe atrás dela e afunda
   a base no vidro (backdrop-blur pega o aparelho e o embaça por trás — é o
   momento premium). Três zonas dentro do vidro: painel frosted claro (migração
   + toggle), preço, checklist. Copy do briefing Figma (node 9:508).

   STACKING (crítico): o ScrollPhone é um overlay `fixed z-[60]` na raiz. Pra
   ficar NA FRENTE dele o vidro usa z-[70] — e nenhum ancestral pode criar
   stacking context (sem transform/filter/isolate no palco), senão o z-70 fica
   preso abaixo do phone. Por isso o reveal do vidro é só opacity+y, sem blur:
   `filter` — mesmo blur(0px) — criaria contexto e mataria o efeito.          */

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

/* vidro fumê: gradiente de opacidade (o que vende vidro é a variação, não o
   valor médio) + saturação no backdrop pra aurora de trás puxar cor.
   Denso à esquerda/centro (onde mora texto — garante contraste do branco) e
   abrindo numa JANELA translúcida à direita, onde o phone atravessa por trás. */
const GLASS =
  "bg-[linear-gradient(104deg,rgba(0,10,26,0.84)_0%,rgba(0,10,26,0.78)_56%,rgba(0,10,26,0.48)_74%,rgba(0,10,26,0.32)_100%)] backdrop-blur-[28px] backdrop-saturate-[1.6]";

export default function Pricing() {
  const root = useRef<HTMLElement>(null);
  /* toggle real: ligado = migrando de outro sistema → 2 meses por conta da casa */
  const [migrando, setMigrando] = useState(true);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gsap.set("[data-reveal], [data-glass]", { opacity: 1, y: 0, filter: "none" });
        return;
      }
      gsap.set("[data-reveal]", { opacity: 0, y: 44, filter: "blur(10px)" });
      gsap.set("[data-glass]", { opacity: 0, y: 44 });
      gsap.to("[data-reveal], [data-glass]", {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.14,
        scrollTrigger: { trigger: root.current, start: "top 74%", once: true },
        /* devolve filter:none nos reveals — blur(0px) ainda cria stacking context */
        onComplete: () => gsap.set("[data-reveal]", { filter: "none" }),
      });
    },
    { scope: root },
  );

  /* ZONA A — painel frosted claro dentro do vidro escuro (contraste de vidros) */
  const PainelMigracao = (
    <div className="relative flex flex-col justify-between gap-8 overflow-hidden rounded-[1.75rem] border border-white/[0.18] bg-white/[0.14] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-md">
      <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <p className="font-title text-body-l font-medium leading-[1.25] text-white">
          Vem de outro sistema?
        </p>
        <p className="mt-2.5 font-body text-small leading-[1.6] text-white/65">
          A gente migra seus pacientes e seu histórico. Você confere e segue
          atendendo.
        </p>
      </div>

      <div className="relative flex items-center justify-between gap-4">
        <span className="font-body text-body font-medium tabular-nums text-white">
          2 meses grátis
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={migrando}
          aria-label="Estou migrando de outro sistema"
          onClick={() => setMigrando((v) => !v)}
          className={`relative h-8 w-[3.75rem] shrink-0 rounded-full border transition-colors duration-500 ${HAPTIC} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
            migrando
              ? "border-white/20 bg-gradient-to-r from-brand to-roxo-500 shadow-[0_4px_16px_-4px_rgba(138,105,216,0.7)]"
              : "border-white/15 bg-white/10"
          }`}
        >
          <span
            className={`absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_6px_-1px_rgba(0,10,26,0.5)] transition-transform duration-500 ${HAPTIC} ${
              migrando ? "translate-x-7" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );

  /* ZONA B — preço. Troca conforme o toggle, sem letra miúda escondida. */
  const Preco = (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
        Plano único
      </span>

      <div className="mt-5 flex items-start gap-1.5">
        <span className="mt-2 font-title text-h3 font-medium text-white/45">R$</span>
        <span className="font-title text-[3.75rem] font-semibold leading-[0.85] tracking-[-0.02em] text-white tabular-nums">
          {migrando ? "0" : "49,90"}
        </span>
        <span className="self-end pb-2 font-body text-body-l text-white/40">/mês</span>
      </div>

      <p className="mt-4 max-w-[22ch] font-body text-small leading-[1.55] text-white/60">
        {migrando ? (
          <>
            Nos 2 primeiros meses.{" "}
            <span className="text-white/40">Depois R$ 49,90/mês.</span>
          </>
        ) : (
          <>
            Tudo incluído.{" "}
            <span className="text-white/40">Sem add-on, sem letra miúda.</span>
          </>
        )}
      </p>
    </div>
  );

  /* checklist — 2 colunas: cabe embaixo do preço sem quebrar linha */
  const Checklist = (
    <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {INCLUDES.map((item) => (
        <li key={item} className="flex items-center gap-3">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-white/80 ring-1 ring-inset ring-white/15">
            <IconCheck className="h-3 w-3" strokeWidth={2.25} />
          </span>
          <span className="font-body text-small text-white/70">{item}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      ref={root}
      id="pricing"
      /* overflow-x-clip (não -hidden): clipa as auroras laterais no eixo X — sem
         scroll horizontal — mas deixa o Y livre pra aurora do topo sangrar pra
         cima e fundir com o fim branco do Manifesto. -hidden cortava esse brilho
         numa linha reta na borda: era o "corte" visível entre as seções. */
      className="relative overflow-x-clip bg-neutro-50 py-28 md:py-36"
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
        {/* framing editorial — eyebrow + título grande à esquerda */}
        <div data-reveal className="max-w-[15ch]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-neutro-0/70 px-3.5 py-1.5 font-body text-[11px] font-semibold uppercase tracking-[0.22em] text-neutro-500 shadow-soft backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Preço
          </span>
          <h2 className="mt-6 text-balance font-title text-h2 font-medium leading-[1.02] text-neutro-800 md:text-[4rem]">
            Sem surpresa no{" "}
            <span className="italic text-neutro-600">fim do mês.</span>
          </h2>
        </div>

        {/* PALCO — sem transform/filter aqui: o vidro precisa do z-70 vivo na raiz.
            A folga pro phone é PADDING, não margin: o vidro é o primeiro filho em
            fluxo no desktop e um margin-top colapsaria pra fora do palco.
            Sangra pra direita (-5rem): alinhado à esquerda com o título e aberto
            pro lado oposto — a assimetria é o gesto editorial da referência.
            pt-27rem: calibrado na geometria REAL do aparelho (≈255×445, nasce a
            +80px do topo do slot), não na do slot — a base afunda ~90px no vidro. */}
        <div className="relative mt-12 lg:mr-[-5rem] lg:mt-[-6rem] lg:pt-[27rem]">
          {/* bloom saturado atrás do phone — é o que o vidro refrata */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[86%] top-16 hidden h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(163,133,192,0.5),rgba(194,210,228,0.28)_48%,transparent_72%)] blur-2xl lg:block"
          />

          {/* iPhone 3D — desktop: SLOT/âncora de pouso. O aparelho em si é o
              ScrollPhone persistente (overlay fixo em app/page.tsx) que viaja
              desde o card de Prontuário e pousa exatamente aqui. Este div só
              reserva a posição/tamanho (360×640) que o ScrollPhone lê vivo.
              Agora centrado na JANELA do vidro (86% do palco, mesma fração da
              terceira coluna) e no topo: a base afunda na barra. Em %, pra
              acompanhar a largura do palco em qualquer viewport. */}
          <div
            data-phone-end
            aria-hidden
            className="pointer-events-none absolute left-[88%] top-0 z-20 hidden h-[640px] w-[360px] -translate-x-1/2 lg:block"
          />

          {/* iPhone 3D — mobile: em fluxo, com a base entrando no vidro */}
          <div className="lg:hidden">
            <div className="mx-auto -mb-24 h-[440px] w-[300px] animate-[gaia-float_6s_ease-in-out_infinite] motion-reduce:animate-none">
              <IPhone3D
                height="100%"
                scale={16}
                rotation={PHONE_POSE}
                screen={<PhoneScreen variant="inicio" />}
              />
            </div>
          </div>

          {/* BARRA DE VIDRO — z-70 pra ficar na frente do ScrollPhone (z-60):
              o backdrop-blur pega o aparelho por trás e afunda a base dele. */}
          <div
            data-glass
            className={`relative z-[70] mt-8 overflow-hidden rounded-[2.25rem] border border-white/15 p-2.5 shadow-[0_40px_90px_-30px_rgba(0,10,26,0.55)] lg:mt-0 ${GLASS}`}
          >
            {/* inset highlight — a quina de cima do vidro pegando luz */}
            <div className="pointer-events-none absolute inset-0 rounded-[2.25rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(255,255,255,0.06)]" />
            {/* sheen — luz diagonal varrendo o vidro */}
            <span
              aria-hidden
              className="gaia-card-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 bg-gradient-to-r from-transparent via-white/12 to-transparent"
            />

            <div className="relative z-[1] grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.3fr)_minmax(0,0.9fr)]">
              {PainelMigracao}

              <div className="flex flex-col justify-between gap-7 p-7 lg:pl-10">
                <div className="flex flex-col gap-7">
                  {Preco}
                  {Checklist}
                </div>

                {/* rodapé do vidro — meta à esquerda, CTA à direita */}
                <div className="flex flex-col gap-5 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-body text-small text-white/60">
                    Sem fidelidade. Cancele quando quiser.
                  </p>
                  <a
                    href="#"
                    className={`group/cta inline-flex shrink-0 items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 transition-all duration-500 ${HAPTIC} hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`}
                  >
                    <span className="font-body text-[15px] font-medium text-ink">
                      {migrando ? "Migrar e ganhar 2 meses" : "Começar agora"}
                    </span>
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-500 ${HAPTIC} group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5`}
                    >
                      <IconArrowUpRight className="h-4 w-4" />
                    </span>
                  </a>
                </div>
              </div>

              {/* ZONA C — janela: coluna deliberadamente vazia. É onde o vidro
                  abre e o phone aparece congelado atrás, fosco. Sem texto aqui
                  de propósito: o aparelho é o conteúdo. */}
              <div aria-hidden className="hidden lg:block" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

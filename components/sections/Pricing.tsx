"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconCheck, IconArrowUpRight } from "@/components/ui/icons";

gsap.registerPlugin(ScrollTrigger);

/* ── Pricing ────────────────────────────────────────────────────────────────
   Card claro "Inclui" + card preto de preço com o phone CSS flutuando entre
   eles como coluna real do grid (não sobrepõe texto). Vibe: soft structuralism
   + editorial — cards com profundidade háptica (inset highlight, glow, hairline)
   sobre fundo com luz ambiente. Copy do briefing Figma (node 9:508).         */

const PHONE_SCREEN: "anamnese" | "home" = "home";

const INCLUDES = [
  "Anamnese ilimitada",
  "Pacientes ilimitados",
  "Celular e computador",
  "Suporte na migração",
] as const;

/* ── Phone · tela A · anamnese pronta ──────────────────────────────────── */
function PhoneAnamnese() {
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="font-body text-[12px] text-neutro-500">{label}</span>
      <span className="text-right font-body text-[12px] font-medium text-neutro-800">
        {value}
      </span>
    </div>
  );

  return (
    <div className="flex h-[460px] flex-col bg-neutro-50 px-4 pb-4 pt-9">
      <div className="flex items-center justify-between font-body text-[11px] font-semibold text-neutro-800">
        <span>9:41</span>
        <span className="flex items-center gap-1 text-neutro-500">
          <span className="h-2.5 w-3.5 rounded-[2px] border border-neutro-400" />
          5G
        </span>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-[16px] bg-neutro-0 p-3 shadow-soft">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand/15 font-title text-[14px] font-semibold text-brand">
          JS
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-title text-[14px] font-medium text-neutro-800">
            João Silva
          </p>
          <p className="font-body text-[11px] text-neutro-500">
            Anamnese concluída · hoje
          </p>
        </div>
        <span className="rounded-full bg-sage-100 px-2 py-0.5 font-body text-[10px] font-medium text-sage-700">
          Pronta
        </span>
      </div>

      <div className="mt-3 flex-1 rounded-[16px] bg-neutro-0 px-3.5 shadow-soft">
        <div className="divide-y divide-neutro-200/60">
          <Row label="Queixa principal" value="Cansaço" />
          <Row label="Restrições" value="Lactose" />
          <Row label="Rotina" value="Sono irregular" />
        </div>
        <div className="space-y-2 pb-4 pt-1">
          <div className="h-2 w-full rounded-full bg-neutro-200/70" />
          <div className="h-2 w-4/5 rounded-full bg-neutro-200/70" />
          <div className="h-2 w-11/12 rounded-full bg-neutro-200/50" />
        </div>
      </div>
    </div>
  );
}

/* ── Phone · tela B · home / pacientes ─────────────────────────────────── */
function PhoneHome() {
  const people = [
    { n: "Maria Alves", s: "Anamnese hoje" },
    { n: "João Silva", s: "Ontem" },
    { n: "Ana Costa", s: "3 dias atrás" },
  ];

  return (
    <div className="flex h-[460px] flex-col bg-neutro-50 px-4 pb-4 pt-9">
      <div className="flex items-center justify-between font-body text-[11px] font-semibold text-neutro-800">
        <span>9:41</span>
        <span className="flex items-center gap-1 text-neutro-500">
          <span className="h-2.5 w-3.5 rounded-[2px] border border-neutro-400" />
          5G
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="font-title text-[18px] font-semibold text-neutro-800">Início</p>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-[16px] leading-none text-white">
          +
        </span>
      </div>

      <div className="mt-3 rounded-[16px] bg-brand p-3.5 text-white shadow-soft">
        <p className="font-body text-[11px] text-white/70">Próxima consulta</p>
        <p className="mt-0.5 font-title text-[15px] font-medium">Maria Alves · 14h</p>
        <p className="mt-2 font-body text-[11px] text-white/80">Anamnese pronta ✓</p>
      </div>

      <div className="mt-4 space-y-2.5">
        {people.map((p) => (
          <div
            key={p.n}
            className="flex items-center gap-3 rounded-[14px] bg-neutro-0 p-2.5 shadow-soft"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-azul-100 font-title text-[12px] font-semibold text-azul-700">
              {p.n.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-[13px] font-medium text-neutro-800">
                {p.n}
              </p>
              <p className="font-body text-[11px] text-neutro-500">{p.s}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Phone · bezel CSS ─────────────────────────────────────────────────── */
function Phone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-[220px] rounded-[2.75rem] border-[7px] border-[#0e1116] bg-[#0e1116] shadow-[0_40px_80px_-24px_rgba(20,22,31,0.55)] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[2.25rem] bg-neutro-50">
        <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0e1116]" />
        {PHONE_SCREEN === "anamnese" ? <PhoneAnamnese /> : <PhoneHome />}
      </div>
    </div>
  );
}

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

  const CardInclui = (
    <div
      data-reveal
      className="group relative flex flex-col overflow-hidden rounded-card border border-hairline bg-afluente p-10 shadow-soft-lg transition-transform duration-500 ease-gaia hover:-translate-y-1 md:p-12 lg:min-h-[540px] lg:justify-center lg:pr-16"
    >
      {/* inset highlight — borda de luz no topo (vidro sobre bandeja) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-card shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
      />
      {/* orb ambiente */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-16 h-64 w-64 rounded-full bg-roxo-200/40 blur-3xl"
      />

      <div className="relative">
        <h2 className="text-balance font-title text-h3 font-medium leading-[1.08] text-neutro-800 md:text-h2">
          Tudo incluído.
          <br />
          <span className="italic text-neutro-600">Sem add-on.</span>
        </h2>

        <ul className="mt-9 space-y-4">
          {INCLUDES.map((item) => (
            <li key={item} className="flex items-center gap-3.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-roxo-600 text-white shadow-[0_2px_8px_-2px_rgba(138,105,216,0.55)]">
                <IconCheck className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span className="font-body text-body-l text-neutro-700">{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 inline-flex w-fit max-w-[19rem] items-start gap-2.5 rounded-[18px] border border-white/60 bg-neutro-0/70 px-4 py-2.5 font-body text-small leading-snug text-neutro-600 shadow-soft backdrop-blur">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          2 meses grátis migrando sua ferramenta atual
        </div>
      </div>
    </div>
  );

  const CardPreco = (
    <div
      data-reveal
      className="group relative flex flex-col justify-center overflow-hidden rounded-card bg-ink p-10 shadow-soft-lg ring-1 ring-white/10 transition-transform duration-500 ease-gaia hover:-translate-y-1 md:p-12 lg:min-h-[540px] lg:pl-16"
    >
      {/* glow de marca — profundidade no canto */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-brand/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-card shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      />

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Plano único
        </span>

        <p className="mt-5 font-title text-h3 font-medium leading-[1.1] text-white">
          Um preço, sem letra miúda.
        </p>

        <div className="mt-7 flex items-start gap-1.5">
          <span className="mt-2.5 font-title text-h3 font-medium text-white/75">
            R$
          </span>
          <span className="font-title text-[4.75rem] font-semibold leading-[0.85] tracking-[-0.02em] text-white tabular-nums">
            49,90
          </span>
          <span className="self-end pb-2.5 font-body text-body-l text-white/45">
            /mês
          </span>
        </div>

        <p className="mt-5 font-body text-body-l text-white/70">
          Comece com 2 meses grátis.
        </p>

        <div className="my-9 h-px w-full bg-white/10" />

        <a
          href="#"
          className={`group/cta flex w-full items-center justify-between gap-3 rounded-full bg-white py-2 pl-6 pr-2 transition-all duration-500 ${HAPTIC} hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink`}
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

        <p className="mt-4 text-center font-body text-small text-white/45">
          Sem fidelidade. Cancele quando quiser.
        </p>
      </div>
    </div>
  );

  const PhoneSlot = (
    <div
      data-reveal
      className="relative z-20 mx-auto lg:-mx-14 lg:self-center"
    >
      <div className="lg:rotate-[-5deg]">
        <Phone className="mx-auto motion-reduce:animate-none animate-[gaia-float_6s_ease-in-out_infinite]" />
      </div>
    </div>
  );

  return (
    <section
      ref={root}
      id="pricing"
      className="relative overflow-hidden bg-neutro-50 py-28 md:py-36"
    >
      {/* luz ambiente — os cards flutuam sobre textura, não sobre chapado */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[16%] h-[380px] w-[380px] rounded-full bg-azul-200/30 blur-3xl" />
        <div className="absolute bottom-[8%] right-[6%] h-[420px] w-[420px] rounded-full bg-roxo-200/25 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[0.92fr_auto_1.08fr] lg:gap-0">
          {CardInclui}
          {PhoneSlot}
          {CardPreco}
        </div>
      </div>
    </section>
  );
}

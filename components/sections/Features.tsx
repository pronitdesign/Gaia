"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconLink } from "@/components/ui/icons";

gsap.registerPlugin(ScrollTrigger);

/* ── Features / Workspace ─────────────────────────────────────────────────
   Bento assimétrico (ref. Paraform) sobre fundo neutro escuro — clean, sem
   brilhos roxos. Cada card: superfície escura sóbria com hairline fina.
   Os mocks são cards claros (bg-neutro-0) flutuando dentro do card escuro,
   com sombra suave e tipografia de UI real — nunca placeholders vazios.
   Copy-âncora: "Tudo que a consulta precisa, num lugar só."             */

// chrome comum dos cards — superfície navy levemente acima do fundo #13161F
const CARD =
  "group relative flex flex-col overflow-hidden rounded-[22px] border border-white/[0.07] " +
  "bg-[#1A1E29] transition-[border-color,transform] duration-500 ease-gaia " +
  "hover:-translate-y-0.5 hover:border-white/[0.16]";

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-title text-[1.5rem] font-medium leading-[1.15] text-neutro-0">
      {children}
    </h3>
  );
}

function CardBody({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 max-w-md font-body text-body text-white/45">{children}</p>
  );
}

/* Linha label/valor reutilizada dentro dos cards claros (prontuário etc). */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="font-body text-[13px] text-neutro-500">{label}</span>
      <span className="text-right font-body text-[13px] font-medium text-neutro-800">
        {value}
      </span>
    </div>
  );
}

/* Chip discreto "PDF → Gaia extrai" — usado em Plano, Antropometria e Exames. */
function PdfChip({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutro-200/70 bg-neutro-50 px-2.5 py-1 font-body text-[11px] font-medium text-neutro-500">
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3 text-neutro-400"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v4h4" />
      </svg>
      {label}
    </span>
  );
}

/* ── Mock 1 · Prontuário (hub — card âncora) ────────────────────────────── */
function MockProntuario() {
  const tabs = [
    "Anamnese",
    "Avaliação",
    "Plano",
    "Antropometria",
    "Exames",
    "Evolução",
    "Questionários",
    "Agenda",
  ];

  return (
    <div className="rounded-[20px] bg-neutro-0 p-4 shadow-[0_12px_40px_-16px_rgba(58,72,94,0.4)] md:p-5">
      <div className="flex items-center gap-3 border-b border-neutro-200/70 pb-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand/15 font-title text-[15px] font-semibold text-brand">
          MA
        </span>
        <div className="min-w-0">
          <p className="truncate font-title text-[15px] font-medium text-neutro-800">
            Marina Alves
          </p>
          <p className="font-body text-[12px] text-neutro-500">
            Prontuário · 8 abas
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab, i) => (
          <span
            key={tab}
            className={
              "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-body text-[12px] font-medium " +
              (i === 0
                ? "bg-brand text-white"
                : "bg-neutro-100 text-neutro-500")
            }
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="mt-3 divide-y divide-neutro-200/60 rounded-[14px] bg-neutro-50/70 px-3">
        <Row label="Queixa principal" value="Cansaço e ganho de peso" />
        <Row label="Restrições" value="Intolerância à lactose" />
        <Row label="Rotina" value="Sono irregular · sedentária" />
      </div>
    </div>
  );
}

/* ── Mock 2 · Plano alimentar ────────────────────────────────────────────── */
function MockPlano() {
  const foods = [
    { name: "Arroz integral", qtd: "100 g", kcal: "124" },
    { name: "Peito de frango", qtd: "150 g", kcal: "247" },
    { name: "Brócolis", qtd: "80 g", kcal: "27" },
  ];

  return (
    <div className="rounded-[18px] bg-neutro-0 p-4 shadow-[0_12px_40px_-16px_rgba(58,72,94,0.4)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-title text-[14px] font-medium text-neutro-800">Almoço</p>
        <PdfChip label="cardapio.pdf" />
      </div>

      <div className="mt-3 overflow-hidden rounded-[12px] border border-neutro-200/70">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 bg-neutro-50 px-3 py-1.5 font-body text-[11px] font-medium text-neutro-500">
          <span>Alimento</span>
          <span className="text-right">Qtd</span>
          <span className="text-right">kcal</span>
        </div>
        <div className="divide-y divide-neutro-200/60">
          {foods.map((f) => (
            <div
              key={f.name}
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 font-body text-[12px] text-neutro-700"
            >
              <span className="truncate">{f.name}</span>
              <span className="text-right text-neutro-500">{f.qtd}</span>
              <span className="text-right font-medium">{f.kcal}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-[12px] bg-brand/10 px-3 py-2.5">
        <span className="font-body text-[12px] font-medium text-brand">
          P 32g · C 58g · G 14g
        </span>
        <span className="font-body text-[12px] font-semibold text-brand">398 kcal</span>
      </div>
    </div>
  );
}

/* ── Mock 3 · Antropometria ──────────────────────────────────────────────── */
function MockAntropometria() {
  const points: Array<[number, number]> = [
    [0, 30],
    [20, 26],
    [40, 28],
    [60, 18],
    [80, 14],
    [100, 8],
  ];
  const path = points.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <div className="rounded-[18px] bg-neutro-0 p-4 shadow-[0_12px_40px_-16px_rgba(58,72,94,0.4)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-title text-[14px] font-medium text-neutro-800">Peso</p>
          <p className="font-body text-[11px] text-neutro-500">6 consultas</p>
        </div>
        <PdfChip label="laudo.pdf" />
      </div>

      <div className="mt-3 rounded-[12px] bg-neutro-50/70 p-3">
        <svg
          viewBox="0 0 100 36"
          className="h-16 w-full text-sage-600"
          preserveAspectRatio="none"
        >
          <polyline
            points={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r={1.8} fill="currentColor" />
          ))}
        </svg>
        <div className="mt-1 flex justify-between font-body text-[10px] text-neutro-400">
          <span>Jan</span>
          <span>Mar</span>
          <span>Mai</span>
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-2.5 py-1 font-body text-[12px] font-medium text-sage-700">
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        -4,2 kg desde o início
      </div>
    </div>
  );
}

/* ── Mock 4 · Exames de sangue ────────────────────────────────────────────── */
function MockExames() {
  const exams = [
    { name: "Hemoglobina", value: "13,8", unit: "g/dL", flag: false },
    { name: "Ferritina", value: "18", unit: "ng/mL", flag: true },
    { name: "TSH", value: "2,1", unit: "µUI/mL", flag: false },
    { name: "Vitamina D", value: "31", unit: "ng/mL", flag: false },
  ];

  return (
    <div className="rounded-[18px] bg-neutro-0 p-4 shadow-[0_12px_40px_-16px_rgba(58,72,94,0.4)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-title text-[14px] font-medium text-neutro-800">Hemograma</p>
        <PdfChip label="hemograma.pdf" />
      </div>

      <div className="mt-3 divide-y divide-neutro-200/60">
        {exams.map((e) => (
          <div key={e.name} className="flex items-center justify-between gap-3 py-2.5">
            <span className="font-body text-[13px] text-neutro-600">{e.name}</span>
            <span className="flex items-center gap-2">
              <span className="font-body text-[13px] font-medium text-neutro-800">
                {e.value} <span className="text-neutro-400">{e.unit}</span>
              </span>
              {e.flag && (
                <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-warning">
                  Fora da faixa
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mock 5 · Agenda ──────────────────────────────────────────────────────── */
function MockAgenda() {
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];

  return (
    <div className="rounded-[18px] bg-neutro-0 p-4 shadow-[0_12px_40px_-16px_rgba(58,72,94,0.4)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-title text-[14px] font-medium text-neutro-800">Terça, 14</p>
        <span className="font-body text-[11px] text-neutro-500">Julho</span>
      </div>

      <div className="mt-3 flex justify-between gap-1">
        {days.map((d, i) => (
          <span
            key={i}
            className={
              "grid h-8 w-8 place-items-center rounded-full font-body text-[12px] font-medium " +
              (i === 1 ? "bg-brand text-white" : "text-neutro-500")
            }
          >
            {d}
          </span>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-[12px] border border-neutro-200/70 px-3 py-2.5">
          <span className="font-body text-[12px] font-medium text-neutro-700">
            09:00 · Marina Alves
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-azul-100 px-2 py-1 font-body text-[11px] font-medium text-azul-700">
            <IconLink className="h-3 w-3" />
            Teleconsulta
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-[12px] border border-neutro-200/70 px-3 py-2.5">
          <span className="font-body text-[12px] font-medium text-neutro-700">
            10:30 · Rafael Nunes
          </span>
          <span className="shrink-0 font-body text-[11px] text-neutro-400">Consultório</span>
        </div>
      </div>
    </div>
  );
}

/* ── Mock 6 · Questionários ───────────────────────────────────────────────── */
function MockQuestionarios() {
  const items = [
    { name: "EAT-26", score: "24 / 78", note: "Sem risco" },
    { name: "PSQI", score: "9 / 21", note: "Qualidade ruim" },
    { name: "QFA", score: "Aplicado hoje", note: "Aguardando pontuação" },
  ];

  return (
    <div className="rounded-[18px] bg-neutro-0 p-4 shadow-[0_12px_40px_-16px_rgba(58,72,94,0.4)]">
      <p className="font-title text-[14px] font-medium text-neutro-800">Instrumentos</p>
      <div className="mt-3 divide-y divide-neutro-200/60">
        {items.map((it) => (
          <div key={it.name} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="font-body text-[13px] font-medium text-neutro-700">{it.name}</p>
              <p className="truncate font-body text-[11px] text-neutro-500">{it.note}</p>
            </div>
            <span className="shrink-0 rounded-full bg-neutro-100 px-2.5 py-1 font-body text-[12px] font-semibold text-neutro-700">
              {it.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Features() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-reveal]", {
        y: 22,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: "top 80%", once: true },
      });
      gsap.from("[data-card]", {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: "[data-grid]", start: "top 82%", once: true },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="features"
      className="relative bg-[#13161F] py-24 md:py-32"
    >
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        {/* header */}
        <header className="mb-14 max-w-2xl md:mb-16">
          <span
            data-reveal
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Workspace completo
          </span>
          <h2
            data-reveal
            className="text-balance font-title text-h2 font-medium text-neutro-0 md:text-h1"
          >
            Tudo que a consulta precisa,{" "}
            <span className="italic text-white/60">num lugar só.</span>
          </h2>
          <p
            data-reveal
            className="mt-5 max-w-xl font-body text-body text-white/45"
          >
            A Gaia não para na transcrição. É onde você atende, registra,
            avalia, prescreve e acompanha.
          </p>
        </header>

        {/* bento */}
        <div
          data-grid
          className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-6"
        >
          {/* 1 — Prontuário (hub, hero de largura total) */}
          <article data-card className={CARD + " lg:col-span-6"}>
            <div className="flex flex-col gap-8 p-7 md:flex-row md:items-center md:gap-12 md:p-10">
              <div className="md:w-[280px] md:shrink-0">
                <CardTitle>Prontuário</CardTitle>
                <CardBody>
                  Cada paciente em oito abas: anamnese, avaliação, plano,
                  exames e mais. Tudo numa tela.
                </CardBody>
              </div>
              <div className="min-w-0 flex-1">
                <MockProntuario />
              </div>
            </div>
          </article>

          {/* 2 — Plano alimentar */}
          <article data-card className={CARD + " lg:col-span-2"}>
            <div className="flex h-full flex-col p-7 md:p-8">
              <CardTitle>Plano alimentar</CardTitle>
              <CardBody>
                Monte sem sair do prontuário. Tabela TACO embutida, macros
                somados, importação por PDF.
              </CardBody>
              <div className="mt-6">
                <MockPlano />
              </div>
            </div>
          </article>

          {/* 3 — Antropometria */}
          <article data-card className={CARD + " lg:col-span-2"}>
            <div className="flex h-full flex-col p-7 md:p-8">
              <CardTitle>Antropometria</CardTitle>
              <CardBody>
                Cole o laudo em PDF. Pesos, dobras e composição entram no
                histórico, com evolução por consulta.
              </CardBody>
              <div className="mt-6">
                <MockAntropometria />
              </div>
            </div>
          </article>

          {/* 4 — Exames de sangue */}
          <article data-card className={CARD + " lg:col-span-2"}>
            <div className="flex h-full flex-col p-7 md:p-8">
              <CardTitle>Exames de sangue</CardTitle>
              <CardBody>
                Suba o PDF do laboratório. A Gaia extrai os valores e marca o
                que está fora da faixa.
              </CardBody>
              <div className="mt-6">
                <MockExames />
              </div>
            </div>
          </article>

          {/* 5 — Agenda */}
          <article data-card className={CARD + " lg:col-span-3"}>
            <div className="flex h-full flex-col p-7 md:p-8">
              <CardTitle>Agenda</CardTitle>
              <CardBody>
                Sua agenda do Google, com link de teleconsulta criado
                sozinho. Sem trocar de aba.
              </CardBody>
              <div className="mt-6">
                <MockAgenda />
              </div>
            </div>
          </article>

          {/* 6 — Questionários */}
          <article data-card className={CARD + " lg:col-span-3"}>
            <div className="flex h-full flex-col p-7 md:p-8">
              <CardTitle>Questionários</CardTitle>
              <CardBody>
                Sete instrumentos validados (EAT-26, QFA, PSQI e outros), com
                pontuação automática.
              </CardBody>
              <div className="mt-6">
                <MockQuestionarios />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

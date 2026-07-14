"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { useAutoCycle } from "@/lib/useAutoCycle";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  IconSparkles,
  IconCheck,
  IconArrowUpRight,
} from "@/components/ui/icons";

gsap.registerPlugin(ScrollTrigger);

/* ── Features ──────────────────────────────────────────────────────────────
   Bento em camadas. TODO painel é vidro escuro frostado (mesma receita do
   "Como Começa" / Footer): gradiente preto denso, refração de luz interna no
   topo, sombra funda, blur+saturate. Conteúdo em branco translúcido.
   Cada cena tem card-fantasma atrás (profundidade) + satélites girados
   sangrando pra fora. Textura full-bleed nos três heróis; glow de marca
   atrás dos escuros pra dar ao vidro o que refratar.                        */

// Cards ficam PARADOS — sem lift/parallax no hover. A vida vem de dentro,
// de micro-interações autônomas que rodam sozinhas (ver mocks abaixo).
const CARD =
  "group relative flex flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#101319]";

const CARD_HERO =
  "group relative flex flex-col overflow-hidden rounded-[22px] border border-white/[0.06]";

/* ── Vidro (receita do Como Começa) ─────────────────────────────────────── */
const GLASS_BLUR = "backdrop-blur-2xl backdrop-saturate-150 transform-gpu";
const GLASS_DARK =
  "bg-gradient-to-b from-black/80 to-black/[0.66] " +
  "shadow-[0_30px_80px_-28px_rgba(0,0,0,0.92),inset_0_1px_0_0_rgba(255,255,255,0.16),inset_0_0_0_1px_rgba(255,255,255,0.07)]";
const GLASS = `relative overflow-hidden ${GLASS_BLUR} ${GLASS_DARK}`;

// card-fantasma atrás — meia opacidade, offset, mesmo vidro (profundidade)
function Ghost({ radius = "rounded-[18px]" }: { radius?: string }) {
  return (
    <div
      aria-hidden
      className={`absolute -right-4 -top-5 h-full w-full opacity-40 ${radius} ${GLASS_BLUR} ${GLASS_DARK}`}
    />
  );
}

const FLOAT = "shadow-[0_34px_70px_-22px_rgba(0,0,0,0.7)]";

/* Camada com parallax por cursor (ver .gaia-parallax no globals).
   depth alto → reage mais ao cursor (satélites); rot mantém a inclinação
   de cada peça mesmo com o transform do parallax escrito inline.           */
const px = (depth: number, rot = 0) =>
  ({ ["--depth"]: depth, ["--rot"]: `${rot}deg` }) as CSSProperties;

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-title text-[1.5rem] font-medium leading-[1.15] text-neutro-0">{children}</h3>
  );
}

function CardBody({ tone = "dark", children }: { tone?: "dark" | "hero"; children: ReactNode }) {
  return (
    <p className={"mt-3 max-w-md font-body text-body " + (tone === "hero" ? "text-white/70" : "text-white/45")}>
      {children}
    </p>
  );
}

function GaiaTag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={"inline-flex items-center gap-1.5 font-body text-[11px] font-medium text-roxo-200 " + className}>
      <IconSparkles className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

// pill de vidro — bg translúcido com linha de luz interna
function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-body text-[11px] font-medium shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] " + className}>
      {children}
    </span>
  );
}

function TrendArrow({ dir, className = "" }: { dir: "up" | "down"; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={"h-3 w-3 " + className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {dir === "up" ? <path d="M6 9.5V2.5M3 5.5 6 2.5l3 3" /> : <path d="M6 2.5v7M3 6.5 6 9.5l3-3" />}
    </svg>
  );
}

function Avatar({ init, className = "" }: { init: string; className?: string }) {
  return (
    <span className={"grid shrink-0 place-items-center rounded-full bg-white/15 font-title font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] " + className}>
      {init}
    </span>
  );
}

// glow de marca atrás do vidro (cards sem textura)
function Glow({ className = "", color = "rgba(138,105,216,0.28)" }: { className?: string; color?: string }) {
  return <div aria-hidden className={"pointer-events-none absolute rounded-full blur-[70px] " + className} style={{ background: color }} />;
}

/* ═══════════════ PLANO ALIMENTAR ═══════════════ */
function MockPlano() {
  const meals = [
    { t: "07:30", n: "Café da manhã", food: "Ovos mexidos, aveia e mamão", kcal: 410, c: "#A385C0" },
    { t: "12:30", n: "Almoço", food: "Frango grelhado, arroz e salada", kcal: 620, c: "#95A9C4" },
    { t: "20:00", n: "Jantar", food: "Salmão assado e legumes", kcal: 480, c: "#8B9E6F" },
  ];
  const macros = [
    { k: "Prot", g: 112, pct: 30, c: "bg-brand" },
    { k: "Carbo", g: 168, pct: 48, c: "bg-azul-400" },
    { k: "Gord", g: 47, pct: 22, c: "bg-sage-400" },
  ];
  // Micro-interação: a sugestão da Gaia troca sozinha a cada ~3,6s (fade).
  const sugestoes = [
    { t: "Trocar arroz por batata-doce", d: "−80 kcal" },
    { t: "Incluir 20 g de whey no lanche", d: "+18 g prot" },
    { t: "Trocar refri por água com gás", d: "−140 kcal" },
  ];
  const [sug, ref] = useAutoCycle(sugestoes.length, 3600);
  const s = sugestoes[sug];
  return (
    <div ref={ref} className="relative mt-8 flex-1 px-7 md:px-9">
      {/* back card — adesão, peeking topo esquerdo */}
      <div style={px(1.35, -7)} className={"gaia-parallax absolute -left-2 -top-3 z-0 w-[142px] rounded-[13px] p-3 " + GLASS + " " + FLOAT}>
        <p className="font-body text-[10.5px] text-white/50">Adesão</p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-title text-[17px] font-medium tabular-nums text-white">92%</span>
          <span className="font-body text-[11px] font-medium text-sage-200">7 dias</span>
        </div>
      </div>

      {/* painel principal */}
      <div style={px(0.4, 1)} className="gaia-parallax relative">
        <Ghost />
        <div className={"relative z-10 rounded-[18px] p-4 " + GLASS}>
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <Avatar init="MA" className="h-9 w-9 text-[13px]" />
            <div className="min-w-0 flex-1">
              <p className="font-title text-[15px] font-medium text-white">Plano · Marina</p>
              <p className="font-body text-[11.5px] text-white/50">Seg a sex · 3 refeições</p>
            </div>
            <Pill className="tabular-nums text-sage-200">1.510 kcal</Pill>
          </div>
        <div className="divide-y divide-white/[0.08]">
          {meals.map((m) => (
            <div key={m.n} className="flex items-center gap-3 py-2.5">
              <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: m.c }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-body text-[11px] tabular-nums text-white/40">{m.t}</span>
                  <span className="font-body text-[12.5px] font-medium text-white/90">{m.n}</span>
                </div>
                <p className="truncate font-body text-[12px] text-white/50">{m.food}</p>
              </div>
              <span className="shrink-0 font-body text-[12px] tabular-nums text-white/70">{m.kcal}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-[12px] bg-white/[0.06] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-body text-[11px] font-medium text-white/70">Macros do dia</span>
              <span className="font-body text-[11px] tabular-nums text-white/40">327 g</span>
            </div>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-white/10">
              {macros.map((m) => (
                <span key={m.k} data-bar className={m.c} style={{ width: `${m.pct}%` }} />
              ))}
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              {macros.map((m) => (
                <span key={m.k} className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${m.c}`} />
                  <span className="font-body text-[11px] text-white/55">{m.k}</span>
                  <span className="font-body text-[11px] font-medium tabular-nums text-white/85">{m.g}g</span>
                </span>
              ))}
            </div>
          </div>
        </div>
          <div className="mt-3 flex items-center justify-between">
            <GaiaTag>somou pela TACO</GaiaTag>
            <Pill className="text-white/60">importado por PDF</Pill>
          </div>
        </div>
      </div>

      {/* satélite front — sugestão da Gaia (troca sozinha) */}
      <div style={px(1.65, 5)} className={"gaia-parallax absolute -bottom-3 -right-3 z-20 w-[186px] rounded-[14px] p-3 " + GLASS + " " + FLOAT}>
        <GaiaTag>sugestão</GaiaTag>
        <div key={sug} className="gaia-fade">
          <p className="mt-1.5 font-body text-[12.5px] font-medium text-white/90">{s.t}</p>
          <div className="mt-2 flex items-center justify-between">
            <Pill className="text-sage-200">{s.d}</Pill>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]">
              <IconCheck className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ QUESTIONÁRIOS (hero verde) ═══════════════ */
function MockQuestionarios() {
  // Micro-interação: a lista de instrumentos fica de fundo e um card de Insight
  // flutua por cima, trocando sozinho a cada ~3,4s (pop). A cada troca, o
  // instrumento correspondente acende na lista — a Gaia "lendo" as respostas.
  const instruments = [
    { k: "EAT-26", full: "Atitudes alimentares", s: "19 pts" },
    { k: "PSQI", full: "Qualidade do sono", s: "8 pts" },
    { k: "BSQ", full: "Imagem corporal", s: "82 pts" },
    { k: "TFEQ-21", full: "Comportamento alimentar", s: "ok" },
    { k: "QFA", full: "Frequência alimentar", s: "revisar" },
    { k: "IES-2", full: "Comer intuitivo", s: "3,8" },
  ];
  const insights = [
    { k: "EAT-26", n: "19", of: "/ 78 pts", msg: "Acima do limiar de risco (20). Vale investigar restrição.", warn: true },
    { k: "PSQI", n: "8", of: "/ 21 pts", msg: "Sono ruim há 3 semanas — pode estar puxando a fome.", warn: true },
    { k: "BSQ", n: "82", of: "/ 204 pts", msg: "Insatisfação corporal moderada. Acompanhar de perto.", warn: false },
  ];
  const [i, ref] = useAutoCycle(insights.length, 3400);
  const ins = insights[i];
  return (
    <div ref={ref} className="relative mt-8 flex-1 px-7 pb-7 md:px-8">
      {/* lista de instrumentos — de fundo */}
      <div className={"rounded-[18px] p-4 " + GLASS}>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-title text-[15px] font-medium text-white">7 instrumentos validados</span>
          <span className="font-body text-[11.5px] text-white/50">pontuação automática</span>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {instruments.map((it) => {
            const on = it.k === ins.k;
            return (
              <div key={it.k} className={"flex items-center gap-2.5 py-2 transition-opacity duration-500 " + (on ? "opacity-100" : "opacity-40")}>
                <span className={"grid h-5 w-5 place-items-center rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] transition-colors duration-500 " + (on ? "bg-brand" : "bg-white/12")}>
                  <IconCheck className="h-3 w-3 text-white" />
                </span>
                <span className="font-body text-[12.5px] font-medium text-white/90">{it.k}</span>
                <span className="hidden truncate font-body text-[11.5px] text-white/45 sm:block">{it.full}</span>
                <span className="ml-auto font-body text-[11px] tabular-nums text-white/55">{it.s}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* card de Insight — flutua por cima e troca sozinho */}
      <div key={i} className={"gaia-pop absolute bottom-5 left-5 z-20 w-[250px] rounded-[16px] p-4 md:left-8 " + GLASS + " " + FLOAT}>
        <div className="flex items-center justify-between">
          <GaiaTag>Insight · {ins.k}</GaiaTag>
          <span className={"grid h-6 w-6 place-items-center rounded-full " + (ins.warn ? "bg-warning/15 text-warning" : "bg-brand/20 text-roxo-200")}>
            <IconArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-end gap-1.5">
          <span className={"font-title text-[2.1rem] font-medium leading-none tabular-nums " + (ins.warn ? "text-warning" : "text-white")}>{ins.n}</span>
          <span className="mb-1 font-body text-[11px] text-white/45">{ins.of}</span>
        </div>
        <p className="mt-2 font-body text-[12px] leading-snug text-white/70">{ins.msg}</p>
      </div>
    </div>
  );
}

/* ═══════════════ ANTROPOMETRIA (hero óleo) ═══════════════ */
function MockAntropometria() {
  const pts = [78, 76.4, 75.1, 74.2, 73.5, 72.8];
  const labels = ["mar", "abr", "mai", "jun", "jul", "ago"];
  const min = Math.min(...pts) - 0.5;
  const max = Math.max(...pts) + 0.5;
  const coords = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * 100;
    const y = 5 + (1 - (p - min) / (max - min)) * 30;
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,40 ${line} 100,40`;
  const [lastX, lastY] = coords[coords.length - 1];
  const measures = [
    { k: "IMC", v: "24,1", d: "−1,7", up: false },
    { k: "Massa magra", v: "58,1 kg", d: "+1,4", up: true },
    { k: "% Gordura", v: "24,3 %", d: "−2,1", up: false },
  ];
  return (
    <div className="mt-8 flex-1 px-7 pb-7 md:px-8 md:pb-8">
      <div style={px(0.32)} className={"gaia-parallax rounded-[18px] p-4 " + GLASS}>
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <Avatar init="MA" className="h-9 w-9 text-[13px]" />
            <div className="min-w-0 flex-1">
              <p className="font-title text-[15px] font-medium text-white">Peso · Marina</p>
              <p className="font-body text-[11.5px] text-white/50">6 consultas · mar–ago</p>
            </div>
            <Pill className="tabular-nums text-sage-200">−5,2 kg</Pill>
          </div>
          <div className="mt-3 inline-flex gap-0.5 rounded-full bg-white/10 p-0.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
            {["Peso", "IMC", "% Gordura"].map((t, i) => (
              <span key={t} className={"rounded-full px-2.5 py-1 font-body text-[11px] font-medium " + (i === 0 ? "bg-white/20 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]" : "text-white/50")}>
                {t}
              </span>
            ))}
          </div>
          <div className="relative mt-3 h-28">
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="anthroFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C1A9D3" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#C1A9D3" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[10, 20, 30].map((y) => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
              ))}
              <polygon points={area} fill="url(#anthroFill)" />
              <polyline points={line} fill="none" stroke="#C1A9D3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {coords.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="1.5" fill="#0A0C11" stroke="#C1A9D3" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
            <span className="absolute -translate-x-full -translate-y-full whitespace-nowrap rounded-md bg-white/15 px-1.5 py-0.5 font-body text-[10px] font-medium tabular-nums text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]" style={{ left: `${lastX}%`, top: `${(lastY / 40) * 100}%` }}>
              72,8 kg
            </span>
            {/* ponto mais recente pulsando — a última medição fica "viva" */}
            <span aria-hidden className="pointer-events-none absolute" style={{ left: `${lastX}%`, top: `${(lastY / 40) * 100}%`, transform: "translate(-50%,-50%)" }}>
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute h-2.5 w-2.5 rounded-full bg-[#C1A9D3]/60 motion-safe:animate-ping" />
                <span className="h-2 w-2 rounded-full bg-[#C1A9D3] ring-2 ring-[#0A0C11]" />
              </span>
            </span>
          </div>
        <div className="mt-1.5 flex justify-between px-0.5">
          {labels.map((l) => (
            <span key={l} className="font-body text-[10px] uppercase tracking-wide text-white/40">{l}</span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {measures.map((m) => (
            <div key={m.k} className="rounded-[10px] bg-white/[0.06] p-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
              <p className="truncate font-body text-[10.5px] text-white/50">{m.k}</p>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-title text-[14px] font-medium tabular-nums text-white">{m.v}</span>
                <span className={"font-body text-[10.5px] font-medium " + (m.up ? "text-sage-200" : "text-info")}>{m.d}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ EXAMES DE SANGUE ═══════════════ */
type Flag = "up" | "down" | null;
type ExamRow = { k: string; v: string; u: string; ref: string; band: [number, number]; pos: number; flag: Flag };

function MockExames() {
  // Micro-interação: o laudo troca de paciente sozinho a cada ~3s. Os
  // marcadores DESLIZAM pra nova posição (transição de `left`), a faixa de
  // referência ajusta, o valor e o flag mudam — mostrando a variação de cada
  // pessoa. As 3 linhas são keyadas por índice pra o mesmo nó animar.
  const patients: { name: string; extr: number; rows: ExamRow[] }[] = [
    { name: "Marina Alves", extr: 14, rows: [
      { k: "Hemoglobina", v: "13,8", u: "g/dL", ref: "12–16", band: [28, 82], pos: 46, flag: null },
      { k: "Vitamina D", v: "18", u: "ng/mL", ref: "30–100", band: [44, 96], pos: 13, flag: "down" },
      { k: "TSH", v: "5,9", u: "µUI/mL", ref: "0,4–4,5", band: [14, 56], pos: 84, flag: "up" },
    ] },
    { name: "Rafael Nunes", extr: 11, rows: [
      { k: "Glicose", v: "104", u: "mg/dL", ref: "70–99", band: [22, 58], pos: 71, flag: "up" },
      { k: "Ferritina", v: "92", u: "ng/mL", ref: "30–400", band: [30, 94], pos: 41, flag: null },
      { k: "HDL", v: "37", u: "mg/dL", ref: "40–60", band: [40, 80], pos: 22, flag: "down" },
    ] },
    { name: "Bianca Souza", extr: 16, rows: [
      { k: "Colesterol", v: "182", u: "mg/dL", ref: "< 190", band: [18, 72], pos: 54, flag: null },
      { k: "Vit. B12", v: "205", u: "pg/mL", ref: "200–900", band: [42, 96], pos: 25, flag: "down" },
      { k: "TSH", v: "2,1", u: "µUI/mL", ref: "0,4–4,5", band: [14, 56], pos: 43, flag: null },
    ] },
  ];
  const [i, ref] = useAutoCycle(patients.length, 3200);
  const p = patients[i];
  return (
    <div ref={ref} className="mt-8 flex-1 px-7 pb-7 md:px-8 md:pb-8">
      <div style={px(0.32)} className={"gaia-parallax rounded-[16px] p-4 " + GLASS}>
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 font-body text-[12px] font-medium text-white/70">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-[10px] font-semibold text-white/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">PDF</span>
            <span>Laudo · <span key={p.name} className="gaia-fade tabular-nums text-white/85">{p.name}</span></span>
          </span>
          <GaiaTag>extraiu {p.extr} marcadores</GaiaTag>
        </div>
        <div className="space-y-3">
          {p.rows.map((r, idx) => (
            <div key={idx}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-body text-[13px] text-white/70">{r.k}</span>
                <span className="flex items-center gap-1.5">
                  <span className={"font-body text-[13px] font-medium tabular-nums " + (r.flag ? "text-warning" : "text-white/90")}>
                    {r.v} <span className="text-white/35">{r.u}</span>
                  </span>
                  {r.flag ? (
                    <Pill className="!bg-warning/15 !px-1.5 !py-0.5 text-[10px] !font-semibold text-warning">
                      <TrendArrow dir={r.flag} /> {r.flag === "down" ? "baixo" : "alto"}
                    </Pill>
                  ) : (
                    <Pill className="!bg-sage-400/15 !px-1.5 !py-0.5 text-[10px] !font-semibold text-sage-200">na faixa</Pill>
                  )}
                </span>
              </div>
              <div className="relative mt-2 h-1.5 rounded-full bg-white/[0.09]">
                <span data-bar className="absolute inset-y-0 rounded-full bg-sage-400/35 transition-[left,width] duration-[900ms] ease-gaia" style={{ left: `${r.band[0]}%`, width: `${r.band[1] - r.band[0]}%`, transformOrigin: "left center" }} />
                <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black/60 transition-[left,background-color] duration-[900ms] ease-gaia" style={{ left: `${r.pos}%`, background: r.flag ? "#D6A04E" : "#A6B58F" }} />
              </div>
              <div className="mt-1 text-right font-body text-[10px] tabular-nums text-white/30">ref. {r.ref}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ AGENDA ═══════════════ */
function MockAgenda() {
  // Agenda de verdade: grade de calendário (day view). Linhas de meia-hora
  // bem próximas (08–13), consultas posicionadas por horário e duração como
  // blocos. Micro-interação: a linha do "agora" desliza pelo dia a cada ~3s,
  // acendendo a consulta em curso — como um calendário vivo.
  const BASE = 8; // 08:00
  const HOUR = 34; // px por hora
  const HALF = HOUR / 2;
  const ROWS = 10; // 08:00 → 13:00 em passos de 30 min
  const H = ROWS * HALF;
  const events = [
    { s: 8.5, e: 9.33, n: "Marina Alves", c: "#A385C0", t: "08:30", tele: true },
    { s: 9.66, e: 10.5, n: "Rafael Nunes", c: "#95A9C4", t: "09:40", tele: false },
    { s: 11, e: 11.5, n: "Bianca Souza", c: "#8B9E6F", t: "11:00", tele: true },
    { s: 12, e: 12.75, n: "Diego Farias", c: "#C4A46A", t: "12:00", tele: false },
  ];
  const [active, ref] = useAutoCycle(events.length, 3000);
  const cur = events[active];
  return (
    <div ref={ref} className="mt-7 flex-1 px-7 pb-7 md:px-8 md:pb-8">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-body text-[12.5px] font-medium text-white/75">Hoje · seg, 14</span>
        <span className="inline-flex items-center gap-1.5 font-body text-[11px] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-sage-300" /> Google Calendar
        </span>
      </div>

      <div className="relative" style={{ height: H }}>
        {/* grade de horas — meia-hora, linhas próximas */}
        {Array.from({ length: ROWS + 1 }).map((_, k) => {
          const hour = k % 2 === 0;
          return (
            <div key={k} className="absolute inset-x-0 flex items-center" style={{ top: k * HALF }}>
              <span className="w-10 shrink-0 -translate-y-1/2 pr-2 text-right font-body text-[9.5px] tabular-nums text-white/30">
                {hour ? `${String(BASE + k / 2).padStart(2, "0")}:00` : ""}
              </span>
              <span className={"h-px flex-1 " + (hour ? "bg-white/[0.09]" : "bg-white/[0.045]")} />
            </div>
          );
        })}

        {/* consultas — blocos posicionados por horário/duração */}
        <div className="absolute inset-y-0 left-10 right-0">
          {events.map((ev, idx) => {
            const on = idx === active;
            return (
              <div
                key={idx}
                className={
                  "absolute left-0 right-1 flex items-center gap-1.5 overflow-hidden rounded-[7px] pl-2 pr-1.5 transition-all duration-500 ease-gaia " +
                  (on ? "z-10 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.75)] ring-1 ring-brand/40" : "opacity-80")
                }
                style={{
                  top: (ev.s - BASE) * HOUR,
                  height: (ev.e - ev.s) * HOUR,
                  borderLeft: `2px solid ${on ? "#8A69D8" : ev.c}`,
                  background: on ? "rgba(138,105,216,0.22)" : ev.c + "1f",
                }}
              >
                <span className="min-w-0 flex-1 truncate font-body text-[11.5px] font-medium text-white/90">{ev.n}</span>
                {on && ev.tele && <IconArrowUpRight className="h-3 w-3 shrink-0 text-roxo-200" />}
                <span className="shrink-0 font-body text-[9.5px] tabular-nums text-white/45">{ev.t}</span>
              </div>
            );
          })}

          {/* linha do "agora" — desliza até a consulta em curso */}
          <div className="pointer-events-none absolute inset-x-0 z-20 transition-all duration-700 ease-gaia" style={{ top: (cur.s - BASE) * HOUR }}>
            <div className="relative h-[1.5px] bg-brand/80">
              <span className="absolute -left-[3px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-brand" />
              <span aria-hidden className="absolute -left-[3px] top-1/2 h-2 w-2 -translate-y-1/2 animate-ping rounded-full bg-brand/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ PRONTUÁRIO (hero teal, largura total) ═══════════════ */
/* Peças de vidro individuais — reusadas nos clusters (lg) e no empilhado (mobile). */
function PlanoAtivoCard() {
  return (
    <>
      <p className="font-body text-[11px] font-medium uppercase tracking-wide text-white/45">Plano ativo</p>
      <p className="mt-1 font-title text-[16px] font-medium text-white">1.510 kcal/dia</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
        <span data-bar className="block h-full w-[68%] origin-left rounded-full bg-brand" />
      </div>
      <p className="mt-1.5 font-body text-[10.5px] text-white/50">adesão 68% nesta semana</p>
    </>
  );
}

function ExamesNovosCard() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-warning/15 text-warning"><TrendArrow dir="down" className="h-3.5 w-3.5" /></span>
      <div>
        <p className="font-body text-[12.5px] font-medium text-white">2 exames novos</p>
        <p className="font-body text-[10.5px] text-white/50">1 fora da faixa</p>
      </div>
    </div>
  );
}

const CALIBRAGEM = [
  "Trocar arroz por batata-doce",
  "2 exames fora da faixa",
  "Reforçar proteína no jantar",
];

function CalibragemCard() {
  return (
    <>
      <p className="flex items-center gap-1.5 font-body text-[11px] font-semibold uppercase tracking-wide text-white/55">
        <IconSparkles className="h-3.5 w-3.5 text-roxo-200" /> Calibrado pela Gaia
      </p>
      <div className="mt-2.5 flex flex-col">
        {CALIBRAGEM.map((t) => (
          <p key={t} className="border-t border-white/10 py-2 font-body text-[12px] leading-snug text-white/75 first:border-t-0 first:pt-0 last:pb-0">
            {t}
          </p>
        ))}
      </div>
    </>
  );
}

/* Cluster esquerdo — espia atrás da borda esquerda do phone (lg+). */
function ProntuarioLeft() {
  return (
    <div className="pointer-events-none absolute left-[3%] top-1/2 hidden w-[214px] -translate-y-1/2 flex-col gap-3.5 lg:flex xl:left-[6%]">
      <span style={px(1.2, -4)} className={"gaia-parallax inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 font-body text-[11.5px] font-medium text-white/75 " + GLASS + " " + FLOAT}>
        <IconSparkles className="h-3.5 w-3.5 text-roxo-200" /> 5 sugestões da Gaia
      </span>
      <div style={px(1.55, 5)} className={"gaia-parallax rounded-[15px] p-3.5 " + GLASS + " " + FLOAT}>
        <PlanoAtivoCard />
      </div>
      <span style={px(1.35, -6)} className={"gaia-parallax inline-flex items-center gap-1.5 self-start rounded-full px-3.5 py-1.5 font-title text-[12.5px] font-semibold text-white " + GLASS + " " + FLOAT}>
        <IconSparkles className="h-3.5 w-3.5 text-roxo-200" /> Gaia
      </span>
    </div>
  );
}

/* Cluster direito — espia atrás da borda direita do phone (lg+). */
function ProntuarioRight() {
  return (
    <div className="pointer-events-none absolute right-[3%] top-1/2 hidden w-[240px] -translate-y-1/2 flex-col gap-3.5 lg:flex xl:right-[6%]">
      <div style={px(1.5, 4)} className={"gaia-parallax rounded-[15px] p-3.5 " + GLASS + " " + FLOAT}>
        <CalibragemCard />
      </div>
      <div style={px(1.7, -5)} className={"gaia-parallax self-end rounded-[15px] p-3.5 " + GLASS + " " + FLOAT}>
        <ExamesNovosCard />
      </div>
    </div>
  );
}

/* Empilhado — mobile/tablet, onde não há phone 3D. */
function ProntuarioStacked() {
  return (
    <div className="mt-7 flex flex-col gap-3 lg:hidden">
      <div className={"w-[214px] rounded-[14px] p-3.5 " + GLASS + " " + FLOAT}>
        <PlanoAtivoCard />
      </div>
      <div className={"w-[240px] rounded-[14px] p-3.5 " + GLASS + " " + FLOAT}>
        <CalibragemCard />
      </div>
      <div className={"w-[200px] rounded-[14px] p-3.5 " + GLASS + " " + FLOAT}>
        <ExamesNovosCard />
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
        duration: 1,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: "[data-grid]", start: "top 82%", once: true },
      });
      // barras/medidores crescem da esquerda quando o bento entra
      gsap.from("[data-bar]", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.05,
        scrollTrigger: { trigger: "[data-grid]", start: "top 78%", once: true },
      });
    },
    { scope: root },
  );

  // Montagem escalonada das camadas quando o card entra (fade + assentar).
  // Sem cursor-follow: os cards não se mexem — só revelam uma vez.
  useEffect(() => {
    const cards = gsap.utils.toArray<HTMLElement>("[data-card]", root.current);
    const observers: IntersectionObserver[] = [];
    cards.forEach((card) => {
      const layers = gsap.utils.toArray<HTMLElement>(".gaia-parallax", card);
      if (!layers.length) return;
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            layers.forEach((el, i) => window.setTimeout(() => el.classList.add("is-in"), i * 90));
            obs.disconnect();
          });
        },
        { threshold: 0.2 },
      );
      io.observe(card);
      observers.push(io);
    });
    return () => observers.forEach((io) => io.disconnect());
  }, []);

  return (
    <section ref={root} id="features" className="relative overflow-hidden bg-[#0A0C11] py-24 md:py-32">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        <header className="mb-14 max-w-2xl md:mb-16">
          <span data-reveal className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Recursos
          </span>
          <h2 data-reveal className="text-balance font-title text-h2 font-medium text-neutro-0 md:text-h1">
            Tudo que a anamnese sempre <span className="italic text-white/60">precisou ser.</span>
          </h2>
        </header>

        <div data-grid className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
          {/* A — Antropometria (dark, vidro único) */}
          <article data-card className={CARD + " min-h-[440px] lg:col-start-1 lg:row-start-1"}>
            <Glow className="left-[-10%] top-[30%] h-64 w-64" color="rgba(122,144,174,0.22)" />
            <div className="relative flex h-full flex-col">
              <div className="px-7 pt-7 md:px-8 md:pt-8">
                <CardTitle>Antropometria</CardTitle>
                <CardBody>Cole o laudo em PDF. Pesos, dobras e composição entram no histórico, com evolução por consulta.</CardBody>
              </div>
              <MockAntropometria />
            </div>
          </article>

          {/* B — Questionários (hero verde) */}
          <article data-card className={CARD_HERO + " min-h-[440px] lg:col-start-2 lg:row-start-1"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/textures/verde.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,14,10,0.5)_0%,rgba(10,14,10,0.18)_42%,rgba(10,14,10,0.4)_100%)]" />
            <div className="relative flex h-full flex-col">
              <div className="px-7 pt-7 md:px-8 md:pt-8">
                <CardTitle>Questionários</CardTitle>
                <CardBody tone="hero">Sete instrumentos validados (EAT-26, QFA, PSQI e outros), com pontuação automática.</CardBody>
              </div>
              <MockQuestionarios />
            </div>
          </article>

          {/* C — Plano alimentar (hero óleo, card alto) */}
          <article data-card className={CARD_HERO + " lg:col-start-1 lg:row-start-2"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/textures/folha.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,12,12,0.6)_0%,rgba(6,12,12,0.3)_46%,rgba(6,12,12,0.42)_100%)]" />
            <div className="relative flex h-full flex-col">
              <div className="px-7 pt-7 md:px-9 md:pt-9">
                <CardTitle>Plano alimentar</CardTitle>
                <CardBody tone="hero">Monte sem sair do prontuário. Tabela TACO embutida, macros somados, importação por PDF.</CardBody>
              </div>
              <MockPlano />
            </div>
          </article>

          {/* coluna direita inferior — Exames + Agenda */}
          <div className="flex flex-col gap-4 md:gap-5 lg:col-start-2 lg:row-start-2">
            <article data-card className={CARD + " min-h-[360px] flex-1"}>
              <Glow className="right-[-8%] top-[20%] h-56 w-56" color="rgba(214,160,78,0.18)" />
              <div className="relative flex h-full flex-col">
                <div className="px-7 pt-7 md:px-8 md:pt-8">
                  <CardTitle>Exames de sangue</CardTitle>
                  <CardBody>Suba o PDF do laboratório. A Gaia extrai os valores e marca o que está fora da faixa.</CardBody>
                </div>
                <MockExames />
              </div>
            </article>

            <article data-card className={CARD + " min-h-[360px] flex-1"}>
              <Glow className="left-[-8%] bottom-[10%] h-56 w-56" color="rgba(122,144,174,0.22)" />
              <div className="relative flex h-full flex-col">
                <div className="px-7 pt-7 md:px-8 md:pt-8">
                  <CardTitle>Agenda</CardTitle>
                  <CardBody>Sua agenda do Google, com link de teleconsulta criado sozinho. Sem trocar de aba.</CardBody>
                </div>
                <MockAgenda />
              </div>
            </article>
          </div>
        </div>

        {/* Prontuário — hero teal, largura total, phone 3D centralizado */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:mt-5 md:gap-5 lg:grid-cols-6">
          <article data-card className={CARD_HERO + " lg:col-span-6"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/textures/petala.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            {/* escurecimento base — mantém o fundo escuro e coerente com o Features */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,12,0.62)_0%,rgba(6,10,12,0.34)_46%,rgba(6,10,12,0.5)_100%)]" />
            {/* assento radial atrás do phone — dá contraste ao aparelho centralizado */}
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[620px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(4,8,10,0.66)_0%,rgba(4,8,10,0.32)_52%,transparent_74%)] lg:block" />

            {/* min-h preserva a altura visual do palco agora que a Marina vive na
                tela do iPhone (ver PhoneScreen) que a ScrollPhone sobrepõe aqui. */}
            <div className="relative flex flex-col p-7 md:p-10 lg:min-h-[600px]">
              <div className="max-w-md">
                <CardTitle>Prontuário</CardTitle>
                <CardBody tone="hero">Cada paciente em oito abas: anamnese, avaliação, plano, exames e mais. Tudo numa tela.</CardBody>
              </div>

              {/* mobile/tablet — sem phone 3D: satélites empilhados */}
              <ProntuarioStacked />

              {/* palco lg+ — clusters flanqueiam e o phone overlay pousa no centro */}
              <div className="relative mt-8 hidden flex-1 lg:block">
                <ProntuarioLeft />
                <ProntuarioRight />
                {/* Âncora do ScrollPhone — o único iPhone 3D (overlay fixo em
                    app/page.tsx) nasce aqui reto de frente mostrando o prontuário e
                    viaja daqui até o Pricing, trocando de tela no giro. Só marca a
                    posição/centro; o aparelho vive no overlay. */}
                <div
                  data-phone-start
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[248px] -translate-x-1/2 -translate-y-1/2"
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

"use client";

import type { ReactNode } from "react";

/* ──────────────────────────────────────────────────────────────
   Painéis "Como Começar" — placeholders de produto (nível awwwards).
   Backgrounds em gradiente = área da foto/lifestyle real (a definir).
   Cards flutuantes = recorte de UI real do Gaia (a definir).

   Desktop (md+): texto ancorado à esquerda + cluster de UI absoluto
   à direita — posições calibradas, intocadas.
   Mobile (stacked): card e texto correm em FLUXO (card no topo via
   order-1, texto embaixo via order-2/mt-auto) — absoluto aqui já
   causou colisão card×título quando o conteúdo passava de 78vh.
   ────────────────────────────────────────────────────────────── */

type PanelProps = { active: boolean; reduced: boolean };

/**
 * Camadas separadas: A) posição estática (className, pode ter translate
 * de centragem) · B) parallax (mouse) · C) entrada em stagger · D) float idle.
 */
function Float({
  active,
  depth = 16,
  delay = 0,
  float = true,
  className = "",
  children,
}: {
  active: boolean;
  depth?: number;
  delay?: number;
  float?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <div
        style={{
          transform: `translate3d(calc(var(--px) * ${depth}px), calc(var(--py) * ${
            depth * 0.7
          }px), 0)`,
          transition: "transform 350ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Só translateY aqui — opacity NÃO pode viver acima do backdrop-filter
            (ancestral com opacity<1 desliga o blur → flash de card transparente).
            O fade fica no próprio GlassCard, no mesmo elemento do filtro. */}
        <div
          className="transition-transform duration-700 ease-gaia"
          style={{
            transitionDelay: `${delay}ms`,
            transform: active ? "translateY(0)" : "translateY(28px)",
          }}
        >
          <div className={float ? "gaia-float" : ""} style={{ animationDelay: `${delay}ms` }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Overlay({
  eyebrow,
  headline,
  sub,
  active,
}: {
  eyebrow: string;
  headline: string;
  sub: string;
  active: boolean;
}) {
  return (
    <div
      /* transition-[opacity,transform] (era -all): -all capturava qualquer
         prop que mudasse, inclusive layout responsivo. duration-700 (era 500):
         o Float dos cards entra em 700 — texto e card são o mesmo evento
         (o passo ativou) e terminavam 200ms defasados. */
      className="relative z-10 order-2 mt-auto flex w-full flex-col px-7 pb-10 pt-10 text-left transition-[opacity,transform] duration-700 ease-gaia md:absolute md:bottom-0 md:left-0 md:order-none md:mt-0 md:w-[58%] md:px-16 md:pb-36 md:pt-0 lg:px-20 lg:pb-40"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <p className="mb-4 font-body text-[13px] font-medium uppercase tracking-[0.14em] text-roxo-200 drop-shadow-[0_1px_12px_rgba(0,0,0,0.5)] md:text-[14px]">
        {eyebrow}
      </p>
      <h3 className="mb-4 text-balance font-title font-medium leading-[1.02] text-neutro-0 text-[2.4rem] md:text-[3.75rem] drop-shadow-[0_2px_20px_rgba(0,0,0,0.55)]">
        {headline}
      </h3>
      <p className="max-w-[42ch] font-body text-body-l text-neutro-0/90 drop-shadow-[0_1px_14px_rgba(0,0,0,0.5)]">
        {sub}
      </p>
    </div>
  );
}

/* Vidro — MESMA receita do Footer embutido: sem stroke, fill em degradê
   translúcido, refração de luz interna (linha branca no topo + base sutil),
   sombra funda, blur + saturate. Conteúdo em branco/translúcido por cima.

   `transform-gpu` + will-change pré-promovem a camada de composição no mount:
   assim o snapshot borrado do backdrop já existe ANTES da entrada (opacity/
   float), matando a "trava" de 1 frame que o backdrop-filter causa quando a
   camada é criada no meio da animação de ativação. */
const glassBase =
  "backdrop-blur-2xl backdrop-saturate-150 transform-gpu";

/* Escuro: fill preto denso o bastante pra NUNCA lavar sobre foto clara
   (bug do #18) — refração branca no topo, sombra funda. Texto branco por cima. */
const glassDark =
  "bg-gradient-to-b from-black/80 to-black/66 shadow-[0_30px_80px_-28px_rgba(0,0,0,0.95),inset_0_1px_0_0_rgba(255,255,255,0.16),inset_0_0_0_1px_rgba(255,255,255,0.07)]";

/* Claro: vidro branco frostado — pede texto escuro no conteúdo. */
const glassLight =
  "bg-gradient-to-b from-white/85 to-white/68 shadow-[0_30px_80px_-28px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.7),inset_0_0_0_1px_rgba(0,0,0,0.06)]";

const glassSurface = { dark: glassDark, light: glassLight } as const;

function GlassCard({
  className = "",
  aria = false,
  active = true,
  dim = false,
  delay = 0,
  tone = "dark",
  sheen = false,
  children,
}: {
  className?: string;
  aria?: boolean;
  active?: boolean;
  dim?: boolean;
  delay?: number;
  tone?: "dark" | "light";
  sheen?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      aria-hidden={aria || undefined}
      style={{
        // fade no MESMO elemento do backdrop-filter → o blur renderiza durante
        // o fade (nada de flash). dim = card-fantasma atrás (meia opacidade).
        opacity: active ? (dim ? 0.5 : 1) : 0,
        transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
      className={`relative overflow-hidden rounded-2xl ${glassBase} ${glassSurface[tone]} ${className}`}
    >
      {children}
      {/* brilho de luz cruzando o vidro de tempos em tempos */}
      {sheen && (
        <span
          aria-hidden
          className="gaia-card-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/12 to-transparent"
        />
      )}
    </div>
  );
}

/** posição do card principal: mobile topo-centro; desktop ancora na FAIXA
    INFERIOR-direita, na mesma linha de visão do título (cluster de HUD) —
    a foto respira na metade de cima, a informação se agrupa embaixo */
const mainPos =
  "relative order-1 mx-auto mt-7 md:absolute md:order-none md:mx-0 md:mt-0 md:right-[8%] md:bottom-[20%] lg:right-[9%] lg:bottom-[22%]";

/** Foto lifestyle de fundo — mantida viva; scrim escuro só na base/esquerda
    (onde pousa o texto) garante legibilidade sem apagar a imagem.

    Parallax de galeria (técnica Codrops horizontal-parallax-gallery): a imagem
    é mais larga que o frame (overflow hidden no banner) e contra-desliza no eixo
    X conforme o banner cruza o centro — o ComoComecar seta `--parallax` por frame
    no scroll. Sem var (mobile/reduced) fica centrada e só preenche. */
function PhotoBg({ src }: { src: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <img
        data-parallax
        src={src}
        alt=""
        className="absolute left-1/2 top-0 h-full w-[150%] max-w-none object-cover object-center"
        style={{
          transform: "translate3d(calc(-50% + var(--parallax, 0%)), 0, 0)",
          willChange: "transform",
        }}
      />
      {/* base escura pro texto (mobile + desktop) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      {/* reforço à esquerda, onde fica o título no desktop */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
    </div>
  );
}

function Glow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-[6%] top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-neutro-0/40 blur-3xl"
    />
  );
}

/* Waveform estática (determinística — sem Math.random no render) */
const WAVE = [
  7, 12, 20, 30, 22, 14, 26, 34, 24, 16, 10, 18, 28, 36, 26, 18, 12, 22, 32, 24,
  15, 9, 14, 24, 30, 20, 12,
];

/* ── Passo 01 · Grave ────────────────────────────────────────── */
export function Panel1({ active }: PanelProps) {
  return (
    <div className="relative flex h-full min-h-[78vh] w-full flex-col overflow-hidden bg-afluente">
      {/* foto lifestyle — nutricionista em consulta */}
      <PhotoBg src="/passo1-migracao.png" />
      <Glow />
      <Overlay
        active={active}
        eyebrow="Passo 01 · Grave"
        headline="Aperte para gravar."
        sub="A consulta é transcrita ao vivo, em português, com termos clínicos."
      />

      <Float
        active={active}
        depth={16}
        delay={120}
        className={`${mainPos} w-[270px] md:w-[340px]`}
      >
        <div className="relative">
          <GlassCard aria dim active={active} delay={120} className="absolute -right-5 -top-6 h-full w-full" />
          <GlassCard active={active} delay={120} sheen className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-body text-small font-semibold text-white">
                Gravando consulta
              </p>
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff7a7a]" />
                <span className="font-body text-[11px] font-medium tabular-nums text-white/80">
                  12:47
                </span>
              </span>
            </div>
            {/* waveform ao vivo — cada barra pulsa como áudio entrando */}
            <div className="mb-4 flex h-10 items-center gap-[3px]">
              {WAVE.map((h, i) => (
                <span
                  key={i}
                  style={{
                    height: h,
                    animationDelay: `${(i % 9) * 90}ms`,
                    animationDuration: `${1 + (i % 5) * 0.14}s`,
                  }}
                  className="gaia-eq-bar w-[3px] shrink-0 rounded-full bg-white/40"
                />
              ))}
            </div>
            {/* transcrição ao vivo */}
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-white/15" />
              <div className="h-2 w-4/5 rounded-full bg-white/15" />
              <p className="font-body text-[11px] leading-snug text-white/70">
                “…dorme mal desde que trocou o turno no trabalho.”
              </p>
            </div>
          </GlassCard>
        </div>
      </Float>
    </div>
  );
}

/* ── Passo 02 · Acompanhe ────────────────────────────────────── */
const TOPICS: Array<[string, boolean]> = [
  ["Queixa principal", true],
  ["História da queixa", true],
  ["Sono e rotina", true],
  ["Alimentação", false],
  ["Medicações em uso", false],
];

export function Panel2({ active }: PanelProps) {
  return (
    <div className="relative flex h-full min-h-[78vh] w-full flex-col overflow-hidden bg-lavanda">
      {/* foto lifestyle — nutricionista conduzindo a consulta */}
      <PhotoBg src="/passo2-envio.png" />
      <Glow />
      <Overlay
        active={active}
        eyebrow="Passo 02 · Acompanhe"
        headline="O que você cobriu, o que falta."
        sub="Um checklist clínico marca os 14 tópicos da anamnese ao vivo, enquanto você conversa."
      />

      <Float
        active={active}
        depth={16}
        delay={120}
        className={`${mainPos} w-[280px] md:w-[344px]`}
      >
        <div className="relative">
          <GlassCard aria dim active={active} delay={120} className="absolute -right-5 -top-6 h-full w-full" />
          <GlassCard active={active} delay={120} sheen className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 font-body text-small font-semibold text-white">
                {/* pulso "ao vivo" — anamnese em andamento */}
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-200 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sage-200" />
                </span>
                Anamnese ao vivo
              </p>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-body text-[11px] font-medium tabular-nums text-sage-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                8 / 14
              </span>
            </div>
            {/* barra de progresso — luz correndo dentro do preenchido */}
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="relative h-full w-[57%] overflow-hidden rounded-full bg-gradient-to-r from-sage-200 to-white/80">
                <span className="gaia-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </div>
            </div>
            <div className="relative space-y-3 overflow-hidden">
              {/* varredura de luz descendo — checklist sendo preenchido ao vivo */}
              <span
                aria-hidden
                className="gaia-scan pointer-events-none absolute inset-x-0 z-10 h-6 opacity-0 bg-gradient-to-b from-transparent via-white/12 to-transparent"
              />
              {TOPICS.map(([label, done]) => (
                <div key={label} className="flex items-center gap-3">
                  {done ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="#C4CFB4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border border-white/25" />
                  )}
                  <span
                    className={`font-body text-[13px] ${
                      done ? "text-white/85" : "text-white/45"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </Float>
    </div>
  );
}

/* ── Passo 03 · Revise ───────────────────────────────────────── */
export function Panel3({ active }: PanelProps) {
  const soap: Array<[string, string, string]> = [
    ["S", "Subjetivo", "Insônia há 3 meses, piora no turno noite."],
    ["O", "Objetivo", "PA 120/80 · IMC 24,1 · sem alterações."],
    ["A", "Avaliação", "Insônia associada a estresse ocupacional."],
    ["P", "Plano", "Higiene do sono + retorno em 30 dias."],
  ];
  return (
    <div className="relative flex h-full min-h-[78vh] w-full flex-col overflow-hidden bg-bruma">
      {/* foto lifestyle — nutricionista revisando o resumo pronto */}
      <PhotoBg src="/passo3-pronto.png" />
      <Glow />
      <Overlay
        active={active}
        eyebrow="Passo 03 · Revise"
        headline="A Gaia sugere, você decide."
        sub="No final, um resumo SOAP editável, pronto pra salvar no prontuário."
      />

      <Float
        active={active}
        depth={16}
        delay={120}
        className="relative order-1 mx-auto mt-7 w-[300px] md:absolute md:order-none md:mx-0 md:mt-0 md:right-[8%] md:bottom-[20%] md:w-[360px] lg:right-[9%] lg:bottom-[22%]"
      >
        <div className="relative">
          <GlassCard aria dim active={active} delay={120} className="absolute -right-5 -top-6 h-full w-full" />
          <GlassCard active={active} delay={120} sheen className="p-6">
            <div className="mb-3.5 flex items-center gap-3">
              {/* avatar da Gaia com anel girando — "gerando o resumo" */}
              <div className="relative h-9 w-9 shrink-0">
                <span
                  aria-hidden
                  className="absolute -inset-[2px] animate-spin rounded-full [animation-duration:2.6s] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(167,139,224,0.9)_70deg,transparent_150deg)]"
                />
                <span className="absolute inset-0 grid place-items-center rounded-full bg-[#141018] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-roxo-200" />
                </span>
              </div>
              <div>
                <p className="font-body text-small font-semibold text-white">
                  Resumo SOAP · Maria Silva
                </p>
                <p className="font-body text-[11px] text-white/50">Gerado pela Gaia</p>
              </div>
              <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 font-body text-[11px] font-medium text-roxo-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                Editável
              </span>
            </div>
            <div className="space-y-2.5">
              {soap.map(([letter, label, value]) => (
                <div
                  key={letter}
                  className="flex gap-3 border-t border-white/10 pt-2.5 first:border-t-0 first:pt-0"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 font-body text-[12px] font-semibold text-white/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                    {letter}
                  </span>
                  <div className="min-w-0">
                    <p className="mb-0.5 font-body text-[11px] uppercase tracking-[0.08em] text-white/45">
                      {label}
                    </p>
                    <p className="font-body text-[12px] leading-snug text-white/90">
                      {value}
                      {letter === "P" && (
                        <span className="gaia-caret ml-0.5 inline-block h-[11px] w-[1.5px] translate-y-[1px] rounded-full bg-roxo-200 align-middle" />
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </Float>
    </div>
  );
}

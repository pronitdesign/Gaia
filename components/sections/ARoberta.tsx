"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Badge } from "@/components/ui/Badge";
import {
  IconShield,
  IconUserPlus,
  IconArrowUpRight,
  IconCheck,
} from "@/components/ui/icons";

gsap.registerPlugin(ScrollTrigger);

// Fundo da section — orquídea vinho cinematográfica sobre selva escura (foto completa,
// não mais a chapa gradiente+multiply). Por ser foto escura, a camada de flor multiply
// saiu: ela só fazia sentido com orquídea-sobre-branco sobre o gradiente claro.
const BACKDROP = "/quem-construiu-bg-3.webp";

// Véu de neutro-50 sobre o fundo — SÓ no modo stacked, onde o editorial pousa direto
// no gradiente. O pixel mais escuro do gradiente é rgb(181,131,169): sobre ele, texto
// neutro-700 só bate 4.5:1 com α ≥ 0.45. Como o object-cover reposiciona o gradiente a
// cada viewport, o véu segura esse pior caso em toda a faixa do editorial — não dá pra
// contar com sorte de crop. No modo pinned o editorial sobe sobre o retrato full-bleed
// (que tem scrim próprio), então lá o véu não entra e o fundo do Figma aparece cheio.
const LEGIBILITY_VEIL =
  "linear-gradient(to bottom, rgba(250,249,245,0.04) 0%, rgba(250,249,245,0.08) 30%, rgba(250,249,245,0.18) 38%, rgba(250,249,245,0.58) 46%, rgba(250,249,245,0.62) 100%)";

// A orquídea é foto sobre branco puro (255,255,255) — é assim que ela vem do Figma, e
// lá o layer está em multiply. `mix-blend-mode: multiply` reproduz isso exato: branco
// × gradiente = gradiente, então o fundo da foto some sem precisar de canal alpha.

// Força/cor da orquídea = FIEL ao Figma (node 152-474): lá o layer da flor é multiply
// a 100%, sem ajuste de cor. A orquídea (node 152-472) é a MESMA chapa; multiply cheio
// sobre o gradiente (node 152-475) reproduz a composição exata — vinho borgonha, não o
// magenta que a saturação puxava, nem o fantasma pálido de opacidade baixa.
const FLOWER_STRENGTH = 1;
// Sem filtro: qualquer saturate/contrast desvia do vinho do Figma (e brightness escuro
// vira neon no multiply). Cor crua = cor do Figma.
const FLOWER_FILTER = "none";

// Foto da Roberta — soltar o arquivo em /public e trocar aqui.
// Se falhar, o placeholder (gradiente Bruma + monograma) aparece por baixo.
const PORTRAIT = "/roberta.webp";

// A foto é landscape (2560×1429) e a Roberta está no meio-esquerda; o card do p=0 é
// retrato (260×320), então o object-cover corta ~55% da largura fora. Sem reposicionar,
// o card pega ombro e abajur em vez do rosto. 55% centra a cabeça dela no recorte alto
// e continua bem enquadrada quando o box abre pro full-bleed.
const PORTRAIT_POS = "55% 45%";

// Orquídea cymbidium vinho, exportada do Figma (node 152-472) na mesma moldura do
// gradiente. Fica no centro da section, atrás do card e das palavras; some quando o
// retrato cresce pro full-bleed.
const FLOWER = "/orquidea-roberta.webp";

// ── Camadas NOVAS (sobre tudo o que já existia) ──────────────────────────────
// Recorte da Roberta (RGBA transparente) — vai NA FRENTE do ticker, então o nome
// gigante passa por trás da cabeça dela. Layering puro: o alpha faz a oclusão.
const CUTOUT = "/roberta-recorte.webp";
// Ticker: o nome repetido numa faixa. A trilha tem duas faixas idênticas → xPercent
// -50 desloca exatamente uma faixa e o loop é sem emenda.
const TICKER_NAME = "Roberta Carbonari";
const TICKER_REPEAT = 4;

// Lírio vinho (cutout transparente, node 195-531 do Figma) — cluster floral no canto
// inferior-esquerdo, sob os cards de prova. Fiel ao Figma: a massa da flor mora no
// baixo-esquerda do PNG, então ancorar bottom-left põe o corpo no canto e as pétalas
// abrindo pro centro, exatamente como na composição.
const LIRIO = "/lirio-roberta.png";

// Cards de prova em vidro fosco que flutuam sobre a foto full-bleed. Vidro claro
// translúcido (mesma família do GLASS_FROST do Features) — legível sobre a pétala
// escura: tinta branca a 8%, aro de luz interno no topo e sombra funda.
const PROOF_CARD =
  "rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl backdrop-saturate-150 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.78),inset_0_1px_0_0_rgba(255,255,255,0.28),inset_0_0_0_1px_rgba(255,255,255,0.07)]";

// Números da prova — ledger. `to` numérico dispara count-up; `static` fica fixo.
const STATS = [
  { prefix: "", to: 3, suffix: "", label: "clínicas" },
  { prefix: "+", to: 20, suffix: "", label: "profissionais" },
  { prefix: "+", to: 1, suffix: "M", label: "de seguidores" },
  { static: "Mestre", label: "em Nutrição" },
] as const;

// Bio condensada — tem que caber com o banner de 40vh na mesma section.
const BIO =
  "Roberta Carbonari é Mestre em Nutrição e especialista em Comportamento Alimentar. Gere três clínicas, forma nutricionistas Brasil afora e tem agenda com lista de espera. A anamnese sempre foi o ponto mais travado da rotina dela — Gaia é a ferramenta que ela queria ter tido, construída de dentro do consultório.";

// Retrato ocupa a section inteira (full-bleed) no fim do scrub. Um scrim na base
// segura a legibilidade do editorial sobre a foto. Ele acompanha o `p` do retrato
// (ver applyP): em p=0 o retrato ainda é um card e o scrim só lavaria o fundo do
// Figma à toa, então ele entra junto com a foto crescendo.
// Pinned: escuro (ink) — a foto dissolve num fundo cinematográfico, texto claro por cima.
const PORTRAIT_SCRIM_DARK =
  "linear-gradient(to top, #05080F 0%, rgba(5,8,15,0.94) 24%, rgba(7,11,22,0.55) 52%, transparent 100%)";
// Stacked (mobile): claro — a foto emenda no off-white do editorial embaixo.
const PORTRAIT_SCRIM_LIGHT =
  "linear-gradient(to top, #FAF9F5 0%, rgba(250,249,245,0.94) 26%, rgba(250,249,245,0.58) 54%, transparent 100%)";

// ── Double-bezel (Doppelrand) ────────────────────────────────────────────────
// Casca externa (bandeja) + núcleo interno (placa) com raios concêntricos: p-1.5
// (0.375rem) → raio interno = 2rem − 0.375rem = 1.625rem. Dá o ar de hardware usinado
// em vez de retângulo chapado. Dois tons: escuro (pinned) e claro (stacked/mobile).
const SHELL_DARK =
  "rounded-[2rem] p-1.5 bg-white/[0.045] ring-1 ring-white/10 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_44px_120px_-34px_rgba(0,0,0,0.82)]";
const CORE_DARK =
  "rounded-[1.625rem] bg-gradient-to-b from-white/[0.09] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_0_1px_rgba(255,255,255,0.05)]";
const SHELL_LIGHT =
  "rounded-[2rem] p-1.5 bg-white/55 ring-1 ring-black/[0.05] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_44px_110px_-34px_rgba(58,72,94,0.42)]";
const CORE_LIGHT =
  "rounded-[1.625rem] bg-gradient-to-b from-white/92 to-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]";

// Curva de mola padrão (Linear/Vercel) — toda transição usa esta, nunca ease padrão.
const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

// Grão de filme — feTurbulence inline, tile de 180px. Overlay fixo/pointer-events-none.
const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Retrato: placeholder (gradiente Bruma + monograma) com a foto real por cima quando existir. */
function Portrait() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bruma">
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-title text-[clamp(2.5rem,7vw,5rem)] font-medium text-azul-800/60">
          RC
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PORTRAIT}
        alt="Roberta Carbonari"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: PORTRAIT_POS }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      {/* leve wash frio/lavanda por cima — tratamento de marca */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-roxo-900/20 via-transparent to-transparent" />
    </div>
  );
}

/**
 * Fundo — a composição do Figma (node 152-474) full-bleed: gradiente malva por baixo,
 * orquídea multiplicada em cima, véu de legibilidade fechando. O `z-0` aqui não é
 * decorativo: position+z-index cria stacking context, e é ele que confina o multiply
 * da flor a este bloco — sem isso o blend vazaria pro resto da página.
 */
function Afluente({
  flowerRef,
  veil = true,
}: {
  flowerRef?: RefObject<HTMLDivElement>;
  veil?: boolean;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-neutro-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BACKDROP}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Full-bleed com o mesmo object-cover do gradiente: no Figma a orquídea é uma
          chapa do tamanho do frame e as pétalas das pontas saem cortadas na borda. Se
          a flor for mais estreita que a viewport esses cortes viram duas linhas retas
          no meio da tela — em full-bleed eles caem fora da vista, como no Figma. */}
      {flowerRef && (
        // SEM will-change aqui de propósito: promover a div a uma camada de
        // composição própria isola o elemento e quebra o mix-blend-multiply
        // (o blend passa a acontecer contra o vazio, não contra o gradiente
        // atrás) — a orquídea some. GSAP anima opacity/scale sem isso.
        <div
          ref={flowerRef}
          className="absolute inset-0 mix-blend-multiply"
        >
          {/* A opacidade mora no <img>, não no wrapper: o GSAP anima autoAlpha do
              wrapper (entra em 0→1, sai em →0) e sobrescreveria qualquer valor posto
              lá. Aqui ela fica constante e o multiply entra mais fraco — a orquídea
              vira chapa de fundo em vez de brigar com o display type por cima. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={FLOWER}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-cover"
            style={{ opacity: FLOWER_STRENGTH, filter: FLOWER_FILTER }}
          />
        </div>
      )}

      {veil && <div className="absolute inset-0" style={{ background: LEGIBILITY_VEIL }} />}
    </div>
  );
}

/** Uma faixa do ticker: o nome repetido com um losango entre cada ocorrência. */
function TickerGroup() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden>
      {Array.from({ length: TICKER_REPEAT }).map((_, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-[0.12em] font-title text-[clamp(3.5rem,11vw,10rem)] font-medium italic leading-none text-white/[0.22]">
            {TICKER_NAME}
          </span>
          <span className="px-[0.18em] text-[clamp(2rem,5vw,5rem)] leading-none text-roxo-300/40">
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}

/** Ledger de números — card double-bezel, número à esquerda, label micro-caps à direita.
 *  Dividers em gradiente (desmaiam nas pontas) e hover sutil por linha. */
function Stats({ onDark = false }: { onDark?: boolean }) {
  const shell = onDark ? SHELL_DARK : SHELL_LIGHT;
  const core = onDark ? CORE_DARK : CORE_LIGHT;
  const value = onDark ? "text-neutro-0" : "text-neutro-800";
  const label = onDark ? "text-neutro-100/55" : "text-neutro-500";
  const rule = onDark
    ? "from-transparent via-white/12 to-transparent"
    : "from-transparent via-neutro-800/12 to-transparent";
  const hover = onDark ? "hover:bg-white/[0.045]" : "hover:bg-neutro-800/[0.035]";
  return (
    <div className={shell}>
      <div className={core}>
        <div className="px-4 py-3 md:px-5 md:py-4">
          {STATS.map((s, i) => (
            <div key={i}>
              {i > 0 && <div className={`mx-3 h-px bg-gradient-to-r ${rule}`} />}
              <div
                data-reveal
                className={`group/row flex items-baseline justify-between gap-6 rounded-2xl px-3 py-3.5 transition-colors duration-500 ${EASE} ${hover}`}
              >
                <span
                  className={`font-title text-[clamp(2.4rem,3.6vw,3.25rem)] font-medium leading-none tracking-[-0.02em] tabular-nums ${value}`}
                >
                  {"static" in s ? (
                    s.static
                  ) : (
                    <span data-count data-to={s.to} data-prefix={s.prefix} data-suffix={s.suffix}>
                      {s.prefix}
                      {s.to}
                      {s.suffix}
                    </span>
                  )}
                </span>
                <span
                  className={`font-body text-[11px] font-medium uppercase tracking-[0.16em] ${label}`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Card de prova em vidro fosco — uma credencial ou número curto flutuando sobre a
 *  foto. Marca ✦ roxa opcional, título/número grande, legenda micro embaixo. */
function ProofCard({
  mark,
  big,
  sub,
  size = "sm",
  className = "",
}: {
  mark?: boolean;
  big: string;
  sub: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <div
      data-proof
      className={`${PROOF_CARD} ${lg ? "relative flex flex-col justify-end px-7 py-6 md:px-8 md:py-7" : "px-5 py-4"} ${className}`}
    >
      {mark && (
        <span
          className={`block font-title leading-none text-roxo-300 ${lg ? "absolute left-7 top-6 text-[1.4rem] md:left-8 md:top-7" : "mb-2 text-[1.05rem]"}`}
        >
          ✦
        </span>
      )}
      <div>
        <div
          className={`font-title font-medium leading-none tracking-[-0.02em] text-neutro-0 ${lg ? "text-[clamp(2.6rem,3.6vw,3.6rem)]" : "text-[1.9rem]"}`}
        >
          {big}
        </div>
        <div
          className={`font-body leading-snug text-white/60 ${lg ? "mt-3 text-[15px]" : "mt-2 text-[12.5px]"}`}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

/** Chip de vidro fosco — pílula pequena pra especialidades/tags dentro dos cards. */
function GlassChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 font-body text-[11.5px] font-medium text-white/75">
      {children}
    </span>
  );
}

/** Ícone circular em vidro — casca comum do header dos dois cards (como o círculo do
 *  ref "Heart rate"). A cor do ícone vem do text-color passado. */
function IconOrb({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] ${tint}`}
    >
      {children}
    </span>
  );
}

/** CARD 1 — Credencial. Identidade: autoridade acadêmica. Header com selo, título
 *  serifado grande, chips de especialidade. Glow roxo no canto pra assinatura de cor. */
function CredentialCard({ className = "" }: { className?: string }) {
  return (
    <div
      data-proof
      className={`${PROOF_CARD} relative flex flex-col justify-between overflow-hidden px-7 py-6 md:px-8 md:py-7 ${className}`}
    >
      {/* assinatura de cor — luz roxa difusa no canto superior-direito */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-roxo-400/25 blur-3xl"
      />
      {/* header */}
      <div className="flex items-center gap-3">
        <IconOrb tint="text-roxo-200">
          <IconShield className="h-5 w-5" />
        </IconOrb>
        <div className="leading-tight">
          <div className="font-body text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
            Formação
          </div>
          <div className="font-body text-[13px] text-roxo-200">titulação acadêmica</div>
        </div>
      </div>
      {/* título */}
      <div>
        <div className="font-title text-[clamp(2.3rem,3vw,3.1rem)] font-medium leading-none tracking-[-0.02em] text-neutro-0">
          Mestre
        </div>
        <div className="mt-1.5 font-body text-[15px] text-white/65">em Nutrição</div>
      </div>
      {/* chips de especialidade */}
      <div className="flex flex-wrap gap-2">
        <GlassChip>Comportamento Alimentar</GlassChip>
        <GlassChip>
          <IconCheck className="h-3 w-3 text-roxo-300" />
          Especialista
        </GlassChip>
      </div>
    </div>
  );
}

// Barras do mini-gráfico de crescimento (card 2) — trajetória ascendente = "cada turma
// forma mais gente". Alguns índices ganham cor de marca pros picos, resto em branco fosco.
const IMPACT_BARS = [22, 30, 26, 38, 34, 46, 42, 56, 50, 64, 58, 72, 68, 84, 78, 94];
const IMPACT_ACCENTS: Record<number, string> = {
  1: "rgba(166,186,213,0.9)", // azul-300
  4: "rgba(193,169,211,0.9)", // roxo-300
  7: "rgba(138,105,216,0.95)", // brand
  10: "rgba(166,186,213,0.9)",
  12: "rgba(193,169,211,0.9)",
  15: "rgba(138,105,216,0.95)",
};

/** CARD 2 — Alcance. Identidade: métrica viva. Header com selo "crescendo", número
 *  grande, mini bar-chart de crescimento e rodapé com métricas de apoio. Glow azul. */
function ImpactCard({ className = "" }: { className?: string }) {
  return (
    <div
      data-proof
      className={`${PROOF_CARD} relative flex flex-col justify-between overflow-hidden px-7 py-6 md:px-8 md:py-7 ${className}`}
    >
      {/* assinatura de cor — luz azul difusa no canto superior-esquerdo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-azul-400/20 blur-3xl"
      />
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconOrb tint="text-azul-200">
            <IconUserPlus className="h-5 w-5" />
          </IconOrb>
          <div className="leading-tight">
            <div className="font-body text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
              Alcance
            </div>
            <div className="font-body text-[13px] text-azul-200">formação contínua</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-sage-400/20 px-2.5 py-1 font-body text-[10.5px] font-medium text-sage-300">
          <IconArrowUpRight className="h-3 w-3" />
          crescendo
        </span>
      </div>
      {/* número + label */}
      <div className="flex items-end gap-2.5">
        <span className="font-title text-[clamp(2.6rem,3.5vw,3.5rem)] font-medium leading-none tracking-[-0.02em] text-neutro-0">
          +20
        </span>
        <span className="pb-1 font-body text-[13px] leading-tight text-white/60">
          profissionais
          <br />
          formados
        </span>
      </div>
      {/* mini bar-chart de crescimento */}
      <div className="flex h-11 items-end gap-[3px]">
        {IMPACT_BARS.map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{ height: `${h}%`, background: IMPACT_ACCENTS[i] ?? "rgba(255,255,255,0.26)" }}
          />
        ))}
      </div>
      {/* rodapé — métricas de apoio */}
      <div className="flex items-center gap-5 border-t border-white/10 pt-3 font-body text-[12px] text-white/55">
        <span>
          <b className="font-semibold text-white/85">3</b> clínicas
        </span>
        <span>
          <b className="font-semibold text-white/85">+1M</b> seguidores
        </span>
      </div>
    </div>
  );
}

/** Bloco editorial: eyebrow + headline + bio, empurrado pra metade direita da section.
 *  `onDark` inverte as cores do texto pro scrim escuro do modo pinned. */
function Editorial({ onDark = false }: { onDark?: boolean }) {
  const head = onDark ? "text-neutro-0" : "text-neutro-800";
  const accent = onDark ? "text-roxo-300" : "text-roxo-600";
  const body = onDark ? "text-neutro-100/85" : "text-neutro-700";
  return (
    <div className="grid w-full grid-cols-1 px-6 md:grid-cols-2 md:px-12 lg:px-20">
      <div className="max-w-2xl md:col-start-2 md:justify-self-end">
        <div data-reveal className="mb-6">
          <Badge tone={onDark ? "dark" : "light"}>Quem construiu</Badge>
        </div>
        <h2
          data-reveal
          className={`text-balance font-title text-[2.5rem] font-medium leading-[1.02] tracking-[-0.02em] md:text-h1 lg:text-[4rem] ${head}`}
        >
          Feita por quem atende{" "}
          <span className={`italic ${accent}`}>de verdade.</span>
        </h2>
        <p data-reveal className={`mt-6 max-w-xl font-body text-body-l leading-relaxed ${body}`}>
          {BIO}
        </p>
      </div>
    </div>
  );
}

/** Anima os números 0→alvo. useST=true agenda por scroll (fallback); false roda na hora (pinned). */
function animateCounts(useST: boolean) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
    const to = Number(el.dataset.to);
    const pre = el.dataset.prefix ?? "";
    const suf = el.dataset.suffix ?? "";
    if (reduce) {
      el.textContent = pre + to + suf;
      return;
    }
    const run = () => {
      const obj = { v: 0 };
      el.textContent = pre + "0" + suf;
      gsap.to(obj, {
        v: to,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = pre + Math.round(obj.v) + suf;
        },
      });
    };
    if (useST) {
      ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: run });
    } else {
      run();
    }
  });
}

export default function ARoberta() {
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const portrait = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const topMask = useRef<HTMLDivElement>(null);
  const wordL = useRef<HTMLSpanElement>(null);
  const wordR = useRef<HTMLSpanElement>(null);
  const editorial = useRef<HTMLDivElement>(null);
  // Camadas novas
  const tickerWrap = useRef<HTMLDivElement>(null);
  const ticker = useRef<HTMLDivElement>(null);
  const cutout = useRef<HTMLDivElement>(null);
  const proof = useRef<HTMLDivElement>(null);
  const flora = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"pinned" | "stacked">("stacked");

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMode(wide.matches && !reduce.matches ? "pinned" : "stacked");
    decide();
    wide.addEventListener("change", decide);
    reduce.addEventListener("change", decide);
    return () => {
      wide.removeEventListener("change", decide);
      reduce.removeEventListener("change", decide);
    };
  }, []);

  useGSAP(
    () => {
      if (mode !== "pinned") {
        // Fallback: reveals + count-up por scroll normal.
        gsap.from("[data-reveal]", {
          y: 28,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: editorial.current, start: "top 80%", once: true },
        });
        animateCounts(true);
        return;
      }

      // O box do retrato cresce de um card-retrato (260x320, foto inteira) até
      // ocupar a section INTEIRA (full-bleed, 100vw × 100vh). A imagem é
      // object-cover DENTRO do box, então em p=0 vê-se a Roberta enquadrada
      // (não um zoom), e em p=1 ela vira o fundo da section.
      // p: 0 = card pequeno · 1 = full-bleed.
      const WC0 = 260; // largura do card inicial
      const HC0 = 320; // altura do card inicial
      const state = { p: 0 };

      const applyP = (p: number) => {
        const el = portrait.current;
        if (!el) return;
        // O scrim serve à foto, não ao fundo: só existe na medida em que ela cresce.
        // Sobe rápido (p*1.6) pra já estar firme quando o editorial começa a subir.
        if (scrim.current) scrim.current.style.opacity = String(Math.min(1, p * 1.6));
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = WC0 + p * (vw - WC0);
        const h = HC0 + p * (vh - HC0);
        // Ancorado em 38% da largura (não no centro): a headline gigante flanqueia
        // esse ponto, e a 50% o "CONSTRUIU?" cortava na direita. Em p=1 vira 0 (full-bleed).
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        el.style.left = `${(vw - w) * 0.38}px`;
        el.style.top = `${(1 - p) * (vh - h) / 2}px`;
        el.style.borderRadius = `${(1 - p) * 26}px`;
        el.style.filter =
          p < 1 ? `drop-shadow(0 22px 45px rgba(58,72,94,${0.18 * (1 - p)}))` : "none";
        // Máscara clara do topo: costura com o creme de Como Começar só no início
        // (p=0, onde o corte aparece). Conforme o retrato cresce pro full-bleed ela
        // apaga (1→0), pra não deixar faixa clara sobre a foto cinematográfica.
        if (topMask.current) topMask.current.style.opacity = String(1 - p);
      };

      gsap.set(editorial.current, { autoAlpha: 0, y: 44 });
      gsap.set([wordL.current, wordR.current], { autoAlpha: 1, x: 0, yPercent: -50 });
      gsap.set("[data-word-inner]", { filter: "blur(0px)" });
      applyP(0);

      // ── Camadas novas: ticker + recorte ────────────────────────────────────
      // Marquee contínuo: a trilha tem duas faixas idênticas, então -50% = uma faixa
      // e o loop é sem emenda. Independente do scroll — corre sempre.
      const marquee = gsap.to(ticker.current, {
        xPercent: -50,
        duration: 34,
        ease: "none",
        repeat: -1,
      });
      // Ticker + recorte SÓ aparecem DEPOIS que a máscara abriu por completo (retrato
      // vira full-bleed, p=1) — não durante a entrada com as flores. Nascem invisíveis;
      // o reveal mora no scrub, na posição 1.0 (ver timeline abaixo).
      gsap.set([tickerWrap.current, cutout.current], { autoAlpha: 0 });

      // Cluster floral + cards de prova: mesmo tempo do ticker/recorte — só fazem
      // sentido sobre a foto cheia. Wrapper apaga tudo; lírio entra com scale-in
      // ancorado no canto (0% 100%), cards sobem com stagger.
      gsap.set(proof.current, { autoAlpha: 0 });
      gsap.set(flora.current, { autoAlpha: 0 });
      gsap.set("[data-proof]", { autoAlpha: 0, y: 28 });

      // Entrada — cada palavra sobe com blur-to-sharp (stagger); o card surge junto.
      gsap.from("[data-word-inner]", {
        yPercent: 120,
        filter: "blur(14px)",
        autoAlpha: 0,
        duration: 1.1,
        ease: "power4.out",
        stagger: 0.14,
        scrollTrigger: { trigger: pin.current, start: "top 62%", once: true },
      });
      gsap.from(portrait.current, {
        autoAlpha: 0,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: { trigger: pin.current, start: "top 62%", once: true },
      });
      // A entrada da flor NÃO é um tween separado de propósito: dois tweens
      // disputando o autoAlpha dela (entrada 0→1 + scrub →0) era a corrida que a
      // fazia sumir. Agora ela já entra visível pelo gsap.set acima e o único
      // controle é o scrub (fromTo abaixo, com from explícito).

      let counted = false;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=140%",
          pin: pin.current,
          pinSpacing: true,
          scrub: 0.5,
          // Este pin nasce tarde (mode: stacked → pinned num segundo render), então
          // os triggers do Manifesto já existem quando ele injeta o pinSpacing.
          // refreshPriority reordena o refresh pela ordem do documento — ver a nota
          // em ComoComecar (2). Sem isso o Manifesto mede-se 3960px acima do real.
          refreshPriority: 1,
          onRefresh: () => applyP(state.p),
        },
      });

      // Beat 1 — a janela abre até o banner de 40vh e sobe pro topo; palavras somem.
      tl.to(
        state,
        { p: 1, ease: "power2.inOut", duration: 1, onUpdate: () => applyP(state.p) },
        0,
      )
        .to(wordL.current, { xPercent: -45, autoAlpha: 0, ease: "none", duration: 0.4 }, 0)
        .to(wordR.current, { xPercent: 45, autoAlpha: 0, ease: "none", duration: 0.4 }, 0)
        // Beat 2 — editorial sobe nos 60vh de baixo; números contam.
        .to(editorial.current, { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.5 }, 0.62)
        // Beat 3 — a máscara terminou de abrir (p=1 em t=1.0): AGORA o ticker e o
        // recorte da Roberta materializam sobre a foto full-bleed. Não antes.
        .to(
          [tickerWrap.current, cutout.current],
          { autoAlpha: 1, ease: "power2.out", duration: 0.22 },
          1.0,
        )
        // Beat 3 (cont.) — lírio e cards de prova materializam no canto inferior-esquerdo.
        .to(proof.current, { autoAlpha: 1, ease: "none", duration: 0.15 }, 0.98)
        .to(flora.current, { autoAlpha: 1, ease: "power2.out", duration: 0.5 }, 0.98)
        .to(
          "[data-proof]",
          { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.55, stagger: 0.12 },
          1.04,
        )
        .call(
          () => {
            if (!counted) {
              counted = true;
              animateCounts(false);
            }
          },
          [],
          0.85,
        );

      return () => {
        marquee.kill();
      };
    },
    { scope: root, dependencies: [mode] },
  );

  return (
    <section
      ref={root}
      id="a-roberta"
      className="relative z-10 bg-neutro-50"
      // overflow-x: clip corta o sangramento lateral dos lírios (sem scroll horizontal,
      // já que não há overflow-x global no body); overflow-y: visible libera o lírio a
      // ATRAVESSAR a borda inferior pra dentro do Features. z-10 garante que ele pinte
      // por cima do Features (que é sibling posterior, opaco). Antes: overflow-hidden.
      style={{ overflowX: "clip", overflowY: "visible" }}
    >
      {mode === "pinned" ? (
        <div
          ref={pin}
          className="relative h-screen"
          style={{ overflowX: "clip", overflowY: "visible" }}
        >
          <Afluente veil={false} />

          {/* Grade cinematográfica sobre a foto (z-[21], acima do retrato z-20 e abaixo
              do ticker/recorte/editorial): vinheta funda nas bordas + grão de filme. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[21]"
            style={{
              background:
                "radial-gradient(120% 100% at 50% 36%, transparent 44%, rgba(0,0,0,0.5) 100%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[21] opacity-[0.055] mix-blend-overlay"
            style={{ backgroundImage: NOISE_BG, backgroundSize: "180px 180px" }}
          />

          {/* Costura com a section CLARA de cima (Como Começar agora fecha em creme):
              começa no MESMO creme (neutro-50 = #FAF9F5) no topo e desmaia no rosa da
              orquídea — os dois lados encontram-se no creme, então não há corte. A
              máscara é clara só no início (p=0); conforme o retrato vira full-bleed ela
              apaga (opacity 1→0 em applyP) pra não deixar faixa clara sobre a foto. */}
          <div
            ref={topMask}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-[22] h-56"
            style={{
              background:
                "linear-gradient(to bottom, #FAF9F5 0%, rgba(250,249,245,0.82) 32%, rgba(250,249,245,0.4) 60%, transparent 100%)",
            }}
          />

          {/* TICKER — nome gigante correndo SOBRE a imagem de fundo, atrás da cabeça
              dela. z-[24] fica acima da imagem/retrato (z-20) e abaixo do recorte. */}
          <div
            ref={tickerWrap}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[20%] z-[24] overflow-hidden"
          >
            <div ref={ticker} className="flex w-max will-change-transform">
              <TickerGroup />
              <TickerGroup />
            </div>
          </div>

          {/* RECORTE da Roberta — NA FRENTE do ticker (z-[26]). Enquadrado EXATAMENTE
              como a imagem de fundo: mesmo object-cover full-bleed e mesma
              object-position do retrato, então a Roberta recortada assenta em cima
              do fundo e o ticker passa por trás da cabeça dela. */}
          <div ref={cutout} className="pointer-events-none absolute inset-0 z-[26]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CUTOUT}
              alt="Roberta Carbonari"
              className="absolute inset-0 h-full w-full select-none object-cover"
              style={{ objectPosition: PORTRAIT_POS }}
            />
          </div>

          {/* palavras da headline gigante, flanqueando o centro (inner = mask reveal) */}
          <span
            ref={wordL}
            className="absolute top-1/2 z-30 whitespace-nowrap"
            style={{ right: "calc(62% + 155px)" }}
          >
            <span
              data-word-inner
              className="inline-block font-title text-[clamp(3.25rem,8vw,8rem)] font-medium leading-none text-neutro-800 [text-shadow:0_2px_28px_rgba(255,255,255,0.9),0_1px_4px_rgba(255,255,255,0.75)]"
            >
              QUEM
            </span>
          </span>
          <span
            ref={wordR}
            className="absolute top-1/2 z-30 whitespace-nowrap"
            style={{ left: "calc(38% + 155px)" }}
          >
            <span
              data-word-inner
              className="inline-block font-title text-[clamp(3.25rem,8vw,8rem)] font-medium leading-none text-neutro-800 [text-shadow:0_2px_28px_rgba(255,255,255,0.9),0_1px_4px_rgba(255,255,255,0.75)]"
            >
              CONSTRUIU?
            </span>
          </span>

          {/* retrato — card-retrato que cresce até ocupar a section inteira */}
          <div
            ref={portrait}
            className="absolute z-20 overflow-hidden will-change-[width,height,top,left,filter]"
          >
            <Portrait />
          </div>

          {/* scrim escuro na base da foto full-bleed — a foto dissolve num fundo
              ink, texto claro por cima. Opacidade dirigida por applyP: 0 enquanto
              o retrato ainda é card. */}
          <div
            ref={scrim}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[27] h-[72%] opacity-0"
            style={{ background: PORTRAIT_SCRIM_DARK }}
          />

          {/* Cluster floral + prova — canto inferior-esquerdo, sobre a foto full-bleed.
              Nasce no beat final (foto já cheia). Wrapper z-[28]: acima do scrim (z-27)
              e do recorte (z-26), abaixo do editorial (z-30, que fica na direita). */}
          <div ref={proof} aria-hidden className="pointer-events-none absolute inset-0 z-[28]">
            {/* cards em glass nas coordenadas EXATAS do Figma (node 195-530, frame
                885×516). Rectangle 1 = 68,230 / 214×122 → %; Rectangle 2 = 218,294 /
                231×188 → %. Mapeados como fração do full-bleed (100vw × 100vh). */}
            {/* card 1 — Credencial (Rectangle 1). min-h pra nunca cortar o conteúdo. */}
            <CredentialCard className="absolute left-[7.7%] top-[42%] z-[29] min-h-[30%] w-[24.2%]" />
            {/* card 2 — Alcance (Rectangle 2, sobrepondo o card 1) */}
            <ImpactCard className="absolute left-[24.6%] top-[56%] z-[29] min-h-[31%] w-[26.1%]" />
          </div>

          {/* editorial — ancorado na base, sobre o scrim escuro (texto claro) */}
          <div
            ref={editorial}
            className="absolute inset-x-0 bottom-0 z-30 pb-10 md:pb-14"
          >
            <Editorial onDark />
          </div>

          {/* LÍRIOS EM PRIMEIRO PLANO — z-40, ACIMA de tudo (foto, cards, editorial):
              desfocados (blur) pra ler como flores fora de foco na frente da lente. A
              section é vista "através" delas → profundidade. Dois cantos opostos
              emolduram a cena; o de cima é espelhado/girado e mais desfocado (mais
              "longe") pra não parecer clone. Entram junto com a prova (beat 0.98). */}
          <div ref={flora} aria-hidden className="pointer-events-none absolute inset-0 z-40">
            {/* baixo-esquerda (Figma Frame 16) — vaza pra baixo, ATRAVESSANDO a borda
                da section pra dentro do Features (habilitado pelo overflow-y visible
                + z-10 na section). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LIRIO}
              alt=""
              className="absolute bottom-[-20%] left-[-9%] w-[clamp(340px,38vw,600px)] select-none blur-[4px] drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]"
            />
            {/* topo-direita (Figma Frame 17) — espelhado/girado, mais desfocado (mais
                "longe"), sangrando pra cima e pra direita. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LIRIO}
              alt=""
              className="absolute top-[-22%] right-[-12%] w-[clamp(320px,34vw,560px)] select-none opacity-90 blur-[7px] drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
              style={{ transform: "scaleX(-1) rotate(18deg)" }}
            />
          </div>
        </div>
      ) : (
        // Fallback estático — mobile / prefers-reduced-motion
        <div className="relative overflow-hidden pb-16">
          <Afluente />
          {/* foto full-bleed, ocupando o topo inteiro da section */}
          <div className="relative z-10 mb-12 h-[70vh] max-h-[560px] w-full overflow-hidden">
            <Portrait />
            {/* ticker + recorte também no mobile */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[16%] z-[12] overflow-hidden">
              <div className="flex w-max -translate-x-[8%]">
                <TickerGroup />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 z-[14]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CUTOUT}
                alt="Roberta Carbonari"
                className="absolute inset-0 h-full w-full select-none object-cover"
                style={{ objectPosition: PORTRAIT_POS }}
              />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[16] h-1/2"
              style={{ background: PORTRAIT_SCRIM_LIGHT }}
            />
            {/* lírios em primeiro plano — desfocados pra dar profundidade, em dois cantos */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LIRIO}
              alt=""
              aria-hidden
              className="pointer-events-none absolute bottom-[-5%] left-[-8%] z-[19] w-[clamp(190px,52vw,300px)] select-none blur-[3px] drop-shadow-[0_24px_50px_rgba(0,0,0,0.45)]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LIRIO}
              alt=""
              aria-hidden
              className="pointer-events-none absolute top-[-8%] right-[-10%] z-[19] w-[clamp(150px,40vw,240px)] select-none opacity-90 blur-[5px] drop-shadow-[0_24px_50px_rgba(0,0,0,0.4)]"
              style={{ transform: "scaleX(-1) rotate(18deg)" }}
            />
            {/* cards de prova, empilhados no alto-esquerda da foto */}
            <div className="pointer-events-none absolute left-4 top-[26%] z-[18] flex flex-col gap-3">
              <ProofCard mark big="Mestre" sub="em Nutrição" className="w-[158px]" />
              <ProofCard big="+20" sub="profissionais formados" className="w-[166px]" />
            </div>
          </div>
          <div ref={editorial} className="relative z-10">
            <Editorial />
          </div>
        </div>
      )}
    </section>
  );
}

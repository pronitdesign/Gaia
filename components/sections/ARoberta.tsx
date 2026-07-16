"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { setTransitionProgress } from "@/lib/robertaTransition";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { Badge } from "@/components/ui/Badge";
import {
  IconShield,
  IconUserPlus,
  IconArrowUpRight,
  IconCheck,
} from "@/components/ui/icons";

gsap.registerPlugin(ScrollTrigger, CustomEase);

// Ease exata da transição de página do demo codrops (blenkcode/codrops-demo,
// src/lib/index.js — customEases.pageTransition), replicada byte a byte pelo
// path SVG, não aproximada por um ease nomeado do GSAP. É o que dá ao
// recuo-da-ARoberta + cortina-do-Features (ver useGSAP abaixo) a mesma
// assinatura de movimento do defaultTransition original — registrada uma vez
// no módulo, não a cada render.
CustomEase.create(
  "pageTransition",
  "M0,0 C0.38,0.05 0.48,0.58 0.65,0.82 0.82,1 1,1 1,1",
);

// Fundo da section — close-up fotográfico dos olhos (node Figma 251-83), com um glow
// magenta/violeta já queimado na própria foto, canto inferior-direito. Não é assunto
// abstrato: é o frame de abertura que a headline ancora. A camada de flor multiply
// segue fora — ela só fazia sentido com orquídea-sobre-branco sobre o gradiente claro.
// No modo PINNED este frame é só a base instantânea (primeiro paint, sem flash branco
// antes do primeiro bitmap decodificar) — o canvas da sequência (SEQ_FRAMES, ver
// abaixo) fica por cima e assume a partir do primeiro frame, que É esta mesma foto.
// No modo STACKED (sem sequência, Armadilha 4 do brief) esta imagem é o fundo inteiro.
const BACKDROP = "/quem-construiu-olhos.webp";

// Sequência de frames do push-in no olho — scrubbada pelo scroll (beat 0 do pin, ver
// useGSAP); depois do último frame, o mergulho na pupila continua o movimento (beat 1).
// ERA um <video> H.264 GOP=1 com currentTime escrito pelo scroll — e era isso que
// travava: seek de vídeo é ASSÍNCRONO (o frame pinta 1–3 ticks depois do scroll, o
// browser decide quando) e QUANTIZADO (só existem os 73 degraus, nada entre eles).
// Nenhum ease conserta latência de decode. A forma awwwards (Apple AirPods et al.) é
// pré-decodificar os frames em ImageBitmap e desenhar num <canvas> — seek síncrono,
// custo de um drawImage — com crossfade sub-frame entre vizinhos (o degrau vira motion
// blur) e scrub amortecido (ver o damp no useGSAP). 73 webp q68 = 5.0MB, o mesmo
// payload do mp4 que substituem. SÓ carrega no modo pinned (Armadilha 4) — o fallback
// stacked/mobile nunca busca um frame.
const SEQ_FRAMES = 73;
const SEQ_W = 1920;
const SEQ_H = 1072;
const seqSrc = (i: number) => `/olho-seq/olho-${String(i + 1).padStart(3, "0")}.webp`;

// Geometria da íris (centro = pupila), MEDIDA no frame de origem (3852×2152) como
// FRAÇÃO do frame do vídeo — nunca em px cravado nem em % de viewport. O vídeo é
// object-cover full-bleed, então a íris se desloca conforme o aspect da tela; só a
// fração sobrevive a qualquer viewport (ver computeIrisBox abaixo). Hoje o consumidor
// é o mergulho (applyDive): cx/cy é o ponto de fuga do dolly e o centro do portal.
const IRIS_CX_FRAC = 0.5587;
const IRIS_CY_FRAC = 0.4977;
const IRIS_W_FRAC = 0.2191;
const IRIS_H_FRAC = 0.3281;

// ── Disco pupila+íris no frame FINAL (73) — a anatomia que o portal imita ──────
// MEDIDO no frame com grade de 95px (px do frame 1920×1072, não fração): centro
// (1103, 539) e raios 235×190. É uma ELIPSE (aspect 0.81) — o olho está em leve
// 3/4, a pupila nunca foi um círculo perfeito na tela. Duas coisas nascem daqui:
// a MÁSCARA do portal (que abre nesta elipse, não num círculo genérico — círculo
// era o que fazia a transição ler como wipe de slideshow, não como pupila) e o
// ANEL DE ÍRIS (sprite recortado em runtime do próprio frame 73, ver
// buildIrisSprite no useGSAP: limbus escuro + textura + veias da esclera, com
// alpha radial elíptico) que cavalga a borda do portal enquanto ele dilata.
const DISC_CX_SRC = 1103;
const DISC_CY_SRC = 539;
const DISC_RX_SRC = 235;
const DISC_ASPECT = 190 / 235; // ry/rx ≈ 0.81
// Fim do fade EXTERNO do sprite, em múltiplos de rx — até onde entra esclera/veias.
const DISC_SPRITE_OUT = 1.35;

/** Bbox da íris (centro = pupila) em px de VIEWPORT, dado o tamanho atual da tela —
 *  replica a conta do cover: o frame (1920×1072) cobre vw×vh, e a íris é um ponto
 *  fixo dentro dele que se desloca com o crop. Chamada a cada frame do mergulho
 *  (applyDive) e no onRefresh — nunca cacheada, porque a viewport muda (resize,
 *  rotate) e um valor velho desloca o ponto de fuga pra fora da pupila. O drawSeq
 *  (canvas) usa EXATAMENTE esta mesma conta de cover — se uma mudar, a outra tem
 *  que mudar junto, senão a pupila desenhada e o ponto de fuga divergem. */
function computeIrisBox(vw: number, vh: number) {
  const frameAspect = SEQ_W / SEQ_H;
  const viewportAspect = vw / vh;
  let scale: number, offsetX: number, offsetY: number;
  if (viewportAspect > frameAspect) {
    scale = vw / SEQ_W;
    offsetX = 0;
    offsetY = (vh - SEQ_H * scale) / 2;
  } else {
    scale = vh / SEQ_H;
    offsetX = (vw - SEQ_W * scale) / 2;
    offsetY = 0;
  }
  return {
    cx: offsetX + IRIS_CX_FRAC * SEQ_W * scale,
    cy: offsetY + IRIS_CY_FRAC * SEQ_H * scale,
    w: IRIS_W_FRAC * SEQ_W * scale,
    h: IRIS_H_FRAC * SEQ_H * scale,
  };
}

// Véu de neutro-50 sobre o fundo — SÓ no modo stacked, onde o editorial pousa direto
// no BACKDROP. RECALIBRADO (Armadilha 3 do brief do vídeo): a premissa antiga —
// pior pixel do gradiente vinho em rgb(181,131,169), α≥0.45 bastava — morreu quando
// BACKDROP virou a foto de olhos (bem mais escura: hospeda cabelo/pupila próximos de
// preto). MEDIDO no render (não no arquivo-fonte — texto escondido, screenshot,
// amostra de pixel): com a cauda antiga em α 0.58–0.62, o p5 mais escuro sob a bio
// (texto rgb(76,79,90)) só batia 3.7:1 — abaixo do 4.5:1 AA de texto de corpo. Cauda
// subida pra α 0.80–0.88 devolve ao menos ~5:1 no mesmo pior pixel (reverificar se o
// BACKDROP mudar de novo). Como o object-cover reposiciona a foto a cada viewport, o
// véu segura esse pior caso em toda a faixa do editorial — não dá pra contar com
// sorte de crop. No modo pinned o editorial sobe sobre o retrato full-bleed (que tem
// scrim próprio), então lá o véu não entra e o fundo do Figma aparece cheio.
const LEGIBILITY_VEIL =
  "linear-gradient(to bottom, rgba(250,249,245,0.04) 0%, rgba(250,249,245,0.08) 30%, rgba(250,249,245,0.18) 38%, rgba(250,249,245,0.80) 46%, rgba(250,249,245,0.88) 100%)";

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
    <div data-portrait-inner className="relative h-full w-full overflow-hidden bg-bruma">
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

/** CARD 2 — Alcance. Identidade: métrica viva. Formato paisagem: coluna esquerda com
 *  credencial + número, coluna direita com selo "crescendo", mini bar-chart e métricas
 *  de apoio. Glow azul.
 *  Sem `relative` na casca: o posicionamento vem do className, e na cascata do Tailwind
 *  `relative` venceria `absolute` independente da ordem das classes. */
function ImpactCard({ className = "" }: { className?: string }) {
  return (
    <div
      data-proof
      className={`${PROOF_CARD} flex items-stretch gap-6 overflow-hidden px-6 py-5 ${className}`}
    >
      {/* assinatura de cor — luz azul difusa no canto superior-esquerdo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-azul-400/20 blur-3xl"
      />
      {/* coluna esquerda — credencial + número */}
      <div className="flex min-w-0 flex-col justify-between">
        <div className="flex items-center gap-2.5">
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
        <div className="flex items-end gap-2.5">
          <span className="font-title text-[clamp(2.1rem,2.6vw,2.8rem)] font-medium leading-none tracking-[-0.02em] text-neutro-0">
            +20
          </span>
          <span className="whitespace-nowrap pb-0.5 font-body text-[12.5px] leading-tight text-white/60">
            profissionais
            <br />
            formados
          </span>
        </div>
      </div>
      {/* coluna direita — selo, gráfico e métricas de apoio */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <span className="inline-flex w-fit items-center gap-1 self-end rounded-full bg-sage-400/20 px-2.5 py-1 font-body text-[10.5px] font-medium text-sage-300">
          <IconArrowUpRight className="h-3 w-3" />
          crescendo
        </span>
        <div className="flex h-8 items-end gap-[3px]">
          {IMPACT_BARS.map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-full"
              style={{ height: `${h}%`, background: IMPACT_ACCENTS[i] ?? "rgba(255,255,255,0.26)" }}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-white/10 pt-2 font-body text-[11.5px] text-white/55">
          <span className="whitespace-nowrap">
            <b className="font-semibold text-white/85">3</b> clínicas
          </span>
          <span className="whitespace-nowrap">
            <b className="font-semibold text-white/85">+1M</b> seguidores
          </span>
        </div>
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
  // Wrapper do recuo (transição pra Features). NUNCA anima `pin.current`
  // diretamente: é nele que o próprio GSAP escreve transform pra manter o
  // pin colado à tela (ver o scrollTrigger no useGSAP) — uma segunda mão de
  // transform ali brigaria com a do pin e quebraria o efeito. `recede`
  // existe só pra isso: um filho direto de `pin`, do tamanho dele, que pode
  // receber y/scale/opacity sem tocar no elemento que o pin já controla.
  const recede = useRef<HTMLDivElement>(null);
  const portrait = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  // Canvas do push-in no olho (ver SEQ_FRAMES) — quem desenha é drawSeq, dirigido
  // pelo scrub amortecido; nunca um clock próprio, quem manda é o scroll (Armadilha 5).
  const seqCanvas = useRef<HTMLCanvasElement>(null);
  // Anel de íris — canvas com o recorte REAL do limbus do frame 73 (ver
  // buildIrisSprite), que cavalga a borda do portal enquanto a pupila dilata.
  const irisRing = useRef<HTMLCanvasElement>(null);
  // Bloco único da headline de abertura ("QUEM ESTÁ" / "POR TRÁS?"), ancorado no
  // rodapé-direita do frame Figma — ver o JSX pinned pro porquê de um bloco só, não
  // mais duas palavras flanqueando o centro.
  const headline = useRef<HTMLDivElement>(null);
  const editorial = useRef<HTMLDivElement>(null);
  // Camadas novas
  const tickerWrap = useRef<HTMLDivElement>(null);
  const ticker = useRef<HTMLDivElement>(null);
  const cutout = useRef<HTMLDivElement>(null);
  const proof = useRef<HTMLDivElement>(null);

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
        // Sem pin não há cortina — e sem cortina o Features não pode esperar
        // por um progresso que nunca vai chegar. `null` manda ele cair no
        // fallback em tempo real (ver lib/robertaTransition.ts).
        setTransitionProgress(null);

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

      // ── Mergulho na pupila (dolly-zoom contínuo) ─────────────────────────────
      // O handoff deixou de ser o match-cut reflexo→card (a versão anterior fazia o
      // retrato NASCER no bbox da íris e crescer até full-bleed). Agora a câmera NÃO
      // PARA no olho: depois do scrub dos 73 frames, o último frame congelado segue
      // escalando ancorado no centro da pupila (computeIrisBox dá o ponto), acelerando
      // (power2.in no tween), com blur crescente — dolly perdendo foco — e uma torção
      // sutil (rotate ∝ d²) que faz as fibras da íris riscarem em vórtice. Enquanto
      // isso a pupila vira PORTAL: uma máscara radial de borda emplumada (mask-image,
      // nunca clip-path — clip-path tem borda dura e pupila dilatando não tem) abre o
      // RETRATO full-bleed de dentro do ponto da pupila até cobrir o canto mais
      // distante da viewport — a cena seguinte nasce de dentro do olho SEM passar
      // por tela preta. (A versão anterior fechava num breu com uma ✦; a Laura vetou
      // os dois — nada de quadro escuro em nenhum frame do caminho.)
      // d: 0 = frame final do vídeo em repouso · 1 = portal aberto, retrato cheio.
      const DIVE_SCALE_MAX = 9; // escala final do frame congelado (expoente, ver applyDive)
      // 0.3: o portal começa a abrir com a escala já ~2× — cedo o bastante pra que
      // entre o olho e o retrato nunca exista um quadro sem cena viva.
      const REVEAL_START = 0.3; // d em que a pupila-portal começa a abrir
      const state = { scrub: 0, dive: 0 };

      // ── Sequência: decode, draw e scrub amortecido ───────────────────────────
      // Três peças que substituem o <video> scrubbado (ver o bloco do SEQ_FRAMES):
      //
      // 1. DECODE — os 73 webp viram ImageBitmap em memória, em DUAS passadas com 4
      //    workers: primeiro frame sim/frame não (stride 6 — em segundos o scrub
      //    inteiro tem cobertura grossa), depois o preenchimento. Se o scroll chega
      //    num frame ainda não decodificado, drawSeq usa o vizinho carregado mais
      //    próximo — degrada pra um passo maior, nunca pra buraco/flash.
      //
      // 2. DRAW — drawSeq desenha o frame no canvas com a MESMA conta de cover do
      //    computeIrisBox, e faz crossfade sub-frame: frame ⌊f⌋ opaco + frame ⌈f⌉
      //    com alpha fracionário. É o que apaga o degrau dos 73 frames — entre dois
      //    quadros o olho atravessa um blend contínuo, lido como motion blur, não
      //    como salto. (Backing do canvas tem teto na resolução da fonte: dpr acima
      //    de 1920/vw só queima fill-rate ampliando webp, sem ganhar nitidez.)
      //
      // 3. DAMP — o scroll escreve só seq.target; um ticker leva seq.current até lá
      //    com decaimento exponencial POR deltaTime (frame-rate-independent — lerp
      //    cru por frame derrapa em 120Hz vs 60Hz). λ=14: alcance rápido o bastante
      //    pra nunca ler como lag, e ainda assim toda flick de roda vira uma rampa
      //    com inércia de câmera em vez de um degrau seco. Determinístico: mesmo
      //    scroll → mesmo caminho, ida e volta (nada de random, Armadilha do scrub
      //    reverso). O tremor do mergulho segue senoidal por d, inalterado.
      const bitmaps: (ImageBitmap | null)[] = new Array(SEQ_FRAMES).fill(null);
      let seqDisposed = false;
      let needsDraw = true;
      const aborter = new AbortController();

      // ── Anel de íris (ver o bloco do DISC_* nas constantes) ─────────────────
      // O sprite é construído UMA vez, em runtime, do próprio frame 73 — nunca um
      // asset separado: se o footage trocar, o anel troca junto, e a textura é por
      // definição a do olho que está na tela. Recorte quadrado centrado no disco
      // medido, com alpha radial ELÍPTICO (transform scale(1, aspect) antes do
      // gradiente — canvas não tem gradiente elíptico nativo): transparente no
      // miolo (a pupila é o portal, quem mora lá é o retrato), opaco na banda do
      // limbus (0.80→0.95·rx), segurando até 1.12·rx e desmanchando na esclera
      // até 1.35·rx. O resultado É o aro do olho — escuro, irregular, com veias —
      // não um radial-gradient chapado fingindo ser aro.
      let irisSpriteReady = false;
      const buildIrisSprite = () => {
        const ring = irisRing.current;
        const bmp = bitmaps[SEQ_FRAMES - 1];
        if (!ring || !bmp || irisSpriteReady) return;
        const R = Math.ceil(DISC_RX_SRC * DISC_SPRITE_OUT);
        ring.width = ring.height = 2 * R;
        ring.style.width = ring.style.height = `${2 * R}px`;
        const g = ring.getContext("2d");
        if (!g) return;
        g.drawImage(bmp, DISC_CX_SRC - R, DISC_CY_SRC - R, 2 * R, 2 * R, 0, 0, 2 * R, 2 * R);
        g.globalCompositeOperation = "destination-in";
        g.save();
        g.translate(R, R);
        g.scale(1, DISC_ASPECT);
        const grad = g.createRadialGradient(0, 0, 0, 0, 0, R);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.8 / DISC_SPRITE_OUT, "rgba(0,0,0,0)");
        grad.addColorStop(0.95 / DISC_SPRITE_OUT, "rgba(0,0,0,1)");
        grad.addColorStop(1.12 / DISC_SPRITE_OUT, "rgba(0,0,0,1)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.fillRect(-R, -R / DISC_ASPECT, 2 * R, (2 * R) / DISC_ASPECT);
        g.restore();
        irisSpriteReady = true;
        needsDraw = true; // força um tick de redraw — applyDive reposiciona o anel
      };

      const loadFrame = async (i: number) => {
        if (bitmaps[i] || seqDisposed) return;
        try {
          const res = await fetch(seqSrc(i), { signal: aborter.signal });
          const bmp = await createImageBitmap(await res.blob());
          if (seqDisposed) {
            bmp.close();
            return;
          }
          bitmaps[i] = bmp;
          needsDraw = true; // o ticker redesenha — pode ser exatamente o frame em vista
          if (i === SEQ_FRAMES - 1) buildIrisSprite();
        } catch {
          /* abort no cleanup ou rede: o nearest-loaded do drawSeq cobre o vão */
        }
      };
      const loadOrder: number[] = [];
      for (let i = 0; i < SEQ_FRAMES; i += 6) loadOrder.push(i);
      for (let i = 0; i < SEQ_FRAMES; i++) if (i % 6 !== 0) loadOrder.push(i);
      if (!loadOrder.includes(SEQ_FRAMES - 1)) loadOrder.splice(1, 0, SEQ_FRAMES - 1);
      let loadCursor = 0;
      for (let k = 0; k < 4; k++) {
        (async () => {
          while (loadCursor < loadOrder.length && !seqDisposed) {
            await loadFrame(loadOrder[loadCursor++]);
          }
        })();
      }

      const canvas = seqCanvas.current;
      const cctx = canvas?.getContext("2d");
      const resizeCanvas = () => {
        if (!canvas) return;
        const cw = canvas.clientWidth || window.innerWidth;
        const ch = canvas.clientHeight || window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2, SEQ_W / Math.max(1, cw));
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        needsDraw = true;
      };
      resizeCanvas();

      /** Frame carregado mais próximo de `i` (busca radial) — -1 se nada decodificou
       *  ainda; nesse caso o BACKDROP por baixo (a MESMA foto do frame 0) segura o
       *  quadro, sem flash. */
      const nearestLoaded = (i: number) => {
        if (bitmaps[i]) return i;
        for (let d = 1; d < SEQ_FRAMES; d++) {
          if (i - d >= 0 && bitmaps[i - d]) return i - d;
          if (i + d < SEQ_FRAMES && bitmaps[i + d]) return i + d;
        }
        return -1;
      };

      const drawSeq = (f: number) => {
        if (!canvas || !cctx || !canvas.width) return;
        const i0 = Math.floor(f);
        const i1 = Math.min(SEQ_FRAMES - 1, i0 + 1);
        const a = nearestLoaded(i0);
        if (a < 0) return;
        // Mesma conta de cover do computeIrisBox, em px de backing — os frames são
        // opacos e cobrem o canvas inteiro, então não há clearRect a pagar.
        const s = Math.max(canvas.width / SEQ_W, canvas.height / SEQ_H);
        const dw = SEQ_W * s;
        const dh = SEQ_H * s;
        const dx = (canvas.width - dw) / 2;
        const dy = (canvas.height - dh) / 2;
        cctx.globalAlpha = 1;
        cctx.drawImage(bitmaps[a]!, dx, dy, dw, dh);
        // Crossfade sub-frame — só quando o frame base é o certo (não um vizinho
        // de fallback) e o próximo já decodificou.
        const mix = f - i0;
        if (mix > 0.001 && a === i0 && bitmaps[i1]) {
          cctx.globalAlpha = mix;
          cctx.drawImage(bitmaps[i1]!, dx, dy, dw, dh);
          cctx.globalAlpha = 1;
        }
      };

      // Posição do scrub em unidade de FRAME (0..72). current=-1 = primeiro tick
      // ainda não rodou (snap direto pro target, sem rampa de abertura).
      const seq = { target: 0, current: -1 };
      const applySeq = (t: number) => {
        seq.target = t * (SEQ_FRAMES - 1);
      };
      const tickSeq = (_t: number, deltaTime: number) => {
        const k = 1 - Math.exp((-14 * deltaTime) / 1000);
        let cur =
          seq.current < 0 ? seq.target : seq.current + (seq.target - seq.current) * k;
        if (Math.abs(seq.target - cur) < 0.002) cur = seq.target; // pouso exato, sem cauda infinita
        if (cur !== seq.current || needsDraw) {
          seq.current = cur;
          needsDraw = false;
          drawSeq(cur);
          // O push-in do scrub mora no transform do canvas (ver applyDive) — anda
          // junto com o frame, senão a escala salta quando o damp ainda corre.
          applyDive(state.dive);
        }
      };
      gsap.ticker.add(tickSeq);

      const applyDive = (d: number) => {
        const cv = seqCanvas.current;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // O ponto de fuga é o centro da pupila MEDIDO a cada frame (nunca cacheado —
        // resize/rotate desloca o crop do object-cover, ver computeIrisBox).
        const iris = computeIrisBox(vw, vh);

        if (cv) {
          // PUSH-IN do scrub: a câmera nunca fica parada — enquanto o olho ainda
          // troca de frame, o quadro inteiro já avança devagar em direção à pupila
          // (1.02 → ~1.082 ao longo do beat 0), ancorado no mesmo transform-origin
          // do mergulho. É dolly, não decoração: sem ele, entre um frame e outro o
          // enquadramento é estático e o scrub lê como slideshow. Lê seq.current
          // (o valor JÁ amortecido), então a escala anda na mesma rampa do frame.
          // O expoente do mergulho parte DESTA base — quando d arranca, pv já é 1
          // (o dive só começa depois do scrub completo) e a emenda é sem costura.
          const pv = Math.min(1, Math.max(0, seq.current / (SEQ_FRAMES - 1)));
          const base = 1.02 * (1 + 0.06 * pv);
          // Escala EXPONENCIAL (9^d), não linear: aproximação real a velocidade
          // constante cresce hiperbolicamente no quadro — linear lia como zoom de
          // software, não como câmera avançando. Composta com o power2.in do tween,
          // o fim é vertiginoso, que é o ponto. Overscan de 1.02 em repouso: a
          // torção (rotate abaixo) exporia os cantos do full-bleed nos primeiros
          // frames — o overscan cobre isso sem ser visível. transform-origin no
          // ponto da pupila: mantém a pupila cravada no lugar enquanto tudo escala
          // pra FORA dela — sensação de entrar, não de aproximar. rotate ∝ d² (não
          // d): a torção só existe quando a escala já lê como vórtice de fibras,
          // nunca como a foto inteira girando; 22° no fim (a ref da Laura pede ~25,
          // acima disso os cílios riscam diagonal demais e denunciam o giro 2D).
          const S = base * Math.pow(DIVE_SCALE_MAX, d);
          // Micro-tremor de câmera — duas senoides dessincronizadas (nunca random:
          // o scrub reverso tem que refazer o MESMO caminho), amplitude ∝ sin(π·d):
          // zero exato nas duas pontas, então nem o repouso nem o handoff pro preto
          // ganham offset. ~6px no pico — handheld, não terremoto.
          const amp = 6 * Math.sin(Math.PI * d);
          const sx = amp * (Math.sin(d * 23.7) + 0.5 * Math.sin(d * 11.3));
          const sy = amp * (Math.cos(d * 19.1) + 0.5 * Math.sin(d * 13.9));
          cv.style.transformOrigin = `${iris.cx}px ${iris.cy}px`;
          cv.style.transform = `translate(${sx}px, ${sy}px) scale(${S}) rotate(${d * d * 22}deg)`;
          // Curva de EXPOSIÇÃO, não só blur: a luz sobe no meio do trajeto
          // (atravessando a córnea molhada, brightness até ~1.4 + saturate até 1.6,
          // os valores da ref) e volta a 1 no fim — o mergulho atravessa LUZ do
          // começo ao fim; o crush pro escuro que existia aqui saiu junto com o
          // breu (veto da Laura: nenhum frame escuro no caminho).
          // Blur ∝ d²: no meio do mergulho as fibras ainda precisam ser legíveis
          // riscando (blur linear lavava tudo cedo demais — medido no render); no
          // fim, 14px é motion blur E disfarce da pixelização de ampliar 9×.
          const brightness = 1 + 0.4 * Math.sin(Math.PI * d);
          cv.style.filter = `blur(${d * d * 14}px) saturate(${1 + 0.6 * d}) brightness(${brightness})`;
        }

        // ── Pupila-portal ────────────────────────────────────────────────────
        // A cena seguinte abre DENTRO da pupila: máscara radial no RETRATO (que já
        // está full-bleed e opaco por baixo, ver o gsap.set no setup), crescendo do
        // ponto da pupila até cobrir o canto mais distante da viewport. Borda
        // emplumada em 10% do raio — pupila dilatando não tem recorte duro. A
        // abertura é a ELIPSE do disco real (DISC_ASPECT, medido no frame 73) —
        // círculo perfeito lia como wipe genérico, não como ESTA pupila dilatando.
        const t = Math.min(1, Math.max(0, (d - REVEAL_START) / (1 - REVEAL_START)));
        // Raio até o CANTO mais distante, em MÉTRICA elíptica (dy dividido pelo
        // aspect): é o rx que faz a elipse alcançar o canto — qualquer valor menor
        // deixa um triângulo de olho vivo no canto oposto à pupila.
        const maxR = Math.hypot(
          Math.max(iris.cx, vw - iris.cx),
          Math.max(iris.cy, vh - iris.cy) / DISC_ASPECT,
        );
        // Núcleo sólido em 90% do raio externo → em t=1 o sólido já alcançou maxR
        // e o retrato cobre tudo sem depender da cauda da pluma.
        const Rm = (t * maxR) / 0.9;
        const pr = portrait.current;
        if (pr) {
          // rx ry explícitos (stops em % do extent da elipse) — mesma pluma de 10%.
          const m = `radial-gradient(${Rm}px ${Rm * DISC_ASPECT}px at ${iris.cx}px ${iris.cy}px, black 90%, transparent 100%)`;
          pr.style.setProperty("mask-image", m);
          pr.style.setProperty("-webkit-mask-image", m);
        }

        // ── Anel de íris na borda ────────────────────────────────────────────
        // O limbus REAL (sprite do frame 73, ver buildIrisSprite) cavalga a pluma:
        // escala cravada em rx·k = Rm — a banda opaca do sprite (0.80→0.95·rx)
        // cobre exatamente a zona da pluma da máscara (0.9→1.0·Rm), então a borda
        // visível do portal nunca é o gradiente, é o aro do olho com veias e
        // textura, dilatando pra fora da tela. Fica ABAIXO do retrato (z-10 <
        // z-20): dentro do sólido o retrato o cobre; ele só existe na borda e
        // fora dela, sobre o footage borrado — como um limbus de verdade. Roda
        // com a MESMA torção do footage (d²·22°) + um fio próprio (6°·t): as
        // fibras giram junto com o vórtice, não coladas nele. Mesma curva de
        // exposição; blur menor (d²·6) — o aro é o plano em foco da passagem.
        const ring = irisRing.current;
        if (ring) {
          if (t <= 0 || t >= 1 || !irisSpriteReady) {
            ring.style.opacity = "0";
          } else {
            const k = Rm / DISC_RX_SRC;
            ring.style.opacity = String(Math.min(1, t / 0.08));
            ring.style.left = `${iris.cx}px`;
            ring.style.top = `${iris.cy}px`;
            ring.style.transform = `translate(-50%,-50%) scale(${k}) rotate(${d * d * 22 + 6 * t}deg)`;
            ring.style.filter = `blur(${d * d * 6}px) saturate(${1 + 0.6 * d}) brightness(${1 + 0.4 * Math.sin(Math.PI * d)})`;
          }
        }
      };

      gsap.set(editorial.current, { autoAlpha: 0, y: 44 });
      gsap.set(headline.current, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
      gsap.set("[data-word-inner]", { filter: "blur(0px)" });
      // O retrato já nasce full-bleed E OPACO — quem o esconde é a máscara-portal
      // (raio 0 em d=0, ver applyDive), nunca opacity: dono único da revelação é a
      // máscara, sem segundo tween disputando (a lição da orquídea segue valendo).
      gsap.set(portrait.current, {
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        autoAlpha: 1,
      });
      gsap.set(scrim.current, { autoAlpha: 0 });
      applySeq(0);
      applyDive(0);

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

      // Cards de prova: mesmo tempo do ticker/recorte — só fazem sentido sobre a
      // foto cheia. Wrapper apaga tudo; os cards sobem com stagger.
      gsap.set(proof.current, { autoAlpha: 0 });
      gsap.set("[data-proof]", { autoAlpha: 0, y: 28 });

      // Entrada — cada linha da headline sobe com blur-to-sharp (stagger).
      gsap.from("[data-word-inner]", {
        yPercent: 120,
        filter: "blur(14px)",
        autoAlpha: 0,
        duration: 1.1,
        ease: "power4.out",
        stagger: 0.14,
        scrollTrigger: { trigger: pin.current, start: "top 62%", once: true },
      });
      // O retrato NÃO tem tween de entrada disparado por ScrollTrigger próprio — de
      // propósito. O frame de abertura (t=0) precisa ser SÓ o vídeo (olho + glow) +
      // a headline, e um `gsap.from` com `once:true` separado correria contra o
      // scrub pelo mesmo autoAlpha (a corrida de dois donos que já fez a orquídea
      // sumir nesta cena numa rodada anterior). Dono único: a TIMELINE scrubbada —
      // o retrato emerge do preto no beat 2, e só ela escreve o autoAlpha dele.

      let counted = false;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          // Cresceu de 140% pra 240%: o vídeo (beat 0, 45% da janela) precisa de
          // pista de scroll própria além do que os beats de crescimento/editorial/
          // ticker/cards já usavam — sem isso o push-in inteiro passaria em menos de
          // meio scroll de roda de mouse.
          end: "+=240%",
          pin: pin.current,
          pinSpacing: true,
          scrub: 0.5,
          // Este pin nasce tarde (mode: stacked → pinned num segundo render), então
          // os triggers do Manifesto já existem quando ele injeta o pinSpacing.
          // refreshPriority reordena o refresh pela ordem do documento — ver a nota
          // em ComoComecar (2). Sem isso o Manifesto mede-se 3960px acima do real.
          refreshPriority: 1,
          // A viewport muda (resize/rotate) — computeIrisBox E o backing do canvas
          // dependem dela, então o handoff precisa ser recalculado aqui, não só
          // aplicado com o valor velho. O snap (current = target) evita o damp
          // correr uma rampa visível depois de um jump de refresh.
          onRefresh: () => {
            resizeCanvas();
            applySeq(state.scrub);
            seq.current = seq.target;
            needsDraw = true;
            applyDive(state.dive);
          },
        },
      });

      // Beat 0 — a sequência scrubba os 73 frames enquanto a headline está visível
      // e depois sai. `ease: "none"`: o MAPEAMENTO scroll→frame tem que ser 1-pra-1,
      // sem suavização — qualquer ease faria o mesmo trecho de scroll mapear pra
      // frames diferentes dependendo da velocidade, quebrando a leitura de "puxar o
      // filme". A suavização que existe é POSTERIOR ao mapeamento e determinística:
      // o damp do tickSeq persegue este target — inércia, não remapeamento.
      tl.to(
        state,
        { scrub: 1, ease: "none", duration: 0.45, onUpdate: () => applySeq(state.scrub) },
        0,
      )
        // Saída: a headline sai enquanto o push-in do vídeo já avançou — não no
        // frame 0 (senão o vídeo nunca é lido "puro", sem texto por cima) e não perto
        // do handoff (senão compete com o arranque do mergulho). Início 0.25, fim
        // 0.40: a janela pedida no brief.
        .to(
          headline.current,
          { yPercent: -22, autoAlpha: 0, filter: "blur(10px)", ease: "power2.in", duration: 0.15 },
          0.25,
        )
        // Beat 1 — MERGULHO: o dolly não para no fim do vídeo; o frame congelado
        // segue pupila adentro (ver applyDive). Começa exatamente onde o scrub
        // termina (0.45) — sem gap nem overlap, senão ou sobra um instante de câmera
        // parada, ou o mergulho arranca com o vídeo ainda trocando de frame.
        // power2.in, não inOut: aceleração contínua através do portal — a queda só
        // desacelera no pouso do retrato (beat 2).
        .to(
          state,
          { dive: 1, ease: "power2.in", duration: 0.35, onUpdate: () => applyDive(state.dive) },
          0.45,
        )
        // Beat 2 — o pouso, DENTRO do portal que ainda abre. O retrato não aparece
        // por fade: já está opaco atrás da máscara (ver applyDive), e o que se vê
        // dele pela pupila-portal nasce 12% maior, desfocado e um tico subexposto,
        // POUSANDO (scale→1, rack focus blur→0, exposição recupera) enquanto o
        // portal termina de abrir — a câmera que vinha caindo desde o olho
        // desacelera e aterrissa do outro lado, sem nenhum frame escuro no caminho.
        // 0.66 ≈ o portal já visível (d≈0.36); dur 0.44 → pousa em 1.10.
        .fromTo(
          "[data-portrait-inner]",
          { scale: 1.12, filter: "blur(10px) brightness(0.82)" },
          { scale: 1, filter: "blur(0px) brightness(1)", ease: "power3.out", duration: 0.44 },
          0.66,
        )
        // O canvas (já 100% coberto pelo retrato mascarado a partir de d=1, tl 0.80)
        // apaga num .set reversível — nada de compositar um canvas 9× com blur de
        // 14px atrás de camada opaca pelo resto do pin.
        .set(seqCanvas.current, { autoAlpha: 0 }, 0.84)
        .to(scrim.current, { autoAlpha: 1, ease: "none", duration: 0.16 }, 0.9)
        // Beat 3 — editorial sobe nos 60vh de baixo; números contam. 1.16: depois do
        // pouso do retrato (0.66+0.44) — o texto entra sobre foto estável e nítida,
        // nunca sobre o rack focus ainda em curso.
        .to(editorial.current, { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.5 }, 1.16)
        // Beat 4 — ticker e recorte da Roberta materializam sobre a foto full-bleed.
        // Não antes: só fazem sentido sobre a cena já revelada.
        .to(
          [tickerWrap.current, cutout.current],
          { autoAlpha: 1, ease: "power2.out", duration: 0.22 },
          1.22,
        )
        // Beat 4 (cont.) — cards de prova materializam no canto inferior-esquerdo.
        .to(proof.current, { autoAlpha: 1, ease: "none", duration: 0.15 }, 1.2)
        .to(
          "[data-proof]",
          { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.55, stagger: 0.12 },
          1.26,
        )
        .call(
          () => {
            if (!counted) {
              counted = true;
              animateCounts(false);
            }
          },
          [],
          // Junto com o editorial (beat 3): dispara com os números já visíveis.
          1.16,
        );

      // ── Transição pra Features (scroll-scrub do defaultTransition do
      // codrops — blenkcode/codrops-demo, src/transitions/animations/default.js) ──
      //
      // O demo dispara num clique: current recua (y -30vh, scale 0.8, opacity
      // 0.4) enquanto next sobe por uma clipPath (inset 100%→0%), os dois ao
      // mesmo tempo, no mesmo ease customizado (pageTransition). O ponto
      // central do original: next é FIXED e NÃO SE MOVE — o clipPath sozinho
      // faz 100% da revelação, com current visível por trás da máscara que abre.
      //
      // CONFIRMADO NO BUNDLE PUBLICADO (async-page-transitions.crnacura.
      // workers.dev): baixei /assets/index-DHXtjec7.js e achei `inset(100% 0%
      // 0% 0%)` + `-30vh` (é o defaultTransition) — mas NÃO achei `-50%` nem
      // `x:"100%"` (a assinatura do alternativeTransition, que o Vite
      // tree-shakou do build publicado porque nenhuma rota o usa).
      // `/alternative-page` é o NOME DA ROTA da segunda página (namespace
      // "about"), não o nome de uma transição — o efeito visto ali É o
      // defaultTransition, o mesmo que este bloco replica desde a primeira
      // versão. Registrando isso aqui pra ninguém (inclusive eu) reabrir essa
      // investigação de novo.
      //
      // NÃO dá pra pendurar isso no `tl` acima — tentei, e o motivo é o ponto
      // central desta seção (vale registrar pra ninguém repetir o mesmo
      // caminho): todo pin do GSAP deixa um "resto" de scroll do tamanho da
      // PRÓPRIA altura do pin (aqui, 100vh) depois que o scrub termina — o
      // conteúdo pinado já soltou (unpin) e o Features, que vem em seguida,
      // ainda está a 1 viewport de distância, chegando por scroll comum, FORA
      // do scrub. Medido com end:"+=140%": progress 0→1 do `tl` ocupa os
      // primeiros ~1260px depois de "top top", e só ~900px MAIS TARDE
      // (exatamente a altura do pin) o Features encosta no topo da tela — sem
      // ele nunca ter ficado visível antes disso. Um beat preso ao `tl`
      // (tentativa anterior: estender `end` e anexar um `.to()` no fim)
      // sempre COMPLETA antes desse resto — a cortina "abria" e o recuo
      // terminava com o Features inteiro fora da tela, e sobrava só scroll
      // comum, sem ease nenhum, bem no trecho em que ele de fato aparece.
      // Verificado no browser (ver relatório) antes de reescrever assim.
      //
      // Por isso o recuo e a cortina rodam num gsap.ticker próprio — mesmo
      // mecanismo do ScrollPhone (medir o rect AO VIVO a cada frame, não
      // confiar em progress de timeline) — com progresso derivado da posição
      // REAL do Features na tela, não do scroll acumulado. Isso prende os
      // dois exatamente à janela em que o Features está de fato entrando no
      // viewport: os tais ~900px de "resto" do pin, que É o ~1 viewport
      // pedido no brief, não uma fatia arbitrária do scrub.
      //
      // PRIMEIRA VERSÃO DESSE TICKER (errada, ficou no ar por uma sessão
      // inteira até ser medida): deixava #features NO FLUXO NORMAL — quem
      // revelava era o próprio scroll — e lia featuresEl.getBoundingClientRect()
      // .top pra achar `p`, subtraindo do clipPath o gap que o ease "devia"
      // deixar contra o rect.top real (`gap - rect.top`). Dentro da janela,
      // rect.top JÁ é (1-p)*vh (é o SCROLL quem move o Features, ninguém
      // escreve nele) — então a conta reduz a topPx = vh·max(0, p - eased).
      // O ease pageTransition cruza a diagonal p=eased em p≈0.44; depois
      // disso eased > p, a subtração fica negativa, o `max(0,...)` engole
      // tudo e o clipPath morre em inset(0) pro resto da janela. Medido em
      // 1600×900: pico de 109px em p≈0.29, zero a partir de p≈0.5 — metade
      // da cortina nunca existia, e o que devia ser máscara virava scroll cru
      // sem ease nenhum bem na hora em que o Features de fato aparecia.
      //
      // O FIX que resolveu isso, e que SEGUE valendo: #features não pode se
      // mover pelo scroll comum dentro da janela — ele fica CRAVADO no topo
      // da viewport (y = -naturalTop, cancelando exatamente o deslocamento
      // que o scroll aplicaria). Isso exige medir o topo NÃO-TRANSFORMADO do
      // Features (`naturalTop`) sem cair no loop de feedback: assim que
      // aplicamos y nele, getBoundingClientRect().top passa a incluir esse y,
      // e o próximo frame leria o que acabamos de escrever. Saída:
      // `root.current` (a própria section #a-roberta) NUNCA é transformada —
      // só `pin.current` (fixed durante o pin) e `recede.current` (o wrapper
      // de recuo) recebem transform, e nenhum dos dois é ancestral do
      // Features (transform de filho não muda o layout/rect do pai).
      // #features é o próximo irmão no documento logo depois de #a-roberta,
      // sem margin entre os dois — então `root.current.getBoundingClientRect()
      // .bottom` é exatamente o topo natural do Features, imune ao transform
      // que este mesmo ticker escreve nele. Isso é o que faz o Features ficar
      // parado (conteúdo não desliza) — no demo o `next` é `position:fixed`,
      // imóvel; aqui é o mesmo resultado por outro mecanismo, e é fiel.
      //
      // SEGUNDA RODADA — a faixa creme: colei o clipPath direto no
      // `naturalTop` (régua linear, sem ease) pra fazer a máscara coincidir
      // com o rodapé real da foto. Resolvia a faixa, mas quebrava o efeito:
      // no demo o `next` SOBREPÕE o `current` (a cortina abre por conta
      // própria, no seu próprio ease, e o current recua ATRÁS dela) — colar
      // a máscara no rodapé faz o Features só PREENCHER o vazio que a
      // ARoberta desocupa, nunca sobrepor. Grudar a régua e ter sobreposição
      // são incompatíveis; a Laura viu a diferença e chamou certo. REVERTIDA
      // nesta rodada.
      //
      // TERCEIRA RODADA — troquei o recuo por parallax+fade (sem scale) pra
      // resolver um efeito colateral de uma tentativa de sincronizar
      // fundo/opacidade que criava névoa (foto semitransparente sobre cinza
      // médio). Também REVERTIDA: sem a régua colada, o parallax/fade não
      // tinham mais função — eram remendo de um mecanismo que já não existe.
      //
      // QUARTA RODADA — de volta à mecânica FIEL do demo (clip dirigido pela
      // ease, recuo com scale+y+opacity do original), porque é ISSO que
      // produz a sobreposição que o demo tem e a Laura queria. O vão creme é
      // INERENTE ao efeito — existe no demo também (o gap entre o rodapé do
      // current recuado e a borda da cortina, que abre no próprio ease, sem
      // relação geométrica com onde o current parou). No demo ele não
      // aparece porque o `body` por trás é ESCURO. A solução nunca foi
      // geometria (colar a régua) — é COR: escurecer o fundo da ARoberta pra
      // a cor exata do Features (#0A0C11) cedo o bastante pra o vão nascer
      // já preto, indistinguível do que está por cima dele. Ver o bloco do
      // `bgEase` abaixo. O recuo (`gsap.set(recede.current, ...)`), o
      // `bgEase`/`BG_DONE_AT` e este parágrafo inteiro CONTINUAM valendo —
      // nada disso mudou na rodada seguinte.
      //
      // QUINTA RODADA — SUPERSEDED apenas a parte do CLIP: a Laura viu na
      // tela e reprovou a ORDEM de entrada do Features (bentos antes do
      // título), não o recuo nem o vão creme descritos acima. O clipPath
      // dirigido pela ease (citado neste parágrafo) SAIU; o Features agora
      // sobe como bloco. Ver o `gsap.set(featuresEl, ...)` final desta
      // função pro mecanismo atual e a explicação completa — este parágrafo
      // fica como registro de por que a MÁSCARA existiu, não como descrição
      // do que roda hoje.
      const featuresEl = document.querySelector<HTMLElement>("#features");
      const pageTransitionEase = gsap.parseEase("pageTransition");

      // Cor de repouso da section (classe Tailwind bg-neutro-50) e a cor
      // exata do Features (classe bg-[#0A0C11]) — o escurecimento do fundo
      // (ver abaixo) anima entre as duas cores REAIS do design, não entre
      // branco e preto genéricos.
      const BG_REST = "#FAF9F5";
      const BG_FEATURES = "#0A0C11";

      // Escurecimento do fundo: FRONT-LOADED e AGRESSIVO — termina em
      // p=BG_DONE_AT=0.15, bem antes da cortina ter aberto quase nada (a
      // `pageTransition` é achatada no começo: em p=0.15 o vão ainda mede
      // só algumas dezenas de px) e com o `recede` ainda ~0.97 de opacidade
      // (a foto, full-bleed na caixa, ainda cobre o fundo inteiro — dá pra
      // escurecer atrás dela sem ninguém ver o gradiente acontecer).
      // power2.out (arranca rápido, desacelera) concentra o escurecimento
      // logo nos primeiros pixels dessa janela curta.
      const BG_DONE_AT = 0.15;
      const bgEase = gsap.parseEase("power2.out");

      // Último `p` efetivamente aplicado (não o lido no frame atual). O
      // ticker roda em TODA sessão desktop, o tempo todo — não só na janela
      // da transição — porque não há como saber de antemão quando o
      // Features vai entrar na tela sem medir. Isso significa que, nos
      // ~99% do scroll em que a seção está parada nas bordas (p em 0 antes
      // de chegar, em 1 depois de passar), o rect ainda precisa ser lido
      // (leitura é barata, e é a mesma que decide se saímos da borda), mas
      // as ESCRITAS (gsap.set em `recede` e `featuresEl`) não podem repetir
      // — cada `gsap.set` de clipPath/transform invalida layout, e o
      // getBoundingClientRect do PRÓXIMO frame força o recalc: thrash por
      // frame, numa página que já reparte orçamento com o WebGL do
      // ScrollPhone. Medido antes/depois no relatório desta sessão.
      let lastP: number | null = null;

      const applyTransition = () => {
        if (!featuresEl || !root.current) return;
        const vh = window.innerHeight;
        // naturalTop = topo NÃO-TRANSFORMADO do Features (ver bloco acima —
        // não dá pra ler featuresEl.getBoundingClientRect().top direto,
        // porque o y que escrevemos nele mais abaixo contaminaria a própria
        // leitura no frame seguinte). root.current (#a-roberta) nunca leva
        // transform e é o irmão anterior imediato do Features, sem margin
        // entre os dois — seu `.bottom` É o topo natural do Features.
        // QUINTA RODADA: não crava mais o Features no topo (y=-naturalTop
        // fixo) — `naturalTop` agora só entra como o termo que cancela o
        // deslize do scroll dentro de `y = (1-eased)*vh - naturalTop` (ver o
        // gsap.set(featuresEl, ...) no fim da função), deixando `(1-eased)*vh`
        // livre pra ser a POSIÇÃO de fato do topo do bloco, não um deslize
        // residual.
        const naturalTop = root.current.getBoundingClientRect().bottom;
        // p linear: 0 enquanto o Features não tocou a base da tela
        // (naturalTop ≥ vh), 1 quando o topo dele chegaria ao topo da tela
        // (naturalTop ≤ 0). O clamp segura os dois lados fora dessa janela —
        // fora dela recuo e cortina ficam parados, sem custo extra.
        const p = 1 - Math.min(1, Math.max(0, naturalTop / vh));

        // Early-out ANTES de qualquer gsap.set: se `p` não mudou desde o
        // último frame aplicado (epsilon, não igualdade estrita — evita
        // reabrir por ruído de sub-pixel), não há nada novo pra desenhar.
        // Cobre os dois platôs de uma vez: p parado em 0 (Features ainda
        // longe, abaixo) e p parado em 1 (chegou = aberto, já passou) —
        // nos dois, os `gsap.set` abaixo NUNCA rodam fora da borda de
        // entrada/saída, só na janela em que `p` de fato está variando.
        if (lastP !== null && Math.abs(p - lastP) < 0.0005) return;
        lastP = p;

        // Fora da janela — ainda não chegou (naturalTop ≥ vh) OU já passou
        // (naturalTop ≤ 0): repouso explícito nas TRÊS camadas que este
        // ticker escreve (Features, recuo, fundo da section). #features solto
        // de volta ao scroll comum (y:0, clip "none" — não `inset(0 0 0 0)`,
        // que é visualmente idêntico mas deixa estilo gravado à toa num
        // elemento que não é nosso), recuo de volta ao estado de repouso do
        // demo (y:0, scale:1, opacity:1 — some junto com o resto do JSX
        // pinned quando o mode trocar, mas parado aqui evita um frame de
        // recuo residual se o usuário rolar rápido pra fora da janela e
        // voltar), e o fundo — section E body, ver bloco abaixo do porquê os
        // dois — volta pro bg-neutro-50 via clearProps (remove o inline,
        // deixa a classe Tailwind reassumir). Escrito uma única vez ao tocar
        // cada borda, nunca por frame: o early-out acima garante isso.
        if (naturalTop >= vh || naturalTop <= 0) {
          // Publica o repouso da borda pro Features (ver lib/robertaTransition
          // .ts). Aqui `p` já é exatamente 0 ou 1 (o clamp acima garante), e
          // nos dois extremos a ease é identidade — pageTransition(0)=0,
          // pageTransition(1)=1 —, então `eased: p` não é aproximação, é o
          // valor certo, sem pagar uma chamada de ease. Precisa vir ANTES do
          // return: é o que trava a timeline do Features fechada (progress 0)
          // antes da janela e aberta (progress 1) depois dela — sem isso o
          // Features ficaria congelado no último progresso da janela.
          setTransitionProgress({ p, eased: p });
          gsap.set(featuresEl, { y: 0, clipPath: "none", clearProps: "zIndex" });
          if (recede.current) gsap.set(recede.current, { y: 0, scale: 1, opacity: 1 });
          gsap.set([root.current, document.body], { clearProps: "backgroundColor" });
          return;
        }

        const eased = pageTransitionEase(p);

        // Publica o progresso da janela pro Features (ver lib/robertaTransition
        // .ts). Este ticker é a ÚNICA fonte de verdade sobre onde a cortina
        // está: `eased` é literalmente o que posiciona a borda logo abaixo
        // (screen-y = (1 - eased) * vh), então é ele — não `p` — que o
        // Features usa como progress da própria timeline de entrada. Assim as
        // duas coisas não podem dessincronizar: é o mesmo número.
        //
        // Só publica (uma atribuição), não notifica ninguém: o Features lê no
        // ticker dele. Publicar depois do `eased` e antes das escritas de DOM
        // é de propósito — o consumidor roda no mesmo tick, e o valor precisa
        // já estar lá quando ele ler.
        setTransitionProgress({ p, eased });

        // Recuo — FIEL ao defaultTransition do demo: y -30vh·eased, scale
        // 1→0.8, opacity 1→0.4 (NUNCA chega a 0 — no demo o current fica
        // visível, recuado, atrás da cortina; ver bloco do fundo abaixo pro
        // porquê isso não reabre a faixa creme). No wrapper `recede`, NUNCA
        // em pin.current (é nele que o próprio GSAP escreve o transform do
        // pin; ver o useRef de `recede`).
        //
        // y tem DOIS termos, não um. No demo, o clique NÃO rola a página —
        // o -30vh·eased é o único movimento do `current`. Aqui, uma vez
        // despinada, a ARoberta é conteúdo normal e o scroll já a desloca
        // sozinho em -p·vh (p = mesma progressão da janela, ver acima); esse
        // termo NÃO existe no demo, é artefato do port, não fidelidade a
        // ele. Sem compensar, esse deslize sempre vence o contra-movimento
        // do demo (que tem teto de -0.4vh com o scale) e a caixa nunca fica
        // parada — daí a máscara nunca alcançava o rodapé dela (medido:
        // p≈0.5 tinha inset em 421.6 contra rodapé em 259.1, 162px invertido).
        // `p*vh` cancela exatamente esse -p·vh do scroll (crava o topo da
        // caixa em screen-y=0, como no demo parado); `-0.3*vh*eased` é o
        // -30vh literal do demo, agora medido a partir desse repouso em vez
        // de somado a um deslize. Em px, não em string `vh`: `vh` aqui já é
        // window.innerHeight (número), e a soma dos dois termos só faz
        // sentido feita nessa unidade comum.
        if (recede.current) {
          gsap.set(recede.current, {
            y: p * vh - 0.3 * vh * eased,
            scale: 1 - 0.2 * eased,
            opacity: 1 - 0.6 * eased,
            force3D: true,
          });
        }

        // Fundo escurece pro preto do Features — FRONT-LOADED e já concluído
        // bem antes do recuo/cortina terem ido a algum lugar (ver bloco do
        // BG_DONE_AT acima). `p / BG_DONE_AT` reescala a janela real (0→1)
        // pra a janela CURTA em que o escurecimento acontece; clampado em 1
        // pra travar em BG_FEATURES pro resto do caminho (não desanda depois
        // de completo).
        //
        // DOIS alvos, não um: `root.current` (#a-roberta) E `document.body`.
        // Medido no browser (ver relatório) — escurecer só a section não
        // basta. O vão não fica contido dentro da caixa da ARoberta: com o
        // clip voltando a ser dirigido pela ease (não mais colado no
        // naturalTop), a borda da cortina pode abrir bem ALÉM do rodapé
        // real de #a-roberta (`naturalTop` é literalmente esse rodapé) —
        // nesse trecho extra, a tela já está FORA da caixa da ARoberta, e o
        // clip-path do Features ainda não chegou lá (ele só pinta a partir
        // da própria borda que está abrindo). O que aparece nesse
        // interstício não é o fundo da ARoberta — é o que estiver
        // estruturalmente atrás de TUDO ali, e neste site isso pode ser um
        // painel translúcido do rodapé (deslocado pra cima por margin
        // negativa, ver o commit "Devolve o rodapé à noite") que deixa
        // passar o `bg-neutro-50` do `<body>` por trás dele — o creme que a
        // Laura via não vinha da ARoberta, vinha do HTML por trás de tudo.
        // Escurecer o `body` fecha essa última costura: agora não existe
        // NENHUMA camada clara possível atrás do efeito inteiro, custe o que
        // custar de DOM estar exposto no vão. `gsap.set` com array de alvos
        // aplica a mesma cor aos dois num só write. Inline ganha das classes
        // (bg-neutro-50 em ambos); o cleanup (e o repouso de borda acima)
        // desfazem com clearProps nos dois, senão section E body ficam
        // pretos pra sempre depois de sair da janela.
        const easedBg = bgEase(Math.min(1, p / BG_DONE_AT));
        gsap.set([root.current, document.body], {
          backgroundColor: gsap.utils.interpolate(BG_REST, BG_FEATURES, easedBg),
        });

        // QUINTA RODADA — a Laura viu na tela e reprovou a ORDEM de entrada
        // do Features (bentos aparecendo antes do título), não o timing do
        // scrub. Causa: a cortina anterior (clipPath dirigido por `eased`,
        // topo cravado em y=-naturalTop) revela a section de BAIXO PRA CIMA
        // — pra QUALQUER deslocamento uniforme do conteúdo, a peça com
        // offsetTop MENOR (o h2, no topo) é sempre revelada por ÚLTIMO. Não
        // era ajustável tunando LEAD/DUR (ver Features.tsx) — é a mecânica
        // da MÁSCARA que fixa a ordem. A Laura escolheu, entre três opções: o
        // Features sobe como BLOCO, sem clip, liderado pela própria borda de
        // CIMA — o h2 (que já é o topo do bloco) entra primeiro por
        // construção, não por sorte de geometria.
        //
        // clipPath SAIU. Não há mais máscara na section — ela é opaca
        // (bg-[#0A0C11]) e se oclui sozinha; ver o zIndex abaixo pro porquê
        // isso basta.
        //
        // y trocou de `-naturalTop` pra `(1-eased)*vh - naturalTop`. Efeito:
        // o topo do #features (que ANTES ficava cravado em screen-y=0 o
        // tempo todo) agora VIAJA — screen-y = (1-eased)*vh, de `vh` (fora da
        // tela, embaixo) até `0` (encostado no topo), na mesma ease
        // `pageTransition` de sempre. É o bloco inteiro subindo, não uma
        // cortina abrindo sobre ele parado.
        //
        // SEM SALTO NAS BORDAS (medido, não só deduzido): em p=0,
        // naturalTop=vh e eased=0 → y=(1-0)*vh-vh=0 — igual ao y:0 do
        // repouso ANTES da janela (bloco acima). Em p=1, naturalTop=0 e
        // eased=1 → y=(1-1)*vh-0=0 — igual ao y:0 do repouso DEPOIS. As duas
        // bordas empalmam exatamente com o platô de repouso; não é
        // coincidência, é o que faz `naturalTop` e `(1-eased)*vh` cancelarem
        // um ao outro nos dois extremos da janela (onde `eased` e `p`
        // colapsam pro mesmo valor, 0 ou 1).
        //
        // SOBREPOSIÇÃO preservada: a `pageTransition` cruza a diagonal
        // eased=p em p≈0.44 e vai à FRENTE dela depois (eased > p) — dali em
        // diante `y` fica NEGATIVO (a section é puxada ACIMA da própria
        // posição natural), exatamente o que faz o Features cobrir a
        // ARoberta que recua atrás, preservando o efeito de sobreposição que
        // a cortina antiga dava por outro caminho.
        //
        // zIndex:10 FICA — é ele que garante que o Features (opaco) pinta
        // por cima da ARoberta enquanto sobrepõe, já que não há mais clip
        // recortando a fatia visível: agora é a section INTEIRA subindo, e
        // sem zIndex a ordem de pintura voltaria a seguir a ordem do
        // documento (que já favorece o Features, mas via z-index é
        // explícito e não depende de nenhum outro z-index não mexer).
        gsap.set(featuresEl, {
          y: (1 - eased) * vh - naturalTop,
          zIndex: 10,
          force3D: true,
        });
      };
      applyTransition();
      gsap.ticker.add(applyTransition);

      return () => {
        marquee.kill();
        gsap.ticker.remove(applyTransition);
        // Sequência: para os workers (o abort mata os fetch em voo), tira o ticker
        // e devolve a memória dos bitmaps — 73 frames 1920px decodificados são
        // ~150MB de raster que o GC não recolhe sozinho enquanto o array viver.
        seqDisposed = true;
        aborter.abort();
        gsap.ticker.remove(tickSeq);
        bitmaps.forEach((b) => b?.close());
        // A cortina deixou de existir — o Features precisa saber, senão fica
        // preso lendo o último progresso publicado (um valor que ninguém mais
        // atualiza) e nunca cai no fallback. Mesma razão do clearProps abaixo:
        // o que este ticker deixou escrito fora do próprio componente é
        // responsabilidade dele desfazer. Ver lib/robertaTransition.ts.
        setTransitionProgress(null);
        // O Features é de OUTRO componente, a section #a-roberta (root) e o
        // <body> vivem montados o tempo todo — ao contrário de `recede` (que
        // some com o resto do JSX pinned quando o mode trocar), os estilos
        // que gravamos neles (y/clipPath/zIndex no Features, backgroundColor
        // no root E no body) SOBREVIVERIAM ao revert do contexto se não
        // forem desfeitos explicitamente aqui (gsap.context só reverte o que
        // foi criado de forma síncrona dentro do callback; nada que o ticker
        // escreveu depois). Sem isso, trocar pra mobile/stacked no meio da
        // transição deixaria o Features preso e/ou a página INTEIRA (não só
        // a ARoberta) com fundo preto pra sempre.
        if (featuresEl) {
          gsap.set(featuresEl, { y: 0, clipPath: "none", clearProps: "zIndex" });
        }
        if (recede.current) {
          gsap.set(recede.current, { y: 0, scale: 1, opacity: 1 });
        }
        if (root.current) {
          gsap.set([root.current, document.body], { clearProps: "backgroundColor" });
        }
      };
    },
    { scope: root, dependencies: [mode] },
  );

  return (
    <section
      ref={root}
      id="a-roberta"
      className="relative bg-neutro-50"
      // overflow-x: clip corta qualquer sangramento lateral sem criar scroll
      // horizontal (não há overflow-x global no body). Nunca overflow-hidden nos
      // dois eixos aqui: o pin do GSAP precisa do eixo Y livre.
      //
      // SEM z-index nesta section, de propósito: a transição pra Features (ver a
      // cortina/recuo no useGSAP acima) exige que o Features suba POR CIMA da
      // ARoberta enquanto ela recua. Sem z-index a ordem de pintura segue a ordem
      // do documento — Features vem depois no DOM, então pinta em cima — que é
      // exatamente o que a cortina precisa.
      style={{ overflowX: "clip", overflowY: "visible" }}
    >
      {mode === "pinned" ? (
        <div
          ref={pin}
          className="relative h-screen"
          style={{ overflowX: "clip", overflowY: "visible" }}
        >
        {/* Wrapper do recuo — ver a nota no useRef de `recede`. Tudo que
            antes vivia direto dentro de `pin` mudou de pai pra cá; nenhum
            filho mudou de posição visual (mesmo tamanho, sem offset), então
            a única diferença é ter um alvo seguro pro tween de recuo. */}
        <div ref={recede} className="relative h-full w-full will-change-transform">
          <Afluente veil={false} />

          {/* Canvas da sequência — beat 0 do scrub (ver drawSeq/tickSeq no useGSAP).
              Fica ACIMA do BACKDROP estático (z-[1] > z-0 do Afluente): os dois têm
              o MESMO frame 0 (o BACKDROP É a foto do frame de abertura), então até o
              primeiro bitmap decodificar o canvas fica transparente e não há salto
              visível — só uma troca de camada idêntica pixel a pixel. O backing
              (width/height) é escrito por resizeCanvas; o CSS só estica. Quem
              desenha é só o scroll via damp — nunca um clock próprio (Armadilha 5).
              Existe só no ramo pinned deste JSX; o fallback stacked/mobile nunca
              monta o elemento nem baixa um frame (Armadilha 4). */}
          <canvas
            ref={seqCanvas}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
          />

          {/* Anel de íris — z-[10]: acima do canvas da sequência (z-[1]), abaixo do
              retrato (z-20). O backing é pintado UMA vez por buildIrisSprite (o
              limbus real do frame 73, alpha elíptico); posição/escala/rotação são
              escritas por applyDive a cada frame. A parte interna fica coberta pelo
              retrato mascarado — só a banda do aro aparece, cavalgando o portal. */}
          <canvas
            ref={irisRing}
            aria-hidden
            className="pointer-events-none absolute z-[10] opacity-0"
            style={{ left: 0, top: 0 }}
          />

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

          {/* Headline de abertura — frame Figma 251-83 (694×387): bloco ancorado em
              left 38.9% / bottom 8.6% (270/694, (254+99.8)/387), duas linhas
              explícitas (não wrap por largura — as métricas do Sentient não são as
              do Poppins do canvas do Figma, wrap por `width` quebraria errado).
              bottom-anchored, não top: mais robusto pra uma headline que mora no
              rodapé do frame, imune a diferença de line-height entre fontes.

              text-shadow RECALIBRADO contra o glow magenta real (medido no render,
              texto escondido, p95 do fundo sob a caixa da headline no frame 0): a
              sombra difusa antiga (24px/50%) sozinha dava só 2.91:1 (branco sobre o
              p95 do glow) — abaixo do 3:1 AA de texto grande, e caía pra ~2:1 no pixel
              mais claro do hotspot. O glow NÃO sustenta o branco sozinho. Trocado por
              um halo escuro apertado (0/1px/4px a 0.85–0.9 de opacidade — funciona como
              contorno, não como sombra) + o glow difuso original por baixo pra
              profundidade. WCAG não modela text-shadow, então o número de 2.91:1 não
              muda com esse halo — o que muda é a leitura real: o halo cria uma borda
              quase sólida em volta do glifo, que é o que de fato resolve legibilidade
              sobre fundo fotográfico imprevisível (mesma técnica de label de mapa). */}
          <div
            ref={headline}
            className="absolute z-30 whitespace-nowrap text-left"
            style={{ left: "38.9%", bottom: "8.6%" }}
          >
            <span
              data-word-inner
              className="block font-title text-[clamp(2.5rem,7.65vw,9rem)] font-medium leading-[0.94] tracking-[-0.01em] text-neutro-0 [text-shadow:0_0_1px_rgba(0,0,0,0.9),0_0_4px_rgba(0,0,0,0.85),0_0_14px_rgba(0,0,0,0.7),0_2px_24px_rgba(20,4,30,0.5)]"
            >
              QUEM ESTÁ
            </span>
            <span
              data-word-inner
              className="block font-title text-[clamp(2.5rem,7.65vw,9rem)] font-medium leading-[0.94] tracking-[-0.01em] text-neutro-0 [text-shadow:0_0_1px_rgba(0,0,0,0.9),0_0_4px_rgba(0,0,0,0.85),0_0_14px_rgba(0,0,0,0.7),0_2px_24px_rgba(20,4,30,0.5)]"
            >
              POR TRÁS?
            </span>
          </div>

          {/* retrato — full-bleed desde o nascimento; emerge do preto no beat 2 da
              timeline (só autoAlpha anima, a geometria é estática) */}
          <div ref={portrait} className="absolute z-20 overflow-hidden">
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

          {/* Cards de prova — canto inferior-esquerdo, sobre a foto full-bleed.
              Nasce no beat final (foto já cheia). Wrapper z-[28]: acima do scrim (z-27)
              e do recorte (z-26), abaixo do editorial (z-30, que fica na direita). */}
          <div ref={proof} aria-hidden className="pointer-events-none absolute inset-0 z-[28]">
            {/* cards em glass nas coordenadas EXATAS do Figma (node 195-530, frame
                885×516). Rectangle 1 = 68,230 / 214×122 → %; Rectangle 2 = 218,294 /
                231×188 → %. Mapeados como fração do full-bleed (100vw × 100vh). */}
            {/* card 1 — Credencial (Rectangle 1). min-h pra nunca cortar o conteúdo. */}
            <CredentialCard className="absolute left-[5%] top-[42%] z-[29] min-h-[24%] w-[21%]" />
            {/* card 2 — Alcance. Paisagem, ancorado abaixo do card 1: coordenadas do
                enquadramento marcado (13% / 72%, 30.5% × 19.5% do full-bleed). */}
            <ImpactCard className="absolute left-[13%] top-[72%] z-[29] h-[19.5%] w-[30.5%]" />
          </div>

          {/* editorial — ancorado na base, sobre o scrim escuro (texto claro) */}
          <div
            ref={editorial}
            className="absolute inset-x-0 bottom-0 z-30 pb-10 md:pb-14"
          >
            <Editorial onDark />
          </div>
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

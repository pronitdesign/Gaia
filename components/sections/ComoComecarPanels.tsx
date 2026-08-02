"use client";

import type { CSSProperties, ReactNode } from "react";

/* Stagger dirigido pelo scroll: cada item entra conforme `--reveal` (0..1) sobe
   — o ComoComecar seta essa var por painel no scroll. `var(--reveal, 1)` garante
   que no stacked/reduced (sem a var) tudo nasce revelado e parado.
   `start` escalona o k-ésimo item; `spread` é a janela em que ele completa. */
function reveal(
  k: number,
  count: number,
  opts: { axis?: "y" | "x" | "scaleY"; dist?: number; spread?: number } = {},
): CSSProperties {
  const { axis = "y", dist = 8, spread = 0.2 } = opts;
  const start = count > 1 ? (k / count) * (1 - spread) : 0;
  const p = `clamp(0, calc((var(--reveal, 1) - ${start.toFixed(3)}) / ${spread}), 1)`;
  const move =
    axis === "x"
      ? `translateX(calc((1 - ${p}) * ${dist}px))`
      : axis === "scaleY"
        ? `scaleY(calc(0.12 + ${p} * 0.88))`
        : `translateY(calc((1 - ${p}) * ${dist}px))`;
  return { opacity: p as unknown as number, transform: move };
}

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

type StepInfo = { n: string; tab: string; index: number; total: number };
type PanelProps = { active: boolean; reduced: boolean; step?: StepInfo };

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
  reduced = false,
  step,
}: {
  eyebrow: string;
  headline: string;
  sub: string;
  active: boolean;
  reduced?: boolean;
  step?: StepInfo;
}) {
  return (
    <div
      /* transition-[opacity,transform] (era -all): -all capturava qualquer
         prop que mudasse, inclusive layout responsivo. duration-700 (era 500):
         o Float dos cards entra em 700 — texto e card são o mesmo evento
         (o passo ativou) e terminavam 200ms defasados. */
      /* sem mt-auto (2026-07-20): quem empurra o bloco card+texto pro pé do
         painel agora é o mt-auto do CARD (ver mainPos) — com os dois em auto
         o espaço livre se dividia e o card voltava a flutuar sobre o rosto. */
      className={`relative z-10 order-2 flex w-full flex-col px-7 pt-10 text-left transition-[opacity,transform] duration-700 ease-gaia md:absolute md:bottom-0 md:left-0 md:order-none md:w-[58%] md:px-16 md:pb-36 md:pt-0 lg:px-20 lg:pb-40 ${
        // pinned no mobile: precisa limpar a barra de abas colada embaixo.
        // stacked (reduced): sem abas, o rótulo numerado é o rodapé.
        reduced ? "pb-11" : "pb-32"
      }`}
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(16px)",
      }}
    >
      {/* No mobile full-bleed o passo migra pro rótulo do rodapé (à la editorial):
          o título fica solto no ar e a numeração ancora embaixo. No desktop o
          eyebrow segue acima do título como antes. */}
      {!reduced && (
        <p className="mb-4 font-body text-[13px] font-medium uppercase tracking-[0.14em] text-roxo-200 drop-shadow-[0_1px_12px_rgba(0,0,0,0.5)] md:text-[14px]">
          {eyebrow}
        </p>
      )}
      <h3 className="mb-4 text-balance font-title font-medium leading-[1.02] text-neutro-0 text-[2.4rem] md:text-[3.75rem] drop-shadow-[0_2px_20px_rgba(0,0,0,0.55)]">
        {headline}
      </h3>
      <p className="max-w-[42ch] font-body text-body-l text-neutro-0/90 drop-shadow-[0_1px_14px_rgba(0,0,0,0.5)]">
        {sub}
      </p>
      {reduced && step && (
        <div className="mt-7 flex items-center justify-between border-t border-white/25 pt-4">
          <span className="font-body text-[13px] font-semibold uppercase tracking-[0.12em] text-neutro-0 drop-shadow-[0_1px_10px_rgba(0,0,0,0.6)]">
            {step.n} · {step.tab}
          </span>
          <span className="font-body text-[12px] font-medium tabular-nums text-neutro-0/55 drop-shadow-[0_1px_10px_rgba(0,0,0,0.6)]">
            {step.n} / {String(step.total).padStart(2, "0")}
          </span>
        </div>
      )}
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
  "backdrop-blur-lg lg:backdrop-blur-2xl backdrop-saturate-150 transform-gpu";

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
      {/* especular que segue o cursor: usa o mesmo --px/--py do parallax de mouse
          (setado no track pelo ComoComecar). Fora do pinned a var cai pra 0 e o
          brilho fica centrado e discreto. mix-blend screen → só clareia o vidro. */}
      {sheen && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(240px circle at calc(50% + var(--px, 0) * 55%) calc(40% + var(--py, 0) * 55%), rgba(255,255,255,0.12), transparent 62%)",
            mixBlendMode: "screen",
          }}
        />
      )}
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

/** posição do card principal: no mobile o card desce pra BASE, ancorado na
    lateral OPOSTA ao rosto da foto (cada painel escolhe o lado), logo acima
    do texto — topo-centro tampava o rosto (mock da Pronit, 2026-07-20). O
    mt-auto empurra card+texto pro pé do painel como um bloco só; mb-6 é o
    respiro até o título. Desktop intocado: ancora na FAIXA INFERIOR-direita,
    na mesma linha de visão do título (cluster de HUD). */
const mainPos =
  "relative order-1 mt-auto mb-6 md:absolute md:order-none md:mx-0 md:my-0 md:right-[8%] md:bottom-[20%] lg:right-[9%] lg:bottom-[22%]";

/** Foto lifestyle de fundo — mantida viva; scrim escuro só na base/esquerda
    (onde pousa o texto) garante legibilidade sem apagar a imagem.

    Parallax de galeria (técnica Codrops horizontal-parallax-gallery): a imagem
    é mais larga que o frame (overflow hidden no banner) e contra-desliza no eixo
    X conforme o banner cruza o centro — o ComoComecar seta `--parallax` por frame
    no scroll. Sem var (mobile/reduced) fica centrada e só preenche.

    Sem `loading="lazy"`: no modo pinned o ComoComecar monta os três painéis
    JUNTOS (RENDER.map) dentro da mesma track — passo 2 e 3 já existem no DOM
    desde o load, só deslocados por transform. Scroll é contínuo (onUpdate a
    cada frame, sem "once"), então lazy arriscaria a foto ainda não decodificada
    quando o passo entra em quadro — pop-in no meio do scrub. Os três ficam
    eager; o ganho de peso já vem do WebP (24 MB → 0,8 MB).

    Phone (max-md): a foto vira card-image — w-full com aspect 4/5 em vez de
    esticar 100svh (janela 0.46 ampliava demais e decapitava o rosto; 4/5
    amplia menos → corta menos) e a base dissolve em máscara pro fundo do
    painel. O parallax horizontal morre junto: sem os 150% de sobra não há o
    que deslizar, então o transform é md+ (via classe — inline não tem
    breakpoint). Fotos são paisagem 2752×1536: no cover 4/5 só existe folga no
    X, o Y do object-position é inerte — o focal X por painel continua sendo
    quem segura o rosto no quadro. */
function PhotoBg({ src, focus = "object-center" }: { src: string; focus?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* base escura do phone: é ELA que a máscara da foto revela. Sem essa
          camada o fade dissolvia pro pastel do painel e a metade de baixo
          nascia clara (veto da Pronit, 2026-07-21 — mask escura no bottom).
          roxo-900 e não preto: a transição não passa por breu. */}
      <div className="absolute inset-0 bg-roxo-900 md:hidden" />
      <img
        loading="lazy"
        data-parallax
        // Candidatos pelo optimizer do Next (AVIF q75) a partir do ARQUIVO
        // ORIGINAL — substitui a convenção `-1200`/`-2048` de arquivo em disco:
        // o passo3 cheio (540KB, sub-comprimido) fecha em ~48KB na w=1920
        // medidos em produção, e os três painéis herdam a mesma regra por
        // construção, como antes. Grade w=1280/1920/2560 porque são as larguras
        // da allowlist do next.config que cercam os alvos reais (celular DPR
        // 2.625 pede ~1081; desktop 150vw a DPR 1 pede ~2025; retina fica no
        // teto de 2560). q75 conferido no texto dos mocks (cuidado (c) da
        // auditoria: screenshot com texto reprova abaixo de q70).
        src={`/_next/image?url=${encodeURIComponent(src)}&w=1280&q=75`}
        srcSet={[1280, 1920, 2560]
          .map((w) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75 ${w}w`)
          .join(", ")}
        sizes="(min-width: 768px) 150vw, 100vw"
        alt=""
        // decoding="async": tira o decode do WebP do caminho síncrono de render —
        // o navegador decodifica fora da main thread e composita quando pronto,
        // sem travar o primeiro paint no passo 1 (above-the-fold).
        decoding="async"
        // `focus` = object-position POR PAINEL no phone (com md: voltando ao
        // center): no recorte estreito o centro da foto corta o rosto — cada
        // painel aponta o ponto focal pro rosto cair dentro do quadro.
        className={`absolute top-0 object-cover max-md:left-0 max-md:aspect-[4/5] max-md:w-full max-md:[-webkit-mask-image:linear-gradient(to_bottom,#000_78%,transparent_100%)] max-md:[mask-image:linear-gradient(to_bottom,#000_78%,transparent_100%)] md:left-1/2 md:h-full md:w-[150%] md:max-w-none md:will-change-transform md:[transform:translate3d(calc(-50%_+_var(--parallax,0%)),0,0)] ${focus}`}
      />
      {/* base escura pro texto (mobile + desktop). O phone não precisa de
          reforço próprio: o underlay roxo-900 acima já segura o contraste
          (branco sobre roxo-900 puro = 16:1). */}
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
      /* hidden md:block — no phone os 420px cobrem a tela quase inteira e o
         branco a 40% lava o rosto da foto (veto da Pronit, 2026-07-20). */
      className="pointer-events-none absolute right-[6%] top-1/2 hidden h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-neutro-0/40 blur-3xl md:block"
    />
  );
}

/* Waveform estática (determinística — sem Math.random no render) */
const WAVE = [
  7, 12, 20, 30, 22, 14, 26, 34, 24, 16, 10, 18, 28, 36, 26, 18, 12, 22, 32, 24,
  15, 9, 14, 24, 30, 20, 12,
];
/** Altura mínima (px) pra uma barra da waveform PULSAR — ver o bloco no JSX.
 *  26 deixa 8 das 27 animando; baixar isso devolve custo de main thread na
 *  proporção direta do número de barras que passam a animar. */
const EQ_LIVE_MIN = 26;

/* ── Passo 01 · Grave ────────────────────────────────────────── */
export function Panel1({ active, reduced, step }: PanelProps) {
  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden bg-afluente ${reduced ? "min-h-[100svh]" : "min-h-[78vh]"}`}>
      {/* foto lifestyle — nutricionista em consulta.
          .webp (era .png, 8,04 MB → 0,16 MB): PSNR 42,0 dB, delta médio 1,54/255,
          alpha idêntico — validado no pixel, zero mudança visual. */}
      {/* focal phone: o rosto dela vive a ~52% do arquivo — 38% desloca o
          recorte pra ele assentar à direita do centro, longe do card (que
          ancora à esquerda). */}
      <PhotoBg src="/passo1-migracao.webp" focus="object-[38%_15%] md:object-center" />
      <Glow />
      <Overlay
        active={active}
        reduced={reduced}
        step={step}
        eyebrow="Passo 01 · Grave"
        headline="Aperte para gravar."
        sub="A consulta é transcrita ao vivo, em português, com termos clínicos."
      />

      <Float
        active={active}
        depth={16}
        delay={120}
        className={`${mainPos} ml-5 mr-auto w-[232px] md:w-[340px]`}
      >
        <div className="relative">
          <GlassCard aria dim active={active} delay={120} className="absolute -right-5 -top-6 h-full w-full" />
          {/* p-4 no phone (md volta a p-6): o card de 232px com padding de
              desktop virava torre — conteúdo também enxuga via max-md abaixo
              (pedido da Pronit, 2026-07-21: cards menores e adaptáveis). */}
          <GlassCard active={active} delay={120} sheen className="p-4 md:p-6">
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
            {/* waveform ao vivo — os PICOS pulsam como áudio entrando.
                Pulsavam as 27, e era o item mais caro da página inteira: medido
                no trace (celular emulado, CPU 4×, uma travessia do pin),
                desligar só esta waveform tirava ~760ms de main thread de uma
                passada de ~4400ms — e ela só anima enquanto o painel 1 está em
                quadro, ou seja, esse custo inteiro cai no primeiro quarto da
                seção, que é exatamente onde a trava aparecia. Não é o número de
                barras que custa (elas continuam 27, o desenho é o mesmo): é
                quantas TRANSFORMS o compositor recalcula por frame.
                O corte é por altura e não por índice (`i % 3` viraria pente
                regular): as barras altas são as que a voz levantou, então são
                elas que respiram — as baixas ficam paradas, como forma de onda
                já gravada. Oito de 27 animando, mesma leitura de "ao vivo". */}
            <div className="mb-4 flex h-10 items-center gap-[3px]">
              {WAVE.map((h, i) => (
                <span
                  key={i}
                  style={{
                    height: h,
                    animationDelay: `${(i % 9) * 90}ms`,
                    animationDuration: `${1 + (i % 5) * 0.14}s`,
                    // só opacity: o scaleY já é da animação gaia-eq (pulso ao vivo).
                    // Barras acendem da esquerda pra direita conforme o scroll entra.
                    opacity: `clamp(0, calc((var(--reveal, 1) - ${((i / WAVE.length) * 0.55).toFixed(3)}) / 0.4), 1)` as unknown as number,
                  }}
                  className={`w-[3px] shrink-0 rounded-full bg-white/40 ${h >= EQ_LIVE_MIN ? "gaia-eq-bar" : ""}`}
                />
              ))}
            </div>
            {/* transcrição ao vivo — as barras-esqueleto são recheio: no phone
                saem e sobra waveform + fala, o coração do card. */}
            <div className="space-y-2">
              <div style={reveal(3, 6, { dist: 6 })} className="h-2 w-full rounded-full bg-white/15 max-md:hidden" />
              <div style={reveal(4, 6, { dist: 6 })} className="h-2 w-4/5 rounded-full bg-white/15 max-md:hidden" />
              <p style={reveal(5, 6, { dist: 6 })} className="font-body text-[11px] leading-snug text-white/70">
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
/* 3º campo = aparece no phone. O corte mantém a narrativa do título:
   dois cobertos + um faltando — só marcados perdia o "o que falta". */
const TOPICS: Array<[string, boolean, boolean]> = [
  ["Queixa principal", true, true],
  ["História da queixa", true, false],
  ["Sono e rotina", true, true],
  ["Alimentação", false, true],
  ["Medicações em uso", false, false],
];

export function Panel2({ active, reduced, step }: PanelProps) {
  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden bg-lavanda ${reduced ? "min-h-[100svh]" : "min-h-[78vh]"}`}>
      {/* foto lifestyle — nutricionista conduzindo a consulta.
          .webp (era .png, 6,73 MB → 0,12 MB): PSNR 42,9 dB, delta médio 1,37/255,
          alpha idêntico — validado no pixel, zero mudança visual. */}
      {/* focal phone: ela vive a ~32% do arquivo, o recorte central deixava o
          rosto MEIO PRA FORA da borda esquerda — 28% traz ela pro quadro; o
          card espelha pro lado direito (único painel com rosto à esquerda). */}
      <PhotoBg src="/passo2-envio.webp" focus="object-[28%_15%] md:object-center" />
      <Glow />
      <Overlay
        active={active}
        reduced={reduced}
        step={step}
        eyebrow="Passo 02 · Acompanhe"
        headline="O que você cobriu, o que falta."
        sub="Um checklist clínico marca os 14 tópicos da anamnese ao vivo, enquanto você conversa."
      />

      <Float
        active={active}
        depth={16}
        delay={120}
        className={`${mainPos} ml-auto mr-5 w-[232px] md:w-[344px]`}
      >
        <div className="relative">
          <GlassCard aria dim active={active} delay={120} className="absolute -right-5 -top-6 h-full w-full" />
          <GlassCard active={active} delay={120} sheen className="p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 font-body text-small font-semibold text-white">
                {/* pulso "ao vivo" — anamnese em andamento */}
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-200 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sage-200" />
                </span>
                Anamnese ao vivo
              </p>
              {/* shrink-0 + nowrap: no card estreito do phone o flex espremia o
                  pill e o "8 / 14" quebrava em duas linhas. */}
              <span className="shrink-0 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-0.5 font-body text-[11px] font-medium tabular-nums text-sage-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                8 / 14
              </span>
            </div>
            {/* barra de progresso — luz correndo dentro do preenchido */}
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                // preenche de 8%→57% conforme o scroll entra no passo
                style={{ width: "calc(8% + var(--reveal, 1) * 49%)", transition: "width 120ms linear" }}
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-sage-200 to-white/80"
              >
                <span className="gaia-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </div>
            </div>
            <div className="relative space-y-3 overflow-hidden">
              {/* varredura de luz descendo — checklist sendo preenchido ao vivo */}
              <span
                aria-hidden
                className="gaia-scan pointer-events-none absolute inset-x-0 z-10 h-6 opacity-0 bg-gradient-to-b from-transparent via-white/12 to-transparent"
              />
              {TOPICS.map(([label, done, phone], i) => (
                <div key={label} style={reveal(i, TOPICS.length, { axis: "x", dist: 12, spread: 0.26 })} className={`flex items-center gap-3${phone ? "" : " max-md:hidden"}`}>
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
export function Panel3({ active, reduced, step }: PanelProps) {
  /* 4º campo = aparece no phone. S + P contam o arco inteiro (a história da
     paciente → o plano, onde o caret "digita") sem a torre de 4 blocos que
     estourava a altura do card estreito. */
  const soap: Array<[string, string, string, boolean]> = [
    ["S", "Subjetivo", "Insônia há 3 meses, piora no turno noite.", true],
    ["O", "Objetivo", "PA 120/80 · IMC 24,1 · sem alterações.", false],
    ["A", "Avaliação", "Insônia associada a estresse ocupacional.", false],
    ["P", "Plano", "Higiene do sono + retorno em 30 dias.", true],
  ];
  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden bg-bruma ${reduced ? "min-h-[100svh]" : "min-h-[78vh]"}`}>
      {/* foto lifestyle — nutricionista revisando o resumo pronto.
          .webp (era .png, 9,31 MB → 0,52 MB): PSNR 39,5 dB, delta médio 2,08/255,
          alpha idêntico — validado no pixel, zero mudança visual. */}
      {/* focal phone: o rosto dele vive a ~56% do arquivo — 42% assenta ele à
          direita do centro (a orelha sai naturalmente pelo quadro) e libera a
          esquerda pro card SOAP, o mais alto dos três. */}
      <PhotoBg src="/passo3-pronto.webp" focus="object-[42%_15%] md:object-center" />
      <Glow />
      <Overlay
        active={active}
        reduced={reduced}
        step={step}
        eyebrow="Passo 03 · Revise"
        headline="A Gaia sugere, você decide."
        sub="No final, um resumo SOAP editável, pronto pra salvar no prontuário."
      />

      <Float
        active={active}
        depth={16}
        delay={120}
        className={`${mainPos} ml-5 mr-auto w-[232px] md:w-[360px]`}
      >
        <div className="relative">
          <GlassCard aria dim active={active} delay={120} className="absolute -right-5 -top-6 h-full w-full" />
          <GlassCard active={active} delay={120} sheen className="p-4 md:p-6">
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
                {/* no card de 232px o nome + pill espremiam o título em 4
                    linhas — no phone fica só "Resumo SOAP" e o pill sai
                    (o sub logo abaixo já diz "editável"). */}
                <p className="font-body text-small font-semibold text-white">
                  Resumo SOAP<span className="max-md:hidden"> · Maria Silva</span>
                </p>
                <p className="font-body text-[11px] text-white/50">Gerado pela Gaia</p>
              </div>
              <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 font-body text-[11px] font-medium text-roxo-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] max-md:hidden">
                Editável
              </span>
            </div>
            <div className="space-y-2.5">
              {soap.map(([letter, label, value, phone], i) => (
                <div
                  key={letter}
                  style={reveal(i, soap.length, { dist: 10, spread: 0.24 })}
                  className={`flex gap-3 border-t border-white/10 pt-2.5 first:border-t-0 first:pt-0${phone ? "" : " max-md:hidden"}`}
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

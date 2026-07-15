"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconArrowUpRight, IconCheck } from "@/components/ui/icons";
import Footer from "@/components/sections/Footer";

gsap.registerPlugin(ScrollTrigger);

/* ── CTA Final ─────────────────────────────────────────────────────────────
   Fechamento da página — o momento mais quente (Figma 60:65 / 9:553).
   Âncora de motion: CTA da Zipline. A section não é mais uma tela: é uma
   PISTA de 340vh com um PALCO sticky de 100vh. O scroll não empurra a cena,
   ele a executa — mask, câmera e texto são três tempos de uma só timeline
   scrubada no eixo da section.

   Os tempos (progresso 0→1 da pista):
     · MASK   0    → 0.24 — o telhado abre enquanto o palco ainda desliza pra
       dentro da viewport, e ABRE ATÉ PREENCHER a section (vira retângulo
       full-bleed, sem creme). O vídeo só começa depois que ela encheu tudo.
     · FRASE  0.10 → 0.34 — "Enquanto você atendia, a Gaia anotou." Nasce
       DENTRO do gesto do arco (não numa cena parada) e morre cavalgando o
       início do scrub do vídeo (0.30): quem dispensa a frase é a câmera se
       mexendo, não um fade avulso. Só existe na primeira cena — câmera
       fechada na tela do tablet, antes do pull-back — por isso não sobrevive
       além de 0.34.
     · VÍDEO  0.30 → 0.62 — o scroll é a agulha da timeline: pull-back saindo
       da tela do tablet até a cena inteira. Só começa com o palco parado.
     · ROBERTA 0.62 → 0.67 — o recorte alpha (mesmo pixel do frame final) faz
       fade por cima do vídeo. Invisível por definição; existe só pra não ter
       pop de decode quando ele passa a ser o que segura a cena.
     · CTA    0.64 → 0.88 — headline + botão sobem de cima do corpo dela, POR
       TRÁS da Roberta, e assentam AO LADO DO TABLET. Não acima dela: com a
       cena full-bleed a cabeça fica em y≈72 e não existe teto. A coluna roxa
       à direita do tablet é o único vazio real da tela.
     · 0.88 → 1 — pausa. Nada se move: é o tempo de ler o CTA antes do palco
       soltar o sticky.

   O FOOTER não está no palco. Ele vive depois da pista, em fluxo normal: o
   palco solta, a cena sai por cima e o footer sobe ABAIXO DA LINHA DO QUADRIL
   dela (que é a borda de baixo da cena — ver SCENE_BOX). Bônus: fora do
   sticky, o reveal interno do próprio Footer volta a disparar sozinho.

   Ordem de camadas (baixo→cima): vídeo → wash → CTA → Roberta. A Roberta (e o
   tablet, que vem no mesmo recorte) fica na frente do texto; é o que faz o CTA
   passar atrás dela.

   Por cima do vídeo: wash de marca (lavanda→escuro) + scrim central
   (legibilidade AA) + scrim de base forte + luz aurora fluindo — tudo DENTRO
   do clip, senão os scrims pintariam por cima do creme, fora do arco.
   Tudo respeita prefers-reduced-motion. */

// Fundo do CTA — pull-back de câmera de 5s (121 frames), scrubado pelo scroll:
// abre fechado na tela do tablet (o workspace da Gaia) e termina na pessoa
// segurando o iPad. Encodado all-intra — todo frame é keyframe, então o seek é
// instantâneo e o scrub não engasga. Duas fontes por peso; a escolha é feita uma
// vez no mount, pelo viewport (ver `sources`).
const CTA_VIDEO_LG = "/video/cta-tablet-1920.mp4";
const CTA_VIDEO_SM = "/video/cta-tablet-1280.mp4";
// Recorte da Roberta com alpha — é EXATAMENTE o último frame do vídeo, com
// registro pixel-perfect verificado. Assenta invisível por cima do frame final
// desde que a caixa seja idêntica à do vídeo (ver SCENE_BOX + MEDIA).
const CTA_CUTOUT_LG = "/video/cta-roberta-cutout.webp";
const CTA_CUTOUT_SM = "/video/cta-roberta-cutout-sm.webp";
// Frame 0 — cobre o vídeo enquanto ele carrega.
const CTA_POSTER = "/video/cta-tablet-poster.webp";
// Último frame (cena aberta) — o que reduced-motion recebe: sem vídeo baixado,
// o usuário vê direto o destino da câmera em vez do ponto de partida.
const CTA_STILL = "/video/cta-tablet-still.webp";
// Buquê bordô/lavanda com alpha — a peça que costura a cena no footer. Fica na
// dissolvência, montada na emenda: o que era um degrau vira uma intenção.
const CTA_FLOWER = "/video/cta-floral.webp";
// A CAIXA DA CENA. O vídeo e o recorte compartilham ESTA string, palavra por
// palavra. Qualquer divergência de geometria entre os dois (transform, scale,
// object-position, aspecto do container) desalinha o recorte do frame e a tela
// mostra DUAS Robertas — a do vídeo e a do recorte. Não versionar por camada.
//
// FULL-BLEED: a cena toma a section inteira. Sem chapa atrás, sem borda suave —
// não há lacuna pra disfarçar, então nada disso existe mais.
//
// A conta que manda aqui: a Roberta ocupa 92% da altura do frame (a cabeça dela
// começa a 8% do topo). Com `object-cover` enchendo a section, a altura inteira
// do frame cai na viewport e a cabeça fica em y≈72 — não há teto pro texto.
// Por isso o CTA vai AO LADO do tablet, não acima dela: é o único vazio real.
const SCENE_BOX = "absolute inset-0";
// Preenchimento da caixa — o <video> e o <img> do recorte usam o MESMO.
// `object-[100%_50%]` (ancorar à direita) não é estética: em 1440 o cover cria
// 172px de sobra horizontal, e ancorar à direita gasta ela toda cortando o lado
// ESQUERDO do frame — o que empurra o tablet de x≈1107 pra x≈1021 e alarga a
// coluna livre à direita de 333px pra 419px. É essa coluna que o CTA ocupa.
// Vale pro vídeo E pro recorte: divergir aqui desalinha o registro.
//
// `scale-110 -translate-x-[5%]` é o empurrão: a tipografia desloca ela pra
// esquerda. Precisa dos dois juntos — sozinho, o translate abriria um vazio na
// direita (o cover não tem mais sobra pra gastar depois do `object-[100%]`); o
// scale-110 dá os 72px de folga que o translate de 5% consome, exatos. Mais
// translate que isso e o pé direito do vídeo descola da borda.
const MEDIA =
  "h-full w-full object-cover object-[100%_50%] scale-110 -translate-x-[5%]";

// Id do clipPath compartilhado — vídeo e recorte referenciam o MESMO, é o que
// garante que o arco corte os dois exatamente igual.
const ARCH_ID = "cta-arch";

/**
 * Geometria do arco, em coordenadas normalizadas (objectBoundingBox 0..1) —
 * por serem relativas, a forma escala sozinha com o elemento, sem recalcular
 * nada no resize.
 *
 * p = 0 → fechada (telhado baixo, creme em volta) · p = 1 → PREENCHE A SECTION
 * inteira: em repouso todo termo é multiplicado por k = 1-p, então tudo zera
 * junto e o path degenera num retângulo full-bleed, sem creme nenhum. É a
 * referência da Zipline — o arco é o gesto da ENTRADA, não o estado final. O
 * vídeo só começa depois que ela terminou de preencher.
 *
 * A FORMA é um telhado, não um domo: duas diagonais RETAS e rasas subindo dos
 * ombros até um cume arredondado, mais um arredondamento curto onde cada
 * diagonal encosta na lateral. Domo (duas cúbicas com barriga, o que havia
 * aqui antes) engorda no meio e come o topo da cena; o telhado sobe reto e
 * devolve o creme só nas pontas.
 *
 * Os três números que mandam, lidos da referência: ombro em 0.47, cume VISÍVEL
 * em 0.21, arredondamento do cume cobrindo o terço central. Cuidado: `yc` não
 * é o cume que se vê — é o BICO VIRTUAL, onde as duas retas se cruzariam se não
 * houvesse curva. A quadrática usa esse bico como controle e passa a meio
 * caminho dele, então o cume visível assenta em yc + r·(ys−yc) ≈ 0.21. Mexer em
 * `r` sozinho move o cume visível junto.
 */
const archD = (p: number) => {
  const k = 1 - p;
  const ys = k * 0.47; // ombro: onde o telhado encontra a lateral
  const yc = k * 0.16; // bico virtual — controle da curva, não o cume visível
  const r = k * 0.16; // meia-largura do arredondamento do cume
  const sx = k * 0.05; // quanto o arredondamento do ombro avança pra dentro
  const sy = k * 0.045; // e quanto ele desce pela lateral
  const m = (ys - yc) / 0.5; // inclinação do telhado
  const yr = yc + r * m; // onde a reta entrega a curva do cume
  const yo = ys - sx * m; // onde a curva do ombro entrega a reta
  return (
    `M0,${ys + sy} Q0,${ys} ${sx},${yo} ` +
    `L${0.5 - r},${yr} Q0.5,${yc} ${0.5 + r},${yr} ` +
    `L${1 - sx},${yo} Q1,${ys} 1,${ys + sy} L1,1 L0,1 Z`
  );
};

// Arco em repouso — estado inicial do <path> no SSR e o único estado que
// reduced-motion enxerga.
const ARCH_REST = archD(1);

type Sources = { video: string; cutout: string };

/** Safari/iOS não pinta o primeiro frame nem responde bem a seek num vídeo que
 *  nunca tocou. Um play()/pause() assim que há frame decodificado destrava. */
function primeForSeek(e: SyntheticEvent<HTMLVideoElement>) {
  const v = e.currentTarget;
  // pause só depois do play resolver — pausar durante a promise a faz rejeitar.
  v.play()
    .then(() => v.pause())
    .catch(() => {});
}

/* Vidro escuro dos cards da cena — mesmo vocabulário do GLASS_MOBILE do
   Pricing (fundo denso e uniforme, alpha alto, sem gradiente) e do GLASS do
   PhoneScreen (borda branca de baixa opacidade, radius grande). Aqui,
   diferente do GLASS do PhoneScreen, backdrop-blur ENTRA: aquele evita
   backdrop-filter só porque vive dentro de um <Html transform> do drei (bug
   de renderização em contexto 3D-transformado) — este card é DOM plano sobre
   vídeo/foto, então o blur é o que sustenta a legibilidade contra o fundo em
   movimento. `rgba(0,10,26,...)` é o token `ink` (#000A1A) em rgb — mesmo
   literal que o GLASS_MOBILE usa, ver tailwind.config.ts. */
const CARD_GLASS =
  "border border-white/15 bg-[rgba(0,10,26,0.55)] backdrop-blur-[20px] backdrop-saturate-[1.4]";

/* Highlight de 1px na quina de cima — camada própria, não empilhada dentro da
   sombra externa (mesma separação que o card fumê do Pricing usa). */
const CARD_SHEEN =
  "pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]";

const CARD_SHADOW = "shadow-[0_20px_50px_-20px_rgba(0,10,26,0.7)]";

/** Camadas por cima da imagem: wash de marca + scrims de legibilidade + aurora. */
function Wash() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {/* tint de marca (lavanda/roxo) — puxa a foto pro mundo da Gaia */}
      <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(36,26,56,0.52)_0%,rgba(58,72,94,0.28)_38%,rgba(14,16,22,0.70)_100%)]" />
      {/* scrim central — contraste AA da headline sobre qualquer foto */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,transparent_26%,rgba(14,16,22,0.5)_100%)]" />
      {/* scrim de base — escurece o pé só o suficiente; a imagem segue visível
          nas bordas ao redor do card de vidro flutuante do footer */}
      <div className="absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(to_top,rgba(14,16,22,0.80),rgba(14,16,22,0.38)_52%,transparent)]" />
      {/* luz aurora fluindo (o "momento mais quente") — bloom lavanda que respira */}
      <div className="gaia-aurora-flow absolute top-[8%] left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(163,133,192,0.42),rgba(122,144,174,0.15)_45%,transparent_70%)] blur-3xl" />
    </div>
  );
}

export default function CTAFinal() {
  const root = useRef<HTMLElement>(null);
  const arch = useRef<SVGPathElement>(null); // o `d` é reescrito a cada frame
  const video = useRef<HTMLVideoElement>(null); // agulha do scrub (currentTime)
  const clipRoberta = useRef<HTMLDivElement>(null); // camada do recorte alpha
  // A FRASE da primeira cena — câmera ainda fechada na tela do tablet, antes
  // do pull-back. Vive e morre dentro do gesto do arco (ver timeline); depois
  // disso quem fala é a câmera se afastando, não mais texto sobre a tela.
  const firstLine = useRef<HTMLDivElement>(null);
  // O BLOCO interno (headline + botão), não a camada full-screen: é o bloco que
  // viaja de cima do corpo dela até a faixa do topo. Animar a camada moveria a
  // caixa de layout inteira e o `y` não teria significado nenhum.
  const ctaBlock = useRef<HTMLDivElement>(null);
  // A PILHA de cards de vidro na cunha esquerda — contrapeso do CTA, que
  // sozinho na coluna direita deixa a cena torta. A ref é da COLUNA, mas quem
  // entra na timeline são os filhos dela, um a um (ver useGSAP): é o que
  // permite o stagger sem uma ref por card.
  const cardStack = useRef<HTMLDivElement>(null);

  // null = indeciso: o matchMedia só resolve depois do primeiro paint, e nesse
  // vão não renderizamos nem vídeo nem still — a base cobre. Sem isso o still de
  // reduced-motion apareceria e piscaria pra vídeo em todo mundo.
  const [motion, setMotion] = useState<boolean | null>(null);
  // Vídeo e recorte saem da MESMA decisão de viewport, congelada no mount: os
  // dois têm que ser do mesmo par (1920 juntos ou 1280/-sm juntos), senão o
  // registro pixel-perfect entre recorte e frame final se perde. Não usamos
  // <source media> porque browsers resolvem essa escolha de formas diferentes.
  const [sources, setSources] = useState<Sources | null>(null);

  // Decide uma vez se roda a pista scrubada ou entrega estático (reduced-motion).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMotion(!reduce.matches);
    decide();
    reduce.addEventListener("change", decide);
    return () => reduce.removeEventListener("change", decide);
  }, []);

  // Peso dos assets pelo viewport — congelado no mount: trocar de fonte no meio
  // do scrub custaria um reload e um salto na câmera.
  useEffect(() => {
    const lg = window.matchMedia("(min-width: 768px)").matches;
    setSources(
      lg
        ? { video: CTA_VIDEO_LG, cutout: CTA_CUTOUT_LG }
        : { video: CTA_VIDEO_SM, cutout: CTA_CUTOUT_SM },
    );
  }, []);

  useGSAP(
    () => {
      // reduced-motion: still full-bleed com o arco em repouso, CTA e footer
      // visíveis e parados, section de altura normal. Nada a animar.
      if (!motion) return;

      // Proxy do mask. O ScrollTrigger não sabe animar o atributo `d` de um
      // <path>, então tweenamos um número e escrevemos a forma no onUpdate.
      const mask = { p: 0 };
      const writeArch = (p: number) =>
        arch.current?.setAttribute("d", archD(p));
      writeArch(0); // `.to()` não faz immediateRender: fecha na mão antes do 1º paint

      // UMA timeline, posições absolutas em unidades de progresso (0..1) da
      // pista. Duração total = 1 pra que `tempo do tween` === `progresso do
      // scroll`, e as fases da spec possam ser lidas direto no código.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          // eixo da SECTION (a pista de 340vh), não do palco: `top bottom` é o
          // instante em que a pista assoma; `bottom bottom` é quando o palco
          // solta o sticky. Assim o fim da timeline coincide com o fim da
          // página — esta é a última section, `bottom top` nunca chega.
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.6,
          // um refresh (resize/reflow) pode reordenar o render: reescreve a
          // forma no p atual pra não deixar o arco preso num frame velho.
          onRefresh: () => writeArch(mask.p),
        },
      });

      // ── MASK 0 → 0.24 ─────────────────────────────────────────────────────
      // Abre cedo e fecha o assunto antes do palco grudar (~0.294): quando ele
      // para, o arco já está em repouso e a próxima coisa a se mover é a câmera.
      tl.to(
        mask,
        {
          p: 1,
          duration: 0.24,
          onUpdate: () => writeArch(mask.p),
        },
        0,
      );

      // ── FRASE 0.10 → 0.34 ────────────────────────────────────────────────
      // "Enquanto você atendia, a Gaia anotou." — a única linha da primeira
      // cena, câmera ainda fechada na tela do tablet. Entra em 0.10→0.20:
      // DENTRO do gesto do arco (que roda 0→0.24), não numa cena parada — ela
      // nasce junto com a abertura do telhado. Segura 0.20→0.28. Sai em
      // 0.28→0.34, cavalgando o começo do scrub do vídeo (0.30): quem
      // dispensa a frase é a CÂMERA se mexendo, não um fade avulso — o `y:-24`
      // sobe contra o recuo. `fromTo` com immediateRender pelo mesmo motivo do
      // ctaBlock e dos cards: precisa nascer invisível desde o mount, senão
      // fica de fantasma sobre a tela do tablet.
      tl.fromTo(
        firstLine.current,
        { autoAlpha: 0, y: 0 },
        { autoAlpha: 1, duration: 0.1, ease: "power2.out" },
        0.1,
      );
      tl.to(
        firstLine.current,
        { autoAlpha: 0, y: -24, duration: 0.06, ease: "power2.in" },
        0.28,
      );

      // ── CTA 0.64 → 0.88 ───────────────────────────────────────────────────
      // O trajeto ocluso: o bloco nasce 520px abaixo do seu lugar — ou seja, em
      // cima do corpo dela, por trás (z-20 < z-30) — e sobe até assentar na
      // faixa do topo, acima da cabeça. `y` em px e não `yPercent` porque o
      // bloco tem ~180px de altura: a viagem é de tela, não de bloco.
      // `fromTo` faz immediateRender, então o estado inicial vale desde o mount:
      // por isso o from é autoAlpha 0 e não 0.6 — a 0.6 o bloco ficaria de
      // fantasma sobre o corpo dela durante TODO o scrub do vídeo, desde o
      // frame do tablet fechado. Ele acende enquanto sobe, por trás dela.
      tl.fromTo(
        ctaBlock.current,
        { y: 520, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.24, ease: "power3.out" },
        0.64,
      );

      // ── CARDS 0.70 → 0.88 ────────────────────────────────────────────────
      // A pilha da esquerda. Entra DEPOIS do CTA (offset 0.70 vs 0.64) e sobe
      // bem menos (160px vs 520px): ela é o detalhe que equilibra a composição,
      // não a protagonista — entrar junto e no mesmo curso deixaria a dupla
      // mecânica. Termina em 0.88 com o CTA, quando a pausa segura a cena.
      // `fromTo` pelo mesmo motivo do CTA: precisa nascer invisível desde o
      // mount (immediateRender), senão fica de fantasma sobre o corpo dela
      // durante o scrub do vídeo.
      //
      // Alvo são os FILHOS, não a coluna: animar a coluna moveria os três cards
      // como uma placa só. Um por um, o stagger deixa a leitura assentar em
      // cascata. Ordem do DOM = de cima pra baixo.
      const cards = cardStack.current
        ? (Array.from(cardStack.current.children) as HTMLElement[])
        : [];
      tl.fromTo(
        cards,
        { y: 160, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.18,
          ease: "power3.out",
          stagger: 0.05,
        },
        0.7,
      );

      // ── ROBERTA 0.62 → 0.67 ───────────────────────────────────────────────
      // Fade puro de `opacity` (não autoAlpha: `visibility:hidden` é caminho
      // curto pro browser adiar o decode, e é exatamente o pop que este tween
      // existe pra evitar). São os mesmos pixels do frame final — o fade não se
      // vê; ele só cobre a troca de quem segura a cena. Não invade o scrub do
      // vídeo: começa quando ele termina.
      tl.fromTo(
        clipRoberta.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.05 },
        0.62,
      );

      // ── PAUSA 0.88 → 1 ────────────────────────────────────────────────────
      // O footer saiu do palco e levou a fase dele junto. Os ~0.12 finais são
      // de propósito: a cena fica parada, montada, pro CTA ser lido antes de o
      // sticky soltar.
      // Este tween vazio não anima nada — ele SEGURA A RÉGUA. A duração da
      // timeline é o que o scrub usa pra mapear scroll→tempo; sem ele a
      // timeline terminaria em 0.88 (fim do CTA) e todas as posições absolutas
      // acima seriam reescaladas por 1/0.88 — o contrato "tempo do tween ===
      // progresso do scroll" quebraria em silêncio, e cada fase adiantaria ~14%.
      tl.to({}, { duration: 0.12 }, 0.88);

      // ── VÍDEO 0.30 → 0.62 ─────────────────────────────────────────────────
      // Entra na MESMA timeline, mas só quando a duração é conhecida — sem ela
      // não há alvo pro currentTime. Inserir depois é seguro: 0.30+0.32 = 0.62
      // não estica a timeline (o `set` vazio já a fecha em 1.0), e o refresh
      // manda renderizar de novo no progresso atual, então um deep link no meio
      // da pista já nasce com o frame certo.
      const v = video.current;
      if (!v) {
        // motion/sources ainda indecisos: não há vídeo no DOM. O resto da
        // timeline já vale; este efeito reroda quando `sources` resolver.
        ScrollTrigger.refresh();
        return;
      }

      const attachScrub = () => {
        if (!Number.isFinite(v.duration) || v.duration <= 0) return;
        tl.to(v, { currentTime: v.duration, duration: 0.32 }, 0.3);
        // o vídeo entrou depois do layout: remede os triggers já criados.
        ScrollTrigger.refresh();
      };

      if (v.readyState >= 1) attachScrub();
      else v.addEventListener("loadedmetadata", attachScrub, { once: true });

      // gsap.context reverte tweens/triggers, mas não listeners de DOM: sem isso
      // um unmount antes do metadata deixaria um trigger nascer fora do context.
      return () => v.removeEventListener("loadedmetadata", attachScrub);
    },
    { scope: root, dependencies: [motion, sources] },
  );

  const still = motion === false;

  return (
    <>
      <section
        ref={root}
        id="comecar"
        // base = mesmo creme da seção de cima (Pricing): é NELE que o arco morde.
        // Sem `overflow-hidden` aqui — ele transformaria a section no scroll
        // container do palco e mataria o sticky. O recorte é do palco.
        className="relative bg-neutro-50"
        // A pista. 340vh: ~100vh de entrada (o palco desliza até grudar) + 240vh
        // de execução da timeline. reduced-motion não tem pista.
        style={still ? undefined : { height: "340vh" }}
      >
        {/* PALCO — 100vh grudado no topo enquanto a pista corre por baixo.
          `isolate` prende os z-index das camadas aqui dentro. */}
        <div
          className={
            still
              ? "relative isolate flex min-h-screen flex-col overflow-hidden"
              : "sticky top-0 h-screen overflow-hidden isolate"
          }
        >
          {/* O arco. objectBoundingBox = coordenadas 0..1, escala sozinho com o
            elemento. Vídeo e recorte apontam pro MESMO id — é o que garante que
            os dois sejam cortados exatamente igual. */}
          <svg aria-hidden className="absolute h-0 w-0" focusable="false">
            <defs>
              <clipPath id={ARCH_ID} clipPathUnits="objectBoundingBox">
                <path ref={arch} d={ARCH_REST} />
              </clipPath>
            </defs>
          </svg>

          {/* z-0 · CHAPA + CENA + wash, recortados pelo arco */}
          <div
            className="absolute inset-0 z-0"
            style={{ clipPath: `url(#${ARCH_ID})` }}
          >
            {/* a cena. MESMA caixa do recorte lá embaixo — ver SCENE_BOX. */}
            <div className={SCENE_BOX}>
              {still ? (
                // reduced-motion: o último frame, e nenhum byte de vídeo na rede.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={CTA_STILL} alt="" aria-hidden className={MEDIA} />
              ) : motion === true && sources ? (
                <video
                  ref={video}
                  src={sources.video}
                  poster={CTA_POSTER}
                  onLoadedData={primeForSeek}
                  muted
                  playsInline
                  preload="auto"
                  disablePictureInPicture
                  // decorativo e dirigido só pelo scroll: fora do foco e da a11y tree
                  tabIndex={-1}
                  aria-hidden
                  className={MEDIA}
                />
              ) : null}
            </div>

            {/* DENTRO do clip de propósito: fora dele os scrims pintariam o creme
              ao redor do arco. */}
            <Wash />

            {/* FRASE da primeira cena — câmera fechada na tela do tablet, antes
              do pull-back. Vive DENTRO do clip de propósito: assim o arco já
              a corta de graça (nunca sangra no creme enquanto o telhado abre)
              e o z-0 já a mantém abaixo do CTA (z-20) e da Roberta (z-30). Só
              existe com motion: em reduced-motion não há primeira cena — o
              still já é o destino da câmera, e a frase boiaria em cima do
              CTA. Sem `aria-hidden`: é copy de verdade, fica na a11y tree. */}
            {motion === true ? (
              <div
                ref={firstLine}
                className="pointer-events-none absolute inset-0 grid place-items-center px-[6vw] opacity-0"
              >
                <p className="max-w-[20ch] text-balance text-center font-title text-[clamp(1.75rem,4.2vw,4rem)] font-medium leading-[0.98] tracking-[-0.035em] text-white">
                  Enquanto você atendia, a Gaia anotou.
                </p>
              </div>
            ) : null}
          </div>

          {/* z-20 · CTA — entre o vídeo (z-0) e a Roberta (z-30): é ESSA ordem que
            faz o texto passar por trás dela. A camada segue full-screen; quem
            viaja é o bloco de dentro. */}
          {/* `pb-[8vh]` sobe o bloco 4vh acima do centro óptico. Não é gosto: o
            footer entra com `-mt-[16vh]` e a dissolvência dele lambe o pé do
            palco — centrado de verdade, a microcopy assentava dentro da emenda.
            Subindo, o bloco fica na faixa alta da coluna roxa, que é onde ela
            é mais larga (o braço dela avança conforme desce). */}
          <div
            className={
              still
                ? "relative z-20 flex flex-1 items-center justify-end px-[3vw] pb-[8vh]"
                : "absolute inset-0 z-20 flex items-center justify-end px-[3vw] pb-[8vh]"
            }
          >
            {/* AO LADO DO TABLET, não acima dela. Com a cena full-bleed a cabeça
              dela fica em y≈72 e não sobra teto; o vazio real é a coluna roxa à
              direita do tablet (~350px em 1440, ~500px em 1920). Centrado na
              vertical = na altura do tablet. A borda direita do bloco encosta no
              tablet de propósito: o tablet vem no recorte (z-30), então ele
              come a beirada do texto — profundidade, e é o "passa por trás". */}
            {/* A LARGURA É O QUE FAZ A SOBREPOSIÇÃO, E ELA SE MEDE EM vh.
              Contra-intuitivo, então vale a conta. A borda direita do bloco é
              fixa (`px-[3vw]`); quem se move é a silhueta dela. A foto é 1.79:1
              com `object-cover` ancorado à direita (ver MEDIA): enquanto o
              aspecto da viewport for MENOR que 1.79, o cover é puxado pela
              ALTURA — a largura desenhada vira vh×1.79 e a borda dela passa a
              depender de vh, não de vw. Somando o `scale-110` e o
              `-translate-x-[5%]` (que entram como `translate ∘ scale` em torno
              do centro), a distância da borda dela até a direita da tela sai:

                  R = 1.1 · 1.79 · (1−fx) · vh − 0.05 · vw

              onde fx é onde ela está DENTRO do arquivo. Medindo R com o alpha
              do recorte amostrado em canvas (mesma régua da pilha de cards) e
              resolvendo pra constante em cinco viewports:
                · 1920×1080 → R=559 → C=0.607
                · 1600×940  → R=484 → C=0.600
                · 1512×982  → R=505 → C=0.591
                · 1440×900  → R=463 → C=0.594
                · 1280×800  → R=412 → C=0.595
              C fecha em ~0.597 em todos — o modelo vale, e a dispersão é só a
              silhueta dela não ser vertical (R é lido na altura da 1ª linha,
              que se move com vh). Note 1440 e 1280: aspecto idêntico, R
              diferente em px e IGUAL em vw (32.2vw nos dois). É a prova de que
              o par (vh,vw) manda e a largura sozinha não diz nada.

              Daí a largura: pra ela morder `bite` px da tinta,
                  W = R + bite − 0.03·vw  =  0.597·vh − 0.08·vw + bite
              Com bite=22px a mordida sai entre 12 e 27px de 1280 a 1920 —
              constante, que é o que nenhum valor fixo consegue. O `min(27vw,
              390px)` que havia aqui é justo o contrário: a 1920 o cap de 390
              travava e sobrava um VÃO de 45px (os planos nem se tocavam), e a
              1600 ele mal pegava e mordia 20px. A sobreposição era acidente de
              cap, não decisão.

              O PREÇO: o texto é alinhado à esquerda, então TODA linha começa na
              borda que ela morde. 22px é o naco que cabe antes da primeira
              haste — subir isso começa a comer letra.

              LIMITE CONHECIDO: acima de 1.79 de aspecto (ultrawide) o cover
              vira puxado pela LARGURA e este modelo não vale mais — R passa a
              ser 0.334·vw e o bloco fica sem sobreposição, só encostado. Não
              trato: degrada pra vão, não pra letra comida. Remedir se a foto ou
              o MEDIA mudarem — `scale-110`/`object-[100%_50%]` estão na conta. */}
            {/* O GATE É PROPORÇÃO, NÃO LARGURA — mesma regra da pilha de cards,
              pelo mesmo motivo. Abaixo de 4/3 ela simplesmente NÃO ESTÁ NO
              QUADRO: o cover ancorado à direita corta tudo menos o fundo, então
              não há silhueta pra sobrepor e a coluna estreita perde a razão de
              existir. `md:` não serve — iPad retrato tem 820px de largura (passa
              em `md`) e aspecto 0.69 (ela sumiu). Aqui embaixo o bloco é o que
              deveria ter sido sempre: largura cheia, medida de leitura no
              `max-w`. Isso conserta de passagem um bug antigo — com `27vw` o
              bloco tinha 105px num iPhone e "consulta"/"diferente." sangravam
              pra fora da tela. (A CENA no mobile continua sem ela; é outro
              assunto, não mexi.) */}
            <div
              ref={ctaBlock}
              className="w-full max-w-[32rem] text-left [@media(min-aspect-ratio:4/3)]:w-[clamp(320px,calc(59.7vh-8vw+22px),560px)] [@media(min-aspect-ratio:4/3)]:max-w-none"
            >
              {/* EYEBROW — o fio é quem sobrepõe de verdade. Ele sai do bloco
                pra esquerda (`right-full`) e vai morrer por baixo do tablet, em
                degradê: some dissolvendo em vez de bater num corte reto. É a
                peça que custa zero legibilidade — nenhuma letra mora nela — e
                por isso é ela que pode avançar 7vw pra dentro dela. */}
              <div className="relative pl-1">
                <span
                  aria-hidden
                  className="absolute top-1/2 right-full mr-4 h-px w-[7vw] bg-[linear-gradient(to_left,rgba(255,255,255,0.45),transparent)]"
                />
                <span className="font-body text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
                  Pronta pra começar?
                </span>
              </div>

              {/* GRANDE DE VERDADE. O tamanho vem do corpo da fonte + quebra
                natural na coluna, não de quebras escritas na mão. A 4.2vw ela
                fecha em ~64px e quebra em 3 linhas, que é o que enche a caixa
                em vez de boiar nela. Régua awwwards: leading abaixo de 1
                (`0.98` — as linhas se tocam e viram um bloco, não uma lista),
                tracking negativo forte (`-0.035em`, que só fecha bem NESSE
                corpo; em 28px no mobile o mesmo valor colaria as hastes — daí o
                clamp cuidar do corpo e o tracking ficar no limite do aceitável
                pro menor deles) e o itálico como única quebra de registro.
                `pl-1` alinha a haste da caixa alta com o eyebrow: a serifa tem
                sidebearing próprio e sem isso o "S" recua sozinho. */}
              <h2 className="mt-6 text-balance pl-1 font-title text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.98] tracking-[-0.035em] text-white">
                Sua próxima consulta pode ser{" "}
                <span className="font-normal italic text-roxo-300">
                  diferente.
                </span>
              </h2>

              {/* SUB — registro oposto ao da headline de propósito: sans, corpo
                pequeno, leading larga, branco a 60%. É o vale entre o pico da
                headline e o peso do botão; no mesmo registro dos dois viraria
                mais uma linha da headline. `max-w` em `ch` porque quem manda
                aqui é a medida de leitura, não a coluna. */}
              <p className="mt-5 max-w-[36ch] pl-1 font-body text-[15px] leading-[1.6] text-white/60">
                Comece hoje e sinta a diferença já no próximo atendimento.
              </p>

              {/* BOTÃO — pill que abraça o texto (`w-fit`), não uma barra na
                medida da coluna. Com `w-full` ele virava a base do bloco e
                competia com a headline pelo mesmo eixo: dois retângulos da mesma
                largura empilhados. Solto, ele volta a ser um objeto — e o rag da
                headline por cima dele passa a ser a composição, não um acidente.
                O `w-fit` no wrapper é pré-requisito do glow: `-inset-4` resolve
                contra ESTA caixa, e num wrapper de largura cheia o halo pintaria
                a coluna inteira em vez do pill.

                O TOM É O PONTO. `bg-brand` (#8A69D8) é lavanda sobre uma cena
                que é lavanda — o wash de marca, a aurora e o backdrop todos
                moram na mesma faixa, então o CTA se dissolvia no fundo justo na
                hora de ser clicado. Branco sobre `ink` é o par de maior contraste
                que a paleta já tem (~16:1, AAA), e é o único elemento branco
                sólido da cena: ele não compete com nada. A marca não sai — ela
                fica no GLOW, que segue lavanda e agora lê como luz da marca
                batendo no pill em vez de mais um roxo sobre roxo.
                É desvio consciente do botão do DS (Figma 17-38): o padrão
                pressupõe fundo claro, e esta é a única section que o contradiz. */}
              {/* `ml-1` casa com o `pl-1` do texto: sem ele o pill nasce 4px à
                esquerda da tinta da headline e a coluna perde o prumo. */}
              <div className="relative ml-1 mt-10 w-fit">
                <span
                  aria-hidden
                  className="gaia-cta-breathe pointer-events-none absolute -inset-4 -z-10 rounded-full bg-[radial-gradient(circle,rgba(138,105,216,0.85),transparent_70%)] blur-2xl"
                />
                <a
                  href="#comecar"
                  className="group inline-flex h-14 items-center gap-3 rounded-full bg-neutro-0 pl-8 pr-6 font-body text-[15px] font-medium tracking-[-0.01em] text-ink shadow-[0_10px_34px_-8px_rgba(0,10,26,0.55)] outline-none transition-all duration-200 ease-gaia hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_48px_-10px_rgba(0,10,26,0.75)] focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1016] active:translate-y-0"
                >
                  Começar grátis
                  <IconArrowUpRight className="h-[18px] w-[18px] transition-transform duration-200 ease-gaia group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
            </div>

            {/* A PILHA — contrapeso do CTA, que sozinho na coluna direita deixa
              a cena torta. MESMA camada z-20 do CTA: a Roberta é z-30, então
              ela passa POR CIMA dos cards, igualzinho ao que faz com o texto.
              `absolute` pra sair do fluxo do flex (`justify-end`) que centra o
              bloco do CTA — sem isso os cards entrariam como mais um item da
              linha em vez de ficar plantados no canto.

              A OCLUSÃO É O GESTO, não um efeito colateral. A pilha vivia
              espremida na boca da cunha (topo esquerdo), no único bolsão onde
              nada dela encostava nos cards — e o preço era uma composição em
              que os dois planos nunca se tocavam: cards de um lado, Roberta do
              outro, sem profundidade nenhuma. Descendo pra cá eles atravessam
              o cabelo e o braço dela, e é justamente esse cruzamento que planta
              a cena em camadas. Cada card entrega ~30% da borda direita pra
              ela; o conteúdo todo mora no terço esquerdo, que é a faixa que o
              recorte nunca alcança.

              A ESCADA (`ml` por card) segue a silhueta. O braço dela avança
              conforme desce, então a pilha recua na mesma medida: 6vw no chip
              (que nasce mais perto do centro, onde só o cabelo passa), 1vw no
              card de escala, 0 no card de rotina — o mais baixo e o mais fundo
              atrás do braço. Alinhada à esquerda, a coluna encostaria no braço
              lá embaixo e ficaria com um vão inútil em cima.

              Tudo ALINHADO À ESQUERDA dentro do card: o conteúdo se agarra na
              borda livre em vez de flutuar pro meio, que é justo por onde ela
              entra. */}
            {/* O GATE É PROPORÇÃO, NÃO LARGURA — e a diferença é o bug.
              A silhueta dela é a BORDA DO CORTE, não uma coluna do layout: a
              foto é 1.79:1 e o `object-cover` ancorado à direita (ver MEDIA)
              come o lado ESQUERDO quando a viewport é mais estreita que ela. O
              lado direito (a coluna do CTA) é estável em qualquer viewport; o
              esquerdo abre e fecha com o ASPECTO. Por isso `md:`/`lg:` não
              servem: 1280×854 e 1512×982 têm largura parecida e vazios
              completamente diferentes.

              12/7 = 1.714, e ele SUBIU de 1.52 porque a pilha desceu. Aquele
              1.52 media a boca da cunha, no topo, onde o vazio é largo; aqui
              embaixo, na altura do braço, a faixa livre é outra e some muito
              antes. Medido linha a linha (alpha do recorte amostrado em canvas
              contra a tinta real de cada linha, via Range — caixa de <p> mede
              a coluna, não a palavra, e mentiria pra mais):
                · 1.600 (1440×900)  — 7 linhas cortadas, pior −89. Fora.
                · 1.655 (1440×870)  — 6 cortadas, pior −45. Fora.
                · 1.694 (1440×850)  — 4 cortadas, pior −18. Fora.
                · 1.737 (1440×829)  — 0 cortadas, pior +24.
                · 1.778 (1600×900)  — 0 cortadas, pior +61.
              O corte real está entre 1.694 e 1.737; 12/7 é a fração limpa
              dentro dessa janela. O PREÇO É CONHECIDO: 1440×900 e o MacBook
              Pro 14" (1.54) perdem a pilha inteira e o CTA volta a ficar sem
              contrapeso à esquerda. É o custo de plantar os cards em cima do
              corpo dela — nessa posição o vazio simplesmente não existe abaixo
              de 1.71, e mostrar viraria sopa. Remedir se a foto ou o MEDIA
              mudarem: `scale-110`/`object-[100%_50%]` movem essa borda. */}
            {/* `items-start` + `w-[248px]` NO CARD, não na coluna — e isso é
              pré-requisito da escada, não estilo. Com a largura na coluna, o
              stretch padrão do flex faz o `ml` de cada card DESCONTAR da caixa
              em vez de empurrá-la: o chip virava 248−6vw ≈ 162px e o nome da
              Marina truncava em "Marina A...". Com a largura no filho, o `ml`
              só desloca. (`translate-x` resolveria o layout também, mas a
              timeline escreve transform nesses mesmos nós — ver CARDS.) */}
            <div
              ref={cardStack}
              className="absolute left-[1vw] top-[30vh] hidden flex-col items-start gap-10 [@media(min-aspect-ratio:12/7)]:flex"
            >
              {/* MOMENTO — o produto agindo, não um número sobre ele. Mesmo
                vocabulário da tela "início" do iPhone 3D (ver PhoneScreen:
                InicioScreen), de propósito: quem rolou a página inteira já viu
                essa anamnese ficar pronta no telefone. Aqui ela reaparece do
                lado de fora, como se o workspace tivesse vazado do tablet.
                `rounded-lg` (24px) e não `rounded-card` (40px): num bloco de
                ~72px de altura, 40px de raio vira pílula. */}
              <div
                className={`relative ml-[6vw] flex w-[248px] items-center gap-3 overflow-hidden rounded-lg p-4 ${CARD_SHADOW} ${CARD_GLASS}`}
              >
                <div aria-hidden className={`${CARD_SHEEN} rounded-lg`} />
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-azul-100 font-title text-[12px] font-semibold text-azul-800">
                  MA
                </span>
                <div className="min-w-0">
                  <p className="truncate font-title text-[14px] font-medium leading-tight text-white">
                    Marina Alves
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 font-body text-[12px] leading-none text-white/60">
                    <IconCheck className="h-3 w-3 shrink-0 text-sage-300" />
                    Anamnese pronta
                  </p>
                </div>
              </div>

              {/* ESCALA — o cenário onde o momento acontece. Sem o arco que
                havia aqui: era ornamento assumido (uma contagem de pacientes
                não tem teto, então não há escala pra desenhar), custava ~60px
                de altura e um arco centrado sobre conteúdo alinhado à esquerda
                não tem onde se apoiar. */}
              <div
                className={`relative ml-[1vw] w-[248px] overflow-hidden rounded-card p-6 ${CARD_SHADOW} ${CARD_GLASS}`}
              >
                <div aria-hidden className={`${CARD_SHEEN} rounded-card`} />
                <p className="font-title text-[2.75rem] font-medium leading-none tracking-[-0.02em] text-white">
                  300
                </p>
                <p className="mt-2 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
                  Pacientes
                </p>
                {/* `max-w` não é capricho de rag: sem ele a linha usa os 200px
                  internos do card e a ponta direita cai debaixo do cabelo. */}
                <p className="mt-3 max-w-[150px] font-body text-[13px] leading-relaxed text-white/55">
                  Todos com histórico completo.
                </p>
              </div>

              {/* ROTINA — o arco inteiro do produto num dia, e o fecho da
                escada: momento (uma anamnese) → escala (300 pacientes) → o
                caminho que cada um percorre. Sem nome de paciente de propósito:
                o chip lá em cima já é a Marina, repetir aqui encolheria os 300
                de volta pra uma pessoa só. Os horários são o argumento — 09:12
                → 14:40 é a consulta inteira resolvida no mesmo dia.
                É o card mais baixo e o mais coberto: nada aqui passa dos ~150px
                da esquerda, então o braço dela leva só moldura. */}
              <div
                className={`relative w-[248px] overflow-hidden rounded-card p-6 ${CARD_SHADOW} ${CARD_GLASS}`}
              >
                <div aria-hidden className={`${CARD_SHEEN} rounded-card`} />
                <p className="font-body text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
                  Hoje
                </p>
                {/* HORÁRIO PRIMEIRO, e rótulo curto — as duas decisões saem da
                  mesma régua. `ml-auto` no horário (o reflexo) o encostaria na
                  borda direita do card, que é justo o que o braço dela cobre:
                  as três linhas perderiam o número, que é o argumento inteiro.
                  Com a coluna de tempo à esquerda e o rótulo em uma palavra, a
                  linha mais longa fecha em ~145px — o texto todo cabe no terço
                  livre e o rag fica ragged-right dentro dele. O "respondida /
                  realizada" que os rótulos perderam quem diz é o check. */}
                <ul className="mt-5 space-y-4">
                  {[
                    ["09:12", "Anamnese"],
                    ["14:00", "Consulta"],
                    ["14:40", "Plano enviado"],
                  ].map(([time, label]) => (
                    <li
                      key={label}
                      className="flex items-center gap-2 font-body text-[13px] leading-none"
                    >
                      <IconCheck className="h-3.5 w-3.5 shrink-0 text-sage-300" />
                      <span className="w-[38px] shrink-0 tabular-nums text-white/45">
                        {time}
                      </span>
                      <span className="text-white/80">{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* z-30 · ROBERTA — recorte alpha por cima do CTA. Mesmo clip, MESMA
            caixa do vídeo (SCENE_BOX, resolvido contra o MESMO `inset-0` do
            palco): é o registro que faz ele sumir dentro do frame final.
            `opacity-0` (e não `hidden`) desde o mount: o browser precisa
            manter o <img> renderizável pra decodificar antes do fade em 0.62.
            Fora em reduced-motion — o still já traz a Roberta desenhada. */}
          {motion === true && sources ? (
            <div
              ref={clipRoberta}
              className="pointer-events-none absolute inset-0 z-30 opacity-0"
              style={{ clipPath: `url(#${ARCH_ID})` }}
            >
              <div className={SCENE_BOX}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sources.cutout}
                  alt=""
                  aria-hidden
                  decoding="async"
                  className={MEDIA}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* FOOTER — fora do palco, em fluxo normal. O sticky solta exatamente no pé
        da pista (`end: "bottom bottom"`), e o pé da pista é o pé do palco, que é
        a LINHA DO QUADRIL dela: continuar scrollando traz o footer por baixo
        dela, que era o pedido. Dentro do sticky ele nunca teve essa chance — e
        de quebra o reveal próprio do Footer (`start: "top 88%", once: true`)
        queimava a seco lá dentro; aqui ele volta a disparar sozinho.

        SEM RISCO DE DIVISÃO: o footer não tenta casar de cor com o pé da cena —
        ele SOBREPÕE. O `-mt` puxa 16vh por cima do palco e o fundo nasce
        transparente ali, endurecendo no preto da marca. A cena dissolve dentro
        dele. Casar cor não funcionaria: o pé do palco não é uma cor só (o corpo
        dela é quase preto no meio, o backdrop é lavanda nas beiradas), então
        qualquer chapado encostaria num degrau. Sem cor pra casar, sem costura.

        O bloom lavanda embaixo é a atmosfera do CTA continuando — longe da
        emenda de propósito, senão ele mesmo criaria o degrau que veio matar. */}
      {/* Regra desta caixa: nada aqui pode passar do PÉ do wrapper. Um absolute
        que ultrapassa o pai por baixo estica o scrollHeight do documento, e o
        que aparece nesse excedente é o creme do <body> — foi exatamente assim
        que nasceu a faixa branca embaixo do footer (o bloom era `h-[70vh]` a
        partir de `top-[16vh]`: 144+630 num wrapper de 646). Por isso o bloom é
        ancorado em `bottom-0`, não em altura fixa. Passar do TOPO pode: crescer
        pra cima não mexe no scroll — é o que a flor faz. */}
      <div className="relative -mt-[16vh]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0,#0E1016_16vh)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 top-[16vh] bg-[radial-gradient(65%_55%_at_50%_0%,rgba(138,105,216,0.20),transparent_72%)]"
        />
        {/* A FLOR — montada na emenda, metade na cena e metade no footer. Vem
          DEPOIS dos gradientes na ordem de pintura pra não ser lavada por eles,
          e antes do footer pra passar por trás do card de vidro. O `-translate-y-1/2`
          a joga pra cima do pé do wrapper: pra cima é seguro, pra baixo não. */}
        {/* A FLOR, sem máscara: quem desenha a borda é o alpha do PNG. Ela rende
          no aspecto natural (`w-full`, altura livre) — nada de `object-cover`,
          que era o que ceifava as pétalas em linha reta.
          A caixa começa ACIMA do wrapper (`-top`) e termina no pé dele
          (`bottom-0`): o `overflow-hidden` daqui existe só pra travar o pé, que
          é a regra da caixa — absolute passando do fundo estica o scrollHeight e
          devolve a faixa branca. Travando aqui, a flor pode descer o quanto
          quiser dentro do footer sem risco. Vem antes do footer na pintura, então
          passa por trás do card de vidro. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-[9vh] bottom-0 overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* `-scale-x-100`: o recorte reto do asset fica na ponta esquerda —
            espelhando, ele cai fora do lado que a cena mostra. */}
          <img src={CTA_FLOWER} alt="" className="absolute inset-x-0 top-0 w-full -scale-x-100" />
        </div>

        {/* `relative` senão o card de vidro fica ATRÁS dos gradientes e da flor.
          O `pt` devolve o que o `-mt` tomou: o conteúdo do footer começa
          embaixo da dissolvência, nunca dentro dela. */}
        <div className="relative pt-[16vh]">
          <Footer embedded />
        </div>
      </div>
    </>
  );
}

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
     · FRASE  0.10 → 0.36 — "Enquanto você atendia, a Gaia anotou." Nasce
       DENTRO do gesto do arco (não numa cena parada) e morre cavalgando o
       início do scrub do vídeo (0.30): quem dispensa a frase é a câmera se
       mexendo, não um fade avulso. Só existe na primeira cena — câmera
       fechada na tela do tablet, antes do pull-back — por isso não sobrevive
       além de 0.36.
     · DIM    0    → 0.44 — a primeira cena entra ESCURA (CSS, desde o mount)
       e a luz só SOBE, dentro do mesmo pull-back que tira a frase: a câmera
       saindo é quem apaga o texto E acende a cena, num sentido só. Ver o
       comentário de `sceneDim` no corpo do componente pro porquê do número.
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

/** Camadas por cima da imagem: wash de marca + scrims de legibilidade + aurora.
 *
 * O wash empilhava tint 0.52/0.70 + scrim 0.5 + base 0.8 PERMANENTES — presos
 * o tempo todo, não só na primeira cena — e achatava o roxo real do vídeo e o
 * tom de pele dela em cinza. Ele fazia dois trabalhos ao mesmo tempo (marca E
 * legibilidade da headline) e por isso cobrava o preço dos dois o tempo todo,
 * inclusive nos 0.62→1 em que não há headline nenhuma sobre a cena pra
 * proteger. Agora a legibilidade da primeira cena é responsabilidade do DIM
 * (temporal, ver `sceneDim` abaixo — CSS opaco que só apaga), e o wash volta a
 * ser só marca: tint e scrim central caem pra valores de tonalidade, não de
 * contraste. O scrim de base CONTINUA mais forte que os outros dois — ele não
 * é legibilidade, é a costura com o footer (ver o comentário do footer: sem
 * cor pra casar, sem costura, e é esse scrim que prepara o preto ali). */
function Wash() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {/* tint de marca (lavanda/roxo) — puxa a foto pro mundo da Gaia */}
      <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(36,26,56,0.16)_0%,rgba(58,72,94,0.06)_38%,rgba(14,16,22,0.30)_100%)]" />
      {/* scrim central — só tonalidade agora; a legibilidade da headline é o DIM */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,transparent_42%,rgba(14,16,22,0.22)_100%)]" />
      {/* scrim de base — escurece o pé só o suficiente; a imagem segue visível
          nas bordas ao redor do card de vidro flutuante do footer */}
      <div className="absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(to_top,rgba(14,16,22,0.70),rgba(14,16,22,0.22)_52%,transparent)]" />
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
  // O DIM da primeira cena — legibilidade da FRASE contra o vídeo+wash, agora
  // que o Wash voltou a ser só marca (ver comentário do Wash). Ref de um <div>
  // que já nasce opaco via CSS (ver JSX): a timeline só tem o tween que apaga.
  const sceneDim = useRef<HTMLDivElement>(null);
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

      // ── FRASE 0.10 → 0.36 ────────────────────────────────────────────────
      // "Enquanto você atendia, a Gaia anotou." — a única linha da primeira
      // cena, câmera ainda fechada na tela do tablet. Entra em 0.10→0.20:
      // DENTRO do gesto do arco (que roda 0→0.24), não numa cena parada — ela
      // nasce junto com a abertura do telhado. Segura 0.20→0.30. Sai em
      // 0.30→0.36, começando JUNTO com o scrub do vídeo (0.30, ver VÍDEO
      // abaixo) e com o DIM apagando (ver `sceneDim`): quem dispensa a frase é
      // a CÂMERA se mexendo, não um fade avulso — o `y:-24` sobe contra o
      // recuo. `fromTo` com immediateRender pelo mesmo motivo do ctaBlock e
      // dos cards: precisa nascer invisível desde o mount, senão fica de
      // fantasma sobre a tela do tablet.
      tl.fromTo(
        firstLine.current,
        { autoAlpha: 0, y: 0 },
        { autoAlpha: 1, duration: 0.1, ease: "power2.out" },
        0.1,
      );
      tl.to(
        firstLine.current,
        { autoAlpha: 0, y: -24, duration: 0.06, ease: "power2.in" },
        0.3,
      );

      // ── DIM 0 → 0.44 (SAÍDA) ─────────────────────────────────────────────
      // A cena entra ESCURA e a luz só SOBE — um sentido só, sem pulso: um dim
      // que acende e apaga viraria piscada. Por isso o estado escuro é CSS
      // (`opacity-[0.62]` no JSX, ver `sceneDim`) e existe desde o mount; a
      // timeline só tem ESTE tween, que apaga.
      //
      // 0.62 é medido, não gosto: preto a 0.62 sobre o branco da tela do
      // tablet dá ~#666, que contra texto branco fecha ~5.7:1 (passa AA até
      // pra corpo normal). A 0.50 cairia pra ~3.9:1 — passaria só como texto
      // grande, e a frase perderia a margem. Acima de 0.7 a UI do tablet
      // deixa de ser legível como produto e vira mancha.
      //
      // Uniforme no quadro inteiro, e NÃO um radial atrás do texto: o radial
      // vira borrão sobre a UI e lava justamente o que a cena existe pra
      // mostrar. Uniforme, o tablet vira brilho num quarto escuro e o produto
      // continua legível.
      //
      // Apaga em 0.30→0.44 e a frase sai em 0.30→0.36: as duas coisas começam
      // JUNTO com o scrub do vídeo (0.30). Quem apaga a frase e acende a luz é
      // a CÂMERA saindo — a luz sobe DENTRO do pull-back, terminando depois da
      // frase, então a última coisa que acontece é a cena acendendo, já sem
      // texto.
      tl.to(
        sceneDim.current,
        { opacity: 0, duration: 0.14, ease: "power2.inOut" },
        0.3,
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

            {/* DIM da primeira cena — legibilidade da FRASE, não da marca (isso é
              o Wash). Precisa vir DEPOIS do Wash (cobre vídeo+wash) e ANTES da
              FRASE (que tem que ficar por cima do dim) — a ordem de pintura é a
              ordem do DOM. Nasce opaco por CSS (`opacity-[0.62]`, ver o porquê
              do número no tween de saída, logo abaixo em useGSAP) e existe
              desde o mount: a cena entra escura e a luz só sobe, nunca pisca.
              Fora em reduced-motion pelo mesmo motivo da frase: sem pista não
              há primeira cena, e o still nasceria escuro sem nunca acender. */}
            {motion === true ? (
              <div
                ref={sceneDim}
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[#0B0D12] opacity-[0.62]"
              />
            ) : null}

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
            Fora em reduced-motion — o still já traz a Roberta desenhada.
            FORA ABAIXO DE 4/3 (mesmo gate do bloco do CTA, mesmo motivo): sem
            silhueta no quadro o recorte só contribui a quina do tablet — e ela
            pintava POR CIMA do "S" de "Sua próxima consulta" em 360px. Sem o
            recorte o texto passa NA FRENTE, que é o certo quando não há
            ninguém pra passar por trás. */}
          {motion === true && sources ? (
            <div
              ref={clipRoberta}
              className="pointer-events-none absolute inset-0 z-30 hidden opacity-0 [@media(min-aspect-ratio:4/3)]:block"
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

        A COSTURA É PRETA — e a única regra estável, depois de a coisa ter
        dado meia-volta DUAS vezes, é esta: ela fecha na cor DE QUE O FOOTER É
        FEITO. Nunca na do <body>. As duas voltas, porque cada uma parece um
        erro até você saber o que o rodapé era na época:

        1. Costura `#0E1016` + rodapé CREME → pé preto da cena encostado num
           card claro: degrau duro. Daí a BANDA DE EMERGÊNCIA (55vh subindo do
           preto ao creme + 24vh de noite sobrando = 79vh de gradiente vazio,
           que lia como página inacabada).
        2. Costura `#FAF9F5` + rodapé CREME → dissolve, e a banda morre sem ter
           o que resolver. Foi o mundo que este arquivo descreveu por um tempo.
        3. (hoje) Rodapé volta pra NOITE, agora como VIDRO PRETO sobre
           `#0E1016` — e o creme passa a ser o degrau. A costura acompanha:
           volta pro `#0E1016`, junto com o fundo do rodapé, na mesma placa.

        Quem pinta isso agora é a PLACA NOTURNA (primeiro filho do wrapper
        abaixo), não um gradiente solto: costura e fundo do rodapé viraram um
        elemento só, porque são a mesma cor por definição.

        24vh NÃO é gosto, é medido. É o que o `-mt` toma do palco, o que a
        sub-caixa devolve, e onde o gradiente da placa fecha. Pés medidos (%
        da altura do palco, timeline no fim): botão "Começar grátis" em 64.6
        (1920) / 67.7 (1440) / 69.2 (1280); pilha de cards em 75.1 (1920) /
        55.7 (1440) / 66.1 (1280). O pior caso é a pilha em 1920, a 75.1% — a
        costura nasce em 76% e passa raspando, com o topo dela em opacidade 0
        de qualquer forma. Mais que 24vh e a noite começa a subir pelo card de
        rotina; menos e a mescla encurta. */}
      {/* Regra desta caixa (o wrapper `-mt-[24vh]` inteiro): nada aqui pode
        passar do PÉ dele. Um absolute que ultrapassa o pai por baixo estica o
        scrollHeight do documento, e o que aparece nesse excedente é o creme do
        <body> — foi exatamente assim que nasceu a faixa branca embaixo do
        footer (o bloom era `h-[70vh]` a partir de `top-[16vh]`: 144+630 num
        wrapper de 646). Por isso todo absolute aqui dentro ancora em
        `bottom-0`, nunca em altura fixa. Passar do TOPO pode: crescer pra cima
        não mexe no scroll — é o que a flor faz.

        A COSTURA tem sub-caixa própria e mede EXATAMENTE os 24vh que o `-mt`
        tomou do palco. Não é coincidência, é a definição de "colado": ela
        inteira mora POR CIMA do pé da cena, custa 0vh de documento, e o card
        do footer começa no mesmo pixel em que o palco acaba. Os 24vh são
        também o número do gradiente — ele fecha no `#FAF9F5` em `24vh`, ou
        seja, no pé exato da sub-caixa: a mescla termina de pintar no instante
        em que o card entra. É por isso que os dois números têm que andar
        juntos; mexer num sem o outro ou recria vão (`-mt` menor que a caixa)
        ou deixa a mescla inacabada quando o card chega (gradiente mais longo
        que a caixa).

        A FLOR NÃO mora nessa sub-caixa — ela é filha DIRETA do wrapper, e é o
        que a deixa atravessar o footer. Ver o comentário dela. */}
      <div className="relative -mt-[24vh]">
        {/* A PLACA NOTURNA — um só elemento fazendo os dois trabalhos, porque
          são o mesmo trabalho: `transparent` no topo, `#0E1016` aos 24vh, e
          daí pra baixo SEGURA a cor (gradiente CSS mantém o último stop). Ou
          seja: nos primeiros 24vh ela é a COSTURA (a cena dissolve na noite,
          no pé exato do palco); do 24vh ao fim do wrapper ela é o FUNDO do
          rodapé. Uma peça, porque a cor de chegada da costura e a cor do
          rodapé têm que ser a mesma por definição — separá-las em dois
          elementos é convidar as duas a dessincronizar.

          POR QUE ELA É O PRIMEIRO FILHO: tudo aqui é positioned sem z-index,
          então pinta na ordem do DOM. A placa vem antes da FLOR de propósito —
          a flor passa POR CIMA dela e é isso que a deixa existir dentro do
          rodapé. Pintar esta noite mais embaixo (ex.: um bg no wrapper do
          card) tapa a flor: já foi feito, já quebrou.

          POR QUE NÃO NO WRAPPER: `bg` no `-mt-[24vh]` seria opaco desde o topo
          e comeria os últimos 24vh da cena. É o gradiente que resolve — ele
          nasce transparente exatamente onde a cena ainda precisa aparecer.

          É preta, e não creme, por uma razão só: a costura fecha na cor DE QUE
          O FOOTER É FEITO. O footer é vidro preto sobre `#0E1016`. Se ele
          voltar a ser claro, este é o número que muda — e o alvo é a cor dele,
          nunca a do <body>. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0,#0E1016_24vh)]"
        />

        {/* Sub-caixa VAZIA, e é de propósito: ela não pinta nada (quem pinta é
          a placa acima), só paga os 24vh que o `-mt` tomou do palco. Os dois
          números continuam atados (ver a regra acima) — e agora são TRÊS: o
          `-mt`, esta altura e o stop do gradiente da placa. Mexer num sem os
          outros recria vão, sobreposição, ou uma costura que acaba no lugar
          errado. */}
        <div className="relative h-[24vh]" />

        {/* A FLOR — a peça que ATRAVESSA a emenda. É o único elemento que
          existe dos dois lados dela: nasce na cena, cruza a mescla e mergulha
          ATRÁS do card do footer. É por isso que ela é filha DIRETA do wrapper
          e não da sub-caixa da costura — `bottom-0` aqui resolve contra o pé
          do FOOTER, não contra o fim da mescla, e é essa uma linha que a deixa
          entrar no rodapé. (Ela morou na sub-caixa enquanto a banda de
          emergência existia: naquele mundo o pé do wrapper ficava depois de
          55vh de gradiente claro, e sem a sub-caixa a flor vazaria por cima de
          um creme pro qual o asset — pensado pra fundo quase-preto — não foi
          feito. Sem banda, o pé do wrapper voltou a ser o pé do card, e a
          sub-caixa deixou de ter função pra ela.)

          A ORDEM DO DOM É O EFEITO INTEIRO, e são duas regras opostas de uma
          vez. DEPOIS da costura: elementos positioned sem z-index pintam na
          ordem do DOM, então a flor fica POR CIMA do gradiente creme e não é
          lavada por ele — ela sobrevive à mescla nítida enquanto a cena
          dissolve atrás, que é o que faz dela a âncora visual da emenda em vez
          de mais uma coisa que some. ANTES do footer: pelo mesmo mecanismo, o
          card (que é `relative`, ver o wrapper dele abaixo) pinta POR CIMA
          dela. Inverter qualquer um dos dois quebra um lado — a flor sumiria
          na mescla, ou passaria por cima do texto do rodapé.

          Ela aparece na FOLGA lateral do card (`mx-auto max-w-7xl`): 320px de
          cada lado em 1920, 80px em 1440, 12px em 1280. Quanto mais estreita a
          tela, mais o card a engole — degrada pra "flor só na cena", que é o
          comportamento certo, e não pra nada quebrado.

          `-top-[1vh]`: o topo do wrapper está em 76% do palco (o `-mt-[24vh]`),
          então -1vh planta a flor em 75%, exatamente onde ela já nascia antes
          desta seção. Não subir mais é deliberado: ela é `w-full`, pinta depois
          do palco (por cima de TUDO que é cena) e o `-scale-x-100` a joga na
          direita, que é a coluna do CTA — o pé do bloco do botão fica em
          64.6–69.2% conforme o viewport, então cada vh a mais que ela sobe
          começa a comer o "Começar grátis". Pra cima é seguro só até aqui. */}
        {/* SEM MÁSCARA — a flor vai inteira, e quem desenha TODAS as bordas
          é o alpha do PNG (`w-full`, altura livre, nada de `object-cover`, que
          era o que ceifava as pétalas em linha reta — bug antigo, documentado,
          já corrigido uma vez).

          O `mask-image` que morava aqui (fade pra transparent em 46%→74%)
          existia por UM motivo, e o motivo caiu. O asset tem base reta por
          construção — o prompt de geração pediu "base falls below the frame
          edge": ele foi feito pra SANGRAR pra fora do quadro, não pra terminar
          sozinho. Enquanto o rodapé era um card CREME, essa base aterrissava à
          vista na folga lateral, sobre um fundo pro qual o asset não foi feito;
          o fade a matava antes disso. Agora a folga é `#0E1016` (ver o bg do
          wrapper do footer) e o card é vidro: a flor tem o fundo quase-preto de
          que precisa, e atravessa o rodapé em vez de morrer antes dele.

          O `overflow-hidden` FICA, e agora ele é a feature, não o bug: ele corta
          no pé do wrapper, que é o pé do documento — exatamente a borda pra fora
          da qual o asset foi desenhado pra sangrar. Medido no asset atual
          (1600x893): a última linha ainda tem pixels em alpha 255 em ~6% das
          colunas, então a base RETA continua existindo — ela só deixou de ser
          visível porque cai fora da página.

          O QUE ISSO CUSTA: depende da flor transbordar a caixa. Ela é `w-full`,
          então a altura dela segue a LARGURA (h ≈ 0.558 × vw), enquanto a caixa
          segue 24vh + a altura do rodapé. Em telas largas e baixas (1920×1080:
          flor ~1072px contra caixa ~800px) sobra flor e o corte cai fora. Em
          telas estreitas e altas a conta pode inverter — aí a base reta pousa
          DENTRO da página. Se aparecer uma linha reta no pé da flor, é isto, e
          o conserto é no asset (dar base própria a ele), não em remascarar. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-[1vh] bottom-0 overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* `-scale-x-100`: o recorte reto do asset fica na ponta esquerda —
            espelhando, ele cai fora do lado que a cena mostra. */}
          <img src={CTA_FLOWER} alt="" className="absolute inset-x-0 top-0 w-full -scale-x-100" />
        </div>

        {/* `relative` senão o card fica ATRÁS do gradiente e da flor.
          SEM `pt`, e agora por um motivo mais forte que antes: `pt` aqui é
          literalmente o vão que o pedido veio matar. O `-mt-[16vh]` sobe o
          wrapper por cima do palco e a zona noturna consome esses 16vh por
          dentro (ver o comentário dela) — então este bloco JÁ começa no pé
          exato do palco. Qualquer padding aqui descola o card da cena, que é
          a única coisa que esta caixa não pode fazer.

          SEM bg próprio, e isso é uma regra, não um esquecimento: pintar a
          noite AQUI é o jeito errado, e custou uma volta. Este div é
          `relative` e vem DEPOIS da flor no DOM — qualquer fill opaco nele
          tapa a flor inteira no rodapé (é o mesmo mecanismo que faz o card
          pintar por cima dela, ver o comentário da flor). A noite mora na
          PLACA lá em cima, antes da flor. Aqui só o `relative`, que é o que
          põe o card na frente dela. */}
        <div className="relative">
          <Footer embedded />
        </div>
      </div>
    </>
  );
}

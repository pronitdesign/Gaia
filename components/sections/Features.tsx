"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { getTransitionProgress } from "@/lib/robertaTransition";
import { useAutoCycle } from "@/lib/useAutoCycle";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import {
  IconSparkles,
  IconCheck,
  IconClock,
  IconArrowUpRight,
} from "@/components/ui/icons";
import { MARINA, JOAO, CAIO, BIANCA, type Person } from "@/lib/people";

gsap.registerPlugin(ScrollTrigger, SplitText);

/* ── Features ──────────────────────────────────────────────────────────────
   Bento em camadas. TODO painel é vidro escuro frostado (mesma receita do
   "Como Começa" / Footer): gradiente preto denso, refração de luz interna no
   topo, sombra funda, blur+saturate. Conteúdo em branco translúcido.
   Cada cena tem card-fantasma atrás (profundidade) + satélites girados
   sangrando pra fora. Textura full-bleed nos três heróis; glow de marca
   atrás dos escuros pra dar ao vidro o que refratar.                        */

// Cards ficam PARADOS — sem lift/parallax no hover. A vida vem de dentro,
// de micro-interações autônomas que rodam sozinhas (ver mocks abaixo).
/* Grão fino (film grain) — a MESMA receita que o Manifesto e o Pricing já
   usam. Terceira cópia da string porque é assim que o projeto já a carrega;
   se um dia virar quatro, vale extrair pra lib/ (não fiz agora pra não tocar
   no Pricing, que está sendo editado em paralelo).

   A razão honesta é CONSISTÊNCIA, não milagre: as outras duas seções escuras
   do site têm grão e esta era a única sem, então ela lia como de outro material
   quando se rola de uma pra outra.

   Não espere mais que isso dele aqui. Medi ligado contra desligado nesta seção:
   ruído local 2,16 → 2,33, níveis distintos de cor 235 → 236. Quase nada — e a
   razão é a mesma física que limita o overlay: `soft-light` a 0,045 sobre um
   fundo de luminância ~12 praticamente não move o pixel. Em tela clara a mesma
   receita renderia muito mais.
   Se um dia o banding aparecer de verdade num gradiente desta seção, o
   caminho não é subir a opacity (a 0,08+ o grão vira sujeira visível) — é
   trocar soft-light por overlay NESTA peça. */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ── Elevação ──────────────────────────────────────────────────────────────
   Em tema escuro a sombra sozinha não levanta nada: o fundo da seção é #0A0C11
   e sombra preta sobre quase-preto não tem contraste pra existir. Quem faz o
   card virar objeto é a ARESTA DE LUZ (ver EdgeLight). A sombra entra como
   peso, e no mobile como separação entre cards empilhados.

   Duas sombras e não uma, porque fazem trabalhos diferentes: a larga (90px,
   quase toda espalhada) é a sombra ambiente, e a curta (30px) é a de contato,
   que ancora o card no fundo. Só a larga = o card flutua sem chão; só a curta
   = lê como adesivo colado.

   NÃO existe halo de cor atrás do card, e isso é decisão medida, não omissão.
   Houve uma versão com um: uma terceira sombra colorida por card (roxo no
   Antropometria, verde no Plano, âmbar no Exames...) vazando pro fundo da
   seção. Lia como amadora, e o número explica por quê — medido no bento do
   Zouti, que é a régua:

     fundo colado na borda do card vs. fundo na margem  →  +0,0 de 255
     vão entre os cards                                 →  rgb(0,4,10), o mesmo
                                                           preto da margem

   Zero. O card profissional pousa em preto chapado. A nossa versão com halo
   dava +29,5, e o vão entre os cards chegava a 57 de luminância contra 11,9 da
   margem: os vãos acendiam, e seis halos de cores diferentes viravam arco-íris.
   Luz de marca atrás do card é o atalho que denuncia o atalho.
   Onde a luz mora é DENTRO do card — Glow, Hotspot, EdgeLight. */

/* ── Grão ──────────────────────────────────────────────────────────────────
   A superfície de TODO card do bento. Substituiu a malha de pontos que vivia
   só nos dois sem foto — ponto é padrão geométrico, e padrão geométrico
   denuncia o CSS por mais que se mascare. Grão é material.

   DUAS ESCALAS, e é isso que faz a peça ler como premium em vez de chuvisco:

     GROSSO (baseFrequency 0.012, tile de 700px) — manchas largas e moles. É o
       que dá ao card ÁREAS mais escuras e outras mais claras, ou seja, um
       material que não é uniforme. Sozinho, o card já para de ser tinta.
     FINO (baseFrequency 0.85, tile de 140px) — o film grain da casa, a mesma
       receita do Manifesto e do Pricing. É o que quebra o banding do gradiente
       e dá a textura de perto.

   Uma escala só não resolve: o fino sozinho é sujeira uniforme (a mesma
   densidade em todo lugar), e o grosso sozinho é mancha sem material. Juntas
   viram superfície.

   A MÁSCARA É O INVERSO DA QUE ESTAVA AQUI, e a correção é o ponto da peça: a
   malha de pontos sumia perto da lâmpada, com a lógica de que "a luz estoura o
   relevo". Isso vale pra relevo alto sob luz forte — não pra grão. Grão é o
   material sendo revelado: no escuro não se vê textura nenhuma, é só preto. A
   luz é o que a torna visível. Então aqui o padrão é FORTE onde a lâmpada bate
   e desmaia (sem sumir — o piso é 0,15) na penumbra.

   `overlay` faz metade do trabalho sozinho, e é por isso que ele: overlay
   escurece o pixel escuro do ruído e clareia o claro, ou seja, ele É "áreas
   darkers e outras mais claras" por definição. E como overlay rende
   proporcionalmente à luminância do fundo, o grão já aparece mais onde o card
   está aceso — a máscara só reforça o que a física já faz.

   `at` é a mesma posição de lâmpada do Hotspot e do EdgeLight do card. Os três
   têm que concordar, senão a textura aparece do lado errado. */
const noise = (freq: number, oct: number, tile: number) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const GRAIN_COARSE = noise(0.012, 3, 700);
const GRAIN_FINE = noise(0.85, 2, 140);

/* Mesma turbulência do grão, DESSATURADA e em frequência baixíssima — em vez de
   textura de filme (grão fino), isto vira NUVEM: manchas moles de dezenas de px
   que não têm eixo nem repetição visível. Serve de máscara, não de tinta.
   O `feColorMatrix saturate 0` é obrigatório: fractalNoise gera R, G e B
   independentes, então sem ele a nuvem sai colorida e mancha o esmeralda de
   magenta/ciano quando usada como veio de cor. Como máscara só o alpha/luma
   importa, mas o navegador ainda precisa do canal uniforme pra `mask` de luma
   se comportar igual nos três. */
const cloud = (freq: number, oct: number, tile: number) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23c)'/%3E%3C/svg%3E")`;

/* Duas nuvens, frequências e ladrilhos PRIMOS entre si de propósito: usadas
   juntas (uma clareando, outra escurecendo) elas não podem cair em fase, senão
   o mottle vira listra e a irregularidade — que é o ponto todo — some. */
const CLOUD_SOFT = cloud(0.007, 4, 900);
const CLOUD_DEEP = cloud(0.011, 5, 640);

function Grain({ at }: { at: string }) {
  const fade = `radial-gradient(78% 78% at ${at}, #000 0%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.15) 100%)`;
  const base = "pointer-events-none absolute inset-0 z-10 mix-blend-overlay";
  return (
    <>
      {/* grosso primeiro: é o material. O fino pinta por cima dele. */}
      <div
        aria-hidden
        className={base}
        style={{ backgroundImage: GRAIN_COARSE, backgroundSize: "700px", opacity: 0.5, maskImage: fade, WebkitMaskImage: fade }}
      />
      <div
        aria-hidden
        className={base}
        style={{ backgroundImage: GRAIN_FINE, backgroundSize: "140px", opacity: 0.16, maskImage: fade, WebkitMaskImage: fade }}
      />
    </>
  );
}

/* Preenchimento em gradiente, não chapa: #1B2130 no topo caindo pra #13171F na
   base é a mesma tinta de antes (a média bate no #171C26 que já estava aqui),
   só que agora ACESA POR CIMA. Chapa lisa não tem direção de luz, e é o que
   fazia o card ler como retângulo recortado em vez de superfície.
   Sem `border`: quem desenha a silhueta é o EdgeLight, uma borda de 1px que É
   a luz. A sombra volta pra classe agora que não há mais halo inline pra
   sobrescrevê-la. */
const LIFT =
  "shadow-[0_40px_90px_-32px_rgba(0,0,0,0.95),0_14px_30px_-14px_rgba(0,0,0,0.75)]";

const CARD =
  "group relative isolate flex flex-col overflow-hidden rounded-[22px] " +
  "bg-gradient-to-b from-[#1B2130] to-[#13171F] " +
  LIFT;

const CARD_HERO = "group relative isolate flex flex-col overflow-hidden rounded-[22px] " + LIFT;

/* ── Aresta de luz ─────────────────────────────────────────────────────────
   A borda de 1px do card, mas com BRILHO VARIÁVEL: ela acende onde a lâmpada
   do card está e apaga girando em volta. Substitui duas peças que se
   contradiziam — a `border` de tinta uniforme (que é moldura desenhada, não
   luz) e a linha de rim light fixa no TOPO. Esta última era o erro grosso: eu
   pus a lâmpada de todo card na BASE (ver Hotspot) e a aresta continuava
   dizendo que a luz vinha de cima. Aresta que não concorda com a fonte não lê
   como luz, lê como contorno — e é isso que fazia o card parecer recortado por
   mais glow que se pusesse atrás.

   Como funciona: o elemento é um retângulo do tamanho exato do card com 1px de
   `padding`. O fundo dele é um radial-gradient centrado NA LÂMPADA. Aí duas
   máscaras se cancelam — uma cobre a caixa toda, a outra cobre só o miolo
   (content-box), e o `exclude` deixa passar apenas a diferença: a moldura de
   1px. O resultado é um anel que herda o gradiente, ou seja, aresta clara perto
   da fonte e quase invisível do lado oposto. É borda de verdade, não sombra:
   acompanha o raio sozinha e não invade o conteúdo.

   Precisa de `-webkit-` E do padrão: `mask-composite` usa vocabulário diferente
   nos dois (`xor` no WebKit, `exclude` no spec). Sem o par, Safari desenha o
   retângulo cheio no lugar da moldura.

   Vai DEPOIS do véu nos heróis — antes dele o escurecimento apagaria a aresta
   junto com a textura — e antes do conteúdo, que é `relative` e pinta acima de
   qualquer jeito. */
/* tone="light": o aro branco existe pra separar card escuro de fundo escuro.
   Sobre a gradiente pastel crua ele simplesmente some (branco sobre ~200 de
   luminância não é aresta). Aqui a aresta tem que ser sombra, não luz — mesmo
   desenho, tinta invertida. */
function EdgeLight({ at, tone = "dark", className = "" }: { at: string; tone?: "dark" | "light"; className?: string }) {
  const stops =
    tone === "light"
      ? "rgba(0,10,26,0.28) 0%, rgba(0,10,26,0.10) 42%, rgba(0,10,26,0.03) 100%"
      : "rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.22) 42%, rgba(255,255,255,0.07) 100%";
  return (
    <div
      aria-hidden
      className={"pointer-events-none absolute inset-0 rounded-[22px] " + className}
      style={{
        padding: "1px",
        background: `radial-gradient(70% 70% at ${at}, ${stops})`,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        maskComposite: "exclude",
      }}
    />
  );
}

/* ── Vidro (receita do Como Começa) ─────────────────────────────────────── */
const GLASS_BLUR = "backdrop-blur-2xl backdrop-saturate-150 transform-gpu";
/* Preto/58→/40 e não /80→/66: em 80% de tinta preta o blur não tinha o que
   refratar — o painel lia como recorte vazado, não como vidro sobre a cena.
   O aro e o realce de topo sobem junto (0.22 / 0.10) pra a peça continuar
   tendo aresta agora que o miolo é mais claro. */
const GLASS_DARK =
  "bg-gradient-to-b from-black/[0.58] to-black/40 " +
  "shadow-[0_30px_80px_-28px_rgba(0,0,0,0.92),inset_0_1px_0_0_rgba(255,255,255,0.22),inset_0_0_0_1px_rgba(255,255,255,0.10)]";
const GLASS = `relative overflow-hidden ${GLASS_BLUR} ${GLASS_DARK}`;

/* Mesmo vidro, tinta mais forte — pros 9 painéis que agora moram sobre gradiente
   pastel crua (MockPlano, MockQuestionarios e os 6 satélites do Prontuário).
   Não é preferência, é o mesmo cálculo do GLASS_DARK refeito com outro fundo:
   tinta PRETA translúcida não tem cor própria, ela mostra o que está atrás.
   black/0,58 sobre card escuro (~40 de luminância) dava painel em ~17–24; a
   MESMA receita sobre pastel (~200) dá 84–120 — o painel clareia 5× e o texto
   secundário de dentro (white/55) despenca pra ~3:1. Em 0,82→0,74 o painel volta
   pra ~36–52 e o white/55 passa em 4,97:1.
   E sim, isto contraria a nota do GLASS_DARK ("em 80% de tinta preta o blur não
   tem o que refratar, o painel lia como recorte vazado"). Aquilo foi medido
   sobre cena ESCURA, onde 20% de passagem é quase nada. Aqui os 18–26% que
   passam são de um pastel de 200 com variação de 148 a 232: sobra sinal de
   sobra pro blur refratar, e a gradiente continua atravessando o painel. */
const GLASS_ON_LIGHT =
  `relative overflow-hidden ${GLASS_BLUR} ` +
  "bg-gradient-to-b from-black/[0.82] to-black/[0.74] " +
  "shadow-[0_30px_80px_-28px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.22),inset_0_0_0_1px_rgba(255,255,255,0.10)]";

/* Houve aqui um GLASS_DEEP (vidro quase-opaco com bloom esmeralda) feito pros
   painéis do Questionários enquanto aquele card tinha foto verde acesa por
   baixo. Saiu junto com a foto: sobre superfície neutra escura o card usa o
   mesmo GLASS do Antropometria, que é o ponto — os dois heroes de cima leem
   como par. Receita especial só se justifica por fundo especial. */

/* GLASS_FROST (vidro branco translúcido) morava aqui e vestia os três satélites
   do Prontuário. Saiu junto com o véu escuro daquele card: tinta branca a 13%
   existia pra deixar a pétala ESCURA atravessar. Sobre a gradiente lilás crua
   (~200 de luminância) ela vira branco sobre branco — o satélite perde aresta e
   o texto claro de dentro desaba. Os três passaram a GLASS (vidro escuro), que
   é o que os outros mocks do bento já usavam: sobre fundo claro é o escuro que
   dá a peça, e o texto branco de dentro segue valendo. */

const FLOAT = "shadow-[0_34px_70px_-22px_rgba(0,0,0,0.7)]";

/* Camada com parallax por cursor (ver .gaia-parallax no globals).
   depth alto → reage mais ao cursor (satélites); rot mantém a inclinação
   de cada peça mesmo com o transform do parallax escrito inline.           */
const px = (depth: number, rot = 0) =>
  ({ ["--depth"]: depth, ["--rot"]: `${rot}deg` }) as CSSProperties;

/* tone="light" = card com a gradiente pastel por baixo, sob véu LEVE (0,27).
   Título e corpo caem os dois em `ink`, e isso não é desleixo — é o teto do
   sistema. A hierarquia aqui é serifada 1,5rem contra sans de corpo, não cor.

   Por que não `neutro-800` no corpo, que era mais claro e dava hierarquia: ele
   exige fundo acima de 147 de luminância pra passar 4,5:1. O véu que tira o
   ofuscamento derruba o pior ponto sob o texto pra ~130, e ali só `ink`
   (piso 122) aguenta. Foi escolher entre a cor do corpo e o brilho do card.

   Existe uma ZONA MORTA entre ~85 e ~122 de luminância: clara demais pro texto
   branco (white/55 exige fundo abaixo de 85), escura demais pro escuro. Nenhum
   card pode pousar ali — por isso o véu destes três é 0,27 e não "um pouco
   mais": em 0,45 eles cairiam no vão e nenhuma cor de texto funcionaria. */
function CardTitle({ tone = "dark", children }: { tone?: "dark" | "light"; children: ReactNode }) {
  return (
    <h3 className={"font-title text-[1.5rem] font-medium leading-[1.15] " + (tone === "light" ? "text-ink" : "text-neutro-0")}>{children}</h3>
  );
}

/* ── Swap — fade-through que mata o key-remount ───────────────────────────
   O bug que isto conserta: até aqui toda troca de conteúdo era `key={x}` +
   `.gaia-pop`/`.gaia-fade`. Com `key`, o React não atualiza o nó — ele
   DESMONTA o velho e MONTA o novo no mesmo commit. O conteúdo antigo não
   anima saindo, ele SOME num frame só, e só o que ENTRA tem fade. Metade da
   transição é corte seco — é a raiz do "flash de dado" que os mocks tinham
   (o marcador do MockExames deslizando 900ms ao lado de um nome que já
   trocou há um frame).

   A troca é capturada DURANTE O RENDER (`if (k !== cur.k) { setPrev(cur); ... }`
   abaixo), não num `useEffect` — é o padrão que o próprio React documenta
   pra derivar estado de uma mudança de prop: ajustar o estado NO MESMO
   commit em que a prop muda evita o frame órfão em que o conteúdo velho já
   não é `cur` mas ainda não virou `prev`. Um efeito rodaria um tick tarde
   demais e esse frame perderia a saída.

   As duas janelas NÃO se sobrepõem, de propósito — é a diferença entre isto
   e um crossfade comum. Crossfade sobrepondo saída e entrada funciona bem
   quando o conteúdo é o MESMO dado mudando de estado; aqui cada ciclo troca
   de SIGNIFICADO ("Hemoglobina" → "Glicose", um paciente por outro), e duas
   palavras diferentes co-existindo por 100-200ms lê como texto fantasma
   duplicado, não como transição. Por isso a saída (200ms) termina, sobra um
   vão mudo de ~20ms sem nenhum dos dois visível, e só então a entrada
   (340ms) começa aos 220ms. Total ~560ms.

   Saída mais curta e mais seca que a entrada (200ms, só opacity+blur, sem
   deslocamento) contra a entrada (340ms, opacity+translateY+blur): saída
   nunca deve competir por atenção com quem está chegando — o olho já sabe
   que aquilo vai embora, não precisa de encenação, só precisa desocupar.

   `display:grid` com os dois filhos em `gridArea: 1 / 1`: os dois ocupam o
   MESMO retângulo ao mesmo tempo, inclusive no vão mudo dos 20ms em que
   nenhum está visível — sem isso o container mediria só quem está presente
   e a troca faria a altura pular (reflow) toda vez que o texto de uma linha
   virasse duas.

   Convenção de uso (não imposta pelo componente, decidida caso a caso nos
   9 call-sites deste arquivo): `className` carrega só POSIÇÃO/TAMANHO/CHROME
   visual (absolute, margin, GLASS, rounded, sombra — nada que declare
   `display` flex/grid) porque isso fica FORA do grid interno, no wrapper que
   persiste entre prev e cur. Qualquer alinhamento interno (flex, gap,
   justify) que o conteúdo precise vai num `<div>` DENTRO de `children` —
   nunca na própria Swap — porque a Swap já é `grid` por dentro; um
   `className="flex ..."` aqui colidiria com o `gridArea` dos dois filhos e
   quebraria a sobreposição.

   `reducedMotionRef` é lido de um `useEffect([])` que roda no MOUNT, antes
   de qualquer troca real (a primeira troca só acontece quando `k` muda num
   render POSTERIOR ao mount) — dá pra confiar nele dentro do bloco de render
   sem chamar `matchMedia` no SSR (onde `window` não existe) e sem o import
   de `useLayoutEffect`, que a zona de exclusão deste arquivo não libera.

   CICATRIZ (P0 medido em produção, não hipotético): a primeira versão desta
   peça tinha os DOIS timers — o da saída (`setPrev(null)`, 200ms) e o da
   entrada (`setCurIn(true)`, 220ms) — no MESMO `useEffect`, dependente de
   `[prev]`. Aos 200ms o `exitTimer` chamava `setPrev(null)`; como `prev` é a
   PRÓPRIA dependência do efeito, o React rodava o CLEANUP dele antes de
   aplicar a próxima renderização — e o cleanup dava `clearTimeout(enterTimer)`
   uns 20ms antes de ele disparar. `setCurIn(true)` nunca acontecia:
   `curIn` ficava em `false` PRA SEMPRE, e o conteúdo que tinha acabado de
   entrar renderizava com opacity:0 ESTÁVEL, não em transição — medido com
   getComputedStyle no MockExames (ciclo de 3,2s): o laudo inteiro sumia a
   cada poucas trocas, sempre que a corrida saía do jeito errado. Um timer
   cujo trabalho é a ENTRADA não pode morar num efeito cuja dependência é a
   SAÍDA: a saída se autodestrói ao terminar (é o que `setPrev(null)` faz) e
   leva a entrada junto no mesmo cleanup. O conserto é dois efeitos
   SEPARADOS: o da saída depende de `[prev]` (cuida só de si); o da entrada
   depende de `[cur.k]` (reinicia exatamente quando uma troca nova começa, e
   seu cleanup só roda na PRÓXIMA troca — nunca no meio do caminho da troca
   atual). A próxima pessoa vai querer juntar os dois de novo pra "simplificar"
   — não junte. */
function Swap({ k, children, className = "" }: { k: string | number; children: ReactNode; className?: string }) {
  const [cur, setCur] = useState<{ k: string | number; node: ReactNode }>({ k, node: children });
  const [prev, setPrev] = useState<{ k: string | number; node: ReactNode } | null>(null);
  const [curIn, setCurIn] = useState(true);
  const [prevOut, setPrevOut] = useState(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Ajuste de estado NO RENDER (ver comentário acima) — dispara na hora em
  // que `k` muda, antes do commit.
  if (k !== cur.k) {
    if (reducedMotionRef.current) {
      // troca instantânea, sem prev, sem animação
      setCur({ k, node: children });
      setPrev(null);
      setCurIn(true);
    } else {
      setPrev(cur);
      setCur({ k, node: children });
      setCurIn(false);
      setPrevOut(false);
    }
  }

  // SAÍDA — só cuida do `prev`. Dispara o frame de saída e desmonta ao
  // terminar. NÃO mexe em `curIn`: ver a cicatriz no comentário do topo.
  useEffect(() => {
    if (!prev) return;
    // Um frame de distância do mount: se a saída nascesse já no estado final
    // no mesmo paint, o navegador nunca veria o estado inicial (opacity 1) —
    // não existe transição sem dois frames diferentes pra interpolar entre
    // eles.
    const raf = requestAnimationFrame(() => setPrevOut(true));
    // Desmonta ao terminar — 200ms é a duração inteira da saída.
    const exitTimer = window.setTimeout(() => setPrev(null), 200);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(exitTimer);
    };
  }, [prev]);

  // ENTRADA — efeito SEPARADO, keyado em `cur.k`, imune ao `prev` virar
  // null (ver a cicatriz no comentário do topo). No mount, `curIn` já nasce
  // `true` e este timer só o reafirma (inofensivo).
  useEffect(() => {
    const enterTimer = window.setTimeout(() => setCurIn(true), 220);
    return () => window.clearTimeout(enterTimer);
  }, [cur.k]);

  return (
    <div className={"grid " + className}>
      {prev && (
        <div
          aria-hidden
          style={{
            gridArea: "1 / 1",
            pointerEvents: "none",
            opacity: prevOut ? 0 : 1,
            filter: prevOut ? "blur(2px)" : "blur(0px)",
            transition: "opacity 200ms cubic-bezier(0.4,0,1,1), filter 200ms cubic-bezier(0.4,0,1,1)",
          }}
        >
          {prev.node}
        </div>
      )}
      <div
        style={{
          gridArea: "1 / 1",
          opacity: curIn ? 1 : 0,
          transform: curIn ? "translateY(0)" : "translateY(4px)",
          filter: curIn ? "blur(0px)" : "blur(3px)",
          transition: "opacity 340ms ease-out, transform 340ms ease-out, filter 340ms ease-out",
        }}
      >
        {cur.node}
      </div>
    </div>
  );
}

/* O tom "hero" (white/70) existe pros cards com FOTO escura por baixo, onde
   white/55 não segura contraste: medido com o corpo real (não branco puro),
   os três cards de textura reprovam AA em white/55 (2,87 / 2,90 / 3,64) — e o
   Questionários reprova até em branco puro no pior caso local (3,34:1), porque
   a faixa clara da imagem cai bem na zona do texto. `hero` (white/70) é o piso
   que os três exigem.

   Ter foto embaixo NÃO implica `hero` — o gatilho é o contraste medido, não a
   presença da textura: se um card com foto desse contraste de sobra em
   white/55, ficaria em `dark` como qualquer outro. Antropometria, Exames e
   Agenda continuam em `dark` porque não têm foto — ficam sobre o gradiente
   chapado do CARD, onde white/70 destoaria dos vizinhos. Antes de mudar o tom
   de qualquer card, meça: os números calculados a partir do crop erraram feio
   contra o render. */
function CardBody({ tone = "dark", children }: { tone?: "dark" | "light" | "hero"; children: ReactNode }) {
  const cls =
    tone === "light" ? "text-ink" : tone === "hero" ? "text-white/70" : "text-white/55";
  return (
    <p className={"mt-3 max-w-md font-body text-body " + cls}>
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

/* Retrato quando a pessoa tem foto, iniciais quando não tem — a mesma peça nos
   dois casos, então o aro de luz e o raio não mudam de gramática no meio da
   lista. O retrato ganha aro interno PRÓPRIO (inset ring) em vez do realce de
   topo: sobre foto, um brilho só no topo lê como reflexo torto; o aro fechado
   lê como a moldura que as outras peças de vidro do card já têm.
   Decorativo — o nome vem escrito ao lado em toda chamada, então alt="". */
function Avatar({ person, className = "" }: { person: Person; className?: string }) {
  if (person.photo) {
    return (
      <span className={"relative shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] " + className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" src={person.photo} alt="" aria-hidden className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span className={"grid shrink-0 place-items-center rounded-full bg-white/15 font-title font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] " + className}>
      {person.init}
    </span>
  );
}

/* Realce difuso — uma mancha branca borrada que SATURA o que está embaixo dela.

   Mora na camada MAIS ALTA do card (z-10, acima do conteúdo), e é isso que faz
   a peça existir. Ela já morou atrás do painel, com outro papel ("o que o vidro
   refrata"), e ali não fazia nada: overlay mistura com o que já foi pintado
   ABAIXO dele, e abaixo só havia o gradiente chapado do card. Por cima, o que
   ele encontra é a foto, o vidro e o dado — que é onde há cor pra saturar.
   O `isolate` no card existe por causa deste z-10: sem contexto de empilhamento
   próprio, o z escaparia e a mancha pintaria sobre os cards vizinhos.

   Quem satura é o `backdrop-filter`, NÃO o blend. Isto é medido, e derruba a
   intuição mais natural do mundo: uma mancha branca em `mix-blend-overlay` por
   cima do card não satura NADA. Medi ligado contra desligado, com os ciclos
   congelados — saturação média 0,2640 → 0,2639, ou seja +0,0%; só a luminância
   subia (30 → 34). E não é questão de calibrar alpha: sobre fundo escuro o
   overlay faz `2 × fundo`, que multiplica os três canais IGUALMENTE. A razão
   entre R, G e B não muda, logo a saturação não PODE mudar. Branco em overlay
   é matematicamente incapaz de saturar.

   `backdrop-filter: saturate()` faz o que o blend não faz: ele reprocessa o que
   já está pintado atrás, empurrando a cor pra fora do cinza. O âmbar do Exames
   fica mais âmbar, o verde do pepino mais verde — e sem adicionar tinta
   nenhuma, que é o requisito. Um pingo de `brightness` junto porque saturação
   pura escurece a percepção do miolo.

   Por isso a peça mora na camada MAIS ALTA do card (z-10, acima do conteúdo):
   backdrop-filter só reprocessa o que foi pintado ABAIXO dele. Ela já morou
   atrás do painel, com outro papel ("o que o vidro refrata"), e ali só
   encontrava o gradiente chapado do card — nada pra saturar. O `isolate` no
   card existe por causa deste z-10: sem contexto de empilhamento próprio, o z
   escaparia e a mancha agiria sobre os cards vizinhos.

   SEM `blur` no filtro, e isto é uma cicatriz: a primeira versão desta peça
   levava `blur()` junto do saturate, herdado de quando ela vivia ATRÁS do
   painel. Estando por cima, o backdrop dela é o CONTEÚDO — e o "72,8 kg", as
   linhas do Questionários e os nomes da Agenda saíram borrados na tela. Peça
   que mora em cima só pode reprocessar COR (saturate, brightness); qualquer
   coisa que mexa em nitidez ali destrói o texto. Os números não pegaram isso,
   o screenshot pegou.

   A forma vem de MÁSCARA. backdrop-filter age na caixa inteira e não tem borda
   macia própria — sairia um retângulo saturado com quina viva. A máscara radial
   desliga o efeito gradualmente, e é ela que faz a peça ser mancha em vez de
   recorte.

   Sem prop de cor, de propósito: houve uma versão colorida (roxo no
   Antropometria, roxo + sage na Agenda) e ela saiu — tinta pintaria os seis
   cards da mesma cor de marca e cada foto perderia a própria. Aqui não há cor
   pra passar: a peça só intensifica a que o card já tem. */
function Glow({ className = "" }: { className?: string }) {
  const fade = "radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.75) 45%, transparent 100%)";
  const f = "saturate(1.55) brightness(1.06)";
  return (
    <div
      aria-hidden
      className={"pointer-events-none absolute z-10 rounded-full " + className}
      style={{
        backdropFilter: f,
        WebkitBackdropFilter: f,
        maskImage: fade,
        WebkitMaskImage: fade,
      }}
    />
  );
}

/* Ponto quente — a FONTE de luz do card. Não é um Glow mais forte: o Glow é a
   mancha ambiente COLORIDA que enche o card de cor pro vidro ter o que refratar,
   e por isso é larga, chapada e fraca. Este é uma lâmpada, e lâmpada faz o
   contrário de tingir — ela acende o que já está ali.

   BRANCO, não roxo, e essa é a decisão inteira desta peça. Luz roxa PINTA de
   roxo: o pepino do Plano ficava roxo, o âmbar do Exames virava magenta, e os
   seis cards viravam a mesma cena lavada da cor da marca. Luz branca só soma
   luminância — o pepino fica um pepino mais aceso, o âmbar um âmbar mais aceso,
   o vidro escuro um vidro mais aceso. A luz ACOMPANHA o design de cada card em
   vez de impor um por cima. Quem carrega a cor da marca aqui já são os Glows;
   a lâmpada não precisa repetir o recado.

   `plus-lighter` e não `screen`: os dois somam luz, mas screen é assintótico
   (nunca chega ao branco, comprime tudo perto do topo) e plus-lighter é soma
   reta — backdrop + fonte×alpha. É a matemática de dois feixes de luz caindo no
   mesmo ponto, então o núcleo estoura de verdade e a queda é linear, que é como
   o olho espera que luz se comporte. Em compensação ele CLIPA: por isso os
   alphas abaixo são baixos (0,28 no miolo, não 0,55). Com valor de cor puro o
   card viraria um borrão branco.

   `ellipse closest-side` não é detalhe — é o que separa ponto de mancha, e
   custou uma rodada de screenshot pra achar. O padrão do CSS é `farthest-corner`:
   o raio vira a DIAGONAL da caixa, então numa caixa de 288px a luz tinha raio 204
   e vazava ~310px de diâmetro — maior que a própria caixa que eu escrevi, e sem
   núcleo, porque as paradas de cor ficavam esticadas. Lia como nuvem, não como
   lâmpada. Com `closest-side` o raio é a meia-largura/meia-altura: a caixa É a
   luz, o que eu escrevo é o que aparece, e as paradas se concentram — núcleo
   apertado, queda longa. `ellipse` (e não `circle`) porque aí caixa não-quadrada
   vira elipse de graça: é o que o Prontuário precisa pra a luz escapar dos dois
   lados do phone.

   Uma por card. O que varia é ONDE ela nasce — nunca a cor, que é sempre a
   mesma luz branca. Vira gramática (a mesma coisa acontecendo em seis lugares)
   em vez de seis enfeites diferentes.
   Como o Glow, mora SEMPRE atrás do conteúdo e, nos heróis, depois do véu. */
function Hotspot({ className = "", rgb = "255,255,255" }: { className?: string; rgb?: string }) {
  return (
    <div
      aria-hidden
      className={"pointer-events-none absolute mix-blend-plus-lighter " + className}
      style={{
        background: `radial-gradient(ellipse closest-side, rgba(${rgb},0.4) 0%, rgba(${rgb},0.22) 26%, rgba(${rgb},0.07) 52%, transparent 76%)`,
        // Blur pequeno de propósito: o gradiente já É a queda. Isto aqui só
        // mata o banding das faixas em tela escura, sem derreter o núcleo.
        filter: "blur(24px)",
      }}
    />
  );
}

/* ═══════════════ PLANO ALIMENTAR ═══════════════ */
/* Foto real de cada prato — os mesmos arquivos de 160×160 que a aba "Plano"
   da tela do iPhone usa (ver MEALS em PhoneScreen). Uma refeição por foto:
   dá pra reconhecer o prato antes de ler a linha, que é o ponto do baralho. */
/* Duas descrições por refeição, e não é redundância: `food` é a longa, que a
   carta do baralho mostra em duas linhas (line-clamp-2); `short` é a que a
   LISTA do painel usa, onde a linha é única e truncada. Com a longa na lista
   o truncate cortaria em "Ovos mexidos com aveia em flocos, mamão papa…" e
   comeria o dado no lugar do enfeite. Mesma razão pela qual o PhoneScreen tem
   `detail` próprio: superfície diferente, orçamento de linha diferente.
   `c` é a espinha colorida da linha — só a lista usa (no baralho quem
   identifica o prato é a foto).
   `carb`/`gord` completam o `prot` que já existia (a etiqueta do baralho
   só precisa de proteína). Os três por refeição SOMAM os totais que já
   estavam hardcoded no card — 112 / 168 / 47 g, 327 g no total — porque é
   isso que a tag "somou pela TACO" alega: se o número da barra não é a
   soma real destes três, a tag mente. MockPlano deriva os totais daqui,
   não os declara de novo. */
const PLANO_MEALS = [
  { img: "/plano-cafe.webp", t: "07:30", n: "Café da manhã", food: "Ovos mexidos com aveia em flocos, mamão papaia e café sem açúcar", short: "Ovos mexidos, aveia e mamão", kcal: 410, prot: 24, carb: 52, gord: 13, c: "#A385C0" },
  { img: "/plano-almoco.webp", t: "12:30", n: "Almoço", food: "Frango grelhado, arroz integral e salada de folhas com azeite", short: "Frango grelhado, arroz e salada", kcal: 620, prot: 46, carb: 72, gord: 18, c: "#95A9C4" },
  { img: "/plano-jantar.webp", t: "20:00", n: "Jantar", food: "Salmão assado com legumes no vapor e purê de abóbora", short: "Salmão assado e legumes", kcal: 480, prot: 42, carb: 44, gord: 16, c: "#8B9E6F" },
];

/* Baralho de refeições — a refeição da vez fica na frente; as outras espiam
   por cima do ombro dela e vão pro fim da fila quando a vez passa. `rank`
   (0 = frente) é a distância na fila a partir do índice ativo, e é ele — não
   o índice do array — que decide posição, escala, opacidade e z-index. Assim
   cada nó só transiciona de um rank pro outro e o React nunca remonta nada:
   a pilha inteira desliza numa transform só.

   A pilha é DIAGONAL (sobe e vai pra direita), não só vertical: com offset em
   Y puro as cartas de trás só mostram uma faixa fina no topo e a pilha lê
   como sombra da carta da frente. Com o passo em X junto, a beirada direita
   também aparece e as fotos formam escadinha — a carta de trás vira objeto,
   não borrão.

   Âncora em bottom-0 + origin "center bottom": a escala encolhe a carta em
   direção à base, que fica cravada, então o translate negativo em Y é o que
   sobra de espiada visível no topo. Sem isso a escala comeria justamente a
   beirada que faz a pilha ser lida como pilha — e ela ainda come parte: a
   espiada real é `DECK_DY - altura×0,028` por rank, e em X é
   `DECK_DX - largura×0,028/2` (origin é o centro, então o lado direito só
   perde METADE do que a escala tira). Por isso a escala é suave e os passos
   são generosos: com 5% a espiada caía pra ~9px.

   Carta opaca, e é a única peça do card que não é vidro: precisa OCLUIR quem
   está atrás, senão as três fotos se somam num borrão e a pilha vira sopa.
   Vidro aqui também empilharia três backdrop-blur num ponto só — caro e
   turvo. É o mesmo que a referência faz: as cartas do baralho são chapadas,
   o resto da cena é que é translúcido. */
/* DY é medido, não escolhido por gosto: a espiada tem que passar da linha de
   base do título da carta de trás (py-3.5 = 14px + ~18px de linha = 32px),
   senão o corte cai no meio das letras e a pilha lê como texto quebrado em
   vez de carta atrás. 38 - altura×0,028 (~3,6px) ≈ 34px de espiada real:
   título inteiro, e só ele. */
const DECK_DX = 14;
const DECK_DY = 38;

/* Botão "+" da carta da frente — adicionar refeição ao plano. Decorativo
   (a cena inteira é mock), então <span>, não <button>: nada aqui recebe
   foco nem responde a clique. */
function IconPlus({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M6 2.5v7M2.5 6h7" />
    </svg>
  );
}

/* `dealt` = o leque já abriu. Antes dele TODA carta desenha na posição da
   frente: as três nascem empilhadas coladas e se abrem pros ranks reais
   quando o card entra — dar as cartas é a assinatura de entrada deste card.
   Nada disso é um estado novo: é o MESMO transform de 700ms do embaralhamento
   saindo de um ponto de partida diferente, e o véu (que também é rank) escurece
   as de trás no mesmo movimento em que elas recuam.
   O rank REAL continua mandando no z-index mesmo com o leque fechado — senão
   as três empatariam em z e a ordem do DOM decidiria, deixando a última carta
   do array na frente até a abertura. Aí o leque leria como embaralhamento
   (carta errada saindo da frente), não como baralho sendo aberto. Com o z
   certo desde o frame 0, a carta da frente simplesmente não se mexe: as
   outras duas é que saem de trás dela. */
function MealDeck({ front, dealt }: { front: number; dealt: boolean }) {
  const n = PLANO_MEALS.length;
  return (
    // Altura fixa: o palco do baralho é quem dimensiona o card-herói, e ele
    // não pode respirar junto com o texto. DECK_DY × (n-1) = 76px de headroom
    // pras cartas de trás + a carta da frente (~130px com a foto sangrando
    // 12px pra cima). Os -mr/-ml não existem: quem sangra pra fora é a foto e
    // o "+", e eles cabem no px-7/px-9 do MockPlano.
    <div className="relative h-[212px]">
      {PLANO_MEALS.map((m, i) => {
        const rank = (i - front + n) % n;
        const isFront = rank === 0;
        const spread = dealt ? rank : 0; // leque fechado até o card entrar
        return (
          <div
            key={m.n}
            // O recuo à direita é a folga que a pilha precisa pra crescer: a
            // carta do fundo anda DECK_DX × (n-1) = 28px pra direita, e o
            // card-herói é overflow-hidden — sem recuo a foto dela levaria um
            // corte reto na borda. Medido em 390px (o pior caso): sobram 26px
            // entre a foto mais à direita e a borda do herói.
            className="absolute bottom-0 left-0 right-[18px] transition-transform duration-[700ms] ease-gaia"
            style={{
              transform: `translate(${spread * DECK_DX}px, ${spread * -DECK_DY}px) scale(${1 - spread * 0.028})`,
              transformOrigin: "center bottom",
              zIndex: n - rank,
            }}
          >
            {/* corpo — pr abre a calha da foto, que é absoluta e mora fora
                deste nó (o corpo tem overflow-hidden pro véu respeitar o raio;
                a foto e o "+" precisam sangrar, então vivem no wrapper). */}
            <div className="relative overflow-hidden rounded-[16px] bg-[#1A2029] py-3.5 pl-4 pr-[104px] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.10),inset_0_0_0_1px_rgba(255,255,255,0.07)] md:pr-[116px]">
              <p className="truncate font-title text-[15px] font-medium leading-tight text-white">{m.n}</p>
              {/* min-h de duas linhas: a carta é bottom-anchored, então texto
                  de altura variável faz ela crescer PRA CIMA e bater no
                  cabeçalho da Marina. Travar em 2 linhas mantém a geometria
                  igual em 390px (onde a linha quebra) e em desktop. */}
              <p className="mt-1.5 line-clamp-2 min-h-[34px] font-body text-[12px] leading-[1.42] text-white/50">{m.food}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="font-title text-[15px] font-medium tabular-nums text-white">{m.kcal} kcal</span>
                <span className="flex items-center gap-1.5 font-body text-[11.5px] tabular-nums text-white/45">
                  <IconClock className="h-3.5 w-3.5" />
                  {m.t}
                </span>
              </div>
              {/* Véu — é ELE que recolhe a carta pro fundo, não a opacidade da
                  carta. Parece a mesma coisa parado e não é em movimento: com
                  `opacity` no card, durante os 700ms do embaralhamento as três
                  cartas ficam translúcidas AO MESMO TEMPO, e a que entra (ainda
                  em ~0,7) deixa ler o texto da que está saindo por baixo dela.
                  O véu mantém toda carta 100% opaca sempre — só escurece. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[#0A0C11] transition-opacity duration-[700ms] ease-gaia"
                style={{ opacity: spread * 0.36 }}
              />
            </div>

            {/* foto — mais alta que o corpo e colada na direita: sangra 12px
                pra cima e passa da beirada. É o que faz a carta parecer um
                objeto montado em vez de uma linha de lista com thumbnail.
                Decorativa: o nome da refeição ao lado já diz o que ela é.
                Véu próprio, com o mesmo rank — o do corpo não alcança aqui. */}
            <span className="absolute -top-3 bottom-0 right-0 w-[92px] overflow-hidden rounded-[14px] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.12)] md:w-[104px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={m.img} alt="" aria-hidden className="h-full w-full object-cover" />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[#0A0C11] transition-opacity duration-[700ms] ease-gaia"
                style={{ opacity: spread * 0.36 }}
              />
            </span>

            {/* etiqueta de proteína — monta na quina da foto, meio dentro do
                corpo. Só a carta da frente mostra ela e o "+": nas de trás o
                véu deixaria os dois num limbo cinza, sem virar fundo de vez. */}
            <span
              className="pointer-events-none absolute -top-1.5 right-[76px] z-10 inline-flex items-center gap-1.5 rounded-full bg-[#1b2029] px-2.5 py-1 font-body text-[11px] font-medium tabular-nums text-sage-200 shadow-[0_8px_18px_-6px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.10)] transition-opacity duration-[700ms] ease-gaia md:right-[88px]"
              style={{ opacity: isFront ? 1 : 0 }}
            >
              {m.prot} g prot
            </span>

            <span
              className="pointer-events-none absolute -bottom-2 -right-2 z-10 grid h-8 w-8 place-items-center rounded-[11px] bg-white text-[#14181f] shadow-[0_10px_22px_-6px_rgba(0,0,0,0.85)] transition-opacity duration-[700ms] ease-gaia"
              style={{ opacity: isFront ? 1 : 0 }}
            >
              <IconPlus className="h-3.5 w-3.5" />
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Soma os três macros de uma refeição — usado tanto pro header da barra
// (Café · 89 g) quanto, implicitamente, pros 327g totais (soma de soma).
const mealMacroTotal = (m: (typeof PLANO_MEALS)[number]) => m.prot + m.carb + m.gord;

function MockPlano() {
  // Totais derivados de PLANO_MEALS, não hardcoded: 112/168/47 (327 no
  // total) são a SOMA real dos três pratos, não número solto — é o que a
  // tag "somou pela TACO" alega. A largura de cada segmento da barra
  // (`m.g / totalG`, calculada onde ela é usada) sai proporcional aos
  // gramas de verdade — 34,3 / 51,4 / 14,4% — não mais 30/48/22 fixo.
  const totals = {
    prot: PLANO_MEALS.reduce((s, m) => s + m.prot, 0),
    carb: PLANO_MEALS.reduce((s, m) => s + m.carb, 0),
    gord: PLANO_MEALS.reduce((s, m) => s + m.gord, 0),
  };
  const totalG = totals.prot + totals.carb + totals.gord;
  const macros = [
    { field: "prot" as const, k: "Prot", g: totals.prot, c: "bg-brand" },
    { field: "carb" as const, k: "Carbo", g: totals.carb, c: "bg-azul-400" },
    { field: "gord" as const, k: "Gord", g: totals.gord, c: "bg-sage-400" },
  ];

  const [i, ref, entered] = useAutoCycle(PLANO_MEALS.length, 3600);
  const frontMeal = PLANO_MEALS[i];

  // Lido no corpo do render, não em state — mesmo motivo do `reducedMotionRef`
  // do <Swap> (comentário lá em cima): o efeito de mount roda ANTES de
  // qualquer troca real do `i` (essa só vem do IntersectionObserver do
  // useAutoCycle, sempre pós-mount), então dá pra confiar no ref sem
  // `matchMedia` no SSR nem um re-render extra por ciclo.
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  // TAREFA 2e — com motion reduzido a barra fica no agregado puro (sem
  // fatia, sem cross-fade, "327 g" fixo); `entered` cobre a 2f (nada anima
  // fora de tela). As duas condições vivem numa flag só porque toda peça
  // dinâmica da barra (fatia + header) liga e desliga junto.
  const showMealView = entered && !reducedMotionRef.current;

  // ASSINATURA — dar as cartas. O leque só abre 420ms depois do card entrar:
  // é o tempo do painel de cima assentar (a transição do .gaia-parallax é de
  // 600ms). Aberto junto, os dois movimentos acontecem no mesmo instante e o
  // olho não sabe pra onde olhar; aberto depois, a cena tem duas batidas —
  // a ficha da Marina pousa, e AÍ o baralho se abre embaixo dela.
  const [dealt, setDealt] = useState(false);
  useEffect(() => {
    if (!entered) return;
    // Sem movimento o baralho nasce aberto — o atraso aqui é encenação, e
    // encenação sem animação é só a cena chegando errada e tarde.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDealt(true);
      return;
    }
    const t = window.setTimeout(() => setDealt(true), 420);
    return () => window.clearTimeout(t);
  }, [entered]);

  return (
    // pb: o baralho agora mora no rodapé, e o "+" da carta da frente sangra
    // 8px abaixo do palco. Peça absoluta que sangra não entra na altura do
    // container, então sem padding o card fechava em 993px com 1011px de
    // conteúdo e o overflow-hidden do CARD_HERO decepava o "+" (medido: 18px
    // fora da borda em 1440px). Alinha com o pb-7/pb-8 dos outros mocks.
    <div ref={ref} className="relative mt-8 flex-1 px-7 pb-8 md:px-9 md:pb-9">
      {/* CENTRO — a ficha da Marina num painel só: quem, as três refeições e
          os macros do dia. É a leitura de dados do plano, densa e parada.
          O baralho NÃO mora aqui: ele é a mesma informação com foto, e as
          duas coisas juntas no meio brigavam. Aqui a lista; embaixo, solto,
          o baralho.
          Painel reto de propósito (rot 0) — o desalinho da cena é trabalho
          do baralho diagonal embaixo, não deste painel. 1° aqui derruba o
          lado direito ~14px, e é onde moram os números ("1.510 kcal",
          "410", "620"): torto, eles leem como bug de alinhamento, não como
          composição. */}
      <div data-enter-delay={0} style={px(0.4)} className={"gaia-parallax relative z-10 rounded-[18px] p-4 " + GLASS_ON_LIGHT + " " + FLOAT}>
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
          <Avatar person={MARINA} className="h-9 w-9 text-[13px]" />
          <div className="min-w-0 flex-1">
            <p className="font-title text-[15px] font-medium text-white">Plano · Marina</p>
            <p className="font-body text-[11.5px] text-white/50">Seg a sex · 3 refeições</p>
          </div>
          <Pill className="shrink-0 tabular-nums text-sage-200">1.510 kcal</Pill>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {PLANO_MEALS.map((m) => (
            <div key={m.n} className="flex items-center gap-3 py-2.5">
              <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: m.c }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-body text-[11px] tabular-nums text-white/40">{m.t}</span>
                  <span className="font-body text-[12.5px] font-medium text-white/90">{m.n}</span>
                </div>
                <p className="truncate font-body text-[12px] text-white/50">{m.short}</p>
              </div>
              <span className="shrink-0 font-body text-[12px] tabular-nums text-white/70">{m.kcal}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-[12px] bg-white/[0.06] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-body text-[11px] font-medium text-white/70">Macros do dia</span>
            {/* Cross-fade curto: o baralho nunca para, então o lado direito
                nunca "descansa" em 327g durante o movimento normal — mostra
                sempre a refeição da carta da frente (Café · 89 g etc.) e só
                volta a 327g fixo quando não há o que mostrar (motion
                reduzido ou antes de `entered`, TAREFA 2e/2f). Remonta via
                `key` + o keyframe `gaia-fade` (já usado no crossfade de aba
                do PhoneScreen) — mas em 250ms, não os 450ms de lá: aqui é
                update de rótulo, não troca de tela, e Swap (560ms) seria
                pesado demais pra uma palavra. Sem contador de dígitos: o
                número troca de uma vez, não conta subindo. */}
            <span
              key={showMealView ? `meal-${i}` : "agg"}
              style={{ animation: "gaia-fade 250ms ease both" }}
              className="font-body text-[11px] tabular-nums text-white/40"
            >
              {showMealView ? (
                <>
                  {frontMeal.n} · <span className="font-medium text-white/60">{mealMacroTotal(frontMeal)} g</span>
                </>
              ) : (
                `${totalG} g`
              )}
            </span>
          </div>
          {/* Geometria da fatia acesa, uma vez só: a barra e a fileira de
              carets embaixo precisam do MESMO left/width por macro — se cada
              uma calculasse a sua, um arredondamento de ponto flutuante
              divergente faria o caret desalinhar da fatia por sub-pixel. */}
          {(() => {
            const sliceGeom = macros.map((m) => {
              // soma dos gramas das refeições ANTERIORES (na ordem de
              // PLANO_MEALS) como % do segmento; a fatia é a da frente.
              // Ex. Almoço/Prot: before = Café(24) → left 21,4%;
              // width = 46/112 = 41,1%.
              const before = PLANO_MEALS.slice(0, i).reduce((s, meal) => s + meal[m.field], 0);
              return { left: (before / m.g) * 100, width: (frontMeal[m.field] / m.g) * 100 };
            });
            return (
              <>
                {/* h-2.5 + calha: meio ponto a mais de altura é o que o relevo
                    de tubo precisa pra existir — em h-2 o gradiente vertical
                    não tem pixels pra contar luz em cima e sombra embaixo. */}
                <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]">
                  {macros.map((m, idx) => (
                    <span key={m.k} data-bar className={"relative overflow-hidden " + m.c} style={{ width: `${(m.g / totalG) * 100}%` }}>
                      {/* A cor do macro é a gramática da barra e não se toca —
                          dentro do segmento de Prot tudo é roxo, sempre; o que
                          muda é o brilho. Véu escuro por cima escurece o
                          RESTO pra ~0,30 sem virar cinza (ainda lê como "roxo
                          apagado"); a fatia acesa é o próprio `m.c` em opacidade
                          cheia — luz, não tinta de refeição. Quem carrega a cor
                          da refeição é o caret, numa camada separada abaixo. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[#0A0C11] transition-opacity duration-[700ms] ease-gaia"
                        style={{ opacity: showMealView ? 0.3 : 0 }}
                      />
                      {showMealView && (
                        <span
                          aria-hidden
                          className={"pointer-events-none absolute inset-y-0 transition-[left,width] duration-[700ms] ease-gaia " + m.c}
                          style={{ left: `${sliceGeom[idx].left}%`, width: `${sliceGeom[idx].width}%` }}
                        />
                      )}
                      {/* Luz do tubo — ÚLTIMA camada do segmento, acima do véu
                          e da fatia, pra iluminar apagado e aceso por igual.
                          soft-light e não tinta branca: mantém o matiz de cada
                          macro (a cor é a gramática da barra e não se toca —
                          ver o comentário do véu acima). */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 40%, rgba(0,0,0,0.4) 100%)",
                          mixBlendMode: "soft-light",
                        }}
                      />
                    </span>
                  ))}
                </div>
                {/* Carets — a identidade da refeição entra aqui, como
                    anotação embaixo do dado, não pintada em cima dele. Fora
                    do overflow-hidden da barra de propósito (um traço sob a
                    fatia seria cortado se vivesse dentro do segmento).
                    left/width idênticos ao da fatia acesa: os três deslizam
                    em sincronia com ela, 700ms/ease-gaia. Rima com a espinha
                    colorida da lista acima e com o baralho embaixo — mesma
                    cor (`frontMeal.c`), papel de marcação em vez de dado. */}
                <div className="mt-[3px] flex h-[2px] gap-0.5" aria-hidden>
                  {macros.map((m, idx) => (
                    <span key={m.k} className="relative" style={{ width: `${(m.g / totalG) * 100}%` }}>
                      {showMealView && (
                        <span
                          className="absolute inset-y-0 rounded-full transition-[left,width] duration-[700ms] ease-gaia"
                          style={{ left: `${sliceGeom[idx].left}%`, width: `${sliceGeom[idx].width}%`, background: frontMeal.c }}
                        />
                      )}
                    </span>
                  ))}
                </div>
              </>
            );
          })()}
          {/* mt-[5px], não mt-2.5: os 5px que o caret+gap comem (3px de vão
              + 2px de traço) saem daqui, não somam altura nova ao card — o
              card é dimensionado pelo palco do baralho embaixo (ver
              comentário do MealDeck), não pode respirar sozinho. */}
          <div className="mt-[5px] flex items-center justify-between">
            {macros.map((m) => (
              <span key={m.k} className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${m.c}`} />
                <span className="font-body text-[11px] text-white/55">{m.k}</span>
                <span className="font-body text-[11px] font-medium tabular-nums text-white/85">{m.g}g</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <GaiaTag>somou pela TACO</GaiaTag>
          <Pill className="text-white/60">importado por PDF</Pill>
        </div>
      </div>

      {/* RODAPÉ — o baralho. Solto, sem painel em volta: é a mesma refeição da
          lista acima vista de perto, com a foto do prato. Sem rotação no
          conjunto: as cartas sangram foto e "+" pra fora do próprio nó, e
          inclinar tudo faria a quina do "+" cair torta. O diagonal da pilha já
          dá o desalinho. */}
      <div data-enter-delay={120} style={px(0.45)} className="gaia-parallax relative z-[11] mt-8">
        <MealDeck front={i} dealt={dealt} />
      </div>
    </div>
  );
}

/* ═══════════════ QUESTIONÁRIOS (hero verde) ═══════════════ */
/* Paleta PASTEL — cor POR BARRA (não por status): rosa, roxo, verde e amarelo
   pastel. Menos saturado = mais clean. E o foco não é COR — é LUZ: a barra não
   troca de cor, um holofote suave desliza até ela, ela sobe um toque e clareia.
   Cor estável + luz que viaja é o que dá o craft sem virar semáforo vibrante. */
const QUEST_PASTEL: Record<string, string> = {
  rosa: "linear-gradient(180deg, #F6C9DC 0%, #E7A6C4 100%)",
  roxo: "linear-gradient(180deg, #D6C6F8 0%, #B49DED 100%)",
  verde: "linear-gradient(180deg, #BAE9CE 0%, #90D7AF 100%)",
  amarelo: "linear-gradient(180deg, #F5E5B0 0%, #E9CF86 100%)",
};
/* Espelho — os MESMOS stops invertidos. O reflexo não pode reusar o gradiente
   da barra: sem o scaleY(-1) (que saiu quando o GSAP assumiu o transform), a
   cópia cresce pra baixo sem virar, e reusar o gradiente deixaria o topo do
   reflexo com a cor do TOPO da barra — o lado errado encostando na base. */
const QUEST_PASTEL_REFL: Record<string, string> = {
  rosa: "linear-gradient(180deg, #E7A6C4 0%, #F6C9DC 100%)",
  roxo: "linear-gradient(180deg, #B49DED 0%, #D6C6F8 100%)",
  verde: "linear-gradient(180deg, #90D7AF 0%, #BAE9CE 100%)",
  amarelo: "linear-gradient(180deg, #E9CF86 0%, #F5E5B0 100%)",
};

function MockQuestionarios() {
  // Widget de dashboard, craft da splash — MAS clean e pastel, e o motion é a
  // estrela: leitura focal no topo (número que CONTA na troca), e os sete
  // instrumentos em barras pastel com reflexo. O foco é LUZ — um holofote
  // desliza de barra em barra (GSAP), a barra da vez sobe e clareia, as outras
  // recuam. Entrada em mola com stagger. useAutoCycle dá o índice e respeita
  // reduced-motion (congela em 0); sob reduce, estado final seco, sem viagem.
  // Os três instrumentos com score ficam em posições alternadas (0,2,4) pra o
  // holofote varrer o gráfico inteiro, não só a metade esquerda.
  const instruments = [
    { k: "EAT-26", full: "Atitudes alimentares", tone: "rosa", val: 0.74 },
    { k: "TFEQ-21", full: "Comportamento alimentar", tone: "verde" },
    { k: "PSQI", full: "Qualidade do sono", tone: "roxo" },
    { k: "QFA", full: "Frequência alimentar", tone: "amarelo" },
    { k: "BSQ", full: "Imagem corporal", tone: "rosa" },
    { k: "IES-2", full: "Comer intuitivo", tone: "verde" },
  ];
  // Cada foco carrega o SEU dataset — é isto que faz o gráfico SE RE-PLOTAR
  // (as barras sobem e descem) a cada troca, em vez de ficar um gráfico parado
  // com uma luz passeando por cima. A ordem dos valores segue `instruments`.
  // A altura mora no scaleY, não no `height`: transform não dispara layout, e
  // o mesmo canal já serve pra entrada (0 → valor).
  const insights = [
    { k: "EAT-26", n: 19, of: "/ 78 pts", msg: "Acima do limiar de risco (20). Vale investigar restrição.", vals: [0.78, 0.42, 0.55, 0.64, 0.86, 0.48] },
    { k: "PSQI", n: 8, of: "/ 21 pts", msg: "Sono ruim há 3 semanas — pode estar puxando a fome.", vals: [0.6, 0.53, 0.36, 0.72, 0.8, 0.58] },
    { k: "BSQ", n: 82, of: "/ 204 pts", msg: "Insatisfação corporal moderada. Acompanhar de perto.", vals: [0.68, 0.38, 0.62, 0.5, 0.94, 0.44] },
  ];
  const [i, ref, entered] = useAutoCycle(insights.length, 3400);
  const ins = insights[i];
  const activeFull = instruments.find((x) => x.k === ins.k)?.full ?? "";
  const focusIdx = instruments.findIndex((x) => x.k === ins.k);
  const PLOT = 116; // altura do gráfico em px — o reflexo parte do mesmo chão
  const REFLECT = 24;

  const scopeRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const numRef = useRef<HTMLSpanElement>(null);
  const prevFocus = useRef<number>(-1);
  const prevNum = useRef<number>(0);

  const centerX = (idx: number) => {
    const col = colRefs.current[idx];
    return col ? col.offsetLeft + col.offsetWidth / 2 : 0;
  };

  // ENTRADA — barras sobem em mola (back.out) com stagger, o reflexo brota
  // atrás, o holofote acende na barra em foco e ela sobe, e o número conta de
  // 0. Só transform/opacity/filter. Reduced-motion: estado final, sem mola.
  useGSAP(
    () => {
      if (!entered) return;
      const root = scopeRef.current;
      if (!root) return;
      const bars = Array.from(root.querySelectorAll<HTMLElement>(".q-bar"));
      const refls = Array.from(root.querySelectorAll<HTMLElement>(".q-refl"));
      const spot = root.querySelector<HTMLElement>(".q-spot");
      if (!bars.length) return;
      const setNum = (v: number) => { if (numRef.current) numRef.current.textContent = String(v); };
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (spot) gsap.set(spot, { xPercent: -50, x: centerX(focusIdx) });

      if (reduce) {
        gsap.set(bars, { scaleY: (idx: number) => ins.vals[idx], y: 0, opacity: 0.85, transformOrigin: "50% 100%" });
        gsap.set(bars[focusIdx], { opacity: 1, y: -4 });
        gsap.set(refls, { scaleY: (idx: number) => ins.vals[idx], opacity: 0.22, transformOrigin: "50% 0%" });
        if (spot) gsap.set(spot, { autoAlpha: 0.85 });
        setNum(ins.n);
        prevFocus.current = focusIdx;
        prevNum.current = ins.n;
        return;
      }

      gsap.set(bars, { scaleY: 0, y: 0, opacity: 0.85, transformOrigin: "50% 100%" });
      gsap.set(refls, { scaleY: 0, opacity: 0, transformOrigin: "50% 0%" });
      if (spot) gsap.set(spot, { autoAlpha: 0 });
      setNum(0);

      const tl = gsap.timeline();
      tl.to(bars, { scaleY: (idx: number) => ins.vals[idx], duration: 0.72, ease: "back.out(1.2)", stagger: 0.07 });
      tl.to(refls, { scaleY: (idx: number) => ins.vals[idx], opacity: 0.22, duration: 0.5, ease: "power2.out", stagger: 0.07 }, "-=0.55");
      if (spot) tl.to(spot, { autoAlpha: 1, duration: 0.45, ease: "power2.out" }, "-=0.4");
      tl.to(bars[focusIdx], { opacity: 1, y: -4, filter: "brightness(1.05)", duration: 0.45, ease: "power2.out" }, "<");
      const counter = { v: 0 };
      tl.to(counter, {
        v: ins.n,
        duration: 0.95,
        ease: "power2.out",
        onUpdate: () => setNum(Math.round(counter.v)),
      }, 0.15);

      prevFocus.current = focusIdx;
      prevNum.current = ins.n;
    },
    { scope: scopeRef, dependencies: [entered] },
  );

  // TROCA DE FOCO — o holofote VIAJA até a barra nova (ease-in-out, o movimento
  // na tela), ela sobe e clareia, a antiga recua, e o número reconta. Só corre
  // depois da entrada; sob reduce a entrada já congelou tudo.
  useGSAP(
    () => {
      if (!entered || prevFocus.current === focusIdx) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (numRef.current) numRef.current.textContent = String(ins.n);
        return;
      }
      const root = scopeRef.current;
      if (!root) return;
      const bars = Array.from(root.querySelectorAll<HTMLElement>(".q-bar"));
      const refls = Array.from(root.querySelectorAll<HTMLElement>(".q-refl"));
      const spot = root.querySelector<HTMLElement>(".q-spot");
      const prev = prevFocus.current;

      // RE-PLOT — o gráfico INTEIRO se redesenha pro dataset do novo foco: as
      // barras sobem e descem. Stagger da esquerda pra direita pra ler como
      // onda, não como seis barras pulando juntas. ease-in-out porque é
      // movimento NA tela (não entrada): acelera e desacelera, que é como massa
      // se move. O reflexo acompanha no mesmo canal, senão descola da barra.
      gsap.to(bars, { scaleY: (idx: number) => ins.vals[idx], duration: 0.8, ease: "power3.inOut", stagger: 0.045, overwrite: "auto" });
      gsap.to(refls, { scaleY: (idx: number) => ins.vals[idx], duration: 0.8, ease: "power3.inOut", stagger: 0.045, overwrite: "auto" });

      if (spot) gsap.to(spot, { x: centerX(focusIdx), duration: 0.6, ease: "power3.inOut", overwrite: "auto" });
      if (bars[focusIdx]) gsap.to(bars[focusIdx], { opacity: 1, y: -4, filter: "brightness(1.05)", duration: 0.45, ease: "power2.out", overwrite: "auto" });
      if (prev >= 0 && bars[prev]) gsap.to(bars[prev], { opacity: 0.85, y: 0, filter: "brightness(1)", duration: 0.5, ease: "power2.out", overwrite: "auto" });

      const counter = { v: prevNum.current };
      gsap.to(counter, {
        v: ins.n,
        duration: 0.7,
        ease: "power2.out",
        onUpdate: () => { if (numRef.current) numRef.current.textContent = String(Math.round(counter.v)); },
        overwrite: "auto",
      });

      prevFocus.current = focusIdx;
      prevNum.current = ins.n;
    },
    { scope: scopeRef, dependencies: [focusIdx, entered] },
  );

  return (
    <div ref={ref} className="relative mt-7 flex flex-1 flex-col justify-end px-7 pb-7 md:px-8 md:pb-8">
      {/* UM cartão fundo, inset dos dois lados — header focal + gráfico. */}
      <div ref={scopeRef} data-enter-delay={0} style={px(0.3)} className={"gaia-parallax rounded-[18px] p-4 md:p-5 " + GLASS}>
        {/* HEADER — leitura focal (label + número grande + pill). O número é
            dirigido pelo GSAP (conta); label/of/mensagem crossfade via Swap. */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <Swap k={i}>
              <div className="font-body text-[11.5px] text-white/50">{ins.k} · {activeFull}</div>
            </Swap>
            <div className="mt-1 flex items-end gap-1.5">
              <span ref={numRef} className="font-title text-[2rem] font-medium leading-none tabular-nums text-white">{ins.n}</span>
              <Swap k={i} className="mb-1">
                <span className="font-body text-[12px] tabular-nums text-white/40">{ins.of}</span>
              </Swap>
            </div>
          </div>
          <span className="mt-0.5 shrink-0 rounded-full bg-white/[0.05] px-2.5 py-1 font-body text-[10.5px] text-white/55 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
            7 validados
          </span>
        </div>

        {/* mensagem do insight — crossfade junto com o foco */}
        <Swap k={i} className="mt-1.5 min-h-[15px]">
          <p className="font-body text-[11.5px] leading-snug text-white/60">{ins.msg}</p>
        </Swap>

        {/* GRÁFICO — barras pastel com reflexo. Holofote (q-spot) viaja atrás
            das barras; a barra em foco sobe e clareia. Motion todo em GSAP. */}
        <div className="relative mt-4">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0" style={{ height: PLOT }}>
            {[0, 0.34, 0.67].map((g) => (
              <div key={g} className="absolute inset-x-0 border-t border-white/[0.04]" style={{ top: `${g * 100}%` }} />
            ))}
          </div>
          <div className="relative flex items-end gap-2">
            {/* holofote — mancha de luz suave que viaja até a barra em foco */}
            <div
              aria-hidden
              className="q-spot pointer-events-none absolute bottom-0 left-0 z-0"
              style={{
                width: 100,
                height: PLOT + REFLECT,
                background: "radial-gradient(50% 52% at 50% 44%, rgba(255,255,255,0.2), rgba(255,255,255,0) 70%)",
                filter: "blur(3px)",
                opacity: 0,
              }}
            />
            {instruments.map((it, idx) => {
              // Altura CHEIA no DOM; quem define o valor é o scaleY do GSAP —
              // é o que permite a barra subir e descer entre datasets sem
              // reflow (transform não dispara layout).
              const on = idx === focusIdx;
              return (
                <div
                  key={it.k}
                  ref={(el) => { colRefs.current[idx] = el; }}
                  className="relative z-10 flex flex-1 flex-col items-center"
                >
                  <div className="flex w-full items-end justify-center" style={{ height: PLOT }}>
                    <div
                      className="q-bar w-[56%] rounded-t-[3px]"
                      style={{ height: PLOT, background: QUEST_PASTEL[it.tone], boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.28)" }}
                    />
                  </div>
                  {/* chão — baseline de onde o reflexo parte */}
                  <div className="h-px w-full bg-white/[0.1]" />
                  <div className="flex w-full justify-center" style={{ height: REFLECT }}>
                    <div
                      aria-hidden
                      className="q-refl w-[56%] rounded-b-[3px]"
                      style={{
                        height: REFLECT,
                        background: QUEST_PASTEL_REFL[it.tone],
                        transformOrigin: "50% 0%",
                        // opaco junto ao chão, sumindo pra BAIXO — é assim que
                        // reflexo se comporta. Invertido, virava mancha escura.
                        WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
                        maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
                        opacity: 0,
                      }}
                    />
                  </div>
                  <span className={"mt-1.5 whitespace-nowrap font-body text-[9px] tabular-nums transition-colors duration-500 sm:text-[9.5px] " + (on ? "text-white/85" : "text-white/45")}>{it.k}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════ ANTROPOMETRIA (hero óleo) ═══════════════ */
/* Régua única de X pros pontos E pros meses — o desalinhamento antigo vinha
   de o eixo viver fora do SVG, com padding próprio. O inset também impede
   que o primeiro/último ponto encoste na borda do painel. Fica em escopo de
   módulo porque as 3 séries abaixo compartilham a mesma régua. */
const ANTHRO_X0 = 8;
const ANTHRO_X1 = 92;

// Normalização É POR SÉRIE — Peso e % Gordura não podem dividir a mesma
// escala (min/max global), senão uma delas vira quase uma reta enquanto a
// outra ocupa o gráfico inteiro. Cada série calcula seu próprio min/max.
function anthroCoords(pts: number[]) {
  const min = Math.min(...pts) - 0.5;
  const max = Math.max(...pts) + 0.5;
  return pts.map((p, i) => {
    const x = ANTHRO_X0 + (i / (pts.length - 1)) * (ANTHRO_X1 - ANTHRO_X0);
    const y = 4 + (1 - (p - min) / (max - min)) * 26; // 26, não 30: sobra rodapé pros meses
    return [x, y] as const;
  });
}

type AnthroSeries = {
  tab: string;
  unit: string;
  pts: number[];
  headline: string;
  deltaBold: string; // delta some com " desde março" fixo no JSX
  top: string; // rótulo de topo do eixo Y
  bottom: string; // rótulo de base do eixo Y
};

const ANTHRO_SERIES: AnthroSeries[] = [
  { tab: "Peso", unit: "kg", pts: [78, 76.4, 75.1, 74.2, 73.5, 72.8], headline: "72,8", deltaBold: "−5,2 kg", top: "78,0", bottom: "72,5" },
  { tab: "IMC", unit: "", pts: [26.4, 25.9, 25.4, 24.9, 24.5, 24.1], headline: "24,1", deltaBold: "−2,3", top: "26,4", bottom: "23,8" },
  { tab: "% Gordura", unit: "%", pts: [26.4, 25.9, 25.5, 25.1, 24.7, 24.3], headline: "24,3", deltaBold: "−2,1 pts", top: "26,4", bottom: "24,0" },
];

// Coordenadas/strings pré-computadas por série — puras (dependem só dos pts
// fixos acima), então vivem fora do componente: nunca precisam recalcular
// nem entram em dependência de efeito.
const ANTHRO_COORDS = ANTHRO_SERIES.map((s) => anthroCoords(s.pts));
const ANTHRO_LINES = ANTHRO_COORDS.map((coords) => coords.map(([x, y]) => `${x},${y}`).join(" "));
// A área sangra até as bordas do painel em y constante. Fechá-la em X0/X1
// criava uma parede vertical no MAR que lia como barra, não como curva.
const ANTHRO_AREAS = ANTHRO_COORDS.map((coords, si) => {
  const [, y0] = coords[0];
  const [, yLast] = coords[coords.length - 1];
  return `0,40 0,${y0} ${ANTHRO_LINES[si]} 100,${yLast} 100,40`;
});

const ANTHRO_LABELS = ["mar", "abr", "mai", "jun", "jul", "ago"];

function MockAntropometria() {
  const measures = [
    { k: "IMC", v: "24,1", d: "−1,7", up: false },
    { k: "Massa magra", v: "58,1 kg", d: "+1,4", up: true },
    { k: "% Gordura", v: "24,3 %", d: "−2,1", up: false },
  ];

  // Loop ÚNICO do card: as 3 abas do cabeçalho (hoje decorativas) ciclam
  // sozinhas — o beat mais lento do bento (3,8s), porque é o card mais denso
  // de ler. Enquanto os outros mocks trocam CONTEÚDO (paciente, insight,
  // linha), aqui o GRÁFICO INTEIRO morfa de uma série pra outra — gramática
  // nova, nenhum outro card repete.
  // ASSINATURA — a evolução se plota. Este card é um gráfico de evolução no
  // tempo, então a entrada dele é a própria evolução acontecendo: a cortina
  // (.gaia-draw no <svg>) corre da esquerda pra direita e a linha, a área e a
  // grade nascem juntas sob ela, da consulta mais velha pra mais nova. A caixa
  // e os rótulos dos meses NÃO entram na cortina de propósito: eles são o
  // instrumento, e instrumento já estava lá — quem se desenha é o dado.
  const [tab, ref, entered] = useAutoCycle(ANTHRO_SERIES.length, 3800);
  const s = ANTHRO_SERIES[tab];
  const coords = ANTHRO_COORDS[tab];
  const [lastX, lastY] = coords[coords.length - 1];

  const polylineRef = useRef<SVGPolylineElement>(null);
  // Cópia borrada da linha, por baixo dela — o halo que a faz emitir luz.
  // Morfa junto (mesmo tween de attr), senão o brilho fica pra trás da linha.
  const glowRef = useRef<SVGPolylineElement>(null);
  const polygonRef = useRef<SVGPolygonElement>(null);

  // `points` (polyline/polygon) e cx/cy (circle) não são animáveis por CSS —
  // GSAP tween aqui funciona como "poor man's morph": como as 3 séries têm a
  // MESMA contagem de pontos e a MESMA régua X, o GSAP interpola cada número
  // da string em paralelo com o seu par na string de destino.
  //
  // Por isso as tags abaixo NUNCA amarram esses atributos a `tab`/`coords`
  // no JSX — ficam presas ao valor inicial (série 0). Se ligássemos a `s`,
  // o React reescreveria o atributo no commit ANTES deste efeito rodar, e o
  // tween nasceria já no destino (nada sobra pra interpolar). Depois do
  // mount, o GSAP é o único dono desses atributos.
  useEffect(() => {
    gsap.to(polylineRef.current, { attr: { points: ANTHRO_LINES[tab] }, duration: 0.8, ease: "power3.inOut" });
    gsap.to(glowRef.current, { attr: { points: ANTHRO_LINES[tab] }, duration: 0.8, ease: "power3.inOut" });
    gsap.to(polygonRef.current, { attr: { points: ANTHRO_AREAS[tab] }, duration: 0.8, ease: "power3.inOut" });
    // Os pontos NÃO tweenam aqui: saíram do SVG (viravam elipse sob o
    // preserveAspectRatio="none") e agora são HTML lá embaixo, morfando de
    // série por transition CSS em left/top — mesma gramática do "agora".
  }, [tab]);

  return (
    <div ref={ref} className="mt-8 flex-1 px-7 pb-7 md:px-8 md:pb-8">
      <div style={px(0.32)} className={"gaia-parallax rounded-[18px] p-4 " + GLASS}>
        {/* Em 390px avatar+nome+abas não cabem numa linha, e como o bloco do
            nome é flex-1 ele ENCOLHE em vez de empurrar as abas — o nome
            quebrava em 2 linhas e o subtítulo em 3. basis-full manda as abas
            inteiras pra linha de baixo; sm: devolve a linha única. */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-white/10 pb-3">
          <Avatar person={MARINA} className="h-8 w-8 text-[12px]" />
          <div className="min-w-0 flex-1">
            {/* era <p>; virou <Swap> (que renderiza um <div>) porque a troca
                de aba troca SIGNIFICADO ("Peso · Marina" → "IMC · Marina") e
                key-remount cortava o texto seco no meio da leitura. */}
            <Swap k={tab} className="font-title text-[13px] font-medium text-white/85">{s.tab} · Marina</Swap>
            <p className="font-body text-[9.5px] uppercase tracking-[0.08em] text-white/40">6 consultas · mar–ago</p>
          </div>
          <div className="order-last basis-full sm:contents">
          <div className="inline-flex shrink-0 gap-0.5 rounded-full bg-white/[0.07] p-0.5">
            {ANTHRO_SERIES.map((serie, i) => (
              <span
                key={serie.tab}
                className={
                  "rounded-full px-2 py-0.5 font-body text-[10px] font-medium transition-colors duration-500 ease-auto " +
                  (i === tab ? "bg-white/15 text-white" : "text-white/40")
                }
              >
                {serie.tab}
              </span>
            ))}
          </div>
          </div>
        </div>

        {/* O número lidera: o gráfico é prova, não manchete.
            NÃO é odômetro — decisão deliberada, não preguiça: todo ciclo
            troca de SÉRIE, e cada série troca de SIGNIFICADO (72,8 kg → 24,1
            de IMC → 24,3%), nunca continua o mesmo dado em outra escala.
            Rolar o número renderizaria passos intermediários (60, 50, 40...)
            que a paciente NUNCA teve, numa unidade que não existe no meio do
            caminho (o que seria "68 kg" virando "24 de IMC" pelo caminho?).
            Pareceria bonito e inventaria dado. <Swap> troca de figura sem
            fingir que uma continua a outra. */}
        <Swap k={tab} className="mt-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-title text-[2.4rem] font-medium leading-none tabular-nums text-white">{s.headline}</span>
            {s.unit && <span className="font-body text-[15px] text-white/45">{s.unit}</span>}
          </div>
          <p className="mt-1.5 font-body text-[12px] text-white/45">
            <span className="font-medium tabular-nums text-info">{s.deltaBold}</span> desde março
          </p>
        </Swap>

        <div className="relative mt-4 h-32 overflow-hidden rounded-[12px] bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
          <Swap k={tab} className="absolute right-2 top-1.5 z-10">
            <span className="font-body text-[9px] tabular-nums text-white/30">{s.top}</span>
          </Swap>
          <Swap k={tab} className="absolute bottom-5 right-2 z-10">
            <span className="font-body text-[9px] tabular-nums text-white/30">{s.bottom}</span>
          </Swap>

          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={"gaia-draw absolute inset-0 h-full w-full " + (entered ? "is-drawn" : "")}>
            <defs>
              {/* Stop do meio: queda exponencial em vez de linear — o fill
                  cola na linha e morre rápido, como luz de verdade cai. */}
              <linearGradient id="anthroFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C1A9D3" stopOpacity="0.42" />
                <stop offset="48%" stopColor="#C1A9D3" stopOpacity="0.11" />
                <stop offset="100%" stopColor="#C1A9D3" stopOpacity="0" />
              </linearGradient>
              {/* O gradiente da linha É a direção do tempo: março apagado,
                  agosto quase branco — a linha esquenta rumo ao "agora" e
                  encontra o ponto que pulsa já na luz máxima. Mesma razão dos
                  pontos com opacity por idade, logo abaixo. */}
              <linearGradient id="anthroLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#C1A9D3" stopOpacity="0.38" />
                <stop offset="58%" stopColor="#C1A9D3" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#EFE6F7" />
              </linearGradient>
              {/* stdDeviation anisotrópico de propósito: o blur roda em user
                  units e o preserveAspectRatio="none" estica X ~4,5× e Y
                  ~3,2× — dois números pra sair um halo redondo na tela. */}
              <filter id="anthroHalo" x="-30%" y="-140%" width="160%" height="380%">
                <feGaussianBlur stdDeviation="1.3 1.9" />
              </filter>
            </defs>
            <polygon ref={polygonRef} points={ANTHRO_AREAS[0]} fill="url(#anthroFill)" />
            {/* Colunas por consulta — dentro do SVG pra pintarem SOBRE o fill e
                sob a linha. Fora dele o `inset-0` do svg as encobria. */}
            {ANTHRO_LABELS.slice(0, -1).map((label, i) => {
              const x = ANTHRO_X0 + ((i + 0.5) / (ANTHRO_LABELS.length - 1)) * (ANTHRO_X1 - ANTHRO_X0);
              return <line key={label} x1={x} y1="0" x2={x} y2="40" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />;
            })}
            {/* halo por baixo da linha — a linha emitindo, não um segundo
                traço. Herda o gradiente do tempo, então o brilho também
                cresce rumo ao agora. */}
            <polyline ref={glowRef} points={ANTHRO_LINES[0]} fill="none" stroke="url(#anthroLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" filter="url(#anthroHalo)" opacity="0.3" />
            <polyline ref={polylineRef} points={ANTHRO_LINES[0]} fill="none" stroke="url(#anthroLine)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Pontos das consultas — HTML, não <circle> do SVG. Dentro do
              preserveAspectRatio="none" o círculo esticava em elipse (o card é
              mais largo que 2,5:1 no desktop) e o anel grosso lia como donut
              borrado. Em HTML são círculos VERDADEIROS em qualquer largura, no
              mesmo material do "agora": passado em anel vazado, presente
              preenchido — cada nó é uma consulta (o índice 5 é o herói branco
              logo abaixo). Morfam de série por transition em left/top (mesma
              gramática do herói), então saiu o tween GSAP dos cx/cy.
              Entram em cascata da esquerda pra direita acompanhando a cortina:
              o atraso ≈ x·1080ms pousa cada nó quando a linha o alcança, e o
              último cai logo antes do herói (que pulsa aos 1000ms). */}
          {coords.slice(0, -1).map(([x, y], i) => (
            <span
              key={ANTHRO_LABELS[i]}
              aria-hidden
              className="pointer-events-none absolute transition-[left,top] duration-[800ms] ease-auto"
              style={{ left: `${x}%`, top: `${(y / 40) * 100}%`, transform: "translate(-50%,-50%)" }}
            >
              <span
                className={
                  "block h-[7px] w-[7px] rounded-full bg-[#0A0C11] shadow-[inset_0_0_0_1.4px_#C1A9D3] transition-[opacity,transform] duration-500 ease-gaia motion-reduce:transition-none " +
                  (entered ? "scale-100" : "scale-0")
                }
                style={{
                  // consulta antiga apaga, recente acende — o mesmo relato do
                  // gradiente da linha, contado pelos pontos
                  opacity: entered ? 0.42 + (i / 4) * 0.48 : 0,
                  transitionDelay: `${Math.round((x / 100) * 1080)}ms`,
                }}
              />
            </span>
          ))}

          {/* Última medição pulsa sem disputar o número principal — e
              acompanha a nova posição Y a cada troca de série via transition
              CSS em left/top (mesma gramática dos marcadores do MockExames).
              Ela NÃO é filha do <svg>, então a cortina não a esconde: sem o
              pop atrasado abaixo ela ficaria pulsando sozinha na ponta direita
              da caixa apontando pra um gráfico que ainda não chegou lá. O
              atraso é medido: a cortina leva 1,2s com ease-in-out e este ponto
              vive a 92% da régua, ou seja, ela passa por aqui perto dos 940ms.
              O "agora" pousa logo depois que a linha o alcança. */}
          <span
            aria-hidden
            className="pointer-events-none absolute transition-[left,top] duration-[800ms] ease-auto"
            style={{ left: `${lastX}%`, top: `${(lastY / 40) * 100}%`, transform: "translate(-50%,-50%)" }}
          >
            <span
              className={
                "relative flex h-2.5 w-2.5 items-center justify-center transition-[opacity,transform] duration-500 ease-gaia motion-reduce:transition-none " +
                (entered ? "scale-100 opacity-100" : "scale-0 opacity-0")
              }
              style={{ transitionDelay: "1000ms" }}
            >
              {/* miolo no tom mais claro do gradiente da linha: o "agora" é o
                  ponto mais aceso do gráfico, onde a linha termina de esquentar */}
              <span className="absolute h-2.5 w-2.5 rounded-full bg-[#C1A9D3]/60 motion-safe:animate-ping" />
              <span className="h-2 w-2 rounded-full bg-[#EFE6F7] ring-2 ring-[#0A0C11]" />
            </span>
          </span>

          {ANTHRO_LABELS.map((label, i) => {
            const x = ANTHRO_X0 + (i / (ANTHRO_LABELS.length - 1)) * (ANTHRO_X1 - ANTHRO_X0);
            return (
              <span key={label} className="absolute bottom-1.5 z-10 -translate-x-1/2 font-body text-[9px] uppercase tracking-wide text-white/35" style={{ left: `${x}%` }}>
                {label}
              </span>
            );
          })}
        </div>

        {/* Rodapé — resumo, não responde à aba: fica parado por design. */}
        <div className="mt-3 flex items-center justify-between">
          {measures.map((m, i) => (
            <div key={m.k} className={"min-w-0 flex-1 px-2 first:pl-0 last:pr-0 " + (i > 0 ? "border-l border-white/10" : "")}>
              <p className="truncate font-body text-[9.5px] uppercase tracking-wide text-white/40">{m.k}</p>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-title text-[13px] font-medium tabular-nums text-white">{m.v}</span>
                <span className={"font-body text-[10px] font-medium tabular-nums " + (m.up ? "text-sage-200" : "text-info")}>{m.d}</span>
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
type Patient = { who: Person; extr: number; rows: ExamRow[] };

function MockExames() {
  // Micro-interação: o laudo troca de paciente sozinho a cada ~3s. Os
  // marcadores DESLIZAM pra nova posição (transição de `left`), a faixa de
  // referência ajusta, o valor e o flag mudam — mostrando a variação de cada
  // pessoa. As 3 linhas são keyadas por índice pra o mesmo nó animar.
  const patients: Patient[] = [
    { who: MARINA, extr: 14, rows: [
      { k: "Hemoglobina", v: "13,8", u: "g/dL", ref: "12–16", band: [28, 82], pos: 46, flag: null },
      { k: "Vitamina D", v: "18", u: "ng/mL", ref: "30–100", band: [44, 96], pos: 13, flag: "down" },
      { k: "TSH", v: "5,9", u: "µUI/mL", ref: "0,4–4,5", band: [14, 56], pos: 84, flag: "up" },
    ] },
    { who: JOAO, extr: 11, rows: [
      { k: "Glicose", v: "104", u: "mg/dL", ref: "70–99", band: [22, 58], pos: 71, flag: "up" },
      { k: "Ferritina", v: "92", u: "ng/mL", ref: "30–400", band: [30, 94], pos: 41, flag: null },
      { k: "HDL", v: "37", u: "mg/dL", ref: "40–60", band: [40, 80], pos: 22, flag: "down" },
    ] },
    { who: BIANCA, extr: 16, rows: [
      { k: "Colesterol", v: "182", u: "mg/dL", ref: "< 190", band: [18, 72], pos: 54, flag: null },
      { k: "Vit. B12", v: "205", u: "pg/mL", ref: "200–900", band: [42, 96], pos: 25, flag: "down" },
      { k: "TSH", v: "2,1", u: "µUI/mL", ref: "0,4–4,5", band: [14, 56], pos: 43, flag: null },
    ] },
  ];
  // ASSINATURA — as agulhas assentam. O painel entra pela ESQUERDA e cada
  // marcador varre de 0% até o seu valor, um atrás do outro, como o ponteiro
  // de um instrumento buscando a medida. É o mesmo transition-[left] de 900ms
  // que o card já usa pra trocar de paciente — a entrada não inventou física
  // nova, só começou a varredura da origem da régua em vez do valor anterior.
  const [i, ref, entered] = useAutoCycle(patients.length, 3200);
  const p = patients[i];
  return (
    <div ref={ref} className="mt-8 flex-1 px-7 pb-7 md:px-8 md:pb-8">
      <div style={px(0.32)} className={"gaia-parallax gaia-from-left rounded-[16px] p-4 " + GLASS}>
        <div className="mb-3 flex items-center justify-between">
          {/* O rosto entra DEPOIS do chip PDF, não no lugar dele: o chip é a
              promessa do card ("suba o PDF do laboratório") e o rosto é de
              quem é o laudo. A <Swap> mora no wrapper do par rosto+nome pra
              os dois trocarem juntos — o rosto entrando antes do nome lia
              como troca de paciente pela metade. `k={i}`, não o nome: é o
              MESMO índice que decide tudo o mais neste card (linhas,
              marcadores), então os dois trocam no mesmo instante. */}
          <span className="inline-flex items-center gap-2 font-body text-[12px] font-medium text-white/70">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 text-[10px] font-semibold text-white/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">PDF</span>
            <span className="inline-flex items-center gap-1.5">
              Laudo ·
              <Swap k={i}>
                <span className="inline-flex items-center gap-1.5">
                  <Avatar person={p.who} className="h-5 w-5 text-[8.5px]" />
                  <span className="text-white/85">{p.who.name}</span>
                </span>
              </Swap>
            </span>
          </span>
          <GaiaTag className="shrink-0">extraiu {p.extr} marcadores</GaiaTag>
        </div>
        <div className="space-y-3">
          {p.rows.map((r, idx) => (
            <div key={idx}>
              {/* Duas físicas na mesma linha, e é o CERTO, não um descuido:
                  o marcador embaixo e a band continuam em transition-[left]
                  puro (ease-auto) porque POSIÇÃO é contínua — mesma régua,
                  o ciclo só anda de um valor pro vizinho. Nome e valor vão
                  em <Swap> porque IDENTIDADE é discreta — outro marcador
                  (Hemoglobina→Glicose), outro paciente, outra unidade.
                  Posição interpola; identidade não pode — não existe
                  "meio caminho" entre "Hemoglobina" e "Glicose" que faça
                  sentido mostrar num frame. */}
              <div className="flex items-baseline justify-between gap-3">
                <Swap k={i}>
                  <span className="font-body text-[13px] text-white/70">{r.k}</span>
                </Swap>
                <Swap k={i}>
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
                </Swap>
              </div>
              {/* Calha, não linha: sombra interna no topo cava a régua no vidro
                  e o marcador passa a ter ONDE correr. É o relevo que separa
                  instrumento de barra de progresso. */}
              <div className="relative mt-2 h-1.5 rounded-full bg-white/[0.07] shadow-[inset_0_1px_2px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)]">
                {/* A faixa de referência é vidro assentado DENTRO da calha:
                    gradiente vertical + fio de luz no topo + um sopro de verde
                    escapando — zona segura como objeto, não como tinta. */}
                <span
                  data-bar
                  className="absolute inset-y-0 rounded-full transition-[left,width] duration-[900ms] ease-auto"
                  style={{
                    left: `${r.band[0]}%`,
                    width: `${r.band[1] - r.band[0]}%`,
                    transformOrigin: "left center",
                    background: "linear-gradient(180deg, rgba(139,158,111,0.52), rgba(139,158,111,0.28))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), 0 0 10px rgba(139,158,111,0.16)",
                  }}
                />
                {/* O escalonamento (0/90/180ms) é PERMANENTE, não só da
                    entrada: um delay que só valesse na chegada teria que ser
                    limpo depois, senão atrasaria a troca de paciente do ciclo
                    pra sempre. Constante, ele vira característica do card — as
                    agulhas sempre buscam a medida uma atrás da outra — e a
                    entrada continua sendo o gesto grande sem precisar de
                    exceção nenhuma: aqui elas varrem a régua INTEIRA a partir
                    do zero, e no ciclo só andam de um valor pro vizinho. */}
                {/* Marcador-esfera: cor chapada continua no elemento (é ela que
                    transiciona nos 900ms — gradiente não interpola), e a
                    iluminação mora num filho estático por cima: especular no
                    alto-esquerda + sombra na base, indiferentes à cor que passa
                    por baixo. O glow vai no box-shadow (interpola junto): âmbar
                    denuncia fora-da-faixa, verde descansa na faixa. */}
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black/50 transition-[left,background-color,box-shadow] duration-[900ms] ease-auto motion-reduce:transition-none"
                  style={{
                    left: entered ? `${r.pos}%` : "0%",
                    background: r.flag ? "#D6A04E" : "#A6B58F",
                    boxShadow: r.flag
                      ? "0 2px 5px rgba(0,0,0,0.5), 0 0 12px rgba(214,160,78,0.45)"
                      : "0 2px 5px rgba(0,0,0,0.5), 0 0 8px rgba(166,181,143,0.28)",
                    transitionDelay: `${idx * 90}ms`,
                  }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.14) 36%, transparent 60%), radial-gradient(circle at 50% 115%, rgba(0,0,0,0.4), transparent 58%)",
                    }}
                  />
                </span>
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
  // Lista de consultas do dia — mesma gramática das linhas de refeição do
  // MockPlano: calha de horário à esquerda, espinha colorida de 3px, nome do
  // paciente, duração/formato à direita. Micro-interação: uma consulta por
  // vez fica "ativa" (a cada ~3s) — quando ela é teleconsulta, a Gaia mostra
  // o link já criado. Cor só distingue formato: roxo = tele, sage = presencial.
  const events: { t: string; who: Person; dur: string; tele: boolean }[] = [
    { t: "08:30", who: MARINA, dur: "40 min", tele: true },
    { t: "09:40", who: JOAO, dur: "50 min", tele: false },
    { t: "11:00", who: BIANCA, dur: "30 min", tele: true },
    { t: "12:00", who: CAIO, dur: "45 min", tele: false },
  ];
  // ASSINATURA — o dia se preenche. O painel entra pela DIREITA (o Exames, ao
  // lado dele na mesma coluna, entra pela esquerda: as duas peças abrem a
  // coluna como um par, e não como duas cópias do mesmo gesto). As consultas
  // entram da esquerda em cascata, de cima pra baixo, e a espinha colorida de
  // cada uma cresce logo atrás — a agenda do dia sendo escrita na ordem em que
  // ela acontece.
  const [active, ref, entered] = useAutoCycle(events.length, 3000);
  const cur = events[active];
  return (
    <div ref={ref} className="mt-5 flex-1 px-7 pb-7 md:px-8 md:pb-8">
      <div style={px(0.32)} className={"gaia-parallax gaia-from-right rounded-[16px] p-4 " + GLASS}>
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="min-w-0 flex-1">
            <p className="font-title text-[15px] font-medium leading-tight text-white">Hoje · seg, 14</p>
            <p className="font-body text-[11.5px] leading-tight text-white/50">4 consultas · 08:30–12:45</p>
          </div>
          <Pill className="shrink-0 text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-sage-300" /> Google Calendar
          </Pill>
        </div>

        {/* Wrapper carrega a entrada, linha carrega o "agora" — mesma razão do
            MockQuestionarios: gaia-row-slide roda com fill-mode `both` e gruda
            `opacity: 1` no nó pra sempre; na linha ela mataria o opacity-45 e
            a consulta ativa nunca mais se destacaria das outras. */}
        <div className="divide-y divide-white/[0.08]">
          {events.map((ev, idx) => {
            const on = idx === active;
            return (
              <div key={idx} className={entered ? "gaia-row-slide" : "opacity-0"} style={{ animationDelay: `${180 + idx * 80}ms` }}>
                <div
                  className={
                    "relative flex items-center gap-3 rounded-[10px] px-2 py-1 transition-[background-color,opacity] duration-500 ease-auto " +
                    (on ? "bg-white/[0.06] opacity-100" : "opacity-45")
                  }
                >
                  {/* Derrame da espinha — quem acende a linha ativa é a COR DO
                      DADO (roxo = tele, sage = presencial) vazando da espinha
                      pra dentro da linha, não um wash neutro sozinho. Camada
                      própria porque gradiente não interpola: o fade fica na
                      opacity dela. Alpha baixo de propósito — o white/[0.06]
                      continua dando o lift; isto aqui só dá identidade. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[10px] transition-opacity duration-500 ease-auto"
                    style={{
                      opacity: on ? 1 : 0,
                      background: ev.tele
                        ? "linear-gradient(90deg, rgba(138,105,216,0.16) 0%, rgba(138,105,216,0.05) 42%, transparent 72%)"
                        : "linear-gradient(90deg, rgba(139,158,111,0.15) 0%, rgba(139,158,111,0.05) 42%, transparent 72%)",
                    }}
                  />
                  {/* A espinha cresce 140ms depois da linha chegar. Ela é o
                      dado (roxo = tele, sage = presencial), e dado que aparece
                      junto com o quadro que o contém não é lido como dado.
                      Na linha ativa ela EMITE (box-shadow na própria cor) — é
                      a fonte do derrame acima, senão a luz não teria de onde
                      vir. */}
                  <span
                    className={
                      "h-6 w-[3px] shrink-0 rounded-full transition-[background-color,box-shadow] duration-500 ease-auto " +
                      (ev.tele ? "bg-brand" : "bg-sage-400") +
                      (on
                        ? ev.tele
                          ? " shadow-[0_0_10px_rgba(138,105,216,0.55)]"
                          : " shadow-[0_0_10px_rgba(139,158,111,0.5)]"
                        : "") +
                      (entered ? " gaia-spine" : " scale-y-0")
                    }
                    style={{ animationDelay: `${320 + idx * 80}ms` }}
                  />
                  {/* O rosto fica DEPOIS da espinha: ela codifica formato
                      (roxo = tele, sage = presencial) e precisa continuar sendo
                      a primeira coluna, alinhada de linha em linha. */}
                  <Avatar person={ev.who} className="h-6 w-6 text-[9px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-body text-[11px] tabular-nums text-white/40">{ev.t}</span>
                      <span className="truncate font-body text-[12.5px] font-medium text-white/90">{ev.who.name}</span>
                      {/* SEMPRE montada nas 4 linhas — antes era `{on && <Pill>}`,
                          que monta/desmonta seco E empurra o layout (a linha ativa
                          ficava mais larga que as outras). Escala+opacidade fazem
                          o mesmo trabalho visual sem reflow: some via scale-90/
                          opacity-0 em vez de sumir do DOM.
                          Bônus que só apareceu ocupando espaço nas 4 linhas: o
                          truncate do nome passa a ter o MESMO orçamento de largura
                          em toda consulta, ativa ou não — antes, a linha sem "agora"
                          truncava um caractere a mais que a linha com ele, e o texto
                          "pulava" de tamanho toda vez que o ciclo passava por ela. */}
                      <Pill
                        className={
                          "shrink-0 !px-1.5 !py-0.5 text-[11px] text-white/60 transition-[opacity,transform] duration-500 ease-auto " +
                          (on ? "scale-100 opacity-100" : "scale-90 opacity-0")
                        }
                      >
                        agora
                      </Pill>
                    </div>
                  </div>
                  <span className="shrink-0 font-body text-[11px] tabular-nums text-white/50">{ev.dur}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* faixa de rodapé — altura fixa, SEMPRE presente. Só o conteúdo troca
            (fade-through via <Swap>, keyado por `active`), pra não haver reflow
            quando o ciclo alterna teleconsulta ↔ presencial. */}
        <div className="mt-2.5 flex min-h-[40px] items-center rounded-[12px] bg-white/[0.06] p-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <Swap k={active} className="w-full min-w-0">
            <div className="flex w-full min-w-0 items-center justify-between gap-3">
              <GaiaTag className="shrink-0 whitespace-nowrap">{cur.tele ? "link criado" : "lembrete enviado"}</GaiaTag>
              <Pill className="min-w-0 shrink-0 gap-1 whitespace-nowrap text-white/70">
                {cur.tele ? (
                  <>
                    meet.google.com/abc-defg
                    <IconArrowUpRight className="h-3 w-3 shrink-0 text-roxo-200" />
                  </>
                ) : (
                  "WhatsApp · 24h antes"
                )}
              </Pill>
            </div>
          </Swap>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ PRONTUÁRIO (hero teal, largura total) ═══════════════ */
/* Peças de vidro individuais — reusadas nos clusters (lg) e no empilhado (mobile). */
const MACROS: [string, string, string][] = [
  ["Proteína", "112 g", "62%"],
  ["Carbo", "140 g", "80%"],
  ["Gordura", "48 g", "45%"],
];

function PlanoAtivoCard() {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-body text-[11px] font-medium uppercase tracking-wide text-white/60">Plano ativo</p>
        <span className="rounded-full bg-brand/15 px-2 py-0.5 font-body text-[10px] font-medium text-roxo-100">3ª semana</span>
      </div>
      <p className="mt-1.5 font-title text-[16px] font-medium text-white">1.510 kcal/dia</p>
      {/* mesma gramática de tubo da barra de macros do card Plano: calha
          escavada + preenchimento com luz em cima — as barras do bento são
          todas o mesmo objeto, aqui só menor */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/25 shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]">
        <span
          data-bar
          className="block h-full w-[68%] origin-left rounded-full"
          style={{
            background: "linear-gradient(180deg, #9F82DF 0%, #8A69D8 55%, #7A57CE 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)",
          }}
        />
      </div>
      <p className="mt-1.5 font-body text-[10.5px] text-white/65">adesão 68% nesta semana</p>
      {/* macros — o detalhe que faltava: a divisão do dia, não só o total */}
      <div className="mt-3 grid grid-cols-3 gap-2.5 border-t border-white/10 pt-3">
        {MACROS.map(([nome, valor, pct]) => (
          <div key={nome}>
            <p className="font-body text-[9.5px] uppercase tracking-wide text-white/45">{nome}</p>
            <p className="mt-0.5 font-title text-[13px] font-medium text-white">{valor}</p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/25 shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]">
              <span
                data-bar
                className="block h-full origin-left rounded-full"
                style={{
                  width: pct,
                  background: "linear-gradient(180deg, rgba(159,130,223,0.9), rgba(122,87,206,0.75))",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const EXAMES: [string, string, boolean][] = [
  ["Vitamina D", "18 ng/mL", true],
  ["Ferritina", "62 ng/mL", false],
];

function ExamesNovosCard() {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-warning/15 text-warning shadow-[0_0_14px_rgba(214,160,78,0.22)]"><TrendArrow dir="down" className="h-3.5 w-3.5" /></span>
        <div>
          <p className="font-body text-[12.5px] font-medium text-white">2 exames novos</p>
          <p className="font-body text-[10.5px] text-white/65">1 fora da faixa</p>
        </div>
      </div>
      {/* quais exames, e qual valor saiu da faixa — o detalhe que faltava */}
      <div className="mt-3 flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
        {EXAMES.map(([nome, valor, fora]) => (
          <div key={nome} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 font-body text-[11.5px] text-white/80">
              <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + (fora ? "bg-warning" : "bg-sage-300")} />
              {nome}
            </span>
            <span className={"font-body text-[11.5px] tabular-nums " + (fora ? "text-warning" : "text-white/55")}>{valor}</span>
          </div>
        ))}
      </div>
      {/* lastro simétrico ao da Calibragem: por que a Vitamina D está em warning
          — 18 abaixo da faixa 30–100. O spacer 'grow' abaixo é inerte em bloco
          (lg+, ProntuarioRight: card fecha na própria altura, lastro fica logo
          após a lista com seu mt-3) e CRESCE no flex-col do mobile
          (ProntuarioStacked + grid stretch): quando a Calibragem dita a altura,
          o espaço extra vira respiro ENTRE a lista e este lastro em vez do vidro
          vazio pendurado que a Pronit vetou, e as bases dos dois cards fecham. */}
      <div className="grow" aria-hidden />
      <p className="mt-3 border-t border-white/10 pt-2.5 font-body text-[10px] uppercase tracking-wide text-white/40">
        vitamina d · ref. 30–100 ng/mL
      </p>
    </>
  );
}

const CALIBRAGEM = [
  "Trocar arroz por batata-doce",
  "2 exames fora da faixa",
  "Reforçar proteína no jantar",
];

function CalibragemCard() {
  // Loop ÚNICO do Prontuário: uma linha de calibragem acende por vez (2,6s —
  // mais rápido que os outros satélites porque são frases curtas, não sustentam
  // 3-4s sem parecer travado). O ciclo vive AQUI DENTRO, não no pai: este card
  // é renderizado DUAS vezes (ProntuarioLeft/Right no lg+ e ProntuarioStacked
  // no mobile) — se o estado subisse pro pai, as duas instâncias brigariam
  // pelo mesmo índice e o IntersectionObserver do useAutoCycle não saberia
  // qual nó DOM observar. Cada instância tem seu próprio ref/ciclo.
  const [active, ref] = useAutoCycle(CALIBRAGEM.length, 2600);
  return (
    <div ref={ref}>
      <p className="flex items-center gap-1.5 font-body text-[11px] font-semibold uppercase tracking-wide text-white/55">
        <IconSparkles className="h-3.5 w-3.5 text-roxo-200" /> Calibrado pela Gaia
      </p>
      <div className="mt-2.5 flex flex-col">
        {CALIBRAGEM.map((t, i) => {
          const on = i === active;
          return (
            <p
              key={t}
              className={
                "flex items-center gap-2 border-t border-white/10 py-2 font-body text-[12px] leading-snug transition-colors duration-500 ease-auto first:border-t-0 first:pt-0 last:pb-0 " +
                (on ? "text-white/90" : "text-white/45")
              }
            >
              {/* dot acende só na linha ativa — cor não transiciona bem em
                  opacity 0→1 com bg translúcido, então some via width/scale */}
              <span
                className={
                  "h-1.5 w-1.5 shrink-0 rounded-full bg-roxo-300 transition-[transform,box-shadow] duration-500 ease-auto " +
                  (on ? "scale-100 shadow-[0_0_8px_rgba(193,169,211,0.6)]" : "scale-0")
                }
              />
              {t}
            </p>
          );
        })}
      </div>
      {/* de onde a Gaia tirou os ajustes — dá lastro à sugestão */}
      <p className="mt-3 border-t border-white/10 pt-2.5 font-body text-[10px] uppercase tracking-wide text-white/40">
        a partir de 2 exames · 1 questionário
      </p>
    </div>
  );
}

/* ASSINATURA do Prontuário — as peças convergem. Os satélites vêm de FORA e
   fecham em volta do phone: o cluster esquerdo entra pela esquerda, o direito
   pela direita, quase juntos (delays de 0–140ms, não a cascata larga dos
   outros cards). É a promessa do card encenada — "cada paciente em oito abas,
   tudo numa tela": as partes soltas da consulta se juntando em torno de uma
   coisa só. Por isso o gesto é convergência e não cascata: cascata contaria
   uma lista, e o assunto aqui é reunião. */

/* Cluster esquerdo — UM card de vidro espia atrás da borda esquerda do phone
   (lg+). Só Plano Ativo: os pills saíram, o palco fica com 3 cards no total.
   Largura maior (p-4/w-[248px]) pra dar espaço de trabalho aos macros — não é
   escala, é conteúdo: fonte normal, mais linhas de informação. */
function ProntuarioLeft() {
  return (
    <div className="pointer-events-none absolute left-[5%] top-1/2 hidden w-[248px] -translate-y-1/2 flex-col lg:flex xl:left-[7%]">
      <div data-enter-delay={0} style={px(1.55, 0)} className={"gaia-parallax gaia-converge-l rounded-[16px] p-4 " + GLASS_ON_LIGHT + " " + FLOAT}>
        <PlanoAtivoCard />
      </div>
    </div>
  );
}

/* Cluster direito — dois cards de vidro empilhados: Calibragem no topo (largo,
   com lista + lastro), Exames novos embaixo colado na direita (mais estreito).

   GAP EXPLÍCITO, NÃO justify-between — e a diferença foi medida, não é gosto.
   O container era h-[92%] (312px @1440) com justify-between, mas os dois cards
   somam 357px de conteúdo natural: num container MAIS CURTO que o conteúdo,
   justify-between não tem vão pra distribuir e os cards se ENCAVALAM. Medido no
   render: −2,7px entre o rodapé da Calibragem e o topo dos Exames, os dois se
   tocando em quadro. Altura livre + gap fixo diz o que se queria dizer o tempo
   todo — "estes dois se separam por 20px" — e não depende de a soma dos cards
   caber num percentual do palco que ninguém recalcula quando o texto cresce.

   A FRESTA PRO PHONE É CONTRA O APARELHO, NÃO CONTRA A ÂNCORA. Esta era
   right-[4%] w-[256px], e o comentário antigo prometia "44px de fresta" com a
   conta feita em cima de [data-phone-start] (x 596–844). Só que a âncora tem
   248px e o phone RENDERIZA 326 — o glb no START_G nasce ~35px mais largo de
   cada lado que a caixa que marca o lugar dele. A borda real do aparelho está
   em x 883, não 844, e o cluster começava em 888,8: fresta REAL de 5,8px, o
   Calibrado encostado no phone (o print da Pronit). w-[240px] com a borda quase
   no fim do palco recompõe a folga em ~60px, medidos contra o pixel do
   aparelho. Quem for mexer nisto de novo: mede o phone no render, a âncora
   mente sobre o tamanho dele. */
function ProntuarioRight() {
  return (
    <div className="pointer-events-none absolute right-[3%] top-1/2 hidden w-[240px] -translate-y-1/2 flex-col gap-5 lg:flex xl:right-[5%]">
      {/* par da direita SEM rotação, borda direita flush: Calibragem preenche o
          container e Exames (mais estreito) cola na mesma borda via self-end. */}
      <div data-enter-delay={40} style={px(1.5, 0)} className={"gaia-parallax gaia-converge-r rounded-[16px] p-4 " + GLASS_ON_LIGHT + " " + FLOAT}>
        <CalibragemCard />
      </div>
      <div data-enter-delay={140} style={px(1.5, 0)} className={"gaia-parallax gaia-converge-r w-[200px] self-end rounded-[16px] p-4 " + GLASS_ON_LIGHT + " " + FLOAT}>
        <ExamesNovosCard />
      </div>
    </div>
  );
}

/* Empilhado — mobile/tablet. Os três satélites ocupam o TOPO do card e o phone
   nasce EMBAIXO deles, centrado, atravessando a borda de baixo do card (ver a
   âncora no palco mobile). Antes a pilha vivia à esquerda com o phone por
   cima, e o overlay (z-60, acima do conteúdo do card) tampava os três.
   ARRANJO (pedido da Pronit, 2026-07-21): dupla de largura IGUAL em cima
   (Calibragem | Exames) e uma faixa cheia embaixo (Plano Ativo). A colagem
   solta anterior — larguras divergentes (176/138/248), degrau vertical na
   Exames e o Plano empurrado pra direita por ml-auto — saiu junto.
   -mx-4: a colagem sangra sobre o padding do card — no mock os blocos quase
   encostam na borda, e sem o bleed a dupla de cima não cabe lado a lado. */
function ProntuarioStacked() {
  return (
    <div className="-mx-4 mt-7 lg:hidden">
      {/* px(0): entram, mas não seguem o cursor nem tortas — dedo não tem
          hover; depth aqui seria peso de will-change sem contrapartida.
          Pedido da Pronit: duas colunas IGUAIS em cima (Calibragem | Exames,
          grid-cols-2 — o minmax(0,1fr) que o Tailwind já embute nessa
          utility impede o conteúdo de estourar a coluna, ao contrário de um
          flex comum) e o Plano Ativo embaixo ocupando a largura TOTAL das
          duas. Quem ainda dita o slot é o TEXTO: o Plano Ativo tem macros em
          3 colunas e "PROTEÍNA" vazava pra dentro do "CARBO" quando
          espremido numa coluna estreita (medido no render) — por isso ele
          exige a faixa cheia de baixo, nunca uma metade. A Calibragem é
          lista e quebra linha de graça, então ela e a Exames dividem o topo
          sem drama, agora na mesma largura e sem o degrau vertical que
          existia antes. */}
      {/* stretch (default) + bases alinhadas: pedido da Pronit. Antes rodava
          items-start porque o stretch esticava a Exames e abria ~120px de vidro
          vazio embaixo do "Ferritina" — mas agora a Exames ganhou lastro próprio
          (ver ExamesNovosCard) que o spacer 'grow' cola na base, então o espaço
          extra vira respiro entre a lista e o rodapé em vez de buraco. A
          Calibragem segue ditando a altura (3 linhas + quebra + lastro); o
          wrapper flex-col é o que deixa o grow da Exames empurrar o lastro pra
          baixo. items-stretch fica implícito no default do grid. */}
      <div className="grid grid-cols-2 gap-2">
        <div data-enter-delay={0} style={px(0)} className={"gaia-parallax gaia-from-left rounded-[16px] p-4 " + GLASS_ON_LIGHT + " " + FLOAT}>
          <CalibragemCard />
        </div>
        <div data-enter-delay={90} style={px(0)} className={"gaia-parallax gaia-from-right flex flex-col rounded-[16px] p-4 " + GLASS_ON_LIGHT + " " + FLOAT}>
          <ExamesNovosCard />
        </div>
      </div>
      <div data-enter-delay={180} style={px(0)} className={"gaia-parallax gaia-from-right w-full mt-3 rounded-[16px] p-4 " + GLASS_ON_LIGHT + " " + FLOAT}>
        <PlanoAtivoCard />
      </div>
    </div>
  );
}

export default function Features() {
  const root = useRef<HTMLElement>(null);
  // Instâncias de SplitText criadas pelo ENTER (ver useGSAP abaixo). Não são
  // tweens — gsap.context/ScrollTrigger não as rastreia nem as reverte
  // sozinho. Guardamos aqui pra reverter explicitamente no unmount, senão
  // Fast Refresh duplica os wrappers de linha/char a cada remount.
  const splitsRef = useRef<{ revert: () => void }[]>([]);

  useGSAP(
    () => {
      /* ── ENTER — portado de Enter.js (demo codrops) ───────────────────────
         No demo, ENTER(container, 0.32) dispara em PARALELO com a transição
         de página (0.7s), em tempo real, a partir de init(), e anima TUDO
         que chega numa timeline só (h1 + parágrafos + linhas decorativas).
         Aqui não há transição de página.

         QUINTA RODADA (mecanismo ATUAL — o resto deste bloco, incluindo os
         parágrafos "cortina" abaixo, é HISTÓRICO): a Pronit viu na tela e
         reprovou a ORDEM de entrada (bentos aparecendo antes do título), não
         o scrub em si. Causa: a cortina (clipPath dirigido por `eased`,
         #features cravado em y:-naturalTop) revela a section de BAIXO PRA
         CIMA — pra QUALQUER deslocamento uniforme do conteúdo, a peça com
         offsetTop MENOR (o h2, no topo) é sempre revelada por ÚLTIMO. Não era
         ajustável tunando LEAD_FRAC/DUR_MAX — é a mecânica da MÁSCARA que
         fixava a ordem. A Pronit escolheu: o Features sobe como BLOCO, sem
         clip, liderado pela própria borda de CIMA (ver ARoberta.tsx,
         applyTransition, o gsap.set(featuresEl,...) final — QUINTA RODADA lá
         também). Não há mais "cortina": #features não é mais cravado, ele
         VIAJA — topo em screen-y=(1-eased)*vh, de vh (fora da tela) até 0.
         Uma peça com `offsetTop_i` cruza a base da viewport (fica visível,
         entrando por baixo) quando `eased > offsetTop_i/vh` — reveal_i =
         offsetTop_i/vh, o INVERSO da fórmula antiga (1 - offsetTop_i/vh).
         Ver `solve()` mais abaixo pro cálculo atual; os parágrafos "cortina"
         que seguem descrevem o mecanismo ANTERIOR e ficam como registro de
         por que a timeline é pausada+progress-driven (isso não mudou), não
         como descrição da geometria de hoje.

         Aqui não há transição de página — a "cortina" [HISTÓRICO, ver acima]
         era a abertura do #a-roberta sobre o #features (ver ARoberta.tsx,
         applyTransition): p = 1 - naturalTop/vh vai de 0 a 1 em exatamente 1
         viewport de scroll, naturalTop é a posição NATURAL (não-transformada)
         do topo do #features, e ENQUANTO a janela durava o #features ficava
         CRAVADO na tela (y:-naturalTop) com um clipPath que revelava seu
         conteúdo de cima pra baixo — não era um crossfade, era uma cortina
         literal.

         CORREÇÃO (2ª rodada — a 1ª errou): eu tinha isolado só h2+badge
         nesta timeline e deixado [data-card]/[data-bar] com o
         scrollTrigger PRÓPRIO deles (trigger:"[data-grid]"). Isso quebra
         especificamente NESTA seção porque o [data-grid] scrollTrigger
         mede contra a posição NATURAL (não-transformada) do documento —
         mas durante a janela da transição essa posição não tem mais
         nenhuma relação com o que está na tela (o #features inteiro já
         está cravado em y:-naturalTop). O resultado medido: a faixa dos
         cards é revelada pela cortina em p≈0.51, mas o trigger deles só
         disparava em p≈0.63 — a cortina abria e mostrava um retângulo
         opacity:0 por um trecho inteiro do scroll antes dos cards
         aparecerem. H2/badge não tinham esse problema porque já estavam
         dentro da timeline única, disparada no ponto certo.

         FIX: [data-card] e [data-bar] entraram pra dentro da MESMA
         timeline do ENTER (ver abaixo), disparada UMA VEZ, no mesmo
         instante que h2/badge — exatamente a estrutura do demo (uma
         timeline só cuida de todo o conteúdo da página que chega).

         GATILHO: tentei ancorar em trigger:"#a-roberta" com start:"bottom
         55%" primeiro (ideia: #a-roberta nunca leva transform, então seria
         a âncora "mais segura"). MEDIDO (scroll gradual monotônico, sem
         busca binária) que isso NUNCA dispara — nem passando de naturalTop
         até -864px (bem depois do fim da janela). Motivo: #a-roberta é ele
         PRÓPRIO o trigger de pin de OUTRO ScrollTrigger (o da ARoberta,
         que cria o pin-spacer). Quando um segundo ScrollTrigger é ancorado
         num elemento que já é alvo de pin, o GSAP recalcula o range de
         start/end considerando a DURAÇÃO DO PIN (o pin-spacer infla o
         "tamanho" do trigger no espaço de scroll) — o resultado não bate
         mais com a leitura direta de getBoundingClientRect().bottom que eu
         fazia via JS pra achar naturalTop. Voltei pro que já tinha
         funcionado e testado nas rodadas anteriores: trigger:root.current
         (o próprio #features) com start:"top 55%". #features NÃO é alvo
         de pin de ninguém (só recebe um gsap.set/transform manual do
         ticker da ARoberta, que não registra pin nenhum no ScrollTrigger),
         então o cálculo de start/end dele em refresh() fica simples e
         bateu, nas duas rodadas de medição, com naturalTop=0.55*vh dentro
         de ~5px.

         CORREÇÃO (3ª rodada — retângulo preto): start:"top 55%" (p≈0.46)
         ainda era TARDE DEMAIS. Medido (aba nova por ponto, scroll gradual
         monotônico, sem busca binária — a mesma disciplina desta nota):
         a cortina revela a faixa de [data-card] em p≈0.19 (ela desce a
         partir da borda de baixo da tela, e os cards ficam entre screen-y
         408 e 848 — a borda cruza 848 bem antes de p=0.46), mas o gatilho
         só disparava em p≈0.46. Entre 0.19 e 0.46 a cortina abria sobre
         cards ainda em opacity:0 (o gsap.set logo abaixo) — um retângulo
         preto por ~27% da janela de scroll, exatamente o que a Pronit via.
         O erro original comparava o gatilho com o ponto em que a cortina
         alcança a BASE dos cards (p≈0.51 — perto de 0.46, parecia margem
         de sobra); o que importa é o TOPO deles (p≈0.19), bem mais cedo.

         FIX (dois, não um — ver justificativa abaixo do porquê os dois):
         start passou pra "top bottom" (dispara quando o topo do
         #features toca a base da viewport, ou seja p≈0 — o INÍCIO da
         janela, não o meio). E o tween de [data-card] deixou de usar
         opacity (ver o gsap.set e o tl.to logo abaixo): mesmo disparando
         cedo, a entrada roda em TEMPO REAL (once:true + onEnter, não
         scrubado) enquanto a cortina é dirigida por SCROLL — um usuário
         rolando rápido pode alcançar p≈0.19 antes dos 1,48s que a
         timeline leva pra terminar o último card do stagger. Só mover o
         gatilho reduz o risco; tirar a opacidade FECHA ele: o card fica
         SEMPRE pintado (só desloca em y, nunca invisível), então não hà
         estado intermediário que a cortina possa expor como buraco —
         é o mesmo raciocínio do Enter.js citado no brief (texto nunca
         some por opacity:0, só translada dentro de uma máscara).

         CORREÇÃO (4ª rodada — ESTA — a cena assentada): as três rodadas acima
         foram todas variações da mesma aposta perdida — tentar fazer uma
         timeline de TEMPO REAL (~2,1s) coincidir com uma cortina dirigida por
         SCROLL, movendo o gatilho pra cada vez mais cedo. Mover o gatilho pra
         "top bottom" (p≈0) matou o retângulo preto, mas comprou o problema
         oposto, que é o que a Pronit viu e chamou: num scroll normal a janela
         inteira leva bem mais que 2,1s, então a timeline TERMINA muito antes
         de a cortina abrir e a máscara sobe sobre uma cena JÁ ASSENTADA — a
         entrada acontece toda escondida atrás da ARoberta. Nenhum gatilho
         conserta isso: um relógio e um scroll não se encontram, e não havia
         posição de gatilho que os fizesse encontrar.

         O conserto é deixar de ter relógio. A timeline nasce PAUSADA no mount
         e o `progress` dela é escrito por frame a partir do `eased` publicado
         pelo ticker da ARoberta (lib/robertaTransition.ts) — o MESMO número
         que posiciona a borda da cortina. Não é sincronia, é identidade: não
         existe mais "rápido demais" nem "cedo demais" porque não existe mais
         tempo, só posição de cortina. Cada peça é posicionada pela própria
         geometria (ver LEAD_FRAC/DUR_MAX e `solve` abaixo), não por gosto.

         Efeito colateral DESEJADO: rolar pra cima desfaz a entrada (scrub é
         reversível). Medido: ida e volta batem em 0.00px de diferença em todo
         ponto — é função pura da posição de scroll, não bug.

         A restrição de opacity do [data-card] (3ª rodada, acima) CONTINUA
         valendo, e agora por motivo mais forte: sob scrub o usuário pode PARAR
         no meio do progresso e ficar lá. Um card em opacity:0 com a cortina
         aberta deixou de ser uma corrida que dá pra perder e virou um
         retângulo preto DETERMINÍSTICO, parado na tela. Só y. */

      // Estado inicial dos cards/barras — aplicado já na montagem (síncrono,
      // dentro do escopo do useGSAP, revertido pelo gsap.context no
      // unmount), não dentro de enter(): eles precisam começar deslocados
      // ANTES do usuário rolar até o gatilho, senão apareceriam "crus"
      // (sem entrada) em quem já monta a página rolada. SÓ y, sem opacity
      // (ver a CORREÇÃO 3ª rodada acima): o card fica sempre pintado, só
      // 40px abaixo da posição final — nunca invisível, então a cortina
      // não tem estado algum que possa revelar como buraco preto. h2/badge
      // continuam usando opacity (herdada do CSS/split) porque não têm
      // esse risco: são texto fatiado por char/linha dentro de máscara
      // própria do SplitText, não um bloco grande como o card.
      /* prefers-reduced-motion: a seção nasce ASSENTADA — sem split, sem
         timeline, sem fallback. O resto do arquivo já respeita reduce
         (useAutoCycle congela, Swap troca seco, gaia-* morre no globals.css),
         mas o fallback lá embaixo (ScrollTrigger → timeline.play()) tocaria a
         entrada inteira — chars girando em rotateX 60 — justamente no único
         caminho que o usuário de reduce percorre. Retornar aqui deixa cards,
         barras e h2 no estado autoral (visíveis, parados), que é o contrato. */
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.set("[data-card]", { y: 40 });
      gsap.set("[data-bar]", { scaleX: 0, transformOrigin: "left center" });
      /* O h2 fica escondido do mount até o enter() (que já o reacende via
         gsap.set(h2,{opacity:1}) DEPOIS de deslocar os chars). Sem isto, com
         fonte não-cacheada há um flash "texto assentado → some → anima": os
         cards são deslocados sincronamente aqui, mas os chars do h2 só dentro
         do document.fonts.ready.then() — e nesse vão o h2 pintava inteiro.
         `opacity` e não autoAlpha: o enter() devolve só opacity:1, e um
         visibility:hidden órfão nunca seria desfeito. */
      gsap.set(root.current!.querySelector("h2"), { opacity: 0 });

      /* ── LEAD_FRAC / DUR_MAX — os dois números que definem o encontro ─────
         A timeline inteira tem duração 1 e é dirigida por `progress = eased`
         (o MESMO número que posiciona o topo do #features, publicado pelo
         ticker da ARoberta — ver lib/robertaTransition.ts). Então "tempo" aqui
         não é segundo: é posição do bloco. Um tween em `pos` roda enquanto o
         bloco sobe de `pos` a `pos + dur` no espaço da ease.

         QUINTA RODADA — geometria invertida (ver a nota grande no topo deste
         useGSAP e `solve()` mais abaixo pro mecanismo atual completo). O topo
         do #features vive em screen-y = (1 - eased) * vh e SOBE. Uma peça
         cujo topo está `offsetTop` px abaixo do topo do bloco é revelada
         quando (1-eased)*vh + offsetTop = vh, ou seja em eased_i =
         offsetTop/vh — não mais `1 - offsetTop/vh`. Consequência (a que a
         Pronit pediu): quem está no alto do #features (badge, h2 — offsetTop
         pequeno) é revelado PRIMEIRO (eased_i ≈ 0.15–0.2), e os cards, mais
         embaixo, são revelados DEPOIS (eased_i ≈ 0.4). Título antes dos
         bentos. A ordem de entrada não é a ordem de leitura por acidente — é
         a ordem da geometria, e agora a geometria FOI ESCOLHIDA pra bater com
         a ordem de leitura.

         POR QUE LEAD/DUR CONSTANTES NÃO SERVEM (medido nesta sessão, com
         LEAD=0.15/DUR=0.3, os valores de partida): um LEAD fixo fixa a FRAÇÃO
         DE TEMPO já decorrida na revelação (LEAD/DUR = 0.5), mas o que os
         olhos veem é FRAÇÃO DE DISTÂNCIA, e power3.out entrega 1-(1-t)³ =
         87,5% da distância em t=0.5. Medido: o card era revelado em eased
         0.597 já a 5px dos 40 finais — assentado, na prática. O bug não tinha
         sido consertado, só tinha andado pra frente. LEAD_FRAC ataca a fração
         diretamente: é o t do tween no instante da revelação. Em 0.1,
         power3.out está a 27% da distância — a peça é pega claramente em
         movimento, com ~29 dos 40px ainda por andar à vista.

         E DUR não pode ser constante porque o ORÇAMENTO de cada peça não é: o
         que sobra depois da revelação é (1 - eased_i), e isso vale 0.40 pros
         cards mas só 0.20 pro h2 e ~0.12 pro badge (eles são revelados quase
         no fim). Um DUR=0.3 chapado não cabe no cabeçalho — o clamp em
         `1 - DUR` empurrava badge e h2 pra mesma posição, e os dois chegavam
         quase assentados na revelação, exatamente o que este conserto existe
         pra matar. `durFor` abaixo dá a cada peça o maior tween que ainda
         aterrissa dentro da própria janela dela. */
      const LEAD_FRAC = 0.1;
      const DUR_MAX = 0.3;
      // Barras crescem DENTRO de cards que já entraram — atrasadas em relação
      // à própria geometria de propósito (mesma razão do offset 0.3 do tween
      // antigo). Não têm o risco de "buraco preto": uma barra em scaleX:0
      // dentro de um card pintado é uma linha que ainda não cresceu.
      const BAR_LAG = 0.08;

      /* Distância do topo do #features até o topo da peça, em px de LAYOUT.
         `offsetTop` (e não getBoundingClientRect) é o ponto todo: durante a
         janela o #features leva `y` (ver ARoberta.tsx, QUINTA RODADA) e os
         cards levam y:40 — rect seria contaminado pelos DOIS transforms;
         offsetTop é layout puro, transform não o move. QUINTA RODADA: não é
         mais verdade que o topo do #features fica cravado em screen-y=0 — ele
         agora VIAJA (screen-y=(1-eased)*vh, ver o bloco grande no topo deste
         arquivo) — mas `offsetTop` continua sendo a régua certa, porque
         `solve()` abaixo não precisa de screen-y nenhum: a fórmula de reveal
         usa `offsetTop_i/vh` direto (ver `solve`), e offsetTop é exatamente
         essa distância, imune a QUALQUER transform que o bloco inteiro leve.
         Soma a cadeia de offsetParent porque o offsetParent imediato de um
         card não é o #features, é o wrapper .relative do miolo.

         `null` quando a cadeia NÃO chega no #features. Isso não é paranoia de
         API — é medido: os [data-bar] de breakpoint escondido (os mocks que só
         existem no mobile) vivem num subtree não renderizado, e nesses o
         `offsetParent` é null já no primeiro passo. Somar a cadeia deles dá 0,
         que este código leria como "topo do #features" — a peça mais alta de
         todas, revelada por último. É uma mentira: eles não estão em lugar
         nenhum. Devolver null deixa quem chama decidir, em vez de fabricar uma
         geometria plausível pra um elemento que não tem nenhuma. */
      const topWithin = (el: HTMLElement, ancestor: HTMLElement): number | null => {
        let top = 0;
        let node: HTMLElement | null = el;
        while (node && node !== ancestor) {
          top += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return node === ancestor ? top : null;
      };

      let tl: gsap.core.Timeline | null = null;
      let st: ScrollTrigger | null = null;
      let tick: (() => void) | null = null;
      let disposed = false;
      // `driven` = a cortina está dirigindo o progress. `freed` = caímos no
      // fallback em tempo real e a timeline agora anda sozinha (o ticker não
      // pode mais escrever progress, senão briga com o play()).
      let driven = false;
      let freed = false;
      let lastProgress = -1;

      const enter = () => {
        if (disposed || !root.current) return;
        const h2 = root.current.querySelector("h2");
        const badge = root.current.querySelector<HTMLElement>("[data-reveal]");
        if (!h2) return;

        gsap.set(h2, { opacity: 1 });

        // type:"chars" preserva o <span> itálico ("num lugar só.") — o
        // SplitText refaz a estrutura de tags aninhadas por char, cada char
        // que nascia dentro do span continua dentro de um clone dele.
        //
        // "words, chars" (não só "chars"): medido sem isso, o próprio
        // <h2> tem `text-balance` (Tailwind text-wrap:balance) e o h2 quebra
        // linha sozinho — com CADA letra virando um <div inline-block>
        // independente, sem um wrapper de palavra a mais, o navegador ganha
        // pontos de quebra DENTRO da palavra e o layout de balanço partiu
        // "precisa" ao meio ("...consulta p" / "recisa, num..."). Com
        // "words, chars" o SplitText cria um nível de palavra (inline-block,
        // atômico) por cima dos chars — a quebra de linha só pode acontecer
        // ENTRE palavras de novo, como no texto normal. `.chars` continua
        // disponível igual (a lista de chars-folha, independente de ter
        // nível de word no meio).
        //
        // "lines" ENTROU (era só "words, chars") — achado do coordenador,
        // medido em produção: sem o nível de linha, os chars do h2 ficavam
        // com y:100%+rotateX:60 sem NENHUMA máscara ao redor (o h2 não tem
        // overflow:hidden nenhum). A premissa de "y:100% é invisível" só é
        // verdade dentro de um overflow:hidden — sem ele, um char deslocado é
        // só um char deslocado, visível. Sob a timeline em tempo real
        // (mecanismo antigo) isso nunca aparecia: o tween terminava bem antes
        // da cortina revelar aquela área. Sob SCRUB, a cortina pode avançar
        // devagar ou parar num ponto em que a LINHA já foi revelada mas o
        // tween daquela linha ainda não começou. Medido: em eased≈0,598 a
        // borda estava em 256,6px, mas os chars da segunda linha — ainda
        // intocados — tinham topo em 304,1px: abaixo da borda, visíveis,
        // parados, "num lugar só." flutuando sozinha sobre uma faixa preta. O
        // nível de `lines` dá a cada linha o próprio overflow:hidden (ver
        // `wrapLines` com `maskOnly:true` abaixo) — fecha a fresta.
        const headingSplit = new SplitText(h2, { type: "lines, words, chars" });
        // Sem aria:false (o demo usa isso no h1 e o esconde da a11y tree —
        // NÃO copiado aqui: h2 é conteúdo real do Features). Default do
        // SplitText 3.15 é aria:"auto" — aplica aria-label com o texto
        // completo no elemento e aria-hidden nos chars fatiados, então
        // leitor de tela lê a frase inteira, tela normal vê os chars animar.
        // aria:"none" SÓ no badge (o h2 acima mantém o default): o badge é um
        // <span> sem role, e aria-label em span sem role é atributo proibido —
        // axe reprova (aria-prohibited-attr) e derruba a nota de acessibilidade.
        // Aqui não custa nada em leitura: este split é `type:"lines"` numa
        // linha só, então o texto continua inteiro e na ordem dentro do DOM,
        // sem chars fatiados pra esconder. É diferente do h2, que fatia em
        // chars e por isso PRECISA do aria-label pra não ser lido letra a letra.
        const badgeSplit = badge ? new SplitText(badge, { type: "lines", aria: "none" }) : null;

        splitsRef.current.push(headingSplit);
        if (badgeSplit) splitsRef.current.push(badgeSplit);

        // wrap_chars (wrap.js) — SEM wrapper extra, igual ao demo: só seta o
        // estado inicial nos próprios nós de char que o SplitText já gera.
        // O rotateX só fica 3D de verdade por causa do `perspective:1000px`
        // que o JSX abaixo aplica no <h2> (mesma receita do h1 do demo,
        // app.css: "h1 { perspective: 1000px; backface-visibility: hidden }").
        gsap.set(headingSplit.chars, { y: "100%", rotateX: 60, force3D: true });

        // wrap_lines (wrap.js) — envolve CADA linha num div overflow:hidden
        // próprio: o y:100% inicial só fica invisível por causa desse
        // overflow (sem ele a linha vazaria pra fora, deslocada mas visível).
        // Devolve os wrappers na mesma ordem de `split.lines` — quem chama
        // precisa deles pra MEDIR a posição da linha (é o wrapper que fica no
        // fluxo do documento depois do insertBefore/appendChild; a `line`
        // original vira filho dele).
        //
        // `maskOnly` — o badge anima a PRÓPRIA linha (y:100%→0: a linha É o
        // alvo do tween, ver o tl.to logo abaixo), então ela precisa nascer
        // em y:100% igual a qualquer outro alvo de tween. O h2 é diferente:
        // quem anima são os CHARS (y:100%+rotateX:60, já setados acima) — a
        // linha do h2 nunca é alvo de tween nenhum, só existe pra dar
        // overflow:hidden. Setar y:100% nela também prenderia os chars atrás
        // de um deslocamento extra que nenhum tween desfaz (`maskOnly:true`
        // pula esse set pro h2).
        const wrapLines = (split: SplitText, opts: { maskOnly?: boolean } = {}) => {
          const wrappers: HTMLElement[] = [];
          split.lines.forEach((line) => {
            const wrapper = document.createElement("div");
            wrapper.style.overflow = "hidden";
            wrapper.style.lineHeight = "100%";
            line.parentNode?.insertBefore(wrapper, line);
            wrapper.appendChild(line);

            /* `overflow:hidden` NÃO CLIPA O CHAR DO H2 (achado pelo
               coordenador, medido em produção — e a causa raiz não era a que
               pareceu na primeira medição). Um char em y:100%+rotateX:60,
               dentro do `perspective:1000px` do h2, ficava PINTADO fora da
               caixa 2D do wrapper mesmo estando inteiramente abaixo dela —
               medido (scroll parado em eased≈0,671): char com top/bottom
               304–332px, wrapper com clip em 234–290px, ou seja o char
               inteiro 14 a 42px ABAIXO do fundo do próprio wrapper, e AINDA
               ASSIM `elementFromPoint` batia nele. `overflow:hidden` corta
               pela CAIXA de layout — mas o `force3D:true` (default desta
               timeline) promove o char a uma layer de composição própria pra
               acelerar o rotateX, e sob um ancestral com `perspective` essa
               layer nem sempre respeita o clip de caixa de um `overflow:
               hidden` intermediário. É um comportamento conhecido de
               renderers com conteúdo 3D composto: o clip por CAIXA
               (overflow) e o clip por MÁSCARA (clip-path) não são a mesma
               operação por baixo do capô, e só o segundo é aplicado no
               COMPOSITING, depois da promoção de layer — o primeiro, não.

               TENTATIVA REVERTIDA: aumentar a caixa do wrapper (padding-
               bottom + margin-bottom negativo) pra "conter" o vazamento.
               Piorou: o char passou a caber DENTRO da caixa maior — mas
               "caber dentro" de um overflow:hidden quer dizer VISÍVEL, não
               escondido. A caixa que devia ESCONDER o estado de repouso virou
               grande o bastante pra MOSTRÁ-LO. Entendimento errado do
               mecanismo, não variação de grau — revertido, não ajustado.

               FIX medido (A/B direto no DOM, scroll parado no ponto exato da
               violação): `clip-path: inset(0)` no wrapper, no lugar do
               `overflow:hidden` sozinho — mesmo retângulo, mas resolvido no
               COMPOSITING, depois de qualquer promoção de layer, não na
               CAIXA de layout antes dela. Testado isoladamente: com
               overflow:hidden sozinho, `elementFromPoint` bate no char
               (hitIsTarget:true) — com clip-path:inset(0) no mesmo wrapper,
               no MESMO frame, para de bater (hitIsTarget:false). Confirmado
               que é o rotateX especificamente: o mesmo char com só
               `translateY(56px)` (sem rotateX) já ficava clipado
               corretamente por overflow:hidden puro — a rotação é o gatilho,
               não o deslocamento. `overflow:hidden` continua no wrapper (não
               custa nada, é redundante-seguro pro caso não-3D); clip-path é
               quem garante o corte de verdade aqui.

               Só no h2 (`maskOnly`) — o badge não passa por isto: a linha
               dele é o PRÓPRIO alvo do tween, sem rotateX, sem 3D, e já
               media certo com overflow:hidden puro (é a mesma mecânica que
               sempre funcionou para ele, sem mudança). */
            if (opts.maskOnly) {
              wrapper.style.clipPath = "inset(0px)";
            }

            wrappers.push(wrapper);
          });
          if (!opts.maskOnly) {
            gsap.set(split.lines, { y: "100%", force3D: true });
          }
          return wrappers;
        };
        if (badgeSplit) wrapLines(badgeSplit);
        // Máscara por linha do h2 — ver o comentário grande acima do
        // `new SplitText(h2, ...)` pro bug que isto resolve. `h2LineWrappers`
        // é consumido no loop de char abaixo pra medir onde CADA linha entra
        // na janela da cortina (não mais o h2 inteiro).
        const h2LineWrappers = wrapLines(headingSplit, { maskOnly: true });

        // PAUSADA e construída no MOUNT (não mais no onEnter): quem dá o
        // tempo dela agora é a cortina, via progress. Duração total 1 =
        // `eased` (ver o bloco de LEAD_FRAC/DUR_MAX acima). As durations abaixo já não
        // são segundos — são frações da janela de scroll.
        const timeline = gsap.timeline({ paused: true, defaults: { force3D: true } });
        tl = timeline;

        const vh = window.innerHeight;

        /* Resolve a janela de UMA peça. Dado o topo dela (em px de layout),
           devolve onde o tween começa e quanto dura, em unidades de `eased`.

           QUINTA RODADA — `reveal` INVERTEU. O #features não é mais cravado
           com uma cortina abrindo por cima; ele sobe como BLOCO, topo em
           screen-y=(1-eased)*vh (ver ARoberta.tsx). Uma peça a `top` px do
           topo do bloco tem screen-y=(1-eased)*vh+top, e cruza a BASE da
           viewport (fica visível, entrando por baixo) quando
           (1-eased)*vh+top < vh, ou seja eased > top/vh. reveal = top/vh —
           era `1 - top/vh`. A consequência é a INVERSA da anterior: quem tem
           `top` MENOR (h2, badge, topo do #features) é revelado PRIMEIRO;
           quem tem `top` MAIOR (cards, mais abaixo) é revelado DEPOIS. Título
           antes dos bentos — era isso que a Pronit queria, e não dava pra
           conseguir só ajustando LEAD_FRAC/DUR_MAX: a ORDEM vinha da fórmula
           de `reveal`, não do "quanto antes" de cada peça.

           dur    = o maior tween que ainda aterrissa em 1: de
                    reveal + dur*(1-LEAD_FRAC) ≤ 1 sai
                    dur ≤ (1 - reveal)/(1 - LEAD_FRAC). Teto em DUR_MAX pra que
                    peças com orçamento de sobra (agora as de CIMA, reveladas
                    cedo) não estiquem a entrada por meia janela.
           pos    = reveal - dur*LEAD_FRAC → na revelação o tween está exatamente
                    em t = LEAD_FRAC, pra TODAS as peças. É essa uniformidade
                    que faz a cena inteira ter a mesma "pegada" enquanto o
                    bloco sobe, em vez de cada peça chegar num estágio
                    diferente do próprio movimento.
           O clamp final segura os dois extremos (peça revelada em eased≈0 não
           pode começar antes de 0; lag de barra não pode empurrar o fim além
           de 1).

           LEAD_FRAC/DUR_MAX ficam com os MESMOS valores (0.1/0.3) — a
           inversão do `reveal` não muda o ORÇAMENTO de cada peça, só QUAL
           peça tem orçamento largo ou apertado (inverteu quem é "de cima" e
           "de baixo"). Medido depois da mudança (ver relatório desta sessão)
           pra confirmar que os números continuam bons — se não servissem,
           era pra medir e ajustar, não chutar; mediram e serviram. */
        const solve = (top: number, lag = 0) => {
          const reveal = gsap.utils.clamp(0, 1, top / vh);
          const dur = Math.min(DUR_MAX, (1 - reveal) / (1 - LEAD_FRAC));
          const pos = gsap.utils.clamp(0, 1 - dur, reveal - dur * LEAD_FRAC + lag);
          return { pos, dur, reveal };
        };

        // Uma peça só entra na timeline da janela se dá pra MEDIR onde ela
        // está (topOf != null) E se o bloco a revela dentro da janela (top <=
        // vh — mesma condição de antes: a peça só é IMPOSSÍVEL de revelar se
        // está a mais de 1 viewport do topo do bloco, e isso não mudou com a
        // inversão do `reveal`). Qualquer outra vai pro caminho de tempo
        // real, lá embaixo.
        const topOf = (el: HTMLElement) => topWithin(el, root.current!);
        const inWindow = (el: HTMLElement) => {
          const t = topOf(el);
          return t !== null && t <= vh;
        };

        // h1 do demo → h2 aqui: rotateX 60→0 + y 100%→0, expo.out. Duration e
        // stagger deixaram de ser 2.1s/0.035 (tempo real) e passaram a dividir
        // o orçamento da peça: um tween com stagger ocupa `duration + amount`,
        // e esse total precisa caber no `dur` resolvido, senão os chars do fim
        // do stagger aterrissam depois da cortina ter aberto. 65/35 preserva a
        // proporção do original (2.1s de duration contra ~0.9s de amount pro h2
        // inteiro), que é o que dá a leitura de "onda" em vez de bloco.
        //
        // Cada LINHA é keyed à revelação DELA, não à do h2 inteiro — era o
        // bug (ver a nota grande no SplitText acima): a borda cruza a segunda
        // linha bem depois de cruzar a primeira, mas as duas usavam a MESMA
        // posição (calculada a partir do topo do h2 inteiro). A primeira
        // linha coincidia por estar no topo; a segunda não, e ficava exposta
        // parada. `line.contains(char)` separa os chars por linha sem
        // depender de nome de classe do SplitText (pode mudar entre
        // versões; containment no DOM, não). `topOf(wrapper)`, não
        // `topOf(line)`: depois do `wrapLines`, é o WRAPPER que ocupa a
        // posição no fluxo — a `line` original é filho dele agora (ver
        // `wrapLines` acima).
        headingSplit.lines.forEach((line, i) => {
          const wrapper = h2LineWrappers[i];
          const charsInLine = headingSplit.chars.filter((char) => line.contains(char));
          if (!wrapper || !charsInLine.length) return;
          const w = solve(topOf(wrapper) ?? 0);
          timeline.to(
            charsInLine,
            {
              rotateX: 0,
              y: 0,
              duration: w.dur * 0.65,
              stagger: { amount: w.dur * 0.35, from: "start" },
              ease: "expo.out",
            },
            w.pos,
          );
        });

        // Badge "Recursos" faz o papel do .anim_p (única linha de texto do
        // header, fora do h2) — decisão: não deixei um fade genérico porque
        // ia destoar do resto (que agora entra por linha/char); e não
        // inventei split por chars nele porque .anim_p no demo É split por
        // linhas, não por chars — o badge tem uma linha só, então o efeito
        // aqui é visualmente equivalente a uma linha de parágrafo assentando.
        //
        // O offset 0.2 do demo e o branch innerWidth<900 (que decidia se o
        // badge entrava junto do h2 ou 0.2s depois) SAÍRAM: os dois eram
        // escolhas de TEMPO, e tempo aqui não é mais nosso — é da cortina.
        // Badge e h2 são vizinhos no topo do #features e a geometria já decide
        // sozinha a ordem e o intervalo entre eles (medido: badge revelado em
        // eased 0.866, h2 em 0.809 — o badge entra depois, porque está mais
        // acima e a cortina sobe).
        if (badgeSplit && badge) {
          const w = solve(topOf(badge) ?? 0);
          tl.to(badgeSplit.lines, { y: 0, duration: w.dur, ease: "power3.out" }, w.pos);
        }

        // [data-card] — `power3.out` preservado do tween antigo (quem tunou
        // esse ease já sabia o que fazia pra 6 cards num bento 2 colunas); o
        // `duration:1` não sobreviveu porque não podia: 1 agora é a janela
        // INTEIRA, não 1 segundo.
        //
        // O `stagger` SUMIU daqui, e a ausência dele é a mudança. Um stagger é
        // uma cascata escolhida a dedo; a geometria já impõe uma — cada card é
        // revelado num eased diferente porque está numa altura diferente. Dois
        // cards lado a lado (mesma row do bento) têm o mesmo offsetTop e
        // entram juntos, o que é o correto. Somar um stagger por cima seria
        // coreografar contra a geometria.
        //
        // Toda a discussão antiga de "posição 0 vs 0.4" morreu junto com o
        // gatilho em tempo real: aquilo era sobre um tween que podia perder a
        // corrida pra um scroll rápido. Não existe mais corrida — o card não
        // avança sem o bloco avançar, os dois são o mesmo número. É esse o
        // conserto.
        //
        // Cards ABAIXO DA DOBRA (offsetTop > vh) não entram nesta timeline: o
        // bloco nunca os revela dentro da janela (eased vai só até 1, e eles
        // precisariam de eased > 1 pra cruzar a base da viewport — offsetTop/vh
        // > 1), então `inWindow` já os exclui antes de chegar em `solve`.
        // Ficam no caminho de sempre (ScrollTrigger em tempo real), lá
        // embaixo. Medido em 1440×900: só os 2 cards da primeira row entram na
        // timeline da janela; os outros 4 e TODAS as barras ficam no caminho
        // tardio — mesma contagem de antes da inversão (a condição `top <=
        // vh` não mudou, só o que acontece DENTRO da janela mudou).
        const cards = gsap.utils.toArray<HTMLElement>("[data-card]", root.current);
        const bars = gsap.utils.toArray<HTMLElement>("[data-bar]", root.current);

        cards.filter(inWindow).forEach((card) => {
          const w = solve(topOf(card)!);
          timeline.to(card, { y: 0, duration: w.dur, ease: "power3.out" }, w.pos);
        });

        bars.filter(inWindow).forEach((bar) => {
          const w = solve(topOf(bar)!, BAR_LAG);
          timeline.to(bar, { scaleX: 1, duration: w.dur, ease: "power3.out" }, w.pos);
        });

        // Âncora de duração. Sem ela a timeline dura só até o último tween
        // (max(pos_i + dur_i)), que raramente é 1 exato — e `progress` é
        // normalizado pela duração, então uma timeline de 0.83 renderizaria
        // progress=eased no lugar errado, desalinhando TUDO da cortina. Tween
        // vazio de duração 0 em 1: crava duration=1 sem animar nada.
        tl.to({}, { duration: 0 }, 1);

        // Peças abaixo da dobra — o caminho de antes, intacto: entrada em
        // tempo real quando o scroll comum chegar nelas. Aqui o ScrollTrigger
        // mede certo (fora da janela o #features não tem mais transform:
        // o ticker da ARoberta devolve y:0 no repouso de borda), e a posição
        // natural volta a bater com a tela.
        const late = [
          ...cards.filter((c) => !inWindow(c)),
          ...bars.filter((b) => !inWindow(b)),
        ];
        late.forEach((el) => {
          const isBar = el.hasAttribute("data-bar");
          gsap.to(el, {
            ...(isBar ? { scaleX: 1 } : { y: 0 }),
            duration: isBar ? 1.1 : 1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          });
        });

        // A timeline nasce pausada e SEM ninguém tocando nela. Quem a move é
        // o `tick` abaixo (cortina) ou o `st` (fallback). Se a cortina já
        // estiver publicando quando chegamos aqui — caso real: página
        // recarregada no meio da janela —, aplica o progresso do frame atual
        // agora, senão o Features renderiza um frame no estado inicial (tudo
        // deslocado) por baixo de uma cortina já aberta.
        const now = getTransitionProgress();
        if (now) {
          driven = true;
          lastProgress = now.eased;
          timeline.progress(now.eased);
        }

        // OMITIDO, de propósito: .inner_linesright / .inner_linesleft do
        // demo (linhas decorativas verticais que abrem em x, sem
        // equivalente no Features) e o split por linhas dos parágrafos de
        // CARD (.anim_p2 no demo) — os cards agora entram como bloco (fade
        // + slide, igual ao tween original), não por linha de texto; dar
        // split por linha em CADA parágrafo de CADA um dos 6 cards é escopo
        // novo (mais DOM manipulado, mais SplitText pra reverter) que não
        // foi pedido — o pedido foi resolver o timing de [data-card]/
        // [data-bar], não enriquecer a entrada deles com split de texto.
      };

      /* CONSTRUÇÃO NO MOUNT, ATRÁS DO document.fonts.ready — não mais no
         onEnter. Duas razões, nesta ordem:

         1. A timeline agora é dirigida por progress, e progress só existe se a
            timeline existir ANTES da janela começar. Construir no onEnter era
            possível quando ela rodava em tempo real (nascia já tocando); com
            scrub, chegar atrasado é chegar com a cortina no meio.
         2. O SplitText mede TEXTO. Se ele fatiar antes da Sentient/Clash
            Display carregarem, ele fatia a fonte de fallback e congela larguras
            erradas em cada char/word (inline-block com posição já resolvida) —
            a troca de fonte depois não reflui nada. Antes isso ficava escondido
            por sorte: o onEnter só disparava quando o usuário rolava até aqui,
            tempo mais que suficiente pra fonte carregar. Construindo no mount
            essa sorte acaba, e o fonts.ready é o que a substitui. */
      document.fonts.ready.then(() => {
        enter();
        if (disposed || !tl) return;
        const timeline = tl;

        /* Ticker — lê SÓ o número publicado pelo ticker da ARoberta. Nenhuma
           leitura de DOM aqui, de propósito: o ticker da ARoberta já escreveu
           clipPath/transform neste mesmo frame, e qualquer
           getBoundingClientRect nosso forçaria o layout a recalcular na hora —
           thrash por frame, numa página que já divide orçamento com o WebGL do
           ScrollPhone. Toda a geometria foi resolvida uma vez, na construção
           acima; aqui só sobra progress = eased.

           NOTA de ordem: este ticker é adicionado no mount e o da ARoberta só
           quando o mode vira "pinned" (segundo render) — então este roda
           PRIMEIRO e lê o `eased` do frame ANTERIOR. É um atraso de 1 frame
           (~16ms) do conteúdo em relação à borda. Não dá pra ordenar tickers no
           GSAP, e o erro é pequeno demais pra ser visível — mas está medido e
           é conhecido, não acidental. */
        const tickFn = () => {
          const state = getTransitionProgress();

          if (!state) {
            // A cortina sumiu no meio do caminho (resize pra mobile/stacked
            // desmonta o pin). Não deixa o Features congelado no último
            // progresso: solta a timeline pra terminar sozinha, em tempo real.
            if (driven && !freed) {
              freed = true;
              driven = false;
              timeline.play();
            }
            return;
          }

          if (freed) return; // fallback no comando — não brigar com o play()
          driven = true;
          // Mesmo espírito do early-out do ticker da ARoberta: progress() é uma
          // renderização completa da timeline (todos os tweens, todos os
          // chars). Nos platôs (eased parado em 0 ou 1) não há nada novo.
          if (Math.abs(state.eased - lastProgress) < 0.0005) return;
          lastProgress = state.eased;
          timeline.progress(state.eased);
        };
        tick = tickFn;
        gsap.ticker.add(tickFn);

        /* FALLBACK — mobile, stacked, prefers-reduced-motion: não há cortina,
           então não há progress pra seguir e a timeline nunca sairia do zero.
           Aqui ela roda como antes: dispara uma vez e anda em tempo real.
           `start:"top bottom"` e `once:true` preservados do gatilho antigo.

           O guard é o ponto: se a cortina EXISTE, ela é a dona do progress —
           um play() aqui competiria com o tick() escrevendo progress no mesmo
           frame. `once:true` mata este trigger no primeiro disparo mesmo com o
           guard retornando cedo; quem cobre um sumiço tardio da cortina é o
           branch `!state` do tick acima, não este. */
        st = ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          once: true,
          onEnter: () => {
            if (getTransitionProgress()) return;
            freed = true;
            timeline.play();
          },
        });
      });

      /* gsap.context (dentro do useGSAP) só rastreia o que foi criado na
         execução SÍNCRONA deste callback — a timeline, o ticker e o
         ScrollTrigger acima nascem todos dentro do .then(), depois disso.
         Nada deles é revertido automaticamente; este cleanup é o único.
         `disposed` cobre a corrida real: unmount ANTES do fonts.ready resolver
         (Fast Refresh, navegação rápida) — sem ele, o .then() construiria
         timeline e ticker de um componente que já não existe. */
      return () => {
        disposed = true;
        if (tick) gsap.ticker.remove(tick);
        st?.kill();
        tl?.kill();
      };
    },
    { scope: root },
  );

  // Cleanup do ENTER: gsap.context (dentro de useGSAP) só rastreia tweens e
  // ScrollTriggers criados na execução SÍNCRONA do callback acima — o
  // ScrollTrigger.create em si é revertido no unmount por causa disso, mas
  // as instâncias de SplitText só existem depois que `enter()` roda
  // (assíncrono, dentro de onEnter, ao usuário rolar até o gatilho), então
  // o context nunca fica sabendo delas. Sem reverter aqui, um remount do
  // Fast Refresh depois do disparo deixaria os wrappers de linha/char do
  // split anterior presos no DOM, duplicando-os quando o próximo mount
  // fizesse um novo split por cima.
  useEffect(() => {
    return () => {
      splitsRef.current.forEach((split) => split.revert());
      splitsRef.current = [];
    };
  }, []);

  // Montagem escalonada das camadas quando o card entra (fade + assentar).
  // Sem cursor-follow: os cards não se mexem — só revelam uma vez.
  useEffect(() => {
    const cards = gsap.utils.toArray<HTMLElement>("[data-card]", root.current);
    const observers: IntersectionObserver[] = [];
    const timers: number[] = [];
    cards.forEach((card) => {
      const layers = gsap.utils.toArray<HTMLElement>(".gaia-parallax", card);
      if (!layers.length) return;
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            // O atraso é POR PEÇA (data-enter-delay), com o i*90 de sempre
            // como padrão. Duas razões, as duas medidas:
            // 1. Cada card tem uma ordem de montagem própria — o painel
            //    primeiro, a peça que CONCLUI a cena (Insight, sugestão) por
            //    último e de longe. Ordem de DOM não é ordem de leitura.
            // 2. Há camadas que só existem num breakpoint. No Prontuário os
            //    satélites empilhados do mobile vêm ANTES dos clusters no
            //    JSX: com i*90 cru, três nós invisíveis comiam as primeiras
            //    vagas e o desktop só começava a montar aos 270ms.
            layers.forEach((el, i) => {
              const d = Number(el.dataset.enterDelay ?? i * 90);
              timers.push(window.setTimeout(() => el.classList.add("is-in"), d));
            });
            obs.disconnect();
          });
        },
        { threshold: 0.2 },
      );
      io.observe(card);
      observers.push(io);
    });
    return () => {
      observers.forEach((io) => io.disconnect());
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <section ref={root} id="features" className="relative overflow-hidden bg-[#0A0C11] py-24 md:py-32">
      {/* Luz ambiente — um feixe frouxo descendo do canto superior esquerdo.
          Minimalista de propósito: radial largo e fraco direto sobre o #0A0C11
          (sem blend-mode, que a esta luminância ~12 mal moveria o pixel), com um
          fio de lavanda pra concordar com a marca sem pintar a cena. Fica no
          fundo, sem z-index, atrás do conteúdo z-10 e dos cards. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 0% 0%, rgba(188,176,214,0.10) 0%, rgba(188,176,214,0.035) 30%, transparent 58%)",
        }}
      />
      {/* Pontes de luz — poças neutras nas frestas escuras do bento. Fica atrás
          dos cards (z abaixo do conteúdo z-10): como os cards são opacos, a luz
          só ESCAPA nos vãos e por baixo das quinas arredondadas — é o que a lê
          como luz vinda de trás, não como halo por card.
          NEUTRA (mesma lavanda do ambiente), NÃO a cor de conteúdo de cada card:
          é essa a diferença da versão que a régua do Zouti reprovou (linhas
          61-75), onde seis cores viravam arco-íris nos vãos. Aqui é um tom só.
          NÃO PODE SER MARCADA: por isso o `blur(38px)` no layer + o stop externo
          esticado até 82% — o que mataria a forma é o olho achar uma borda, e não
          há nenhuma pra achar. E fica COLADA nos cards: os centros pousam nas
          bordas/quinas, não no meio do vão, então a luz huga a silhueta em vez de
          boiar na fresta.
          Só md+ (o layout de coluna única no mobile não tem esses vãos).
          A camada vive DENTRO do container max-w-6xl, não na section: as
          posições eram % da viewport (medidas a 1440) e em janela mais larga
          o container centralizado para de crescer, a % continua crescendo, e
          a poça esquerda saía dos cards e boiava no vão escuro da margem —
          exatamente o blur que a Pronit mandou de volta pra trás dos cards.
          Ancorada no container ela acompanha a grade em qualquer largura.
          Coordenadas convertidas da medição 1440×2575 (container 1152px a
          partir de x=144, py-32=128px por lado):
          cruz central (50% 35,1%), seam baixo (50% 55,3%), borda do Exames
          (92,5% 45,2%), abaixo da quina de baixo do Plano (5,6% 75%) e bem
          acima da quina de cima do Prontuário (5,6% 72,2%). */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            filter: "blur(38px)",
            background: [
              "radial-gradient(280px 240px at 50% 35.1%, rgba(188,176,214,0.085) 0%, rgba(188,176,214,0.028) 42%, transparent 82%)",
              "radial-gradient(280px 240px at 50% 55.3%, rgba(188,176,214,0.08) 0%, rgba(188,176,214,0.026) 42%, transparent 82%)",
              "radial-gradient(240px 280px at 92.5% 45.2%, rgba(188,176,214,0.07) 0%, rgba(188,176,214,0.022) 44%, transparent 84%)",
              "radial-gradient(260px 240px at 5.6% 75%, rgba(188,176,214,0.08) 0%, rgba(188,176,214,0.026) 42%, transparent 82%)",
              "radial-gradient(260px 240px at 5.6% 72.2%, rgba(188,176,214,0.075) 0%, rgba(188,176,214,0.024) 42%, transparent 82%)",
            ].join(","),
          }}
        />
        <header className="mb-14 max-w-2xl md:mb-16">
          <span data-reveal className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Recursos
          </span>
          <h2
            className="text-balance font-title text-h2 font-medium text-neutro-0 md:text-h1"
            style={{ perspective: "1000px", backfaceVisibility: "hidden" }}
          >
            Tudo que a consulta precisa, <span className="italic text-white/60">num lugar só.</span>
          </h2>
        </header>

        <div data-grid className="grid grid-cols-1 gap-2.5 md:gap-3 lg:grid-cols-2">
          {/* A — Antropometria (escuro, vidro único) */}
          <article data-card className={CARD + " min-h-[440px] lg:col-start-1 lg:row-start-1"}>
            <Grain at="50% 100%" />
            {/* Blur BRANCO em overlay — é o que o vidro do painel refrata.
                Houve aqui uma versão colorida (roxo + azul frio em quinas
                opostas) e ela saiu: cor no blur pinta o card de marca e todos
                os seis viravam a mesma cena tingida. Branco só levanta o que já
                existe. */}
            <Glow className="left-[-14%] top-[34%] h-80 w-80" />
            {/* A fonte nasce embaixo do gráfico, no centro: é o rodapé de
                medidas que ela acende por trás, e a curva do peso cai da
                esquerda pra cá — a luz mora onde a leitura termina. */}
            <Hotspot className="bottom-[-110px] left-1/2 h-[300px] w-[380px] -translate-x-1/2" />
            <EdgeLight at="50% 100%" />
            <div className="relative flex h-full flex-col">
              <div className="px-7 pt-7 md:px-8 md:pt-8">
                <CardTitle>Antropometria</CardTitle>
                <CardBody>Cole o laudo em PDF. Pesos, dobras e composição entram no histórico, com evolução por consulta.</CardBody>
              </div>
              <MockAntropometria />
            </div>
          </article>

          {/* B — Questionários (esmeralda ESCURA, atrás do vidro) */}
          {/* A esmeralda ACESA (foto) saiu — era o que embarrava os pastéis. Mas
              a faixa VERDE do card continua sendo a dele no bento (Plano é azul,
              Prontuário é lilás), então a cor volta pela porta certa: uma
              superfície esmeralda ESCURA (luminância ~28, não os ~200 da foto)
              atrás do vidro. O painel tem backdrop-blur, então ele REFRATA essa
              cor e ganha um coração verde suave — a cor mora no fundo, o pastel
              segue limpo por cima. É a diferença entre tingir o card (deep, sob
              o vidro) e estampá-lo (foto acesa, brigando com o conteúdo).
              CARD_HERO (sem gradiente) + a superfície própria abaixo: não dá pra
              recolorir o CARD compartilhado sem pintar o Antropometria junto.
              Corpo segue em `dark` (white/55): esmeralda escura é fundo escuro,
              o contraste do texto passa — o gatilho é a luminância medida. */}
          <article data-card className={CARD_HERO + " min-h-[440px] lg:col-start-2 lg:row-start-1"}>
            {/* superfície — esmeralda em FUMAÇA, com o pico da luz ATRÁS DO
                PAINEL e o chão fundo dos dois lados (topo em esmeralda-noite,
                rodapé voltando a fechar). Isto inverte o que estava aqui antes,
                que era "o verde mais fresco nasce no chão do card" — ver a nota
                do CHÃO ESCURO abaixo pra por que aquilo não podia ficar.

                Antes era UMA radial concêntrica em 50% 122%. O problema dela não
                é a cor, é a geometria: elipse única, centrada no eixo, com
                paradas regulares — o olho lê "gradiente CSS", que é o oposto de
                premium. Referência de fundo caro (o mesh que a Pronit trouxe) é
                sempre foto DESFOCADA, e o que a define não é o blur: é a
                IRREGULARIDADE. Vários campos de cor fora de eixo, de tamanhos
                diferentes, se dissolvendo uns nos outros, sem centro comum.

                Quatro camadas fazem isso:
                  1. base em linear vertical — segura a direção da luz e garante
                     que nenhum ponto do card fique sem tinta;
                  2. campos de cor (abaixo) — seis elipses deslocadas, três delas
                     ESCURAS. Campo escuro é o que vira mancha: sem ele o stack
                     só clareia e volta a ler como gradiente;
                  3. mottle claro — nuvem de turbulência mascarando véu esmeralda;
                  4. mottle ESCURO — a mesma ideia com a tinta invertida, e a
                     peça que faz o mottle finalmente aparecer sem custar
                     contraste (a nota dela explica).

                Polaridade continua ESCURA, e isso não é conservadorismo: a
                referência é branca→verde porque não carrega texto. Aqui moram
                título `neutro-0` e corpo `white/55` no terço de cima, e a nota
                das linhas ~440 já mediu o que acontece quando essa superfície
                sobe de luminância. O pico de verde segue no chão do card, no
                mesmo teto do #5FC397 que estava aqui — o que ganhou alcance foi
                a variação, não o brilho. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, #06100D 0%, #0C201A 30%, #17422F 66%, #1B4A36 82%, #103026 100%)",
              }}
            />
            {/* Campos de cor. Duas coisas explicam os números estranhos:

                (a) A camada é OVERSIZED em -25% e depois borrada. Blur amostra
                    transparência fora da caixa, então camada `inset-0` borrada
                    nasce com anel escuro na borda — o oversize joga essa franja
                    pra fora do `overflow-hidden` do card. O preço é que as
                    porcentagens abaixo estão no espaço AMPLIADO (1,5×), não no
                    do card: card 0% → 16,7% aqui, card 100% → 83,3%. Conversão:
                    ampliado = (0,25 + p) / 1,5.
                (b) A ordem importa e está invertida do que a leitura sugere: em
                    CSS o PRIMEIRO gradiente pinta por CIMA. A tampa escura vem
                    primeiro justamente pra proteger a zona do título dos campos
                    claros que vêm depois dela na lista. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-[25%]"
              style={{
                filter: "blur(46px)",
                background: [
                  // CHÃO ESCURO — a peça que faltava, e a que a primeira versão
                  // errou por inteiro. O painel de vidro escurece o que está sob
                  // ele; abaixo da aresta de baixo dele sobram ~36px de
                  // superfície CRUA. Com o pico da fumaça no chão do card, esses
                  // 36px viravam a coisa mais clara da peça — uma tira brilhante
                  // com a borda do vidro por cima, que lê como CORTE e não como
                  // vidro pousado. Medido: a faixa nua era 1,22× mais clara que
                  // o mesmo lugar sob o painel.
                  // A referência já dizia isso e eu não li: no mesh que serve de
                  // alvo o rodapé é o tom mais FUNDO, não o mais aceso. Então o
                  // verde agora tem pico atrás do painel e MORRE no chão.
                  "radial-gradient(100% 17% at 50% 88%, rgba(5,18,14,0.82) 0%, rgba(5,18,14,0) 100%)",
                  // tampa escura sobre o título (card y ≈ -10%)
                  "radial-gradient(72% 34% at 46% 10%, rgba(4,12,10,0.95) 0%, rgba(4,12,10,0) 100%)",
                  // névoa escura no flanco esquerdo, meia altura — é ela que
                  // quebra o stack em manchas em vez de degradê
                  "radial-gradient(34% 30% at 32% 44%, rgba(14,68,50,0.6) 0%, rgba(14,68,50,0) 100%)",
                  // Fiapo claro no flanco direito. Nasceu em `at 78% 50%` (card
                  // x 92%, y 50%) e isso é exatamente onde mora o pill
                  // "7 validados" — o único ponto do card onde eu de fato
                  // regredi contraste (5,02 → 4,43, cruzando o piso de 4,5).
                  // Desceu pra 58% e caiu de 0,36 pra 0,20: o flanco continua
                  // tendo luz, só que abaixo da linha do pill.
                  "radial-gradient(32% 26% at 80% 58%, rgba(96,200,152,0.2) 0%, rgba(96,200,152,0) 100%)",
                  // poça à esquerda, agora com o centro ATRÁS do painel
                  "radial-gradient(40% 26% at 28% 74%, rgba(62,172,126,0.85) 0%, rgba(62,172,126,0) 100%)",
                  // subida principal — fora do eixo de propósito (card x 64%)
                  "radial-gradient(52% 30% at 60% 78%, rgba(128,220,176,1) 0%, rgba(128,220,176,0) 100%)",
                  // cama esmeralda por baixo de tudo: sem ela o miolo do card
                  // fica sem tinta e a peça lê como preta com um brilho no
                  // rodapé, não como superfície verde
                  "radial-gradient(78% 34% at 50% 78%, rgba(30,108,80,0.6) 0%, rgba(30,108,80,0) 100%)",
                ].join(","),
              }}
            />
            {/* Mottle — o que separa "mesh gradient bonito" de "foto desfocada".
                Um véu esmeralda mascarado por turbulência de frequência baixa:
                a nuvem tem manchas de dezenas de px sem eixo nem repetição
                visível, então o verde aparece em placas irregulares. Borrado por
                cima disso pra virar fumaça, não textura.

                Duas máscaras compostas em `intersect`: a nuvem dá a forma, o
                linear vertical garante que o mottle só EXISTA da metade pra
                baixo. Sem esse segundo passe as placas claras subiriam pro terço
                do título e derrubariam o contraste do corpo — que é exatamente o
                erro que a superfície escura existe pra evitar.
                `-webkit-mask-composite: source-in` é o dialeto do WebKit pro
                mesmo `intersect`; sem o par o Safari empilha as duas e o recorte
                vertical some. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-[25%] opacity-[0.66]"
              style={{
                filter: "blur(30px)",
                background:
                  "radial-gradient(72% 44% at 54% 86%, rgba(140,230,184,0.95) 0%, rgba(52,158,116,0.5) 58%, rgba(52,158,116,0) 100%)",
                maskImage: `${CLOUD_SOFT}, linear-gradient(to bottom, transparent 38%, #000 66%)`,
                WebkitMaskImage: `${CLOUD_SOFT}, linear-gradient(to bottom, transparent 38%, #000 66%)`,
                maskSize: "900px 900px, 100% 100%",
                WebkitMaskSize: "900px 900px, 100% 100%",
                maskRepeat: "repeat, no-repeat",
                WebkitMaskRepeat: "repeat, no-repeat",
                maskComposite: "intersect",
                WebkitMaskComposite: "source-in",
              }}
            />
            {/* Mottle ESCURO — a outra metade da fumaça, e a que quase não se
                pensa em fazer. Fundo caro tem mancha nos DOIS sentidos: só
                clarear dá brilho, não névoa. E esta camada é de graça no
                orçamento de contraste — o que a norma mede é o pior caso CLARO
                (p95) sob o texto, então placa escura só empurra o número pro
                lado seguro. Foi ela que deixou o mottle finalmente aparecer:
                a versão só-clara tinha que ser fraca pra não estourar o
                white/55 do insight dentro do painel (medido: 4,29:1, reprova),
                e fraca demais ela não lia como mancha.
                Nuvem diferente da de cima (0,011/640 contra 0,007/900) — ver a
                nota do CLOUD_DEEP. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-[25%] opacity-[0.72]"
              style={{
                filter: "blur(36px)",
                background:
                  "radial-gradient(84% 62% at 40% 66%, rgba(6,22,17,0.95) 0%, rgba(6,22,17,0.42) 56%, rgba(6,22,17,0) 100%)",
                maskImage: `${CLOUD_DEEP}, linear-gradient(to bottom, transparent 28%, #000 54%)`,
                WebkitMaskImage: `${CLOUD_DEEP}, linear-gradient(to bottom, transparent 28%, #000 54%)`,
                maskSize: "640px 640px, 100% 100%",
                WebkitMaskSize: "640px 640px, 100% 100%",
                maskRepeat: "repeat, no-repeat",
                WebkitMaskRepeat: "repeat, no-repeat",
                maskComposite: "intersect",
                WebkitMaskComposite: "source-in",
              }}
            />
            {/* NÚCLEO DE COR atrás do vidro — um bloom esmeralda mais aceso,
                borrado, exatamente onde o painel do mock pousa. É o que o
                backdrop-blur do vidro refrata: sem ele o painel ficaria cinza
                sobre verde; com ele, o verde atravessa o vidro e vira o coração
                da peça. Fica atrás do conteúdo (o wrapper relative abaixo sobe). */}
            <div aria-hidden className="pointer-events-none absolute inset-x-2 bottom-0 top-28 rounded-[28px] bg-[radial-gradient(110%_82%_at_50%_104%,rgba(140,236,188,0.17),transparent_74%)] blur-3xl" />
            {/* Rig de luz ESPELHADO do card A, de propósito: mesma família de
                superfície pede a mesma lâmpada. A primeira tentativa pôs o
                Hotspot em left-[18%] pra "seguir o holofote do mock" e virou um
                borrão na quina — fonte pontual perto do canto lê como vazamento.
                No centro-baixo ela nasce atrás do gráfico, onde a leitura termina. */}
            <Grain at="50% 100%" />
            <Glow className="left-[-14%] top-[34%] h-80 w-80" />
            <Hotspot className="bottom-[-110px] left-1/2 h-[300px] w-[380px] -translate-x-1/2" />
            <EdgeLight at="50% 100%" />
            <div className="relative flex h-full flex-col">
              <div className="px-7 pt-7 md:px-8 md:pt-8">
                <CardTitle>Questionários</CardTitle>
                <CardBody>Sete instrumentos validados (EAT-26, QFA, PSQI e outros), com pontuação automática.</CardBody>
              </div>
              <MockQuestionarios />
            </div>
          </article>

          {/* C — Plano alimentar (hero óleo, card alto) */}
          {/* azul-cinza da gradiente */}
          <article data-card className={CARD_HERO + " lg:col-start-1 lg:row-start-2"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src="/textures/plano-cobalto.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-top" />
            {/* object-top e não object-center: mesma lógica do Prontuário
                (gradiente borrada não tem lado certo, então mover o enquadramento
                não custa nada e paga contraste) aplicada via object-position em
                vez de virar o arquivo. Números daqui em diante são medidos no
                render, não calculados a partir do crop — o cálculo tinha errado
                o aspect ratio e mandava pro lugar errado (ver Prontuário).
                A varredura em Y mede: 0%=5,32 / 5%=5,16 / 10%=4,97 / 15%=4,78 /
                20%=4,61 — reprova de 25% pra cima, porque a cobalto clareia sob
                o texto conforme desce. object-top (Y=0%) é a maior margem das
                que passam: 5,32:1 (p95, corpo hero white/70).
                Véu leve chapado (0,27), mesmo alpha dos outros dois — ver a nota
                longa no Questionários pra por que 0,27 e não outro número.
                A cobalto é a mais escura e mais saturada das três texturas, mas
                a margem que sobra é no ENQUADRAMENTO certo, não em qualquer um:
                alpha igual entre os três continua sendo tratamento, não correção
                de exposição — quem faz o ajuste fino aqui é o object-position.
                O Hotspot que marcava a quina esquerda saiu porque era radial
                branco em plus-lighter e o fundo claro de antes o estourava — essa
                razão caducou com a volta do fundo escuro, e a volta dele não foi
                avaliada. O EdgeLight já dá a aresta. */}
            <div className="absolute inset-0 bg-[rgba(6,9,12,0.27)]" />
            <Grain at="12% 100%" />
            <EdgeLight at="12% 100%" />
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
            {/* sem textura — vidro sobre o azul-ardósia do CARD */}
            {/* CARD e não CARD_HERO, e isto é obrigatório, não estilo: CARD_HERO
                não tem fundo NENHUM (só rounded + LIFT) porque quem pinta o card
                é a textura. Tirar o <img loading="lazy"> de um CARD_HERO não deixa o card
                escuro — deixa o card TRANSPARENTE. O fundo próprio do CARD
                (#1B2130 → #13171F) é o que assume o lugar da foto.
                O véu também foi junto: ele existia pra domar a textura, e sem
                textura vira só uma camada preta em cima de um gradiente que já
                está no tom certo. */}
            <article data-card className={CARD + " min-h-[360px] flex-1"}>
              {/* Continua SEM Glow, mas a razão trocou junto com o fundo.
                  Era: "a textura já É uma fonte de luz (os bokeh quentes), e
                  saturar bokeh estourado dá lavagem". Sem foto, ninguém estoura.
                  A razão agora é o que o Glow É: backdrop-filter saturate(1.55)
                  + brightness(1.06) — ele AMPLIFICA o que está atrás, não pinta.
                  Atrás dele aqui só existe o gradiente chapado do CARD, que é
                  quase dessaturado: saturar quase-cinza devolve quase-cinza, e
                  6% de brilho ninguém vê. Glow em card sem textura só rende onde
                  há cor atrás pra puxar — é o caso da Agenda, cujos dois Glows
                  mordem a espinha roxa/sage das linhas.
                  Se este card precisar voltar a ser o quente do bento, o lugar
                  é a quina inferior direita, onde os marcadores âmbar do mock
                  passam — ali um Glow teria o que amplificar.
                  O Hotspot fica: é tinta de verdade (radial branco em
                  plus-lighter), então funciona sobre fundo chapado. E fica na
                  quina onde os marcadores param quando o valor está alto — o
                  lado "fora da faixa" da régua, que é o assunto do card. */}
              <Hotspot className="bottom-[-80px] right-[-70px] h-[280px] w-[320px]" />
              <Grain at="85% 100%" />
              <EdgeLight at="85% 100%" />
              <div className="relative flex h-full flex-col">
                <div className="px-7 pt-7 md:px-8 md:pt-8">
                  <CardTitle>Exames de sangue</CardTitle>
                  {/* tone volta pro padrão "dark" (white/55): "hero" é white/70,
                      calibrado pra segurar contraste contra foto. Sobre o
                      gradiente chapado do CARD, white/70 destoaria — este card,
                      a Antropometria e a Agenda são os três que ficam sem
                      textura, e os três usam o padrão. */}
                  <CardBody>Suba o PDF do laboratório. A Gaia extrai os valores e marca o que está fora da faixa.</CardBody>
                </div>
                <MockExames />
              </div>
            </article>

            {/* roxo = teleconsulta, a cor que a espinha das linhas usa */}
            <article data-card className={CARD + " min-h-[360px] flex-1"}>
              {/* Camada de gradiente própria, por cima do CARD — não sobrescreve
                  `bg-gradient-to-b from-[#1B2130] to-[#13171F]` no className:
                  from-/to- do CARD e um from-/to- daqui gerariam a mesma custom
                  property (--tw-gradient-from), com a mesma especificidade —
                  quem vence é a ordem no CSS gerado, não a ordem na string. Uma
                  `<div>` própria, como as texturas fazem, resolve sem essa
                  fragilidade.
                  O alvo é o dos VIZINHOS, não o das três texturas. A Agenda
                  divide a coluna com o Exames e fica ao lado da Antropometria —
                  esses dois estão em croma OKLCH 0,0245–0,0264, e é esse o grupo
                  que ela precisa acompanhar, não o das texturas (0,067). A
                  primeira versão casou com as texturas e foi testada no render —
                  reprovada no olho, forte demais: um card de textura entre dois
                  cards discretos grita. É a confusão que "mesma saturação dos
                  demais bgs" convida a fazer — parece apontar pras texturas e
                  não aponta. A Agenda é irmã do Exames e da Antropometria, não
                  das texturas.
                  "Saturação" aqui é croma OKLCH, não S de HSL: em HSL os bgs do
                  bento marcam 22/75/31% e não formam grupo nenhum — é ruído. O
                  croma é que revela quem é coerente com quem. Quem for
                  reajustar isto tem que medir na mesma régua, ou vai perseguir o
                  número errado.
                  Entrada #231E2E→#18151E (matiz 304°): os dois `Glow` deste card
                  são `backdrop-filter: saturate(1.55)` e amplificam por cima, TAL
                  QUAL antes — o número que importa é o do render, não o do
                  código: 0,0284, dentro da faixa dos vizinhos (0,0245–0,0264).
                  O L do par é 24,9→20,4 — é o MESMO L do CARD original
                  (#1B2130→#13171F). O card não ficou mais claro nem mais
                  escuro; só ganhou matiz e um tico de croma. Era isso que
                  "sutil" pedia.
                  Contraste final: 5,81:1 (p95, pior caso local, corpo real
                  white/55, medido no render) — folga maior que a versão
                  anterior, porque o croma mais baixo mexe menos na luminância
                  crua que o texto vê. */}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#231E2E] to-[#18151E]" />
              {/* Roxo e sage porque são as duas cores que a própria agenda usa
                  na espinha das linhas (roxo = tele, sage = presencial): a luz
                  do card é a legenda dele, desfocada. */}
              <Grain at="15% 100%" />
              <Glow className="bottom-[4%] left-[-12%] h-72 w-72" />
              <Glow className="right-[-14%] top-[2%] h-56 w-56" />
              <Hotspot className="bottom-[-80px] left-[-60px] h-[280px] w-[320px]" />
              <EdgeLight at="15% 100%" />
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
          {/* petala escura, mesmo véu 0,27 dos outros dois — ver a nota do
              Questionários pra por que esse alpha e não outro.
              A largura aqui é o dobro da dos vizinhos (1024px contra ~500), e
              isso já foi razão pra baixar o alpha do véu deste card sozinho:
              mesma franja proporcional renderia o dobro em área absoluta. Não
              foi preciso agora porque o fundo é escuro como os outros dois —
              a preocupação era com um card CLARO de largura dupla virando o
              ponto mais aceso do bento, e essa preocupação não se aplica a um
              fundo escuro. Se o fecho puxar atenção demais, é aqui que se olha
              primeiro. */}
          <article data-card className={CARD_HERO + " lg:col-span-6"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src="/textures/prontuario-petala.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[50%_40%]" />
            {/* object-[50%_40%]: enquadramento, não solução de contraste — a
                pétala não tem Y nem espelho (X, Y, XY) que resolva sozinho (ver
                o scrim logo abaixo). 40% foi onde o crop ficou melhor visualmente
                depois que o scrim assumiu o trabalho de contraste.
                Véu leve chapado (0,27), igual aos outros dois — o alpha uniforme
                sobrevive. Mas aqui ele NÃO fecha a conta sozinho: medido no
                render, a pétala com véu 0,27 reprova nas DUAS polaridades. Texto
                branco: nenhum Y na varredura 0%→100%, nem espelho-X, nem
                espelho-Y, nem espelho-XY, passa. Texto `ink`: melhor caso é
                3,73:1 em Y=0%, também reprova. Ela é escura demais pra `ink` e
                clara demais pra branco — meio-tom puro, a ZONA MORTA que o
                comentário do Questionários já nomeia. Não é imagem ruim, é
                imagem que não hospeda texto sozinha. */}
            <div className="absolute inset-0 bg-[rgba(12,8,12,0.27)]" />
            {/* Scrim localizado — a peça que fecha a conta que o véu chapado
                não fechou. Véu chapado em 0,45 PASSA (4,84:1) e foi REJEITADO:
                nesse alpha a pétala inteira vira um vinho escuro, o rosa e o
                clarão somem — resolve contraste matando a imagem que a Pronit
                trocou pra ter ali.
                O scrim compra o mesmo contraste gastando só a coluna do texto:
                o Prontuário tem 1024px de largura, o texto mora nos primeiros
                ~248px à esquerda e o phone ocupa o centro (x 596–844) — sobra
                card inteiro pra pétala aparecer sem escurecimento extra. A
                gradiente linear em 100deg escurece forte de 0% a 26% (onde o
                texto está) e desaparece a partir de 48%, bem antes do phone.
                Medido no render: 6,02:1 (p95, corpo hero white/70).
                Por que isto não é o mesmo "véu-gradiente com stops" que o
                comentário do Questionários rejeita ("uma gradiente já É
                uniforme — véu com stops só brigaria com o desenho dela"): aquele
                argumento vale pros cards de ~500px, onde o texto atravessa o
                card inteiro e qualquer gradiente de véu compete com a gradiente
                da própria textura em toda a largura. Aqui o card tem 1024px e o
                texto ocupa só o primeiro quarto — o scrim morre antes do phone
                e não toca os 3/4 do card onde a pétala precisa respirar. A
                exceção é de GEOMETRIA (card duas vezes mais largo, texto
                confinado numa coluna), não de gosto — se algum dia isto virar
                precedente pra por scrim nos outros dois, a premissa é falsa: lá
                o texto ocupa a largura toda e o argumento do Questionários
                continua de pé. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(12,8,12,0.65)_0%,rgba(12,8,12,0.49)_26%,transparent_48%)]" />
            {/* Assento atrás do phone — 0,2/0,1, sem mexer no alpha. A premissa
                que justificava esse número era fundo CLARO: o phone escuro já
                se separava por silhueta e a mancha só precisava ser sombra
                projetada, não poço. Com a pétala escura de volta essa premissa
                caiu — phone escuro sobre fundo agora também escuro tem bem menos
                contraste de graça, e no alpha baixo essa mancha tende a virar
                borrão em vez de sombra. Não subi o alpha porque isso não foi
                medido; o assento precisa de olho no render antes de mexer. */}
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[620px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(4,8,10,0.2)_0%,rgba(4,8,10,0.1)_52%,transparent_74%)] lg:block" />
            {/* O Hotspot da contraluz continua fora, mas a razão de ele ter saído
                caducou. Ele era radial branco em mix-blend-plus-lighter: sobre a
                pétala escura ele soma luz de verdade e escapa por baixo do phone
                lendo como lâmpada — é exatamente o efeito que contraluz busca, e
                o fundo escuro voltou a ser o que esse efeito pede. A razão que
                tirou ele antes (fundo claro, plus-lighter saturando pra branco
                chapado) não vale mais. A volta dele não foi avaliada aqui — é
                decisão visual pendente, não desta troca.

                A geometria fica registrada porque custou régua no DOM e vale se
                alguém tentar reacender isto — mas MEDIDA NO PIXEL DO APARELHO,
                não na âncora. A versão anterior deste bloco dizia "o phone ocupa
                x 596–844", que é o rect de [data-phone-start]; o glb no START_G
                renderiza 326px de largura e ocupa x 557–883 @1440. Os 39px de
                diferença por lado foram exatamente o que encostou o Calibrado no
                phone (ver ProntuarioRight). A ÂNCORA NÃO DIZ O TAMANHO DO PHONE,
                ela só marca o centro.
                Com os números certos: satélite esquerdo termina em 562 (fresta
                de −5px, ele passa POR TRÁS do aparelho de propósito) e o direito
                começa em 933 (fresta de 50px). Uma luz redonda de ~220px
                centrada continua ficando INTEIRA atrás do aparelho: existe no
                DOM, mede certo, não aparece em tela. O único vão real é a FAIXA
                na base, livre em toda a largura fora do phone — por isso a
                elipse era rasa e deitada (900×260). */}
            <Grain at="50% 100%" />
            <EdgeLight at="50% 100%" />

            {/* min-h preserva a altura visual do palco agora que a Marina vive na
                tela do iPhone (ver PhoneScreen) que a ScrollPhone sobrepõe aqui. */}
            <div className="relative flex flex-col p-7 md:p-10 lg:min-h-[600px]">
              {/* lg: coluna estreita — o texto vive à esquerda do phone
                  centralizado e nunca corre por baixo do aparelho (glass começa
                  ~270px dentro do card). Solto no mobile, onde não há phone. */}
              <div className="max-w-md lg:max-w-[248px]">
                <CardTitle>Prontuário</CardTitle>
                <CardBody tone="hero">Cada paciente em oito abas: anamnese, avaliação, plano, exames e mais. Tudo numa tela.</CardBody>
              </div>

              {/* mobile/tablet — o phone 3D AGORA viaja também no mobile (ver
                  ScrollPhone, gate liberado). Âncora de início ABAIXO da
                  colagem de satélites (mock 2026-07-20, bloco vermelho):
                  centrada, em FLUXO — é ela que estica o card — e com -mb-28
                  pra o aparelho atravessar a borda de baixo do card, o mesmo
                  motivo do tab do Pricing. Centrada sobre a pilha ela punha o
                  overlay (z-60) POR CIMA dos três cards, tampando tudo. */}
              <div className="relative lg:hidden">
                <ProntuarioStacked />
                <div
                  data-phone-start
                  aria-hidden
                  className="pointer-events-none relative mx-auto -mb-28 mt-3 h-[448px] w-[260px]"
                />
              </div>

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

      {/* Film grain — por cima de TUDO, e é aí que ele difere do Manifesto e do
          Pricing, onde a mesma peça fica só no fundo da seção. Aqui os cards
          cobrem quase toda a área: grão só no fundo não encostaria em nenhuma
          das superfícies que precisam dele. Por isso z-20 (o conteúdo é z-10) —
          ele cai sobre os cards, as texturas e o vidro, que é onde o gradiente
          mora e onde o banding aparece.
          `soft-light` e opacity 0,045: os mesmos valores das outras duas seções.
          Acima disso o grão vira sujeira visível em vez de superfície. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 opacity-[0.045] mix-blend-soft-light"
        style={{ backgroundImage: NOISE, backgroundSize: "140px" }}
      />
    </section>
  );
}

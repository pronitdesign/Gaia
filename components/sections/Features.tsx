"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { useAutoCycle } from "@/lib/useAutoCycle";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  IconSparkles,
  IconCheck,
  IconClock,
  IconArrowUpRight,
} from "@/components/ui/icons";
import { MARINA, JOAO, CAIO, BIANCA, type Person } from "@/lib/people";

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
function EdgeLight({ at, className = "" }: { at: string; className?: string }) {
  const stops = "rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.22) 42%, rgba(255,255,255,0.07) 100%";
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

/* Vidro claro/fosco — deixa o floral atravessar (satélites do Prontuário).
   Mais aéreo e premium que o GLASS_DARK: tinta branca translúcida, aro de luz
   nítido e realce interno no topo. Legível sobre a pétala escura. */
const GLASS_FROST =
  `relative overflow-hidden ${GLASS_BLUR} ` +
  "bg-gradient-to-b from-white/[0.13] to-white/[0.05] " +
  "shadow-[0_30px_80px_-28px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.32),inset_0_0_0_1px_rgba(255,255,255,0.12)]";

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
    <p className={"mt-3 max-w-md font-body text-body " + (tone === "hero" ? "text-white/70" : "text-white/55")}>
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
        <img src={person.photo} alt="" aria-hidden className="h-full w-full object-cover" />
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
   identifica o prato é a foto). */
const PLANO_MEALS = [
  { img: "/plano-cafe.webp", t: "07:30", n: "Café da manhã", food: "Ovos mexidos com aveia em flocos, mamão papaia e café sem açúcar", short: "Ovos mexidos, aveia e mamão", kcal: 410, prot: 24, c: "#A385C0" },
  { img: "/plano-almoco.webp", t: "12:30", n: "Almoço", food: "Frango grelhado, arroz integral e salada de folhas com azeite", short: "Frango grelhado, arroz e salada", kcal: 620, prot: 46, c: "#95A9C4" },
  { img: "/plano-jantar.webp", t: "20:00", n: "Jantar", food: "Salmão assado com legumes no vapor e purê de abóbora", short: "Salmão assado e legumes", kcal: 480, prot: 42, c: "#8B9E6F" },
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
              <img src={m.img} alt="" aria-hidden className="h-full w-full object-cover" />
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

function MockPlano() {
  const macros = [
    { k: "Prot", g: 112, pct: 30, c: "bg-brand" },
    { k: "Carbo", g: 168, pct: 48, c: "bg-azul-400" },
    { k: "Gord", g: 47, pct: 22, c: "bg-sage-400" },
  ];
  const [i, ref, entered] = useAutoCycle(PLANO_MEALS.length, 3600);

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
          o baralho. */}
      <div data-enter-delay={0} style={px(0.4, 1)} className={"gaia-parallax relative z-10 rounded-[18px] p-4 " + GLASS + " " + FLOAT}>
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
  const [i, ref, entered] = useAutoCycle(insights.length, 3400);
  const ins = insights[i];
  return (
    // pb grande até <lg e pb-7 normal dali pra cima: abaixo de lg (1024px) o
    // grid vira 1 coluna e cada hero cresce pela PRÓPRIA altura — nada aqui
    // estica o Antropometria, então dá pra dar folga de verdade pro Insight
    // pousar. A partir de lg os dois heroes voltam a dividir a mesma linha
    // do grid (o Antropometria manda), e aí a folga já vem de graça dessa
    // divisão — pb extra ali só inflaria a linha inteira, o que é proibido.
    <div ref={ref} className="relative mt-8 flex-1 px-7 pb-32 md:px-8 lg:pb-7">
      {/* ASSINATURA — a Gaia lê e conclui. Os sete instrumentos entram um a um
          de baixo, cada um com seu check dando tick logo atrás, e SÓ ENTÃO o
          Insight pousa por cima (ver o gaia-land lá embaixo). É a promessa do
          card em ordem: primeiro a leitura, depois a conclusão. Se o Insight
          chegasse junto com a lista, o card diria as duas coisas ao mesmo
          tempo e não diria nenhuma. */}
      {/* wrapper local — igual ao "CENTRO" do MockPlano: o Insight morde a
          quina do PAINEL, não a do container. Ancorar nele (não no container)
          é o que faz a mordida ser sempre a mesma profundidade, não impórta
          se a lista tem folga sobrando embaixo. */}
      <div className="relative">
        {/* lista de instrumentos — de fundo. Único mock sem gaia-parallax até
            aqui; recebe a mesma receita de entrada do MockExames/MockAntropometria.
            Recuo à esquerda (ml) abre a pista pro Insight pousar sem decapar
            linha nenhuma; -mr cancela o padding direito do container e sangra
            a lista até a borda real do card — mesma receita de sangria do
            MockPlano (-left-2/-right-3), o overflow-hidden do CARD_HERO é
            quem faz o corte. Ritmo das linhas mais seco (py-1, era py-2) e
            pb-10 (era o p-4 padrão de 16px) só trocam ONDE dentro da lista a
            altura mora — o total é o mesmo de antes (nada aqui pode crescer a
            linha do grid: o Antropometria ao lado é quem dita essa altura, e
            ela é fixa). O pb-10 sobra de propósito: é o vidro vazio embaixo
            da última linha onde o Insight pousa por cima. */}
        <div data-enter-delay={0} style={px(0.32)} className={"gaia-parallax ml-14 -mr-7 rounded-[18px] p-4 pb-10 md:ml-16 md:-mr-8 " + GLASS}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-title text-[15px] font-medium text-white">7 instrumentos validados</span>
            <span className="font-body text-[11.5px] text-white/50">pontuação automática</span>
          </div>
          {/* A entrada mora num WRAPPER e não na própria linha, e isso é
              obrigatório, não estilo: gaia-meal-rise roda com fill-mode `both`,
              que gruda o estado final (`opacity: 1`) no nó PRA SEMPRE depois de
              terminar — e animação vence declaração comum na cascata. Na linha,
              ela mataria o opacity-40 de quem não é o instrumento da vez e o
              acender/apagar do ciclo nunca mais aconteceria. Separadas, cada nó
              tem um dono só: o wrapper monta, a linha acende.
              O divide-y é do pai e cai no filho direto — que agora é o wrapper,
              então a régua entra junto com a linha em vez de aparecer antes. */}
          <div className="divide-y divide-white/[0.06]">
            {instruments.map((it, idx) => {
              const on = it.k === ins.k;
              return (
                <div key={it.k} className={entered ? "gaia-meal-rise" : "opacity-0"} style={{ animationDelay: `${120 + idx * 60}ms` }}>
                  <div className={"flex items-center gap-2.5 py-1 transition-opacity duration-500 " + (on ? "opacity-100" : "opacity-40")}>
                    {/* tick 140ms atrás da linha: o quadro chega, o check marca.
                        Juntos viram um borrão só; o atraso é o que faz ler como
                        a Gaia pontuando o instrumento que acabou de ler. */}
                    <span
                      className={
                        "grid h-5 w-5 place-items-center rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] transition-colors duration-500 " +
                        (on ? "bg-brand" : "bg-white/12") +
                        (entered ? " gaia-tick" : " opacity-0")
                      }
                      style={{ animationDelay: `${260 + idx * 60}ms` }}
                    >
                      <IconCheck className="h-3 w-3 text-white" />
                    </span>
                    <span className="font-body text-[12.5px] font-medium text-white/90">{it.k}</span>
                    <span className="hidden truncate font-body text-[11.5px] text-white/45 sm:block">{it.full}</span>
                    <span className="ml-auto font-body text-[11px] tabular-nums text-white/55">{it.s}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* card de Insight — flutua por cima e troca sozinho. Wrapper externo
            carrega a entrada (gaia-parallax escreve transform); o miolo carrega
            a troca de conteúdo (key+gaia-pop também escreve transform) — as duas
            classes NUNCA no mesmo nó, senão uma pisa na transform da outra.
            Ancorado NO PAINEL (-bottom/-left negativos, mesma receita da
            Sugestão do MockPlano), não no container: a maior parte do card
            cai FORA da lista, no vão que já existia embaixo dela, e só a
            quina de cima morde o pb-10 — vidro vazio, nunca linha. Compactado
            (p-2.5, número menor, gaps mais secos) porque o orçamento vertical
            aqui é a folga que já existia, não uma nova — o -bottom-[93px] foi
            medido no DOM, não chutado: cobre a folga que sobra abaixo da
            lista sem deixar a mordida encostar na última linha nem o Insight
            passar do overflow-hidden do card. */}
        <div data-enter-delay={800} style={px(1.5, 4)} className="gaia-parallax gaia-land absolute -bottom-[93px] -left-3 z-20 w-[222px]">
          <div key={i} className={"gaia-pop rounded-[14px] p-2.5 " + GLASS + " " + FLOAT}>
            <div className="flex items-center justify-between">
              <GaiaTag>Insight · {ins.k}</GaiaTag>
              <span className={"grid h-4 w-4 place-items-center rounded-full " + (ins.warn ? "bg-warning/15 text-warning" : "bg-brand/20 text-roxo-200")}>
                <IconArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </div>
            <div className="mt-1 flex items-end gap-1.5">
              <span className={"font-title text-[1.5rem] font-medium leading-none tabular-nums " + (ins.warn ? "text-warning" : "text-white")}>{ins.n}</span>
              <span className="mb-0.5 font-body text-[10.5px] text-white/45">{ins.of}</span>
            </div>
            <p className="mt-1 font-body text-[11.5px] leading-snug text-white/70">{ins.msg}</p>
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
  const polygonRef = useRef<SVGPolygonElement>(null);
  const circleRefs = useRef<(SVGCircleElement | null)[]>([]);

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
    gsap.to(polygonRef.current, { attr: { points: ANTHRO_AREAS[tab] }, duration: 0.8, ease: "power3.inOut" });
    ANTHRO_COORDS[tab].forEach(([x, y], i) => {
      const el = circleRefs.current[i];
      if (el) gsap.to(el, { attr: { cx: x, cy: y }, duration: 0.8, ease: "power3.inOut" });
    });
  }, [tab]);

  return (
    <div ref={ref} className="mt-8 flex-1 px-7 pb-7 md:px-8 md:pb-8">
      <div style={px(0.32)} className={"gaia-parallax rounded-[18px] p-4 " + GLASS}>
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
          <Avatar person={MARINA} className="h-8 w-8 text-[12px]" />
          <div className="min-w-0 flex-1">
            <p className="font-title text-[13px] font-medium text-white/85">{s.tab} · Marina</p>
            <p className="font-body text-[9.5px] uppercase tracking-[0.08em] text-white/40">6 consultas · mar–ago</p>
          </div>
          <div className="inline-flex shrink-0 gap-0.5 rounded-full bg-white/[0.07] p-0.5">
            {ANTHRO_SERIES.map((serie, i) => (
              <span
                key={serie.tab}
                className={
                  "rounded-full px-2 py-0.5 font-body text-[10px] font-medium transition-colors duration-500 ease-gaia " +
                  (i === tab ? "bg-white/15 text-white" : "text-white/40")
                }
              >
                {serie.tab}
              </span>
            ))}
          </div>
        </div>

        {/* O número lidera: o gráfico é prova, não manchete. */}
        <div key={tab} className="gaia-fade mt-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-title text-[2.4rem] font-medium leading-none tabular-nums text-white">{s.headline}</span>
            {s.unit && <span className="font-body text-[15px] text-white/45">{s.unit}</span>}
          </div>
          <p className="mt-1.5 font-body text-[12px] text-white/45">
            <span className="font-medium tabular-nums text-info">{s.deltaBold}</span> desde março
          </p>
        </div>

        <div className="relative mt-4 h-32 overflow-hidden rounded-[12px] bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
          <span key={"top" + tab} className="gaia-fade absolute right-2 top-1.5 z-10 font-body text-[9px] tabular-nums text-white/30">{s.top}</span>
          <span key={"bottom" + tab} className="gaia-fade absolute bottom-5 right-2 z-10 font-body text-[9px] tabular-nums text-white/30">{s.bottom}</span>

          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={"gaia-draw absolute inset-0 h-full w-full " + (entered ? "is-drawn" : "")}>
            <defs>
              <linearGradient id="anthroFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C1A9D3" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#C1A9D3" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon ref={polygonRef} points={ANTHRO_AREAS[0]} fill="url(#anthroFill)" />
            {/* Colunas por consulta — dentro do SVG pra pintarem SOBRE o fill e
                sob a linha. Fora dele o `inset-0` do svg as encobria. */}
            {ANTHRO_LABELS.slice(0, -1).map((label, i) => {
              const x = ANTHRO_X0 + ((i + 0.5) / (ANTHRO_LABELS.length - 1)) * (ANTHRO_X1 - ANTHRO_X0);
              return <line key={label} x1={x} y1="0" x2={x} y2="40" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />;
            })}
            <polyline ref={polylineRef} points={ANTHRO_LINES[0]} fill="none" stroke="#C1A9D3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {ANTHRO_COORDS[0].map(([x, y], i) => (
              <circle
                key={ANTHRO_LABELS[i]}
                ref={(el: SVGCircleElement | null) => {
                  circleRefs.current[i] = el;
                }}
                cx={x}
                cy={y}
                r="1.5"
                fill="#0A0C11"
                stroke="#C1A9D3"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

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
            className="pointer-events-none absolute transition-[left,top] duration-[800ms] ease-gaia"
            style={{ left: `${lastX}%`, top: `${(lastY / 40) * 100}%`, transform: "translate(-50%,-50%)" }}
          >
            <span
              className={
                "relative flex h-2.5 w-2.5 items-center justify-center transition-[opacity,transform] duration-500 ease-gaia motion-reduce:transition-none " +
                (entered ? "scale-100 opacity-100" : "scale-0 opacity-0")
              }
              style={{ transitionDelay: "1000ms" }}
            >
              <span className="absolute h-2.5 w-2.5 rounded-full bg-[#C1A9D3]/60 motion-safe:animate-ping" />
              <span className="h-2 w-2 rounded-full bg-[#C1A9D3] ring-2 ring-[#0A0C11]" />
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
              quem é o laudo. A `key` mora no wrapper do par rosto+nome pra os
              dois trocarem no mesmo fade — o rosto entrando antes do nome
              lia como troca de paciente pela metade. */}
          <span className="inline-flex items-center gap-2 font-body text-[12px] font-medium text-white/70">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 text-[10px] font-semibold text-white/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">PDF</span>
            <span className="inline-flex items-center gap-1.5">
              Laudo ·
              <span key={p.who.name} className="gaia-fade inline-flex items-center gap-1.5">
                <Avatar person={p.who} className="h-5 w-5 text-[8.5px]" />
                <span className="text-white/85">{p.who.name}</span>
              </span>
            </span>
          </span>
          <GaiaTag className="shrink-0">extraiu {p.extr} marcadores</GaiaTag>
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
                {/* O escalonamento (0/90/180ms) é PERMANENTE, não só da
                    entrada: um delay que só valesse na chegada teria que ser
                    limpo depois, senão atrasaria a troca de paciente do ciclo
                    pra sempre. Constante, ele vira característica do card — as
                    agulhas sempre buscam a medida uma atrás da outra — e a
                    entrada continua sendo o gesto grande sem precisar de
                    exceção nenhuma: aqui elas varrem a régua INTEIRA a partir
                    do zero, e no ciclo só andam de um valor pro vizinho. */}
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black/60 transition-[left,background-color] duration-[900ms] ease-gaia motion-reduce:transition-none"
                  style={{
                    left: entered ? `${r.pos}%` : "0%",
                    background: r.flag ? "#D6A04E" : "#A6B58F",
                    transitionDelay: `${idx * 90}ms`,
                  }}
                />
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
                    "flex items-center gap-3 rounded-[10px] px-2 py-1 transition-colors duration-500 ease-gaia " +
                    (on ? "bg-white/[0.06] opacity-100" : "opacity-45")
                  }
                >
                  {/* A espinha cresce 140ms depois da linha chegar. Ela é o
                      dado (roxo = tele, sage = presencial), e dado que aparece
                      junto com o quadro que o contém não é lido como dado. */}
                  <span
                    className={
                      "h-6 w-[3px] shrink-0 rounded-full transition-colors duration-500 ease-gaia " +
                      (ev.tele ? "bg-brand" : "bg-sage-400") +
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
                      {on && <Pill className="shrink-0 !px-1.5 !py-0.5 text-[11px] text-white/60">agora</Pill>}
                    </div>
                  </div>
                  <span className="shrink-0 font-body text-[11px] tabular-nums text-white/50">{ev.dur}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* faixa de rodapé — altura fixa, SEMPRE presente. Só o conteúdo troca
            (reanima via gaia-fade keyado por `active`), pra não haver reflow
            quando o ciclo alterna teleconsulta ↔ presencial. */}
        <div className="mt-2.5 flex min-h-[40px] items-center rounded-[12px] bg-white/[0.06] p-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div key={active} className="gaia-fade flex w-full min-w-0 items-center justify-between gap-3">
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
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/25">
        <span data-bar className="block h-full w-[68%] origin-left rounded-full bg-brand" />
      </div>
      <p className="mt-1.5 font-body text-[10.5px] text-white/65">adesão 68% nesta semana</p>
      {/* macros — o detalhe que faltava: a divisão do dia, não só o total */}
      <div className="mt-3 grid grid-cols-3 gap-2.5 border-t border-white/10 pt-3">
        {MACROS.map(([nome, valor, pct]) => (
          <div key={nome}>
            <p className="font-body text-[9.5px] uppercase tracking-wide text-white/45">{nome}</p>
            <p className="mt-0.5 font-title text-[13px] font-medium text-white">{valor}</p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/25">
              <span data-bar className="block h-full origin-left rounded-full bg-brand/70" style={{ width: pct }} />
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
        <span className="grid h-7 w-7 place-items-center rounded-full bg-warning/15 text-warning"><TrendArrow dir="down" className="h-3.5 w-3.5" /></span>
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
                "flex items-center gap-2 border-t border-white/10 py-2 font-body text-[12px] leading-snug transition-colors duration-500 ease-gaia first:border-t-0 first:pt-0 last:pb-0 " +
                (on ? "text-white/90" : "text-white/45")
              }
            >
              {/* dot acende só na linha ativa — cor não transiciona bem em
                  opacity 0→1 com bg translúcido, então some via width/scale */}
              <span className={"h-1.5 w-1.5 shrink-0 rounded-full bg-roxo-300 transition-transform duration-500 ease-gaia " + (on ? "scale-100" : "scale-0")} />
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
      <div data-enter-delay={0} style={px(1.55, 0)} className={"gaia-parallax gaia-converge-l rounded-[16px] p-4 " + GLASS_FROST + " " + FLOAT}>
        <PlanoAtivoCard />
      </div>
    </div>
  );
}

/* Cluster direito — dois cards de vidro espalhados na vertical: Calibragem no
   topo (largo, com lista + lastro), Exames novos embaixo colado na direita
   (mais estreito, w-[210px]). justify-between abre o vão que deixa os dois
   flanqueando a borda direita do phone (lg+). */
function ProntuarioRight() {
  return (
    <div className="pointer-events-none absolute right-[4%] top-1/2 hidden h-[92%] w-[256px] -translate-y-1/2 flex-col justify-between lg:flex xl:right-[5%]">
      {/* par da direita SEM rotação, borda direita flush: Calibragem preenche o
          container e Exames (mais estreito) cola na mesma borda via self-end. */}
      <div data-enter-delay={40} style={px(1.5, 0)} className={"gaia-parallax gaia-converge-r rounded-[16px] p-4 " + GLASS_FROST + " " + FLOAT}>
        <CalibragemCard />
      </div>
      <div data-enter-delay={140} style={px(1.5, 0)} className={"gaia-parallax gaia-converge-r w-[210px] self-end rounded-[16px] p-4 " + GLASS_FROST + " " + FLOAT}>
        <ExamesNovosCard />
      </div>
    </div>
  );
}

/* Empilhado — mobile/tablet, onde não há phone 3D. */
function ProntuarioStacked() {
  return (
    <div className="mt-7 flex flex-col gap-3 lg:hidden">
      {/* px(0): entram, mas não seguem o cursor nem tortas. Sem phone no meio
          não há convergência pra encenar — o que sobra da assinatura é a
          chegada pela esquerda, alinhada com a pilha. E dedo não tem hover:
          depth aqui seria peso de will-change sem contrapartida. */}
      <div data-enter-delay={0} style={px(0)} className={"gaia-parallax gaia-from-left w-[248px] rounded-[16px] p-4 " + GLASS_FROST + " " + FLOAT}>
        <PlanoAtivoCard />
      </div>
      <div data-enter-delay={90} style={px(0)} className={"gaia-parallax gaia-from-left w-[256px] rounded-[16px] p-4 " + GLASS_FROST + " " + FLOAT}>
        <CalibragemCard />
      </div>
      <div data-enter-delay={180} style={px(0)} className={"gaia-parallax gaia-from-left w-[224px] rounded-[16px] p-4 " + GLASS_FROST + " " + FLOAT}>
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
        opacity: 0,
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
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        <header className="mb-14 max-w-2xl md:mb-16">
          <span data-reveal className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Recursos
          </span>
          <h2 data-reveal className="text-balance font-title text-h2 font-medium text-neutro-0 md:text-h1">
            Tudo que a consulta precisa, <span className="italic text-white/60">num lugar só.</span>
          </h2>
        </header>

        <div data-grid className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
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

          {/* B — Questionários (hero verde) */}
          <article data-card className={CARD_HERO + " min-h-[440px] lg:col-start-2 lg:row-start-1"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/textures/questionarios-verde.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,14,10,0.3)_0%,rgba(10,14,10,0.1)_42%,rgba(10,14,10,0.24)_100%)]" />
            {/* Roxo sobre textura VERDE, de propósito: luz verde sobre folha
                verde não existe — some na textura. O roxo é a cor da Gaia e o
                card de Insight (que é uma leitura dela) pousa bem aqui em cima,
                então a luz explica de quem é a voz. Entra DEPOIS do véu: antes
                dele o escurecimento apagaria a luz junto com a textura. */}
            <Glow className="bottom-[-4%] left-[-10%] h-80 w-80" />
            <Hotspot className="bottom-[-90px] left-[-70px] h-[300px] w-[340px]" />
            <Grain at="18% 100%" />
            <EdgeLight at="18% 100%" />
            <div className="relative flex h-full flex-col">
              <div className="px-7 pt-7 md:px-8 md:pt-8">
                <CardTitle>Questionários</CardTitle>
                <CardBody tone="hero">Sete instrumentos validados (EAT-26, QFA, PSQI e outros), com pontuação automática.</CardBody>
              </div>
              <MockQuestionarios />
            </div>
          </article>

          {/* C — Plano alimentar (hero óleo, card alto) */}
          {/* verde do pepino */}
          <article data-card className={CARD_HERO + " lg:col-start-1 lg:row-start-2"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/textures/plano-pepino.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,12,12,0.6)_0%,rgba(6,12,12,0.38)_46%,rgba(6,12,12,0.54)_100%)]" />
            {/* A quina esquerda é onde a carta da frente do baralho fica — a
                pilha se abre PRA FORA da luz, subindo e indo pra direita, e o
                canto aceso é de onde ela sai. Branca faz aqui o que cor nenhuma
                faria: acende o pepino como pepino. Luz roxa deixava a textura
                arroxeada (foi a primeira tentativa, e a foto perdia o assunto);
                luz verde sobre folha verde simplesmente some. */}
            <Hotspot className="bottom-[-80px] left-[-80px] h-[320px] w-[360px]" />
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
            {/* âmbar dos bokeh */}
            <article data-card className={CARD_HERO + " min-h-[360px] flex-1"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/textures/exames-ambar.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-center" />
              {/* Véu ALIVIADO no miolo (0,34 → 0,24) — este é o card claro do
                  bento, o papel que no bento do Pixel Point é do "1" âmbar.
                  Medido lá: os cards deles vão de 36,6 a 139,9 de luminância,
                  amplitude 103, razão 3,8×. Os nossos seis estavam entre 37,7 e
                  41,0 — amplitude 3,3, razão 1,1×. Seis cards na mesma
                  escuridão, e nenhuma camada de luz conserta isso, porque o
                  problema não é a luz: é não haver contraste ENTRE as peças.
                  Aqui o alívio deixa os bokeh quentes da foto queimarem de
                  verdade e o card vira o ponto claro da composição.
                  O topo continua fechado (0,52, quase o original): é onde o
                  título e o corpo em branco moram, e ali o véu não é estilo — é
                  o que segura o contraste do texto. Por isso o gradiente abre
                  no meio e fecha nas duas pontas, em vez de clarear por igual. */}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,9,6,0.54)_0%,rgba(12,9,6,0.24)_46%,rgba(12,9,6,0.4)_100%)]" />
              {/* Continua SEM Glow, e a razão é a de sempre: a textura deste
                  card já É uma fonte de luz (os bokeh quentes fora de foco).
                  Somar âmbar sobre âmbar não deu profundidade — deu lavagem: o
                  card virou o ponto mais claro do bento e puxou o olho pra
                  longe do laudo, que é o assunto. Mancha ambiente aqui sobra.
                  O Hotspot não recai nisso porque não é mais tinta: ele é
                  branco e pequeno, então não ENGROSSA o âmbar — acende os
                  bokeh que já estão naquela quina, que é o que uma luz faz com
                  uma foto. E fica na quina onde os marcadores param quando o
                  valor está alto: o lado "fora da faixa" da régua, que é o
                  assunto do card. */}
              <Hotspot className="bottom-[-80px] right-[-70px] h-[280px] w-[320px]" />
              <Grain at="85% 100%" />
              <EdgeLight at="85% 100%" />
              <div className="relative flex h-full flex-col">
                <div className="px-7 pt-7 md:px-8 md:pt-8">
                  <CardTitle>Exames de sangue</CardTitle>
                  <CardBody tone="hero">Suba o PDF do laboratório. A Gaia extrai os valores e marca o que está fora da faixa.</CardBody>
                </div>
                <MockExames />
              </div>
            </article>

            {/* roxo = teleconsulta, a cor que a espinha das linhas usa */}
            <article data-card className={CARD + " min-h-[360px] flex-1"}>
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
          {/* malva da pétala. Alpha mais baixo (0,38) que os outros de
              propósito: este card tem 1024px de largura contra ~500 dos
              vizinhos, então o mesmo alpha renderia o dobro de franja e o
              Prontuário viraria o ponto mais aceso do bento — quando ele é o
              fecho, não a manchete. */}
          <article data-card className={CARD_HERO + " lg:col-span-6"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/textures/petala.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            {/* Escurecimento base — mantém o fundo escuro e coerente com o Features.
                NÃO acompanha o alívio que os outros heróis levaram: a pétala é a
                única textura CLARA do bento, e aqui os satélites são GLASS_FROST
                (tinta branca). Véu mais leve = fundo mais claro = vidro branco
                sobre claro, e "adesão 68%" some. Nos heróis escuros o alívio
                revela a textura; neste ele apaga o texto. */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,12,0.62)_0%,rgba(6,10,12,0.34)_46%,rgba(6,10,12,0.5)_100%)]" />
            {/* assento radial atrás do phone — dá contraste ao aparelho centralizado */}
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[620px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(4,8,10,0.66)_0%,rgba(4,8,10,0.32)_52%,transparent_74%)] lg:block" />
            {/* DEPOIS do assento, e a ordem é o ponto: o assento é justamente o
                escurecimento no centro que dá contraste ao phone, então uma luz
                central antes dele nasceria e seria apagada no frame seguinte.
                Aqui ela acende POR CIMA.

                MUITO larga e rasa (900×260), e não redonda como as outras. O
                centro inferior deste card é o lugar mais disputado do bento, e
                os números são de régua no DOM, não de olho: o phone ocupa
                x 596–844 e desce até 668 (passa da borda do card, que fecha em
                619); o satélite esquerdo vai até x 563 e o direito começa em
                888. Entre eles sobram frestas de 33px e 44px. Uma luz redonda
                de ~220px centrada aqui fica INTEIRA atrás do aparelho — foi o
                que aconteceu nas duas primeiras tentativas: o hotspot existia
                no DOM, media certo, e não aparecia em tela.
                O que existe de vão é a FAIXA de 55px na base (y 564–619), livre
                em toda a largura fora do phone. Por isso a elipse é rasa e
                deitada: ela mora nessa faixa e sai pelos dois lados do
                aparelho. O phone ganha contraluz em vez de tapar a lâmpada —
                escuro atrás do corpo (o assento), luz escapando por baixo. É
                também pra onde os três satélites convergem: a luz marca o
                centro da reunião. */}
            <Hotspot className="bottom-[-120px] left-1/2 h-[260px] w-[900px] -translate-x-1/2" />
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

"use client";

import { useRef, type CSSProperties } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { skyGradientCss } from "@/lib/sky";

gsap.registerPlugin(ScrollTrigger);

/* ── Manifesto ────────────────────────────────────────────────────────────────
   Interstitial cinético que costura o Features (escuro #0A0C11) ao Pricing
   (claro #FAF9F5). Técnica ref. Codrops "Animate SVG Text on a Path": duas
   frases correm ao longo de um <path> curvo espelhado (<textPath>), com um
   filtro SVG de blur cujo stdDeviation é dirigido pelo scroll (GSAP scrub) —
   o texto entra borrado e "resolve" ao cruzar o centro. A frase atravessa
   do escuro pro claro junto com o fundo: "Você cuida da pessoa." (branco, em
   cima) → "A Gaia cuida do resto." (tinta, embaixo).                          */

/* curva 1 — onda descendo-subindo | curva 2 — espelhada (subindo-descendo) */
const CURVE_1 = "M 0 118 Q 250 60 500 108 Q 750 150 1000 96";
const CURVE_2 = "M 0 96 Q 250 154 500 100 Q 750 52 1000 116";

/* Curso de cada frase ao longo do path, em % do comprimento. Contra-movimento:
   a de cima corre pra direita, a de baixo pra esquerda.

   O curso NÃO é o mesmo nos dois breakpoints porque a FONTE não é (ver os
   text-[..px] nos <text>). A regra é geométrica: textAnchor é middle, então a
   frase ocupa [centro − metade, centro + metade] do path e nenhuma das pontas
   pode sair de [0,100], senão a frase é CORTADA na curva — o que a Laura vetou
   ("desde que passem na animação curva por completo"). Logo o curso máximo é
   `centro ∈ [frac/2, 100−frac/2]`, com `frac` = quanto do path a frase mede.

     desktop: fonte 64 → medido ~65% do path → cabe 36→64 (δ=14) com folga.
     mobile:  fonte 80 → medido ~81% do path → só cabe ~43→57 (δ=7); mais curso
              que isso e "A Gaia cuida do resto." transborda a ponta do path.

   Fonte maior come curso: é o trade que o pedido "maiores" impõe. Se subir mais
   a fonte mobile, APERTE o TRAVEL_MOBILE na mesma conta (e confira no render — a
   medida do textLen tem ruído de kerning). */
const TRAVEL_DESKTOP = { from: 36, to: 64 };
const TRAVEL_MOBILE = { from: 43, to: 57 };

/* Range de scroll em que cada frase resolve o blur. A de cima já está em tela
   quando a seção abre, então pode resolver no percurso até o centro. A de baixo
   mora no rodapé de uma seção de 160vh: se esperasse o centro dela chegar ao
   miolo da viewport, ficaria borrada muito depois do phone já ter pousado ali.
   Ela resolve ENQUANTO entra — nítida no instante em que o phone a alcança. */
const BLUR_RANGE = {
  1: { start: "top 88%", end: "center 52%" },
  2: { start: "top bottom", end: "top 72%" },
} as const;

/* O gradiente é a seção inteira. Os stops moram em lib/sky.ts porque o skydome
   do ScrollPhone (que existe só pra água ter o que refletir) precisa dos MESMOS
   valores — se as duas listas divergirem, o reflexo mostra um céu diferente do
   céu. Ver o cabeçalho de lib/sky.ts pro raciocínio inteiro. */
const SKY = skyGradientCss();

/* O navy EXATO em que o vídeo do campo abre (topo de pricing-campo-bg, = SKY_STOPS
   cauda). É o fundo SÓLIDO da section — a mask bottom derrete o gradiente do céu
   nele, então a section "termina exatamente no tom de azul que começa o vídeo".
   Se o vídeo real divergir do webp, reamostrar o frame 1 e cravar aqui (e em
   SKY_STOPS). */
const MANIFESTO_END = "#0E133B";

/* Mask bottom: o céu (camada por cima do navy sólido) desmancha nos últimos ~24%,
   revelando MANIFESTO_END — uma pluma pro azul do vídeo em vez de uma aresta reta.
   Fica na CAMADA do gradiente, não na section: mascarar a section inteira exporia
   o body por trás; mascarar só o céu entrega o navy que mora atrás dele. */
const SKY_MASK = "linear-gradient(to bottom, #000 76%, transparent 100%)";

/* mesmo grão do Features/Pricing — aqui ele tem função, não só textura: um
   gradiente de 130vh com poucos stops faz banding em tela boa, e o ruído
   quebra as faixas. */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* fontSize saiu daqui pra virar RESPONSIVO — mobile pede a frase maior (pedido
   da Laura 2026-07-22), e o tamanho vai por classe (text-[80px] lg:text-[64px])
   nos <text>, não inline, senão o style ganharia da classe. Em SVG o "px" da
   font-size cai em UNIDADES DO viewBox (1000×200), então 80 unidades ≈ 34px
   renderizado no phone (430px de largura) contra os 27,5px que 64 dava. O curso
   na curva (TRAVEL_MOBILE) já foi apertado pra essa fonte maior caber. */
const TEXT_STYLE: CSSProperties = {
  letterSpacing: "-0.015em",
  fontWeight: 500,
};

export default function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      /* matchMedia (não um matchMedia().matches lido uma vez) porque o TRAVEL
         agora DEPENDE do breakpoint — a fonte mobile é maior e o curso na curva
         é mais curto pra ela não transbordar (ver TRAVEL_MOBILE). Lido uma vez
         só, um resize desktop→mobile deixaria o curso largo sobre a fonte
         grande e cortaria a frase; matchMedia re-roda no cruzamento do 1024 e o
         useGSAP reverte o contexto antigo. O `reduce` entra aqui como condição
         irmã: quando bate, os dois ramos (mobile/desktop) caem no set estático. */
      gsap.matchMedia().add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          mobile: "(max-width: 1023px)",
          desktop: "(min-width: 1024px)",
        },
        (ctx) => {
          const { reduce, mobile } = ctx.conditions as {
            reduce: boolean;
            mobile: boolean;
            desktop: boolean;
          };
          const travel = mobile ? TRAVEL_MOBILE : TRAVEL_DESKTOP;

          // cada linha: blur alto → 0 conforme cruza o centro do viewport
          ([1, 2] as const).forEach((n) => {
            const fe = `#fe-blur-${n}`;
            const svg = `[data-line="${n}"]`;
            const flow = `[data-flow="${n}"]`; // o <textPath> que corre na curva

            if (reduce) {
              gsap.set(fe, { attr: { stdDeviation: 0 } });
              gsap.set(flow, { attr: { startOffset: "50%" } });
              return;
            }

            const [a, b] =
              n === 1
                ? [travel.from, travel.to] // frase de cima corre →
                : [travel.to, travel.from]; // frase de baixo corre ←

            gsap.set(fe, { attr: { stdDeviation: 15 } });
            gsap.to(fe, {
              attr: { stdDeviation: 0 },
              ease: "none",
              scrollTrigger: {
                trigger: svg,
                start: BLUR_RANGE[n].start,
                end: BLUR_RANGE[n].end,
                // scrub numérico (era true): feGaussianBlur re-rasteriza o texto a
                // cada valor novo — cru, cada delta de roda vira um recompute e o
                // "resolve" treme. 0.5 suaviza e rate-limita; o irmão de
                // startOffset abaixo já usava scrub numérico.
                scrub: 0.5,
              },
            });

            // a frase VIAJA ao longo do próprio <path>: acompanha as cristas e
            // vales da onda enquanto o scroll a empurra. direções opostas.
            // NOTA: isto depende do refreshPriority dos pins de ComoComecar/ARoberta
            // — sem ele o ScrollTrigger mede esta seção 3960px acima do real (o
            // pinSpacing dos dois pins) e a frase chega no fim do curso antes da
            // seção entrar em tela, parecendo travada.
            gsap.fromTo(
              flow,
              { attr: { startOffset: `${a}%` } },
              {
                attr: { startOffset: `${b}%` },
                ease: "none",
                scrollTrigger: {
                  trigger: root.current,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1,
                },
              },
            );
          });
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      /* data-sky-manifesto: a névoa do Mergulho precisa saber QUAL céu está na
         altura do horizonte. Ele nem sempre cai dentro da seção da água — no
         pico do mergulho a câmera inclina e o horizonte sobe pra dentro DESTA
         seção. Ver NÉVOA em ScrollPhone. */
      data-sky-manifesto
      aria-label="Você cuida da pessoa. A Gaia cuida do resto."
      /* O RODAPÉ CEDE (pb 42vh → 16vh → 8vh; a segunda descida foi a Laura pedindo a água mais pra cima — o vão total texto→superfície é calibrado a olho, ver Mergulho.tsx), E SÓ NO MD+ — o pt fica intacto.
         `justify-between` joga as duas frases nas pontas da caixa de conteúdo,
         então o pb é literalmente a distância de "A Gaia cuida do resto." até o
         fim da seção — e, desde que a linha d'água virou a base do Mergulho
         (ver lá), até a ÁGUA. Medido: a frase estava a 882px da superfície, 1.12
         viewports, e com ela em quadro não havia mar nenhum. 410px daquilo eram
         este padding.
         Não é o Manifesto perdendo respiro pro mergulho: é a frase passando a
         ter um chão. "A Gaia cuida do resto." dita sobre o mar, quase encostando
         nele, é a leitura — e a régua é a referência da Laura, onde a frase e a
         linha dividem o quadro. Com 42vh ela terminava no vácuo e a água chegava
         um viewport depois, quando ela já tinha ido embora.
         O pt segue 42vh: "Você cuida da pessoa." nasce do escuro do Features e
         essa entrada não mudou. A caixa deixou de ser simétrica porque as duas
         pontas deixaram de fazer a mesma coisa — a de cima abre um capítulo, a
         de baixo agora encosta noutro. */
      /* COMPACTAÇÃO MOBILE/TABLET (<lg, 2026-07-22) — a Laura mandou tirar "esse
         espaço" entre "A Gaia cuida do resto." e o campo do Pricing (Image #4: o
         phone boiando num vão navy vazio). O vão era pb-30vh(280px) + Mergulho
         42vh(391px) ≈ 670px de navy morto.

         POR QUE min-h CAI JUNTO COM O pb, e não só o pb. O gradiente do céu
         (background: SKY) é mapeado sobre a ALTURA da section, e "A Gaia cuida"
         (text-ink, escuro) só se lê sobre o pico lavanda do gradiente — os stops
         até 0.72 (ver sky.ts). Com justify-between, cortar SÓ o pb empurra a
         frase pra baixo, pro navy escuro do fim do gradiente (medido: fraction
         0.56→0.78), e o ink some. Cortando min-h JUNTO (90→74vh) o content-box
         fica igual ao original (~261px), então: (1) as duas frases NÃO se afastam
         e (2) a frase de baixo cai no MESMO pixel de antes (~473px do topo),
         agora em fraction ~0.69 — ainda dentro da faixa ≤0.72 calibrada. Contraste
         conferido no render, não na conta.

         lg: devolve os 130/42/24vh do desktop intactos (lá o pb é a distância da
         frase à água, calibração do Mergulho). Antes esses valores moravam em
         md:; migraram pra lg: pra o TABLET (768–1024, que usa o Pricing mobile)
         compactar junto. pt base intacto: a entrada da 1ª frase do escuro do
         Features não mudou. */
      className="relative flex min-h-[74vh] flex-col justify-between overflow-hidden pt-[32vh] pb-[14vh] lg:min-h-[130vh] lg:pt-[42vh] lg:pb-[24vh]"
      /* Fundo SÓLIDO = o navy exato em que o vídeo do campo abre. O céu (gradiente)
         vem numa camada por cima com mask bottom, e ao desmanchar entrega este
         navy — a section acaba no mesmo tom em que o vídeo começa. */
      style={{ background: MANIFESTO_END }}
    >
      {/* CÉU — o gradiente do Manifesto, agora numa camada própria pra poder ter
          MASK BOTTOM (ver SKY_MASK). Desmancha nos ~24% de baixo no navy sólido de
          trás. Fica atrás de tudo (primeiro filho, sem z) — halo, grão e as duas
          frases seguem por cima como antes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: SKY, WebkitMaskImage: SKY_MASK, maskImage: SKY_MASK }}
      />

      {/* halo de aurora no crossover — mesma família do Pricing, costura a luz */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-[150px]"
      />

      {/* grão sobre o gradiente inteiro — quebra o banding das faixas longas.
          soft-light some no claro e no escuro, então não suja as pontas. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
        style={{ backgroundImage: NOISE, backgroundSize: "140px" }}
      />

      {/* linha 1 — branca, no escuro */}
      <svg
        data-line="1"
        viewBox="0 0 1000 200"
        preserveAspectRatio="xMidYMid meet"
        /* sem will-change-transform: nada aqui transforma — o que anima é
           startOffset (textPath) e stdDeviation (filtro), e o hint só
           promovia uma layer permanente de graça sem evitar a rasterização. */
        className="relative z-[70] block h-auto w-full font-title text-neutro-0"
        aria-hidden
      >
        <defs>
          <filter id="blur-line-1" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur id="fe-blur-1" in="SourceGraphic" stdDeviation="0" />
          </filter>
        </defs>
        <path id="curve-1" d={CURVE_1} fill="none" />
        <text
          filter="url(#blur-line-1)"
          fill="currentColor"
          textAnchor="middle"
          className="text-[80px] lg:text-[64px]"
          style={TEXT_STYLE}
        >
          <textPath data-flow="1" href="#curve-1" startOffset="50%">
            Você cuida da pessoa.
          </textPath>
        </text>
      </svg>

      {/* linha 2 — tinta escura, no claro */}
      <svg
        data-line="2"
        viewBox="0 0 1000 200"
        preserveAspectRatio="xMidYMid meet"
        className="relative z-[70] block h-auto w-full font-title text-ink"
        aria-hidden
      >
        <defs>
          <filter id="blur-line-2" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur id="fe-blur-2" in="SourceGraphic" stdDeviation="0" />
          </filter>
          {/* Gradiente do "do resto." — luar: quase-branco no topo dos glyphs
              resolvendo em lavanda na base. userSpaceOnUse (não bounding box):
              o texto VIAJA no path e bbox de tspan em textPath é instável entre
              engines; cravado no espaço do viewBox (curva 2 vive em y 52–154),
              a luz fica fixa no céu e os glyphs atravessam ela — sobe a crista,
              acende. O stop de baixo (#CDB9EC) é o piso de contraste: ~3.3:1
              sobre o trecho mais claro do céu (p95 medido), AA pra 64px. */}
          <linearGradient
            id="resto-grad"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="40"
            x2="0"
            y2="165"
          >
            <stop offset="0" stopColor="#FAF9F5" />
            <stop offset="1" stopColor="#CDB9EC" />
          </linearGradient>
        </defs>
        <path id="curve-2" d={CURVE_2} fill="none" />
        <text
          filter="url(#blur-line-2)"
          fill="currentColor"
          textAnchor="middle"
          className="text-[80px] lg:text-[64px]"
          style={TEXT_STYLE}
        >
          <textPath data-flow="2" href="#curve-2" startOffset="50%">
            A Gaia cuida{" "}
            {/* O accent era roxo-600 (#5F4590), calibrado pra quando esta linha
                era lida no CLARO. O céu desceu pra #574385→#332963 na altura
                dela (SKY_STOPS 0.72+) e roxo-600 sumiu no fundo (~1:1). Claro
                em vez de mais escuro: escuro competia com o ink de "A Gaia
                cuida" e a palavra-payoff é a que deve acender. */}
            <tspan fontStyle="italic" fill="url(#resto-grad)">
              do resto.
            </tspan>
          </textPath>
        </text>
      </svg>
    </section>
  );
}

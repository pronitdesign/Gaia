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
   a de cima corre pra direita, a de baixo pra esquerda. 36→64 é o máximo que
   cabe sem a frase transbordar a ponta do path (a frase mede ~60% dele e o
   textAnchor é middle, então o centro não pode passar de ~36%/~64%). */
const TRAVEL = { from: 36, to: 64 };

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

/* mesmo grão do Features/Pricing — aqui ele tem função, não só textura: um
   gradiente de 130vh com poucos stops faz banding em tela boa, e o ruído
   quebra as faixas. */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const TEXT_STYLE: CSSProperties = {
  fontSize: 64,
  letterSpacing: "-0.015em",
  fontWeight: 500,
};

export default function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
            ? [TRAVEL.from, TRAVEL.to] // frase de cima corre →
            : [TRAVEL.to, TRAVEL.from]; // frase de baixo corre ←

        gsap.set(fe, { attr: { stdDeviation: 15 } });
        gsap.to(fe, {
          attr: { stdDeviation: 0 },
          ease: "none",
          scrollTrigger: {
            trigger: svg,
            start: BLUR_RANGE[n].start,
            end: BLUR_RANGE[n].end,
            scrub: true,
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
      className="relative flex min-h-[130vh] flex-col justify-between overflow-hidden py-[32vh] md:min-h-[160vh] md:pb-[8vh] md:pt-[42vh]"
      style={{ background: SKY }}
    >
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
        className="relative z-[70] block h-auto w-full font-title text-neutro-0 will-change-transform"
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
        className="relative z-[70] block h-auto w-full font-title text-ink will-change-transform"
        aria-hidden
      >
        <defs>
          <filter id="blur-line-2" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur id="fe-blur-2" in="SourceGraphic" stdDeviation="0" />
          </filter>
        </defs>
        <path id="curve-2" d={CURVE_2} fill="none" />
        <text
          filter="url(#blur-line-2)"
          fill="currentColor"
          textAnchor="middle"
          style={TEXT_STYLE}
        >
          <textPath data-flow="2" href="#curve-2" startOffset="50%">
            A Gaia cuida{" "}
            <tspan fontStyle="italic" fill="#5F4590">
              do resto.
            </tspan>
          </textPath>
        </text>
      </svg>
    </section>
  );
}

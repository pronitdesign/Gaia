"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Badge } from "@/components/ui/Badge";

gsap.registerPlugin(ScrollTrigger);

// Fundo da section — gradiente Bruma.
const BACKDROP = "/roberta-bg.webp";

// Emenda com o off-white do #como-comecar (neutro-50): o gradiente entra desmaiado.
const TOP_FADE = "linear-gradient(to bottom, transparent 0, #000 13%)";

// Véu de neutro-50 sobre o gradiente. O pixel mais escuro do webp é rgb(138,72,124)
// (o miolo magenta): sobre ele, texto neutro-700 só bate 4.5:1 com α ≥ 0.642. Como o
// object-cover reposiciona o blob a cada viewport, o véu tem que estar ≥0.68 em TODA
// faixa onde o editorial pode cair (a partir de 40vh) — não dá pra contar com sorte
// de crop. Acima disso o banner cobre, então fica leve e o gradiente respira.
const LEGIBILITY_VEIL =
  "linear-gradient(to bottom, rgba(250,249,245,0.28) 0%, rgba(250,249,245,0.45) 30%, rgba(250,249,245,0.68) 41%, rgba(250,249,245,0.70) 100%)";

// Foto da Roberta — soltar o arquivo em /public e trocar aqui.
// Enquanto não existe, o placeholder (gradiente Bruma + monograma) aparece por baixo.
const PORTRAIT = "/roberta.jpg";

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

const BANNER_VH = 0.4; // banner = 40% da altura da tela

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
        className="absolute inset-0 h-full w-full object-cover object-[52%_28%]"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      {/* leve wash frio/lavanda por cima — tratamento de marca */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-roxo-900/20 via-transparent to-transparent" />
    </div>
  );
}

/** Fundo — gradiente Bruma full-bleed, desmaiando no topo pro off-white do #como-comecar. */
function Afluente() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-neutro-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BACKDROP}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ WebkitMaskImage: TOP_FADE, maskImage: TOP_FADE }}
      />
      {/* Véu de legibilidade: os blobs magenta do gradiente chegam perto de #A0508F,
          escuro demais pra texto ink sem isso. Firme onde o editorial pousa. */}
      <div className="absolute inset-0" style={{ background: LEGIBILITY_VEIL }} />
    </div>
  );
}

/** Ledger de números — valor à esquerda, label à direita, 4 linhas distribuídas. */
function Stats() {
  return (
    <div className="flex flex-col divide-y divide-neutro-800/15">
      {STATS.map((s, i) => (
        <div
          key={i}
          data-reveal
          className="flex items-baseline justify-between gap-6 py-4 first:pt-0 last:pb-0"
        >
          <span className="font-title text-[clamp(2.25rem,3.4vw,3rem)] font-medium leading-none tabular-nums text-neutro-800">
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
          <span className="font-body text-body text-neutro-700">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Bloco editorial: eyebrow + headline + bio + assinatura à esquerda, ledger à direita. */
function Editorial() {
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-x-16 gap-y-12 px-6 md:grid-cols-[1.25fr_0.9fr] md:px-10 lg:px-16">
      <div>
        <div data-reveal className="mb-6">
          <Badge tone="light">Quem construiu</Badge>
        </div>
        <h2
          data-reveal
          className="text-balance font-title text-h3 font-medium leading-[1.1] text-neutro-800 md:text-h2"
        >
          Feita por quem atende{" "}
          <span className="italic text-roxo-600">de verdade.</span>
        </h2>
        <p data-reveal className="mt-6 max-w-xl font-body text-body text-neutro-700">
          {BIO}
        </p>
        <div data-reveal className="mt-7 flex items-center gap-4">
          <div className="h-11 w-11 shrink-0 rounded-full bg-lavanda ring-1 ring-neutro-800/10" />
          <div>
            <p className="font-title text-body-l font-medium leading-tight text-neutro-800">
              Roberta Carbonari
            </p>
            <p className="mt-0.5 font-body text-small text-neutro-700">
              Nutricionista (CRN3 54892) · fundadora da Gaia
            </p>
          </div>
        </div>
      </div>

      <Stats />
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
  const wordL = useRef<HTMLSpanElement>(null);
  const wordR = useRef<HTMLSpanElement>(null);
  const editorial = useRef<HTMLDivElement>(null);

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

      // O box do retrato cresce de um card-retrato (260x320, foto inteira) até o
      // banner full-width/40vh. A imagem é object-cover DENTRO do box, então em
      // p=0 vê-se a Roberta enquadrada (não um zoom), e em p=1 vira o banner.
      // p: 0 = card pequeno · 1 = banner cheio.
      const WC0 = 260; // largura do card inicial
      const HC0 = 320; // altura do card inicial
      const state = { p: 0 };

      const applyP = (p: number) => {
        const el = portrait.current;
        if (!el) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const bannerH = vh * BANNER_VH;
        const w = WC0 + p * (vw - WC0);
        const h = HC0 + p * (bannerH - HC0);
        // centrado na horizontal; sobe do centro da tela (p=0) pro topo (p=1)
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        el.style.left = `${(vw - w) / 2}px`;
        el.style.top = `${(1 - p) * (vh - h) / 2}px`;
        el.style.borderRadius = `${(1 - p) * 26}px`;
        el.style.filter =
          p < 1 ? `drop-shadow(0 22px 45px rgba(58,72,94,${0.18 * (1 - p)}))` : "none";
      };

      gsap.set(editorial.current, { autoAlpha: 0, y: 44 });
      gsap.set([wordL.current, wordR.current], { autoAlpha: 1, x: 0, yPercent: -50 });
      gsap.set("[data-word-inner]", { filter: "blur(0px)" });
      applyP(0);

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
    },
    { scope: root, dependencies: [mode] },
  );

  return (
    <section ref={root} id="a-roberta" className="relative overflow-hidden bg-neutro-50">
      {mode === "pinned" ? (
        <div ref={pin} className="relative h-screen overflow-hidden">
          <Afluente />

          {/* palavras da headline gigante, flanqueando o centro (inner = mask reveal) */}
          <span
            ref={wordL}
            className="absolute top-1/2 z-30 whitespace-nowrap"
            style={{ right: "calc(50% + 155px)" }}
          >
            <span
              data-word-inner
              className="inline-block font-title text-[clamp(2.5rem,5.5vw,5.25rem)] font-medium leading-none text-neutro-800/90"
            >
              QUEM
            </span>
          </span>
          <span
            ref={wordR}
            className="absolute top-1/2 z-30 whitespace-nowrap"
            style={{ left: "calc(50% + 155px)" }}
          >
            <span
              data-word-inner
              className="inline-block font-title text-[clamp(2.5rem,5.5vw,5.25rem)] font-medium leading-none text-neutro-800/90"
            >
              CONSTRUIU?
            </span>
          </span>

          {/* retrato — card-retrato que cresce até o banner full-width/40vh */}
          <div
            ref={portrait}
            className="absolute z-20 overflow-hidden will-change-[width,height,top,left,filter]"
          >
            <Portrait />
          </div>

          {/* editorial — ocupa os 60vh de baixo */}
          <div
            ref={editorial}
            className="absolute inset-x-0 bottom-0 z-10 flex items-center"
            style={{ top: `${BANNER_VH * 100}vh` }}
          >
            <Editorial />
          </div>
        </div>
      ) : (
        // Fallback estático — mobile / prefers-reduced-motion
        <div className="relative overflow-hidden py-16">
          <Afluente />
          <div className="relative z-10 mx-auto mb-12 w-full max-w-6xl px-6 md:px-10">
            <div className="relative h-[42vh] max-h-[420px] w-full overflow-hidden rounded-card shadow-soft-lg">
              <Portrait />
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

"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Badge } from "@/components/ui/Badge";
import { IconClock } from "@/components/ui/icons";
import { Panel1, Panel2, Panel3 } from "./ComoComecarPanels";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { n: "01", tab: "Traga seus pacientes", Panel: Panel1 },
  { n: "02", tab: "Envie a anamnese", Panel: Panel2 },
  { n: "03", tab: "Receba pronta", Panel: Panel3 },
] as const;

const GAP = 0; // banners colados — sem gap (tira contínua)

// carrossel circular: último banner peeka antes do primeiro, e o primeiro depois do último
const RENDER = [STEPS.length - 1, ...STEPS.map((_, i) => i), 0];
const DWELL = 0.24; // fração do scroll parado (centralizado) por passo
const SLIDE = 0.14; // fração deslizando entre passos
// DWELL*3 + SLIDE*2 = 1.0

/**
 * Mapeia o progresso do pin (0..1) para:
 *  - cont: posição contínua do track (0..N-1)
 *  - centered: índice do banner centralizado (mostra conteúdo) ou -1 (deslizando)
 *  - highlight: índice pro estado das abas (fica no último passo durante o slide)
 */
function mapScroll(p: number) {
  const seq: Array<["dwell" | "slide", number, number, number]> = [];
  let acc = 0;
  for (let i = 0; i < STEPS.length; i++) {
    seq.push(["dwell", acc, acc + DWELL, i]);
    acc += DWELL;
    if (i < STEPS.length - 1) {
      seq.push(["slide", acc, acc + SLIDE, i]);
      acc += SLIDE;
    }
  }
  for (const [type, a, b, idx] of seq) {
    if (p <= b + 1e-6) {
      if (type === "dwell") return { cont: idx, centered: idx, highlight: idx };
      const t = (p - a) / (b - a);
      return { cont: idx + t, centered: -1, highlight: idx };
    }
  }
  return { cont: STEPS.length - 1, centered: STEPS.length - 1, highlight: STEPS.length - 1 };
}

/** progresso-alvo pra centralizar o passo i (meio do dwell) — usado no clique da aba */
function dwellCenter(i: number) {
  return i * (DWELL + SLIDE) + DWELL / 2;
}

export default function ComoComecar() {
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const metrics = useRef({ w: 0 });

  const [mode, setMode] = useState<"pinned" | "stacked">("stacked");
  const [active, setActive] = useState(0); // banner centralizado (-1 = deslizando)
  const [highlight, setHighlight] = useState(0); // estado das abas

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () =>
      setMode(wide.matches && !reduce.matches ? "pinned" : "stacked");
    decide();
    wide.addEventListener("change", decide);
    reduce.addEventListener("change", decide);
    return () => {
      wide.removeEventListener("change", decide);
      reduce.removeEventListener("change", decide);
    };
  }, []);

  const layout = () => {
    const first = track.current?.querySelector<HTMLElement>("[data-panel]") ?? undefined;
    if (!first || !track.current) return;
    const w = first.offsetWidth;
    metrics.current.w = w;
    track.current.style.paddingLeft =
      Math.max(24, (window.innerWidth - w) / 2) + "px";
  };

  const applyTranslate = (cont: number) => {
    if (!track.current) return;
    // +1: há um clone (último) prepended, então o passo `cont` vive em RENDER[cont+1]
    track.current.style.transform = `translate3d(${-(cont + 1) * (metrics.current.w + GAP)}px,0,0)`;
  };

  useGSAP(
    () => {
      gsap.from("[data-reveal]", {
        y: 28,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
      });

      if (mode === "pinned") {
        layout();
        applyTranslate(0);

        st.current = ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * 3,
          pin: pin.current,
          pinSpacing: true,
          onRefresh: (self) => {
            layout();
            applyTranslate(mapScroll(self.progress).cont);
          },
          onUpdate: (self) => {
            const m = mapScroll(self.progress);
            applyTranslate(m.cont);
            setActive((p) => (p === m.centered ? p : m.centered));
            setHighlight((p) => (p === m.highlight ? p : m.highlight));
          },
        });
        ScrollTrigger.refresh();
      } else {
        gsap.utils.toArray<HTMLElement>("[data-panel]").forEach((el) => {
          gsap.from(el, {
            y: 40,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 82%", once: true },
          });
        });
      }
    },
    { scope: root, dependencies: [mode] },
  );

  const goTo = (i: number) => {
    if (mode !== "pinned" || !st.current) return;
    const s = st.current;
    window.scrollTo({
      top: s.start + dwellCenter(i) * (s.end - s.start),
      behavior: "smooth",
    });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== "pinned" || !track.current) return;
    const r = e.currentTarget.getBoundingClientRect(); // container visível, não o track largo
    track.current.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    track.current.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };

  const Header = (
    <div data-reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center text-center md:mb-12">
      <Badge icon={<IconClock className="h-3.5 w-3.5" />} className="mb-5">
        Comece em minutos
      </Badge>
      <h2 className="text-balance font-title text-h2 font-medium text-neutro-800 md:text-h1">
        Três passos até sua primeira anamnese.
      </h2>
    </div>
  );

  const Tabs = (
    <div data-reveal className="mb-7 grid grid-cols-3 gap-x-6">
      {STEPS.map((step, i) => {
        const isActive = i === highlight;
        const fill = i <= highlight ? 1 : 0;
        return (
          <button
            key={step.n}
            onClick={() => goTo(i)}
            className="group relative pb-3 text-left outline-none"
            aria-current={isActive}
          >
            <div className="flex items-baseline gap-3">
              <span className={`font-title text-h3 font-semibold tabular-nums transition-colors duration-300 ${isActive ? "text-brand" : "text-neutro-400"}`}>
                {step.n}
              </span>
              <span className={`font-body text-body-l font-medium transition-colors duration-300 ${isActive ? "text-neutro-800" : "text-neutro-500"}`}>
                {step.tab}
              </span>
            </div>
            <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-neutro-200" />
            <span
              className="absolute inset-x-0 bottom-0 h-[2px] origin-left rounded-full bg-gradient-to-r from-azul-400 via-brand to-brand-600 transition-transform duration-500 ease-gaia"
              style={{ transform: `scaleX(${fill})` }}
            />
          </button>
        );
      })}
    </div>
  );

  const Banner = (i: number, isActive: boolean, key: string) => {
    const { Panel } = STEPS[i];
    return (
      <div
        key={key}
        data-panel
        className={
          mode === "pinned"
            ? "relative h-full w-[74vw] max-w-[1200px] shrink-0 overflow-hidden bg-neutro-0"
            : "relative h-[78vh] w-full overflow-hidden rounded-card border border-neutro-200/70 bg-neutro-0 shadow-soft-lg"
        }
      >
        <Panel active={mode === "pinned" ? isActive : true} reduced={mode === "stacked"} />
      </div>
    );
  };

  return (
    <section ref={root} id="como-comecar" className="relative overflow-hidden bg-neutro-50">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-afluente opacity-40 blur-3xl"
      />

      {mode === "pinned" ? (
        <div ref={pin} className="relative flex min-h-screen flex-col justify-start pt-14 pb-16">
          <div className="mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
            {Header}
            {Tabs}
          </div>
          {/* container clip: full-bleed, respiro no bottom (pb no pin), sem cantos arredondados */}
          <div
            onPointerMove={onPointerMove}
            className="relative mt-2 min-h-0 flex-1 overflow-hidden bg-neutro-0"
          >
            <div
              ref={track}
              style={{ ["--px" as string]: "0", ["--py" as string]: "0" }}
              className="flex h-full will-change-transform"
            >
              {RENDER.map((idx, pos) =>
                Banner(idx, active >= 0 && pos === active + 1, `r-${pos}`),
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-6xl px-6 py-20 md:px-10">
          {Header}
          <div className="mt-8 flex flex-col gap-5">
            {STEPS.map((_, i) => Banner(i, true, STEPS[i].n))}
          </div>
        </div>
      )}
    </section>
  );
}

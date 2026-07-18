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
import { getLenis } from "@/lib/lenis";
import { Panel1, Panel2, Panel3 } from "./ComoComecarPanels";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { n: "01", tab: "Grave", Panel: Panel1 },
  { n: "02", tab: "Acompanhe", Panel: Panel2 },
  { n: "03", tab: "Revise", Panel: Panel3 },
] as const;

const GAP = 0; // banners colados — sem gap (tira contínua)
const PARALLAX_MAX = 15; // % do deslize contra-motivo da foto dentro do frame (img 150%)
const PARALLAX_SPAN = 0.8; // fração da viewport pra saturar o drift (menor = efeito aparece mais)

// tira fechada: sem clones nas pontas — primeiro e último card não peekam vizinho
const RENDER = STEPS.map((_, i) => i);

// Pan contínuo (sem plateau/dwell). A tira acompanha o scroll o tempo todo —
// só DESACELERA perto de cada passo (dá tempo de ler) e nunca congela, então
// não existe o stop→go que causava trava/bounce ao trocar de banner.
// EASE_K mistura linear↔smoothstep: 0 = pan linear puro, 1 = congela nos steps.
const EASE_K = 0.62;
const FOCUS = 0.3; // |cont - step| < FOCUS → overlay visível (zona lenta do passo)

/**
 * Mapeia o progresso do pin (0..1) para:
 *  - cont: posição contínua do track (0..N-1) — staircase suave, velocidade > 0
 *  - centered: índice do banner na zona lenta (mostra conteúdo) ou -1
 *  - highlight: índice do passo mais próximo (estado das abas)
 */
function mapScroll(p: number) {
  const last = STEPS.length - 1;
  const u = Math.max(0, Math.min(last, p * last)); // 0..N-1 linear
  const i = Math.min(last - 1, Math.floor(u)); // segmento atual
  const t = u - i; // 0..1 dentro do segmento
  const s = t * t * (3 - 2 * t); // smoothstep
  const cont = i + EASE_K * s + (1 - EASE_K) * t; // desacelera nos steps, sem parar
  const nearest = Math.round(cont);
  const centered = Math.abs(cont - nearest) < FOCUS ? nearest : -1;
  return { cont, centered, highlight: Math.max(0, Math.min(last, nearest)) };
}

/** progresso do pin que centraliza o passo i — usado no clique da aba */
function stepProgress(i: number) {
  return STEPS.length > 1 ? i / (STEPS.length - 1) : 0;
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
    // sem padding de centragem: as pontas ancoram nas bordas (ver trackX)
    track.current.style.paddingLeft = "0px";
  };

  /** Posição X da tira p/ um `cont` contínuo. Fórmula com pontas ancoradas:
      passo 0 na borda esquerda, passo N-1 na direita, meio centralizado. Com
      banner full-bleed (w = viewport) isso vira um slide puro (-cont·w), sem
      branco em canto nenhum e todos do mesmo tamanho. Linear em cont — o easing
      já vem embutido no próprio `cont` (mapScroll). */
  const trackX = (cont: number) => {
    const w = metrics.current.w + GAP;
    const last = STEPS.length - 1;
    if (last <= 0) return 0;
    return cont * ((window.innerWidth - w) / last - w);
  };

  const applyTranslate = (cont: number) => {
    if (!track.current) return;
    track.current.style.transform = `translate3d(${trackX(cont)}px,0,0)`;
  };

  /** Reveal por passo: conforme o scroll traz `cont` pra dentro da zona lenta de
      um banner (dist < FOCUS), o `--reveal` daquele painel sobe 0→1 com smoothstep.
      É esse número que os cards de UI consomem pra montar o conteúdo em stagger
      (waveform sobe, checklist marca, SOAP digita) — a animação ACONTECE conforme
      o scroll, não em loop cego. Fora da zona (durante o pan) volta a 0: o conteúdo
      se desmonta, coerente com o Overlay/Float que também somem por `active`. */
  const applyReveal = (cont: number) => {
    if (!track.current) return;
    track.current
      .querySelectorAll<HTMLElement>("[data-panel]")
      .forEach((el, pos) => {
        const dist = Math.abs(cont - pos);
        // FOCUS*0.6 no denominador → chega a 1 um pouco antes do centro e faz
        // platô na zona do passo (não pisca ao cruzar o ponto exato)
        const p = Math.max(0, Math.min(1, (FOCUS - dist) / (FOCUS * 0.6)));
        const r = p * p * (3 - 2 * p);
        el.style.setProperty("--reveal", r.toFixed(3));
      });
  };

  /** Parallax de galeria: cada foto contra-desliza em proporção à posição REAL
      do seu frame na viewport — mesmo `cont` eased do pan, então o parallax é
      coerente com o movimento do banner: o drift se concentra nas transições
      (onde mais aparece) e zera exatamente no centro de cada passo. Como o pan é
      contínuo, a foto nunca congela. Sem reflow. `offset` espelha o applyTranslate
      (tira sem clones): o frame de RENDER[pos] fica centralizado quando pos === cont. */
  const applyParallax = (cont: number) => {
    if (!track.current) return;
    const w = metrics.current.w + GAP;
    const W = window.innerWidth;
    const T = trackX(cont); // mesma geometria ancorada do pan
    const span = W * PARALLAX_SPAN; // menor = drift satura antes → aparece mais
    track.current
      .querySelectorAll<HTMLElement>("[data-parallax]")
      .forEach((img, pos) => {
        const center = T + pos * w + w / 2; // centro do frame na viewport
        const offset = center - W / 2; // px do centro do frame ao centro da viewport
        const t = Math.max(-1, Math.min(1, offset / span)); // -1..1
        img.style.setProperty("--parallax", (-t * PARALLAX_MAX).toFixed(2) + "%");
      });
  };

  useGSAP(
    () => {
      /* reduce: sem reveal de entrada — o modo já cai pra stacked (ver o
         decide() acima), mas os gsap.from daqui rodavam mesmo assim, animando
         translate+opacity justamente pra quem pediu menos movimento. Sem os
         tweens, tudo nasce no estado autoral (visível, parado). */
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!reduce) {
        gsap.from("[data-reveal]", {
          y: 28,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
        });
      }

      if (mode === "pinned") {
        layout();
        applyTranslate(0);
        applyParallax(0);
        applyReveal(0);

        st.current = ScrollTrigger.create({
          // fixa quando o topo do pin (as abas) encosta no topo da viewport —
          // o título rolou pra fora antes disso
          trigger: pin.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * 3,
          pin: pin.current,
          pinSpacing: true,
          // Ordem de refresh: este pin injeta ~3x100vh de pinSpacing, e tudo que
          // vem depois (ARoberta, Manifesto) precisa ser medido DEPOIS dele, ou
          // mede a página sem esse espaço e cai centenas de px pra cima. O GSAP
          // só ordena os triggers se algum declarar refreshPriority
          // (ScrollTrigger.js: `_sort && ScrollTrigger.sort()`), então a ordem
          // decresce na ordem do documento: aqui 2 → ARoberta 1 → resto 0.
          refreshPriority: 2,
          // Sem `snap`: o snap do ScrollTrigger seta o scroll direto e briga com
          // o Lenis (smooth scroll global) — era isso que travava ao chegar num
          // step. Os dwells largos + slide com easing já param a foto em cada
          // passo de forma contínua. Ancoragem exata fica pro clique da aba.
          onRefresh: (self) => {
            layout();
            const cont = mapScroll(self.progress).cont;
            applyTranslate(cont);
            applyParallax(cont);
            applyReveal(cont);
          },
          onUpdate: (self) => {
            const m = mapScroll(self.progress);
            applyTranslate(m.cont);
            applyParallax(m.cont);
            applyReveal(m.cont);
            setActive((p) => (p === m.centered ? p : m.centered));
            setHighlight((p) => (p === m.highlight ? p : m.highlight));
          },
        });
        ScrollTrigger.refresh();
      } else if (!reduce) {
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
    const top = s.start + stepProgress(i) * (s.end - s.start);
    const lenis = getLenis();
    // Lenis desliga o scroll-behavior nativo → usa o próprio scrollTo pra rolar
    // suave até o centro do step; fallback nativo se o Lenis não estiver ativo
    // (ex.: prefers-reduced-motion).
    if (lenis) lenis.scrollTo(top, { duration: 1.1 });
    else window.scrollTo({ top, behavior: "smooth" });
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
        Como funciona
      </Badge>
      <h2 className="text-balance font-title text-h2 font-medium text-neutro-800 md:text-h1">
        Da gravação ao prontuário, em três passos.
      </h2>
    </div>
  );

  const Tabs = (
    <div data-reveal className="mb-0 grid grid-cols-3 gap-x-6">
      {STEPS.map((step, i) => {
        const isActive = i === highlight;
        const fill = i <= highlight ? 1 : 0;
        return (
          <button
            key={step.n}
            onClick={() => goTo(i)}
            /* active:scale + transition-transform: o press háptico dos CTAs,
               aqui nos únicos controles da seção. focus-visible:ring em branco
               (não brand): as abas vivem sobre foto escura e o roxo some nela.
               O outline-none sozinho matava o foco de teclado sem substituto. */
            className="group pointer-events-auto relative rounded-md pb-3 text-left outline-none transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white/70"
            aria-current={isActive}
          >
            <div className="flex items-baseline gap-3">
              {/* duration-500 ease-gaia — casada com o underline logo abaixo:
                  cor e preenchimento são o MESMO evento (o passo ativou) e
                  descasados em 300/500 liam como dois. group-hover no estado
                  inativo: a aba é clicável e nada dizia isso ao cursor. */}
              <span className={`font-title text-h3 font-semibold tabular-nums drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] transition-colors duration-500 ease-gaia ${isActive ? "text-brand" : "text-white/45 group-hover:text-white/70"}`}>
                {step.n}
              </span>
              <span className={`font-body text-body-l font-medium drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] transition-colors duration-500 ease-gaia ${isActive ? "text-white" : "text-white/55 group-hover:text-white/80"}`}>
                {step.tab}
              </span>
            </div>
            <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-white/25" />
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
            ? "relative h-full w-screen shrink-0 overflow-hidden bg-neutro-0"
            : "relative w-full overflow-hidden rounded-card border border-neutro-200/70 bg-neutro-0 shadow-soft-lg"
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
        <>
          {/* Título rola normalmente e sai por cima — o pin começa só nas abas */}
          <div className="mx-auto w-full max-w-6xl px-6 pt-20 md:px-10 lg:px-16">
            {Header}
          </div>
          <div ref={pin} className="relative h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/65 via-black/30 to-transparent" />
            <div className="relative w-full px-7 pb-7 md:px-16 lg:px-20">{Tabs}</div>
          </div>
          <div
            onPointerMove={onPointerMove}
            className="relative h-full w-full overflow-hidden bg-neutro-0"
          >
            <div
              ref={track}
              style={{ ["--px" as string]: "0", ["--py" as string]: "0" }}
              className="flex h-full will-change-transform"
            >
              {RENDER.map((idx, pos) =>
                Banner(idx, active >= 0 && pos === active, `r-${pos}`),
              )}
            </div>
          </div>
          </div>
        </>
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

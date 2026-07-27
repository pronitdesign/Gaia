"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "./Navbar";
import { GradientButton, OutlineButton, SectionBadge } from "./ui";

gsap.registerPlugin(ScrollTrigger);

const CANVAS_W = 1200;
const CANVAS_H = 978;

// As células nunca passam de ~340px de lado renderizado (medido: 342px no pior
// caso, mobile 3x). Os originais eram PNG de até 1200px/2,3MB — 41x a área
// necessária. Servem em WebP 512px, que cobre DPR 2 em telas até 2560.
const gridCells = [
  { x: -21, y: 83, w: 169, h: 169, img: "/figma/grid-6.webp" },
  { x: 364, y: 60, w: 133, h: 133, img: "/figma/grid-7.webp" },
  { x: 988, y: 93, w: 130, h: 129, img: "/figma/grid-5.webp" },
  { x: 708, y: 222, w: 113, h: 113, img: "/figma/grid-8.webp" },
  { x: 64, y: 548, w: 112, h: 112, img: "/figma/grid-1.webp" },
  { x: 1024, y: 478, w: 139, h: 139, img: "/figma/grid-4.webp" },
  { x: 176, y: 812, w: 128, h: 128, img: "/figma/grid-2.webp" },
  { x: 992, y: 797, w: 102, h: 102, img: "/figma/grid-3.webp" },
];

const SLOT = { x: 516, y: 643, w: 169, h: 169 };

const pct = (v: number, base: number) => `${(v / base) * 100}%`;

export default function HeroGrid() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const mediaOverlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  // A foto do slot só é VISTA em reduced-motion (fora dele a mídia da hero pousa
  // por cima). Com `motion-safe:hidden` o browser continuava baixando o arquivo
  // em todo carregamento — 3,7MB para pintar 0x0. Montar condicionalmente é o
  // único jeito de não pagar a banda: `hidden`/`display:none` não cancela o GET.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const root = rootRef.current!;
      const hero = heroRef.current!;
      const canvas = canvasRef.current!;
      const slot = slotRef.current!;
      const cells = root.querySelectorAll<HTMLElement>("[data-grid-cell]");

      // Medidas via offset* (imunes a transforms durante o refresh)
      const target = { x: 0, y: 0, w: 0, h: 0 };
      const measure = () => {
        target.x = canvas.offsetLeft + slot.offsetLeft;
        target.y = slot.offsetTop;
        target.w = slot.offsetWidth;
        target.h = slot.offsetHeight;
      };
      measure();
      const onRefreshInit = () => measure();
      ScrollTrigger.addEventListener("refreshInit", onRefreshInit);

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: () => "+=" + hero.offsetHeight,
          scrub: true,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // Este pin é o PRIMEIRO da página (topo) e injeta ~100vh de pinSpacing.
          // A ComoComecar logo abaixo usa refreshPriority 2 contando que nada com
          // pin acima dela seja medido DEPOIS dela — senão ela calcula o `start`
          // sem esse espaço e o pin dela nasce ~630px cedo (medido). Como a
          // prioridade DECRESCE na ordem do documento (ComoComecar 2 → ARoberta 1
          // → resto 0), o topo precisa ser o MAIOR: 3. Ver o comentário do pin em
          // components/sections/ComoComecar.tsx.
          refreshPriority: 3,
        },
      });

      // Texto da hero some primeiro
      tl.to(
        heroContentRef.current,
        { autoAlpha: 0, y: -40, scale: 0.96, duration: 0.18 },
        0
      );
      // Mídia encolhe até o slot do grid animando o box real:
      // o object-cover reenquadra a foto a cada frame, sem distorcer
      tl.to(
        mediaRef.current,
        {
          x: () => target.x,
          y: () => target.y,
          width: () => target.w,
          height: () => target.h,
          duration: 0.9,
        },
        0.1
      );
      // Bordas arredondam logo no início do scroll e assentam em 24px (raio das células)
      tl.to(mediaRef.current, { borderRadius: "48px", duration: 0.2 }, 0.1);
      tl.to(mediaRef.current, { borderRadius: "24px", duration: 0.25 }, 0.75);
      tl.to(mediaOverlayRef.current, { opacity: 0, duration: 0.3 }, 0.1);
      // Células e título aparecem conforme a revelação avança
      tl.from(
        cells,
        { autoAlpha: 0, y: 24, duration: 0.3, stagger: 0.05 },
        0.35
      );
      tl.from(headlineRef.current, { autoAlpha: 0, y: 32, duration: 0.4 }, 0.5);
      // Deriva lenta das células no trecho final do scroll, para dar profundidade
      tl.to(
        cells,
        {
          y: (i: number) => (i % 2 ? -20 : 20) * (1 + (i % 3) * 0.4),
          duration: 0.4,
          ease: "none",
        },
        1.0
      );

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {/* ===== HERO (overlay por cima do grid no desktop) ===== */}
      <section
        ref={heroRef}
        className="pointer-events-none relative z-20 h-svh min-h-[640px] motion-safe:absolute motion-safe:inset-x-0 motion-safe:top-0"
      >
        <div
          ref={mediaRef}
          className="absolute inset-0 overflow-hidden will-change-transform"
        >
          {/* O 2560 é DPR 2 numa tela de até 1280 CSS — e era o ÚNICO servido,
              então um notebook comum baixava 368KB pra pintar ~1350px. Com `w` +
              sizes o DPR decide: 1 pega 98KB, 2 segue nos 2560. Não é micro-
              otimização — esta imagem É o LCP, e 270KB a menos saem exatamente
              da janela de banda que ele disputa.
              1600 e não 1280: `sizes="100vw"` num viewport de 1350 pede 1350w, e
              o candidato de 1280 fica ABAIXO disso — o browser pularia direto
              pro 2560 e a variante não serviria pra nada (medido: a primeira
              tentativa, com 1280, baixou os 368KB de novo).
              fetchPriority alto porque o preload scanner classifica <img> como
              baixa até o layout provar o contrário; aqui já sabemos. */}
          <picture>
            <source
              media="(min-width: 1024px)"
              srcSet="/figma/hero-bg-1600.webp 1600w, /figma/hero-bg.webp 2560w"
              sizes="100vw"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/hero-bg-mobile.webp"
              alt="Nutricionista atendendo com a Gaia"
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover"
            />
          </picture>
          <div
            ref={mediaOverlayRef}
            className="absolute inset-0 bg-gradient-to-t from-k-ink from-[1%] to-transparent to-[37%]"
          />
        </div>

        <div className="pointer-events-auto">
          <Navbar />
        </div>

        <div
          ref={heroContentRef}
          className="pointer-events-auto absolute inset-x-0 bottom-16 z-20 mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-6 px-6 text-center lg:flex-row lg:items-end lg:gap-10 lg:px-12 lg:text-left"
        >
          <div className="flex max-w-[611px] flex-col items-center justify-center gap-4 lg:items-start">
            <SectionBadge tone="white">Workspace clínico para nutricionistas</SectionBadge>
            <h1 className="font-display text-[44px] leading-[0.9] tracking-[-0.03em] text-white sm:text-[56px] lg:text-[72px] lg:tracking-[-2.16px]">
              Volte a olhar <br className="lg:hidden" />
              pro seu paciente
            </h1>
          </div>
          <div className="flex max-w-[407px] flex-col items-center gap-4 lg:items-start">
            <p className="text-[18px] leading-[1.5] text-white lg:text-[20px]">
              A Gaia escuta a consulta e monta o prontuário. Plano, exames e agenda vivem no
              mesmo lugar.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <GradientButton>Começar grátis</GradientButton>
              <OutlineButton>Saiba Mais</OutlineButton>
            </div>
          </div>
        </div>
      </section>

      {/* ===== GRID ASSIMÉTRICO (já posicionado por baixo da hero) ===== */}
      <section
        id="como-funciona"
        className="relative z-10 overflow-hidden bg-k-ink motion-safe:h-svh"
      >
        <div
          ref={canvasRef}
          className="relative aspect-[1200/978] w-full overflow-hidden motion-safe:absolute motion-safe:inset-0 motion-safe:aspect-auto"
        >
          <div className="absolute inset-0">
            <picture>
              <source media="(min-width: 1024px)" srcSet="/figma/grid-bg.webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                src="/figma/grid-bg-mobile.webp"
                alt=""
                className="size-full object-cover"
              />
            </picture>
          </div>

          <h2
            ref={headlineRef}
            className="absolute left-1/2 w-[61%] -translate-x-1/2 text-center font-display leading-[1.2] tracking-[-0.03em] text-white"
            style={{ top: pct(412, CANVAS_H), fontSize: "clamp(28px, 5.33vw, 85px)" }}
          >
            Nutrição é sobre pessoas. e a Gaia entende isso
          </h2>

          {gridCells.map((cell) => (
            <div
              key={cell.img}
              data-grid-cell
              className="absolute aspect-square overflow-hidden rounded-[24px]"
              style={{
                left: pct(cell.x, CANVAS_W),
                top: pct(cell.y, CANVAS_H),
                height: pct(cell.h, CANVAS_H),
              }}
            >
              {/* lazy porque o React promove TODA <img> do SSR a
                  <link rel="preload">: as 8 células (263KB) saíam na frente do
                  JS e da intro, e nenhuma delas é vista antes do usuário rolar.
                  Medido em 3G: preload delas custava ~1,3s no início da intro.
                  O hero-bg logo acima NÃO leva lazy — aquele é o LCP. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                src={cell.img}
                alt=""
                className="size-full object-cover"
              />
            </div>
          ))}

          {/* Slot onde a mídia da hero pousa */}
          <div
            ref={slotRef}
            className="absolute aspect-square"
            style={{
              left: pct(SLOT.x, CANVAS_W),
              top: pct(SLOT.y, CANVAS_H),
              height: pct(SLOT.h, CANVAS_H),
            }}
          >
            {/* Visível quando a transição está desativada (reduced motion) */}
            {reducedMotion && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src="/figma/grid-center.webp"
                alt=""
                className="size-full rounded-[24px] object-cover"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

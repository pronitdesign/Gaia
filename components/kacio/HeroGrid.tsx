"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "./Navbar";
import { GradientButton, OutlineButton, SectionBadge } from "./ui";

gsap.registerPlugin(ScrollTrigger);

const CANVAS_W = 1200;
const CANVAS_H = 978;

const gridCells = [
  { x: -21, y: 83, w: 169, h: 169, img: "/figma/grid-6.png" },
  { x: 364, y: 60, w: 133, h: 133, img: "/figma/grid-7.png" },
  { x: 988, y: 93, w: 130, h: 129, img: "/figma/grid-5.png" },
  { x: 708, y: 222, w: 113, h: 113, img: "/figma/grid-8.png" },
  { x: 64, y: 548, w: 112, h: 112, img: "/figma/grid-1.png" },
  { x: 1024, y: 478, w: 139, h: 139, img: "/figma/grid-4.png" },
  { x: 176, y: 812, w: 128, h: 128, img: "/figma/grid-2.png" },
  { x: 992, y: 797, w: 102, h: 102, img: "/figma/grid-3.png" },
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
          <picture>
            <source media="(min-width: 1024px)" srcSet="/figma/hero-bg.png" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/hero-bg-mobile.webp"
              alt="Nutricionista atendendo com a Gaia"
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma/grid-bg.png" alt="" className="size-full object-cover" />
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cell.img} alt="" className="size-full object-cover" />
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/grid-center.png"
              alt=""
              className="size-full rounded-[24px] object-cover motion-safe:hidden"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

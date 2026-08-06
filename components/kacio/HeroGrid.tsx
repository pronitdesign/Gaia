"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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

  /* PRÉ-DECODE na banda ociosa da intro — medido no vídeo do aparelho da
     Pronit (2026-08-02): as células do grid e o grid-bg são lazy e aterrissavam
     TODAS no meio do primeiro gesto de scroll (freeze de ~600ms com flash
     branco, duas vezes, dentro da transição hero→grid). A intro tem ~6s de
     banda e thread ociosas de propósito; é ali que esse decode cabe inteiro.
     `loading` vira eager via JS (só depois do intro-done, então não disputa
     com o LCP) e o decode() tira o raster do caminho do gesto. Falha de
     decode() é ignorada: é otimização, o lazy original segue de rede. */
  useEffect(() => {
    const aquecer = () => {
      for (const img of rootRef.current?.querySelectorAll<HTMLImageElement>("img[loading=lazy]") ?? []) {
        img.loading = "eager";
        img.decode().catch(() => {});
      }
    };
    if (document.documentElement.dataset.introDone === "1") {
      aquecer();
      return;
    }
    window.addEventListener("gaia:intro-done", aquecer, { once: true });
    return () => window.removeEventListener("gaia:intro-done", aquecer);
  }, []);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const root = rootRef.current!;
      const hero = heroRef.current!;
      const canvas = canvasRef.current!;
      const slot = slotRef.current!;
      const media = mediaRef.current!;
      const foto = media.querySelector("img")!;
      const cells = root.querySelectorAll<HTMLElement>("[data-grid-cell]");

      // Medidas via offset* (imunes a transforms durante o refresh)
      const target = { x: 0, y: 0, w: 0, h: 0, W0: 1, H0: 1, iw: 563, ih: 1218 };
      const measure = () => {
        target.x = canvas.offsetLeft + slot.offsetLeft;
        target.y = slot.offsetTop;
        target.w = slot.offsetWidth;
        target.h = slot.offsetHeight;
        target.W0 = hero.offsetWidth || 1;
        target.H0 = hero.offsetHeight || 1;
        // O aspecto da foto muda com o breakpoint (o <picture> troca a fonte);
        // 0 enquanto não decodificou → mantém o chute anterior.
        if (foto.naturalWidth) {
          target.iw = foto.naturalWidth;
          target.ih = foto.naturalHeight;
        }
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
      /* Mídia encolhe até o slot SEM TOCAR EM LAYOUT — reescrito em 2026-08-02.
         A versão anterior animava width/height do box real e deixava o
         object-cover reenquadrar por frame: cada frame era layout + repaint de
         uma imagem full-viewport, e no vídeo do aparelho da Pronit o PRIMEIRO
         gesto de scroll congelava ~600ms duas vezes exatamente nesta
         transição (o rig de celular já tinha marcado 743ms/1567ms nas faixas
         deste pin). Agora é o FLIP clássico com cover emulado:

         · o CONTAINER (W0×H0 de layout, imutável) leva translate+scale(sx,sy);
         · a FOTO, com base no tamanho NATURAL (objectFit:fill, origem 0 0),
           leva a contra-escala (cover/sx, cover/sy) + o offset de centragem —
           que é exatamente a conta do object-cover num box w(t)×h(t), então o
           enquadramento por frame é IDÊNTICO ao de antes, pixel a pixel;
         · o raio vira clip-path inset(round rx/ry) com os raios divididos por
           eixo pela escala — círculo visual perfeito sob escala anisotrópica,
           aplicado no compositor.

         Nenhuma dessas três escritas dispara layout; o pin rola no compositor.
         O estado estático pré-JS continua sendo o CSS original (inset-0 +
         object-cover): o gsap.set abaixo só assume quando este bloco roda, e o
         mm.revert() devolve tudo. */
      // origem 0 0 nos DOIS: toda a conta do FLIP assume escala a partir do
      // topo-esquerdo (o padrão do GSAP é 50% 50%, que desloca o box).
      gsap.set(media, { transformOrigin: "0 0" });
      gsap.set(foto, {
        position: "absolute",
        left: 0,
        top: 0,
        width: () => target.iw,
        height: () => target.ih,
        // o preflight do Tailwind põe `img { max-width: 100% }`, que capa a
        // largura ACIMA do style inline — sem este none a base de 563px
        // virava 390 e a foto cobria só ~70% do hero (pego na paridade).
        maxWidth: "none",
        objectFit: "fill",
        transformOrigin: "0 0",
        willChange: "transform",
      });
      // Se o natural size chegar depois (foto ainda decodificando no mount),
      // re-mede e reaplica base + frame — senão a base fica no chute de 563.
      const onFotoLoad = () => {
        measure();
        gsap.set(foto, { width: target.iw, height: target.ih });
        aplicar();
      };
      foto.addEventListener("load", onFotoLoad);

      const flip = { p: 0 };
      const aplicar = () => {
        const { x, y, w, h, W0, H0, iw, ih } = target;
        const p = flip.p;
        const wV = W0 + (w - W0) * p; // box visual no tempo p (interp linear,
        const hV = H0 + (h - H0) * p; // o mesmo ease:none do tween antigo)
        const sx = wV / W0;
        const sy = hV / H0;
        gsap.set(media, { x: x * p, y: y * p, scaleX: sx, scaleY: sy });
        const cover = Math.max(wV / iw, hV / ih);
        const ox = (wV - iw * cover) / 2;
        const oy = (hV - ih * cover) / 2;
        gsap.set(foto, {
          x: ox / sx,
          y: oy / sy,
          scaleX: cover / sx,
          scaleY: cover / sy,
        });
        // raio: 0→48 em p 0–0.222, platô 48, 48→24 em p 0.722–1 — a mesma
        // curva dos dois tweens de borderRadius que moravam aqui. Escrito como
        // border-radius com barra (rx/ry compensados por eixo da escala):
        // clip-path inset(round rx/ry) seria o ideal teórico, mas o Chrome
        // REJEITA a barra dentro do inset (medido: o computed ficava
        // "inset(0px)" e os cantos saíam retos). border-radius elíptico é
        // suportado em todo lugar, e como o conteúdo (a foto) é camada
        // composta própria, o raio vira máscara de composição — não re-raster.
        const r =
          p < 0.222 ? (48 * p) / 0.222 : p < 0.722 ? 48 : 48 - 24 * ((p - 0.722) / 0.278);
        media.style.borderRadius = `${(r / sx).toFixed(2)}px / ${(r / sy).toFixed(2)}px`;
      };
      aplicar();
      tl.to(flip, { p: 1, duration: 0.9, onUpdate: aplicar }, 0.1);
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
        foto.removeEventListener("load", onFotoLoad);
        // o border-radius é escrito cru (string por frame); o revert do
        // matchMedia não sabe dele — limpar à mão.
        media.style.borderRadius = "";
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
            {/* No celular a MESMA foto sai pelo optimizer: o arquivo cru são
                176KB de WebP disputando o voo de rede do poster e do vídeo da
                intro; via /_next/image ela vira 33,7KB de AVIF (medido em
                produção — w=640 cobre, o original tem 563px de largura; se
                aparecer banding no gradiente, subir pra q=80). URL fixa e não
                getImageProps porque w=640/q=75 é um par verificado contra a
                allowlist do next.config — e é 1 arquivo, não um srcset.
                fetchPriority segue HIGH, divergindo da auditoria: o atributo é
                um só pro <picture> inteiro e no desktop (source acima) esta
                imagem É o LCP; a 34KB a contenção que o rebaixamento evitaria
                já não existe. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/_next/image?url=%2Ffigma%2Fhero-bg-mobile.webp&w=640&q=75"
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

        {/* A Navbar NÃO mora mais aqui — ver app/page.tsx.
            Desde 9c1fcbb o header é `fixed` no mobile (some ao descer, volta ao
            subir). Mas este <div ref={rootRef}> é o elemento PINADO pelo
            ScrollTrigger, e o GSAP escreve `transform` nele — mesmo a matriz
            identidade cria containing block, e `position: fixed` passa a
            resolver contra ESTA caixa em vez da viewport. MEDIDO no rig de
            celular: o header saía com a página (top=-736 em y=1500, top=-11236
            em y=12000) e nunca voltava. A feature não funcionava, e o
            backdrop-blur-xl seguia declarado num elemento fora de quadro.
            Subir a Navbar pra fora do pin é o que devolve o `fixed` real. */}
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
              {/* 512 era o tamanho único e mira o pior caso (mobile 3x num
                  layout que não existe mais). No celular a célula rende ~58px
                  CSS: mesmo em DPR 2.625 pede ~152px, e as 8 juntas custavam
                  260KB de um cano de 1,6Mbps pra pintar 460KB de pixel útil.
                  Com o candidato de 256 elas fecham em 73KB somadas.
                  O `sizes` é em px fixo no desktop de propósito: lá a célula é
                  fração da ALTURA (17vh), e `sizes` não fala vh — 180px é essa
                  altura medida a 940px de viewport, que em DPR 2 ainda escolhe
                  a 512. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                src={cell.img}
                srcSet={`${cell.img.replace(/\.webp$/, "-256.webp")} 256w, ${cell.img} 512w`}
                sizes="(min-width: 1024px) 180px, 15vw"
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

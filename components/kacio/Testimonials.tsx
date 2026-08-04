"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { GradientButton, OutlineButton, SectionBadge } from "./ui";

const testimonials = [
  {
    name: "Clara Pereira",
    handle: "@clarapereira.nutri",
    quote:
      "“A Gaia deixou minha alimentação muito mais simples. Consigo organizar minhas refeições, acompanhar minha evolução todo dia”",
    photo: "/figma/t1-photo.webp",
    avatar: "/figma/t1-avatar.webp",
  },
  {
    name: "Rafael Martins",
    handle: "@rafa.martins90",
    quote:
      "“O que mais gostei foi conseguir visualizar meu progresso e receber orientações de forma organizada todos os dias”",
    photo: "/figma/t2-photo.webp",
    avatar: "/figma/t2-photo.webp",
  },
  {
    name: "Camila Andrade",
    handle: "@camiandrade.saude",
    quote:
      "“A Gaia deixou minha alimentação muito mais simples. Consigo organizar minhas refeições, acompanhar minha evolução e entender melhor minhas escolhas sem sentir que estou seguindo uma dieta impossível.”",
    photo: "/figma/t4-photo.webp",
    avatar: "/figma/t4-avatar.webp",
  },
  {
    name: "Junior Ferreira",
    handle: "@marilopes.fit",
    quote:
      "“A experiência é muito leve e intuitiva. Consigo acompanhar meu plano alimentar, registrar minha rotina e encontrar as informações”",
    photo: "/figma/t3-photo.webp",
    avatar: "/figma/t3-avatar.webp",
  },
];

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Testimonials() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true }, [
    AutoScroll({
      // A esteira NÃO nasce andando: com playOnInit ela rodava rAF desde o
      // load, movendo um strip de 8 cards de foto que ninguém estava vendo —
      // medido por ablação no rig de celular, ~120MB do pico de memória da
      // página eram dela. Quem dá o play é o IntersectionObserver abaixo.
      playOnInit: false,
      speed: 0.5,
      startDelay: 0,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      stopOnFocusIn: false,
    }),
  ]);

  // Esteira só anda com a section na tela (com 100px de antecedência pra não
  // nascer parada no primeiro pixel visível). Fora da viewport ela PARA — o
  // visual é idêntico porque um loop infinito não tem "posição perdida".
  useEffect(() => {
    const el = sectionRef.current;
    const autoScroll = emblaApi?.plugins()?.autoScroll;
    if (!el || !autoScroll) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) autoScroll.play();
        else autoScroll.stop();
      },
      { rootMargin: "100px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [emblaApi]);

  // Pausa o ticker no hover de um card e retoma ao sair
  const toggleTicker = useCallback(
    (play: boolean) => {
      const autoScroll = emblaApi?.plugins()?.autoScroll;
      if (!autoScroll) return;
      if (play) autoScroll.play();
      else autoScroll.stop();
    },
    [emblaApi]
  );

  return (
    <section ref={sectionRef} id="depoimentos" className="relative overflow-hidden bg-[#fdf5ff]">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" src="/figma/testimonials-bg.webp" alt="" className="size-full object-cover" />
      </div>

      {/* Suaviza a emenda com a Pricing (que termina em creme): o topo do campo
          verde nasce velado no MESMO creme (neutro-50) e o sage sobe por baixo,
          dissolvendo a linha dura creme→verde da junção. Sem z-index de
          propósito — pela ordem do DOM fica ACIMA da imagem e ABAIXO do conteúdo
          (que vem depois). O fade morre antes dos cards. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-neutro-50 to-transparent"
      />

      <div className="relative flex w-full flex-col gap-10 py-20 lg:gap-16 lg:py-28">
        <m.div
          className="mx-auto flex w-full max-w-[1200px] flex-col items-start justify-between gap-4 px-6 lg:flex-row lg:items-end lg:gap-10 lg:px-12"
          initial={reduced ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: easeOut }}
        >
          <div className="flex max-w-[611px] flex-col items-start gap-4">
            <SectionBadge tone="purple">Quem já usa</SectionBadge>
            <h2 className="font-display text-[40px] leading-[0.9] tracking-[-0.03em] text-k-ink sm:text-[56px] lg:text-[72px] lg:tracking-[-2.16px]">
              Quem já atende com&nbsp;a&nbsp;Gaia.
            </h2>
          </div>
          <div className="flex max-w-[407px] flex-col items-start gap-4">
            <p className="text-[18px] leading-[1.5] text-k-ink/70 lg:text-[20px]">
              Feedbacks reais de nutricionistas que estão utilizando a GAIA no seu dia a dia.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <GradientButton>Começar grátis</GradientButton>
              <OutlineButton dark>Saiba Mais</OutlineButton>
            </div>
          </div>
        </m.div>

        <div>
          <div ref={emblaRef} className="w-full cursor-grab overflow-hidden active:cursor-grabbing">
            {/* Loop do embla exige container sem padding/gap e sem transform nos slides:
                o espaçamento vive no pl-4 de cada slide e o motion fica num wrapper interno */}
            <div className="flex touch-pan-y">
              {[...testimonials, ...testimonials].map((t, i) => (
                <div
                  key={`${t.name}-${i}`}
                  className="min-w-0 shrink-0 basis-[85%] pl-4 sm:basis-[465px]"
                >
                  <m.div
                    className="group rounded-[40px] bg-white p-1"
                    onMouseEnter={() => toggleTicker(false)}
                    onMouseLeave={() => toggleTicker(true)}
                    initial={reduced ? false : { opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, delay: (i % 4) * 0.09, ease: easeOut }}
                  >
                  <div className="relative flex h-[520px] flex-col overflow-hidden rounded-[32px] px-6 py-8 lg:h-[600px]">
                    {/* O carrossel duplica a lista pro loop do embla, então cada
                        foto existe DUAS vezes no DOM. Uma URL só = um decode só,
                        mas a 900×1350 são 4,9 MB de bitmap por foto pra um card
                        de 342×520 — a -700 é o 2× do card e corta pela metade.
                        O desktop (card de 465px) segue na original. */}
                    <picture className="absolute inset-0">
                      <source media="(min-width: 1024px)" srcSet={t.photo} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        loading="lazy"
                        src={t.photo.replace(/\.webp$/, "-700.webp")}
                        alt={t.name}
                        className="absolute inset-0 size-full object-cover"
                        draggable={false}
                      />
                    </picture>
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(180deg, rgba(10,16,26,0.5) 0%, rgba(10,16,26,0) 18%), linear-gradient(0deg, rgb(10,16,26) 0%, rgba(10,16,26,0) 43%)",
                      }}
                    />
                    {/* Escurece de leve no hover para dar contraste ao texto */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-k-ink/15 to-k-ink/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative flex items-center gap-2">
                      <Image
                        src={t.avatar}
                        alt=""
                        width={48}
                        height={48}
                        className="size-12 rounded-full object-cover"
                      />
                      <div className="flex flex-col gap-1.5">
                        <p className="font-display text-[24px] font-medium leading-[0.9] tracking-[-0.72px] text-white">
                          {t.name}
                        </p>
                        <p className="text-[18px] leading-[1.2] text-white/90">{t.handle}</p>
                      </div>
                    </div>
                    <p className="relative mt-auto text-[18px] leading-[1.5] text-white lg:text-[20px]">
                      {t.quote}
                    </p>
                    </div>
                  </m.div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

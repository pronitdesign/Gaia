"use client";

import { useCallback } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { GradientButton, OutlineButton, SectionBadge } from "./ui";

const testimonials = [
  {
    name: "Clara Pereira",
    handle: "@clarapereira.nutri",
    quote:
      "“A Gaia deixou minha alimentação muito mais simples. Consigo organizar minhas refeições, acompanhar minha evolução todo dia”",
    photo: "/figma/t1-photo.png",
    avatar: "/figma/t1-avatar.png",
  },
  {
    name: "Rafael Martins",
    handle: "@rafa.martins90",
    quote:
      "“O que mais gostei foi conseguir visualizar meu progresso e receber orientações de forma organizada todos os dias”",
    photo: "/figma/t2-photo.png",
    avatar: "/figma/t2-photo.png",
  },
  {
    name: "Camila Andrade",
    handle: "@camiandrade.saude",
    quote:
      "“A Gaia deixou minha alimentação muito mais simples. Consigo organizar minhas refeições, acompanhar minha evolução e entender melhor minhas escolhas sem sentir que estou seguindo uma dieta impossível.”",
    photo: "/figma/t4-photo.png",
    avatar: "/figma/t4-avatar.png",
  },
  {
    name: "Junior Ferreira",
    handle: "@marilopes.fit",
    quote:
      "“A experiência é muito leve e intuitiva. Consigo acompanhar meu plano alimentar, registrar minha rotina e encontrar as informações”",
    photo: "/figma/t3-photo.png",
    avatar: "/figma/t3-avatar.png",
  },
];

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Testimonials() {
  const reduced = useReducedMotion();
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true }, [
    AutoScroll({
      speed: 0.5,
      startDelay: 0,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      stopOnFocusIn: false,
    }),
  ]);

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
    <section id="depoimentos" className="relative overflow-hidden bg-[#fdf5ff]">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma/testimonials-bg.png" alt="" className="size-full object-cover" />
      </div>

      <div className="relative flex w-full flex-col gap-10 py-20 lg:gap-16 lg:py-28">
        <motion.div
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
        </motion.div>

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
                  <motion.div
                    className="group rounded-[40px] bg-white p-1"
                    onMouseEnter={() => toggleTicker(false)}
                    onMouseLeave={() => toggleTicker(true)}
                    initial={reduced ? false : { opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, delay: (i % 4) * 0.09, ease: easeOut }}
                  >
                  <div className="relative flex h-[520px] flex-col justify-between overflow-hidden rounded-[32px] px-6 py-8 lg:h-[600px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.photo}
                      alt={t.name}
                      className="absolute inset-0 size-full object-cover"
                      draggable={false}
                    />
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
                    <p className="relative text-[18px] leading-[1.5] text-white lg:text-[20px]">
                      {t.quote}
                    </p>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

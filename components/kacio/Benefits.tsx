"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { SectionBadge } from "./ui";

const features = [
  {
    icon: "/figma/icon-feat-transcribe.svg",
    title: "Transcrição ao vivo",
    desc: "Conversa registrada real time",
  },
  {
    icon: "/figma/icon-feat-profile.svg",
    title: "Prontuário automático",
    desc: "Notas organizadas sem esforço.",
  },
  {
    icon: "/figma/icon-feat-laptop.svg",
    title: "Tudo em um só lugar",
    desc: "Plano, exames e agendas",
  },
  {
    icon: "/figma/icon-feat-shield.svg",
    title: "Seus dados, seu controle",
    desc: "Segurança e autonomia.",
  },
];

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Benefits() {
  const reduced = useReducedMotion();

  // Mockup 3D estilo Apple: inclinado pra trás ao entrar, assenta plano no centro da tela
  const mockupRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: mockupRef,
    offset: ["start end", "center center"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [38, 0]);
  const mockupScale = useTransform(scrollYProgress, [0, 1], [0.88, 1]);
  const mockupY = useTransform(scrollYProgress, [0, 1], [64, 0]);
  const mockupOpacity = useTransform(scrollYProgress, [0, 1], [0.5, 1]);

  return (
    <section id="beneficios" className="relative overflow-hidden bg-k-cream">
      {/* Background full-bleed: crossfade + Ken Burns reverso na entrada */}
      <motion.div
        className="absolute inset-0"
        initial={reduced ? false : { opacity: 0, scale: 1.08 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 1.4, ease: easeOut }}
      >
        <picture>
          <source media="(min-width: 1024px)" srcSet="/figma/benefits-bg.webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            loading="lazy"
            src="/figma/benefits-bg-mobile.webp"
            alt=""
            className="size-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-k-cream to-transparent to-[27%]" />
      </motion.div>

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center gap-14 px-6 py-20 lg:px-12 lg:py-28">
        <motion.div
          className="flex max-w-[720px] flex-col items-center gap-4"
          initial={reduced ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, ease: easeOut }}
        >
          <SectionBadge tone="purple">NOSSOS BENEFÍCIOS</SectionBadge>
          <h2 className="text-center font-display text-[40px] leading-[1.1] tracking-[-0.03em] text-k-ink sm:text-[56px] lg:text-[72px] lg:tracking-[-2.16px]">
            Cuide melhor de cada paciente com a Gaia
          </h2>
          <p className="text-center text-[16px] leading-[1.5] text-k-ink/80 sm:text-[18px]">
            Centralize informações, automatize tarefas e tenha mais clareza durante todo o
            acompanhamento nutricional. A Gaia organiza sua rotina para que você dedique ao
            paciente.
          </p>
        </motion.div>

        {/* Mockup 3D: rotaciona em perspectiva conforme o scroll (scrub) */}
        <div className="w-full [perspective:1600px]">
          <motion.div
            ref={mockupRef}
            className="relative aspect-[3456/2062] w-full overflow-hidden rounded-[32px] border-8 border-white/40 will-change-transform"
            style={
              reduced
                ? undefined
                : {
                    rotateX,
                    scale: mockupScale,
                    y: mockupY,
                    opacity: mockupOpacity,
                  }
            }
          >
            <picture>
              <source media="(min-width: 1024px)" srcSet="/figma/mockup-app.webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                src="/figma/mockup-app-mobile.webp"
                alt="Interface da Gaia: pacientes, agenda e prontuário"
                className="absolute inset-0 size-full object-cover"
              />
            </picture>
          </motion.div>
        </div>

        {/* Faixa de features */}
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-8 lg:flex lg:items-center">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="flex flex-1 flex-col items-start gap-2 lg:flex-row lg:items-center"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, delay: 0.4 + i * 0.09, ease: easeOut }}
            >
              <Image src={f.icon} alt="" width={32} height={32} className="size-8 shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="font-display text-[18px] leading-[0.9] tracking-[-0.54px] text-white">
                  {f.title}
                </p>
                <p className="text-[16px] leading-[1.5] text-white/70">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

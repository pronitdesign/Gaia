import Navbar from "./Navbar";
import { GradientButton, OutlineButton, SectionBadge } from "./ui";

export default function Hero() {
  return (
    <section className="relative h-svh min-h-[640px]">
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/hero-bg.png"
          alt="Nutricionista atendendo com a Gaia"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-k-ink from-[1%] to-transparent to-[37%]" />
      </div>

      <Navbar />

      <div className="absolute inset-x-0 bottom-16 z-20 mx-auto flex w-full max-w-[1200px] flex-col items-start justify-between gap-10 px-6 lg:flex-row lg:items-end lg:px-12">
        <div className="flex max-w-[611px] flex-col items-start justify-center gap-4">
          <SectionBadge tone="white">Workspace clínico para nutricionistas</SectionBadge>
          <h1 className="font-display text-[44px] leading-[0.9] tracking-[-0.03em] text-white sm:text-[56px] lg:text-[72px] lg:tracking-[-2.16px]">
            Volte a olhar pro seu paciente
          </h1>
        </div>
        <div className="flex max-w-[407px] flex-col items-start gap-4">
          <p className="text-[18px] leading-[1.5] text-white lg:text-[20px]">
            A Gaia escuta a consulta e monta o prontuário. Plano, exames e agenda vivem no
            mesmo lugar.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <GradientButton>Começar grátis</GradientButton>
            <OutlineButton>Saiba Mais</OutlineButton>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { SectionBadge } from "./ui";

const faqs = [
  {
    q: "O que é a Gaia?",
    a: "A Gaia é uma plataforma desenvolvida para nutricionistas que centraliza informações, automatiza tarefas e ajuda a tornar cada consulta mais estratégica, organizada e personalizada.",
  },
  {
    q: "Preciso instalar algum programa?",
    a: "Não. A Gaia funciona diretamente pelo navegador e pode ser acessada pelo computador, tablet ou celular, sem necessidade de instalação.",
  },
  {
    q: "A Gaia substitui o nutricionista?",
    a: "Não. A Gaia atua como uma assistente para o profissional, ajudando na organização das informações, no registro das consultas e na preparação dos atendimentos. As decisões clínicas continuam sendo sempre do nutricionista.",
  },
  {
    q: "Como a Gaia ajuda durante a consulta?",
    a: "A plataforma pode acompanhar e transcrever a conversa, organizar as informações importantes e ajudar a transformar o atendimento em um prontuário estruturado.",
  },
  {
    q: "Posso acessar o histórico dos meus pacientes?",
    a: "Sim. A Gaia mantém as informações organizadas para que você consulte o histórico, objetivos, hábitos, evolução e registros anteriores de cada paciente.",
  },
  {
    q: "Meus dados e os dados dos pacientes ficam seguros?",
    a: "Sim. A Gaia foi desenvolvida com foco em privacidade e segurança. As informações permanecem protegidas e sob o controle do profissional.",
  },
  {
    q: "A Gaia funciona para qualquer abordagem nutricional?",
    a: "Sim. A plataforma pode ser utilizada por nutricionistas de diferentes especialidades e metodologias, adaptando-se à rotina e à forma de atendimento de cada profissional.",
  },
  {
    q: "Consigo usar a Gaia em consultas online e presenciais?",
    a: "Sim. A Gaia pode acompanhar tanto atendimentos presenciais quanto consultas realizadas por videochamada.",
  },
  {
    q: "Quanto custa a assinatura?",
    a: "A assinatura da Gaia custa R$ 49,90 por mês.",
  },
  {
    q: "Existe período de teste?",
    a: "As condições de teste ou acesso promocional podem variar. Consulte a oferta disponível no momento do cadastro.",
  },
  {
    q: "Já utilizo outra plataforma. Posso migrar para a Gaia?",
    a: "Sim. Profissionais que estão migrando de outra plataforma podem receber até dois meses gratuitos, de acordo com as condições da campanha vigente.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Você pode cancelar sua assinatura de acordo com as condições apresentadas no momento da contratação.",
  },
  {
    q: "Preciso entender de tecnologia para usar?",
    a: "Não. A Gaia foi criada para ser simples, intuitiva e fácil de integrar à rotina do consultório.",
  },
  {
    q: "Como começo a utilizar a Gaia?",
    a: "Basta criar sua conta, configurar seu perfil profissional e cadastrar ou importar seus pacientes para começar.",
  },
];

const TYPING_DELAY_MS = 750;

function FaqItem({ q, a }: { q: string; a: string }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const toggle = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (open || typing) {
      setOpen(false);
      setTyping(false);
      return;
    }
    if (reduced) {
      setOpen(true);
      return;
    }
    setTyping(true);
    timeoutRef.current = setTimeout(() => {
      setTyping(false);
      setOpen(true);
    }, TYPING_DELAY_MS);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Pergunta = mensagem do usuário */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-fit cursor-pointer rounded-2xl border border-white/10 bg-k-ink/80 px-6 py-4 text-left lg:backdrop-blur-2xl transition-colors hover:bg-k-ink/60"
      >
        <span className="text-[16px] font-medium leading-[1.5] text-white">{q}</span>
      </button>

      {/* Resposta = mensagem do bot */}
      <AnimatePresence>
        {(typing || open) && (
          <m.div
            className="flex items-end justify-end gap-2"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {typing ? (
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/10 px-6 py-5 lg:backdrop-blur-2xl">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="typing-dot size-2 rounded-full bg-white/80"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            ) : (
              <m.div
                className="max-w-[705px] rounded-2xl border border-white/10 bg-white/10 px-6 py-4 lg:backdrop-blur-2xl"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-[16px] leading-[1.5] text-white">{a}</p>
              </m.div>
            )}
            <Image
              src="/figma/faq-bot-avatar.webp"
              alt="Gaia"
              width={55}
              height={56}
              className="size-14 shrink-0 rounded-2xl object-cover"
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Faq() {
  const reduced = useReducedMotion();

  return (
    <section id="faq" className="relative overflow-hidden bg-k-ink">
      <div className="absolute inset-0">
        <picture>
          {/* Pelo optimizer (AVIF q75): o faq-bg desktop era o maior arquivo da
              página — 611KB de WebP pra virar fundo atrás de vidro; a w=1920
              fecha em ~80KB medidos. O mobile cai de 164KB pra ~20KB na w=828. */}
          <source media="(min-width: 1024px)" srcSet="/_next/image?url=%2Ffigma%2Ffaq-bg.webp&w=1920&q=75" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" src="/_next/image?url=%2Ffigma%2Ffaq-bg-mobile.webp&w=828&q=75" alt="" className="size-full object-cover" />
        </picture>
      </div>

      {/* Minimask de base — o hedge terminava num corte reto no pé da section e
          batia direto na base escura do CTA logo abaixo. Este gradiente
          dissolve a foto pro MESMO #0A0714 do frame do CTA (ver CTAFinal.tsx),
          costurando as duas sections num escuro só — sem linha de emenda.
          SEM z-index de propósito: a ordem do DOM (depois da foto, antes do
          bloco `relative` de conteúdo) já a deixa ACIMA da foto e ABAIXO dos
          balões. Um z-[1] positivo a subiria por cima do conteúdo (z auto) e
          apagaria o último balão. aria-hidden, pointer-events-none. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[220px] bg-gradient-to-b from-transparent to-[#0A0714]"
      />

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-6 py-20 lg:gap-16 lg:px-[88px] lg:py-28">
        <m.div
          className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end lg:gap-10"
          initial={reduced ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex max-w-[611px] flex-col items-start gap-4">
            <SectionBadge tone="lilac">FAQ</SectionBadge>
            <h2 className="font-display text-[40px] leading-[0.9] tracking-[-0.03em] text-white sm:text-[56px] lg:text-[72px] lg:tracking-[-2.16px]">
              Perguntas Frequentes
            </h2>
          </div>
          <div className="flex max-w-[293px] flex-col items-start gap-4">
            <p className="text-[18px] leading-[1.5] text-white/70 lg:text-[20px]">
              Dúvidas que os nutricionistas tem e que estamos aqui para te ajudar.
            </p>
            <button
              type="button"
              className="flex h-12 cursor-pointer items-center justify-center rounded-full border border-white/10 px-6 transition-colors hover:bg-white/5"
            >
              <span className="text-[16px] font-medium leading-[1.2] tracking-[-0.16px] text-white">
                Falar com nosso suporte
              </span>
            </button>
          </div>
        </m.div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, i) => (
            <m.div
              key={faq.q}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <FaqItem q={faq.q} a={faq.a} />
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}

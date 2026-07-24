"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SectionBadge } from "./ui";

const faqs = [
  {
    q: "O que é a Gaia?",
    a: "A Gaia é uma plataforma desenvolvida para nutricionistas que centraliza informações, automatiza tarefas e ajuda a tornar cada consulta mais estratégica, organizada e personalizada.",
  },
  {
    q: "Quanto tempo leva pra abrir conta?",
    a: "Poucos minutos. Você cria sua conta, configura sua agenda e já pode atender com a Gaia no mesmo dia, sem instalação nem burocracia.",
  },
  {
    q: "Posso investir em dólar?",
    a: "A Gaia é um workspace clínico para nutricionistas — não oferecemos produtos de investimento. Se ficou com dúvida sobre planos e pagamentos, fale com nosso suporte.",
  },
  {
    q: "Tem cartão físico?",
    a: "Não. A Gaia é 100% digital: prontuário, plano alimentar, exames e agenda vivem no mesmo lugar, acessíveis de qualquer dispositivo.",
  },
  {
    q: "Tem taxa escondida?",
    a: "Não. O valor do seu plano é o único custo — sem taxas de adesão, cancelamento ou cobranças surpresa.",
  },
  {
    q: "Funciona fora do Brasil?",
    a: "Sim. A Gaia funciona em qualquer lugar com acesso à internet, e seus dados ficam sincronizados com segurança onde você estiver.",
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
        className="w-fit cursor-pointer rounded-2xl border border-white/10 bg-ink/80 px-6 py-4 text-left backdrop-blur-2xl transition-colors hover:bg-ink/60"
      >
        <span className="text-[16px] font-medium leading-[1.5] text-white">{q}</span>
      </button>

      {/* Resposta = mensagem do bot */}
      <AnimatePresence>
        {(typing || open) && (
          <motion.div
            className="flex items-end justify-end gap-2"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {typing ? (
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/10 px-6 py-5 backdrop-blur-2xl">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="typing-dot size-2 rounded-full bg-white/80"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                className="max-w-[705px] rounded-2xl border border-white/10 bg-white/10 px-6 py-4 backdrop-blur-2xl"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-[16px] leading-[1.5] text-white">{a}</p>
              </motion.div>
            )}
            <Image
              src="/figma/faq-bot-avatar.png"
              alt="Gaia"
              width={55}
              height={56}
              className="size-14 shrink-0 rounded-2xl object-cover"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Faq() {
  const reduced = useReducedMotion();

  return (
    <section id="faq" className="relative overflow-hidden bg-ink">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma/faq-bg.png" alt="" className="size-full object-cover" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-6 py-20 lg:px-[88px] lg:py-28">
        <motion.div
          className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end"
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
        </motion.div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.q}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <FaqItem q={faq.q} a={faq.a} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

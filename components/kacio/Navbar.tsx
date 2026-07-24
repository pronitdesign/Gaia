"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const links = [
  { label: "Benefícios", href: "#beneficios" },
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Depoimentos", href: "#depoimentos" },
  { label: "FAQ", href: "#faq" },
  { label: "Planos", href: "#planos" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-40 mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6 lg:px-12">
      <a href="#" aria-label="Gaia">
        <Image src="/figma/logo-gaia.svg" alt="Gaia" width={108} height={28} priority />
      </a>

      <nav className="hidden items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 backdrop-blur-lg lg:flex">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="p-2.5 font-nav text-[14px] leading-[1.2] tracking-[-0.14px] text-white transition-opacity hover:opacity-70"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="hidden h-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.02] px-4 backdrop-blur-lg transition-opacity hover:opacity-80 sm:flex"
        >
          <span className="text-[14px] font-medium leading-[1.2] tracking-[-0.14px] text-white">
            Fazer Login
          </span>
        </button>
        <button
          type="button"
          className="btn-gradient flex h-10 cursor-pointer items-center justify-center rounded-full px-4 transition-transform duration-300 hover:scale-[1.03]"
        >
          <span className="text-[14px] font-medium leading-[1.2] tracking-[-0.14px] text-white">
            Criar Conta
          </span>
        </button>
        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex size-10 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-lg lg:hidden"
        >
          <span className="h-px w-4 bg-white" />
          <span className="h-px w-4 bg-white" />
          <span className="h-px w-4 bg-white" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-k-ink/60 p-3 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="flex flex-col gap-4 rounded-[32px] bg-k-ink/80 p-4 backdrop-blur-2xl"
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Image src="/figma/logo-gaia.svg" alt="Gaia" width={92} height={24} />
                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={() => setOpen(false)}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10"
                >
                  <span className="relative block size-4">
                    <span className="absolute left-0 top-1/2 h-px w-4 rotate-45 bg-white" />
                    <span className="absolute left-0 top-1/2 h-px w-4 -rotate-45 bg-white" />
                  </span>
                </button>
              </div>

              <nav className="flex flex-col rounded-3xl border border-white/10 bg-white/10 p-2">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl px-4 py-3.5 font-nav text-[18px] leading-[1.2] text-white transition-colors active:bg-white/10"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="flex h-12 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10"
                >
                  <span className="text-[16px] font-medium leading-[1.2] text-white">
                    Fazer Login
                  </span>
                </button>
                <button
                  type="button"
                  className="btn-gradient flex h-12 cursor-pointer items-center justify-center rounded-full"
                >
                  <span className="text-[16px] font-medium leading-[1.2] text-white">
                    Criar Conta
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

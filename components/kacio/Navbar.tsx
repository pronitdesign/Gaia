"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import { getLenis } from "@/lib/lenis";

const links = [
  { label: "Benefícios", href: "#beneficios" },
  { label: "Como Funciona", href: "#como-comecar" },
  { label: "Depoimentos", href: "#depoimentos" },
  { label: "FAQ", href: "#faq" },
  { label: "Planos", href: "#pricing" },
];

// Altura da barra fixa no mobile: compensa o scroll pra o título da seção não
// nascer escondido embaixo do header.
const HEADER_OFFSET = 72;

export default function Navbar() {
  const [open, setOpen] = useState(false);

  // Header do mobile: some ao descer, reaparece ao subir. Ganha fundo escuro
  // depois do topo pra o logo/texto brancos não sumirem em seção clara.
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 8);
        const goingDown = y > lastY.current;
        // histerese de 6px pra não piscar em micro-tremores do dedo
        if (Math.abs(y - lastY.current) > 6) {
          setHidden(y > 80 && goingDown);
          lastY.current = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Rola suave em qualquer clique de link: Lenis no desktop (que desliga o
  // scroll-behavior nativo), scroll nativo suave com offset do header no mobile.
  const onNav = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute("href");
    if (!href?.startsWith("#")) return;
    e.preventDefault();
    setOpen(false);
    const el = href.length > 1 ? document.getElementById(href.slice(1)) : null;
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(el ?? 0, { duration: 1.1 });
    } else {
      const top = el
        ? el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
        : 0;
      window.scrollTo({ top, behavior: "smooth" });
    }
    if (href.length > 1) history.replaceState(null, "", href);
  }, []);

  const barHidden = hidden && !open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6 transition-[transform,background-color,backdrop-filter] duration-300 lg:absolute lg:px-12 lg:!translate-y-0 lg:!bg-transparent lg:!backdrop-blur-none ${
        barHidden ? "-translate-y-full" : "translate-y-0"
      } ${scrolled ? "bg-k-ink/80 backdrop-blur-xl" : "bg-transparent"}`}
    >
      <a href="#" aria-label="Gaia" onClick={onNav}>
        <Image src="/figma/logo-gaia.svg" alt="Gaia" width={108} height={28} priority />
      </a>

      <nav className="hidden items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 backdrop-blur-lg lg:flex">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={onNav}
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
          <m.div
            className="fixed inset-0 z-50 bg-k-ink/60 p-3 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(false)}
          >
            <m.div
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
                    onClick={onNav}
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
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const SESSION_KEY = "gaia-loading-done";
const FALLBACK_TIMEOUT_MS = 6000;
const END_EPSILON_S = 0.04; // considera a flor "fechada" quando falta isto pro fim
const HOLD_AT_100_MS = 450; // segura no 100 pra ler o branding do fim do vídeo
const WINDUP_S = 0.14; // recuo de antecipação antes do lift
const REVEAL_S = 1.1; // duração do lift da cortina

// ease "expo" — sobe rápido e assenta macio; é a assinatura do reveal
const REVEAL_EASE = [0.76, 0, 0.24, 1] as const;

// Grão de filme estático — feTurbulence embutido, sem custo por frame
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function LoadingScreen() {
  const [mounted, setMounted] = useState(true);
  const [skipped, setSkipped] = useState(false);
  const [count, setCount] = useState(0);
  const [revealing, setRevealing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false); // trava o gatilho do reveal
  const countRef = useRef(0); // último inteiro pintado (evita setState por frame)
  const reduce = useReducedMotion();

  useEffect(() => {
    // Refresh/primeiro load sempre toca a intro; só navegação interna (SPA) pula.
    const onPageHide = () => sessionStorage.removeItem(SESSION_KEY);
    window.addEventListener("pagehide", onPageHide);

    if (sessionStorage.getItem(SESSION_KEY)) {
      setSkipped(true);
      setMounted(false);
      return () => window.removeEventListener("pagehide", onPageHide);
    }

    document.documentElement.classList.add("scroll-locked");

    let rafId = 0;
    let holdId: ReturnType<typeof setTimeout>;

    // Dispara a cortina: garante 100 pintado, segura no branding, depois sobe.
    const startReveal = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      sessionStorage.setItem(SESSION_KEY, "1");
      cancelAnimationFrame(rafId);
      setCount(100);
      holdId = setTimeout(() => setRevealing(true), reduce ? 0 : HOLD_AT_100_MS);
    };

    const video = videoRef.current;
    if (!video) {
      startReveal();
      return () => {
        window.removeEventListener("pagehide", onPageHide);
        clearTimeout(holdId);
      };
    }

    // Rede de segurança: se o vídeo nunca engatar, revela mesmo assim.
    const fallback = setTimeout(() => {
      if (video.readyState < 2 || video.paused) startReveal();
    }, FALLBACK_TIMEOUT_MS);

    // O % é coreografia: currentTime/duration → 0..100, casado com a flor.
    const tick = () => {
      const d = video.duration;
      if (d && isFinite(d)) {
        const p = Math.min(1, video.currentTime / d);
        const next = Math.round(p * 100);
        if (next !== countRef.current) {
          countRef.current = next;
          setCount(next);
        }
        if (video.currentTime >= d - END_EPSILON_S) {
          startReveal();
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    video.addEventListener("ended", startReveal);
    video.addEventListener("error", startReveal);
    video.play().catch(startReveal);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      clearTimeout(fallback);
      clearTimeout(holdId);
      cancelAnimationFrame(rafId);
      video.removeEventListener("ended", startReveal);
      video.removeEventListener("error", startReveal);
    };
  }, [reduce]);

  // A cortina terminou de subir: solta o scroll e desmonta.
  const onRevealComplete = () => {
    document.documentElement.classList.remove("scroll-locked");
    setMounted(false);
  };

  if (skipped || !mounted) return null;

  const pct = String(count).padStart(2, "0");

  // Ken Burns + emerge-do-escuro, derivados do %:
  const kb = reduce ? 1 : 1.08 - (count / 100) * 0.08; // zoom 1.08 → 1.0
  const veil = reduce ? 0 : Math.max(0, 0.55 * (1 - count / 60)); // breu 0.55 → 0 (até 60%)

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden bg-k-ink"
      initial={{ y: "0%" }}
      animate={revealing ? { y: reduce ? "0%" : "-100%" } : { y: "0%" }}
      // reduced-motion: sem lift, só some com opacidade
      style={reduce && revealing ? { opacity: 0, transition: "opacity 0.4s ease" } : undefined}
      transition={{ duration: reduce ? 0 : REVEAL_S, ease: REVEAL_EASE, delay: reduce ? 0 : WINDUP_S }}
      onAnimationComplete={() => {
        if (revealing) onRevealComplete();
      }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={count}
      aria-label="Carregando a Gaia"
    >
      {/* Grupo de conteúdo — recua (antecipação), sobe um tiquinho mais rápido
          que a cortina e esmaece: dá peso e profundidade ao lift. */}
      <motion.div
        className="absolute inset-0"
        animate={
          revealing
            ? { scale: reduce ? 1 : 0.985, y: reduce ? "0%" : "-16%", opacity: reduce ? 1 : 0 }
            : { scale: 1, y: "0%", opacity: 1 }
        }
        transition={{
          scale: { duration: reduce ? 0 : WINDUP_S, ease: "easeOut" },
          y: { duration: reduce ? 0 : REVEAL_S, ease: REVEAL_EASE, delay: reduce ? 0 : WINDUP_S },
          opacity: { duration: reduce ? 0 : REVEAL_S, ease: REVEAL_EASE, delay: reduce ? 0 : WINDUP_S },
        }}
      >
        {/* A flor — composição fechada 16:9 sobre k-ink, full-bleed, com Ken Burns */}
        <video
          ref={videoRef}
          className="size-full object-cover"
          style={{ transform: `scale(${kb})`, transformOrigin: "center", willChange: "transform" }}
          src="/loading.mp4"
          muted
          playsInline
          preload="auto"
        />

        {/* Véu de escuro que levanta com o % — a flor emerge do breu */}
        <div className="pointer-events-none absolute inset-0 bg-k-ink" style={{ opacity: veil }} />

        {/* Grão de filme — textura cinematográfica */}
        <div
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
          style={{ backgroundImage: GRAIN, backgroundRepeat: "repeat", opacity: 0.5 }}
        />

        {/* Scrim no canto pra garantir leitura do número sobre a flor */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-k-ink/85 via-k-ink/0 to-transparent" />

        {/* Big number — canto inferior esquerdo, editorial */}
        <div className="absolute bottom-[clamp(1.25rem,4vw,3.5rem)] left-[clamp(1.25rem,4vw,3.5rem)] flex items-end text-k-cream">
          <span
            className="font-display font-medium leading-[0.8] tabular-nums"
            style={{ fontSize: "clamp(4.5rem, 15vw, 15rem)", letterSpacing: "-0.03em" }}
          >
            {pct}
          </span>
          <span
            className="mb-[1.5vw] ml-[0.4vw] font-display leading-none text-k-cream/60"
            style={{ fontSize: "clamp(1.5rem, 4vw, 3.5rem)" }}
          >
            %
          </span>
        </div>

        {/* Régua de progresso — borda de baixo, fio de marca acompanhando o % */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-k-cream/12">
          <div
            className="h-full origin-left bg-k-lilac"
            style={{ transform: `scaleX(${count / 100})` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

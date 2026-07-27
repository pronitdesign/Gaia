"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { Logo } from "@/components/ui/Logo";

const SESSION_KEY = "gaia-loading-done";
const FALLBACK_TIMEOUT_MS = 6000;
const END_EPSILON_S = 0.04; // considera a flor "fechada" quando falta isto pro fim
const HOLD_AT_100_MS = 650; // segura no 100 pro cartão de marca respirar antes da cortina
const BRAND_AT = 70; // % em que o vídeo desfoca e a marca em DOM começa a entrar
const WINDUP_S = 0.12; // antecipação antes do lift
const REVEAL_S = 0.95; // duração do lift da cortina
const PLAYBACK_RATE = 1.2; // o vídeo tem 5,04s; a 1,2× a intro inteira fecha em ~6s

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
    video.playbackRate = PLAYBACK_RATE;
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
  const branded = count >= BRAND_AT; // dispara o desfoque e o cartão de marca

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
      {/* Grupo de conteúdo — avança um tiquinho (antecipação) e fica ATRÁS da cortina
          na subida, esmaecendo: dá peso e profundidade ao lift.
          A escala é pra fora (1.02) e o y é positivo de propósito: assim o conteúdo
          sempre transborda a cortina e é cortado por ela. Recuar/subir mais que a
          cortina descobriria a borda e deixaria uma faixa de k-ink no rodapé.
          E NÃO esmaece: se o conteúdo apaga enquanto a cortina opaca sobe, a aba de
          trás dela vira uma faixa escura — a flor tem que sair inteira junto. */}
      <motion.div
        className="absolute inset-0"
        animate={
          revealing
            ? { scale: reduce ? 1 : 1.02, y: reduce ? "0%" : "7%" }
            : { scale: 1, y: "0%" }
        }
        transition={{
          scale: { duration: reduce ? 0 : WINDUP_S, ease: "easeOut" },
          y: { duration: reduce ? 0 : REVEAL_S, ease: REVEAL_EASE, delay: reduce ? 0 : WINDUP_S },
        }}
      >
        {/* A flor — composição fechada 16:9 sobre k-ink, full-bleed, com Ken Burns */}
        {/* Este vídeo é o PRIMEIRO pixel da página e o relógio da intro (o % vem do
            currentTime dele), então ele é o caminho crítico inteiro: enquanto não
            chega, a tela fica parada. Medido em 3G lento, num arquivo só de 1,2MB
            disputando banda com o JS, a intro levava 17,4s pra começar a andar.
            Daí a variante mobile de 275KB (1280×720) — o retrato já recorta as
            laterais do 16:9 e amplia pela altura, então resolução de sobra ali só
            atrasa a estreia.

            A escolha vai por `<source media>` e NÃO por matchMedia+state (como faz
            o CTAFinal): lá o custo de decidir no cliente é irrelevante porque
            aqueles vídeos nascem com preload="none" e só carregam perto da section.
            Aqui, decidir no cliente empurraria o download pra DEPOIS da hidratação
            — ou seja, pra depois de 513KB de JS chegarem — que é exatamente o
            atraso que estamos matando. O src precisa estar no HTML inicial.
            VERIFICADO nos dois viewports: cada um baixa só o arquivo da sua faixa. */}
        <video
          ref={videoRef}
          className="size-full object-cover"
          style={{ transform: `scale(${kb})`, transformOrigin: "center", willChange: "transform" }}
          muted
          playsInline
          preload="auto"
        >
          <source src="/loading.mp4" media="(min-width: 1024px)" type="video/mp4" />
          <source src="/loading-mobile.mp4" type="video/mp4" />
        </video>

        {/* Véu de escuro que levanta com o % — a flor emerge do breu */}
        <div className="pointer-events-none absolute inset-0 bg-k-ink" style={{ opacity: veil }} />

        {/* Grão de filme — textura cinematográfica */}
        <div
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
          style={{ backgroundImage: GRAIN, backgroundRepeat: "repeat", opacity: 0.5 }}
        />

        {/* Scrim no canto pra garantir leitura do número sobre a flor */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tl from-k-ink/85 via-k-ink/0 to-transparent" />

        {/* Desfoque do fim — leve, só pra abrir campo pro cartão de marca (o vídeo já
            vem limpo, não há marca queimada pra esconder). Raio FIXO no backdrop-filter
            e só a opacidade animando: raio variando por frame é o que custa caro. */}
        <motion.div
          className="pointer-events-none absolute inset-0 backdrop-blur-[8px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: branded ? 1 : 0 }}
          transition={{ duration: reduce ? 0.3 : 0.7, ease: "easeOut" }}
        />
        {/* Lavagem por cima do desfoque: assenta a cor sob o wordmark. O /50 é medido —
            é o que leva o creme a ≥3:1 contra o p95 do fundo, com o desfoque em 8px. */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-k-ink/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: branded ? 1 : 0 }}
          transition={{ duration: reduce ? 0.3 : 0.7, ease: "easeOut" }}
        />

        {/* Cartão de marca — logo e frase em DOM: nítidas e sem corte em qualquer tela */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center px-6 text-center text-k-cream">
          <div className="overflow-hidden pb-[0.12em]">
            <motion.div
              initial={reduce ? { opacity: 0 } : { y: "115%" }}
              animate={
                reduce
                  ? { opacity: branded ? 1 : 0 }
                  : { y: branded ? "0%" : "115%" }
              }
              transition={{ duration: reduce ? 0.4 : 0.75, ease: REVEAL_EASE, delay: reduce ? 0 : 0.25 }}
            >
              <Logo className="w-auto" style={{ height: "clamp(2.5rem, 6vw, 5rem)" }} title="Gaia" />
            </motion.div>
          </div>

          <div className="mt-[clamp(0.75rem,1.8vw,1.5rem)] overflow-hidden pb-[0.22em]">
            <motion.p
              className="font-grotesk font-light leading-tight text-k-cream/85"
              style={{ fontSize: "clamp(0.95rem, 2vw, 1.6rem)", letterSpacing: "0.01em" }}
              initial={reduce ? { opacity: 0 } : { y: "130%" }}
              animate={
                reduce
                  ? { opacity: branded ? 1 : 0 }
                  : { y: branded ? "0%" : "130%" }
              }
              transition={{ duration: reduce ? 0.4 : 0.75, ease: REVEAL_EASE, delay: reduce ? 0 : 0.42 }}
            >
              O Futuro da nutrição te espera.
            </motion.p>
          </div>
        </div>

        {/* Número — canto inferior direito, editorial. Escala de detalhe, não de hero.
            O pb/-mb cancelam no layout e só abrem folga de clipping pra serifa. */}
        <div className="absolute bottom-[clamp(1.25rem,4vw,3.5rem)] right-[clamp(1.5rem,4.5vw,4rem)] -mb-2 overflow-hidden pb-2">
          {/* Entrada: sobe de baixo por trás do corte — sem fade, o clip é o efeito */}
          <motion.div
            className="flex items-end text-k-cream"
            initial={reduce ? { y: 0, opacity: 0 } : { y: "115%" }}
            animate={reduce ? { y: 0, opacity: 1 } : { y: "0%" }}
            transition={{ duration: reduce ? 0.4 : 0.85, ease: REVEAL_EASE, delay: reduce ? 0 : 0.2 }}
          >
            <span
              className="font-display font-light leading-none tabular-nums"
              style={{ fontSize: "clamp(2.75rem, 6.5vw, 6.5rem)", letterSpacing: "-0.01em" }}
            >
              {pct}
            </span>
            <span
              className="ml-[0.15em] font-display font-light leading-none text-k-cream/60"
              style={{ fontSize: "clamp(1.5rem, 3.8vw, 3.75rem)" }}
            >
              %
            </span>
          </motion.div>
        </div>

        {/* Régua de progresso — trilho vertical na borda direita, enchendo de baixo pra cima.
            Track escuro (a flor é clara; cream sumiria) e fio lilás por cima. */}
        <div className="absolute inset-y-0 right-0 w-[2px] bg-k-ink/15">
          <div
            className="w-full origin-bottom bg-k-lilac"
            style={{
              height: "100%",
              transform: `scaleY(${count / 100})`,
              // contorno escuro: o lilás sozinho some sobre a pétala clara
              boxShadow: "0 0 0 1px rgba(10,16,26,0.4)",
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

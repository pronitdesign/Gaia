"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setLenis } from "@/lib/lenis";
import { ligarMonitorDeFrame } from "@/lib/gpu";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scroll (Lenis) sincronizado com o ScrollTrigger do GSAP.
 * Respeita prefers-reduced-motion — desliga o smooth e deixa o scroll nativo.
 */
export default function SmoothScroll() {
  useEffect(() => {
    /* O monitor de frame mora AQUI e não dentro do Canvas: quem trava esta
       página quase nunca é o WebGL. O aparelho 3D é um dos itens do orçamento;
       o resto é raster de foto, borrão decorativo, camada de blend e refresh de
       ScrollTrigger — trabalho que acontece com ou sem cena 3D montada. Um
       monitor pendurado no Canvas só enxergaria a fatia que ele mesmo custa, e
       ainda por cima só depois que o Canvas montasse (~10.000px abaixo).
       Pendurado no scroll global ele vê o frame inteiro, desde o primeiro. */
    ligarMonitorDeFrame();

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    setLenis(lenis);

    const onRaf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onRaf);
      setLenis(null);
      lenis.destroy();
    };
  }, []);

  return null;
}

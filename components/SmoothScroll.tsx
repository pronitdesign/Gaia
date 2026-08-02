"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setLenis } from "@/lib/lenis";
import { ligarMonitorDeFrame } from "@/lib/gpu";

gsap.registerPlugin(ScrollTrigger);

/* O LENIS SÓ EXISTE ONDE HÁ RODA. */
const TEM_RODA = "(hover: hover) and (pointer: fine)";

/**
 * Smooth scroll (Lenis) sincronizado com o ScrollTrigger do GSAP.
 * Respeita prefers-reduced-motion — desliga o smooth e deixa o scroll nativo.
 * E não nasce em aparelho de toque — ver TEM_RODA, abaixo.
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

    /* ── O LENIS NÃO ENTRA EM APARELHO DE TOQUE ────────────────────────────
     *
     * Ele só suaviza a RODA. `syncTouch` é `false` (o padrão, e é o que a gente
     * quer: sincronizar o toque sequestra o arrasto e briga com a inércia do
     * sistema). Verificado na fonte do lenis 1.3.25, `onVirtualScroll`:
     *
     *     if (!(this.options.syncTouch && isTouch || this.options.smoothWheel && isWheel)) return
     *
     * Ou seja, no celular todo touchmove entra no handler e SAI SEM FAZER NADA.
     * Benefício zero. E o preço não é o handler vazio — é como ele foi
     * registrado: o lenis usa `listenerOptions = { passive: false }` para TODOS
     * os binds, inclusive `touchstart`/`touchmove` no window.
     *
     * Um listener de touchmove NÃO-PASSIVO no window proíbe o navegador de
     * rolar no compositor: como o handler PODE chamar preventDefault(), cada
     * movimento do dedo tem que esperar a main thread rodar JS antes de o
     * scroll acontecer. Numa página que já ocupa a main thread com scrub de
     * ScrollTrigger, o dedo passa a andar no ritmo do pior frame — que é
     * exatamente o "rola aos trancos" que aparece em QUALQUER aparelho, e que
     * nenhuma das rodadas anteriores de corte de pintura alcançou, porque elas
     * mexiam no custo do frame e o problema estava no caminho da ENTRADA.
     *
     * A aresta é `(hover: hover) and (pointer: fine)` e não `max-width`: quem
     * decide não é o tamanho da tela, é ter roda pra suavizar. Notebook com
     * tela de toque cai no lado do desktop de propósito — lá existe roda, e a
     * máquina é de classe desktop.
     *
     * Nada muda visualmente no celular: o toque nunca foi suavizado. O que
     * muda é que o ScrollTrigger passa a ouvir o scroll nativo direto (é o
     * caminho padrão dele quando não há proxy), sem o intermediário. */
    if (!window.matchMedia(TEM_RODA).matches) return;

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

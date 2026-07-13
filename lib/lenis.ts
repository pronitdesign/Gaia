import type Lenis from "lenis";

/**
 * Referência compartilhada da instância Lenis (criada em SmoothScroll).
 * Permite que seções (ex.: ComoComecar) rolem via Lenis em vez de
 * window.scrollTo — que o Lenis desabilita (scroll-behavior:auto) e
 * causaria salto/desync.
 */
let instance: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  instance = l;
};

export const getLenis = () => instance;

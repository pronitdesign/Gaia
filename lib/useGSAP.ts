import { useLayoutEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";

type Options = {
  scope?: RefObject<Element | null>;
  dependencies?: unknown[];
};

/**
 * Wrapper mínimo em torno de gsap.context — escopa os seletores ao `scope`
 * e faz revert automático no unmount (limpa tweens + ScrollTriggers).
 * Substitui @gsap/react/useGSAP sem adicionar dependência.
 */
export function useGSAP(callback: () => void, options: Options = {}) {
  const { scope, dependencies = [] } = options;
  const cb = useRef(callback);
  cb.current = callback;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => cb.current(), scope?.current ?? undefined);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

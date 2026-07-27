import { useLayoutEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useArmOnApproach } from "./armOnApproach";

type Options = {
  scope?: RefObject<Element | null>;
  dependencies?: unknown[];
  /**
   * Cria o contexto já na hidratação, sem esperar a intro nem a aproximação.
   * Só pra quem nasce visível — abaixo da dobra isto é o custo que derruba a nota.
   */
  eager?: boolean;
};

/**
 * Uma única refresh pra N seções que armarem no mesmo tick. ScrollTrigger.refresh
 * remede TODO mundo e força layout; chamar sete vezes seguidas paga sete vezes.
 */
let refreshQueued = false;
function queueScrollTriggerRefresh() {
  if (refreshQueued || typeof window === "undefined") return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    ScrollTrigger.refresh();
  });
}

/**
 * Wrapper mínimo em torno de gsap.context — escopa os seletores ao `scope`
 * e faz revert automático no unmount (limpa tweens + ScrollTriggers).
 * Substitui @gsap/react/useGSAP sem adicionar dependência.
 *
 * O contexto só nasce quando `useArmOnApproach` libera: intro terminada E seção
 * chegando. Ver o cabeçalho de `armOnApproach.ts` pro motivo medido — este
 * `useLayoutEffect` roda DENTRO do commit da hidratação, então cada ScrollTrigger
 * criado aqui é tempo de bloqueio somado ao LCP de uma seção que ninguém está
 * vendo ainda.
 */
export function useGSAP(callback: () => void, options: Options = {}) {
  const { scope, dependencies = [], eager = false } = options;
  const cb = useRef(callback);
  cb.current = callback;

  const fallbackRef = useRef<Element | null>(null);
  const armed = useArmOnApproach(scope ?? fallbackRef, { eager });

  useLayoutEffect(() => {
    if (!armed) return;
    const ctx = gsap.context(() => cb.current(), scope?.current ?? undefined);
    // O pin desta seção pode ter mudado a altura da página depois que os
    // triggers de cima já mediram — remede todo mundo uma vez só.
    queueScrollTriggerRefresh();
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, ...dependencies]);
}

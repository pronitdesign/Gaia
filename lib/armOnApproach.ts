import { useEffect, useState, type RefObject } from "react";

/**
 * Gate de montagem de efeito pesado: só arma quando a intro acabou E o elemento
 * está chegando na viewport.
 *
 * Por que existe: o custo de boot desta landing não é byte, é main thread. O LCP
 * mede o <img> da intro com `Render Delay` de 1230ms de 1347ms — a imagem já está
 * baixada e o que atrasa o paint é a thread ocupada hidratando 1703 elementos e
 * criando 25 ScrollTriggers dentro do commit (`useLayoutEffect` é síncrono).
 * Medido por ablação: com o abaixo-da-dobra fora da página o TBT vai de 467ms a
 * ZERO e o LCP de 1347 a 850. O DOM não é o problema — o trabalho de scroll que
 * ele dispara no mount é.
 *
 * O gate NÃO remove DOM: o HTML continua servido pelo SSR (SEO e CLS intactos),
 * só o trabalho de scroll espera a sua vez.
 *
 * Política de disparo copiada do ScrollPhoneDeferred, que já resolveu isto:
 * durante a cortina da intro a thread fica ociosa DE PROPÓSITO (quem anima é o
 * vídeo, no compositor) e o requestIdleCallback lê isso como "página pronta".
 * Por isso o sinal é o evento `gaia:intro-done` — com o flag no <html> pra quem
 * montar depois do disparo (ler estado é confiável, ouvir evento passado não é),
 * e os mesmos escapes: primeiro scroll e teto de 8s.
 */

const INTRO_TIMEOUT_MS = 8000;

/** Chama `cb` quando a intro terminar (ou num dos escapes). Devolve cleanup. */
function afterIntro(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  if (document.documentElement.dataset.introDone === "1") {
    cb();
    return () => {};
  }

  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    cleanup();
    cb();
  };

  const cleanup = () => {
    window.removeEventListener("gaia:intro-done", fire);
    window.removeEventListener("scroll", fire);
    window.clearTimeout(timer);
  };

  const timer = window.setTimeout(fire, INTRO_TIMEOUT_MS);
  window.addEventListener("gaia:intro-done", fire);
  window.addEventListener("scroll", fire, { once: true, passive: true });

  return cleanup;
}

type ArmOptions = {
  /** Arma imediatamente — pra quem está acima da dobra e precisa nascer pronto. */
  eager?: boolean;
  /**
   * Antecedência da montagem. 150% = uma tela e meia antes de encostar, folga
   * suficiente pra que a seção nunca apareça sem seu estado inicial aplicado.
   */
  rootMargin?: string;
};

/**
 * `true` quando o efeito pode ser criado. Uma vez armado, nunca desarma —
 * senão o revert do gsap.context derrubaria a animação no meio.
 */
export function useArmOnApproach(
  ref: RefObject<Element | null>,
  { eager = false, rootMargin = "150% 0px" }: ArmOptions = {},
): boolean {
  const [armed, setArmed] = useState(eager);

  useEffect(() => {
    if (armed) return;

    let io: IntersectionObserver | null = null;
    const arm = () => setArmed(true);

    const stopWaitingIntro = afterIntro(() => {
      const el = ref.current;
      // Sem elemento ou sem IO: arma direto. Perder o efeito é pior que pagar
      // o custo cedo.
      if (!el || typeof IntersectionObserver === "undefined") {
        arm();
        return;
      }
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io?.disconnect();
          arm();
        },
        { rootMargin },
      );
      io.observe(el);
    });

    return () => {
      stopWaitingIntro();
      io?.disconnect();
    };
  }, [armed, ref, rootMargin]);

  return armed;
}

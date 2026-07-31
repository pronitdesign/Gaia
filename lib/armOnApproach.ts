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

/* ── PRÉ-ARMAR NO OCIOSO, A PARTIR DO PRIMEIRO SCROLL ──────────────────────
 *
 * O gate acima resolveu o boot e criou um custo novo, que só aparece a quem
 * ROLA. Medido em produção, viewport de iPhone (390×844, dpr 3, CPU 4×), a
 * altura do documento ao longo de uma passada:
 *
 *     y=0 .......... 16501px
 *     y=996 ........ 19201px   (+2700)
 *     y=4968 ....... 21361px   (+2160)
 *
 * São 4860px de pin-spacer nascendo DEBAIXO de quem está rolando. Cada
 * nascimento chama `ScrollTrigger.refresh()`, que remede os 25 triggers da
 * página e faz swap-out/swap-in de todos os 9 pins — e isso aparece no
 * MutationObserver como blocos de DOM saindo e voltando em oito faixas
 * diferentes do scroll. No perfil de Long Animation Frames é o maior item
 * isolado: 576ms dentro de frames longos, com 159ms de layout forçado, em 9
 * disparos.
 *
 * O conserto não pode ser "armar tudo na hidratação": era exatamente isso que
 * custava 467ms de TBT e derrubava a nota de 98 pra 74.
 *
 * O que separa os dois casos é o SCROLL. O Lighthouse não rola — ele mede um
 * carregamento parado, e nessa medição nada aqui dispara. Quem rola declarou
 * que vai percorrer a página, e pra essa pessoa é melhor pagar o armamento
 * agora, espalhado em fatias ociosas enquanto ela ainda está descendo as
 * primeiras telas, do que pagar por seção no meio do movimento.
 *
 * Então: no primeiro scroll, as seções que ainda não armaram entram numa fila
 * e saem UMA POR FATIA OCIOSA. Uma por fatia, e não a fila inteira, porque
 * armar sete de uma vez é o mesmo bloco de 467ms com outro nome. O
 * IntersectionObserver de cada seção continua de pé como caminho rápido: quem
 * rolar mais depressa que a fila arma pela aproximação, como antes.
 */
type Vez = () => void;
const fila: Vez[] = [];
let filaLigada = false;
let escutaScroll = false;

/** Próxima fatia ociosa. `timeout` porque rolagem contínua pode não deixar
 *  folga nenhuma, e uma fila que nunca drena é o mesmo que não existir. */
function proximaFatia(cb: () => void) {
  const ric = (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback;
  if (ric) ric(cb, { timeout: 600 });
  else window.setTimeout(cb, 120);
}

/* Quanto silêncio de scroll a fila exige pra armar a próxima seção.
 *
 * A primeira versão drenava assim que o primeiro scroll acontecia, e ela
 * ESTAVA certa sobre o quê e errada sobre o quando: medido em LoAF, o custo
 * saiu do meio da página (y 6000–8000 caiu de 834ms pra 532ms) e reapareceu
 * inteiro nos primeiros 2000px — 875ms em 10 frames longos, contra 182ms em 2
 * antes. Ou seja: a fila entregava o armamento exatamente enquanto a pessoa
 * dava a primeira rolada, que é o pior instante possível pra gastar 60ms.
 *
 * `requestIdleCallback` não resolve isso sozinho porque durante uma rolagem por
 * inércia ainda sobra folga entre frames — folga que é justamente o que o
 * PRÓXIMO frame vai querer. O gate certo não é "a thread está livre", é "a
 * página está parada": 180ms sem um único evento de scroll significa que o
 * dedo saiu e a inércia acabou. É nesses buracos, entre uma rolada e outra,
 * que a fila anda. */
const SILENCIO_MS = 180;
let ultimoScroll = 0;

function drenar() {
  if (performance.now() - ultimoScroll < SILENCIO_MS) {
    // Ainda rolando: devolve a fatia e tenta de novo depois. Não desliga a
    // fila — desligar aqui exigiria alguém pra religar, e o único sinal que
    // sobraria seria o próprio scroll, que é o que estamos esperando parar.
    proximaFatia(drenar);
    return;
  }
  const vez = fila.shift();
  if (!vez) {
    filaLigada = false;
    return;
  }
  vez();
  proximaFatia(drenar);
}

function agendarFila() {
  if (filaLigada || !fila.length) return;
  filaLigada = true;
  proximaFatia(drenar);
}

/** Entra na fila de pré-armamento. Devolve como sair dela (o IO chegou antes). */
function entrarNaFila(vez: Vez): () => void {
  fila.push(vez);
  if (!escutaScroll) {
    escutaScroll = true;
    // Um listener só, permanente e passivo: ele é ao mesmo tempo o gatilho da
    // fila (primeiro scroll = a pessoa vai percorrer a página) e o relógio do
    // silêncio que `drenar` consulta.
    window.addEventListener(
      "scroll",
      () => {
        ultimoScroll = performance.now();
        agendarFila();
      },
      { passive: true },
    );
  }
  if (filaLigada) agendarFila();
  return () => {
    const i = fila.indexOf(vez);
    if (i >= 0) fila.splice(i, 1);
  };
}

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
    let sairDaFila: (() => void) | null = null;
    let jaArmou = false;
    // Dois caminhos chegam aqui (aproximação e fila ociosa) e o perdedor não
    // pode disparar depois: um setArmed(true) redundante é um render extra em
    // toda seção da página.
    const arm = () => {
      if (jaArmou) return;
      jaArmou = true;
      io?.disconnect();
      sairDaFila?.();
      setArmed(true);
    };

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
          arm();
        },
        { rootMargin },
      );
      io.observe(el);
      // Caminho lento: se ninguém chegar perto, a fila arma no ocioso depois
      // do primeiro scroll — pra que o documento pare de crescer debaixo de
      // quem está rolando. Ver o bloco PRÉ-ARMAR no topo do arquivo.
      sairDaFila = entrarNaFila(arm);
    });

    return () => {
      stopWaitingIntro();
      io?.disconnect();
      sairDaFila?.();
    };
  }, [armed, ref, rootMargin]);

  return armed;
}

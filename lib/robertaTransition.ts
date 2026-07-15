/**
 * Canal de uma via entre o ticker da ARoberta (produtor) e o Features
 * (consumidor).
 *
 * POR QUE UM MÓDULO E NÃO CONTEXT/ESTADO REACT: isto é escrito e lido a CADA
 * FRAME, dentro de dois `gsap.ticker`. Um setState por frame re-renderizaria a
 * árvore 60×/s; um Context faria o mesmo com os consumidores. O valor não é
 * estado de UI — nada re-renderiza por causa dele —, é um número que dois
 * tickers trocam. Variável de módulo é a estrutura honesta pra isso.
 *
 * SEMÂNTICA DO `null` — é a parte que importa: `null` significa "NÃO HÁ
 * CORTINA DIRIGINDO". Acontece em três situações reais:
 *   1. A ARoberta está em `mode !== "pinned"` (mobile, viewport < 1024px, ou
 *      prefers-reduced-motion) — não existe pin, não existe cortina.
 *   2. A ARoberta desmontou (cleanup do useGSAP).
 *   3. Ninguém publicou ainda (estado inicial do módulo).
 * Nos três, o Features precisa cair no caminho de fallback (entrada em tempo
 * real por ScrollTrigger) em vez de esperar por um progresso que nunca vem.
 * `null` NÃO é "progresso zero" — {p:0, eased:0} é um estado legítimo e
 * distinto (a cortina existe, só não abriu ainda).
 *
 * NÃO é um evento, é um ESTADO RETIDO. O ticker da ARoberta tem um early-out
 * (`Math.abs(p - lastP) < 0.0005`) que o faz publicar só quando `p` muda de
 * fato — nos platôs (p parado em 0 ou em 1) ele não republica nada. O último
 * valor escrito continua valendo até alguém escrever outro; quem lê nunca
 * precisa ter estado presente no frame em que o valor foi produzido.
 */

export type TransitionProgress = {
  /** Progresso linear da janela: 0 = Features tocou a base da tela, 1 = topo. */
  p: number;
  /** `p` passado pela ease `pageTransition`. É o que dirige a borda da
   *  cortina (screen-y = (1 - eased) * vh) — e por isso é o que dirige a
   *  timeline do Features. Ver Features.tsx. */
  eased: number;
};

let state: TransitionProgress | null = null;

export const setTransitionProgress = (next: TransitionProgress | null) => {
  state = next;
};

export const getTransitionProgress = (): TransitionProgress | null => state;

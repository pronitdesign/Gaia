"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ScrollPhone = dynamic(() => import("./ScrollPhone"), { ssr: false });

/**
 * Adia a MONTAGEM do ScrollPhone — e, com ela, o download do chunk do three.js.
 *
 * `dynamic(ssr:false)` sozinho não resolvia: o Next injeta o preload do chunk
 * quando o componente está na árvore do primeiro render, então os 164KB (659KB
 * descomprimidos) do three entravam no boot junto com todo o resto. E como o
 * play() da intro só acontece DEPOIS da hidratação, esse peso adiava a intro
 * inteira: medido em 3G lento, a intro só começava a rodar em 11,5s.
 *
 * O aparelho só aparece perto de y≈10000, então qualquer um destes gatilhos
 * chega com folga larga:
 *   · primeiro scroll — se a pessoa rolar, ela está indo pra lá;
 *   · idle — a thread vagou, pode carregar sem competir com nada;
 *   · teto de 4s — rede/CPU ruins podem nunca dar idle; sem o teto o aparelho
 *     poderia não estar pronto se a pessoa descesse muito rápido.
 *
 * Não muda nada de visual: o componente é `fixed` e por dentro já decide quando
 * aparecer pelo scroll. O que muda é só o instante em que ele entra no DOM —
 * e, portanto, quando os ScrollTriggers dele nascem (todos com refreshPriority
 * 0, abaixo dos pins de HeroGrid/ComoComecar/ARoberta, que são quem manda na
 * ordem de refresh).
 */
/* ── O APARELHO 3D NÃO EXISTE ABAIXO DE lg ─────────────────────────────────
 *
 * Decisão de 2026-07-31, e ela REVERTE a régua "mobile recebe a mesma cena".
 * O motivo é peso, não viewport: no celular o aparelho custa o chunk do three
 * (164KB, 659KB descomprimidos) + scene.glb (868KB) + o decoder Draco (87KB) +
 * um contexto WebGL com render targets vivos durante toda a travessia — e ele
 * é decoração. É o maior item isolado do orçamento numa faixa de aparelhos que
 * já apanha do resto da página.
 *
 * O gate é `lg` (1024px) porque é a MESMA aresta que o DOM das três seções já
 * usa pra trocar de montagem (Features: `lg:hidden`/`lg:block` no card do
 * Prontuário; Pricing: idem no bloco de preço). Um gate diferente aqui criaria
 * uma faixa onde o overlay procura âncora que a montagem daquele breakpoint não
 * declara — o aparelho pousando no vazio.
 *
 * O que substitui: no Prontuário, nada (o card fecha na altura do conteúdo); no
 * Pricing, o mesmo <PhoneScreen> em DOM, que é HTML puro e não pede GPU.
 *
 * Nada aqui é fallback por reduced-motion — esse contrato continua sendo do
 * ScrollPhone por dentro. */
const DESKTOP_MQ = "(min-width: 1024px)";

export default function ScrollPhoneDeferred() {
  const [montar, setMontar] = useState(false);
  // Começa `false` e não `matchMedia(...)` de propósito: o componente é
  // ssr:false, mas ler a MQ no corpo do render ainda faria o primeiro render do
  // cliente depender de layout. O efeito abaixo resolve antes de qualquer
  // gatilho de montagem chegar a importar.
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const decide = () => setDesktop(mq.matches);
    decide();
    // Rotacionar tablet ou redimensionar janela atravessa a aresta: o overlay
    // some/volta junto com a montagem DOM que ele lê, sem recarregar.
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, []);

  useEffect(() => {
    let idleId: number | undefined;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let tetoId: ReturnType<typeof setTimeout> | undefined;
    const go = () => setMontar(true);

    // O idle sozinho disparava DENTRO da intro. Enquanto a cortina está no ar a
    // thread fica ociosa de propósito (quem anima é o vídeo, no compositor), o
    // requestIdleCallback lê isso como "pode carregar" e solta scene.glb (797KB)
    // + o decoder Draco (87KB) no exato trecho em que a banda é do LCP. Medido:
    // 884KB entrando antes do hero pintar, num orçamento de ~2,9MB até o LCP.
    //
    // O gatilho passa a ser o FIM da intro (evento da LoadingScreen), com os
    // mesmos escapes de antes por baixo. O aparelho só aparece perto de y≈10000
    // — mesmo o teto mais folgado chega muito antes de ser preciso.
    const agendar = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(go, { timeout: 4000 });
      } else {
        timerId = setTimeout(go, 2000);
      }
    };

    // Rolou = está indo pra lá; carrega já, sem esperar cortina nem idle.
    window.addEventListener("scroll", go, { once: true, passive: true });

    // Sem intro nesta navegação (sessão já viu, ou SPA): agenda direto.
    const introJaFoi =
      document.documentElement.dataset.introDone === "1" ||
      sessionStorage.getItem("gaia-loading-done") === "1";

    if (introJaFoi) {
      agendar();
    } else {
      window.addEventListener("gaia:intro-done", agendar, { once: true });
      // Rede de segurança: se o evento nunca vier (erro na intro, aba em
      // background que não roda rAF), não dá pra deixar o aparelho fora do DOM.
      tetoId = setTimeout(agendar, 8000);
    }

    return () => {
      window.removeEventListener("scroll", go);
      window.removeEventListener("gaia:intro-done", agendar);
      if (idleId !== undefined && "cancelIdleCallback" in window)
        window.cancelIdleCallback(idleId);
      if (timerId) clearTimeout(timerId);
      if (tetoId) clearTimeout(tetoId);
    };
  }, []);

  // `desktop` primeiro: os gatilhos acima podem já ter armado `montar` antes de
  // a MQ resolver, e o que decide o import do chunk é este return.
  return desktop && montar ? <ScrollPhone /> : null;
}

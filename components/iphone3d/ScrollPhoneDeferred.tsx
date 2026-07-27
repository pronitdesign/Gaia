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
export default function ScrollPhoneDeferred() {
  const [montar, setMontar] = useState(false);

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

  return montar ? <ScrollPhone /> : null;
}

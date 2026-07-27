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
    const go = () => setMontar(true);

    window.addEventListener("scroll", go, { once: true, passive: true });
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(go, { timeout: 4000 });
    } else {
      timerId = setTimeout(go, 2000);
    }

    return () => {
      window.removeEventListener("scroll", go);
      if (idleId !== undefined && "cancelIdleCallback" in window)
        window.cancelIdleCallback(idleId);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  return montar ? <ScrollPhone /> : null;
}

"use client";

import { useCallback, useEffect, useState } from "react";

/* Ciclo autônomo — avança um índice a cada `delay`ms, mas SÓ enquanto o
   elemento observado está em vista (economiza CPU) e nunca sob
   prefers-reduced-motion. Devolve o índice atual + o ref pra prender no
   elemento observado. É o motor das micro-interações "vivas" (paciente que
   troca, agora que desce, insight que pisca, chip de aba que alterna). Usado
   pelos mocks vivos do Features e pela tela "Prontuário" dentro do iPhone 3D.

   O nó observado é STATE, não useRef — motivo: com useRef, o efeito abaixo
   só tem UMA chance de encontrar `ref.current` preenchido (a execução logo
   após o primeiro mount, já que `length`/`delay` não mudam depois disso —
   suas dependências ficam estáveis pro resto da vida do componente). Se o nó
   DOM por trás do ref for trocado mais tarde por qualquer motivo, o efeito
   nunca fica sabendo e o ciclo morre em silêncio, parado pra sempre — sem
   erro, sem re-tentativa. Isso é um risco concreto aqui, não hipotético: o
   uso dentro da tela do iPhone (PhoneScreen, via ScreenHtml em
   IPhoneModel.tsx) roda numa React root SEPARADA, criada pelo próprio <Html
   transform> do drei (node_modules/@react-three/drei/web/Html.js chama
   `root.current.render(...)` de novo a cada re-render do <Html> — sem
   array de dependências no useLayoutEffect que faz isso). Cada uma dessas
   chamadas passa uma árvore NOVA pra uma root React 18 concorrente, e
   qualquer reconciliação que trate isso como remonte (em vez de update) da
   subárvore troca o nó por baixo do nosso ref sem o nosso efeito re-rodar.
   Usar callback ref + state resolve isso pela raiz: o React invoca a
   callback toda vez que o nó anexa OU desanexa, então o efeito abaixo (que
   depende de `el`, não de um ref opaco) SEMPRE re-executa quando o nó muda —
   garantido pelo próprio contrato de refs, não por sorte de timing. */
export function useAutoCycle(length: number, delay: number) {
  const [i, setI] = useState(0);
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => setEl(node), []);

  useEffect(() => {
    if (!el || length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number | undefined;
    const start = () => {
      if (timer === undefined) timer = window.setInterval(() => setI((p) => (p + 1) % length), delay);
    };
    const stop = () => {
      if (timer !== undefined) { window.clearInterval(timer); timer = undefined; }
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); stop(); };
  }, [el, length, delay]);

  return [i, ref] as const;
}

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
/* `entered` — vira true na PRIMEIRA vez que o nó aparece e nunca mais volta.
   É o gatilho das entradas de assinatura dos cards do Features (o gráfico que
   se plota, o baralho que se abre, as agulhas que assentam): coisas que
   acontecem uma vez, quando o card chega, e não a cada ida e volta do scroll.

   Mora AQUI e não num hook próprio porque o observer já existe: todo mock que
   precisa da entrada já chama este hook pro ciclo, e um segundo
   IntersectionObserver no mesmo nó seria o mesmo trabalho duas vezes. */
export function useAutoCycle(length: number, delay: number) {
  const [i, setI] = useState(0);
  const [entered, setEntered] = useState(false);
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => setEl(node), []);

  useEffect(() => {
    if (!el) return;
    // Sem movimento: a cena nasce montada. `entered` sobe na hora (senão as
    // entradas de assinatura ficariam presas no estado inicial pra sempre —
    // gráfico não plotado, baralho fechado), mas o CSS neutraliza a transição
    // de cada uma, então o resultado é o estado final direto, sem animação.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntered(true);
      return;
    }
    let timer: number | undefined;
    const start = () => {
      if (length > 1 && timer === undefined) timer = window.setInterval(() => setI((p) => (p + 1) % length), delay);
    };
    const stop = () => {
      if (timer !== undefined) { window.clearInterval(timer); timer = undefined; }
    };
    // DOIS gates, e não um, porque entrar e ciclar não têm o mesmo requisito:
    //
    // `entered` dispara no PRIMEIRO PIXEL. Tem que ser assim porque quem monta
    // a casca do card é outro observer (o do Features, a 20% do CARD) e este
    // aqui observa o mock, que é mais baixo e começa mais embaixo. Com um gate
    // único de 35%, existe uma faixa em que a casca já chegou e o conteúdo
    // ainda não — e parado nela o card fica montado e VAZIO: painel de vidro
    // com cabeçalho e nada dentro, gráfico com eixo e sem linha. Não é um
    // flash de um frame, é um estado estável (medido: mock a 34% de visível,
    // painel apresentado, seis instrumentos invisíveis). Conteúdo só pode
    // estar escondido enquanto está fora da tela.
    //
    // O ciclo continua exigindo 35% — animar sozinho pra ninguém é o que ele
    // sempre quis evitar, e agora ele PARA de verdade ao sair: com threshold
    // só em 0.35 o callback nem era chamado quando o elemento saía de vez
    // (0.34 → 0 não cruza 0.35), então o stop() ficava inalcançável.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setEntered(true);
      if (e.intersectionRatio >= 0.35) start();
      else stop();
    }, { threshold: [0, 0.35] });
    io.observe(el);
    return () => { io.disconnect(); stop(); };
  }, [el, length, delay]);

  return [i, ref, entered] as const;
}

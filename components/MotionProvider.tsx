"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

/**
 * LazyMotion no lugar do runtime cheio do framer-motion (auditoria Felix 2.1):
 * os componentes usam `m.*` e este provider injeta só o pacote `domAnimation`
 * (animações, exit, whileInView, gestos) — o que o site usa, e nada de
 * drag/layout, que são o resto do peso do chunk. ~20–30KB de gzip a menos no
 * first-load, sem mudar um frame de comportamento.
 *
 * SEM `strict` de propósito: com strict, um `motion.*` esquecido vira THROW em
 * produção — e sem error boundary por cima isso desmonta a árvore inteira (a
 * mesma classe de queda que o CenaOpcional existe pra conter, ver o comentário
 * lá). Sem strict, um esquecimento só carrega o bundle cheio de volta: perde a
 * economia, não a página. O contrato "todo mundo usa m.*" é garantido por
 * grep no código, não por crash em runtime.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}

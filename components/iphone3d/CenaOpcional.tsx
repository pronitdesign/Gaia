"use client";

import { Component, type ReactNode } from "react";

/**
 * Contém a falha de uma cena DECORATIVA para que ela não leve a página junto.
 *
 * Existe porque `/models/scene.glb` falhando derrubava a landing INTEIRA:
 * medido bloqueando o arquivo num viewport de iPhone — `document.
 * documentElement.scrollHeight` caía de 18746 para 932, `scrollY` travava em 0
 * e não sobrava um `<canvas>`. O erro do loader sobe pelo Suspense do Canvas,
 * ninguém captura, e o React desmonta a árvore inteira a partir do `<main>`.
 *
 * Não é hipótese de laboratório: o glb tem 868 KB e é o ÚLTIMO peso a chegar
 * (o ScrollPhone é adiado até `gaia:intro-done` + idle). Numa rede de celular
 * que oscila, esse é justamente o fetch com mais chance de morrer — e o
 * resultado era a pessoa ficar olhando uma tela em branco de 932px.
 *
 * O que ele NÃO faz: tentar de novo, avisar, ou pintar fallback. O aparelho 3D
 * é overlay decorativo — a página inteira funciona sem ele, e é exatamente esse
 * o comportamento desejado quando ele não carrega. Fica o silêncio, não o breu.
 */
export default class CenaOpcional extends Component<
  { children: ReactNode },
  { caiu: boolean }
> {
  state = { caiu: false };

  static getDerivedStateFromError() {
    return { caiu: true };
  }

  componentDidCatch(erro: unknown) {
    // Sem `throw` e sem UI: só deixa rastro pra quem for investigar depois.
    console.warn("[gaia] cena 3D não carregou; a página segue sem ela.", erro);
  }

  render() {
    return this.state.caiu ? null : this.props.children;
  }
}

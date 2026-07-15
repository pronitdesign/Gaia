"use client";

/*
Mergulho — o capítulo da água, entre o Manifesto e o Pricing.

POR QUE ISTO É UMA SEÇÃO E NÃO UM EFEITO NO MANIFESTO:
A sequência pedida tem três atos — as duas frases, a travessia da água, o Pricing
— e três atos não cabem em dois tempos de scroll. Medido, com a água morando no
Manifesto de 160vh:

    p≈0.5   água no pico  → afogava "A Gaia cuida do resto."
    p≈0.68  texto saindo  → phone em cy 1150, ABAIXO da dobra (viewport 900)
    p≈0.9   texto passou  → o mergulho atropelava o pouso no slot do Pricing

Não existia janela em que o texto já tivesse passado, o phone estivesse em quadro
e o Pricing ainda não tivesse chegado. O phone já mergulhava abaixo da dobra no
miolo do Manifesto antes desta feature existir — o cy dele é um lerp entre duas
âncoras muito afastadas, e o meio do caminho cai fora da tela. Dar scroll próprio
à água é o que cria a janela.

(Não tente resolver esticando o Manifesto: já foi tentado, 160→240vh, e mede
PIOR — afastar as âncoras aumenta o balanço do lerp, não a demora. O phone foi
de cy 1150 pra 1288.)

A PALETA SAI DA COSTURA:
Esta seção nasce no #FAF9F5 onde o Manifesto morre e entrega o Pricing no mesmo
tom. Isso não é só emenda — é o que faz a água ficar PÁLIDA. A água reflete o céu
da cena, o céu daqui é este creme, logo o reflexo é claro e entra no submerso do
Pricing sem salto. Quando esta água morava no Manifesto ela refletia o topo
daquele gradiente (#0A0C11, o preto do Features) e lia como piche. Clarear a cor
da água não resolvia: no ângulo rasante quem manda é o reflexo, não a cor.

A ÁGUA NÃO É RENDERIZADA AQUI. Ela vive no Canvas do ScrollPhone, porque reflexão
planar só reflete objetos da MESMA cena 3D — e o phone tem que aparecer no
reflexo. Esta seção só oferece o fundo e as âncoras que o ScrollPhone lê vivas.
*/

import { diveGradientCss, WATER_LINE } from "@/lib/sky";

/* Os stops moram em lib/sky.ts porque o skydome do ScrollPhone (que existe só
   pra água ter o que refletir) precisa dos MESMOS valores — se as duas listas
   divergirem, o reflexo mostra um céu diferente do céu. */
const DIVE_SKY = diveGradientCss();

/* mesmo grão do Manifesto/Pricing — sem ele um gradiente longo e claro faz
   banding em tela boa */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function Mergulho() {
  return (
    <section
      aria-hidden
      /* data-sky-dive: par do data-sky-manifesto. A névoa amostra o gradiente da
         seção que estiver na altura do horizonte — ver NÉVOA em ScrollPhone. */
      data-sky-dive
      /* 120vh: um viewport pro mergulho respirar mais o que sobra pro phone
         chegar e sair sem a água ainda em cena. Menos que isso e voltamos a
         espremer os três atos. Desktop-only por dentro (o ScrollPhone é lg:),
         mas a seção existe no mobile como respiro claro entre Manifesto e
         Pricing — sem ela, lá, o creme do fim do Manifesto encostaria direto no
         creme do Pricing e a emenda ficaria longa demais sem nada acontecendo. */
      className="relative min-h-[70vh] overflow-hidden lg:min-h-[120vh]"
      style={{ background: DIVE_SKY }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
        style={{ backgroundImage: NOISE, backgroundSize: "140px" }}
      />

      {/* Âncora da linha d'água. O ScrollPhone lê o rect vivo dela por frame
          (mesmo padrão de [data-phone-start]/[data-phone-end]) pra saber onde a
          superfície mora. Não pinta nada. */}
      <div
        aria-hidden
        data-water-start
        className="pointer-events-none absolute left-0 h-0 w-full"
        style={{ top: `${WATER_LINE * 100}%` }}
      />

      {/* Ponto de passagem do phone: é AQUI que ele cruza a superfície, deitado.
          Sem esta âncora ele lerparia direto do card do Features pro slot do
          Pricing e afundaria abaixo da dobra no meio — que é exatamente o bug
          que esta seção existe pra consertar. Centralizado na linha d'água. */}
      <div
        aria-hidden
        data-phone-water
        className="pointer-events-none absolute left-1/2 h-[560px] w-[300px] -translate-x-1/2 -translate-y-1/2"
        style={{ top: `${WATER_LINE * 100}%` }}
      />
    </section>
  );
}

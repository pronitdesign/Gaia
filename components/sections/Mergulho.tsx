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

import { diveGradientCss } from "@/lib/sky";

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
      /* ESTA SEÇÃO É O AR. Ela ACABA na superfície — e é isso, hoje, que ela é.
         Antes eram 120vh com a linha d'água no meio (WATER_LINE 0.5), e a
         consequência era um desencontro medido de 472px: o horizonte de WebGL
         caía em 50% da TELA (geometria de câmera nivelada) e a emenda com o
         Pricing ficava meio viewport ABAIXO dele. Duas linhas em quadro, e
         nenhuma era a outra. A de baixo era a de verdade e ninguém a usava.
         A regra agora é uma só: a linha da superfície É o topo do Pricing. Logo
         o Mergulho é só o ar acima dela, e o que estiver abaixo é o Pricing,
         submerso, visto ATRAVÉS da água (ver a derivação do pitch em
         ScrollPhone). O scroll do mergulho não precisa mais morar aqui: ele vem
         de graça do Pricing subindo, que é um viewport inteiro.
         6vh, E ELA NÃO É MAIS UMA ESCOLHA — É UM RESTO.
         (Foi 15vh por uma rodada; a Pronit olhou e pediu a água MAIS PRA CIMA.
         O vão texto→superfície estava em 310px — 66 do line-box do texto, 126
         do pb do Manifesto, 118 daqui. Cortou-se dos dois lados: 6vh aqui e
         pb 8vh lá, vão final ~176px. Se um dia subir de novo, é ESTE número
         que a Pronit calibra a olho — os dois paddings são só onde ele mora.)
         Foram 120vh (a água morava aqui e precisava de scroll próprio), depois
         60vh. Os dois números morreram pelo mesmo motivo: a partir do momento em
         que a linha É a base desta seção, a altura daqui deixou de ser "quanto
         respiro o mergulho quer" e virou "a que DISTÂNCIA a última frase do
         Manifesto fica da água" — porque é exatamente isso que ela mede.
         E a resposta é: perto. Medido, com 60vh, a base de "A Gaia cuida do
         resto." ficava a 882px da linha — 1.12 VIEWPORTS. Com o texto em quadro
         a água estava um viewport abaixo da dobra, ou seja: não existia mar
         nenhum na frase. Era o oposto do pedido ("assim que sair esse texto já
         deve aparecer o mar; o texto deve estar bem próximo à superfície") e uma
         regressão que a própria regra causou — antes o mar aparecia ali porque a
         linha era um artefato de TELA (pitch 0 ⇒ 50% da janela, solto do
         layout). Amarrada ao DOM, ela passou a obedecer o DOM, e o DOM tinha
         quase um viewport de ar sobrando.
         O scroll do mergulho não mora mais aqui: ele vem dos 70vh do topo do
         Pricing (ver lá). É por isso que esta seção pode encolher sem espremer
         nada — ela não carrega mais tempo, só distância.
         Mobile é 10vh e sem água nenhuma: lá isto é só um respiro fino de navy
         entre o Manifesto e o campo do Pricing. Foi 70vh, depois 42vh, e a Pronit
         ainda via "esse espaço" — o phone boiando num vão navy vazio antes do
         campo entrar (Image #4, 2026-07-22). No mobile o Mergulho não carrega
         água nenhuma, então o vão era 100% vestigial: DIVE_STOPS é #151948
         chapado e o topo do campo tem o mesmo slab #151948, então encurtar de
         42→10vh é só cortar navy contra navy, sem emenda de cor. O pb do
         Manifesto caiu junto (30→10vh); os dois somados eram os ~670px do vão.

         Desde 2026-07-31 não passa aparelho nenhum por aqui no mobile: o
         ScrollPhone só monta em lg+ (ver ScrollPhoneDeferred). O
         [data-phone-water] abaixo continua declarado porque é a montagem ÚNICA
         desta seção — não há ramo lg:hidden pra podar — e no mobile ele é uma
         caixa vazia que ninguém consulta. Em lg+ ele segue sendo o ponto em que
         o phone cruza a superfície, e é aí que ele precisa estar. */
      /* -mt-px: fecha a fresta de 1px em que o creme do <body> vazava entre o
         Manifesto e esta seção (alturas em vh dão px fracionário → gap de
         subpixel). Puxa o Mergulho 1px pra cima, sobre a borda do Manifesto —
         invisível porque as duas encostam no mesmo #C0B0D7. Medido: matava a
         linha #CEC2DD full-width em y≈684 @1440. */
      className="relative -mt-px min-h-[10vh] overflow-hidden lg:min-h-[6vh]"
      style={{ background: DIVE_SKY }}
    >
      {/* COSTURA MOBILE (2026-07-31). O Manifesto saiu do mobile (ver o `hidden
          lg:flex` lá) e levou junto o gradiente que descia do preto do Features
          (#0A0C11) até o navy em que o campo do Pricing abre. Sem ele, o preto
          encostava no #151948 chapado desta seção numa linha reta full-width —
          vista no render, não deduzida. Esta camada é a rampa que faltou, e ela
          mora aqui porque esta seção JÁ É o respiro entre as duas: nenhum pixel
          de altura foi somado, só o navy chapado virou descida.

          Stops eased (não dois pontos): a rampa nasce quase preta e só abre
          depois de um terço, então a quina com o preto CHAPADO do Features não
          tem quebra de segunda derivada — é a mesma armadilha de banda de Mach
          documentada em lib/sky.ts, agora numa faixa de ~84px, curta demais pra
          perdoar slope no topo.

          `lg:hidden`: em lg+ o Manifesto continua no ar entregando o navy, e o
          DIVE_SKY chapado é o que a ÁGUA reflete (DIVE_STOPS é fonte única com
          o skydome do Sky3D — cobrir isso no desktop mudaria o reflexo). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 lg:hidden"
        style={{
          background:
            "linear-gradient(to bottom, #0A0C11 0%, #0B0E1B 34%, #0F1330 68%, #151948 100%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
        style={{ backgroundImage: NOISE, backgroundSize: "140px" }}
      />

      {/* A LINHA. É a borda de baixo da seção — ou seja, o topo do Pricing.
          Não é mais uma fração daqui: `WATER_LINE` morreu porque a resposta
          deixou de ser um número e virou uma ARESTA.
          Quem lê: o ScrollPhone, por frame, pra derivar o pitch da câmera que
          põe o horizonte exatamente aqui (é a regra da seção); e o Sky3D, pelo
          parentElement, pra mapear este gradiente no skydome que a água
          reflete. Não pinta nada. */}
      <div
        aria-hidden
        data-water-start
        className="pointer-events-none absolute bottom-0 left-0 h-0 w-full"
      />

      {/* Ponto de passagem do phone: é AQUI que ele cruza a superfície. Sem esta
          âncora ele lerparia direto do card do Features pro slot do Pricing e
          afundaria abaixo da dobra no meio. Centralizado na linha — que agora é
          a emenda, então translate-y-1/2 o põe metade no ar, metade na água. */}
      <div
        aria-hidden
        data-phone-water
        className="pointer-events-none absolute bottom-0 left-1/2 h-[560px] w-[300px] -translate-x-1/2 translate-y-1/2"
      />
    </section>
  );
}

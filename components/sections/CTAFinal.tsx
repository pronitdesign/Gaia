"use client";

import {
  useEffect,
  useRef,
  useState,
  type Ref,
  type SyntheticEvent,
} from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconArrowUpRight, IconCheck } from "@/components/ui/icons";
import Footer from "@/components/sections/Footer";

gsap.registerPlugin(ScrollTrigger);

/* ── CTA Final ─────────────────────────────────────────────────────────────
   Fechamento da página — o momento mais quente (Figma 60:65 / 9:553).
   Âncora de motion: CTA da Zipline. A section não é mais uma tela: é uma
   PISTA de 400vh com um PALCO sticky de 100vh. O scroll não empurra a cena,
   ele a executa — mask, DUAS câmeras e texto são tempos de uma só timeline
   scrubada no eixo da section. São dois vídeos: o pull-back que traz a mulher
   com o tablet, e o pull-out que abre pro campo e apresenta o footer.

   Os tempos (progresso 0→1 da pista):
     · MASK   0    → 0.25 — o telhado abre NO COMPASSO da entrada: a subida do
       palco gasta os primeiros 100vh da pista (=0.25 de 400vh) e o arco fecha
       EXATO nesse ponto, virando retângulo full-bleed (sem creme) no mesmo
       instante em que a tela enche. Nunca antes — senão o arco fica pronto com
       a section de cima ainda no topo. Frase e vídeo só depois que ela encheu.
     · FRASE  0.25 → 0.40 — "Enquanto você atendia, a Gaia anotou." Só assenta
       DEPOIS que a tela encheu (entra 0.25→0.31, com o arco recém-fechado) e
       morre cavalgando o início do scrub do vídeo 1 (0.31): quem dispensa a
       frase é a câmera se mexendo, não um fade avulso. Só existe na primeira
       cena — câmera fechada na tela do tablet, antes do pull-back.
     · DIM    0    → 0.45 — a primeira cena entra ESCURA (CSS, desde o mount) e
       fica cheia durante toda a subida; a luz só SOBE em 0.31→0.45, dentro do
       mesmo pull-back que tira a frase: a câmera saindo é quem apaga o texto E
       acende a cena, num sentido só. Ver o comentário de `sceneDim` no corpo.
     · VÍDEO 1 0.31 → 0.46 — o scroll é a agulha: pull-back saindo da tela do
       tablet até a mulher segurando o iPad. Só começa DEPOIS da tela cheia.
     · RECORTE 0.46 → 0.50 — a image280 (alpha, mesmo pixel do frame final do
       vídeo 1) faz fade por cima do vídeo. Invisível por definição; existe pra
       não ter pop de decode quando ela passa a ser o que segura a cena.
     · CTA    0.48 → 0.72 — headline + botão sobem de cima do corpo dela, POR
       TRÁS da mulher, e assentam AO LADO DO TABLET. Não acima dela: com a
       cena full-bleed a cabeça fica em y≈72 e não existe teto. A coluna roxa
       à direita do tablet é o único vazio real da tela.
     · HOLD   0.72 → 0.80 — pausa. Nada se move: é o tempo de ler o CTA.
     · VÍDEO 2 0.80 → 1.0 — "assim que o texto está no lugar, remove a imagem e
       entra o outro vídeo". O recorte sai por baixo e o vídeo 2 entra na MESMA
       pose (crossfade trava a silhueta, sem pop), opaco em z-40 cobre CTA e
       recorte, e o pull-out abre pro campo — é ele que apresenta o footer.
       Durante o fade (0.80→0.86) o vídeo SEGURA o frame 0; o scrub da câmera
       só corre em 0.86→1.0, quando a camada já está opaca (ver wire(v2)).

   O FOOTER não está no palco. Ele vive depois da pista, em fluxo normal: o
   palco solta, o vídeo 2 já abriu pro campo e o footer sobe ABAIXO DA LINHA
   DE BAIXO da cena (ver SCENE_BOX). Bônus: fora do sticky, o reveal interno
   do próprio Footer volta a disparar sozinho.

   Ordem de camadas (baixo→cima): vídeo 1 → wash → base → CTA → recorte →
   vídeo 2. O recorte (a mulher e o tablet, no mesmo alpha) fica na frente do
   texto — é o que faz o CTA passar atrás dela; o vídeo 2 fica na frente de
   tudo — é o que cobre a cena e leva pro footer.

   Por cima do vídeo: wash de marca (lavanda→escuro) + scrim central
   (legibilidade AA) + scrim de base forte + luz aurora fluindo — tudo DENTRO
   do clip, senão os scrims pintariam por cima do creme, fora do arco.
   Tudo respeita prefers-reduced-motion. */

// Fundo do CTA — pull-back de câmera de 5s (121 frames), scrubado pelo scroll:
// abre fechado na tela do tablet (o workspace da Gaia) e termina na pessoa
// segurando o iPad. Encodado all-intra — todo frame é keyframe, então o seek é
// instantâneo e o scrub não engasga. Duas fontes por peso; a escolha é feita uma
// vez no mount, pelo viewport (ver `sources`).
const CTA_VIDEO_LG = "/video/cta-tablet-1920.mp4";
const CTA_VIDEO_SM = "/video/cta-tablet-1280.mp4";
// Vídeo 2 — o PULL-OUT que apresenta o footer. Parte da MESMA pose do recorte
// (frame 0 = a mulher segurando o tablet, registro idêntico à image280) e abre
// a câmera até o campo de flores. Também all-intra pelo mesmo motivo do vídeo 1:
// o scrub é a agulha, o seek tem que ser instantâneo. Dois pesos por viewport.
const CTA_FIELD_LG = "/video/cta-field-1920.mp4";
const CTA_FIELD_SM = "/video/cta-field-1280.mp4";
// Recorte da Roberta com alpha — é EXATAMENTE o último frame do vídeo, com
// registro pixel-perfect verificado. Assenta invisível por cima do frame final
// desde que a caixa seja idêntica à do vídeo (ver SCENE_BOX + MEDIA).
const CTA_CUTOUT_LG = "/video/cta-roberta-cutout.webp";
const CTA_CUTOUT_SM = "/video/cta-roberta-cutout-sm.webp";
// Frame 0 — cobre o vídeo enquanto ele carrega.
const CTA_POSTER = "/video/cta-tablet-poster.webp";
// Frame 0 do vídeo 2 (a mulher na mesma pose do recorte) — cobre o vídeo 2
// enquanto ele carrega, então mesmo antes de decodar o crossfade já casa a pose.
const CTA_FIELD_POSTER = "/video/cta-field-poster.webp";
// O DESTINO DA CÂMERA, em arte — não o frame final extraído do mp4. É ela que
// SEGURA a cena depois que o pull-out acaba, e ela existe por QUALIDADE: o
// último frame do vídeo chega comprimido (H.264 gasta bitrate no movimento e
// entrega o repouso em papa — flor do primeiro plano vira mancha), e é
// justamente esse frame que fica parado na tela enquanto a pessoa lê o footer
// inteiro. O webp entra por cima no fim do scrub e devolve a pétala.
// Serve TAMBÉM de fundo do footer (ver o bloco do footer lá embaixo): a mesma
// arte nas duas pontas é o que faz a cena continuar por trás do rodapé.
const CTA_FIELD_END = "/video/cta-field-bg.webp";
// Último frame (cena aberta) — o que reduced-motion recebe: sem vídeo baixado,
// o usuário vê direto o destino da câmera em vez do ponto de partida.
const CTA_STILL = "/video/cta-tablet-still.webp";
// A CAIXA DA CENA. O vídeo e o recorte compartilham ESTA string, palavra por
// palavra. Qualquer divergência de geometria entre os dois (transform, scale,
// object-position, aspecto do container) desalinha o recorte do frame e a tela
// mostra DUAS Robertas — a do vídeo e a do recorte. Não versionar por camada.
//
// FULL-BLEED: a cena toma a section inteira. Sem chapa atrás, sem borda suave —
// não há lacuna pra disfarçar, então nada disso existe mais.
//
// A conta que manda aqui: a Roberta ocupa 92% da altura do frame (a cabeça dela
// começa a 8% do topo). Com `object-cover` enchendo a section, a altura inteira
// do frame cai na viewport e a cabeça fica em y≈72 — não há teto pro texto.
// Por isso o CTA vai AO LADO do tablet, não acima dela: é o único vazio real.
const SCENE_BOX = "absolute inset-0";
// Preenchimento da caixa — o <video> e o <img> do recorte usam o MESMO.
// `object-[100%_50%]` (ancorar à direita) não é estética: em 1440 o cover cria
// 172px de sobra horizontal, e ancorar à direita gasta ela toda cortando o lado
// ESQUERDO do frame — o que empurra o tablet de x≈1107 pra x≈1021 e alarga a
// coluna livre à direita de 333px pra 419px. É essa coluna que o CTA ocupa.
// Vale pro vídeo E pro recorte: divergir aqui desalinha o registro.
//
// `scale-110 -translate-x-[5%]` é o empurrão: a tipografia desloca ela pra
// esquerda. Precisa dos dois juntos — sozinho, o translate abriria um vazio na
// direita (o cover não tem mais sobra pra gastar depois do `object-[100%]`); o
// scale-110 dá os 72px de folga que o translate de 5% consome, exatos. Mais
// translate que isso e o pé direito do vídeo descola da borda.
const MEDIA =
  "h-full w-full object-cover object-[100%_50%] scale-110 -translate-x-[5%]";

// ── RETRATO: full-height + panorâmica que segue o sujeito ────────────────────
// Tudo acima foi calibrado em 1440, onde a sobra horizontal do cover é 172px e
// a tela mostra 89% do frame. Em retrato a conta vira outra: o frame é 1.79:1
// e a viewport 0.46:1, então o cover escala pela ALTURA e a sobra explode. A
// PEDIDO DA PRONIT a cena agora é FULL-HEIGHT no celular (não mais a caixa 4/5
// que houve aqui): num box de 390×844 o cover escala o frame de 1280×714 pra
// 1513×844, sobra 1123px, e a janela visível é **390 de 1513 = 26% do frame**.
//
// 26% não hospeda o cluster tablet+rosto de uma vez: no frame final do
// pull-back o tablet e o rosto juntos ocupam ~36% da largura. Ancorar fixo
// cortaria um dos dois — foi por isso que a caixa 4/5 existia. A saída que a
// Pronit pediu no lugar dela é PANORÂMICA: como o primeiro vídeo é um pull-back,
// o sujeito ANDA dentro do quadro (frame 0 = tela do tablet fechada, centro
// ~0.32; frame final = mulher segurando o iPad, cluster centrado ~0.46), então
// a janela de 26% desliza junto — `object-position` X de ~30% (fechado no
// tablet) a ~46% (mulher+tablet), preso ao scrub do vídeo. Assim os dois ficam
// SEMPRE centrados e só a franja (cabelo, prado, borda do tablet) cai fora, que
// é perda invisível. Quem escreve esse X é o `matchMedia` no useGSAP (portrait
// only) — ver lá; aqui o `object-[40%_50%]` é só o VALOR ESTÁTICO: o que o SSR,
// o reduced-motion (still) e o primeiro paint mostram antes de a panorâmica
// assumir. 40% é o meio do trajeto, então o still nasce com os dois no quadro.
//
// `scale-110 -translate-x-[5%]` SAI aqui de propósito: os dois só existem pra
// fabricar folga que o `object-[100%]` do desktop consome (ver o comentário
// acima). Em retrato eles cortariam de novo o que a panorâmica recupera.
//
// Gate por ASPECTO, não por largura: é o COMPLEMENTO EXATO do
// `[@media(min-aspect-ratio:4/3)]` que já governa o recorte da Roberta (ver o
// JSX dele) — onde a panorâmica entra, o recorte não existe, e vice-versa. Um
// gate por `max-width` divergiria dos dois em tablet retrato, que sofre o
// mesmo esmagamento (medido: sobra de 1295px em 820×1180).
const MEDIA_PORTRAIT =
  "[@media(max-aspect-ratio:4/3)]:object-[40%_50%] [@media(max-aspect-ratio:4/3)]:scale-100 [@media(max-aspect-ratio:4/3)]:translate-x-0";

// A CENA DA ROBERTA — vídeo 1, still, recorte E vídeo 2. Os quatro têm que
// compartilhar a caixa: é o contrato de registro que evita duas Robertas na
// tela, e ele NÃO para no vídeo 1. O crossfade pro vídeo 2 só é invisível
// porque o frame 0 dele é a MESMA pose do frame final do vídeo 1 (ver o
// comentário do `fieldLayer`) — se um estivesse numa caixa e o outro em outra,
// a pose saltaria de geometria exatamente no ponto que existe pra não ter
// emenda. Em retrato os dois compartilham o full-height E a panorâmica: no
// instante do crossfade (0.80→0.86) o vídeo 1 está preso em ~46% e o vídeo 2
// nasce em ~46%, então a silhueta casa; só depois o vídeo 2 abre pro campo (ver
// a panorâmica do `field` no matchMedia).
//
// A ARTE DO CAMPO é a exceção da caixa (é o CHÃO em que o card do footer pousa,
// full-bleed, não mascarada), mas o PREENCHIMENTO dela precisa concordar com o
// vídeo 2 no ponto de troca. Em landscape isso é o `MEDIA` cheio (obj 100%
// scale-110), o MESMO do vídeo 2 landscape — registra de graça. Em RETRATO a
// conta é outra: a mulher mora em x≈0.60 do frame (MEDIDO na arte, blusa branca
// contra o campo — não 0.44, que o olho chutava), e full-height só mostra ~26%
// da largura. Pra CENTRALIZAR ela — pedido da Pronit — a janela precisa cair em
// 0.60, o que dá `object-position` X ≈ 63% (centro = 0.129 + p·0.742 = 0.60).
// Em obj 50% ela ficava colada na borda direita da janela; em 63% ela senta no
// meio. Esse 63% é o MESMO do fim da panorâmica do vídeo 2 (ver matchMedia) E
// do fundo do footer (ver o JSX do footer): os três mostram a mulher no mesmo
// lugar, então o snap em p=1.0 e a emenda palco→footer ficam invisíveis.
const MEDIA_SCENE = `${MEDIA} ${MEDIA_PORTRAIT}`;
const MEDIA_FIELD_END = `${MEDIA} [@media(max-aspect-ratio:4/3)]:object-[63%_50%] [@media(max-aspect-ratio:4/3)]:scale-100 [@media(max-aspect-ratio:4/3)]:translate-x-0`;

/** Wrapper das camadas da cena. Full-height em TODOS os aspectos agora — a
 *  cena toma a tela inteira no desktop E no retrato (`h-full` = 100vh do palco
 *  sticky). A faixa 4/5 com máscara de dissolução na base saiu quando o retrato
 *  virou full-height (pedido da Pronit): sem banda, não há base pra dissolver, e
 *  a legibilidade do texto que antes morava no chão escuro abaixo dela agora é
 *  o `baseMask`/`copyScrim` subindo por cima do vídeo, junto com o CTA (mesma
 *  máquina do desktop — ver os tweens em useGSAP).
 *
 *  `inset-0` seria idêntico a `SCENE_BOX` agora; mantido `inset-x-0 top-0
 *  h-full` só pra deixar explícito que a caixa ancora no topo e desce a altura
 *  cheia — e pra não reescrever as quatro referências (vídeo 1, still, recorte,
 *  vídeo 2) que dependem de ler a MESMA string que o registro exige. */
const SCENE_BOX_SCENE = "absolute inset-x-0 top-0 h-full";

// Id do clipPath compartilhado — vídeo e recorte referenciam o MESMO, é o que
// garante que o arco corte os dois exatamente igual.
const ARCH_ID = "cta-arch";

/**
 * Geometria do arco, em coordenadas normalizadas (objectBoundingBox 0..1) —
 * por serem relativas, a forma escala sozinha com o elemento, sem recalcular
 * nada no resize.
 *
 * p = 0 → fechada (telhado baixo, creme em volta) · p = 1 → PREENCHE A SECTION
 * inteira: em repouso todo termo é multiplicado por k = 1-p, então tudo zera
 * junto e o path degenera num retângulo full-bleed, sem creme nenhum. É a
 * referência da Zipline — o arco é o gesto da ENTRADA, não o estado final. O
 * vídeo só começa depois que ela terminou de preencher.
 *
 * A FORMA é um telhado, não um domo: duas diagonais RETAS e rasas subindo dos
 * ombros até um cume arredondado, mais um arredondamento curto onde cada
 * diagonal encosta na lateral. Domo (duas cúbicas com barriga, o que havia
 * aqui antes) engorda no meio e come o topo da cena; o telhado sobe reto e
 * devolve o creme só nas pontas.
 *
 * Os três números que mandam, lidos da referência: ombro em 0.47, cume VISÍVEL
 * em 0.21, arredondamento do cume cobrindo o terço central. Cuidado: `yc` não
 * é o cume que se vê — é o BICO VIRTUAL, onde as duas retas se cruzariam se não
 * houvesse curva. A quadrática usa esse bico como controle e passa a meio
 * caminho dele, então o cume visível assenta em yc + r·(ys−yc) ≈ 0.21. Mexer em
 * `r` sozinho move o cume visível junto.
 */
// Proporção de referência do telhado. Os três números da forma (ombro 0.47,
// cume 0.21, arredondamento) foram lidos/tunados em PAISAGEM. Do gate 4/3 pra
// cima (desktop, tablet deitado) o arco fica exatamente como sempre foi;
// abaixo dele (retrato) o eixo Y encolhe na proporção — ver `vy`. 4/3 é o
// MESMO gate que já governa toda a adaptação de retrato desta cena
// (object-position, chão escuro, CopyScrim).
const ARCH_REF_ASPECT = 4 / 3;

const archD = (p: number, vy = 1) => {
  const k = 1 - p;
  // vy = correção de aspect no eixo Y (só < 1 em retrato, 1 em paisagem).
  // clipPathUnits="objectBoundingBox" estica a MESMA forma normalizada pra
  // proporção do elemento — num retrato alto o mesmo cume vira um BICO agudo.
  // Multiplicar só os termos verticais por vy = aspect/(4/3) faz o ÂNGULO
  // visível do telhado ficar igual ao do desktop em qualquer proporção: o
  // cume abre largo como abre lá, em vez de pontudo. r e sx são eixo X e não
  // escalam — o cume só fica mais RASO, mantendo a largura do arredondamento.
  const ys = k * 0.47 * vy; // ombro: onde o telhado encontra a lateral
  const yc = k * 0.16 * vy; // bico virtual — controle da curva, não o cume visível
  const r = k * 0.16; // meia-largura do arredondamento do cume (X, não escala)
  const sx = k * 0.05; // quanto o arredondamento do ombro avança pra dentro (X)
  const sy = k * 0.045 * vy; // e quanto ele desce pela lateral (Y)
  const m = (ys - yc) / 0.5; // inclinação do telhado
  const yr = yc + r * m; // onde a reta entrega a curva do cume
  const yo = ys - sx * m; // onde a curva do ombro entrega a reta
  return (
    `M0,${ys + sy} Q0,${ys} ${sx},${yo} ` +
    `L${0.5 - r},${yr} Q0.5,${yc} ${0.5 + r},${yr} ` +
    `L${1 - sx},${yo} Q1,${ys} 1,${ys + sy} L1,1 L0,1 Z`
  );
};

// Arco em repouso — estado inicial do <path> no SSR e o único estado que
// reduced-motion enxerga. p=1 zera todo termo (k=0), então vy é irrelevante.
const ARCH_REST = archD(1);

type Sources = { video: string; cutout: string; field: string };

/** Safari/iOS não pinta o primeiro frame nem responde bem a seek num vídeo que
 *  nunca tocou. Um play()/pause() assim que há frame decodificado destrava. */
function primeForSeek(e: SyntheticEvent<HTMLVideoElement>) {
  const v = e.currentTarget;
  // pause só depois do play resolver — pausar durante a promise a faz rejeitar.
  v.play()
    .then(() => v.pause())
    .catch(() => {});
}

/* Vidro escuro dos cards da cena — mesmo vocabulário do GLASS_MOBILE do
   Pricing (fundo denso e uniforme, alpha alto, sem gradiente) e do GLASS do
   PhoneScreen (borda branca de baixa opacidade, radius grande). Aqui,
   diferente do GLASS do PhoneScreen, backdrop-blur ENTRA: aquele evita
   backdrop-filter só porque vive dentro de um <Html transform> do drei (bug
   de renderização em contexto 3D-transformado) — este card é DOM plano sobre
   vídeo/foto, então o blur é o que sustenta a legibilidade contra o fundo em
   movimento. `rgba(0,10,26,...)` é o token `ink` (#000A1A) em rgb — mesmo
   literal que o GLASS_MOBILE usa, ver tailwind.config.ts. */
const CARD_GLASS =
  "border border-white/15 bg-[rgba(0,10,26,0.55)] backdrop-blur-[20px] backdrop-saturate-[1.4]";

/* Highlight de 1px na quina de cima — camada própria, não empilhada dentro da
   sombra externa (mesma separação que o card fumê do Pricing usa). */
const CARD_SHEEN =
  "pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]";

const CARD_SHADOW = "shadow-[0_20px_50px_-20px_rgba(0,10,26,0.7)]";

/** Camadas por cima da imagem: wash de marca + scrims de legibilidade + aurora.
 *
 * O wash empilhava tint 0.52/0.70 + scrim 0.5 + base 0.8 PERMANENTES — presos
 * o tempo todo, não só na primeira cena — e achatava o roxo real do vídeo e o
 * tom de pele dela em cinza. Ele fazia dois trabalhos ao mesmo tempo (marca E
 * legibilidade da headline) e por isso cobrava o preço dos dois o tempo todo,
 * inclusive nos 0.62→1 em que não há headline nenhuma sobre a cena pra
 * proteger. Agora a legibilidade da primeira cena é responsabilidade do DIM
 * (temporal, ver `sceneDim` abaixo — CSS opaco que só apaga), e o wash volta a
 * ser só marca: tint e scrim central caem pra valores de tonalidade, não de
 * contraste. O scrim de base CONTINUA mais forte que os outros dois — ele não
 * é legibilidade, é a costura com o footer (ver o comentário do footer: sem
 * cor pra casar, sem costura, e é esse scrim que prepara o preto ali). */
function Wash() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {/* tint de marca (lavanda/roxo) — puxa a foto pro mundo da Gaia */}
      <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(36,26,56,0.16)_0%,rgba(58,72,94,0.06)_38%,rgba(14,16,22,0.30)_100%)]" />
      {/* scrim central — só tonalidade agora; a legibilidade da headline é o DIM */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,transparent_42%,rgba(14,16,22,0.22)_100%)]" />
      {/* scrim de base — escurece o pé só o suficiente; a imagem segue visível
          nas bordas ao redor do card de vidro flutuante do footer */}
      <div className="absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(to_top,rgba(14,16,22,0.70),rgba(14,16,22,0.22)_52%,transparent)]" />
      {/* luz aurora fluindo (o "momento mais quente") — bloom lavanda que respira */}
      <div className="gaia-aurora-flow absolute top-[8%] left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(163,133,192,0.42),rgba(122,144,174,0.15)_45%,transparent_70%)] blur-3xl" />
    </div>
  );
}

/** Scrim NOVO, direcionado — cobre a coluna onde a copy (eyebrow/headline/
 * sub) vive, escurecendo só o fundo ATRÁS do texto. Nenhum dos escurecimentos
 * que já existiam cobria essa faixa: o Wash é tonalidade, não contraste (ver
 * comentário dele) e o DIM (`sceneDim`) só existe na fase 0→0.45 da timeline
 * — morre exatamente quando o CTA está subindo, então a faixa ALTA onde o
 * texto mora nunca recebeu nada.
 *
 * NÃO É MAIS PERMANENTE EM `motion` — a primeira cena (câmera fechada na tela
 * do tablet, antes do pull-back) já tem contraste PRÓPRIO: o DIM (`sceneDim`,
 * 0.62, que só apaga — ver o tween dele) protege a FRASE que mora ali. Este
 * scrim, escuro desde o mount, não protegia nenhuma copy nessa fase — não há
 * eyebrow/headline/sub na primeira cena, só a tela do tablet — e por isso só
 * pintava uma faixa escura na lateral esquerda sem função nenhuma. A Pronit
 * vetou exatamente essa faixa. A correção segue o PRECEDENTE do `baseMask`
 * (mesmo defeito, já resolvido lá): nasce em `opacity:0` por CSS (classe, não
 * `gsap.set` — num load já rolado ou deep-link ele não pode piscar aceso) e a
 * timeline acende ele no MESMO offset e MESMA duração/ease do `baseMask`
 * (0.48, 0.24, `power2.inOut`, ver o tween em useGSAP, logo ao lado do dele):
 * os dois são o mesmo chão de legibilidade, subindo na respiração do CTA —
 * não faz sentido a base acender e o scrim atrasar ou adiantar.
 *
 * Em `still` (reduced-motion) ele CONTINUA aceso e permanente, sem tween: o
 * still JÁ É o destino da câmera, não existe primeira cena pra proteger, e a
 * copy está visível e parada desde o primeiro frame — contraste ali é PISO,
 * não coreografia; nasce escuro e nunca escurece nem menos nem mais. Em
 * `motion === null` (matchMedia ainda não resolveu) ele não é renderizado:
 * não pode pintar antes de saber qual dos dois casos é este — mesmo cuidado
 * do bloco de indecisão do `ctaBlock`, ver useGSAP.
 *
 * Medido (still hidden, p95 da luminância no pior caso dentro da CAIXA DA
 * TINTA de cada bloco — união dos line boxes via Range, não a caixa CSS do
 * elemento, que agora estica pra dentro da área que ela ocupa — nos 4
 * viewports exigidos, fase HOLD 0.72→0.80 da timeline — DEPOIS do scrim já ter
 * subido em 0.48→0.72, medição continua válida, não remedi):
 *                  antes(1440×900)  1280×800  1440×900  1512×982  1920×1080
 *   eyebrow  1.65:1 →      8.5:1      8.1:1     8.5:1     9.4:1     6.8:1
 *   headline 2.27:1 →      8.1:1      8.1:1     8.1:1     9.4:1     6.2:1
 *   sub      1.89:1 →      6.5:1      5.9:1     6.5:1     7.6:1     5.4:1
 * (headline sempre 100% branco — só o fundo mudou.) Os três abaixo de
 * 4.5:1 antes (headline reprovava até o AA de texto grande, 3:1); os três
 * acima de 4.5:1 depois, nos 4 viewports — ver `analyze_contrast.py` e
 * `contrast.cjs` no scratchpad da sessão (2026-07-21) pro método completo.
 *
 * Horizontal, ancorado à ESQUERDA (onde o texto vive). NÃO morre antes da
 * borda dela — precisou crescer até 58% pra cobrir o bloco inteiro, que
 * agora (DEFEITO 1) morde a silhueta de propósito; um scrim mais curto
 * (34%, a 1ª tentativa) deixava a metade direita de cada linha — e o `sub`
 * inteiro — sem backing, reprovando de novo. Isso não vaza visualmente
 * NELA: ela é opaca em z-30, por CIMA deste scrim em z-0, então onde ela
 * cobre a tela o scrim simplesmente não aparece — só importa nas franjas
 * (cabelo com alpha parcial), verificado a olho nos 4 renders, sem costura
 * visível. Ela continua iluminada; é o AR atrás do texto que escurece.
 *
 * Cor: MESMA família do `baseMask` (`#17102A` / `rgba(36,26,56,…)`), não
 * preto neutro — preto é linha vermelha nesta cena (ver comentário do
 * baseMask: o chão tem que ficar no mundo lavanda, não virar buraco).
 *
 * Mora DENTRO do clip do arco (z-0), DEPOIS do Wash e ANTES do DIM: fora do
 * clip vazaria no creme ao redor do arco enquanto ele ainda está fechado;
 * do lado de dentro, o clip já faz esse corte de graça. Abaixo do CTA (z-20)
 * e da Roberta (z-30) — os dois continuam por cima, iluminados. */
function CopyScrim({
  scrimRef,
  bornHidden,
}: {
  scrimRef?: Ref<HTMLDivElement>;
  bornHidden?: boolean;
}) {
  return (
    <div
      ref={scrimRef}
      aria-hidden
      className={
        // FORA no retrato: no mobile o texto mora EMBAIXO (não numa coluna à
        // esquerda como no desktop), então um gradiente da esquerda pinta uma
        // faixa escura lateral sem função — a Pronit vetou. Quem dá legibilidade
        // ali é o `baseMask` (gradiente de baixo, ver o tween). Só landscape.
        "pointer-events-none absolute inset-0 [@media(max-aspect-ratio:4/3)]:hidden bg-[linear-gradient(to_right,#17102A_0%,rgba(36,26,56,0.88)_22%,rgba(36,26,56,0.55)_40%,transparent_58%)]" +
        (bornHidden ? " opacity-0" : "")
      }
    />
  );
}

/* ── Micro-gráficos dos cards ─────────────────────────────────────────────
   O vocabulário vem dos wearables de saúde (referências da Pronit: heart-rate
   em barras finas com acentos de cor, stress em linha com contas), reescrito
   na paleta da Gaia. São DECORATIVOS — aria-hidden, quem argumenta é o texto
   do card — mas o dado é dirigido: cada acento cai exatamente onde a copy
   aponta (os três horários da rotina, o "hoje" do crescimento). Valores
   hardcoded, nada de random: a entrada é animada pela MESMA timeline dos
   cards (ver CARDS em useGSAP), então o desenho precisa ser determinístico
   pra reverter limpo no onLeaveBack. */

/* Pulso do chip — 9 barras centradas na LINHA MÉDIA (waveform, não
   histograma: é sinal vital, não contagem). A mais alta em sage — a cor que
   o check do chip já usa, o mesmo verde que diz "pronta". */
const PULSE_H = [7, 12, 9, 16, 10, 19, 12, 15, 8];
function PulseBars() {
  return (
    <svg
      aria-hidden
      width={55}
      height={20}
      viewBox="0 0 55 20"
      className="pointer-events-none ml-auto shrink-0"
    >
      {PULSE_H.map((h, i) => (
        <rect
          key={i}
          data-chart-pulse
          x={i * 6.5}
          y={(20 - h) / 2}
          width={3}
          height={h}
          rx={1.5}
          fill={i === 5 ? "#A6B58F" : "rgba(255,255,255,0.28)"}
        />
      ))}
    </svg>
  );
}

/* Crescimento — a linha que leva até o 300. Sobe com ruído de verdade (mês
   fraco existe), cada mês é uma conta sobre a linha (a estética da referência
   de stress) e o ÚLTIMO ponto acende em roxo-300 com um halo: o "hoje" é o
   único pixel de marca do gráfico. Divisórias de trimestre em hairline. */
const GROWTH_Y = [37, 34, 35, 30, 27, 29, 23, 18, 20, 14, 9, 3];
const GROWTH_PTS = GROWTH_Y.map((y, i) => [3 + i * 18.2, y] as const);
const GROWTH_LAST = GROWTH_PTS[GROWTH_PTS.length - 1];
function GrowthLine() {
  return (
    <svg
      aria-hidden
      width={212}
      height={58}
      viewBox="0 0 212 58"
      className="pointer-events-none mt-4 block overflow-visible"
    >
      {[53, 106, 159].map((x) => (
        <line
          key={x}
          x1={x}
          y1={2}
          x2={x}
          y2={44}
          stroke="rgba(255,255,255,0.08)"
        />
      ))}
      <polyline
        data-chart-line
        points={GROWTH_PTS.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* contas: fill claro + anel escuro, senão dot branco some na linha branca */}
      {GROWTH_PTS.slice(0, -1).map(([x, y]) => (
        <circle
          key={x}
          data-chart-dot
          cx={x}
          cy={y}
          r={2}
          fill="rgba(255,255,255,0.9)"
          stroke="rgba(0,10,26,0.55)"
          strokeWidth={1}
        />
      ))}
      <g data-chart-dot>
        <circle
          cx={GROWTH_LAST[0]}
          cy={GROWTH_LAST[1]}
          r={7}
          fill="rgba(193,169,211,0.22)"
        />
        <circle
          cx={GROWTH_LAST[0]}
          cy={GROWTH_LAST[1]}
          r={2.8}
          fill="#C1A9D3"
          stroke="rgba(0,10,26,0.55)"
          strokeWidth={1}
        />
      </g>
      <text
        x={3}
        y={56}
        className="font-body"
        fontSize={9}
        letterSpacing="0.14em"
        fill="rgba(255,255,255,0.38)"
      >
        JAN
      </text>
      <text
        x={209}
        y={56}
        textAnchor="end"
        className="font-body"
        fontSize={9}
        letterSpacing="0.14em"
        fill="rgba(255,255,255,0.38)"
      >
        HOJE
      </text>
    </svg>
  );
}

/* O dia em barras — a referência de heart-rate É um eixo de dia (00→18), e o
   card da rotina é exatamente isso. Eixo 06h→19h; as barras dos TRÊS
   horários da lista acendem (azul→anamnese, roxo→consulta, sage→plano
   enviado, o trio azul/rosa/amarelo da referência traduzido pra paleta) e
   são mais altas que as vizinhas de propósito — o acento é pico, não pastilha
   perdida. Ancoradas na base: eventos sobre a linha do dia, não waveform. */
const DAY_H = [
  6, 9, 7, 11, 8, 13, 10, 15, 24, 12, 14, 11, 16, 13, 18, 15, 20, 17, 14, 19,
  30, 16, 26, 13, 17, 12, 15, 10, 13, 8, 11, 7, 9,
];
// índice = (hora − 6) / 13 · 33 → 09:12 ⇒ 8 · 14:00 ⇒ 20 · 14:40 ⇒ 22
const DAY_ACCENT: Record<number, string> = {
  8: "#A6BAD5",
  20: "#C1A9D3",
  22: "#A6B58F",
};
function DayBars() {
  return (
    <svg
      aria-hidden
      width={268}
      height={46}
      viewBox="0 0 268 46"
      className="pointer-events-none mt-5 block"
    >
      {DAY_H.map((h, i) => (
        <rect
          key={i}
          data-chart-bar
          x={i * 8.15}
          y={32 - h}
          width={3}
          height={h}
          rx={1.5}
          fill={DAY_ACCENT[i] ?? "rgba(255,255,255,0.22)"}
        />
      ))}
      <line
        x1={0}
        y1={33.5}
        x2={263.8}
        y2={33.5}
        stroke="rgba(255,255,255,0.10)"
      />
      {/* rótulos na posição REAL da hora no eixo (x = índice · 8.15 + 1.5) */}
      <text
        x={0}
        y={45}
        className="font-body"
        fontSize={9}
        letterSpacing="0.1em"
        fill="rgba(255,255,255,0.38)"
      >
        06
      </text>
      <text
        x={124}
        y={45}
        textAnchor="middle"
        className="font-body"
        fontSize={9}
        letterSpacing="0.1em"
        fill="rgba(255,255,255,0.38)"
      >
        12
      </text>
      <text
        x={248}
        y={45}
        textAnchor="middle"
        className="font-body"
        fontSize={9}
        letterSpacing="0.1em"
        fill="rgba(255,255,255,0.38)"
      >
        18
      </text>
    </svg>
  );
}

/** Posicionamento COMPARTILHADO das duas camadas do CTA — o bloco de texto
 * (`ctaBlock`, z-20, abaixo da Roberta de propósito) e o botão sozinho
 * (`ctaGhostBlock`, z-35, acima dela — ver o comentário do ref e o comentário
 * grande no JSX). As duas usam ESTA MESMA string: se a conta abaixo mudar
 * (viewport novo medido, gap diferente), muda aqui uma vez só — divergir
 * entre as duas descolaria o botão do resto do bloco horizontalmente, o
 * mesmo tipo de bug de registro que o `SCENE_BOX`/`MEDIA` compartilhados
 * evitam entre vídeo e recorte.
 *
 * A CAIXA É O CONTRATO, NÃO A TINTA. Uma tentativa anterior nesta mesma
 * sessão mirava a LARGURA DA TINTA (a borda direita do texto já renderizado)
 * contra a silhueta dela, empurrando o bloco inteiro pra direita via `ml`
 * até a tinta quase encostar. Não fechou: `text-balance` escolhe as quebras
 * pelo PRÓPRIO critério de equilíbrio visual, então a linha mais comprida
 * raramente usa a largura inteira da caixa — a tinta virou função DISCRETA
 * da quebra escolhida (`min(largura_natural, W)`), não contínua da
 * geometria, e o resíduo do ajuste linear chegou a ~17px (contra <2px do fit
 * de L abaixo). Uma folga de 13px sobre um ruído de 17px é furada por
 * construção: renderizado, a headline comia letra de verdade ("pod**e**", a
 * haste debaixo do cabelo) em 3 dos 4 viewports testados.
 *
 * A CORREÇÃO: ancorar a CAIXA, não a tinta. Se o BLOCO não pode cruzar a
 * borda dela, nenhuma LINHA cruza — o invariante vira estrutural (uma regra
 * de layout que o CSS cumpre sempre) em vez de estatístico (uma medição que
 * só vale nos pontos testados). Por isso `text-balance` saiu do `<h2>`: sem
 * ele o browser preenche a medida inteira pelo algoritmo padrão (greedy) em
 * vez de rebalancear pelo critério próprio dele — e com a caixa travada,
 * preencher a medida é seguro. É o mesmo "quebra natural na coluna, não
 * quebras escritas na mão" que o comentário do corpo do `<h2>` já defendia;
 * `text-balance` trabalhava contra essa frase, não a favor.
 *
 * O container virou `justify-end` + `padding-right` calculado, dentro do
 * MESMO gate de aspecto (`[@media(min-aspect-ratio:4/3)]`) que o resto da
 * cena usa pra saber se ela está no quadro. A borda DIREITA do bloco cai
 * numa distância fixa da silhueta; a ESQUERDA flutua com o conteúdo — o
 * inverso do modelo anterior (`justify-start` + `ml` empurrando a esquerda,
 * a direita solta e sem garantia nenhuma).
 *
 * A CONTA. L = coordenada X (da esquerda da tela) onde a silhueta dela
 * (tablet incluso) começa, na faixa vertical da 1ª linha da headline —
 * mesma definição herdada da tentativa anterior, REMEDIDA por conta própria
 * (não reaproveitei o número: script novo, `measure_L2.cjs` +
 * `analyze_L2.py`, scratchpad da sessão de 2026-07-21). Mesmo método de
 * varredura (recorte forçado a `opacity:1` sobre sentinela #00FF00, primeiro
 * pixel não-verde da esquerda pra direita, mediana de 7 linhas dentro da 1ª
 * linha da headline), mas a fase HOLD (progress≈0.76 da pista) foi
 * alcançada perseguindo o PROGRESSO real da pista
 * (`-rect.top/(altura-innerHeight)`, o mesmo eixo que a ScrollTrigger usa),
 * não `stickyTop≈0`: `stickyTop` fica em 0 a faixa PINADA INTEIRA (progress
 * 0.25→1.0) e converge pra um ponto arbitrário dentro dela, dependendo de
 * quanto a inércia do Lenis fez o scroll passar do alvo — foi assim que a
 * 1ª tentativa de remedir mediu a headline ainda a ~500px do lugar dela,
 * antes do CTA subir. Perseguir o progresso normalizado converge sempre no
 * mesmo ponto, sessão a sessão.
 *   · 1280×800   → L=496
 *   · 1440×900   → L=559
 *   · 1512×982   → L=552
 *   · 1920×1080  → L=866
 * Ajuste linear (mínimos quadrados):
 *
 *     L = 1.011 · vw − 0.996 · vh
 *
 * fecha com resíduo <1.5px nos quatro — mesma ordem de grandeza do fit
 * herdado (1.012·vw−0.991·vh). Os valores brutos de L diferem em ~5px entre
 * as duas medições (linhas de varredura amostradas em alturas ligeiramente
 * diferentes dentro da 1ª linha), mas o COEFICIENTE — o que decide como a
 * caixa se move entre viewports — bate: as duas sessões, independentes,
 * chegaram na mesma geometria.
 *
 * GAP DE 8px, NÃO MORDIDA: `borda_direita_da_caixa = L − 8px`. A
 * sobreposição visual continua existindo na cena — é o FIO do eyebrow (ver
 * abaixo, `right-full`/`w-[7vw]`) que avança pra dentro dela, porque é a
 * peça que custa zero legibilidade e por isso pode. Texto encosta na medida
 * da caixa; fio atravessa. `L` já é a borda da SILHUETA (não da tinta) — 8px
 * de ar antes dela é o vão mínimo pra nunca depender de anti-aliasing na
 * emenda entre o recorte e o texto.
 *
 * CONVERSÃO DE UNIDADE, conferida com `getComputedStyle()` e não só no
 * papel — foi exatamente aqui que a tentativa anterior escreveu um
 * coeficiente direto como CSS e saiu 100× menor: 1vw em CSS já é 1% da
 * viewport, então `1.011 · vw` de TELA INTEIRA vira `101.1vw` de CSS, e a
 * subtração de vh pede o mesmo tratamento:
 *
 *     padding-right = 100vw − (L − 8px)
 *                    = 100vw − (101.1vw − 99.6vh) + 8px
 *                    = calc(99.6vh − 1.1vw + 8px)
 *
 * Verificado: `getComputedStyle(container).paddingRight` bateu com esta
 * conta nos 4 viewports (diff 0.00px), script `check_pr.cjs` no mesmo
 * scratchpad.
 *
 * TRAVA `min(…, calc(100vw - 480px))`: sem ela, abaixo de ~1.6 de aspecto (a
 * faixa entre o gate em 4/3 e onde os 4 pontos testados começam — mesma
 * faixa não coberta que a tentativa anterior já sinalizava) o
 * `padding-right` cru cresce o bastante pra empurrar a borda ESQUERDA da
 * caixa (até 480px de largura) pra FORA da tela — pior que a letra comida
 * que este comentário inteiro existe pra evitar. A trava para a caixa
 * exatamente encostada na borda esquerda da viewport (vão zero ali, nunca
 * corte) quando isso aconteceria. Não perturba os 4 viewports testados: o
 * `padding-right` cru fica sempre abaixo do teto da trava neles (confirmado
 * no mesmo `check_pr.cjs`). Não testado fora deles — mesma filosofia do
 * limite conhecido do ultrawide, no gate ao lado: "degrada pra vão, não pra
 * letra comida". */
// RETRATO ancora o bloco EMBAIXO (`items-end` + `pb`), não no topo. Em retrato a
// cena vive na banda 4/5 do TOPO (ver SCENE_BOX_SCENE) que se dissolve na base
// num chão escuro (#17102A) — a metade de baixo da tela é justamente o vazio que
// o texto pede. No topo (o que havia: `items-start pt-[11vh]`) a copy caía POR
// CIMA do rosto dela; embaixo ela assenta no escuro, com contraste próprio e sem
// disputar a foto. Landscape (>=4/3) não muda: continua `items-start pt-[11vh]`
// ao LADO do tablet, e os overrides abaixo restauram exatamente esse estado.
const CTA_JUSTIFY =
  "flex items-end justify-start px-[3vw] pb-[10vh] [@media(min-aspect-ratio:4/3)]:items-start [@media(min-aspect-ratio:4/3)]:pb-0 [@media(min-aspect-ratio:4/3)]:pt-[11vh] [@media(min-aspect-ratio:4/3)]:justify-end [@media(min-aspect-ratio:4/3)]:pr-[min(calc(99.6vh-1.1vw+8px),calc(100vw-480px))]";

export default function CTAFinal() {
  const root = useRef<HTMLElement>(null);
  const arch = useRef<SVGPathElement>(null); // o `d` é reescrito a cada frame
  const video = useRef<HTMLVideoElement>(null); // agulha do scrub (currentTime)
  const clipRoberta = useRef<HTMLDivElement>(null); // camada do recorte alpha
  // VÍDEO 2 — o pull-out que apresenta o footer. `field` é a agulha do scrub
  // (currentTime); `fieldLayer` é a camada (z-40) cuja opacidade faz o crossfade
  // por cima do recorte: como o frame 0 dele é a MESMA pose da image280, subir a
  // opacidade tranca a silhueta e a troca não tem pop. Opaco, ele cobre CTA e
  // recorte e leva a cena pro campo.
  const field = useRef<HTMLVideoElement>(null);
  const fieldLayer = useRef<HTMLDivElement>(null);
  // A ARTE DO CAMPO (z-50) que assume a cena quando o pull-out termina — ver
  // CTA_FIELD_END. Sobe de opacidade no FIM do scrub, com a câmera ainda
  // andando: é isso que esconde a diferença de registro (ela não é o frame
  // final do mp4, é outro render do mesmo destino).
  const fieldEnd = useRef<HTMLDivElement>(null);
  // O <img> da arte do campo, com ref PRÓPRIA — o wrapper acima (`fieldEnd`)
  // só carrega a opacidade; a decodificação é do elemento. Existe pra
  // PRÉ-DECODIFICAR o webp (ver o promote() do IntersectionObserver): sem isso
  // o `loading="lazy"` + `decoding="async"` só decodam na hora do swap, e como
  // a troca é um snap de duração 0 no último pixel de scroll, o frame
  // comprimido do mp4 fica à mostra por um instante ("a imagem demora a
  // trocar"). Com o decode adiantado, o paint em p=1.0 é instantâneo.
  const fieldEndImg = useRef<HTMLImageElement>(null);
  // A FRASE da primeira cena — câmera ainda fechada na tela do tablet, antes
  // do pull-back. Vive e morre dentro do gesto do arco (ver timeline); depois
  // disso quem fala é a câmera se afastando, não mais texto sobre a tela.
  const firstLine = useRef<HTMLDivElement>(null);
  // O DIM da primeira cena — legibilidade da FRASE contra o vídeo+wash, agora
  // que o Wash voltou a ser só marca (ver comentário do Wash). Ref de um <div>
  // que já nasce opaco via CSS (ver JSX): a timeline só tem o tween que apaga.
  const sceneDim = useRef<HTMLDivElement>(null);
  // O BLOCO interno (eyebrow + headline + sub — o BOTÃO não mora mais aqui,
  // ver `ctaGhostBlock` abaixo), não a camada full-screen: é o bloco que
  // viaja de cima do corpo dela até a faixa do topo. Animar a camada moveria a
  // caixa de layout inteira e o `y` não teria significado nenhum.
  const ctaBlock = useRef<HTMLDivElement>(null);
  // O BOTÃO, sozinho, numa camada PRÓPRIA acima do recorte (z-35 > z-30 do
  // recorte, ver o comentário grande no JSX, perto do lugar antigo do
  // botão). `ctaBlock` (z-20) fica ABAIXO da Roberta de propósito — é o que
  // faz o texto passar por trás dela — mas um filho não escapa o z-index do
  // pai: nada dentro de `ctaBlock` sobe acima de z-30 só mudando seu próprio
  // z-index, porque `ctaBlock`'s ancestor já fixa o teto. Por isso o alvo
  // clicável vive numa camada IRMÃ, mais alta, com um clone INVISÍVEL de
  // eyebrow+h2+p só pra herdar a mesma altura (e portanto a mesma posição
  // vertical do botão) sem duplicar posição via JS. Sobe junto com
  // `ctaBlock` no MESMO tween (ver CTA em useGSAP: array de dois alvos).
  const ctaGhostBlock = useRef<HTMLDivElement>(null);
  // A PILHA de cards de vidro na cunha esquerda — contrapeso do CTA, que
  // sozinho na coluna direita deixa a cena torta. A ref é da COLUNA, mas quem
  // entra na timeline são os filhos dela, um a um (ver useGSAP): é o que
  // permite o stagger sem uma ref por card.
  const cardStack = useRef<HTMLDivElement>(null);
  // A BASE ESCURA — a mancha de roxo profundo (roxo-900 tendendo ao breu) que
  // sobe do pé da cena quando o vídeo acaba e o recorte assume, subindo ATÉ
  // ATRÁS DO BOTÃO. Ela mora no z-0 (dentro do clip, por cima do vídeo e do
  // Wash), então a Roberta (z-30) fica POR CIMA dela: é o chão em que ela
  // pousa. Nasce em 0 e só acende, junto com o CTA subindo — ver o tween em
  // useGSAP.
  const baseMask = useRef<HTMLDivElement>(null);
  // O SCRIM da copy (ver `CopyScrim`, acima) — só existe (com ref e tween) em
  // motion===true; em `still` ele é outro nó da MESMA função, sem ref,
  // permanente. Nasce em opacity:0 por CSS (classe `bornHidden`, não
  // `gsap.set`) e a timeline acende ele no mesmo offset/ease do `baseMask`,
  // ao lado do tween dele — ver useGSAP.
  const copyScrim = useRef<HTMLDivElement>(null);

  // null = indeciso: o matchMedia só resolve depois do primeiro paint, e nesse
  // vão não renderizamos nem vídeo nem still — a base cobre. Sem isso o still de
  // reduced-motion apareceria e piscaria pra vídeo em todo mundo.
  const [motion, setMotion] = useState<boolean | null>(null);
  // Vídeo e recorte saem da MESMA decisão de viewport, congelada no mount: os
  // dois têm que ser do mesmo par (1920 juntos ou 1280/-sm juntos), senão o
  // registro pixel-perfect entre recorte e frame final se perde. Não usamos
  // <source media> porque browsers resolvem essa escolha de formas diferentes.
  const [sources, setSources] = useState<Sources | null>(null);

  // Decide uma vez se roda a pista scrubada ou entrega estático (reduced-motion).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMotion(!reduce.matches);
    decide();
    reduce.addEventListener("change", decide);
    return () => reduce.removeEventListener("change", decide);
  }, []);

  // Peso dos assets pelo viewport — congelado no mount: trocar de fonte no meio
  // do scrub custaria um reload e um salto na câmera.
  useEffect(() => {
    const lg = window.matchMedia("(min-width: 768px)").matches;
    setSources(
      lg
        ? { video: CTA_VIDEO_LG, cutout: CTA_CUTOUT_LG, field: CTA_FIELD_LG }
        : { video: CTA_VIDEO_SM, cutout: CTA_CUTOUT_SM, field: CTA_FIELD_SM },
    );
  }, []);

  // Os dois vídeos (17,2 MB somados) nascem com preload="none" — ver a prop
  // abaixo — pra não competir por banda com o que está ACIMA da dobra, já que
  // esta section é o PÉ da página. Aqui a gente adia o download até a pista
  // estar a ~1 viewport de distância: rootMargin "100% 0px" expande a área de
  // interseção em 100% da altura da viewport pra cima e pra baixo do que
  // normalmente seria visível, então o disparo acontece bem antes do usuário
  // chegar — sobra a pista inteira (até o progresso 0.31, onde o scrub do
  // vídeo 1 começa) pra terminar o fetch. `wire()` (useGSAP, abaixo) já ouve
  // `loadedmetadata` nos dois vídeos desde o layout effect anterior a este;
  // subir o preload e chamar `.load()` é só o gatilho que faz esse listener
  // disparar mais tarde em vez de no mount.
  //
  // CASO DE BORDA — refresh já rolado até o pé (deep link #comecar): o
  // IntersectionObserver reporta o estado ATUAL assim que `.observe()` roda,
  // não só mudanças futuras. Se a section já está dentro da margem expandida
  // nesse instante, o callback dispara imediatamente e os vídeos começam a
  // carregar sem esperar um scroll novo.
  useEffect(() => {
    if (motion !== true || !sources) return;
    const targets = [video.current, field.current].filter(
      (v): v is HTMLVideoElement => v !== null,
    );
    if (!targets.length || !root.current) return;

    const promote = () => {
      targets.forEach((v) => {
        v.preload = "auto";
        v.load();
      });
      // A ARTE DO CAMPO (z-50) assume a cena num snap de duração 0 em p=1.0 —
      // o frame exato em que o vídeo 2 acaba (pedido da Pronit, sem antecipar a
      // troca). Se o webp só decodar NESSE instante, o browser mostra o frame
      // comprimido do mp4 por um piscar antes da arte nítida entrar. Forçar o
      // decode AQUI — a ~3 pistas de scroll do fim, no mesmo gatilho que
      // promove os vídeos — deixa o bitmap pronto, então a troca é instantânea.
      // `.decode()` dispara o fetch mesmo num `<img loading="lazy">`; o catch
      // engole o AbortError caso o elemento saia do DOM antes de resolver.
      fieldEndImg.current?.decode().catch(() => {});
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          promote();
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(root.current);
    return () => io.disconnect();
  }, [motion, sources]);

  useGSAP(
    () => {
      // motion === null é o render de INDECISÃO (o matchMedia só resolve no
      // useEffect): sem isto o ctaBlock — sempre montado, z-20 — pintava
      // visível por um instante num load já rolado até o fim (refresh no pé
      // da página, deep-link #comecar) e sumia quando o fromTo lá embaixo o
      // jogava pra autoAlpha:0. useGSAP roda em layout effect, então este set
      // acontece ANTES do paint; quando `motion` resolver, o ctx.revert()
      // do useGSAP desfaz o set — o caminho reduced-motion volta ao estado
      // autoral (visível, parado) sem precisar de nada aqui.
      if (motion === null) {
        gsap.set(
          [ctaBlock.current, ctaGhostBlock.current].filter(Boolean),
          { autoAlpha: 0 },
        );
        // mesma exposição da pilha de cards (montada sempre que o aspect
        // permite; os filhos só ganham o fromTo quando motion resolve)
        if (cardStack.current) {
          gsap.set(Array.from(cardStack.current.children), { autoAlpha: 0 });
        }
        return;
      }

      // reduced-motion: still full-bleed com o arco em repouso, CTA e footer
      // visíveis e parados, section de altura normal. Nada a animar.
      if (!motion) return;

      // Proxy do mask. O ScrollTrigger não sabe animar o atributo `d` de um
      // <path>, então tweenamos um número e escrevemos a forma no onUpdate.
      const mask = { p: 0 };
      // vy lido do viewport A CADA escrita (leitura barata, não força reflow):
      // o elemento recortado é a camada z-0 do palco = viewport cheio, então
      // aspect = innerWidth/innerHeight. Em retrato o telhado achata pra abrir
      // com o mesmo ângulo do desktop; do 4/3 pra cima vy=1 e nada muda. Re-lê
      // no onRefresh (resize/rotação) porque é o mesmo writeArch chamado lá.
      const archVY = () =>
        Math.min(1, window.innerWidth / window.innerHeight / ARCH_REF_ASPECT);
      const writeArch = (p: number) =>
        arch.current?.setAttribute("d", archD(p, archVY()));
      writeArch(0); // `.to()` não faz immediateRender: fecha na mão antes do 1º paint

      // UMA timeline, posições absolutas em unidades de progresso (0..1) da
      // pista. Duração total = 1 pra que `tempo do tween` === `progresso do
      // scroll`, e as fases da spec possam ser lidas direto no código.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          // eixo da SECTION (a pista de 340vh), não do palco: `top bottom` é o
          // instante em que a pista assoma; `bottom bottom` é quando o palco
          // solta o sticky. Assim o fim da timeline coincide com o fim da
          // página — esta é a última section, `bottom top` nunca chega.
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.6,
          // um refresh (resize/reflow) pode reordenar o render: reescreve a
          // forma no p atual pra não deixar o arco preso num frame velho.
          onRefresh: () => writeArch(mask.p),
        },
      });

      // ── MASK 0 → 0.25 ─────────────────────────────────────────────────────
      // O arco abre NO COMPASSO da entrada e só termina quando o palco grudou.
      // A entrada (o palco deslizando até preencher a viewport) gasta os
      // primeiros 100vh da pista = progresso 0→0.25 (100vh de 400vh). Casar a
      // duração do mask com esses 0.25 faz o telhado abrir junto com a subida e
      // fechar EXATO no instante em que a tela enche — nem antes (senão o arco
      // fica full-bleed com o creme da section de cima ainda no topo), nem
      // depois. Só quando ela encheu é que a câmera começa a andar. Antes disso
      // o vídeo fica no frame 0 (tela do tablet), tight, sob o dim.
      tl.to(
        mask,
        {
          p: 1,
          duration: 0.25,
          onUpdate: () => writeArch(mask.p),
        },
        0,
      );

      // ── FRASE 0.25 → 0.40 ────────────────────────────────────────────────
      // "Enquanto você atendia, a Gaia anotou." — a única linha da primeira
      // cena, câmera ainda fechada na tela do tablet. Só assenta DEPOIS que a
      // tela encheu: entra em 0.25→0.31 (o arco acabou de fechar no full-bleed,
      // ver MASK), não durante a subida — a frase é a recompensa de ter chegado,
      // não um letreiro por cima do creme que ainda desliza. Segura 0.31→0.35.
      // Sai em 0.35→0.40, cavalgando o início do scrub do vídeo (0.31, ver
      // VÍDEO abaixo) e o DIM apagando (ver `sceneDim`): quem dispensa a frase é
      // a CÂMERA se mexendo, não um fade avulso — o `y:-24` sobe contra o
      // recuo. `fromTo` com immediateRender pelo mesmo motivo do ctaBlock e
      // dos cards: precisa nascer invisível desde o mount, senão fica de
      // fantasma sobre a tela do tablet durante toda a entrada.
      tl.fromTo(
        firstLine.current,
        { autoAlpha: 0, y: 0 },
        { autoAlpha: 1, duration: 0.06, ease: "power2.out" },
        0.25,
      );
      tl.to(
        firstLine.current,
        { autoAlpha: 0, y: -24, duration: 0.05, ease: "power2.in" },
        0.35,
      );

      // ── DIM 0 → 0.44 (SAÍDA) ─────────────────────────────────────────────
      // A cena entra ESCURA e a luz só SOBE — um sentido só, sem pulso: um dim
      // que acende e apaga viraria piscada. Por isso o estado escuro é CSS
      // (`opacity-[0.62]` no JSX, ver `sceneDim`) e existe desde o mount; a
      // timeline só tem ESTE tween, que apaga.
      //
      // 0.62 é medido, não gosto: preto a 0.62 sobre o branco da tela do
      // tablet dá ~#666, que contra texto branco fecha ~5.7:1 (passa AA até
      // pra corpo normal). A 0.50 cairia pra ~3.9:1 — passaria só como texto
      // grande, e a frase perderia a margem. Acima de 0.7 a UI do tablet
      // deixa de ser legível como produto e vira mancha.
      //
      // Uniforme no quadro inteiro, e NÃO um radial atrás do texto: o radial
      // vira borrão sobre a UI e lava justamente o que a cena existe pra
      // mostrar. Uniforme, o tablet vira brilho num quarto escuro e o produto
      // continua legível.
      //
      // Apaga em 0.31→0.45 e a frase sai em 0.35→0.40: as duas coisas começam
      // JUNTO com o scrub do vídeo (0.31). Quem apaga a frase e acende a luz é
      // a CÂMERA saindo — a luz sobe DENTRO do pull-back, terminando depois da
      // frase, então a última coisa que acontece é a cena acendendo, já sem
      // texto. Enquanto a tela ainda enchia (0→0.25) o dim fica cheio: a frase
      // só nasce em 0.25 e o pull-back só em 0.31, então nada acende antes da
      // hora.
      tl.to(
        sceneDim.current,
        { opacity: 0, duration: 0.14, ease: "power2.inOut" },
        0.31,
      );

      // ── CTA 0.64 → 0.88 ───────────────────────────────────────────────────
      // O trajeto ocluso: o bloco nasce 520px abaixo do seu lugar — ou seja, em
      // cima do corpo dela, por trás (z-20 < z-30) — e sobe até assentar na
      // faixa do topo, acima da cabeça. `y` em px e não `yPercent` porque o
      // bloco tem ~180px de altura: a viagem é de tela, não de bloco.
      // `fromTo` faz immediateRender, então o estado inicial vale desde o mount:
      // por isso o from é autoAlpha 0 e não 0.6 — a 0.6 o bloco ficaria de
      // fantasma sobre o corpo dela durante TODO o scrub do vídeo, desde o
      // frame do tablet fechado. Ele acende enquanto sobe, por trás dela.
      //
      // DOIS ALVOS, um tween: `ctaBlock` (texto, z-20) e `ctaGhostBlock` (só o
      // botão, z-35) são DOIS nós de DOM — o botão saiu do primeiro pra não
      // ficar preso no teto de z-index do pai (ver o comentário de
      // `ctaGhostBlock` lá em cima e o comentário grande no JSX). Sem os dois
      // no MESMO tween o botão chegaria fora de sincronia com o texto — um
      // subindo, o outro parado. GSAP aceita array de alvos e aplica os
      // MESMOS valores em cada um, independentemente.
      tl.fromTo(
        [ctaBlock.current, ctaGhostBlock.current].filter(Boolean),
        { y: 520, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.24, ease: "power3.out" },
        0.48,
      );

      // ── CARDS — trigger de uma vez (fora da timeline scrubada) ────────────
      // A pilha da esquerda NÃO segue o dedo. Antes ela era mais um tween nesta
      // timeline (offset 0.54), então a posição/opacidade dos cards era função
      // direta do scroll: rolar meio card pra cima mostrava meio card. Pronit
      // pediu o oposto — quando a Roberta assenta no quadro, os cards DISPARAM
      // como animação de entrada e correm sozinhos em tempo real, independentes
      // do scroll. Por isso saem da `tl` (scrub) e ganham um ScrollTrigger
      // próprio, one-shot.
      //
      // Alvo são os FILHOS, não a coluna: animar a coluna moveria os três cards
      // como uma placa só. Um por um, o stagger deixa a leitura assentar em
      // cascata. Ordem do DOM = de cima pra baixo.
      const stack = cardStack.current;
      const cards = stack ? (Array.from(stack.children) as HTMLElement[]) : [];
      if (stack && cards.length) {
        // Timeline pausada e em TEMPO REAL (segundos, não progresso): o `fromTo`
        // com immediateRender nasce invisível desde o mount — mesmo motivo do
        // CTA, senão os cards ficam de fantasma sobre o corpo dela durante todo
        // o scrub do vídeo. `play()` só quando o trigger cruza.
        const cardsIn = gsap.timeline({ paused: true });
        cardsIn.fromTo(
          cards,
          { y: 160, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.55,
            ease: "power3.out",
            stagger: 0.08,
          },
        );

        // Os MICRO-GRÁFICOS entram na MESMA timeline, cavalgando a chegada do
        // card que os hospeda: o pulso do chip abre do meio, a linha de
        // crescimento se desenha e ganha as contas em cima, as barras do dia
        // crescem da base em cascata. Tudo em `cardsIn` de propósito — o
        // onLeaveBack reverte gráfico e card juntos, de graça.
        const pulseBars = stack.querySelectorAll("[data-chart-pulse]");
        if (pulseBars.length) {
          cardsIn.fromTo(
            pulseBars,
            { scaleY: 0.15, transformOrigin: "50% 50%" },
            {
              scaleY: 1,
              duration: 0.45,
              ease: "power2.out",
              stagger: 0.035,
            },
            0.18,
          );
        }
        stack
          .querySelectorAll<SVGPolylineElement>("[data-chart-line]")
          .forEach((ln) => {
            const len = ln.getTotalLength();
            cardsIn.fromTo(
              ln,
              { strokeDasharray: len, strokeDashoffset: len },
              { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" },
              0.32,
            );
          });
        const dots = stack.querySelectorAll("[data-chart-dot]");
        if (dots.length) {
          cardsIn.fromTo(
            dots,
            { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" },
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.25,
              ease: "back.out(2)",
              stagger: 0.045,
            },
            0.5,
          );
        }
        const dayBars = stack.querySelectorAll("[data-chart-bar]");
        if (dayBars.length) {
          cardsIn.fromTo(
            dayBars,
            { scaleY: 0, transformOrigin: "50% 100%" },
            {
              scaleY: 1,
              duration: 0.5,
              ease: "power2.out",
              stagger: 0.012,
            },
            0.34,
          );
        }

        // Dispara no MESMO instante em que o bloco entrava na timeline scrubada
        // (progresso 0.54 da pista) — depois do CTA (0.48) e do recorte da
        // Roberta assentar (0.46→0.50): "os cards em seguida". Na pista de
        // 340vh presa a `top bottom → bottom bottom`, 1 unidade de progresso =
        // a altura de `root`, então `top+=54% bottom` é exatamente esse ponto.
        // toggleActions play/reverse: some ao subir de volta, redispara ao
        // descer — o trigger é do scroll, a coreografia não.
        ScrollTrigger.create({
          trigger: root.current,
          start: "top+=54% bottom",
          onEnter: () => cardsIn.play(),
          onLeaveBack: () => cardsIn.reverse(),
        });
      }

      // ── RECORTE (image280) 0.46 → 0.50 ────────────────────────────────────
      // Fade puro de `opacity` (não autoAlpha: `visibility:hidden` é caminho
      // curto pro browser adiar o decode, e é exatamente o pop que este tween
      // existe pra evitar). São os mesmos pixels do frame final do vídeo 1 — o
      // fade não se vê; ele só cobre a troca de quem segura a cena. Começa
      // quando o scrub do vídeo 1 termina (0.46).
      tl.fromTo(
        clipRoberta.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.04 },
        0.46,
      );

      // ── BASE 0.64 → 0.88 ──────────────────────────────────────────────────
      // A noite sobe do pé no MESMO tempo do CTA (0.64→0.88, ver CTA acima): o
      // texto emerge por trás da Roberta e o chão escurece embaixo dela na
      // mesma respiração, plantando os dois planos. `power2.inOut` pra subir e
      // assentar sem batida — o pedido era "bem smooth". `fromTo` com
      // immediateRender pelo mesmo motivo dos outros: nasce invisível desde o
      // mount, senão pintaria a base escura sobre a primeira cena (tela do
      // tablet) durante todo o scrub do vídeo.
      tl.fromTo(
        baseMask.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.24, ease: "power2.inOut" },
        0.48,
      );

      // O SCRIM da copy sobe NA MESMA respiração do baseMask — mesmo offset
      // (0.48), mesma duração e mesmo ease (0.24, power2.inOut): os dois
      // nascem em opacity 0 por CSS e são o mesmo chão de legibilidade,
      // acendendo junto com o CTA subindo. Antes de 0.48 não há copy nenhuma
      // pra proteger — só a primeira cena, que tem contraste próprio (o DIM,
      // `sceneDim`) — pintar o scrim ali seria escurecer a lateral esquerda
      // sem função: foi exatamente esse defeito que a Pronit reportou (faixa
      // escura antes do CTA subir). Ver o comentário de `CopyScrim`, acima.
      tl.fromTo(
        copyScrim.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.24, ease: "power2.inOut" },
        0.48,
      );

      // ── HOLD 0.72 → 0.80 ──────────────────────────────────────────────────
      // Nada se move: o recorte segura a mulher, o CTA já assentou ao lado dela
      // e a pilha à esquerda. É o tempo de LER o botão antes de a cena sair —
      // o vazio na timeline É a pausa, não precisa de tween.

      // ── TRANSIÇÃO → VÍDEO 2  0.80 → 0.86 ──────────────────────────────────
      // "Assim que o texto já está no lugar, remova a imagem e coloque o outro
      // vídeo." O recorte (image280) sai por baixo e o vídeo 2 entra na MESMA
      // pose (frame 0 = a mulher com o tablet): subir a opacidade da camada
      // z-40 tranca a silhueta, então a troca não tem pop. Opaco, o vídeo 2
      // cobre o CTA e o recorte, e o pull-out (scrub 0.80→1.0, ver VÍDEO 2
      // abaixo) abre a cena pro campo — é ele que apresenta o footer.
      tl.to(clipRoberta.current, { opacity: 0, duration: 0.06 }, 0.8);
      tl.fromTo(
        fieldLayer.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.06 },
        0.8,
      );

      // ── ARTE DO CAMPO — EXATAMENTE em 1.0 ─────────────────────────────────
      // O vídeo 2 entrega a cena pra ARTE (ver CTA_FIELD_END). Motivo é
      // qualidade, não coreografia: o frame final do mp4 fica parado na tela
      // durante a leitura inteira do footer, e H.264 entrega repouso em papa —
      // no primeiro plano a flor perde a pétala. O webp devolve o detalhe, e
      // como é a MESMA arte do fundo do footer, a cena passa a continuar por
      // trás do rodapé em vez de trocar de textura na emenda.
      //
      // POSIÇÃO 1.0, DURAÇÃO 0: a troca acontece NO FRAME em que o vídeo acaba,
      // nem antes nem depois — pedido da Pronit, e é a única posição que casa,
      // porque o scrub do vídeo 2 chega em `currentTime = duration` exatamente
      // em 1.0 (0.86 + 0.14, ver wire(v2) abaixo). Qualquer duração > 0 aqui
      // faria o fade COMEÇAR antes do fim; qualquer posição < 1.0, idem.
      //
      // Custo conhecido, aceito: a arte não é o frame final extraído do mp4 — é
      // outro render do mesmo destino, com ~15px de deslocamento na silhueta e
      // um respiro a mais de campo. O fade antigo (0.92→1.0) escondia esse pulo
      // sob a câmera ainda andando; travado no fim, a cena já parou e o pulo
      // fica exposto. Se ele incomodar, o conserto é REGISTRAR a arte contra o
      // último frame do vídeo, não voltar a antecipar a troca.
      //
      // Zero-duration em 1.0 continua segurando a régua da timeline (duração
      // 1.0) mesmo se algum vídeo não wirear — ver o bloco dos scrubs abaixo.
      //
      // `immediateRender: false` é OBRIGATÓRIO neste fromTo, e é a exceção à
      // regra dos outros (frase/CTA/cards, que PRECISAM do immediateRender pra
      // nascer invisíveis): tween de duração ZERO renderiza o estado FINAL no
      // immediateRender (t=0 já é o fim quando a duração é 0), então o default
      // de fromTo pintava `opacity:1` inline NO MOUNT — e como o playhead só
      // cruza 1.0 no último pixel de scroll, a arte (z-50) ficava opaca a
      // pista INTEIRA, cobrindo os dois vídeos: "os vídeos travaram". Medido
      // nesta sessão (screenshots em 8 paradas: o mesmo frame do campo de
      // 0.29 a 0.97 da timeline, com currentTime avançando por baixo). Quem
      // segura o mount invisível é a classe `opacity-0` do JSX, que já existe.
      tl.fromTo(
        fieldEnd.current,
        { opacity: 0 },
        { opacity: 1, duration: 0, immediateRender: false },
        1.0,
      );

      // ── VÍDEO 1 0.31 → 0.46  ·  VÍDEO 2 0.86 → 1.0 ────────────────────────
      // Os dois scrubs entram na MESMA timeline, cada um só quando SUA duração
      // é conhecida — sem ela não há alvo pro currentTime. Inserir depois é
      // seguro: as posições absolutas não esticam a timeline, e o refresh manda
      // renderizar de novo no progresso atual (deep link no meio da pista já
      // nasce com o frame certo). O vídeo 2 termina em 1.0 e a ARTE DO CAMPO
      // está fixada NESSE mesmo ponto — os dois seguram a régua (o contrato
      // "tempo do tween === progresso do scroll"). O zero-duration da arte é o
      // que mantém a duração em 1.0 mesmo se o vídeo 2 não wirear; sem nenhum
      // dos dois a timeline terminaria em 0.86 e tudo reescalaria.
      const v1 = video.current;
      const v2 = field.current;

      const attach = (v: HTMLVideoElement, at: number, dur: number) => {
        if (!Number.isFinite(v.duration) || v.duration <= 0) return;
        tl.to(v, { currentTime: v.duration, duration: dur }, at);
        ScrollTrigger.refresh();
      };

      // gsap.context reverte tweens/triggers, mas NÃO listeners de DOM — daí
      // guardar cada removedor pra desmontar antes do metadata não vazar trigger.
      const cleanups: Array<() => void> = [];
      const wire = (v: HTMLVideoElement | null, at: number, dur: number) => {
        if (!v) return;
        const go = () => attach(v, at, dur);
        if (v.readyState >= 1) {
          go();
          return;
        }
        v.addEventListener("loadedmetadata", go, { once: true });
        cleanups.push(() => v.removeEventListener("loadedmetadata", go));
      };

      wire(v1, 0.31, 0.15);
      // 0.86, NÃO 0.8: o scrub do vídeo 2 só começa DEPOIS que o crossfade
      // terminou (0.80→0.86). Começando junto com o fade, na metade dele o
      // vídeo já estava em t≈0.45s — a câmera já tinha aberto e a pose não
      // travava mais com o recorte embaixo: dupla exposição de duas Robertas
      // em escalas diferentes, com CTA e cards vazando por baixo. Enquanto a
      // camada sobe de opacidade o vídeo SEGURA o frame 0 (a pose do recorte,
      // é isso que tranca a silhueta); o pull-out corre em 0.86→1.0, já opaco.
      wire(v2, 0.86, 0.14);

      // ── PANORÂMICA DO RETRATO — só em (max-aspect-ratio: 4/3) ──────────────
      // Full-height no celular mostra só ~26% da largura do frame 1.79:1 (ver
      // MEDIA_PORTRAIT), e o cluster tablet+rosto ocupa ~36% — não cabe fixo.
      // Mas o primeiro vídeo é um PULL-BACK: o sujeito anda no quadro, então a
      // janela de 26% desliza junto (`object-position` X) e os dois ficam
      // sempre centrados, só a franja sai. matchMedia porque este X é inline e
      // venceria a classe do desktop; ao SAIR do retrato o cleanup zera o style
      // e a classe (`object-[40%_50%]`) volta a mandar. Mesmo eixo/scrub do
      // scrub do vídeo (top bottom → bottom bottom, 0.6), então o pan e o frame
      // andam em lockstep.
      gsap.matchMedia().add("(max-aspect-ratio: 4/3)", () => {
        const { clamp, mapRange } = gsap.utils;
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => {
            const p = self.progress;
            // VÍDEO 1: fechado no tablet (30%) → mulher+tablet (46%) no scrub
            // 0.31→0.46; preso nas pontas. Depois de 0.46 segura 46% — é o frame
            // final que fica na tela até o vídeo 2 cobrir.
            if (v1)
              v1.style.objectPosition = `${mapRange(0.31, 0.46, 30, 46, clamp(0.31, 0.46, p))}% 50%`;
            // VÍDEO 2: nasce na MESMA pose (46%, casa a silhueta no crossfade) e
            // SEGUE a mulher até o campo (63%): no pull-out ela encolhe e assenta
            // em x≈0.60 do frame, então a janela panora pra centrá-la — é o mesmo
            // 63% da arte do campo e do fundo do footer (ver MEDIA_FIELD_END).
            if (v2)
              v2.style.objectPosition = `${mapRange(0.86, 1.0, 46, 63, clamp(0.86, 1.0, p))}% 50%`;
          },
        });
        return () => {
          st.kill();
          if (v1) v1.style.objectPosition = "";
          if (v2) v2.style.objectPosition = "";
        };
      });

      // motion/sources ainda indecisos (nenhum vídeo no DOM): o resto da
      // timeline já vale e este efeito reroda quando `sources` resolver.
      if (!v1 && !v2) ScrollTrigger.refresh();

      return () => cleanups.forEach((fn) => fn());
    },
    { scope: root, dependencies: [motion, sources] },
  );

  const still = motion === false;

  return (
    <>
      <section
        ref={root}
        id="comecar"
        // base = o escuro em que o arco morde. Era `bg-neutro-50` (creme) pra
        // casar com a Pricing quando ELA ficava logo acima; a ordem mudou
        // (Pricing → Testimonials → Faq → CTA) e agora quem encosta em cima é o
        // Faq (bg-k-ink, escuro), então o creme virava uma faixa branca no meio
        // de dois escuros — a Pronit vetou. #0A0714 é um lavanda MUITO fundo
        // (mais escuro que o antigo #17102A, a pedido da Pronit): unifica o
        // quadro num escuro só, o pé fica no mundo lavanda e a cena roxa emerge
        // dele sem emenda. É o MESMO valor pro qual a minimask do pé do Faq
        // dissolve (ver Faq.tsx) — as duas sections fecham no mesmo escuro, sem
        // linha de corte entre elas. Sem `overflow-hidden` aqui — ele
        // transformaria a section no scroll container do palco e mataria o
        // sticky. O recorte é do palco.
        className="relative bg-[#0A0714]"
        // A pista. 400vh: ~100vh de entrada (o palco desliza até grudar) + 300vh
        // de execução da timeline — agora com dois vídeos (o pull-back e o
        // pull-out que apresenta o footer), o pull-out sozinho leva os últimos
        // 20% (~80vh de scroll). reduced-motion não tem pista.
        style={still ? undefined : { height: "400vh" }}
      >
        {/* PALCO — 100vh grudado no topo enquanto a pista corre por baixo.
          `isolate` prende os z-index das camadas aqui dentro. */}
        <div
          className={
            still
              ? "relative isolate flex min-h-screen flex-col overflow-hidden"
              : "sticky top-0 h-screen overflow-hidden isolate"
          }
        >
          {/* O arco. objectBoundingBox = coordenadas 0..1, escala sozinho com o
            elemento. Vídeo e recorte apontam pro MESMO id — é o que garante que
            os dois sejam cortados exatamente igual. */}
          <svg aria-hidden className="absolute h-0 w-0" focusable="false">
            <defs>
              <clipPath id={ARCH_ID} clipPathUnits="objectBoundingBox">
                <path ref={arch} d={ARCH_REST} />
              </clipPath>
              {/* Correção do cast do recorte. O webp da Roberta tem ~6 pontos de
                VERDE a menos que o frame final do vídeo (medido em pele, com
                enquadramento registrado) — verde baixo = magenta, e é isso que
                faz a cor dela "mudar" quando o recorte assume a cena. Multiplicar
                o verde por 1.055 devolve o tom do vídeo e, de quebra, deixa o
                crossfade vídeo→recorte contínuo. Só cor: nenhum pixel se move, o
                registro pixel-perfect com o frame do vídeo continua intacto.
                `sRGB` pra casar com a medição perceptual (o default linearRGB
                multiplicaria na luz, não na cor). */}
              <filter
                id="cta-cutout-tint"
                colorInterpolationFilters="sRGB"
                x="0"
                y="0"
                width="100%"
                height="100%"
              >
                <feColorMatrix
                  type="matrix"
                  values="1 0 0 0 0  0 1.055 0 0 0  0 0 1 0 0  0 0 0 1 0"
                />
              </filter>
            </defs>
          </svg>

          {/* z-0 · CHAPA + CENA + wash, recortados pelo arco */}
          <div
            className="absolute inset-0 z-0"
            style={{ clipPath: `url(#${ARCH_ID})` }}
          >
            {/* CHÃO ESCURO — SÓ EM RETRATO. Em retrato a cena não é full-bleed:
              vive numa banda 4/5 (ver SCENE_BOX_SCENE) que se dissolve numa
              máscara na base. A máscara funde o vídeo pra TRANSPARENTE, e o que
              aparece atrás é o que estiver por baixo — e o `<body>`/section é
              creme (bg-neutro-50, ver a section), então a banda fundia num
              CINZA CLARO esbranquiçado. A Pronit vetou: o pé tem que ser escuro,
              a máscara tem que dissolver no escuro. Esta chapa dá esse fundo —
              cor #0A0714, a MESMA da base da section (ver lá em cima) pra o
              retrato fechar no mesmo escuro do desktop, sem virar buraco preto
              neutro (segue no mundo lavanda, só que bem fundo).
              Primeiro filho do z-0 = atrás de tudo: onde o vídeo pinta opaco
              (78% do topo da banda) ele cobre isto; onde a máscara abre (base
              da banda e tudo abaixo dela) isto aparece. Gated a
              `max-aspect-ratio:4/3` — o COMPLEMENTO do gate da banda: no
              desktop a cena é full-bleed e cobre a tela inteira, então este
              chão nunca apareceria (e por segurança nem é pintado lá). */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 [@media(max-aspect-ratio:4/3)]:bg-[#0A0714]"
            />

            {/* a cena. MESMA caixa do recorte lá embaixo — ver SCENE_BOX. */}
            <div className={SCENE_BOX_SCENE}>
              {still ? (
                // reduced-motion: o último frame, e nenhum byte de vídeo na rede.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={CTA_STILL} alt="" aria-hidden className={MEDIA_SCENE} />
              ) : motion === true && sources ? (
                <video
                  ref={video}
                  src={sources.video}
                  poster={CTA_POSTER}
                  onLoadedData={primeForSeek}
                  muted
                  playsInline
                  // "none" no mount — o IntersectionObserver logo acima
                  // promove pra "auto" + .load() perto da pista. Ver o
                  // useEffect de lazy-load, antes do useGSAP.
                  preload="none"
                  disablePictureInPicture
                  // decorativo e dirigido só pelo scroll: fora do foco e da a11y tree
                  tabIndex={-1}
                  aria-hidden
                  className={MEDIA_SCENE}
                />
              ) : null}
            </div>

            {/* DENTRO do clip de propósito: fora dele os scrims pintariam o creme
              ao redor do arco. */}
            <Wash />

            {/* Scrim direcionado da copy — ver o comentário de `CopyScrim`,
              acima: contraste do eyebrow/headline/sub. Em motion, nasce em 0
              por CSS e sobe JUNTO com o baseMask (mesmo offset/ease, ver
              useGSAP) — antes do CTA subir não há copy pra proteger, só a
              primeira cena (contraste próprio, o DIM). Em still é permanente:
              contraste é piso, não coreografia. Não existe em motion===null —
              não pode pintar antes de saber qual dos dois casos é este.
              Espacialmente morre (fade horizontal) antes de chegar nela — ver
              comentário acima. */}
            {motion === true ? (
              <CopyScrim scrimRef={copyScrim} bornHidden />
            ) : still ? (
              <CopyScrim />
            ) : null}

            {/* BASE ESCURA — roxo profundo que sobe do pé quando o recorte
              assume o quadro, subindo ATÉ ATRÁS DO BOTÃO (h-72%). É o CHÃO da
              Roberta: vive no z-0 (por cima do vídeo e do Wash, abaixo do CTA
              z-20 e da Roberta z-30), então ela pousa POR CIMA dele e o texto
              branco do CTA ganha contraste em vez de perder. Cor de marca, não
              breu neutro: base #17102A (roxo-900 puxado pro escuro) fundindo em
              rgba(36,26,56)=roxo-900 — o chão fica no mesmo mundo lavanda da
              cena, não vira buraco preto. Não é o scrim de base permanente do
              Wash (aquele é só tonalidade, sempre ligado) — esta é temporal e
              forte, existe pra ancorar a troca de vídeo→recorte. Nasce em
              opacity 0 via CSS e a timeline só a acende (ver o tween BASE em
              useGSAP). Só com motion: em reduced-motion o still já traz a cena
              montada, sem troca pra ancorar. */}
            {motion === true ? (
              <div
                ref={baseMask}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] opacity-0 bg-[linear-gradient(to_top,#17102A_0%,rgba(36,26,56,0.92)_26%,rgba(36,26,56,0.55)_54%,rgba(36,26,56,0.22)_74%,transparent_92%)]"
              />
            ) : null}

            {/* DIM da primeira cena — legibilidade da FRASE, não da marca (isso é
              o Wash). Precisa vir DEPOIS do Wash (cobre vídeo+wash) e ANTES da
              FRASE (que tem que ficar por cima do dim) — a ordem de pintura é a
              ordem do DOM. Nasce opaco por CSS (`opacity-[0.62]`, ver o porquê
              do número no tween de saída, logo abaixo em useGSAP) e existe
              desde o mount: a cena entra escura e a luz só sobe, nunca pisca.
              Fora em reduced-motion pelo mesmo motivo da frase: sem pista não
              há primeira cena, e o still nasceria escuro sem nunca acender. */}
            {motion === true ? (
              <div
                ref={sceneDim}
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[#0B0D12] opacity-[0.62]"
              />
            ) : null}

            {/* FRASE da primeira cena — câmera fechada na tela do tablet, antes
              do pull-back. Vive DENTRO do clip de propósito: assim o arco já
              a corta de graça (nunca sangra no creme enquanto o telhado abre)
              e o z-0 já a mantém abaixo do CTA (z-20) e da Roberta (z-30). Só
              existe com motion: em reduced-motion não há primeira cena — o
              still já é o destino da câmera, e a frase boiaria em cima do
              CTA. Sem `aria-hidden`: é copy de verdade, fica na a11y tree. */}
            {motion === true ? (
              <div
                ref={firstLine}
                className="pointer-events-none absolute inset-0 grid place-items-center px-[6vw] opacity-0"
              >
                <p className="max-w-[20ch] text-balance text-center font-title text-[clamp(1.75rem,4.2vw,4rem)] font-medium leading-[0.98] tracking-[-0.035em] text-white">
                  Enquanto você atendia, a Gaia anotou.
                </p>
              </div>
            ) : null}
          </div>

          {/* z-20 · CTA — entre o vídeo (z-0) e a Roberta (z-30): é ESSA ordem que
            faz o texto passar por trás dela. A camada segue full-screen; quem
            viaja é o bloco de dentro. */}
          {/* `pb-[8vh]` sobe o bloco 4vh acima do centro óptico. Não é gosto: o
            footer entra com `-mt-[16vh]` e a dissolvência dele lambe o pé do
            palco — centrado de verdade, a microcopy assentava dentro da emenda.
            Subindo, o bloco fica na faixa alta da coluna roxa, que é onde ela
            é mais larga (o braço dela avança conforme desce). */}
          {/* `CTA_JUSTIFY` (constante no topo do arquivo) faz `justify-end` +
            `padding-right` calculado dentro do gate de aspecto (>=4/3) —
            ancora a BORDA DIREITA do bloco numa distância fixa da silhueta
            dela. A conta completa (o modelo de L, o porquê do gap de 8px, a
            trava pro ultrawide) está no comentário da constante, lá em cima:
            é a MESMA string usada pelo botão sozinho (z-35, mais abaixo no
            JSX) — os dois têm que concordar em X, senão o botão descola do
            resto do bloco. Abaixo de 4/3 nada muda: continua `justify-start
            px-[3vw]`, o layout de largura cheia do mobile. */}
          <div className={(still ? "relative z-20 flex-1 " : "absolute inset-0 z-20 ") + CTA_JUSTIFY}>
            {/* AO LADO DO TABLET, não acima dela. Com a cena full-bleed a cabeça
              dela fica em y≈72 e não sobra teto; o vazio real é a coluna roxa à
              direita do tablet (~350px em 1440, ~500px em 1920). Centrado na
              vertical = na altura do tablet. A borda direita do bloco encosta no
              tablet de propósito: o tablet vem no recorte (z-30), então ele
              come a beirada do texto — profundidade, e é o "passa por trás".
              O BOTÃO é a exceção: ele NÃO pode passar por trás (ver o
              comentário grande onde ele mora agora, lá embaixo, perto de
              `ctaGhostBlock`) — só o texto ganha esse gesto. */}
            {/* O GATE É PROPORÇÃO, NÃO LARGURA — mesma regra da pilha de cards,
              pelo mesmo motivo. Abaixo de 4/3 ela simplesmente NÃO ESTÁ NO
              QUADRO: o cover ancorado à direita corta tudo menos o fundo, então
              não há silhueta pra sobrepor e a coluna estreita perde a razão de
              existir. `md:` não serve — iPad retrato tem 820px de largura (passa
              em `md`) e aspecto 0.69 (ela sumiu). Aqui embaixo o bloco é o que
              deveria ter sido sempre: largura cheia, medida de leitura no
              `max-w`. Isso conserta de passagem um bug antigo — com `27vw` o
              bloco tinha 105px num iPhone e "consulta"/"diferente." sangravam
              pra fora da tela. (A CENA no mobile continua sem ela; é outro
              assunto, não mexi.) */}
            <div
              ref={ctaBlock}
              className="w-full max-w-[20rem] text-left [@media(min-aspect-ratio:4/3)]:w-[30rem] [@media(min-aspect-ratio:4/3)]:max-w-none"
            >
              {/* EYEBROW — o fio é quem sobrepõe de verdade. Ele sai do bloco
                pra esquerda (`right-full`) e vai morrer por baixo do tablet, em
                degradê: some dissolvendo em vez de bater num corte reto. É a
                peça que custa zero legibilidade — nenhuma letra mora nela — e
                por isso é ela que pode avançar 7vw pra dentro dela. */}
              <div className="relative pl-1">
                <span
                  aria-hidden
                  className="absolute top-1/2 left-full ml-4 h-px w-[7vw] bg-[linear-gradient(to_right,rgba(255,255,255,0.45),transparent)]"
                />
                {/* 55%→80%: em 55% fechava 1.65:1 contra o fundo real (medido
                  com o texto escondido, p95 do pior pixel — ver CopyScrim);
                  80% fecha 6.8–9.4:1 conforme o viewport, folga confortável
                  acima do piso AA de 4.5:1 nos 4 testados. */}
                <span className="font-body text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">
                  Pronta pra começar?
                </span>
              </div>

              {/* GRANDE DE VERDADE. O tamanho vem do corpo da fonte + quebra
                natural na coluna, não de quebras escritas na mão. A 4.2vw ela
                fecha em ~64px e quebra em 3 linhas, que é o que enche a caixa
                em vez de boiar nela. Régua awwwards: leading abaixo de 1
                (`0.98` — as linhas se tocam e viram um bloco, não uma lista),
                tracking negativo forte (`-0.035em`, que só fecha bem NESSE
                corpo; em 28px no mobile o mesmo valor colaria as hastes — daí o
                clamp cuidar do corpo e o tracking ficar no limite do aceitável
                pro menor deles) e o itálico como única quebra de registro.
                `pl-1` alinha a haste da caixa alta com o eyebrow: a serifa tem
                sidebearing próprio e sem isso o "S" recua sozinho.
                SEM `text-balance` de propósito (ver o comentário grande do
                container do CTA, acima): com a caixa agora travada pela
                borda direita (DEFEITO 1), preencher a medida inteira pelo
                algoritmo padrão (greedy) é seguro, e é ele — não o
                rebalanceamento do `text-balance` — que faz a tinta chegar
                perto da medida em vez de sobrar vão morto antes dela. */}
              <h2 className="mt-6 [@media(max-aspect-ratio:4/3)]:mt-4 pl-1 font-title text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.98] tracking-[-0.035em] text-white">
                Sua próxima consulta pode ser{" "}
                <span className="font-normal italic text-roxo-300">
                  diferente.
                </span>
              </h2>

              {/* SUB — registro oposto ao da headline de propósito: sans, corpo
                pequeno, leading larga, branco a 80%. É o vale entre o pico da
                headline e o peso do botão; no mesmo registro dos dois viraria
                mais uma linha da headline. `max-w` em `ch` porque quem manda
                aqui é a medida de leitura, não a coluna. */}
              {/* 60%→80%: mesma correção do eyebrow — 60% fechava 1.89:1
                contra o fundo real; 80% fecha 5.4–7.6:1 conforme o viewport
                (ver CopyScrim). Precisou de mais opacidade que o eyebrow
                porque o `sub` é a última linha do bloco, mais perto de onde
                o scrim já está esmaecendo. */}
              <p className="mt-5 [@media(max-aspect-ratio:4/3)]:mt-3 max-w-[36ch] [@media(max-aspect-ratio:4/3)]:max-w-[30ch] pl-1 font-body text-[15px] [@media(max-aspect-ratio:4/3)]:text-[13.5px] leading-[1.6] [@media(max-aspect-ratio:4/3)]:leading-[1.5] text-white/80">
                Comece hoje e sinta a diferença já no próximo atendimento.
              </p>
              {/* ESPAÇADOR INVISÍVEL DA ALTURA DO BOTÃO — o SIMÉTRICO do clone de
                texto que o `ctaGhostBlock` já carrega. O botão real mora naquela
                camada irmã (z-35), que bottom-ancora [clone de texto + botão]
                como uma caixa só; este bloco (z-20) bottom-ancora só o texto. Em
                RETRATO (`items-end`, ver CTA_JUSTIFY) bottom-ancorar duas caixas
                de ALTURAS diferentes desalinha os TOPOS — e o botão pousava por
                cima do `sub` (medido: ambos com bottom em y≈760 num iPhone). Dar
                a este bloco a mesma altura de botão (`mt-10 h-14`, idêntico ao
                wrapper do pill no ghost) iguala as caixas: bottom-ancoradas, os
                topos voltam a coincidir e o registro texto↔botão se reata, o
                MESMO mecanismo de "caixa é o contrato" do resto da cena. Em
                landscape (`items-start`) é inerte: 96px invisíveis pendurados no
                pé de um bloco top-ancorado não movem nada. */}
              <div aria-hidden className="invisible mt-10 [@media(max-aspect-ratio:4/3)]:mt-8 h-14" />
              {/* O BOTÃO NÃO MORA MAIS AQUI — ver `ctaGhostBlock`, mais abaixo
                no JSX (depois do recorte, z-35). DEFEITO 2 do handoff: com o
                botão como último filho deste bloco (z-20, DE PROPÓSITO abaixo
                da Roberta, z-30 — é o que faz o TEXTO passar por trás dela),
                ele herdava a mesma oclusão do texto. Mas um z-index num filho
                não escapa o teto do pai: `ctaBlock` só pinta no nível "z-20"
                não importa o que algum descendente peça, porque a `position`
                + `z-index` do PRÓPRIO `ctaBlock`-wrapper (a `<div>` logo
                acima, no JSX) já fecham um novo contexto de empilhamento —
                então "subir o z-index só do botão" não tira ele de trás da
                Roberta, ele preso do mesmo jeito. Confirmado ao vivo: depois
                do DEFEITO 1 empurrar o bloco mais perto dela, o botão ficou
                sob o tablet translúcido em 1280/1440/1512 (ver screenshots
                `zoom-button-*.png` no scratchpad da sessão) — só em 1920 o
                canto do tablet não alcançava mais o pill. Um CTA que o
                usuário não CONSEGUE ler nem clicar é P0; a solução tinha que
                ser estrutural, não um ajuste de posição que volta a quebrar
                no próximo reflow do texto. */}
            </div>

            {/* A PILHA — contrapeso do CTA, que sozinho na coluna direita deixa
              a cena torta. MESMA camada z-20 do CTA: a Roberta é z-30, então
              ela passa POR CIMA dos cards, igualzinho ao que faz com o texto.
              `absolute` pra sair do fluxo do flex (`justify-end`) que centra o
              bloco do CTA — sem isso os cards entrariam como mais um item da
              linha em vez de ficar plantados no canto.

              A OCLUSÃO É O GESTO, não um efeito colateral. A pilha vivia
              espremida na boca da cunha (topo esquerdo), no único bolsão onde
              nada dela encostava nos cards — e o preço era uma composição em
              que os dois planos nunca se tocavam: cards de um lado, Roberta do
              outro, sem profundidade nenhuma. Descendo pra cá eles atravessam
              o cabelo e o braço dela, e é justamente esse cruzamento que planta
              a cena em camadas. Cada card entrega ~30% da borda direita pra
              ela; o conteúdo todo mora no terço esquerdo, que é a faixa que o
              recorte nunca alcança.

              A ESCADA (`ml` por card) segue a silhueta. O braço dela avança
              conforme desce, então a pilha recua na mesma medida: 6vw no chip
              (que nasce mais perto do centro, onde só o cabelo passa), 1vw no
              card de escala, 0 no card de rotina — o mais baixo e o mais fundo
              atrás do braço. Alinhada à esquerda, a coluna encostaria no braço
              lá embaixo e ficaria com um vão inútil em cima.

              Tudo ALINHADO À ESQUERDA dentro do card: o conteúdo se agarra na
              borda livre em vez de flutuar pro meio, que é justo por onde ela
              entra. */}
            {/* O GATE É PROPORÇÃO, NÃO LARGURA — e a diferença é o bug.
              A silhueta dela é a BORDA DO CORTE, não uma coluna do layout: a
              foto é 1.79:1 e o `object-cover` ancorado à direita (ver MEDIA)
              come o lado ESQUERDO quando a viewport é mais estreita que ela. O
              lado direito (a coluna do CTA) é estável em qualquer viewport; o
              esquerdo abre e fecha com o ASPECTO. Por isso `md:`/`lg:` não
              servem: 1280×854 e 1512×982 têm largura parecida e vazios
              completamente diferentes.

              12/7 = 1.714, e ele SUBIU de 1.52 porque a pilha desceu. Aquele
              1.52 media a boca da cunha, no topo, onde o vazio é largo; aqui
              embaixo, na altura do braço, a faixa livre é outra e some muito
              antes. Medido linha a linha (alpha do recorte amostrado em canvas
              contra a tinta real de cada linha, via Range — caixa de <p> mede
              a coluna, não a palavra, e mentiria pra mais):
                · 1.600 (1440×900)  — 7 linhas cortadas, pior −89. Fora.
                · 1.655 (1440×870)  — 6 cortadas, pior −45. Fora.
                · 1.694 (1440×850)  — 4 cortadas, pior −18. Fora.
                · 1.737 (1440×829)  — 0 cortadas, pior +24.
                · 1.778 (1600×900)  — 0 cortadas, pior +61.
              O corte real está entre 1.694 e 1.737; 12/7 é a fração limpa
              dentro dessa janela. O PREÇO É CONHECIDO: 1440×900 e o MacBook
              Pro 14" (1.54) perdem a pilha inteira e o CTA volta a ficar sem
              contrapeso à esquerda. É o custo de plantar os cards em cima do
              corpo dela — nessa posição o vazio simplesmente não existe abaixo
              de 1.71, e mostrar viraria sopa. Remedir se a foto ou o MEDIA
              mudarem: `scale-110`/`object-[100%_50%]` movem essa borda. */}
            {/* `items-start` + `w-[248px]` NO CARD, não na coluna — e isso é
              pré-requisito da escada, não estilo. Com a largura na coluna, o
              stretch padrão do flex faz o `ml` de cada card DESCONTAR da caixa
              em vez de empurrá-la: o chip virava 248−6vw ≈ 162px e o nome da
              Marina truncava em "Marina A...". Com a largura no filho, o `ml`
              só desloca. (`translate-x` resolveria o layout também, mas a
              timeline escreve transform nesses mesmos nós — ver CARDS.) */}
            {/* TOP EM CLAMP, não fixo — os micro-gráficos engordaram a pilha
              (~630px com gap-10) e `top-[32vh]` cravado estourava o card de
              rotina pra fora da viewport em 1366×768 (bottom 908 > 768,
              medido). O clamp cede APENAS quando falta teto: em ≥1000px de
              altura `32vh` vence e a composição fica a mesma de antes; abaixo
              disso `100vh−660px` assume e a pilha sobe só o necessário pra
              caber (660 = 630 medidos + 30 de respiro — remedir se os cards
              mudarem de altura). O piso de 1.5rem é o cinto pra viewports
              minúsculas: melhor chip alto que card cortado. */}
            <div
              ref={cardStack}
              className="absolute right-[1vw] top-[clamp(1.5rem,100vh_-_660px,32vh)] hidden flex-col items-end gap-10 [@media(min-aspect-ratio:12/7)]:flex"
            >
              {/* MOMENTO — o produto agindo, não um número sobre ele. Mesmo
                vocabulário da tela "início" do iPhone 3D (ver PhoneScreen:
                InicioScreen), de propósito: quem rolou a página inteira já viu
                essa anamnese ficar pronta no telefone. Aqui ela reaparece do
                lado de fora, como se o workspace tivesse vazado do tablet.
                `rounded-lg` (24px) e não `rounded-card` (40px): num bloco de
                ~72px de altura, 40px de raio vira pílula. */}
              <div
                className={`relative mr-[6vw] flex w-[324px] items-center gap-3 overflow-hidden rounded-lg p-5 ${CARD_SHADOW} ${CARD_GLASS}`}
              >
                <div aria-hidden className={`${CARD_SHEEN} rounded-lg`} />
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-azul-100 font-title text-[12px] font-semibold text-azul-800">
                  MA
                </span>
                <div className="min-w-0">
                  <p className="truncate font-title text-[14px] font-medium leading-tight text-white">
                    Marina Alves
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 font-body text-[12px] leading-none text-white/60">
                    <IconCheck className="h-3 w-3 shrink-0 text-sage-300" />
                    Anamnese pronta
                  </p>
                </div>
                {/* pulso — sinal vital ao lado do nome; o `ml-auto` do svg o
                  leva pra vaga vazia da direita, onde só o cabelo passa */}
                <PulseBars />
              </div>

              {/* ESCALA — o cenário onde o momento acontece. Sem o arco que
                havia aqui: era ornamento assumido (uma contagem de pacientes
                não tem teto, então não há escala pra desenhar), custava ~60px
                de altura e um arco centrado sobre conteúdo alinhado à esquerda
                não tem onde se apoiar. */}
              <div
                className={`relative mr-[1vw] w-[324px] overflow-hidden rounded-card p-7 ${CARD_SHADOW} ${CARD_GLASS}`}
              >
                <div aria-hidden className={`${CARD_SHEEN} rounded-card`} />
                <p className="font-title text-[2.75rem] font-medium leading-none tracking-[-0.02em] text-white">
                  300
                </p>
                <p className="mt-2 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
                  Pacientes
                </p>
                {/* `max-w` não é capricho de rag: sem ele a linha usa os 200px
                  internos do card e a ponta direita cai debaixo do cabelo. */}
                <p className="mt-3 max-w-[220px] font-body text-[13px] leading-relaxed text-white/55">
                  Todos com histórico completo.
                </p>
                {/* a linha que LEVA até o 300 — 212px de largura, dentro dos
                  ~220px seguros do cabelo (mesma régua do max-w acima) */}
                <GrowthLine />
              </div>

              {/* ROTINA — o arco inteiro do produto num dia, e o fecho da
                escada: momento (uma anamnese) → escala (300 pacientes) → o
                caminho que cada um percorre. Sem nome de paciente de propósito:
                o chip lá em cima já é a Marina, repetir aqui encolheria os 300
                de volta pra uma pessoa só. Os horários são o argumento — 09:12
                → 14:40 é a consulta inteira resolvida no mesmo dia.
                É o card mais baixo e o mais coberto: nada aqui passa dos ~150px
                da esquerda, então o braço dela leva só moldura. */}
              <div
                className={`relative w-[324px] overflow-hidden rounded-card p-7 ${CARD_SHADOW} ${CARD_GLASS}`}
              >
                <div aria-hidden className={`${CARD_SHEEN} rounded-card`} />
                <p className="font-body text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
                  Hoje
                </p>
                {/* HORÁRIO PRIMEIRO, e rótulo curto — as duas decisões saem da
                  mesma régua. `ml-auto` no horário (o reflexo) o encostaria na
                  borda direita do card, que é justo o que o braço dela cobre:
                  as três linhas perderiam o número, que é o argumento inteiro.
                  Com a coluna de tempo à esquerda e o rótulo em uma palavra, a
                  linha mais longa fecha em ~145px — o texto todo cabe no terço
                  livre e o rag fica ragged-right dentro dele. O "respondida /
                  realizada" que os rótulos perderam quem diz é o check. */}
                <ul className="mt-5 space-y-4">
                  {[
                    ["09:12", "Anamnese"],
                    ["14:00", "Consulta"],
                    ["14:40", "Plano enviado"],
                  ].map(([time, label]) => (
                    <li
                      key={label}
                      className="flex items-center gap-2 font-body text-[13px] leading-none"
                    >
                      <IconCheck className="h-3.5 w-3.5 shrink-0 text-sage-300" />
                      <span className="w-[38px] shrink-0 tabular-nums text-white/45">
                        {time}
                      </span>
                      <span className="text-white/80">{label}</span>
                    </li>
                  ))}
                </ul>
                {/* o MESMO dia da lista, em barras: os três acentos são os
                  três horários de cima. Largura cheia de propósito — a ponta
                  direita mergulha sob o braço dela, que é o gesto da pilha
                  (oclusão = profundidade); o dado útil mora no trecho livre. */}
                <DayBars />
              </div>
            </div>
          </div>

          {/* z-30 · ROBERTA — recorte alpha por cima do CTA. Mesmo clip, MESMA
            caixa do vídeo (SCENE_BOX, resolvido contra o MESMO `inset-0` do
            palco): é o registro que faz ele sumir dentro do frame final.
            `opacity-0` (e não `hidden`) desde o mount: o browser precisa
            manter o <img> renderizável pra decodificar antes do fade em 0.62.
            Fora em reduced-motion — o still já traz a Roberta desenhada.
            FORA ABAIXO DE 4/3 (mesmo gate do bloco do CTA, mesmo motivo): sem
            silhueta no quadro o recorte só contribui a quina do tablet — e ela
            pintava POR CIMA do "S" de "Sua próxima consulta" em 360px. Sem o
            recorte o texto passa NA FRENTE, que é o certo quando não há
            ninguém pra passar por trás. */}
          {motion === true && sources ? (
            <div
              ref={clipRoberta}
              className="pointer-events-none absolute inset-0 z-30 hidden opacity-0 [@media(min-aspect-ratio:4/3)]:block"
              style={{ clipPath: `url(#${ARCH_ID})` }}
            >
              <div className={SCENE_BOX_SCENE}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sources.cutout}
                  alt=""
                  aria-hidden
                  decoding="async"
                  className={MEDIA_SCENE}
                  // devolve o verde que o webp perdeu (ver filtro cta-cutout-tint)
                  style={{ filter: "url(#cta-cutout-tint)" }}
                />
              </div>
            </div>
          ) : null}

          {/* z-35 · BOTÃO DO CTA, SOZINHO — acima do recorte (z-30), abaixo do
            vídeo 2 (z-40, que precisa continuar cobrindo tudo na transição
            final). DEFEITO 2 do handoff: o pill "Começar grátis" vivia como
            último filho de `ctaBlock` (z-20), a MESMA camada que fica DE
            PROPÓSITO abaixo da Roberta — é o que faz o texto passar por trás
            dela, o gesto de profundidade da cena. Mas o alvo CLICÁVEL não
            pode ter o mesmo destino do texto: um CTA que ninguém enxerga nem
            alcança é pior que qualquer problema de contraste. Confirmado com
            `git stash` (screenshot 1440 antes/depois desta sessão): o botão
            NÃO estava quebrado no commit — a versão comitada usa
            `justify-start` sem empurrão nenhum, então o pill nascia fora do
            alcance do tablet. A regressão é desta sessão: o DEFEITO 1
            (empurrar o bloco pra perto da silhueta) arrasta o botão junto,
            porque ele é filho do mesmo bloco que a headline. Corrigido o
            DEFEITO 1, o botão ainda ficava sob a borda translúcida do tablet
            em 1280/1440/1512 (só 1920 escapava) — subir `z-index` NÃO
            resolve: `ctaBlock` mora dentro de uma `<div>` com `position` +
            `z-index` próprios (a camada z-20), e isso fecha um contexto de
            empilhamento — todo descendente pinta no TETO desse contexto
            (z-20), não importa o z-index que peça pra si. Pra escapar de
            verdade o nó tem que ser um IRMÃO em nível mais alto, não um
            filho mais "z-index alto".

            A SOLUÇÃO: o botão mudou de endereço, não de dono visual. Esta
            camada usa o MESMO `CTA_JUSTIFY` do bloco de texto (topo do
            arquivo) — garante que a coluna horizontal seja IDÊNTICA, sem
            duplicar a fórmula — e por dentro reproduz a MESMA altura até o
            botão com um clone INVISÍVEL (`invisible`, não `hidden`: mantém a
            caixa no fluxo, só não pinta) do eyebrow+h2+p. `visibility:hidden`
            tira o clone da pintura E do hit-test, então ele nunca captura
            clique nem duplica anúncio de leitor de tela (`aria-hidden`
            reforça isso). A vantagem de clonar TEXTO em vez de sincronizar
            posição via JS (`getBoundingClientRect` + rAF): a altura do `<h2>`
            varia com o número de linhas, que varia com a largura da coluna,
            que varia com o viewport — o clone herda essa conta de graça, no
            MESMO layout engine que decide a altura do original, sem
            reimplementar nada em JS e sem depender de um listener rodando a
            cada frame do scroll.

            `pointer-events-none` na camada inteira, `pointer-events-auto` só
            no wrapper do botão: a camada não pode roubar clique/hover de
            nada que esteja embaixo dela (a cena, os cards) fora da área exata
            do pill. O `y`/`autoAlpha` do CTA sobem os dois blocos JUNTOS —
            ver o tween CTA em useGSAP, agora com dois alvos — senão o botão
            chegaria fora de sincronia com o texto. */}
          <div
            className={
              // `z-[35]` (arbitrary value): a escala padrão do Tailwind pula
              // de 30 pra 40, não tem "z-35" pronto — e este projeto não
              // estende `zIndex` no tailwind.config.ts (conferido).
              "absolute inset-0 z-[35] pointer-events-none " + CTA_JUSTIFY
            }
          >
            <div
              ref={ctaGhostBlock}
              className="w-full max-w-[20rem] text-left [@media(min-aspect-ratio:4/3)]:w-[30rem] [@media(min-aspect-ratio:4/3)]:max-w-none"
            >
              <div aria-hidden className="invisible">
                <div className="relative pl-1">
                  <span className="font-body text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">
                    Pronta pra começar?
                  </span>
                </div>
                <h2 className="mt-6 [@media(max-aspect-ratio:4/3)]:mt-4 pl-1 font-title text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.98] tracking-[-0.035em] text-white">
                  Sua próxima consulta pode ser{" "}
                  <span className="font-normal italic text-roxo-300">
                    diferente.
                  </span>
                </h2>
                <p className="mt-5 [@media(max-aspect-ratio:4/3)]:mt-3 max-w-[36ch] [@media(max-aspect-ratio:4/3)]:max-w-[30ch] pl-1 font-body text-[15px] [@media(max-aspect-ratio:4/3)]:text-[13.5px] leading-[1.6] [@media(max-aspect-ratio:4/3)]:leading-[1.5] text-white/80">
                  Comece hoje e sinta a diferença já no próximo atendimento.
                </p>
              </div>

              {/* BOTÃO — pill que abraça o texto (`w-fit`), não uma barra na
                medida da coluna. Com `w-full` ele virava a base do bloco e
                competia com a headline pelo mesmo eixo: dois retângulos da mesma
                largura empilhados. Solto, ele volta a ser um objeto — e o rag da
                headline por cima dele passa a ser a composição, não um acidente.
                O `w-fit` no wrapper é pré-requisito do glow: `-inset-4` resolve
                contra ESTA caixa, e num wrapper de largura cheia o halo pintaria
                a coluna inteira em vez do pill.

                O TOM É O PONTO. `bg-brand` (#8A69D8) é lavanda sobre uma cena
                que é lavanda — o wash de marca, a aurora e o backdrop todos
                moram na mesma faixa, então o CTA se dissolvia no fundo justo na
                hora de ser clicado. Branco sobre `ink` é o par de maior contraste
                que a paleta já tem (~16:1, AAA), e é o único elemento branco
                sólido da cena: ele não compete com nada. A marca não sai — ela
                fica no GLOW, que segue lavanda e agora lê como luz da marca
                batendo no pill em vez de mais um roxo sobre roxo.
                É desvio consciente do botão do DS (Figma 17-38): o padrão
                pressupõe fundo claro, e esta é a única section que o contradiz. */}
              {/* `ml-1` casa com o `pl-1` do texto (do clone invisível acima,
                mesma medida do bloco real): sem ele o pill nasce 4px à
                esquerda da tinta da headline e a coluna perde o prumo.
                `pointer-events-auto` reabre o clique só nesta caixa — a
                camada inteira é `pointer-events-none` (ver comentário lá
                em cima). */}
              <div className="relative ml-1 mt-10 [@media(max-aspect-ratio:4/3)]:mt-8 w-fit pointer-events-auto">
                <span
                  aria-hidden
                  className="gaia-cta-breathe pointer-events-none absolute -inset-4 -z-10 rounded-full bg-[radial-gradient(circle,rgba(138,105,216,0.85),transparent_70%)] blur-2xl"
                />
                <a
                  href="#comecar"
                  className="group inline-flex h-14 items-center gap-3 rounded-full bg-neutro-0 pl-8 pr-6 font-body text-[15px] font-medium tracking-[-0.01em] text-ink shadow-[0_10px_34px_-8px_rgba(0,10,26,0.55)] outline-none transition-all duration-200 ease-gaia hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_48px_-10px_rgba(0,10,26,0.75)] focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1016] active:translate-y-0"
                >
                  Começar grátis
                  <IconArrowUpRight className="h-[18px] w-[18px] transition-transform duration-200 ease-gaia group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
            </div>
          </div>

          {/* z-40 · VÍDEO 2 — o pull-out que apresenta o footer. Acima de TUDO
            (recorte z-30, CTA z-20, cena z-0): quando a opacidade sobe (0.80→
            0.86) ele cobre a cena inteira. O frame 0 é a MESMA pose do recorte
            (a mulher com o tablet), então o crossfade tranca a silhueta e a
            troca não tem pop; daí a câmera abre pro campo. MESMA caixa
            (SCENE_BOX/MEDIA) e MESMO clip do vídeo 1 — o arco já está em
            retângulo full-bleed nesse ponto, então o clip não corta nada, só
            mantém a geometria idêntica. Não gated por aspecto: é vídeo cheio,
            vale em qualquer viewport (é ele que leva mobile e desktop pro
            footer). `opacity-0` desde o mount pra nascer invisível. */}
          {motion === true && sources ? (
            <div
              ref={fieldLayer}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-40 opacity-0"
              style={{ clipPath: `url(#${ARCH_ID})` }}
            >
              <div className={SCENE_BOX_SCENE}>
                <video
                  ref={field}
                  src={sources.field}
                  poster={CTA_FIELD_POSTER}
                  onLoadedData={primeForSeek}
                  muted
                  playsInline
                  // mesmo lazy-load do vídeo 1 — ver o useEffect do
                  // IntersectionObserver, antes do useGSAP.
                  preload="none"
                  disablePictureInPicture
                  tabIndex={-1}
                  aria-hidden
                  className={MEDIA_SCENE}
                />
              </div>
            </div>
          ) : null}

          {/* z-50 · ARTE DO CAMPO — a última camada da pilha, acima do próprio
            vídeo 2 (z-40). É ela que SEGURA a cena parada enquanto a pessoa lê
            o footer; o vídeo entrega e sai de cena. MESMA caixa (SCENE_BOX +
            MEDIA) e MESMO clip do vídeo 2 — a geometria tem que ser idêntica,
            senão a troca vira corte. Fade em 0.92→1.0, com a câmera ainda
            andando (ver o tween ARTE DO CAMPO em useGSAP: é o movimento que
            esconde o registro imperfeito). `opacity-0` desde o mount.
            Sem gate de aspecto, igual ao vídeo 2: leva mobile e desktop.
            Fora em reduced-motion — lá o CTA_STILL já é a cena montada. */}
          {motion === true ? (
            <div
              ref={fieldEnd}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-50 opacity-0"
              style={{ clipPath: `url(#${ARCH_ID})` }}
            >
              <div className={SCENE_BOX}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {/* `lazy` pelo mesmo motivo do preload="none" dos vídeos: esta
                  é a última section, e 335 KB não podem disputar banda com o
                  que está acima da dobra. Degradação segura se atrasar — o
                  vídeo 2 segue opaco por baixo, então o pior caso é continuar
                  vendo o frame do vídeo, nunca um buraco. */}
                <img
                  ref={fieldEndImg}
                  src={CTA_FIELD_END}
                  alt=""
                  aria-hidden
                  decoding="async"
                  loading="lazy"
                  className={MEDIA_FIELD_END}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* FOOTER — fora do palco, em fluxo normal, mas SOBE sobre o pé do palco
        (`-mt`) porque a PRÓPRIA imagem do campo é o fundo dele: o conteúdo do
        rodapé mora POR CIMA da foto, não num card escuro que a corta. A arte do
        campo (`cta-field-bg.webp` — o destino da câmera do vídeo 2, escolhida
        pela Pronit; não é o frame final extraído do mp4, então não conte com
        registro pixel-perfect: quem esconde a emenda é a máscara abaixo) entra
        como fundo, com fade no topo pra emendar com a cena e um scrim sutil só
        pra legibilidade. O
        reveal próprio do Footer (`start: "top 88%", once: true`) volta a
        disparar sozinho aqui fora do sticky. Ver os dois filhos abaixo. */}
      <div className="relative isolate -mt-[30vh]">
        {/* FUNDO = a imagem do campo. A máscara faz o topo nascer transparente
          (a cena aparece através) e a foto entrar por baixo — como é a MESMA
          imagem, a emenda some. Sobe sobre o palco via `-mt`, então a foto é
          literalmente parte do fundo do footer.
          RETRATO centra a mulher (`bg-[63%_50%]`): ela mora em x≈0.60 do frame
          (MEDIDO, ver MEDIA_FIELD_END), então `bg-bottom` (50% horizontal) a
          jogava pra direita e cortava — o oposto do frame final do vídeo, que
          agora a centra no mesmo 63%. Pedido da Pronit: no mobile a mulher no
          footer tem que estar exatamente como o vídeo termina. DESKTOP segue
          `bg-bottom` (lá a arte é obj 100%, primeiro plano de flores). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 bg-[url('/video/cta-field-bg.webp')] bg-cover bg-[63%_50%] [mask-image:linear-gradient(to_bottom,transparent,#000_30vh)] [@media(min-aspect-ratio:4/3)]:bg-bottom"
        />
        {/* SCRIM sutil — quase nada no topo (a cena segue à vista), subindo só
          o necessário pro texto no pé. É o único escurecimento; nada de placa
          preta nem card opaco. Se o texto ficar apagado sobre a flor, é ESTE
          número que sobe, não o card (que agora é transparente).

          MOBILE (`max-aspect-ratio:4/3`): o footer é ALTÍSSIMO (~2 viewports) e
          o `bg-cover` da imagem estica a arte inteira por toda a altura — a
          Pronit pediu pra NÃO recriar a imagem no footer inteiro, só emendar no
          topo. O scrim de 0.74 do desktop deixava a foto vazar nas bordas até
          o pé (listras roxas, canto vermelho). Aqui ele fecha em PRETO SÓLIDO
          (`#0B0D12` = o mesmo `rgba(11,13,18)`) já em 80vh: a arte segura só a
          emenda (30vh→~80vh, casando com o fade-in do mask da imagem) e todo o
          resto do rodapé — colunas, newsletter, copyright — assenta em preto
          limpo. Não é placa opaca nova: é o MESMO scrim, só mais fundo antes. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent_0,rgba(11,13,18,0.34)_34vh,rgba(11,13,18,0.74)_100%)] [@media(max-aspect-ratio:4/3)]:bg-[linear-gradient(to_bottom,transparent_0,rgba(11,13,18,0.4)_45vh,#0B0D12_80vh)]"
        />
        <div className="relative">
          <Footer embedded />
        </div>
      </div>
    </>
  );
}

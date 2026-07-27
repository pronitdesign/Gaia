"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { setTransitionProgress } from "@/lib/robertaTransition";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { Badge } from "@/components/ui/Badge";
import {
  IconShield,
  IconUserPlus,
  IconArrowUpRight,
  IconCheck,
} from "@/components/ui/icons";

gsap.registerPlugin(ScrollTrigger, CustomEase);

// Ease exata da transição de página do demo codrops (blenkcode/codrops-demo,
// src/lib/index.js — customEases.pageTransition), replicada byte a byte pelo
// path SVG, não aproximada por um ease nomeado do GSAP. É o que dá ao
// recuo-da-ARoberta + cortina-do-Features (ver useGSAP abaixo) a mesma
// assinatura de movimento do defaultTransition original — registrada uma vez
// no módulo, não a cada render.
CustomEase.create(
  "pageTransition",
  "M0,0 C0.38,0.05 0.48,0.58 0.65,0.82 0.82,1 1,1 1,1",
);

// Fundo da section — close-up fotográfico dos olhos (node Figma 251-83), com um glow
// magenta/violeta já queimado na própria foto, canto inferior-direito. Não é assunto
// abstrato: é o frame de abertura que a headline ancora. A camada de flor multiply
// segue fora — ela só fazia sentido com orquídea-sobre-branco sobre o gradiente claro.
// No modo PINNED este frame é só a base instantânea (primeiro paint, sem flash branco
// antes do primeiro bitmap decodificar) — o canvas da sequência (SEQ_FRAMES, ver
// abaixo) fica por cima e assume a partir do primeiro frame, que É esta mesma foto.
// No modo STACKED (sem sequência, Armadilha 4 do brief) esta imagem é o fundo inteiro.
const BACKDROP = "/quem-construiu-olhos.webp";

// ── Recorte retrato do vídeo do olho (celular/tablet em pé) ──────────────────
// A fonte é paisagem (SEQ_W×SEQ_H, dois olhos). Em viewport retrato o cover de
// 100vh escala pela ALTURA (390×844: 0.63× contra 0.41× da caixa daqui) — o
// olho estoura o quadro e a headline vaza. Mesmo idioma do CTAFinal: caixa
// retrato ancorada no topo + máscara dissolvendo a base — o vídeo funde no
// meshy rosa por baixo (EYE_MESHY_ROSA), nunca numa borda seca. Gate por
// ASPECTO, não por width: tablet em pé sofre o mesmo crop (é a régua do resto
// do site — mobile recebe a mesma cena, só a geometria adapta). Aplica em
// backdrop + canvas + vinheta JUNTOS: os três precisam da mesma caixa, senão a
// troca backdrop→canvas (pixel-idêntica por contrato) ganha costura.
// 160vw (terceira rodada da Pronit: "faça ocupar mais espaço da altura o olho" —
// foi 125vw, depois 140vw) com TETO em 92vh: sem o teto, no tablet em pé
// (820×1180) a caixa engoliria o palco inteiro e o meshy rosa sumiria; o min()
// preserva um chão rosa em qualquer retrato. A máscara mora no PRÓPRIO
// elemento de propósito: no mergulho o transform escala máscara junto com o
// frame — a borda fade sai do quadro e o dive volta a ser full-bleed, como no
// desktop. (O retrato da Roberta tem caixa PRÓPRIA — ROBERTA_CARD_BOX — com
// proporção e fundo diferentes; não compartilhar.)
const EYE_PORTRAIT_BOX =
  "[@media(max-aspect-ratio:4/3)]:h-[min(160vw,92vh)] [@media(max-aspect-ratio:4/3)]:[-webkit-mask-image:linear-gradient(to_bottom,#000_78%,transparent_100%)] [@media(max-aspect-ratio:4/3)]:[mask-image:linear-gradient(to_bottom,#000_78%,transparent_100%)]";

// object-position X do BACKDROP na caixa retrato — o equivalente ESTÁTICO do
// dx dinâmico do drawSeq em f=0 (olho ancorado no centro, ver eyeCxAt): P =
// (fx·dw − w/2)/(dw − w) com fx = EYE_CX_SRC_START/SEQ_W dá 72–74% em toda a
// faixa de caixas que o min(140vw,88vh) produz. 73% é o meio; o backdrop só
// aparece até o primeiro bitmap decodificar, ±1% é invisível.
const EYE_BACKDROP_POS_PORTRAIT = "[@media(max-aspect-ratio:4/3)]:object-[73%_50%]";

// ── Card do retrato da Roberta (receita .card-image da Pronit, 3ª rodada) ─────
// SÓ NO VIEWPORT RETRATO. O desktop/landscape segue FULL-BLEED — a régua dela
// só mascara no mobile, e a rodada que vestiu o desktop com uma coluna 3:5
// (w-[60vh] ancorada à esquerda) quebrou a composição: os cards de prova e o
// editorial foram coreografados pro frame cheio (Figma 195-530) e o card do
// Alcance ficava pendurado no vazio ("no desktop não era para quebrar").
// Viewport retrato: 4:5 (h-[125vw], menos extremo que o do olho — amplia
// menos, corta menos o rosto), teto 88vh, máscara dissolvendo a base. O fundo
// em que a máscara/borda funde nesta fase é ESCURO (pedido explícito: "o bg da
// mask será escuro nessa parte") — é o wrapper `portrait`, que carrega o campo
// ink e entra JUNTO no dissolve (ver o JSX). O object-position dela ("center
// 25%/15%") vira PORTRAIT_POS na prática: a foto-fonte é PAISAGEM (2560×1429),
// nas duas caixas o cover escala pela altura e o Y é inerte — o botão que
// mantém o rosto no enquadramento é o X, e 55% é o valor MEDIDO (ver o bloco
// do PORTRAIT_POS). A intenção da regra dela (rosto sempre em quadro) é o que
// se aplica, não o número literal.
// Vestem a MESMA caixa o Portrait E o recorte (cutout): o recorte só assenta
// sobre a foto se os dois cortarem idêntico.
const ROBERTA_CARD_BOX =
  "[@media(max-aspect-ratio:4/3)]:h-[min(125vw,88vh)] [@media(max-aspect-ratio:4/3)]:[-webkit-mask-image:linear-gradient(to_bottom,#000_78%,transparent_100%)] [@media(max-aspect-ratio:4/3)]:[mask-image:linear-gradient(to_bottom,#000_78%,transparent_100%)]";

// Meshy rosa que recebe o fade do vídeo no retrato — manchas radiais no magenta
// do glow da própria foto (amostrado da referência da Pronit), núcleo quente
// subindo do rodapé e topo desmanchando em transparente antes da metade do
// palco. A headline pousa nele em texto branco puro (o scrim escuro sai no
// retrato — sobre rosa chapado ele leria como mancha suja).
const EYE_MESHY_ROSA = [
  "radial-gradient(90% 70% at 16% 96%, rgba(244,140,225,0.5) 0%, transparent 60%)",
  "radial-gradient(110% 85% at 84% 88%, rgba(236,93,214,0.55) 0%, transparent 62%)",
  "radial-gradient(150% 110% at 50% 118%, #C013A6 8%, rgba(192,19,166,0.85) 45%, transparent 78%)",
  // A base linear fica SÓLIDA até acima da borda inferior da caixa retrato do
  // vídeo (y=160vw ≈ 42% desta camada em 390×844) — se ela ainda estiver rala
  // ali, o creme do bg-neutro-50 vaza pela janela do fade e vira uma banda
  // pálida (medido no render: era exatamente o defeito da primeira rodada).
  "linear-gradient(to top, #B0109C 0%, #B0109C 58%, rgba(176,16,156,0.86) 72%, rgba(190,30,170,0.35) 86%, transparent 100%)",
].join(", ");

// Sequência de frames do push-in no olho — scrubbada pelo scroll (beat 0 do pin, ver
// useGSAP); depois do último frame, o mergulho na pupila continua o movimento (beat 1).
// ERA um <video> H.264 GOP=1 com currentTime escrito pelo scroll — e era isso que
// travava: seek de vídeo é ASSÍNCRONO (o frame pinta 1–3 ticks depois do scroll, o
// browser decide quando) e QUANTIZADO (só existem os 73 degraus, nada entre eles).
// Nenhum ease conserta latência de decode. A forma awwwards (Apple AirPods et al.) é
// pré-decodificar os frames em ImageBitmap e desenhar num <canvas> — seek síncrono,
// custo de um drawImage — com crossfade sub-frame entre vizinhos (o degrau vira motion
// blur) e scrub amortecido (ver o damp no useGSAP). SÓ carrega no modo pinned
// (Armadilha 4) — o fallback stacked/mobile nunca busca um frame.
//
// QUALIDADE (pedido da Pronit "aumente a qualidade da intro"): reencodados do MASTER
// pristino (3852×2152) a 2400×1340 q84 (antes 1920×1072 q68, 5MB → agora ~11MB). O
// salto de q68→q84 mata o mush de compressão (pele/cílios/veias da esclera) e os
// 2400px dão backing retina nítido no full-bleed (o dpr do canvas é capado em SEQ_W/vw,
// ver resizeCanvas — subir SEQ_W foi o que destravou a nitidez em tela 2×). A geometria
// abaixo (SEQ_W/H, DISC_*) foi TODA reescalada ×1.25 do espaço 1920 pro 2400 — mesma
// anatomia, só num raster maior; as FRAÇÕES da íris não mudam.
const SEQ_FRAMES = 73;
const SEQ_W = 2400;
const SEQ_H = 1340;
type SeqExt = "avif" | "webp";
/** `sd` = tiragem de 1280px (1,6MB no total) pra rede lenta; ver pickSeqVariant. */
type SeqVariant = { ext: SeqExt; sd: boolean };
const seqSrc = (i: number, v: SeqVariant) =>
  `/olho-seq/olho-${String(i + 1).padStart(3, "0")}${v.sd ? "-sd" : ""}.${v.ext}`;

// A sequência é o asset mais pesado da página inteira — 73 frames a 2400×1340.
// Em WebP q84 são 11,3 MB; os MESMOS frames em AVIF q28 são 3,9 MB (-66%), com
// SSIM 0,984 contra o webp. Não é troca de banda por CPU: medido com CPU 4×
// (perfil de celular), o decode dos 73 AVIF sai em ~1270ms contra ~1580ms do
// WebP — o formato menor também decodifica mais rápido. Resolução, qualidade
// percebida e TODA a geometria calibrada (SEQ_W, DISC_*, eyeCxAt) seguem
// idênticas: o que mudou foi só o container.
//
// O fallback existe porque este arquivo é a cena inteira desta section: se um
// browser sem AVIF (iOS < 16.4) recebesse 404 em 73 frames, o olho não pintava.
// O probe é um AVIF de 64×64 em data URI — resolve uma vez, sem tocar a rede.
const AVIF_PROBE =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAAD5bWV0YQAAAAAAAAAvaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAFBpY3R1cmVIYW5kbGVyAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAARAAAAQABAAAAAQAAASEAAAAeAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAAGppcHJwAAAAS2lwY28AAAAUaXNwZQAAAAAAAABAAAAAQAAAABBwaXhpAAAAAAMICAgAAAAMYXYxQ4EADAAAAAATY29scm5jbHgAAgACAAIAAAAAF2lwbWEAAAAAAAAAAQABBAECgwQAAAAmbWRhdAoKAAAAAq//jV8wCDIQEADXAhlkwwIAAAgBi0lIwA==";

/**
 * Rede lenta = a tiragem de 1280px (1,6MB) em vez da de 2400px (3,9MB).
 *
 * Isto NÃO é gate por tamanho de tela — a cena é a mesma em todo aparelho, e a
 * geometria (SEQ_W/SEQ_H, DISC_*, eyeCxAt) não muda: o drawSeq desenha em
 * dw/dh derivados das constantes NOMINAIS, então um bitmap menor só é esticado,
 * sem deslocar um pixel do enquadramento. O que muda é o que a rede aguenta.
 *
 * Medido em 3G lento (1,6 Mbps): com os 3,9MB, a pessoa atravessava a section
 * inteira com 20 de 73 frames decodificados. Faltando frame, o drawSeq cai no
 * nearestLoaded e o push-in vira salto — o "travado no olho". Antes um olho um
 * pouco mais mole do que 73 degraus faltando.
 *
 * Em wifi/4G (o caso normal, e o que a Laura vê ao revisar) nada muda: continua
 * a tiragem de 2400px que ela pediu quando mandou aumentar a qualidade da intro.
 */
const redeLenta = (): boolean => {
  const c = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string; downlink?: number };
    }
  ).connection;
  if (!c) return false; // Safari não expõe: assume rede boa e serve a 2400px
  if (c.saveData) return true;
  // Só o rótulo explícito, e só quando ele acusa rede ruim. NADA de `downlink`:
  // medido, ele não discrimina — reportou 1.45 Mbps numa rede local rápida SEM
  // emulação, 1.75 sob 9 Mbps e 1.45 sob 1,6 Mbps. É estimativa de histórico,
  // não medida. Usá-lo como corte rebaixaria a tiragem pra quase todo mundo,
  // inclusive em wifi — o oposto do que a intro pede. Quem decide de fato é a
  // taxa OBSERVADA durante o próprio download (ver seqRate no loader).
  return c.effectiveType === "slow-2g" || c.effectiveType === "2g" || c.effectiveType === "3g";
};

let seqVariantPromise: Promise<SeqVariant> | null = null;
/** Resolve UMA vez qual tiragem da sequência este browser/rede usa. */
const pickSeqVariant = (): Promise<SeqVariant> => {
  seqVariantPromise ??= (async () => {
    let ext: SeqExt = "webp";
    try {
      const bmp = await createImageBitmap(await (await fetch(AVIF_PROBE)).blob());
      bmp.close();
      ext = "avif";
    } catch {
      ext = "webp";
    }
    // A tiragem sd só existe em AVIF: sem AVIF (iOS < 16.4) o webp de 2400 é o
    // único caminho, e ficar sem frame nenhum seria pior que ficar pesado.
    return { ext, sd: ext === "avif" && redeLenta() };
  })();
  return seqVariantPromise;
};

// O centro da pupila usado pelo mergulho (ponto de fuga do dolly) vem das MESMAS
// constantes DISC_* abaixo — uma medição só. Já foram duas (IRIS_*_FRAC, medidas no
// footage de origem 3852×2152): ~38px de divergência no raster atual, e o erro era
// AMPLIFICADO pelo dive (transform-origin errado desloca ∝ (S−1)). Medição única
// mata a classe inteira de desalinhamento.

// ── Disco pupila+íris no frame FINAL (73) ─────────────────────────────────────
// MEDIDO no frame de 1920×1072 (grade de 95px): centro (1103, 539). REESCALADO
// ×1.25 pro raster de 2400×1340 (ver bloco do SEQ_W acima): centro (1378.75,
// 673.75). É o ponto de fuga do dolly — transform-origin do push-in e do mergulho.
// (Os raios 293.75×237.5 do disco chegaram a dimensionar uma máscara-portal e um
// sprite de limbus que cavalgava a borda — a Pronit cortou os dois: o aro recortado
// do próprio frame lia como um SEGUNDO olho dentro do olho. O handoff pro retrato
// hoje é dissolve no auge do mergulho, ver applyDive — nenhuma geometria de recorte
// sobrou pra afinar.)
const DISC_CX_SRC = 1378.75;
const DISC_CY_SRC = 673.75;

// ── Centro do olho AO LONGO da sequência (pedido da Pronit: "sempre deixe o
// olho centralizado... talvez terá que ajustar conforme scroll") ─────────────
// O dolly não é estático: a pupila DIREITA migra no raster durante o push-in.
// MEDIDO nos frames (grade visual, raster 2400×1340): frame 1 ≈ (1520, 614),
// frame 37 ≈ (1443, 645), frame 73 = DISC_CX_SRC (1378.75). O meio cai a ~7px
// da reta entre as pontas — deriva LINEAR pra efeitos práticos (~3px no raster
// da caixa retrato, invisível), então dois pontos + lerp bastam; nada de
// tabela por frame. Só o X importa: na caixa retrato o cover escala pela
// altura e a folga vertical é ZERO (object-position Y é inerte em retrato).
const EYE_CX_SRC_START = 1520;
/** X do centro do olho no raster-fonte para o frame (contínuo) `f` do scrub. */
const eyeCxAt = (f: number) =>
  EYE_CX_SRC_START + (DISC_CX_SRC - EYE_CX_SRC_START) * (f / (SEQ_FRAMES - 1));

/** Centro da pupila (o disco DISC_*) em px de VIEWPORT, dado o tamanho atual da
 *  tela — replica a conta do cover: o frame (SEQ_W×SEQ_H) cobre vw×vh, e a pupila
 *  é um ponto fixo dentro dele que se desloca com o crop. Chamada a cada frame do
 *  mergulho (applyDive) e no onRefresh — nunca cacheada, porque a viewport muda
 *  (resize, rotate) e um valor velho desloca o ponto de fuga pra fora da pupila. O
 *  drawSeq (canvas) usa EXATAMENTE esta mesma conta de cover — se uma mudar, a
 *  outra tem que mudar junto, senão a pupila desenhada e o ponto de fuga divergem. */
function computeIrisBox(vw: number, vh: number, eyeAnchored = false) {
  const frameAspect = SEQ_W / SEQ_H;
  const viewportAspect = vw / vh;
  let scale: number, offsetX: number, offsetY: number;
  if (viewportAspect > frameAspect) {
    scale = vw / SEQ_W;
    offsetX = 0;
    offsetY = (vh - SEQ_H * scale) / 2;
  } else {
    scale = vh / SEQ_H;
    // eyeAnchored (caixa retrato): o crop centra a PUPILA, não o raster — o
    // MESMO clamp do dx do drawSeq em f final (eyeCxAt(72) = DISC_CX_SRC), então
    // pupila desenhada e ponto de fuga seguem coincidindo por construção.
    offsetX = eyeAnchored
      ? Math.min(0, Math.max(vw - SEQ_W * scale, vw / 2 - DISC_CX_SRC * scale))
      : (vw - SEQ_W * scale) / 2;
    offsetY = 0;
  }
  return {
    cx: offsetX + DISC_CX_SRC * scale,
    cy: offsetY + DISC_CY_SRC * scale,
  };
}

// Véu de neutro-50 sobre o fundo — SÓ no modo stacked, onde o editorial pousa direto
// no BACKDROP. RECALIBRADO (Armadilha 3 do brief do vídeo): a premissa antiga —
// pior pixel do gradiente vinho em rgb(181,131,169), α≥0.45 bastava — morreu quando
// BACKDROP virou a foto de olhos (bem mais escura: hospeda cabelo/pupila próximos de
// preto). MEDIDO no render (não no arquivo-fonte — texto escondido, screenshot,
// amostra de pixel): com a cauda antiga em α 0.58–0.62, o p5 mais escuro sob a bio
// (texto rgb(76,79,90)) só batia 3.7:1 — abaixo do 4.5:1 AA de texto de corpo. Cauda
// subida pra α 0.80–0.88 devolve ao menos ~5:1 no mesmo pior pixel (reverificar se o
// BACKDROP mudar de novo). Como o object-cover reposiciona a foto a cada viewport, o
// véu segura esse pior caso em toda a faixa do editorial — não dá pra contar com
// sorte de crop. No modo pinned o editorial sobe sobre o retrato full-bleed (que tem
// scrim próprio), então lá o véu não entra e o fundo do Figma aparece cheio.
const LEGIBILITY_VEIL =
  "linear-gradient(to bottom, rgba(250,249,245,0.04) 0%, rgba(250,249,245,0.08) 30%, rgba(250,249,245,0.18) 38%, rgba(250,249,245,0.80) 46%, rgba(250,249,245,0.88) 100%)";

// A orquídea é foto sobre branco puro (255,255,255) — é assim que ela vem do Figma, e
// lá o layer está em multiply. `mix-blend-mode: multiply` reproduz isso exato: branco
// × gradiente = gradiente, então o fundo da foto some sem precisar de canal alpha.

// Força/cor da orquídea = FIEL ao Figma (node 152-474): lá o layer da flor é multiply
// a 100%, sem ajuste de cor. A orquídea (node 152-472) é a MESMA chapa; multiply cheio
// sobre o gradiente (node 152-475) reproduz a composição exata — vinho borgonha, não o
// magenta que a saturação puxava, nem o fantasma pálido de opacidade baixa.
const FLOWER_STRENGTH = 1;
// Sem filtro: qualquer saturate/contrast desvia do vinho do Figma (e brightness escuro
// vira neon no multiply). Cor crua = cor do Figma.
const FLOWER_FILTER = "none";

// Foto da Roberta — soltar o arquivo em /public e trocar aqui.
// Se falhar, o placeholder (gradiente Bruma + monograma) aparece por baixo.
const PORTRAIT = "/roberta.webp";

// A foto é landscape (2560×1429) e a Roberta está no meio-esquerda; o card do p=0 é
// retrato (260×320), então o object-cover corta ~55% da largura fora. Sem reposicionar,
// o card pega ombro e abajur em vez do rosto. 55% centra a cabeça dela no recorte alto
// e continua bem enquadrada quando o box abre pro full-bleed.
//
// OS DOIS EIXOS NÃO SÃO SIMÉTRICOS — medido no render (390/430/820/1440), não
// deduzido do arquivo. Enquanto a viewport for MAIS ALTA que 1.79:1 (todo celular,
// todo tablet em pé, e o desktop 1440×900), o cover escala pela ALTURA e ela casa
// exata: a sobra vertical é ZERO e o `45%` não move um pixel. Só a sobra horizontal
// existe — e ela é brutal no retrato: 1122px de folga contra um box de 390 (74% da
// foto fora do quadro) versus 172px em 1440 (11%). Ou seja: no celular o único
// botão que funciona é o X, e reduzir a ampliação em si não é possível por CSS —
// pediria um asset recortado em retrato.
//
// O `45%` NÃO é código morto, apesar disso: numa janela mais LARGA que 1.79:1
// (1920×900, por exemplo) o cover passa a escalar pela largura, a sobra vira
// vertical e o 45% volta a mandar. Não remova por parecer inerte no celular.
//
// O X ficou em 55% depois de varrer 35/45/55/65/75 em 390px com captura em cada
// parada: 35 e 75 jogam metade do rosto pra fora, 65 enquadra inteiro mas troca
// intimidade por parede vazia, e 55 é o único que dá rosto completo E grande com a
// headline pousando no paletó escuro (contraste de graça). Já é o ótimo da faixa —
// não há ganho em diferenciar mobile aqui.
const PORTRAIT_POS = "55% 45%";

// Orquídea cymbidium vinho, exportada do Figma (node 152-472) na mesma moldura do
// gradiente. Fica no centro da section, atrás do card e das palavras; some quando o
// retrato cresce pro full-bleed.
const FLOWER = "/orquidea-roberta.webp";

// ── Camadas NOVAS (sobre tudo o que já existia) ──────────────────────────────
// Recorte da Roberta (RGBA transparente) — vai NA FRENTE do ticker, então o nome
// gigante passa por trás da cabeça dela. Layering puro: o alpha faz a oclusão.
const CUTOUT = "/roberta-recorte.webp";
// Ticker: o nome repetido numa faixa. A trilha tem duas faixas idênticas → xPercent
// -50 desloca exatamente uma faixa e o loop é sem emenda.
const TICKER_NAME = "Roberta Carbonari";
const TICKER_REPEAT = 4;

// Cards de prova em vidro fosco que flutuam sobre a foto full-bleed — MESMA
// receita do GLASS_DARK do bento (Features): tinta preta translúcida 58→40%,
// blur-2xl saturado, aro interno de luz e sombra funda. O vidro branco antigo
// (white/8) clareava sobre o abajur da foto e obrigava o card 1 a carregar um
// override de tinta escura inline; com a tinta preta do bento a receita é uma
// só pros dois cards e o material bate com o resto do site.
const PROOF_CARD =
  "rounded-[22px] bg-gradient-to-b from-black/[0.58] to-black/40 backdrop-blur-2xl backdrop-saturate-150 transform-gpu shadow-[0_30px_80px_-28px_rgba(0,0,0,0.92),inset_0_1px_0_0_rgba(255,255,255,0.22),inset_0_0_0_1px_rgba(255,255,255,0.10)]";

// Card do Mestre (Credential) — MESMO material do PROOF_CARD, tinta mais funda.
// O card 1 pousa sobre o abajur quente da foto (canto inferior-esquerdo do
// retrato): com a tinta do PROOF_CARD (black/58→40) + saturate-150, a luz âmbar
// vaza pelo vidro e o card lê como vidro quente/claro, não dark glass (medido no
// render — a Pronit pediu "volte a ser dark glass"). O Alcance segue no PROOF_CARD
// porque cai sobre o paletó escuro e já lê dark. Tinta subida (black/82→66) +
// saturate mais baixo (125) fecham a janela pro âmbar e devolvem o charcoal do
// Alcance neste card, onde quer que a foto reposicione o abajur. Recipe própria
// (não compõe PROOF_CARD) pra não ter duas classes from-black brigando na cascata.
const CRED_CARD =
  "rounded-[22px] bg-gradient-to-b from-black/[0.82] to-black/[0.66] backdrop-blur-2xl backdrop-saturate-125 transform-gpu shadow-[0_30px_80px_-28px_rgba(0,0,0,0.92),inset_0_1px_0_0_rgba(255,255,255,0.22),inset_0_0_0_1px_rgba(255,255,255,0.10)]";

// Hairline de ledger — divisória que desmaia nas pontas, mesma régua do Stats.
const PROOF_RULE = "h-px bg-gradient-to-r from-transparent via-white/12 to-transparent";

// Números da prova — ledger. `to` numérico dispara count-up; `static` fica fixo.
const STATS = [
  { prefix: "", to: 3, suffix: "", label: "clínicas" },
  { prefix: "+", to: 20, suffix: "", label: "profissionais" },
  { prefix: "+", to: 1, suffix: "M", label: "de seguidores" },
  { static: "Mestre", label: "em Nutrição" },
] as const;

// Bio condensada — tem que caber com o banner de 40vh na mesma section.
const BIO =
  "Roberta Carbonari é Mestre em Nutrição e especialista em Comportamento Alimentar. Gere três clínicas, forma nutricionistas Brasil afora e tem agenda com lista de espera. A anamnese sempre foi o ponto mais travado da rotina dela — Gaia é a ferramenta que ela queria ter tido, construída de dentro do consultório.";

// Retrato ocupa a section inteira (full-bleed) no fim do scrub. Um scrim na base
// segura a legibilidade do editorial sobre a foto. Ele acompanha o `p` do retrato
// (ver applyP): em p=0 o retrato ainda é um card e o scrim só lavaria o fundo do
// Figma à toa, então ele entra junto com a foto crescendo.
// Pinned: escuro (ink) — a foto dissolve num fundo cinematográfico, texto claro por cima.
const PORTRAIT_SCRIM_DARK =
  "linear-gradient(to top, #05080F 0%, rgba(5,8,15,0.94) 24%, rgba(7,11,22,0.55) 52%, transparent 100%)";
// (Houve uma rodada com scrim magenta profundo no retrato — a Pronit trocou na
// 3ª rodada: "o bg da mask será escuro nessa parte". O campo ink mora no
// wrapper `portrait`; este scrim segue reforçando a base pro editorial.)
// Stacked (mobile): claro — a foto emenda no off-white do editorial embaixo.
const PORTRAIT_SCRIM_LIGHT =
  "linear-gradient(to top, #FAF9F5 0%, rgba(250,249,245,0.94) 26%, rgba(250,249,245,0.58) 54%, transparent 100%)";

// ── Double-bezel (Doppelrand) ────────────────────────────────────────────────
// Casca externa (bandeja) + núcleo interno (placa) com raios concêntricos: p-1.5
// (0.375rem) → raio interno = 2rem − 0.375rem = 1.625rem. Dá o ar de hardware usinado
// em vez de retângulo chapado. Dois tons: escuro (pinned) e claro (stacked/mobile).
const SHELL_DARK =
  "rounded-[2rem] p-1.5 bg-white/[0.045] ring-1 ring-white/10 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_44px_120px_-34px_rgba(0,0,0,0.82)]";
const CORE_DARK =
  "rounded-[1.625rem] bg-gradient-to-b from-white/[0.09] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_0_1px_rgba(255,255,255,0.05)]";
const SHELL_LIGHT =
  "rounded-[2rem] p-1.5 bg-white/55 ring-1 ring-black/[0.05] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_44px_110px_-34px_rgba(58,72,94,0.42)]";
const CORE_LIGHT =
  "rounded-[1.625rem] bg-gradient-to-b from-white/92 to-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]";

// Curva de mola padrão (Linear/Vercel) — toda transição usa esta, nunca ease padrão.
const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

// Grão de filme — feTurbulence inline, tile de 180px. Overlay fixo/pointer-events-none.
const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Retrato: placeholder (gradiente Bruma + monograma) com a foto real por cima quando existir.
 *  O root veste o ROBERTA_CARD_BOX: card 3:5 à esquerda no desktop, 4:5
 *  mascarado no retrato — nas duas pontas fundindo/encostando no campo ink do
 *  wrapper `portrait` (o "bg escuro da mask"). O rack focus (scale 1.12→1 em
 *  data-portrait-inner) respira a borda do card ~6% durante o pouso —
 *  acontece dentro do clarão do dissolve, invisível. */
function Portrait() {
  return (
    <div
      data-portrait-inner
      className={`relative h-full w-full overflow-hidden bg-bruma ${ROBERTA_CARD_BOX}`}
    >
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-title text-[clamp(2.5rem,7vw,5rem)] font-medium text-azul-800/60">
          RC
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        loading="lazy"
        src={PORTRAIT}
        alt="Roberta Carbonari"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: PORTRAIT_POS }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      {/* leve wash frio/lavanda por cima — tratamento de marca */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-roxo-900/20 via-transparent to-transparent" />
    </div>
  );
}

/**
 * Fundo — a composição do Figma (node 152-474) full-bleed: gradiente malva por baixo,
 * orquídea multiplicada em cima, véu de legibilidade fechando. O `z-0` aqui não é
 * decorativo: position+z-index cria stacking context, e é ele que confina o multiply
 * da flor a este bloco — sem isso o blend vazaria pro resto da página.
 */
function Afluente({
  flowerRef,
  veil = true,
  portraitCrop = false,
}: {
  flowerRef?: RefObject<HTMLDivElement>;
  veil?: boolean;
  /** Modo pinned: no viewport retrato o backdrop vira a mesma caixa 4:5 mascarada
   *  do canvas da sequência (EYE_PORTRAIT_BOX) — os dois têm que coincidir pixel a
   *  pixel pra troca backdrop→canvas seguir invisível. Stacked não usa. */
  portraitCrop?: boolean;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-neutro-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        loading="lazy"
        src={BACKDROP}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${portraitCrop ? `${EYE_PORTRAIT_BOX} ${EYE_BACKDROP_POS_PORTRAIT}` : ""}`}
      />

      {/* Full-bleed com o mesmo object-cover do gradiente: no Figma a orquídea é uma
          chapa do tamanho do frame e as pétalas das pontas saem cortadas na borda. Se
          a flor for mais estreita que a viewport esses cortes viram duas linhas retas
          no meio da tela — em full-bleed eles caem fora da vista, como no Figma. */}
      {flowerRef && (
        // SEM will-change aqui de propósito: promover a div a uma camada de
        // composição própria isola o elemento e quebra o mix-blend-multiply
        // (o blend passa a acontecer contra o vazio, não contra o gradiente
        // atrás) — a orquídea some. GSAP anima opacity/scale sem isso.
        <div
          ref={flowerRef}
          className="absolute inset-0 mix-blend-multiply"
        >
          {/* A opacidade mora no <img loading="lazy">, não no wrapper: o GSAP anima autoAlpha do
              wrapper (entra em 0→1, sai em →0) e sobrescreveria qualquer valor posto
              lá. Aqui ela fica constante e o multiply entra mais fraco — a orquídea
              vira chapa de fundo em vez de brigar com o display type por cima. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            loading="lazy"
            src={FLOWER}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-cover"
            style={{ opacity: FLOWER_STRENGTH, filter: FLOWER_FILTER }}
          />
        </div>
      )}

      {veil && <div className="absolute inset-0" style={{ background: LEGIBILITY_VEIL }} />}
    </div>
  );
}

/** Uma faixa do ticker: o nome repetido com um losango entre cada ocorrência. */
function TickerGroup() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden>
      {Array.from({ length: TICKER_REPEAT }).map((_, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-[0.12em] font-title text-[clamp(3.5rem,11vw,10rem)] font-medium italic leading-none text-white/[0.22]">
            {TICKER_NAME}
          </span>
          <span className="px-[0.18em] text-[clamp(2rem,5vw,5rem)] leading-none text-roxo-300/40">
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}

/** Ledger de números — card double-bezel, número à esquerda, label micro-caps à direita.
 *  Dividers em gradiente (desmaiam nas pontas) e hover sutil por linha. */
function Stats({ onDark = false }: { onDark?: boolean }) {
  const shell = onDark ? SHELL_DARK : SHELL_LIGHT;
  const core = onDark ? CORE_DARK : CORE_LIGHT;
  const value = onDark ? "text-neutro-0" : "text-neutro-800";
  const label = onDark ? "text-neutro-100/55" : "text-neutro-500";
  const rule = onDark
    ? "from-transparent via-white/12 to-transparent"
    : "from-transparent via-neutro-800/12 to-transparent";
  const hover = onDark ? "hover:bg-white/[0.045]" : "hover:bg-neutro-800/[0.035]";
  return (
    <div className={shell}>
      <div className={core}>
        <div className="px-4 py-3 md:px-5 md:py-4">
          {STATS.map((s, i) => (
            <div key={i}>
              {i > 0 && <div className={`mx-3 h-px bg-gradient-to-r ${rule}`} />}
              <div
                data-reveal
                className={`group/row flex items-baseline justify-between gap-6 rounded-2xl px-3 py-3.5 transition-colors duration-200 ${EASE} ${hover}`}
              >
                <span
                  className={`font-title text-[clamp(2.4rem,3.6vw,3.25rem)] font-medium leading-none tracking-[-0.02em] tabular-nums ${value}`}
                >
                  {"static" in s ? (
                    s.static
                  ) : (
                    <span data-count data-to={s.to} data-prefix={s.prefix} data-suffix={s.suffix}>
                      {s.prefix}
                      {s.to}
                      {s.suffix}
                    </span>
                  )}
                </span>
                <span
                  className={`font-body text-[11px] font-medium uppercase tracking-[0.16em] ${label}`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Card de prova em vidro fosco — uma credencial ou número curto flutuando sobre a
 *  foto. Marca ✦ roxa opcional, título/número grande, legenda micro embaixo. */
function ProofCard({
  mark,
  big,
  sub,
  size = "sm",
  className = "",
}: {
  mark?: boolean;
  big: string;
  sub: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <div
      data-proof
      className={`${PROOF_CARD} ${lg ? "relative flex flex-col justify-end px-7 py-6 md:px-8 md:py-7" : "px-5 py-4"} ${className}`}
    >
      {mark && (
        <span
          className={`block font-title leading-none text-roxo-300 ${lg ? "absolute left-7 top-6 text-[1.4rem] md:left-8 md:top-7" : "mb-2 text-[1.05rem]"}`}
        >
          ✦
        </span>
      )}
      <div>
        <div
          className={`font-title font-medium leading-none tracking-[-0.02em] text-neutro-0 ${lg ? "text-[clamp(2.6rem,3.6vw,3.6rem)]" : "text-[1.9rem]"}`}
        >
          {big}
        </div>
        <div
          className={`font-body leading-snug text-white/60 ${lg ? "mt-3 text-[15px]" : "mt-2 text-[12.5px]"}`}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

/** Chip de vidro fosco — pílula pequena pra especialidades/tags dentro dos cards.
 *  Idioma das pílulas do bento: nada de border desenhada, o aro é luz interna
 *  (inset ring + realce de topo). */
function GlassChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1 font-body text-[11.5px] font-medium text-white/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(255,255,255,0.10)]">
      {children}
    </span>
  );
}

/** Ícone circular em vidro — casca comum do header dos dois cards (como o círculo do
 *  ref "Heart rate"). A cor do ícone vem do text-color passado. Mesmo idioma do chip:
 *  aro de luz interno em vez de border. */
function IconOrb({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),inset_0_0_0_1px_rgba(255,255,255,0.12)] ${tint}`}
    >
      {children}
    </span>
  );
}

/** CARD 1 — Credencial. Identidade: autoridade acadêmica. Header com selo, título
 *  serifado grande, chips de especialidade. Glow roxo no canto pra assinatura de cor. */
function CredentialCard({ className = "" }: { className?: string }) {
  return (
    <div
      data-proof
      className={`${CRED_CARD} relative flex flex-col justify-between overflow-hidden px-7 py-6 md:px-8 md:py-7 ${className}`}
    >
      {/* assinatura de cor — luz roxa difusa no canto superior-direito */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-roxo-400/25 blur-3xl"
      />
      {/* header + hairline de ledger colada nele (um grupo só pro justify-between) */}
      <div>
        <div className="flex items-center gap-3">
          <IconOrb tint="text-roxo-200">
            <IconShield className="h-5 w-5" />
          </IconOrb>
          <div className="leading-tight">
            <div className="font-body text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
              Formação
            </div>
            <div className="font-body text-[13px] text-roxo-200">titulação acadêmica</div>
          </div>
        </div>
        <div aria-hidden className={`mt-4 ${PROOF_RULE}`} />
      </div>
      {/* título */}
      <div>
        <div className="font-title text-[clamp(2.3rem,3vw,3.1rem)] font-medium leading-none tracking-[-0.02em] text-neutro-0">
          Mestre
        </div>
        <div className="mt-1.5 font-body text-[15px] text-white/65">em Nutrição</div>
      </div>
      {/* chips de especialidade */}
      <div className="flex flex-wrap gap-2">
        <GlassChip>Comportamento Alimentar</GlassChip>
        <GlassChip>
          <IconCheck className="h-3 w-3 text-roxo-300" />
          Especialista
        </GlassChip>
      </div>
    </div>
  );
}

// Barras do mini-gráfico de crescimento (card 2) — trajetória ascendente = "cada turma
// forma mais gente". Alguns índices ganham cor de marca pros picos, resto em branco fosco.
const IMPACT_BARS = [22, 30, 26, 38, 34, 46, 42, 56, 50, 64, 58, 72, 68, 84, 78, 94];
const IMPACT_ACCENTS: Record<number, string> = {
  1: "rgba(166,186,213,0.9)", // azul-300
  4: "rgba(193,169,211,0.9)", // roxo-300
  7: "rgba(138,105,216,0.95)", // brand
  10: "rgba(166,186,213,0.9)",
  12: "rgba(193,169,211,0.9)",
  15: "rgba(138,105,216,0.95)",
};

/** CARD 2 — Alcance. Identidade: métrica viva. Formato paisagem: coluna esquerda com
 *  credencial + número, coluna direita com selo "crescendo", mini bar-chart e métricas
 *  de apoio. Glow azul.
 *  Sem `relative` na casca: o posicionamento vem do className, e na cascata do Tailwind
 *  `relative` venceria `absolute` independente da ordem das classes. */
function ImpactCard({ className = "" }: { className?: string }) {
  return (
    <div
      data-proof
      className={`${PROOF_CARD} flex items-stretch gap-5 overflow-hidden px-6 py-5 ${className}`}
    >
      {/* assinatura de cor — luz azul difusa no canto superior-esquerdo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-azul-400/20 blur-3xl"
      />
      {/* coluna esquerda — credencial + número */}
      <div className="flex min-w-0 flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <IconOrb tint="text-azul-200">
            <IconUserPlus className="h-5 w-5" />
          </IconOrb>
          <div className="leading-tight">
            <div className="font-body text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
              Alcance
            </div>
            <div className="font-body text-[13px] text-azul-200">formação contínua</div>
          </div>
        </div>
        <div className="flex items-end gap-2.5">
          <span className="font-title text-[clamp(2.1rem,2.6vw,2.8rem)] font-medium leading-none tracking-[-0.02em] text-neutro-0">
            +20
          </span>
          <span className="whitespace-nowrap pb-0.5 font-body text-[12.5px] leading-tight text-white/60">
            profissionais
            <br />
            formados
          </span>
        </div>
      </div>
      {/* hairline vertical de ledger entre as colunas — desmaia nas pontas */}
      <div
        aria-hidden
        className="w-px shrink-0 self-stretch bg-gradient-to-b from-transparent via-white/12 to-transparent"
      />
      {/* coluna direita — selo, gráfico e métricas de apoio */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <span className="inline-flex w-fit items-center gap-1 self-end rounded-full bg-sage-400/20 px-2.5 py-1 font-body text-[10.5px] font-medium text-sage-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)]">
          <IconArrowUpRight className="h-3 w-3" />
          crescendo
        </span>
        <div className="flex h-8 items-end gap-[3px]">
          {IMPACT_BARS.map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-full"
              style={{ height: `${h}%`, background: IMPACT_ACCENTS[i] ?? "rgba(255,255,255,0.26)" }}
            />
          ))}
        </div>
        {/* régua + métricas num grupo só — senão o justify-between abre vão entre elas */}
        <div>
          <div className={PROOF_RULE} aria-hidden />
          <div className="flex items-center gap-4 pt-2 font-body text-[11.5px] text-white/55">
            <span className="whitespace-nowrap">
              <b className="font-semibold text-white/85">3</b> clínicas
            </span>
            <span className="whitespace-nowrap">
              <b className="font-semibold text-white/85">+1M</b> seguidores
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bloco editorial: eyebrow + headline + bio, empurrado pra metade direita da section.
 *  `onDark` inverte as cores do texto pro scrim escuro do modo pinned. */
function Editorial({ onDark = false }: { onDark?: boolean }) {
  const head = onDark ? "text-neutro-0" : "text-neutro-800";
  const accent = onDark ? "text-roxo-300" : "text-roxo-600";
  const body = onDark ? "text-neutro-100/85" : "text-neutro-700";
  return (
    <div className="grid w-full grid-cols-1 px-6 md:grid-cols-2 md:px-12 lg:px-20">
      <div className="max-w-2xl md:col-start-2 md:justify-self-end">
        <div data-reveal className="mb-6">
          <Badge tone={onDark ? "dark" : "light"}>Quem construiu</Badge>
        </div>
        <h2
          data-reveal
          className={`text-balance font-title text-[2.5rem] font-medium leading-[1.02] tracking-[-0.02em] md:text-h1 lg:text-[4rem] ${head}`}
        >
          Feita por quem atende{" "}
          <span className={`italic ${accent}`}>de verdade.</span>
        </h2>
        <p data-reveal className={`mt-6 max-w-xl font-body text-body-l leading-relaxed ${body}`}>
          {BIO}
        </p>
      </div>
    </div>
  );
}

/** Anima os números 0→alvo. useST=true agenda por scroll (fallback); false roda na hora (pinned). */
function animateCounts(useST: boolean) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
    const to = Number(el.dataset.to);
    const pre = el.dataset.prefix ?? "";
    const suf = el.dataset.suffix ?? "";
    if (reduce) {
      el.textContent = pre + to + suf;
      return;
    }
    const run = () => {
      const obj = { v: 0 };
      el.textContent = pre + "0" + suf;
      gsap.to(obj, {
        v: to,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = pre + Math.round(obj.v) + suf;
        },
      });
    };
    if (useST) {
      ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: run });
    } else {
      run();
    }
  });
}

export default function ARoberta() {
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  // Wrapper do recuo (transição pra Features). NUNCA anima `pin.current`
  // diretamente: é nele que o próprio GSAP escreve transform pra manter o
  // pin colado à tela (ver o scrollTrigger no useGSAP) — uma segunda mão de
  // transform ali brigaria com a do pin e quebraria o efeito. `recede`
  // existe só pra isso: um filho direto de `pin`, do tamanho dele, que pode
  // receber y/scale/opacity sem tocar no elemento que o pin já controla.
  const recede = useRef<HTMLDivElement>(null);
  const portrait = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  // Canvas do push-in no olho (ver SEQ_FRAMES) — quem desenha é drawSeq, dirigido
  // pelo scrub amortecido; nunca um clock próprio, quem manda é o scroll (Armadilha 5).
  const seqCanvas = useRef<HTMLCanvasElement>(null);
  // Bloco único da headline de abertura ("QUEM ESTÁ" / "POR TRÁS?"), ancorado no
  // rodapé-direita do frame Figma — ver o JSX pinned pro porquê de um bloco só, não
  // mais duas palavras flanqueando o centro.
  const headline = useRef<HTMLDivElement>(null);
  const editorial = useRef<HTMLDivElement>(null);
  // Camadas novas
  const tickerWrap = useRef<HTMLDivElement>(null);
  const ticker = useRef<HTMLDivElement>(null);
  const cutout = useRef<HTMLDivElement>(null);
  const proof = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"pinned" | "stacked">("stacked");

  // A CENA NÃO DEPENDE DE LARGURA DE TELA. Aqui havia um gate de
  // `min-width: 1024px`: abaixo dele o celular caía no `stacked` e não via nada
  // do push-in nem do mergulho — recebia um retrato parado com a foto do olho
  // esticada de fundo. Não era degradação planejada, era a cena inteira faltando
  // justo onde está a maior parte do tráfego (e, de quebra, a foto deitada
  // preenchendo uma caixa em pé virava um cílio ampliado 5,5× atrás do texto).
  // O que muda no retrato é GEOMETRIA — enquadramento, âncora, altura de pista —
  // e isso está adaptado no JSX/timeline, não trocado por outra cena.
  //
  // `stacked` continua existindo pra UM caso só: prefers-reduced-motion. Esse é
  // contrato de acessibilidade, não tamanho de tela — quem pediu menos movimento
  // recebe a mesma informação sem o scrub.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMode(reduce.matches ? "stacked" : "pinned");
    decide();
    reduce.addEventListener("change", decide);
    return () => reduce.removeEventListener("change", decide);
  }, []);

  useGSAP(
    () => {
      if (mode !== "pinned") {
        // Sem pin não há cortina — e sem cortina o Features não pode esperar
        // por um progresso que nunca vai chegar. `null` manda ele cair no
        // fallback em tempo real (ver lib/robertaTransition.ts).
        setTransitionProgress(null);

        // Fallback: reveals + count-up por scroll normal. Sob reduce os
        // reveals NÃO rodam (stacked é justamente o modo que o usuário de
        // reduce recebe — ver decide() acima — e o gsap.from animava
        // translate+opacity mesmo assim); animateCounts já trata reduce
        // por dentro (crava o número final).
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          gsap.from("[data-reveal]", {
            y: 28,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: { trigger: editorial.current, start: "top 80%", once: true },
          });
        }
        animateCounts(true);
        return;
      }

      // ── Mergulho na pupila (dolly-zoom contínuo) ─────────────────────────────
      // O handoff deixou de ser o match-cut reflexo→card (a versão anterior fazia o
      // retrato NASCER no bbox da íris e crescer até full-bleed). Agora a câmera NÃO
      // PARA no olho: depois do scrub dos 73 frames, o último frame congelado segue
      // escalando ancorado no centro da pupila (computeIrisBox dá o ponto), acelerando
      // (power3.in no tween), com blur crescente — dolly perdendo foco — e uma torção
      // sutil (rotate ∝ d²) que faz as fibras da íris riscarem em vórtice. No auge
      // desse movimento o RETRATO full-bleed entra por DISSOLVE (ver applyDive) — a
      // cena seguinte emerge de dentro do olho SEM passar por tela preta. (Versões
      // anteriores: breu com ✦ — vetado, nada de quadro escuro; máscara-portal com
      // aro de limbus — vetado, duplicava o olho dentro dele mesmo.)
      // d: 0 = frame final do vídeo em repouso · 1 = mergulho completo, retrato cheio.
      const DIVE_SCALE_MAX = 9; // escala final do frame congelado (expoente, ver applyDive)
      // Janela do DISSOLVE (em d) — o retrato entra por crossfade, não por recorte.
      // (Já foi máscara-portal com sprite de limbus cavalgando a borda — a Pronit
      // cortou: o aro recortado do frame lia como um segundo olho DENTRO do olho.
      // O corte imperceptível agora é de linguagem de cinema: a fusão acontece no
      // trecho em que zoom exponencial + blur crescente + PICO de exposição
      // (brightness ~1.4 em d=0.5, ver applyDive) já embaralham o quadro — o
      // meio-termo da fusão (d≈0.48) cai exatamente no clarão, onde nenhuma borda
      // existe pra denunciar a emenda.)
      const FADE_START = 0.28; // d em que o retrato começa a entrar
      const FADE_END = 0.68; // d em que o retrato é dono do quadro (antes do hide do canvas)
      const state = { scrub: 0, dive: 0 };

      // ── Sequência: decode, draw e scrub amortecido ───────────────────────────
      // Três peças que substituem o <video> scrubbado (ver o bloco do SEQ_FRAMES):
      //
      // 1. DECODE — os 73 frames viram ImageBitmap em memória, em DUAS passadas com 4
      //    workers: primeiro frame sim/frame não (stride 6 — em segundos o scrub
      //    inteiro tem cobertura grossa), depois o preenchimento. Se o scroll chega
      //    num frame ainda não decodificado, drawSeq usa o vizinho carregado mais
      //    próximo — degrada pra um passo maior, nunca pra buraco/flash.
      //
      // 2. DRAW — drawSeq desenha o frame no canvas com a MESMA conta de cover do
      //    computeIrisBox, e faz crossfade sub-frame: frame ⌊f⌋ opaco + frame ⌈f⌉
      //    com alpha fracionário. É o que apaga o degrau dos 73 frames — entre dois
      //    quadros o olho atravessa um blend contínuo, lido como motion blur, não
      //    como salto. (Backing do canvas tem teto na resolução da fonte: dpr acima
      //    de SEQ_W/vw só queima fill-rate ampliando webp, sem ganhar nitidez.)
      //
      // 3. DAMP — o scroll escreve só seq.target; um ticker leva seq.current até lá
      //    com decaimento exponencial POR deltaTime (frame-rate-independent — lerp
      //    cru por frame derrapa em 120Hz vs 60Hz). λ=14: alcance rápido o bastante
      //    pra nunca ler como lag, e ainda assim toda flick de roda vira uma rampa
      //    com inércia de câmera em vez de um degrau seco. Determinístico: mesmo
      //    scroll → mesmo caminho, ida e volta (nada de random, Armadilha do scrub
      //    reverso). O tremor do mergulho segue senoidal por d, inalterado.
      // 4. JANELA — o que fica DECODIFICADO é limitado; o que fica guardado é o
      //    blob comprimido.
      //
      //    Aqui os 73 ImageBitmap ficavam vivos do primeiro scroll até o unmount
      //    (que numa sessão normal nunca acontece), e o cleanup estimava o custo
      //    disso em "~150MB" — a conta tinha sido feita com o peso do ARQUIVO.
      //    ImageBitmap não guarda arquivo, guarda RASTER: 2400×1340×4 = 12,9 MB
      //    por frame, 939 MB nos 73. Medido em Chrome com viewport de iPhone 14
      //    Pro: o renderer da página vai a 1660 MB de RSS com a sequência e a
      //    682 MB com /olho-seq/* bloqueado — 978 MB de delta, e o número por
      //    frame bate com a conta (13,4 MB medidos contra 12,9 nominais). O
      //    WebContent do Safari no iOS é morto bem antes disso e a página volta
      //    como "Um problema ocorreu repetidamente". Como o loader dispara no
      //    PRIMEIRO SCROLL, o estouro chega com a pessoa ainda na dobra, muito
      //    antes desta section entrar em quadro — era um celular que abria a
      //    landing, rolava uma vez e morria.
      //
      //    NÃO dá pra resolver baixando a resolução: no retrato o cover escala
      //    pela ALTURA (s = 1214/1340 = 0,91 num iPhone 14 Pro), então a tiragem
      //    de 1280 seria upscale de 1,7× — a `sd` existe pra rede ruim, não pra
      //    memória. O que sobra é não manter 73 frames vivos ao mesmo tempo.
      //
      //    O blob comprimido custa 26–53 KB (3,9 MB nos 73, e eles já estão no
      //    cache HTTP de qualquer jeito): guardar TODOS é de graça. A rede segue
      //    idêntica — mesmos 73 arquivos, mesma ordem, mesmos 4 workers — e só a
      //    DECODIFICAÇÃO passa a ser sob demanda, numa janela em volta do
      //    playhead. Decodificar de um blob já em memória é CPU pura, sem rede;
      //    e se um flick correr na frente da janela, quem cobre é o mesmo
      //    nearestLoaded de sempre: degrada pro passo maior, que é exatamente a
      //    degradação que o loader já aceitava enquanto os frames chegavam.
      const bitmaps: (ImageBitmap | null)[] = new Array(SEQ_FRAMES).fill(null);
      const blobs: (Blob | null)[] = new Array(SEQ_FRAMES).fill(null);
      const decodificando = new Set<number>();
      // Assimétrica: o scrub anda pra frente na maior parte do tempo, e o que
      // custa caro é faltar o frame que ESTÁ CHEGANDO. 4 atrás cobrem o scroll
      // reverso e o crossfade sub-frame; 12 à frente cobrem um flick. Teto de
      // 17 frames residentes = ~219 MB no pior caso (contra 939 MB).
      const JANELA_ATRAS = 4;
      const JANELA_FRENTE = 12;
      let seqDisposed = false;
      let needsDraw = true;
      const aborter = new AbortController();

      // Degrada a tiragem pela taxa MEDIDA, não por API de rede — `downlink`
      // não discrimina (ver redeLenta). Começa em 2400px; depois de uma amostra
      // de ~300KB (5 ou 6 frames, já com os 4 workers em regime) projeta quanto
      // falta e, se não couber em ~8s, pede o resto em 1280px. Misturar as duas
      // tiragens no mesmo scrub é seguro: o drawSeq desenha tudo em dw/dh
      // derivados de SEQ_W/SEQ_H, então o enquadramento não move — muda só a
      // nitidez de alguns frames, e um frame mais mole é MUITO melhor que um
      // frame ausente (que vira salto no push-in).
      const HD_TOTAL_BYTES = 3_900_000;
      const ORCAMENTO_S = 8;
      const seqRate = { bytes: 0, t0: 0, decidido: false, sd: false };

      const loadFrame = async (i: number) => {
        if (blobs[i] || seqDisposed) return;
        try {
          const base = await pickSeqVariant();
          const v: SeqVariant = { ext: base.ext, sd: base.sd || seqRate.sd };
          if (!seqRate.t0) seqRate.t0 = performance.now();

          const res = await fetch(seqSrc(i, v), { signal: aborter.signal });
          const blob = await res.blob();

          // só mede enquanto está em HD e ainda não decidiu
          if (!seqRate.decidido && !v.sd) {
            seqRate.bytes += blob.size;
            if (seqRate.bytes > 300_000) {
              const s = (performance.now() - seqRate.t0) / 1000;
              const bps = s > 0 ? seqRate.bytes / s : Infinity;
              seqRate.sd = (HD_TOTAL_BYTES - seqRate.bytes) / bps > ORCAMENTO_S;
              seqRate.decidido = true;
            }
          }

          if (seqDisposed) return;
          blobs[i] = blob;
          // Só decodifica se este frame estiver na janela ATUAL. Os outros ficam
          // como blob até o playhead chegar perto — é o download inteiro sem o
          // raster inteiro.
          garantirJanela();
        } catch {
          /* abort no cleanup ou rede: o nearest-loaded do drawSeq cobre o vão */
        }
      };

      /** Decodifica `i` a partir do blob já baixado. Idempotente e sem rede. */
      const decodificar = async (i: number) => {
        if (bitmaps[i] || decodificando.has(i) || seqDisposed) return;
        const blob = blobs[i];
        if (!blob) return;
        decodificando.add(i);
        try {
          const bmp = await createImageBitmap(blob);
          // A janela pode ter andado enquanto isto decodificava: se `i` saiu
          // dela, o próximo garantirJanela fecharia o bitmap logo depois — mas
          // guardá-lo aqui e deixar ele fechar é mais simples que checar de
          // novo, e o teto continua valendo.
          if (seqDisposed || bitmaps[i]) {
            bmp.close();
            return;
          }
          bitmaps[i] = bmp;
          needsDraw = true; // o ticker redesenha — pode ser exatamente o frame em vista
        } catch {
          /* decode falhou: o nearestLoaded cobre o vão */
        } finally {
          decodificando.delete(i);
        }
      };

      /**
       * Mantém decodificada só a vizinhança do playhead e FECHA o resto — é o
       * `close()` que devolve o raster; deixar o array cair fora de escopo não
       * devolve (foi por isso que o cleanup já chamava close em todos).
       */
      let janelaCentro = 0;
      const garantirJanela = (centro = janelaCentro) => {
        if (seqDisposed) return;
        janelaCentro = centro;
        const lo = Math.max(0, centro - JANELA_ATRAS);
        const hi = Math.min(SEQ_FRAMES - 1, centro + JANELA_FRENTE);
        for (let i = 0; i < SEQ_FRAMES; i++) {
          if (i >= lo && i <= hi) {
            void decodificar(i);
          } else if (bitmaps[i]) {
            bitmaps[i]!.close();
            bitmaps[i] = null;
          }
        }
      };
      const loadOrder: number[] = [];
      for (let i = 0; i < SEQ_FRAMES; i += 6) loadOrder.push(i);
      for (let i = 0; i < SEQ_FRAMES; i++) if (i % 6 !== 0) loadOrder.push(i);
      if (!loadOrder.includes(SEQ_FRAMES - 1)) loadOrder.splice(1, 0, SEQ_FRAMES - 1);
      let loadCursor = 0;
      const startSeqLoad = () => {
        for (let k = 0; k < 4; k++) {
          (async () => {
            while (loadCursor < loadOrder.length && !seqDisposed) {
              await loadFrame(loadOrder[loadCursor++]);
            }
          })();
        }
      };

      // Os 4 workers disparavam no MOUNT, e isso metia os 3,9MB desta section na
      // fila do boot: a INTRO do topo (cujo play() só roda depois da hidratação)
      // ficava esperando banda. Mas o gate não pode ser tarde: são 73 frames, e
      // chegar atrasado é PIOR que chegar cedo — o drawSeq cai no nearestLoaded
      // e o push-in vira salto, que lê como travamento. Medido com gate de 2
      // viewports: em 3G a pessoa atravessava a section inteira com 20 de 73
      // frames; em 4G entrava nela com 16.
      //
      // O gatilho certo é o PRIMEIRO SCROLL. A intro segura o scroll da página
      // (`scroll-locked` no <html>, ver LoadingScreen), então o primeiro scroll
      // só é possível DEPOIS que ela sai — ou seja, o download começa assim que
      // o caminho crítico terminou, sem disputar com ele, e ainda com várias
      // dobras de antecedência até esta section (fica por volta de y≈5300).
      //
      // O IntersectionObserver fica como rede de segurança, com margem larga,
      // pra dois casos que o scroll não cobre: quem cai aqui já rolado (deep
      // link/refresh no meio) e quem chega sem nunca ter disparado um scroll.
      // Vale o primeiro que acontecer.
      let seqIO: IntersectionObserver | null = null;
      let seqIniciado = false;
      const dispararSeqLoad = () => {
        if (seqIniciado || seqDisposed) return;
        seqIniciado = true;
        seqIO?.disconnect();
        seqIO = null;
        window.removeEventListener("scroll", dispararSeqLoad);
        startSeqLoad();
      };

      window.addEventListener("scroll", dispararSeqLoad, { passive: true });
      if (root.current) {
        seqIO = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) dispararSeqLoad();
          },
          { rootMargin: "400% 0px" },
        );
        seqIO.observe(root.current);
      }

      // Fonte única do "estamos na caixa retrato?" — o MESMO gate de aspecto do
      // EYE_PORTRAIT_BOX. Lido a cada draw/dive (`.matches` é barato e já reflete
      // rotate/resize sem listener próprio; o onRefresh redesenha em seguida).
      const portraitMQ = window.matchMedia("(max-aspect-ratio: 4/3)");

      const canvas = seqCanvas.current;
      const cctx = canvas?.getContext("2d");
      const resizeCanvas = () => {
        if (!canvas) return;
        const cw = canvas.clientWidth || window.innerWidth;
        const ch = canvas.clientHeight || window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2, SEQ_W / Math.max(1, cw));
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        needsDraw = true;
      };
      resizeCanvas();

      /** Frame carregado mais próximo de `i` (busca radial) — -1 se nada decodificou
       *  ainda; nesse caso o BACKDROP por baixo (a MESMA foto do frame 0) segura o
       *  quadro, sem flash. */
      const nearestLoaded = (i: number) => {
        if (bitmaps[i]) return i;
        for (let d = 1; d < SEQ_FRAMES; d++) {
          if (i - d >= 0 && bitmaps[i - d]) return i - d;
          if (i + d < SEQ_FRAMES && bitmaps[i + d]) return i + d;
        }
        return -1;
      };

      const drawSeq = (f: number) => {
        if (!canvas || !cctx || !canvas.width) return;
        const i0 = Math.floor(f);
        const i1 = Math.min(SEQ_FRAMES - 1, i0 + 1);
        const a = nearestLoaded(i0);
        if (a < 0) return;
        // Mesma conta de cover do computeIrisBox, em px de backing — os frames são
        // opacos e cobrem o canvas inteiro, então não há clearRect a pagar.
        const s = Math.max(canvas.width / SEQ_W, canvas.height / SEQ_H);
        const dw = SEQ_W * s;
        const dh = SEQ_H * s;
        // Caixa retrato: o crop ancora o CENTRO DO OLHO no centro do canvas, frame
        // a frame (eyeCxAt segue a deriva do dolly — pan determinístico, mesma
        // função de f na ida e na volta), clampado pra nunca abrir vão na borda.
        // Landscape: centrado, como sempre foi. O `f` contínuo (já amortecido pelo
        // damp) faz o pan andar na mesma rampa do frame — nada de degrau.
        const dx = portraitMQ.matches
          ? Math.min(0, Math.max(canvas.width - dw, canvas.width / 2 - eyeCxAt(f) * s))
          : (canvas.width - dw) / 2;
        const dy = (canvas.height - dh) / 2;
        cctx.globalAlpha = 1;
        cctx.drawImage(bitmaps[a]!, dx, dy, dw, dh);
        // Crossfade sub-frame — só quando o frame base é o certo (não um vizinho
        // de fallback) e o próximo já decodificou.
        const mix = f - i0;
        if (mix > 0.001 && a === i0 && bitmaps[i1]) {
          cctx.globalAlpha = mix;
          cctx.drawImage(bitmaps[i1]!, dx, dy, dw, dh);
          cctx.globalAlpha = 1;
        }
      };

      // Posição do scrub em unidade de FRAME (0..72). current=-1 = primeiro tick
      // ainda não rodou (snap direto pro target, sem rampa de abertura).
      const seq = { target: 0, current: -1 };
      const applySeq = (t: number) => {
        seq.target = t * (SEQ_FRAMES - 1);
      };
      const tickSeq = (_t: number, deltaTime: number) => {
        const k = 1 - Math.exp((-14 * deltaTime) / 1000);
        let cur =
          seq.current < 0 ? seq.target : seq.current + (seq.target - seq.current) * k;
        if (Math.abs(seq.target - cur) < 0.002) cur = seq.target; // pouso exato, sem cauda infinita
        if (cur !== seq.current || needsDraw) {
          seq.current = cur;
          needsDraw = false;
          // A janela segue o playhead ANTES do draw: assim o frame que vai ser
          // desenhado nunca é um que acabou de ser fechado. Fechar e desenhar
          // acontecem no mesmo tick síncrono, sem await no meio.
          const centro = Math.round(cur);
          if (centro !== janelaCentro) garantirJanela(centro);
          drawSeq(cur);
          // O push-in do scrub mora no transform do canvas (ver applyDive) — anda
          // junto com o frame, senão a escala salta quando o damp ainda corre.
          applyDive(state.dive);
        }
      };
      gsap.ticker.add(tickSeq);

      // Última string de filter ESCRITA no canvas (não a calculada) — guarda pra
      // early-return quando o valor quantizado bate com o do frame anterior. Ver
      // applyDive: sem isso a mesma string é reescrita todo frame e o Chrome trata
      // como raster novo mesmo sendo idêntica.
      let lastFilterStr = "";

      const applyDive = (d: number) => {
        const cv = seqCanvas.current;
        // A caixa do CANVAS, não a viewport: no desktop são idênticas, mas no
        // retrato o canvas vira a caixa 4:5 do EYE_PORTRAIT_BOX — o transform-origin
        // é relativo ao elemento, então a conta da pupila tem que rodar no mesmo
        // sistema de coordenadas em que a origem será escrita.
        const vw = cv?.clientWidth || window.innerWidth;
        const vh = cv?.clientHeight || window.innerHeight;
        // O ponto de fuga é o centro da pupila MEDIDO a cada frame (nunca cacheado —
        // resize/rotate desloca o crop do object-cover, ver computeIrisBox).
        const iris = computeIrisBox(vw, vh, portraitMQ.matches);

        // Micro-tremor de câmera — duas senoides dessincronizadas (nunca random:
        // o scrub reverso tem que refazer o MESMO caminho), amplitude ∝ sin(π·d):
        // zero exato nas duas pontas, então nem o repouso nem o handoff ganham
        // offset. ~6px no pico — handheld, não terremoto. Computado FORA do if(cv)
        // porque o RETRATO treme junto durante o dissolve (ver abaixo): camadas
        // que tremem juntas não denunciam costura.
        const amp = 6 * Math.sin(Math.PI * d);
        const sx = amp * (Math.sin(d * 23.7) + 0.5 * Math.sin(d * 11.3));
        const sy = amp * (Math.cos(d * 19.1) + 0.5 * Math.sin(d * 13.9));

        const pv = Math.min(1, Math.max(0, seq.current / (SEQ_FRAMES - 1)));
        const base = 1.02 * (1 + 0.06 * pv);
        const S = base * Math.pow(DIVE_SCALE_MAX, d);

        if (cv) {
          // PUSH-IN do scrub: a câmera nunca fica parada — enquanto o olho ainda
          // troca de frame, o quadro inteiro já avança devagar em direção à pupila
          // (1.02 → ~1.082 ao longo do beat 0), ancorado no mesmo transform-origin
          // do mergulho. É dolly, não decoração: sem ele, entre um frame e outro o
          // enquadramento é estático e o scrub lê como slideshow. Lê seq.current
          // (o valor JÁ amortecido), então a escala anda na mesma rampa do frame.
          // O expoente do mergulho parte DESTA base — quando d arranca, pv já é 1
          // (o dive só começa depois do scrub completo) e a emenda é sem costura.
          // Escala EXPONENCIAL (9^d), não linear: aproximação real a velocidade
          // constante cresce hiperbolicamente no quadro — linear lia como zoom de
          // software, não como câmera avançando. Composta com o power2.in do tween,
          // o fim é vertiginoso, que é o ponto. Overscan de 1.02 em repouso: a
          // torção (rotate abaixo) exporia os cantos do full-bleed nos primeiros
          // frames — o overscan cobre isso sem ser visível. transform-origin no
          // ponto da pupila: mantém a pupila cravada no lugar enquanto tudo escala
          // pra FORA dela — sensação de entrar, não de aproximar. rotate ∝ d² (não
          // d): a torção só existe quando a escala já lê como vórtice de fibras,
          // nunca como a foto inteira girando; 22° no fim (a ref da Pronit pede ~25,
          // acima disso os cílios riscam diagonal demais e denunciam o giro 2D).
          cv.style.transformOrigin = `${iris.cx}px ${iris.cy}px`;
          cv.style.transform = `translate(${sx}px, ${sy}px) scale(${S}) rotate(${d * d * 22}deg)`;
          // Curva de EXPOSIÇÃO, não só blur: a luz sobe no meio do trajeto
          // (atravessando a córnea molhada, brightness até ~1.4 + saturate até 1.6,
          // os valores da ref) e volta a 1 no fim — o mergulho atravessa LUZ do
          // começo ao fim; o crush pro escuro que existia aqui saiu junto com o
          // breu (veto da Pronit: nenhum frame escuro no caminho).
          // Blur ∝ d²: no meio do mergulho as fibras ainda precisam ser legíveis
          // riscando (blur linear lavava tudo cedo demais — medido no render); no
          // fim, 14px é motion blur E disfarce da pixelização de ampliar 9×.
          const brightness = 1 + 0.4 * Math.sin(Math.PI * d);
          // QUANTIZAÇÃO DO FILTER — medida em A/B (CSS injetado, scroll da página
          // inteira, 120Hz, alvo 8,3ms/frame): este blur animado era o maior custo
          // de frame do site inteiro (p95 58,6ms → 16,7ms e frames >100ms 11→4 só
          // isolando `filter`; `backdrop-filter` não custou nada no mesmo teste).
          // `d` varia contínuo, então o raio virava um valor NOVO por frame — e todo
          // raio novo força o Chrome a re-rasterizar a camada inteira do zero, sem
          // reaproveitar cache. Degrau de 0,5px num blur que vai a 14px (~28 degraus
          // distintos, vindos de centenas) é invisível a olho nu. saturate/brightness
          // quantizam pra 2 casas — bem mais grosso que o contínuo — porque moram na
          // MESMA string: qualquer caractere diferente já invalida o raster, então os
          // três têm que quantizar juntos ou o ganho do blur sozinho não vale nada.
          const blurQ = Math.round(d * d * 14 * 2) / 2; // passo 0,5px
          const satQ = Math.round((1 + 0.6 * d) * 100) / 100;
          const brightQ = Math.round(brightness * 100) / 100;
          // Em repouso (d≈0) os três quantizados colapsam pra identidade — usa
          // 'none' e não 'blur(0px) saturate(1) brightness(1)': filter cria
          // containing block e força camada de composição própria mesmo sendo
          // um no-op visual (mesmo cuidado do ScrollPhone.tsx na tela molhada,
          // ver wetPaint). A maior parte da jornada de scroll o mergulho ainda
          // não começou — evitar a camada aqui é onde o guard mais compensa.
          const filterStr =
            blurQ === 0 && satQ === 1 && brightQ === 1
              ? "none"
              : `blur(${blurQ}px) saturate(${satQ}) brightness(${brightQ})`;
          // Só escreve no DOM quando a string quantizada MUDA — antes ela era
          // reescrita todo frame mesmo quando o resultado era idêntico ao anterior.
          if (filterStr !== lastFilterStr) {
            lastFilterStr = filterStr;
            cv.style.filter = filterStr;
          }
        }

        // ── Dissolve do mergulho ─────────────────────────────────────────────
        // O RETRATO (full-bleed por baixo, ver o gsap.set no setup) entra por
        // FUSÃO, não por recorte — nenhuma máscara, nenhuma borda, nenhum aro:
        // qualquer geometria de recorte duplicava a anatomia do olho dentro dele
        // mesmo (veto da Pronit). O corte fica imperceptível por linguagem de
        // câmera: a opacidade sobe em smoothstep na janela FADE_START→FADE_END,
        // cujo meio (d≈0.48) cai no PICO da exposição (brightness ~1.4) com o
        // zoom exponencial e o blur d²·14 já embaralhando o footage — a emenda
        // acontece dentro do clarão, entre dois planos em movimento, onde o olho
        // humano não acha aresta. O retrato chega 12% maior e desfocado (beat 2,
        // rack focus) e POUSA enquanto a fusão completa — os dois planos avançam
        // juntos, nunca um quadro parado sobre um quadro em queda. Tremor (sx,
        // sy) idêntico ao do footage durante a fusão: camadas que tremem juntas
        // não denunciam costura; amp ∝ sin(π·d) já zera o tremor no pouso.
        const f = Math.min(1, Math.max(0, (d - FADE_START) / (FADE_END - FADE_START)));
        const fade = f * f * (3 - 2 * f); // smoothstep — sem degrau nas pontas
        const pr = portrait.current;
        if (pr) {
          pr.style.opacity = String(fade);
          pr.style.transform = `translate(${sx}px, ${sy}px)`;
        }
      };

      gsap.set(editorial.current, { autoAlpha: 0, y: 44 });
      gsap.set(headline.current, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
      gsap.set("[data-word-inner]", { filter: "blur(0px)" });
      // O retrato já nasce full-bleed — quem o revela é SÓ o dissolve do applyDive
      // (opacity escrita direto no style, fade=0 em d=0), nenhum tween de GSAP
      // disputando a mesma propriedade (a lição da orquídea segue valendo: dono
      // único por propriedade). O beat 2 anima o FILHO [data-portrait-inner]
      // (scale/filter do rack focus) — mãos separadas, elementos separados.
      gsap.set(portrait.current, {
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
      });
      gsap.set(scrim.current, { autoAlpha: 0 });
      applySeq(0);
      applyDive(0);

      // ── Camadas novas: ticker + recorte ────────────────────────────────────
      // Marquee contínuo: a trilha tem duas faixas idênticas, então -50% = uma faixa
      // e o loop é sem emenda. Independente do scroll — corre sempre.
      const marquee = gsap.to(ticker.current, {
        xPercent: -50,
        duration: 34,
        ease: "none",
        repeat: -1,
      });
      // Ticker + recorte SÓ aparecem DEPOIS que o dissolve completou (retrato dono
      // do quadro) — não durante a entrada com as flores. Nascem invisíveis;
      // o reveal mora no scrub, na posição 1.0 (ver timeline abaixo).
      gsap.set([tickerWrap.current, cutout.current], { autoAlpha: 0 });

      // Cards de prova: mesmo tempo do ticker/recorte — só fazem sentido sobre a
      // foto cheia. Wrapper apaga tudo; os cards sobem com stagger.
      gsap.set(proof.current, { autoAlpha: 0 });
      gsap.set("[data-proof]", { autoAlpha: 0, y: 28 });

      // Entrada — cada linha da headline sobe com blur-to-sharp (stagger).
      gsap.from("[data-word-inner]", {
        yPercent: 120,
        filter: "blur(14px)",
        autoAlpha: 0,
        duration: 1.1,
        ease: "power4.out",
        stagger: 0.14,
        scrollTrigger: { trigger: pin.current, start: "top 62%", once: true },
      });
      // Scrim da headline entra junto — a mancha escura só faz sentido quando o texto
      // aparece (substitui a text-shadow antiga que a Pronit reprovou).
      gsap.from("[data-headline-scrim]", {
        autoAlpha: 0,
        duration: 1.1,
        ease: "power2.out",
        scrollTrigger: { trigger: pin.current, start: "top 62%", once: true },
      });
      // O retrato NÃO tem tween de entrada disparado por ScrollTrigger próprio — de
      // propósito. O frame de abertura (t=0) precisa ser SÓ o vídeo (olho + glow) +
      // a headline, e um `gsap.from` com `once:true` separado correria contra o
      // scrub pelo mesmo autoAlpha (a corrida de dois donos que já fez a orquídea
      // sumir nesta cena numa rodada anterior). Dono único: a TIMELINE scrubbada —
      // o retrato emerge do preto no beat 2, e só ela escreve o autoAlpha dele.

      let counted = false;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          // Cresceu de 140% pra 240%: o vídeo (beat 0, 45% da janela) precisa de
          // pista de scroll própria além do que os beats de crescimento/editorial/
          // ticker/cards já usavam — sem isso o push-in inteiro passaria em menos de
          // meio scroll de roda de mouse.
          end: "+=240%",
          pin: pin.current,
          pinSpacing: true,
          scrub: 0.5,
          // Este pin nasce tarde (mode: stacked → pinned num segundo render), então
          // os triggers do Manifesto já existem quando ele injeta o pinSpacing.
          // refreshPriority reordena o refresh pela ordem do documento — ver a nota
          // em ComoComecar (2). Sem isso o Manifesto mede-se 3960px acima do real.
          refreshPriority: 1,
          // A viewport muda (resize/rotate) — computeIrisBox E o backing do canvas
          // dependem dela, então o handoff precisa ser recalculado aqui, não só
          // aplicado com o valor velho. O snap (current = target) evita o damp
          // correr uma rampa visível depois de um jump de refresh.
          onRefresh: () => {
            resizeCanvas();
            applySeq(state.scrub);
            seq.current = seq.target;
            needsDraw = true;
            applyDive(state.dive);
          },
        },
      });

      // Beat 0 — a sequência scrubba os 73 frames enquanto a headline está visível
      // e depois sai. `ease: "none"`: o MAPEAMENTO scroll→frame tem que ser 1-pra-1,
      // sem suavização — qualquer ease faria o mesmo trecho de scroll mapear pra
      // frames diferentes dependendo da velocidade, quebrando a leitura de "puxar o
      // filme". A suavização que existe é POSTERIOR ao mapeamento e determinística:
      // o damp do tickSeq persegue este target — inércia, não remapeamento.
      tl.to(
        state,
        { scrub: 1, ease: "none", duration: 0.45, onUpdate: () => applySeq(state.scrub) },
        0,
      )
        // Saída: a headline sai enquanto o push-in do vídeo já avançou — não no
        // frame 0 (senão o vídeo nunca é lido "puro", sem texto por cima) e não perto
        // do handoff (senão compete com o arranque do mergulho). Início 0.25, fim
        // 0.40: a janela pedida no brief.
        .to(
          headline.current,
          { yPercent: -22, autoAlpha: 0, filter: "blur(10px)", ease: "power2.in", duration: 0.15 },
          0.25,
        )
        // Beat 1 — MERGULHO/DISSOLVE: o dolly não para no fim do scrub; o frame
        // congelado segue pupila adentro e o retrato entra por fusão no auge (ver
        // applyDive). Começa onde o scrub termina (0.45). ACELERADO (pedido da
        // Pronit: "só mais rápido"): o efeito de aceleração mora SÓ aqui — o olho
        // segue scrubbado 1:1 pelo scroll, e é este beat que ganha punch.
        // `power3.in` (era power2.in) segura mais no começo e chicoteia no fim;
        // `duration: 0.2` (era 0.35) encurta o scroll que o mergulho consome
        // (~46vh → ~26vh). Composto com o 9^d exponencial do applyDive, o fim é
        // vertiginoso — a queda só desacelera no pouso do retrato (beat 2).
        .to(
          state,
          { dive: 1, ease: "power3.in", duration: 0.2, onUpdate: () => applyDive(state.dive) },
          0.45,
        )
        // Beat 2 — o pouso, DENTRO do dissolve que ainda corre. A opacidade é do
        // applyDive (fade por d); este beat cuida do MOVIMENTO do que emerge: o
        // retrato nasce 12% maior, desfocado e um tico subexposto, POUSANDO
        // (scale→1, rack focus blur→0, exposição recupera) enquanto a fusão
        // completa — a câmera que vinha caindo desde o olho desacelera e
        // aterrissa do outro lado, sem nenhum frame escuro no caminho. Começa em
        // 0.56, ANTES da janela do fade (tl ~0.58→0.63): quando o retrato fica
        // visível ele já está em movimento — fusão entre dois planos vivos, nunca
        // um quadro parado surgindo sobre um quadro em queda.
        .fromTo(
          "[data-portrait-inner]",
          { scale: 1.12, filter: "blur(10px) brightness(0.82)" },
          { scale: 1, filter: "blur(0px) brightness(1)", ease: "power3.out", duration: 0.44 },
          0.56,
        )
        // O canvas (já 100% coberto pelo retrato opaco desde d=0.68, tl ~0.63 —
        // fim da janela do fade) apaga num .set reversível — nada de compositar um
        // canvas 9× com blur de 14px atrás de camada opaca pelo resto do pin.
        .set(seqCanvas.current, { autoAlpha: 0 }, 0.7)
        .to(scrim.current, { autoAlpha: 1, ease: "none", duration: 0.16 }, 0.9)
        // Beat 3 — editorial sobe nos 60vh de baixo; números contam. 1.16: depois do
        // pouso do retrato (0.66+0.44) — o texto entra sobre foto estável e nítida,
        // nunca sobre o rack focus ainda em curso.
        .to(editorial.current, { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.5 }, 1.16)
        // Beat 4 — ticker e recorte da Roberta materializam sobre a foto full-bleed.
        // Não antes: só fazem sentido sobre a cena já revelada.
        .to(
          [tickerWrap.current, cutout.current],
          { autoAlpha: 1, ease: "power2.out", duration: 0.22 },
          1.22,
        )
        // Beat 4 (cont.) — cards de prova materializam no canto inferior-esquerdo.
        .to(proof.current, { autoAlpha: 1, ease: "none", duration: 0.15 }, 1.2)
        .to(
          "[data-proof]",
          { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.55, stagger: 0.12 },
          1.26,
        )
        .call(
          () => {
            if (!counted) {
              counted = true;
              animateCounts(false);
            }
          },
          [],
          // Junto com o editorial (beat 3): dispara com os números já visíveis.
          1.16,
        );

      // ── Transição pra Features (scroll-scrub do defaultTransition do
      // codrops — blenkcode/codrops-demo, src/transitions/animations/default.js) ──
      //
      // O demo dispara num clique: current recua (y -30vh, scale 0.8, opacity
      // 0.4) enquanto next sobe por uma clipPath (inset 100%→0%), os dois ao
      // mesmo tempo, no mesmo ease customizado (pageTransition). O ponto
      // central do original: next é FIXED e NÃO SE MOVE — o clipPath sozinho
      // faz 100% da revelação, com current visível por trás da máscara que abre.
      //
      // CONFIRMADO NO BUNDLE PUBLICADO (async-page-transitions.crnacura.
      // workers.dev): baixei /assets/index-DHXtjec7.js e achei `inset(100% 0%
      // 0% 0%)` + `-30vh` (é o defaultTransition) — mas NÃO achei `-50%` nem
      // `x:"100%"` (a assinatura do alternativeTransition, que o Vite
      // tree-shakou do build publicado porque nenhuma rota o usa).
      // `/alternative-page` é o NOME DA ROTA da segunda página (namespace
      // "about"), não o nome de uma transição — o efeito visto ali É o
      // defaultTransition, o mesmo que este bloco replica desde a primeira
      // versão. Registrando isso aqui pra ninguém (inclusive eu) reabrir essa
      // investigação de novo.
      //
      // NÃO dá pra pendurar isso no `tl` acima — tentei, e o motivo é o ponto
      // central desta seção (vale registrar pra ninguém repetir o mesmo
      // caminho): todo pin do GSAP deixa um "resto" de scroll do tamanho da
      // PRÓPRIA altura do pin (aqui, 100vh) depois que o scrub termina — o
      // conteúdo pinado já soltou (unpin) e o Features, que vem em seguida,
      // ainda está a 1 viewport de distância, chegando por scroll comum, FORA
      // do scrub. Medido com end:"+=140%": progress 0→1 do `tl` ocupa os
      // primeiros ~1260px depois de "top top", e só ~900px MAIS TARDE
      // (exatamente a altura do pin) o Features encosta no topo da tela — sem
      // ele nunca ter ficado visível antes disso. Um beat preso ao `tl`
      // (tentativa anterior: estender `end` e anexar um `.to()` no fim)
      // sempre COMPLETA antes desse resto — a cortina "abria" e o recuo
      // terminava com o Features inteiro fora da tela, e sobrava só scroll
      // comum, sem ease nenhum, bem no trecho em que ele de fato aparece.
      // Verificado no browser (ver relatório) antes de reescrever assim.
      //
      // Por isso o recuo e a cortina rodam num gsap.ticker próprio — mesmo
      // mecanismo do ScrollPhone (medir o rect AO VIVO a cada frame, não
      // confiar em progress de timeline) — com progresso derivado da posição
      // REAL do Features na tela, não do scroll acumulado. Isso prende os
      // dois exatamente à janela em que o Features está de fato entrando no
      // viewport: os tais ~900px de "resto" do pin, que É o ~1 viewport
      // pedido no brief, não uma fatia arbitrária do scrub.
      //
      // PRIMEIRA VERSÃO DESSE TICKER (errada, ficou no ar por uma sessão
      // inteira até ser medida): deixava #features NO FLUXO NORMAL — quem
      // revelava era o próprio scroll — e lia featuresEl.getBoundingClientRect()
      // .top pra achar `p`, subtraindo do clipPath o gap que o ease "devia"
      // deixar contra o rect.top real (`gap - rect.top`). Dentro da janela,
      // rect.top JÁ é (1-p)*vh (é o SCROLL quem move o Features, ninguém
      // escreve nele) — então a conta reduz a topPx = vh·max(0, p - eased).
      // O ease pageTransition cruza a diagonal p=eased em p≈0.44; depois
      // disso eased > p, a subtração fica negativa, o `max(0,...)` engole
      // tudo e o clipPath morre em inset(0) pro resto da janela. Medido em
      // 1600×900: pico de 109px em p≈0.29, zero a partir de p≈0.5 — metade
      // da cortina nunca existia, e o que devia ser máscara virava scroll cru
      // sem ease nenhum bem na hora em que o Features de fato aparecia.
      //
      // O FIX que resolveu isso, e que SEGUE valendo: #features não pode se
      // mover pelo scroll comum dentro da janela — ele fica CRAVADO no topo
      // da viewport (y = -naturalTop, cancelando exatamente o deslocamento
      // que o scroll aplicaria). Isso exige medir o topo NÃO-TRANSFORMADO do
      // Features (`naturalTop`) sem cair no loop de feedback: assim que
      // aplicamos y nele, getBoundingClientRect().top passa a incluir esse y,
      // e o próximo frame leria o que acabamos de escrever. Saída:
      // `root.current` (a própria section #a-roberta) NUNCA é transformada —
      // só `pin.current` (fixed durante o pin) e `recede.current` (o wrapper
      // de recuo) recebem transform, e nenhum dos dois é ancestral do
      // Features (transform de filho não muda o layout/rect do pai).
      // #features é o próximo irmão no documento logo depois de #a-roberta,
      // sem margin entre os dois — então `root.current.getBoundingClientRect()
      // .bottom` é exatamente o topo natural do Features, imune ao transform
      // que este mesmo ticker escreve nele. Isso é o que faz o Features ficar
      // parado (conteúdo não desliza) — no demo o `next` é `position:fixed`,
      // imóvel; aqui é o mesmo resultado por outro mecanismo, e é fiel.
      //
      // SEGUNDA RODADA — a faixa creme: colei o clipPath direto no
      // `naturalTop` (régua linear, sem ease) pra fazer a máscara coincidir
      // com o rodapé real da foto. Resolvia a faixa, mas quebrava o efeito:
      // no demo o `next` SOBREPÕE o `current` (a cortina abre por conta
      // própria, no seu próprio ease, e o current recua ATRÁS dela) — colar
      // a máscara no rodapé faz o Features só PREENCHER o vazio que a
      // ARoberta desocupa, nunca sobrepor. Grudar a régua e ter sobreposição
      // são incompatíveis; a Pronit viu a diferença e chamou certo. REVERTIDA
      // nesta rodada.
      //
      // TERCEIRA RODADA — troquei o recuo por parallax+fade (sem scale) pra
      // resolver um efeito colateral de uma tentativa de sincronizar
      // fundo/opacidade que criava névoa (foto semitransparente sobre cinza
      // médio). Também REVERTIDA: sem a régua colada, o parallax/fade não
      // tinham mais função — eram remendo de um mecanismo que já não existe.
      //
      // QUARTA RODADA — de volta à mecânica FIEL do demo (clip dirigido pela
      // ease, recuo com scale+y+opacity do original), porque é ISSO que
      // produz a sobreposição que o demo tem e a Pronit queria. O vão creme é
      // INERENTE ao efeito — existe no demo também (o gap entre o rodapé do
      // current recuado e a borda da cortina, que abre no próprio ease, sem
      // relação geométrica com onde o current parou). No demo ele não
      // aparece porque o `body` por trás é ESCURO. A solução nunca foi
      // geometria (colar a régua) — é COR: escurecer o fundo da ARoberta pra
      // a cor exata do Features (#0A0C11) cedo o bastante pra o vão nascer
      // já preto, indistinguível do que está por cima dele. Ver o bloco do
      // `bgEase` abaixo. O recuo (`gsap.set(recede.current, ...)`), o
      // `bgEase`/`BG_DONE_AT` e este parágrafo inteiro CONTINUAM valendo —
      // nada disso mudou na rodada seguinte.
      //
      // QUINTA RODADA — SUPERSEDED apenas a parte do CLIP: a Pronit viu na
      // tela e reprovou a ORDEM de entrada do Features (bentos antes do
      // título), não o recuo nem o vão creme descritos acima. O clipPath
      // dirigido pela ease (citado neste parágrafo) SAIU; o Features agora
      // sobe como bloco. Ver o `gsap.set(featuresEl, ...)` final desta
      // função pro mecanismo atual e a explicação completa — este parágrafo
      // fica como registro de por que a MÁSCARA existiu, não como descrição
      // do que roda hoje.
      const featuresEl = document.querySelector<HTMLElement>("#features");
      const pageTransitionEase = gsap.parseEase("pageTransition");

      // Cor de repouso da section (classe Tailwind bg-neutro-50) e a cor
      // exata do Features (classe bg-[#0A0C11]) — o escurecimento do fundo
      // (ver abaixo) anima entre as duas cores REAIS do design, não entre
      // branco e preto genéricos.
      const BG_REST = "#FAF9F5";
      const BG_FEATURES = "#0A0C11";

      // Escurecimento do fundo: FRONT-LOADED e AGRESSIVO — termina em
      // p=BG_DONE_AT=0.15, bem antes da cortina ter aberto quase nada (a
      // `pageTransition` é achatada no começo: em p=0.15 o vão ainda mede
      // só algumas dezenas de px) e com o `recede` ainda ~0.97 de opacidade
      // (a foto, full-bleed na caixa, ainda cobre o fundo inteiro — dá pra
      // escurecer atrás dela sem ninguém ver o gradiente acontecer).
      // power2.out (arranca rápido, desacelera) concentra o escurecimento
      // logo nos primeiros pixels dessa janela curta.
      const BG_DONE_AT = 0.15;
      const bgEase = gsap.parseEase("power2.out");

      // Último `p` efetivamente aplicado (não o lido no frame atual). O
      // ticker roda em TODA sessão desktop, o tempo todo — não só na janela
      // da transição — porque não há como saber de antemão quando o
      // Features vai entrar na tela sem medir. Isso significa que, nos
      // ~99% do scroll em que a seção está parada nas bordas (p em 0 antes
      // de chegar, em 1 depois de passar), o rect ainda precisa ser lido
      // (leitura é barata, e é a mesma que decide se saímos da borda), mas
      // as ESCRITAS (gsap.set em `recede` e `featuresEl`) não podem repetir
      // — cada `gsap.set` de clipPath/transform invalida layout, e o
      // getBoundingClientRect do PRÓXIMO frame força o recalc: thrash por
      // frame, numa página que já reparte orçamento com o WebGL do
      // ScrollPhone. Medido antes/depois no relatório desta sessão.
      let lastP: number | null = null;

      const applyTransition = () => {
        if (!featuresEl || !root.current) return;
        const vh = window.innerHeight;
        // naturalTop = topo NÃO-TRANSFORMADO do Features (ver bloco acima —
        // não dá pra ler featuresEl.getBoundingClientRect().top direto,
        // porque o y que escrevemos nele mais abaixo contaminaria a própria
        // leitura no frame seguinte). root.current (#a-roberta) nunca leva
        // transform e é o irmão anterior imediato do Features, sem margin
        // entre os dois — seu `.bottom` É o topo natural do Features.
        // QUINTA RODADA: não crava mais o Features no topo (y=-naturalTop
        // fixo) — `naturalTop` agora só entra como o termo que cancela o
        // deslize do scroll dentro de `y = (1-eased)*vh - naturalTop` (ver o
        // gsap.set(featuresEl, ...) no fim da função), deixando `(1-eased)*vh`
        // livre pra ser a POSIÇÃO de fato do topo do bloco, não um deslize
        // residual.
        const naturalTop = root.current.getBoundingClientRect().bottom;
        // p linear: 0 enquanto o Features não tocou a base da tela
        // (naturalTop ≥ vh), 1 quando o topo dele chegaria ao topo da tela
        // (naturalTop ≤ 0). O clamp segura os dois lados fora dessa janela —
        // fora dela recuo e cortina ficam parados, sem custo extra.
        const p = 1 - Math.min(1, Math.max(0, naturalTop / vh));

        // Early-out ANTES de qualquer gsap.set: se `p` não mudou desde o
        // último frame aplicado (epsilon, não igualdade estrita — evita
        // reabrir por ruído de sub-pixel), não há nada novo pra desenhar.
        // Cobre os dois platôs de uma vez: p parado em 0 (Features ainda
        // longe, abaixo) e p parado em 1 (chegou = aberto, já passou) —
        // nos dois, os `gsap.set` abaixo NUNCA rodam fora da borda de
        // entrada/saída, só na janela em que `p` de fato está variando.
        if (lastP !== null && Math.abs(p - lastP) < 0.0005) return;
        lastP = p;

        // Fora da janela — ainda não chegou (naturalTop ≥ vh) OU já passou
        // (naturalTop ≤ 0): repouso explícito nas TRÊS camadas que este
        // ticker escreve (Features, recuo, fundo da section). #features solto
        // de volta ao scroll comum (y:0, clip "none" — não `inset(0 0 0 0)`,
        // que é visualmente idêntico mas deixa estilo gravado à toa num
        // elemento que não é nosso), recuo de volta ao estado de repouso do
        // demo (y:0, scale:1, opacity:1 — some junto com o resto do JSX
        // pinned quando o mode trocar, mas parado aqui evita um frame de
        // recuo residual se o usuário rolar rápido pra fora da janela e
        // voltar), e o fundo — section E body, ver bloco abaixo do porquê os
        // dois — volta pro bg-neutro-50 via clearProps (remove o inline,
        // deixa a classe Tailwind reassumir). Escrito uma única vez ao tocar
        // cada borda, nunca por frame: o early-out acima garante isso.
        if (naturalTop >= vh || naturalTop <= 0) {
          // Publica o repouso da borda pro Features (ver lib/robertaTransition
          // .ts). Aqui `p` já é exatamente 0 ou 1 (o clamp acima garante), e
          // nos dois extremos a ease é identidade — pageTransition(0)=0,
          // pageTransition(1)=1 —, então `eased: p` não é aproximação, é o
          // valor certo, sem pagar uma chamada de ease. Precisa vir ANTES do
          // return: é o que trava a timeline do Features fechada (progress 0)
          // antes da janela e aberta (progress 1) depois dela — sem isso o
          // Features ficaria congelado no último progresso da janela.
          setTransitionProgress({ p, eased: p });
          gsap.set(featuresEl, { y: 0, clipPath: "none", clearProps: "zIndex" });
          if (recede.current) gsap.set(recede.current, { y: 0, scale: 1, opacity: 1 });
          gsap.set([root.current, document.body], { clearProps: "backgroundColor" });
          return;
        }

        const eased = pageTransitionEase(p);

        // Publica o progresso da janela pro Features (ver lib/robertaTransition
        // .ts). Este ticker é a ÚNICA fonte de verdade sobre onde a cortina
        // está: `eased` é literalmente o que posiciona a borda logo abaixo
        // (screen-y = (1 - eased) * vh), então é ele — não `p` — que o
        // Features usa como progress da própria timeline de entrada. Assim as
        // duas coisas não podem dessincronizar: é o mesmo número.
        //
        // Só publica (uma atribuição), não notifica ninguém: o Features lê no
        // ticker dele. Publicar depois do `eased` e antes das escritas de DOM
        // é de propósito — o consumidor roda no mesmo tick, e o valor precisa
        // já estar lá quando ele ler.
        setTransitionProgress({ p, eased });

        // Recuo — FIEL ao defaultTransition do demo: y -30vh·eased, scale
        // 1→0.8, opacity 1→0.4 (NUNCA chega a 0 — no demo o current fica
        // visível, recuado, atrás da cortina; ver bloco do fundo abaixo pro
        // porquê isso não reabre a faixa creme). No wrapper `recede`, NUNCA
        // em pin.current (é nele que o próprio GSAP escreve o transform do
        // pin; ver o useRef de `recede`).
        //
        // y tem DOIS termos, não um. No demo, o clique NÃO rola a página —
        // o -30vh·eased é o único movimento do `current`. Aqui, uma vez
        // despinada, a ARoberta é conteúdo normal e o scroll já a desloca
        // sozinho em -p·vh (p = mesma progressão da janela, ver acima); esse
        // termo NÃO existe no demo, é artefato do port, não fidelidade a
        // ele. Sem compensar, esse deslize sempre vence o contra-movimento
        // do demo (que tem teto de -0.4vh com o scale) e a caixa nunca fica
        // parada — daí a máscara nunca alcançava o rodapé dela (medido:
        // p≈0.5 tinha inset em 421.6 contra rodapé em 259.1, 162px invertido).
        // `p*vh` cancela exatamente esse -p·vh do scroll (crava o topo da
        // caixa em screen-y=0, como no demo parado); `-0.3*vh*eased` é o
        // -30vh literal do demo, agora medido a partir desse repouso em vez
        // de somado a um deslize. Em px, não em string `vh`: `vh` aqui já é
        // window.innerHeight (número), e a soma dos dois termos só faz
        // sentido feita nessa unidade comum.
        if (recede.current) {
          gsap.set(recede.current, {
            y: p * vh - 0.3 * vh * eased,
            scale: 1 - 0.2 * eased,
            opacity: 1 - 0.6 * eased,
            force3D: true,
          });
        }

        // Fundo escurece pro preto do Features — FRONT-LOADED e já concluído
        // bem antes do recuo/cortina terem ido a algum lugar (ver bloco do
        // BG_DONE_AT acima). `p / BG_DONE_AT` reescala a janela real (0→1)
        // pra a janela CURTA em que o escurecimento acontece; clampado em 1
        // pra travar em BG_FEATURES pro resto do caminho (não desanda depois
        // de completo).
        //
        // DOIS alvos, não um: `root.current` (#a-roberta) E `document.body`.
        // Medido no browser (ver relatório) — escurecer só a section não
        // basta. O vão não fica contido dentro da caixa da ARoberta: com o
        // clip voltando a ser dirigido pela ease (não mais colado no
        // naturalTop), a borda da cortina pode abrir bem ALÉM do rodapé
        // real de #a-roberta (`naturalTop` é literalmente esse rodapé) —
        // nesse trecho extra, a tela já está FORA da caixa da ARoberta, e o
        // clip-path do Features ainda não chegou lá (ele só pinta a partir
        // da própria borda que está abrindo). O que aparece nesse
        // interstício não é o fundo da ARoberta — é o que estiver
        // estruturalmente atrás de TUDO ali, e neste site isso pode ser um
        // painel translúcido do rodapé (deslocado pra cima por margin
        // negativa, ver o commit "Devolve o rodapé à noite") que deixa
        // passar o `bg-neutro-50` do `<body>` por trás dele — o creme que a
        // Pronit via não vinha da ARoberta, vinha do HTML por trás de tudo.
        // Escurecer o `body` fecha essa última costura: agora não existe
        // NENHUMA camada clara possível atrás do efeito inteiro, custe o que
        // custar de DOM estar exposto no vão. `gsap.set` com array de alvos
        // aplica a mesma cor aos dois num só write. Inline ganha das classes
        // (bg-neutro-50 em ambos); o cleanup (e o repouso de borda acima)
        // desfazem com clearProps nos dois, senão section E body ficam
        // pretos pra sempre depois de sair da janela.
        const easedBg = bgEase(Math.min(1, p / BG_DONE_AT));
        gsap.set([root.current, document.body], {
          backgroundColor: gsap.utils.interpolate(BG_REST, BG_FEATURES, easedBg),
        });

        // QUINTA RODADA — a Pronit viu na tela e reprovou a ORDEM de entrada
        // do Features (bentos aparecendo antes do título), não o timing do
        // scrub. Causa: a cortina anterior (clipPath dirigido por `eased`,
        // topo cravado em y=-naturalTop) revela a section de BAIXO PRA CIMA
        // — pra QUALQUER deslocamento uniforme do conteúdo, a peça com
        // offsetTop MENOR (o h2, no topo) é sempre revelada por ÚLTIMO. Não
        // era ajustável tunando LEAD/DUR (ver Features.tsx) — é a mecânica
        // da MÁSCARA que fixa a ordem. A Pronit escolheu, entre três opções: o
        // Features sobe como BLOCO, sem clip, liderado pela própria borda de
        // CIMA — o h2 (que já é o topo do bloco) entra primeiro por
        // construção, não por sorte de geometria.
        //
        // clipPath SAIU. Não há mais máscara na section — ela é opaca
        // (bg-[#0A0C11]) e se oclui sozinha; ver o zIndex abaixo pro porquê
        // isso basta.
        //
        // y trocou de `-naturalTop` pra `(1-eased)*vh - naturalTop`. Efeito:
        // o topo do #features (que ANTES ficava cravado em screen-y=0 o
        // tempo todo) agora VIAJA — screen-y = (1-eased)*vh, de `vh` (fora da
        // tela, embaixo) até `0` (encostado no topo), na mesma ease
        // `pageTransition` de sempre. É o bloco inteiro subindo, não uma
        // cortina abrindo sobre ele parado.
        //
        // SEM SALTO NAS BORDAS (medido, não só deduzido): em p=0,
        // naturalTop=vh e eased=0 → y=(1-0)*vh-vh=0 — igual ao y:0 do
        // repouso ANTES da janela (bloco acima). Em p=1, naturalTop=0 e
        // eased=1 → y=(1-1)*vh-0=0 — igual ao y:0 do repouso DEPOIS. As duas
        // bordas empalmam exatamente com o platô de repouso; não é
        // coincidência, é o que faz `naturalTop` e `(1-eased)*vh` cancelarem
        // um ao outro nos dois extremos da janela (onde `eased` e `p`
        // colapsam pro mesmo valor, 0 ou 1).
        //
        // SOBREPOSIÇÃO preservada: a `pageTransition` cruza a diagonal
        // eased=p em p≈0.44 e vai à FRENTE dela depois (eased > p) — dali em
        // diante `y` fica NEGATIVO (a section é puxada ACIMA da própria
        // posição natural), exatamente o que faz o Features cobrir a
        // ARoberta que recua atrás, preservando o efeito de sobreposição que
        // a cortina antiga dava por outro caminho.
        //
        // zIndex:10 FICA — é ele que garante que o Features (opaco) pinta
        // por cima da ARoberta enquanto sobrepõe, já que não há mais clip
        // recortando a fatia visível: agora é a section INTEIRA subindo, e
        // sem zIndex a ordem de pintura voltaria a seguir a ordem do
        // documento (que já favorece o Features, mas via z-index é
        // explícito e não depende de nenhum outro z-index não mexer).
        gsap.set(featuresEl, {
          y: (1 - eased) * vh - naturalTop,
          zIndex: 10,
          force3D: true,
        });
      };
      applyTransition();
      gsap.ticker.add(applyTransition);

      return () => {
        marquee.kill();
        gsap.ticker.remove(applyTransition);
        // Sequência: para os workers (o abort mata os fetch em voo), tira o ticker
        // e devolve a memória. Os bitmaps residentes agora são no máximo os 17 da
        // janela (ver JANELA_ATRAS/FRENTE) em vez dos 73, mas o close() continua
        // obrigatório: raster de ImageBitmap não é recolhido pelo GC junto com o
        // array. Os blobs vão junto — 3,9 MB que ninguém mais vai decodificar.
        seqDisposed = true;
        seqIO?.disconnect();
        window.removeEventListener("scroll", dispararSeqLoad);
        aborter.abort();
        gsap.ticker.remove(tickSeq);
        bitmaps.forEach((b) => b?.close());
        bitmaps.fill(null);
        blobs.fill(null);
        // A cortina deixou de existir — o Features precisa saber, senão fica
        // preso lendo o último progresso publicado (um valor que ninguém mais
        // atualiza) e nunca cai no fallback. Mesma razão do clearProps abaixo:
        // o que este ticker deixou escrito fora do próprio componente é
        // responsabilidade dele desfazer. Ver lib/robertaTransition.ts.
        setTransitionProgress(null);
        // O Features é de OUTRO componente, a section #a-roberta (root) e o
        // <body> vivem montados o tempo todo — ao contrário de `recede` (que
        // some com o resto do JSX pinned quando o mode trocar), os estilos
        // que gravamos neles (y/clipPath/zIndex no Features, backgroundColor
        // no root E no body) SOBREVIVERIAM ao revert do contexto se não
        // forem desfeitos explicitamente aqui (gsap.context só reverte o que
        // foi criado de forma síncrona dentro do callback; nada que o ticker
        // escreveu depois). Sem isso, trocar pra mobile/stacked no meio da
        // transição deixaria o Features preso e/ou a página INTEIRA (não só
        // a ARoberta) com fundo preto pra sempre.
        if (featuresEl) {
          gsap.set(featuresEl, { y: 0, clipPath: "none", clearProps: "zIndex" });
        }
        if (recede.current) {
          gsap.set(recede.current, { y: 0, scale: 1, opacity: 1 });
        }
        if (root.current) {
          gsap.set([root.current, document.body], { clearProps: "backgroundColor" });
        }
      };
    },
    { scope: root, dependencies: [mode] },
  );

  return (
    <section
      ref={root}
      id="a-roberta"
      className="relative bg-neutro-50"
      // overflow-x: clip corta qualquer sangramento lateral sem criar scroll
      // horizontal (não há overflow-x global no body). Nunca overflow-hidden nos
      // dois eixos aqui: o pin do GSAP precisa do eixo Y livre.
      //
      // SEM z-index nesta section, de propósito: a transição pra Features (ver a
      // cortina/recuo no useGSAP acima) exige que o Features suba POR CIMA da
      // ARoberta enquanto ela recua. Sem z-index a ordem de pintura segue a ordem
      // do documento — Features vem depois no DOM, então pinta em cima — que é
      // exatamente o que a cortina precisa.
      style={{ overflowX: "clip", overflowY: "visible" }}
    >
      {mode === "pinned" ? (
        <div
          ref={pin}
          className="relative h-screen"
          style={{ overflowX: "clip", overflowY: "visible" }}
        >
        {/* Wrapper do recuo — ver a nota no useRef de `recede`. Tudo que
            antes vivia direto dentro de `pin` mudou de pai pra cá; nenhum
            filho mudou de posição visual (mesmo tamanho, sem offset), então
            a única diferença é ter um alvo seguro pro tween de recuo. */}
        <div ref={recede} className="relative h-full w-full will-change-transform">
          <Afluente veil={false} portraitCrop />

          {/* Meshy rosa — SÓ no retrato (o gate de aspecto do EYE_PORTRAIT_BOX).
              Fica entre o backdrop (z-0, stacking context próprio) e o canvas
              (z-[1]) na ordem de pintura: é nele que a base mascarada do vídeo
              dissolve. Sobe até ~62% do palco com o topo já transparente — a
              emenda vídeo→rosa acontece dentro da janela do fade (78→100% da
              caixa 4:5), nunca numa linha. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[62%] [@media(max-aspect-ratio:4/3)]:block"
            style={{ background: EYE_MESHY_ROSA }}
          />

          {/* Canvas da sequência — beat 0 do scrub (ver drawSeq/tickSeq no useGSAP).
              Fica ACIMA do BACKDROP estático (z-[1] > z-0 do Afluente): os dois têm
              o MESMO frame 0 (o BACKDROP É a foto do frame de abertura), então até o
              primeiro bitmap decodificar o canvas fica transparente e não há salto
              visível — só uma troca de camada idêntica pixel a pixel. O backing
              (width/height) é escrito por resizeCanvas; o CSS só estica. Quem
              desenha é só o scroll via damp — nunca um clock próprio (Armadilha 5).
              Existe só no ramo pinned deste JSX; o fallback stacked/mobile nunca
              monta o elemento nem baixa um frame (Armadilha 4). */}
          <canvas
            ref={seqCanvas}
            aria-hidden
            className={`pointer-events-none absolute inset-0 z-[1] h-full w-full ${EYE_PORTRAIT_BOX}`}
          />

          {/* Grade cinematográfica sobre a foto (z-[21], acima do retrato z-20 e abaixo
              do ticker/recorte/editorial): vinheta funda nas bordas + grão de filme.
              A vinheta acompanha a caixa retrato do vídeo (EYE_PORTRAIT_BOX): sem
              isso ela escureceria os cantos do meshy rosa, que na referência da
              Pronit é limpo até a borda. O grão segue full-bleed — grão sobre o
              rosa é textura de filme, não sujeira. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 z-[21] ${EYE_PORTRAIT_BOX}`}
            style={{
              background:
                "radial-gradient(120% 100% at 50% 36%, transparent 44%, rgba(0,0,0,0.5) 100%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[21] opacity-[0.055] mix-blend-overlay"
            style={{ backgroundImage: NOISE_BG, backgroundSize: "180px 180px" }}
          />

          {/* TICKER — nome gigante correndo SOBRE a imagem de fundo, atrás da cabeça
              dela. z-[24] fica acima da imagem/retrato (z-20) e abaixo do recorte. */}
          <div
            ref={tickerWrap}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[20%] z-[24] overflow-hidden"
          >
            <div ref={ticker} className="flex w-max will-change-transform">
              <TickerGroup />
              <TickerGroup />
            </div>
          </div>

          {/* RECORTE da Roberta — NA FRENTE do ticker (z-[26]). Enquadrado EXATAMENTE
              como a imagem de fundo: mesmo object-cover full-bleed e mesma
              object-position do retrato, então a Roberta recortada assenta em cima
              do fundo e o ticker passa por trás da cabeça dela. */}
          <div ref={cutout} className="pointer-events-none absolute inset-0 z-[26]">
            {/* A MESMA caixa do Portrait (ROBERTA_CARD_BOX): o recorte só assenta
                sobre a foto se os dois cortarem idêntico — box, cover e
                object-position casados, no desktop E no retrato. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              src={CUTOUT}
              alt="Roberta Carbonari"
              className={`absolute inset-0 h-full w-full select-none object-cover ${ROBERTA_CARD_BOX}`}
              style={{ objectPosition: PORTRAIT_POS }}
            />
          </div>

          {/* Headline de abertura — frame Figma 251-83 (694×387): bloco ancorado em
              left 38.9% / bottom 8.6% (270/694, (254+99.8)/387), duas linhas
              explícitas (não wrap por largura — as métricas do Sentient não são as
              do Poppins do canvas do Figma, wrap por `width` quebraria errado).
              bottom-anchored, não top: mais robusto pra uma headline que mora no
              rodapé do frame, imune a diferença de line-height entre fontes.

              LEGIBILIDADE — a Pronit reprovou a text-shadow antiga (halo escuro
              apertado que lia como contorno duro/sujo sobre o glow magenta). Trocada
              por um SCRIM: uma mancha radial escura ATRÁS do bloco (data-headline-
              scrim), emplumada, que baixa o fundo fotográfico imprevisível sob o texto
              sem tocar no glifo — texto branco limpo, o fundo é que cede. Entra junto
              com as linhas (ver gsap.from no useGSAP) e sai com o bloco. */}
          <div
            ref={headline}
            className="absolute bottom-[8.6%] left-[38.9%] z-30 whitespace-nowrap text-left [@media(max-aspect-ratio:4/3)]:left-auto [@media(max-aspect-ratio:4/3)]:right-[7%]"
          >
            {/* Scrim atrás do texto — cobre o bloco com folga, borda desmanchada.
                -z-10 o mantém atrás das linhas; a mancha some antes das bordas (não
                vira retângulo visível). FORA no retrato: lá a headline pousa no
                meshy rosa chapado (nada de fundo imprevisível pra domar) e a mancha
                escura leria como sujeira — branco puro sobre o magenta já passa de
                3:1 em display size. No retrato o bloco ancora pela DIREITA
                (left:auto): com left 38.9% + nowrap ele vazava ~17px em 390px. */}
            <div
              data-headline-scrim
              aria-hidden
              className="pointer-events-none absolute -inset-x-[18%] -inset-y-[28%] -z-10 [@media(max-aspect-ratio:4/3)]:hidden"
              style={{
                background:
                  "radial-gradient(60% 62% at 42% 54%, rgba(6,2,10,0.62) 0%, rgba(6,2,10,0.42) 42%, rgba(6,2,10,0.16) 68%, transparent 82%)",
                filter: "blur(14px)",
              }}
            />
            <span
              data-word-inner
              className="block font-title text-[clamp(2.5rem,7.65vw,9rem)] font-medium leading-[0.94] tracking-[-0.01em] text-neutro-0 [@media(max-aspect-ratio:4/3)]:text-[clamp(3.25rem,14vw,4.5rem)]"
            >
              QUEM ESTÁ
            </span>
            <span
              data-word-inner
              className="block font-title text-[clamp(2.5rem,7.65vw,9rem)] font-medium leading-[0.94] tracking-[-0.01em] text-neutro-0 [@media(max-aspect-ratio:4/3)]:text-[clamp(3.25rem,14vw,4.5rem)]"
            >
              POR TRÁS?
            </span>
          </div>

          {/* retrato — o wrapper é o CAMPO INK da fase da Roberta ("o bg da mask
              será escuro nessa parte"): full-bleed escuro com o card 3:5/4:5
              (ROBERTA_CARD_BOX) dentro. O applyDive anima a opacidade DESTE
              wrapper, então campo escuro e card dissolvem JUNTOS por cima do
              mundo rosa do olho — a troca rosa→ink é o próprio dissolve, sem
              beat novo. Emerge no beat 2 da timeline (só autoAlpha anima, a
              geometria é estática). */}
          <div ref={portrait} className="absolute z-20 overflow-hidden bg-[#05080F]">
            <Portrait />
          </div>

          {/* scrim escuro na base da foto full-bleed — a foto dissolve num fundo
              ink, texto claro por cima. Opacidade dirigida por applyP: 0 enquanto
              o retrato ainda é card. */}
          <div
            ref={scrim}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[27] h-[72%] opacity-0"
            style={{ background: PORTRAIT_SCRIM_DARK }}
          />

          {/* Cards de prova — canto inferior-esquerdo, sobre a foto full-bleed.
              Nasce no beat final (foto já cheia). Wrapper z-[28]: acima do scrim (z-27)
              e do recorte (z-26), abaixo do editorial (z-30, que fica na direita).

              FORA ABAIXO DE `md` — e o breakpoint é O MESMO do Editorial de
              propósito, não um número escolhido a olho. O editorial é
              `grid-cols-1 md:grid-cols-2` com o texto em `md:col-start-2`: só a
              partir de 768px ele desocupa a metade ESQUERDA, que é onde estes
              cards moram (left 5% / 13%). Abaixo disso os dois disputam o mesmo
              espaço e o texto perde — medido em 390px, os cards viram 82px e
              119px, picam em "Me / em Nutriça / Alimen" e caem por cima do
              parágrafo da bio; em 640px ainda cortavam "FORMA…/Mestr…". Se o
              Editorial mudar de breakpoint, este tem que mudar junto.

              Nenhuma informação se perde saindo: os mesmos números estão na bio e
              no ledger do Stats. Encolher os cards pra caber seria pior — vidro
              fosco estreito sobre a foto compete com a headline sem dizer nada
              que o texto já não diga.

              `hidden` (display) e não autoAlpha: o GSAP escreve visibility/opacity
              neste wrapper (ver o beat em gsap.set/`.to(proof.current)` acima) e
              display:none vence os dois sem que a timeline precise saber de nada. */}
          <div
            ref={proof}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[28] hidden md:block"
          >
            {/* cards em glass nas coordenadas EXATAS do Figma (node 195-530, frame
                885×516). Rectangle 1 = 68,230 / 214×122 → %; Rectangle 2 = 218,294 /
                231×188 → %. Mapeados como fração do full-bleed (100vw × 100vh). */}
            {/* card 1 — Credencial (Rectangle 1). min-h pra nunca cortar o conteúdo. */}
            <CredentialCard className="absolute left-[5%] top-[42%] z-[29] min-h-[24%] w-[21%]" />
            {/* card 2 — Alcance. Paisagem, ancorado abaixo do card 1: coordenadas do
                enquadramento marcado (13% / 72%, 30.5% × 19.5% do full-bleed). */}
            <ImpactCard className="absolute left-[13%] top-[72%] z-[29] h-[19.5%] w-[30.5%]" />
          </div>

          {/* editorial — ancorado na base, sobre o scrim escuro (texto claro) */}
          <div
            ref={editorial}
            className="absolute inset-x-0 bottom-0 z-30 pb-10 md:pb-14"
          >
            <Editorial onDark />
          </div>
        </div>
        </div>
      ) : (
        // Fallback estático — mobile / prefers-reduced-motion
        <div className="relative overflow-hidden pb-16">
          <Afluente />
          {/* foto full-bleed, ocupando o topo inteiro da section */}
          <div className="relative z-10 mb-12 h-[70vh] max-h-[560px] w-full overflow-hidden">
            <Portrait />
            {/* ticker + recorte também no mobile */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[16%] z-[12] overflow-hidden">
              <div className="flex w-max -translate-x-[8%]">
                <TickerGroup />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 z-[14]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                src={CUTOUT}
                alt="Roberta Carbonari"
                className="absolute inset-0 h-full w-full select-none object-cover"
                style={{ objectPosition: PORTRAIT_POS }}
              />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[16] h-1/2"
              style={{ background: PORTRAIT_SCRIM_LIGHT }}
            />
            {/* cards de prova, empilhados no alto-esquerda da foto */}
            <div className="pointer-events-none absolute left-4 top-[26%] z-[18] flex flex-col gap-3">
              <ProofCard mark big="Mestre" sub="em Nutrição" className="w-[158px]" />
              <ProofCard big="+20" sub="profissionais formados" className="w-[166px]" />
            </div>
          </div>
          <div ref={editorial} className="relative z-10">
            <Editorial />
          </div>
        </div>
      )}
    </section>
  );
}

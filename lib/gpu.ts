/**
 * ORÇAMENTO DE GPU — o que decide a qualidade não é a largura da tela.
 *
 * A régua da casa é que o celular recebe a MESMA cena do desktop: gate de
 * `min-width` entre cenas é bug, não otimização — quem tem iPhone 16 Pro não
 * merece a versão pobre por ter 390px de viewport, e quem tem um Android de
 * 2019 quebra do mesmo jeito em 390px. Largura não é capacidade.
 *
 * Então o que este módulo entrega é um TIER, e ele é composto de três coisas,
 * nessa ordem de confiança:
 *
 *   1. o que o aparelho DECLARA  — deviceMemory, hardwareConcurrency, saveData
 *   2. o que a GPU RESPONDE      — WebGL2? renderer desmascarado? é software?
 *   3. o que o frame CUSTA       — p95 medido ao vivo, que corrige os outros dois
 *
 * (1) é barato e roda antes do primeiro paint (inline no <head>), então a
 * página nasce já sabendo em que faixa está. (2) custa criar um contexto WebGL
 * (~5–15ms) e por isso só roda quando o Canvas do aparelho monta — que já é
 * adiado pra fora da janela do LCP. (3) nunca para: é o único dos três que sabe
 * que ESTE aparelho, com ESTA aba, ESTAS outras abas abertas e ESTA bateria,
 * não está dando conta agora.
 *
 * O tier vira `data-gaia-tier` no <html>. Quem consome:
 *   · o Canvas do ScrollPhone  → teto de DPR e antialias
 *   · o CSS                    → raio dos borrões decorativos
 *
 * NUNCA some com cena. O tier 0 (WebGL quebrado ou perdido duas vezes) é a
 * única exceção, e ali não é escolha: não há contexto pra desenhar.
 */

export type Tier = 0 | 1 | 2 | 3;

/** Teto de devicePixelRatio do Canvas por tier.
 *
 *  O buffer custa larg × alt × dpr² × 4 bytes, e com MSAA sai o dobro. Num
 *  iPhone de 390×844 a diferença entre dpr 2 e dpr 1.25 é 10,5 MB → 4,1 MB de
 *  buffer principal — e o mesmo fator em toda render target que o three criar.
 *  O aparelho ocupa ~1/3 da tela em altura: acima de 1.5 o ganho de nitidez
 *  não se vê no aparelho, mas o custo aparece no orçamento. */
export const DPR_TETO: Record<Tier, number> = { 0: 1, 1: 1.25, 2: 1.5, 3: 2 };

const CHAVE = "gaia-gpu-tier";

/* ── 1. o que o aparelho declara ───────────────────────────────────────────
   Roda inline no <head>, antes do primeiro paint. Só leitura de propriedade:
   nada aqui toca layout, rede ou GPU.

   O corpo desta função é serializado pro HTML (ver `SCRIPT_TIER_INICIAL`), por
   isso ela não pode referenciar nada de fora do próprio escopo. */
export function tierDeclarado(): Tier {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

  // Modo de economia de dados é declaração explícita de "me poupe".
  if (nav.connection?.saveData) return 1;

  const mem = nav.deviceMemory; // Chrome/Android; undefined no Safari
  const cpus = nav.hardwareConcurrency || 0;
  const dpr = window.devicePixelRatio || 1;

  // Sinal forte de aparelho apertado: pouca RAM OU poucos núcleos.
  if ((mem !== undefined && mem <= 4) || (cpus > 0 && cpus <= 4)) return 1;

  // Safari não expõe deviceMemory. O que sobra é a conta de pixels: um
  // aparelho que pinta muito pixel por DPR alto tem menos folga por pixel.
  // Não é a LARGURA que decide — é a área × dpr², que num iPad Pro dá alto
  // com viewport largo e num iPhone SE dá baixo com viewport estreito.
  const pixels = window.innerWidth * window.innerHeight * dpr * dpr;
  if (mem === undefined && pixels > 4_000_000 && cpus <= 6) return 2;

  if (mem !== undefined && mem <= 8) return 2;
  return 3;
}

/* ── 2. o que a GPU responde ───────────────────────────────────────────────
   Custa um contexto WebGL descartável. Só é chamado de dentro do efeito que
   monta o Canvas do aparelho, que já vive fora da janela do LCP. */
export function tierMedidoNaGPU(): Tier {
  try {
    const cv = document.createElement("canvas");
    const gl =
      (cv.getContext("webgl2") as WebGL2RenderingContext | null) ||
      (cv.getContext("webgl") as WebGLRenderingContext | null);
    if (!gl) return 0;

    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "")
      : "";
    const r = renderer.toLowerCase();

    // Rasterizador de software: o "WebGL" existe mas quem desenha é a CPU.
    // Rodar a cena aqui é o caminho mais curto pro travamento — e é
    // justamente o caso que nenhum gate de viewport pega, porque acontece
    // em desktop com driver bloqueado.
    if (/swiftshader|llvmpipe|software|basic render/.test(r)) return 0;

    const ehWebGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
    // Sem WebGL2 em 2026 = aparelho ou driver antigo o bastante pra não
    // aguentar o orçamento cheio.
    if (!ehWebGL2) return 1;

    // GPUs móveis de gama baixa/média que aparecem no topo do funil de crash.
    // Lista curta e conservadora de propósito: errar pra baixo custa nitidez,
    // errar pra cima custa a aba.
    if (/adreno \(tm\) [345]\d\d|mali-[tg]\d\d\b|mali-g5\d|powervr/.test(r)) return 1;

    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (maxTex < 8192) return 1;

    // WebGPU disponível é o sinal mais limpo de stack gráfico moderno que dá
    // pra ler sem inicializar nada: exige driver e GPU dentro da lista de
    // suporte do browser. Não usamos WebGPU pra desenhar — o three só ganha
    // WebGPURenderer estável em versão que esta landing não roda —, mas a
    // PRESENÇA dele é evidência barata de aparelho folgado.
    if ("gpu" in navigator) return 3;

    return 2;
  } catch {
    return 0;
  }
}

/* ── estado corrente ───────────────────────────────────────────────────── */

function ler(): Tier {
  if (typeof document === "undefined") return 2;
  const v = Number(document.documentElement.dataset.gaiaTier);
  return (v === 0 || v === 1 || v === 2 || v === 3 ? v : 2) as Tier;
}

/** Escreve o tier no <html> e avisa quem estiver ouvindo. Só desce: uma vez
 *  que o aparelho mostrou que não dá conta, subir de volta é convidar a
 *  oscilação (degrada → melhora → promove → degrada) que lê como piscada. */
function rebaixar(t: Tier, motivo: string) {
  const atual = ler();
  if (t >= atual) return;
  document.documentElement.dataset.gaiaTier = String(t);
  try {
    sessionStorage.setItem(CHAVE, String(t));
  } catch {}
  window.dispatchEvent(new CustomEvent("gaia:tier", { detail: { tier: t, motivo } }));
}

export function tierAtual(): Tier {
  return ler();
}

/** DPR que o Canvas deve usar agora — teto do tier, nunca acima do aparelho. */
export function dprDoTier(): number {
  return Math.min(window.devicePixelRatio || 1, DPR_TETO[ler()]);
}

/** Refina o tier com a resposta da GPU. Idempotente. */
export function refinarComGPU(): Tier {
  const t = tierMedidoNaGPU();
  rebaixar(t, "gpu");
  return ler();
}

/* ── 3. o que o frame custa ────────────────────────────────────────────────
   Os dois primeiros sinais são estáticos e generosos: eles descrevem o
   aparelho parado, não a página rodando nele. O terceiro é o que fecha a
   conta — e é o mecanismo que a agência usa e o gate de viewport não tem.

   Janela de 90 frames, p95 por janela. Três janelas ruins SEGUIDAS rebaixam.
   Três, e não uma: uma janela ruim é o custo de montar uma seção, decodificar
   uma foto, compilar um shader — coisas que acontecem uma vez e passam.
   Rebaixar por causa delas seria punir o aparelho pelo pior instante da
   página em vez de pelo que ele sustenta. */
const JANELA = 90;
const P95_RUIM = 34; // ms — ~2 frames perdidos a 60Hz
const JANELAS_RUINS = 3;

let monitorLigado = false;

export function ligarMonitorDeFrame() {
  if (monitorLigado || typeof window === "undefined") return;
  monitorLigado = true;

  const amostras: number[] = [];
  let ruins = 0;
  let anterior = performance.now();

  const tick = (t: number) => {
    const dt = t - anterior;
    anterior = t;
    // Aba em segundo plano devolve deltas de segundos: não é jank, é o browser
    // parando o rAF. Contar isso rebaixaria todo mundo que troca de aba.
    if (dt < 500) amostras.push(dt);

    if (amostras.length >= JANELA) {
      amostras.sort((a, b) => a - b);
      const p95 = amostras[Math.floor(amostras.length * 0.95)];
      amostras.length = 0;
      if (p95 > P95_RUIM) {
        ruins++;
        if (ruins >= JANELAS_RUINS) {
          ruins = 0;
          const t0 = ler();
          if (t0 > 1) rebaixar((t0 - 1) as Tier, `p95 ${Math.round(p95)}ms`);
        }
      } else {
        ruins = 0;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ── 4. perda de contexto ──────────────────────────────────────────────────
   O que de fato "crasha" uma cena WebGL no celular quase nunca é uma exceção
   de JS: é o SO recolhendo a GPU (outra aba, câmera, chamada de vídeo, memória
   baixa) e o contexto sumindo por baixo do renderer. Sem tratamento, o canvas
   congela no último frame ou fica preto, para sempre, sem nada no console.

   O contrato do browser é: quem chama preventDefault() em `webglcontextlost`
   ganha o direito de receber `webglcontextrestored`. Quem não chama, não
   recebe — o contexto morre de vez. É uma linha, e é a diferença entre a cena
   voltar e a página ficar com um retângulo preto no meio.

   Duas perdas na mesma sessão significam que o aparelho não tem GPU pra nós.
   Aí sim tier 0: o consumidor desmonta a cena e a página segue sem ela. */
export function guardarContexto(
  canvas: HTMLCanvasElement,
  aoPerder: () => void,
  aoVoltar: () => void,
): () => void {
  let perdas = 0;

  const perdeu = (e: Event) => {
    e.preventDefault(); // sem isto não existe restored
    perdas++;
    aoPerder();
    if (perdas >= 2) rebaixar(0, "contexto perdido 2×");
    else rebaixar(1, "contexto perdido");
  };
  const voltou = () => aoVoltar();

  canvas.addEventListener("webglcontextlost", perdeu, false);
  canvas.addEventListener("webglcontextrestored", voltou, false);
  return () => {
    canvas.removeEventListener("webglcontextlost", perdeu);
    canvas.removeEventListener("webglcontextrestored", voltou);
  };
}

/* ── o script que roda antes do primeiro paint ─────────────────────────────
   Inlined no <head>. Precisa ser texto porque roda antes de qualquer bundle:
   o objetivo é que o PRIMEIRO paint já saia com o tier certo, senão os
   borrões decorativos pintam uma vez em raio cheio e só depois encolhem —
   que é trabalho de GPU pago à toa e um flash visível.

   Fica com o mesmo conteúdo de `tierDeclarado()`. Se um lado mudar, o outro
   muda junto. */
export const SCRIPT_TIER_INICIAL = `(function(){try{
var n=navigator,d=document.documentElement,s=null;
try{s=sessionStorage.getItem("${CHAVE}")}catch(e){}
if(s!==null){d.dataset.gaiaTier=s;return}
var m=n.deviceMemory,c=n.hardwareConcurrency||0,r=window.devicePixelRatio||1,t;
if(n.connection&&n.connection.saveData)t=1;
else if((m!==undefined&&m<=4)||(c>0&&c<=4))t=1;
else if(m===undefined&&window.innerWidth*window.innerHeight*r*r>4000000&&c<=6)t=2;
else if(m!==undefined&&m<=8)t=2;
else t=3;
d.dataset.gaiaTier=String(t)
}catch(e){document.documentElement.dataset.gaiaTier="2"}})()`;

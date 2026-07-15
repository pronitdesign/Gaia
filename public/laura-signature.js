/**
 * <laura-signature> — assinatura de autoria para sites construídos por Laura Eckert.
 *
 *   <script type="module" src="laura-signature.js"></script>
 *   <laura-signature></laura-signature>
 *
 * Em repouso: "Laura Eckert". No hover, o espaço entre os nomes abre e revela
 * uma janela com o retrato.
 *
 * PRINCÍPIO DA MECÂNICA — a foto não se move.
 * A janela cresce da esquerda pra direita. Sua borda esquerda é fixa, porque
 * "Laura" não se move. A foto é ancorada nessa borda em unidades absolutas, e
 * o `left` dela compensa a margem que surge no hover (mesma duração, mesma
 * curva, sentido oposto). Resultado: a máscara desliza sobre uma foto parada
 * no espaço da página. Revelação, não aparição.
 * Se mexer nas margens, mexa no `left` junto ou o efeito morre.
 *
 * ESCALA — tudo em `em`. Mude só `--sig-size` (ou font-size) e o objeto inteiro
 * escala junto: janela, respiro, crop e ancoragem do rosto. Nada é px.
 *
 * COR — herda `currentColor` do anfitrião. Não existe variante light/dark.
 *
 * Autocontido: fonte e foto embutidas. Nenhum request externo obrigatório.
 *
 * Atributos:
 *   href       destino do link            (default: https://eckertlaura.com)
 *   size       tamanho base               (default: 17px)
 *   photo      sobrescreve o retrato      (default: embutido, 5KB)
 *   copyright  acrescenta " ©" ao final   (default: ausente)
 */

const PHOTO = "data:image/jpeg;base64,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";

const FONT = "data:font/woff2;base64,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";

/* A fonte é Bricolage Grotesque, instanciada em opsz 48 / wdth 100 / wght 700
   e cortada pros 12 glifos de "Laura Eckert©". 131KB -> 1.6KB.
   Os eixos estão ASSADOS no arquivo: não existe mais `opsz` pra o CSS mexer,
   por isso não há font-variation-settings nem font-optical-sizing aqui. Se um
   dia precisar de outro peso ou largura, gere um subset novo — não tente
   pedir via CSS, a fonte não tem mais os eixos.

   Nome de família próprio ("LauraSig") de propósito: o site do cliente pode
   usar Bricolage também, e duas @font-face com o mesmo nome colidem.

   @font-face é escopado ao documento — dentro do shadow root não aplica.
   Injeta uma vez, no head do anfitrião. Zero request: a fonte é o próprio
   arquivo. */
function ensureFont() {
  if (document.querySelector("style[data-laura-sig-font]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-laura-sig-font", "");
  style.textContent =
    "@font-face{font-family:'LauraSig';font-style:normal;font-weight:700;" +
    "font-display:swap;src:url(" + FONT + ") format('woff2')}";
  document.head.appendChild(style);
}

const CSS = `
:host {
  --sig-size: 17px;
  --w: 1.2941em;          /* janela: largura */
  --h: 1.4706em;          /* janela: altura  */
  --pad: 0.1176em;      /* respiro entre janela e letras (só no hover) */
  --img-w: 2.4796em;  /* foto: largura   */
  --img-x: -0.5679em;  /* ancoragem: rosto centrado + ajuste fino */
  --img-y: -0.1985em;
  --ease: cubic-bezier(.16, 1, .3, 1);
  display: inline-block;
  line-height: 1;
}
:host([hidden]) { display: none; }

a {
  display: inline-block;
  font-family: "LauraSig", system-ui, sans-serif;
  font-weight: 700;
  font-size: var(--sig-size);
  letter-spacing: -0.015em;
  line-height: 1;
  color: currentColor;         /* empresta a cor do anfitrião */
  text-decoration: none;
  white-space: nowrap;
  -webkit-font-smoothing: antialiased;
}
a:focus-visible { outline: 1px solid currentColor; outline-offset: 0.35em; }

.char {
  display: inline-block;
  opacity: 0.62;
  transition: opacity 260ms var(--ease);
}
a:hover .char,
a:focus-visible .char {
  opacity: 1;
  transition-delay: calc(var(--i) * 26ms);
}

.gap {
  position: relative;
  display: inline-block;
  vertical-align: middle;
  width: 0.30em;               /* repouso = espaço de palavra. nada denuncia a janela */
  height: var(--h);
  margin: 0 0 0.08em 0;
  overflow: hidden;
  border-radius: 0.12em;
  transition: width 520ms var(--ease), margin 520ms var(--ease);
  will-change: width, margin;
}
a:hover .gap,
a:focus-visible .gap {
  width: var(--w);
  margin-left: var(--pad);
  margin-right: var(--pad);
}

.gap img {
  position: absolute;
  left: calc(var(--img-x) + var(--pad));   /* compensa a margem que vem no hover */
  top: var(--img-y);
  width: var(--img-w);
  height: auto;
  transform-origin: 49% 30%;               /* o rosto */
  transform: scale(1.06);
  opacity: 0;
  transition: left 520ms var(--ease),      /* cancela a margem — deriva 0px */
              transform 760ms var(--ease), /* assenta 240ms DEPOIS da máscara */
              opacity 240ms linear;
  will-change: left, transform;
}
a:hover .gap img,
a:focus-visible .gap img {
  left: var(--img-x);
  transform: scale(1);
  opacity: 1;
}

.copy { opacity: 0.62; margin-left: 0.3em; font-size: 0.62em; vertical-align: 0.55em; }

@media (prefers-reduced-motion: reduce) {
  .char { transition-duration: 120ms; }
  a:hover .char { transition-delay: 0ms !important; }
  .gap { transition-duration: 160ms; }
  .gap img { transition-duration: 160ms; transform: none !important; }
}
`;

const NAME_A = "Laura";
const NAME_B = "Eckert";

const chars = (word, from) =>
  [...word]
    .map((c, i) => `<span class="char" style="--i:${i + from}">${c}</span>`)
    .join("");

/**
 * SYNC \u2014 embed de dados, n\u00E3o de c\u00F3digo.
 *
 * Este arquivo \u00E9 copiado pro repo do cliente e nunca mais muda. A mec\u00E2nica
 * inteira (m\u00E1scara, cancelamento, crop, escala) \u00E9 local: nenhuma rede, nenhuma
 * depend\u00EAncia, funciona pra sempre mesmo se eckertlaura.com sumir.
 *
 * O que ele busca remotamente \u00E9 DADO, n\u00E3o c\u00F3digo: foto e link. Isso permite
 * atualiz\u00E1-los em todos os sites entregues sem acesso a repo nenhum \u2014 e o pior
 * caso de um comprometimento do dom\u00EDnio \u00E9 uma foto trocada, n\u00E3o execu\u00E7\u00E3o de
 * c\u00F3digo na p\u00E1gina do cliente. Foi uma escolha deliberada; n\u00E3o transforme isto
 * num loader de script.
 *
 * Falha em sil\u00EAncio, sempre. Os defaults embutidos j\u00E1 est\u00E3o na tela antes do
 * fetch come\u00E7ar, ent\u00E3o erro de rede, 404, CORS bloqueado ou offline n\u00E3o t\u00EAm
 * efeito vis\u00EDvel. A foto remota s\u00F3 entra depois de decodificar com sucesso \u2014
 * imagem quebrada nunca chega a aparecer.
 *
 * Atributo `no-sync` desliga o fetch: para cliente que n\u00E3o aceita request
 * externo. A assinatura fica congelada nos valores embutidos.
 */
const CONFIG_URL = "https://eckertlaura.com/signature.json";
const SYNC_TIMEOUT = 4000;

/* O href remoto só pode apontar pra casa.
   Sem isto, quem editasse o signature.json poderia mandar os visitantes de
   todos os sites assinados pra qualquer lugar — um link com o nome dela,
   clicável, levando a phishing. A config remota escolhe ENTRE destinos dela,
   nunca um destino arbitrário. Não afrouxe isto pra "facilitar" um link
   externo: use o atributo href no HTML pra isso, que é local e revisável. */
const ALLOWED_HOSTS = ["eckertlaura.com", "www.eckertlaura.com"];

function safeHref(value) {
  try {
    const u = new URL(value, CONFIG_URL);
    if (u.protocol !== "https:") return null;
    return ALLOWED_HOSTS.includes(u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}

let configPromise = null;
function pullConfig() {
  if (configPromise) return configPromise;            /* uma busca por p\u00E1gina */
  configPromise = (async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), SYNC_TIMEOUT);
    try {
      const res = await fetch(CONFIG_URL, { signal: ctrl.signal, mode: "cors" });
      return res.ok ? await res.json() : null;
    } catch {
      return null;                                    /* sil\u00EAncio: defaults valem */
    } finally {
      clearTimeout(t);
    }
  })();
  return configPromise;
}

class LauraSignature extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    ensureFont();

    const href = this.getAttribute("href") || "https://eckertlaura.com";
    const photo = this.getAttribute("photo") || PHOTO;
    const size = this.getAttribute("size");
    const copy = this.hasAttribute("copyright");

    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>${CSS}</style>
      <a href="${href}" aria-label="Site por Laura Eckert" part="link">
        <span aria-hidden="true">${chars(NAME_A, 0)}</span
        ><span class="gap" aria-hidden="true"><img src="${photo}" alt="" decoding="async"></span
        ><span aria-hidden="true">${chars(NAME_B, NAME_A.length + 1)}</span
        >${copy ? '<span class="copy" aria-hidden="true">\u00A9</span>' : ""}
      </a>`;

    if (size) this.style.setProperty("--sig-size", size);

    /* atributo expl\u00EDcito no HTML do cliente vence o remoto \u2014 quem escreveu
       href="..." na p\u00E1gina quis aquele valor. O sync s\u00F3 preenche o default. */
    if (!this.hasAttribute("no-sync")) this.#sync(root);
  }

  async #sync(root) {
    const cfg = await pullConfig();
    if (!cfg) return;

    if (cfg.href && !this.hasAttribute("href")) {
      const href = safeHref(cfg.href);
      if (href) root.querySelector("a").href = href;   /* fora da allowlist: ignora */
    }

    if (cfg.photo && !this.hasAttribute("photo")) {
      try {
        const probe = new Image();
        probe.src = cfg.photo;
        await probe.decode();                        /* s\u00F3 troca se carregar */
        root.querySelector(".gap img").src = cfg.photo;
      } catch {
        /* foto remota morta \u2014 a embutida continua na tela */
      }
    }
  }
}

if (!customElements.get("laura-signature")) {
  customElements.define("laura-signature", LauraSignature);
}

export default LauraSignature;

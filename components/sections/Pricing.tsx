"use client";

import { useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconCheck, IconArrowUpRight } from "@/components/ui/icons";
import PhoneScreen from "@/components/iphone3d/PhoneScreen";
import { Badge } from "@/components/ui/Badge";
import { pricingGradientCss } from "@/lib/sky";

gsap.registerPlugin(ScrollTrigger);

/* iPhone 15 Pro Max 3D (R3F) — client-only: usa WebGL, nunca renderiza no server */
const IPhone3D = dynamic(() => import("@/components/iphone3d/IPhone3D"), {
  ssr: false,
});

/* Ambiente submerso (cáusticas/raios/partículas) — client-only pelo mesmo
   motivo: é WebGL. */
const Underwater = dynamic(() => import("@/components/sections/Underwater"), {
  ssr: false,
});

/* ── Pricing ────────────────────────────────────────────────────────────────
   Desktop: REVERT VISUAL pra layout de referência — um card único e largo
   (não mais coluna de 56% + phone sangrando à direita), vidro claro em
   gradiente diagonal (lavanda → creme). A grade externa tem 2 colunas: o
   card (título, preço, checklist compacto, CTA) e o slot do phone.
   O card virou o palco inteiro — não um ledger dentro de um palco maior com
   auroras próprias; a luz do card agora é o próprio gradiente do vidro, não
   campos de blur atrás dele.

   Mobile (<lg): comportamento antigo preservado — aparelho estático em fluxo,
   conteúdo empilhado num único card de vidro escuro abaixo.

   STACKING: o ScrollPhone é um overlay `fixed z-[60]` na raiz que lê o rect
   vivo de [data-phone-end] a cada frame. O slot vive em fluxo normal dentro
   da coluna central do card (não mais absoluto/sangrando) — é o que faz o
   card crescer até a altura do phone e é exatamente essa altura que dá ao
   phone o "chão" pra pousar; como o overlay é z-[60] e o card não passa
   de z-20, o phone sempre lê como flutuando SOBRE o vidro, mesmo ocupando
   uma coluna real do grid. */

/* pose fixa do iPhone 3D — [x, y, z] rad. usada no mobile (estático) e espelha
   a pose final [END_TILT[0], END_YAW, END_TILT[1]] do ScrollPhone (desktop),
   pra que as duas versões pousem com a mesma inclinação editorial. */
const PHONE_POSE: [number, number, number] = [0.1, Math.PI - 0.34, -0.19];

const INCLUDES = [
  "Anamnese ilimitada",
  "Pacientes ilimitados",
  "Celular e computador",
  "Suporte na migração",
] as const;

/* easing háptico (spring-like) para os hovers do CTA */
const HAPTIC = "ease-[cubic-bezier(0.32,0.72,0,1)]";

/* realce de vidro do card desktop — camada SEPARADA (não empilhada dentro do
   shadow-glass do shell), mesmo padrão do CARD_SHEEN do CTAFinal: 1px de luz
   na quina de cima. */
const CARD_SHEEN =
  "pointer-events-none absolute inset-0 rounded-card shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]";

/* grão fino (film grain) — textura física, aplicado como overlay estático */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* o céu da seção — mesmo idioma do Manifesto/Mergulho: os stops moram em
   lib/sky (é a cadeia inteira num arquivo só) e entram por style, não por
   classe. Constante de módulo porque o gradiente é fixo: recalcular a string a
   cada render não muda nada. */
const PRICING_SKY = pricingGradientCss();

/* a dissolução do recife na água — ver o comentário longo na cena, lá embaixo,
   pro porquê de existir. Aqui só o número: 30% é a travessia, e ela é ASSIMÉTRICA
   de propósito (nada em baixo/nas laterais) porque só a borda de cima do asset
   encosta no gradiente; as outras três morrem fora da tela.

   O % É MEDIDO CONTRA A ALTURA DO ELEMENTO MASCARADO, não contra a section — e a
   cena é uma faixa de h-[30%]. A travessia em px é que é a decisão (~100px a
   1440); o % é só como ela se escreve, e por isso ele muda toda vez que a caixa
   muda de tamanho. A section mede 1826px a 1440 (MEDIDA no render, não estimada
   — ela é o dobro do que aparenta, e chutar isso já custou um número errado
   aqui), então a faixa dá 548px:
     faixa de 30% (548px a 1440) → 18% ≈  99px  ← hoje
     inset-0      (1826px)       →  5,5% ≈ 100px
   Manter os 9% que valiam pro inset-0 antigo daria ~49px — degrau visível.
   Trocar a altura da caixa sem retocar este número quebra a emenda, e quebra em
   silêncio: a máscara não reclama, ela só fica feia. */
const REEF_MASK = "linear-gradient(to bottom, transparent 0%, #000 18%)";

/* vidro fumê — versão MOBILE: card alto e estreito, single column. Um
   gradiente diagonal correria quase na vertical nessa proporção e a região
   mais rala cairia embaixo do checklist/CTA, matando o contraste do texto
   branco. Por isso aqui é tint uniforme e denso — sem gradiente. */
const GLASS_MOBILE =
  "bg-[rgba(0,10,26,0.80)] backdrop-blur-[16px] backdrop-saturate-[1.6]";

export default function Pricing() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gsap.set("[data-reveal], [data-glass], [data-zone]", {
          opacity: 1,
          y: 0,
          filter: "none",
        });
        return;
      }
      const trigger = { trigger: root.current, start: "top 74%", once: true };

      gsap.set("[data-reveal]", { opacity: 0, y: 44, filter: "blur(10px)" });
      gsap.to("[data-reveal]", {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: trigger,
        /* devolve filter:none no fim — blur(0px) ainda cria stacking context */
        onComplete: () => gsap.set("[data-reveal]", { filter: "none" }),
      });

      /* [data-glass] cobre os dois cards de vidro (mobile escuro + desktop
         claro). Entra sem filter: qualquer filter nele (mesmo blur(0px))
         mexe em stacking/backdrop root, e é justo o backdrop dele que
         precisa ficar limpo pro efeito de vidro fosco funcionar — por isso
         esse tween anima só opacity/y, nunca filter. */
      gsap.set("[data-glass]", { opacity: 0, y: 44 });
      gsap.to("[data-glass]", {
        opacity: 1,
        y: 0,
        duration: 1.1,
        delay: 0.14,
        ease: "power3.out",
        scrollTrigger: trigger,
      });

      /* Zonas do card desktop — ruler PRÓPRIO ([data-zone], não [data-reveal]):
         o card inteiro já entra via [data-glass], e este segundo stagger
         coreografa o que tem DENTRO dele. Delay maior que o do vidro (0.14)
         pra as zonas nascerem depois que ele já assentou — senão as duas
         entradas competem pela mesma leitura. */
      gsap.set("[data-zone]", { opacity: 0, y: 24 });
      gsap.to("[data-zone]", {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay: 0.3,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: trigger,
      });
    },
    { scope: root },
  );

  /* painel de migração morreu junto com o toggle: era um cartão construído
     em volta do switch (pergunta + "2 meses grátis" + switch), e sem ele
     não se sustentava como cartão próprio. A informação não sumiu — já
     está no Preco (abaixo, "Nos 2 primeiros meses. Depois R$ 49,90/mês.")
     e no Checklist ("Suporte na migração"). Manter o cartão só com a
     pergunta+resposta estática duplicaria essas duas fontes; removido em
     vez de colapsado. */

  /* preço — versão MOBILE (grande, como sempre foi no card empilhado).
     Estado único (sem toggle): sempre o fluxo de migração. */
  const Preco = (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
        Plano único
      </span>

      <div className="mt-5 flex items-start gap-1.5">
        <span className="mt-2 font-title text-h3 font-medium text-white/45">R$</span>
        <span className="font-title text-[4rem] font-semibold leading-[0.85] tracking-[-0.02em] text-white tabular-nums">
          0
        </span>
        <span className="self-end pb-2 font-body text-body-l text-white/40">/mês</span>
      </div>

      <p className="mt-4 font-body text-small leading-[1.55] text-white/60">
        Nos 2 primeiros meses.{" "}
        <span className="text-white/40">Depois R$ 49,90/mês.</span>
      </p>
    </div>
  );

  /* checklist — versão MOBILE, 2 colunas */
  const Checklist = (
    <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {INCLUDES.map((item) => (
        <li key={item} className="flex items-center gap-3">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-white/80 ring-1 ring-inset ring-white/15">
            <IconCheck className="h-3 w-3" strokeWidth={2.25} />
          </span>
          <span className="font-body text-small text-white/70">{item}</span>
        </li>
      ))}
    </ul>
  );

  /* CTA — DARK: pill branca com círculo escuro pra seta. Usada no card mobile,
     que continua vivendo sobre o vidro escuro. */
  const ctaDark = (
    <a
      href="#"
      className={`group/cta inline-flex shrink-0 items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 transition-all duration-500 ${HAPTIC} hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`}
    >
      <span className="whitespace-nowrap font-body text-[15px] font-medium text-ink">
        Migrar e ganhar 2 meses
      </span>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-500 ${HAPTIC} group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5`}
      >
        <IconArrowUpRight className="h-4 w-4" />
      </span>
    </a>
  );

  /* CTA — LIGHT: pill escura de novo sobre vidro (a coluna 3 do card único),
     mas em largura cheia da coluna — justify-between empurra o círculo da
     seta pra ponta direita, ecoando o "preço ocupa a coluna inteira" da
     referência. pl-8 (maior que o pr-2 do círculo) porque o texto precisa
     de mais ar do lado que não tem o círculo compensando visualmente. */
  const ctaLight = (
    <a
      href="#"
      className={`group/cta inline-flex w-full shrink-0 items-center justify-between gap-3 rounded-full bg-ink py-3 pl-8 pr-2 transition-all duration-500 ${HAPTIC} hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutro-50`}
    >
      <span className="whitespace-nowrap font-body text-[15px] font-medium text-white">
        Migrar e ganhar 2 meses
      </span>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-500 ${HAPTIC} group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5`}
      >
        <IconArrowUpRight className="h-4 w-4" />
      </span>
    </a>
  );

  return (
    <section
      ref={root}
      id="pricing"
      /* overflow-x-clip (não -hidden): sem scroll horizontal, mas deixa o Y
         livre pra cena de fundo sangrar pra cima e fundir com o fim branco
         do Manifesto sem cortar numa linha reta na borda — era o "corte"
         visível entre as seções que o -hidden causava. */
      /* lg:pt-[70vh] — A DESCIDA SUBMERSA. Não é respiro, é SCROLL, e sem ele o
         mergulho não fecha.
         O topo desta seção é a linha d'água (ver Mergulho.tsx). Do outro lado
         dela o leitor está dentro d'água, e a câmera do ScrollPhone vira pra
         baixo acompanhando esta aresta — é o que abre o Fresnel e faz o recife
         aparecer através da superfície. Só que a virada precisa TERMINAR e a
         água precisa dissolver antes de o phone pousar no slot, senão ele pousa
         visto por uma câmera torta.
         Medido @1440×787 com pt-36: da linha até o centro do slot havia 624px, e
         a virada consumia todos. Sobravam 0.03 de p — 80px de scroll — pra
         desvirar a câmera e matar a água. O erro do horizonte contra a emenda ia
         a 534px e o recife aparecia cru numa faixa ciano acima da linha d'água.
         Não era tuning: era falta de espaço. Faltavam ~415px, meio viewport.
         Em vh e não px porque a dívida é de VIEWPORT: quem paga a conta é a
         emenda subir a tela inteira, e isso escala com a altura da janela.
         E o que se ganha não é um vazio: é o único trecho em que se está DENTRO
         d'água sem nada disputando o quadro — recife, god rays, o phone
         afundando — antes de o preço chegar. É a seção virar submersa em vez de
         ser um card sobre um fundo azul. */
      className="relative overflow-x-clip py-28 md:py-36 lg:pt-[70vh]"
      style={{ background: PRICING_SKY }}
    >
      {/* AMBIENTE — a cena é uma FAIXA DE RODAPÉ de h-[30%], não o fundo inteiro
          da seção. O recife é um asset composto (recife distante dissolvido na
          névoa azul ao fundo, uma água-viva à deriva, o monograma "A" luminoso
          pousado num afloramento de coral à direita do centro, corais e areia
          ondulada na frente). Acima da faixa quem aparece é o PRICING_SKY puro,
          e é sobre ele que o h2 é lido.

          O ENQUADRAMENTO É QUEM SALVA O MONOGRAMA, e ele é o object-center
          PADRÃO — o que parece "não ter decisão" aqui é a decisão. A faixa só
          mostra uma janela do asset (no cover a largura manda), e o "A" mora
          entre 32,9% e 70,2% da altura dele. Medido nos três cortes: object-top
          decepa a base, object-bottom deixa só o pé, e só o centrado o mostra
          inteiro.

          TUDO AQUI EM FRAÇÃO DA ALTURA, de propósito: o Next/Image serve o asset
          REESCALADO (a 1440 chega 1440×1075, não os 1920×1434 do arquivo), então
          conta em px do arquivo-fonte mente. Já mentiu: comparar bbox do original
          contra janela do servido deu "monograma cortado" numa tela onde ele está
          inteiro.

          A JANELA VISÍVEL = altura_da_faixa / (largura_da_viewport / 1,339), em
          fração — e ela ENCOLHE conforme a viewport ALARGA, que é o contra-senso
          do cover aqui. O "A" precisa de ≥40,4% da altura pra entrar inteiro:
            1440 → 51,0% visível (janela 24,5–75,5%) → inteiro, folga 8,4/5,3
            1920 → 38,2% visível (janela 30,9–69,1%) → base cortada em 1,1%
          O corte a 1920 fica CONFERIDO como aceitável: 1,1% cai na linha em que
          o "A" já entra no coral, então some no desenho em vez de ler como
          decepado. Se um dia incomodar, o caminho não é o object-position (já é o
          centro, que é o melhor corte): é subir a faixa pra ~32% ou recortar o
          asset pra perto da proporção da faixa, pra o cover parar de ampliar.

          O céu próprio da section (PRICING_STOPS em lib/sky) não morre com a
          mudança: ele segue sendo o que aparece acima da faixa e nos ~100px de
          fade da REEF_MASK — é ele que emenda o creme do Mergulho no teal
          deste asset. z-0 pra ficar atrás de tudo; por cima da cena seguem as
          cáusticas do Underwater e o film grain, na mesma ordem de antes — o
          Underwater é `multiply`, então tinge o recife sem lavar. Ver o
          cabeçalho de Underwater.tsx pro porquê da água ser clara (a pill
          escura do CTA foi desenhada pra viver sobre o creme).

          A MÁSCARA NÃO É ENFEITE — é o que faz a emenda existir.

          O asset antigo era céu liso: uma cor só na borda do corte, então
          bastava o gradiente terminar naquela cor exata e a emenda sumia sem
          máscara nenhuma. Este não é. A borda de cima do recife varia no
          horizontal — os cantos batem ~#5BC2DD/#68C5DE e o meio clareia pra
          ~#A8E3F3, 86/255 de amplitude só no vermelho. Contra isso NENHUMA cor
          única de gradiente fecha a conta. Uma cor não resolve variação;
          só a dissolução resolve. Daí o mesmo recurso da DIVE_MASK do
          Underwater (transparent → black nos primeiros %): o recife entra por
          fade em cima e a linha reta não tem onde aparecer. ~100px de travessia
          a 1440 — o bastante pra sumir, pouco o bastante pra não lavar o
          coral. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[30%]"
        style={{
          maskImage: REEF_MASK,
          WebkitMaskImage: REEF_MASK,
        }}
      >
        <Image
          src="/pricing-reef-bg.webp"
          alt=""
          fill
          priority={false}
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <Underwater />
      {/* film grain — overlay estático, mistura suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.045] mix-blend-soft-light"
        style={{ backgroundImage: NOISE, backgroundSize: "140px" }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        {/* framing editorial — eyebrow + título grande à esquerda */}
        <div data-reveal>
          <Badge tone="light">Preço</Badge>
          {/* max-w em ch VAI NO h2, não no pai: ch resolve na font-size do próprio
              elemento — no pai (16px) daria ~120px e quebrava o título em 4 linhas */}
          <h2 className="mt-6 max-w-[13ch] text-balance font-title text-h2 font-medium leading-[1.02] text-neutro-800 md:text-[4rem] lg:max-w-[11ch] lg:text-[5rem] lg:leading-[0.94] lg:tracking-[-0.032em] xl:text-[6rem]">
            Sem surpresa no{" "}
            {/* azul-700, não neutro-600: a escala neutro MUDA DE MATIZ na
                rampa — é fria no 800/700 (#2B2E3A) e vira quente no 600/500
                (#8E8E86 é oliva). O título escuro usa neutro-800 e casa com o
                fundo; este itálico caía justo onde a escala esquenta, e lia
                sujo contra a água azul-lavanda.

                ESTE PONTO NÃO PASSA EM CONTRASTE, E NÃO TEM COMO PASSAR SEM
                MATAR O TÍTULO DE DOIS TONS. Medido contra o fundo real (a água
                da seção nesta altura, mediana sobre a caixa do span):
                neutro-600 dava 2.27:1, azul-600 dá 1.97, azul-700 dá 2.85 —
                todos abaixo do 3:1 que texto grande pede. Só azul-800 (3.94)
                passa, e ele é praticamente o neutro-800 da primeira linha: o
                itálico deixaria de ser voz secundária e o contraste entre as
                duas linhas morreria. azul-700 é o teto do que dá pra fazer
                mantendo o desenho — e ainda assim é MELHOR que o 2.27 que
                estava aqui antes, além de frio. Se um dia o contraste tiver
                que passar de verdade, o caminho não é escurecer o texto: é
                escurecer/desfocar a água atrás dele.

                OS NÚMEROS ACIMA SÃO DE ANTES DA TROCA DO ASSET (o céu/musgo
                virou recife; ver PRICING_STOPS em lib/sky) e não foram
                remedidos com o mesmo método. A água aqui era periwinkle
                (~#748EB7) e virou teal (~#75A3B4): mesma luminância, matiz
                outro — o veredito (só azul-800 passa, e passar custa o
                desenho) sobrevive à troca, mas os decimais não. Remedir antes
                de citá-los como prova. */}
            <span className="italic text-azul-700">fim do mês.</span>
          </h2>
        </div>
      </div>

      {/* ══ DESKTOP (lg+) ═══════════════════════════════════════════════════
          MESMO palco do header (max-w-6xl px-6 md:px-10 lg:px-16), de
          propósito: é o que faz a borda esquerda do card alinhar com o "S"
          de "Sem surpresa" do h2. Quando eram 3 colunas (texto + phone +
          texto) o card não cabia nesse palco estreito e precisava de um
          container próprio (max-w-1400) — mas a coluna de texto do meio
          morreu (virou bloco compacto dentro do card, ver abaixo) e sobrou
          espaço de sobra: a 1440 os 1024px de conteúdo do max-w-6xl cabem
          folgados as 904px que card (560) + gap (56) + phone (288) somam;
          a 1024 (piso do lg) os 896px de conteúdo cabem os 707px de
          460+40+207. Container único = borda única. */}
      <div className="relative z-10 mx-auto mt-12 hidden w-full max-w-6xl px-6 md:px-10 lg:px-16 lg:block">
        {/* vidro claro em gradiente diagonal — lavanda saturada
            (topo-esquerda) até creme opaco (baixo-direita), na diagonal
            COMPLETA original. O checklist não tem mais vidro próprio nem
            coluna própria — mudou-se pra dentro deste card, como bloco
            compacto subordinado ao preço. A coluna de preço deixou de ser
            uma fatia de metade de card: ela é o único card de vidro do
            desktop, então carrega a diagonal inteira de ponta a ponta, não
            mais um trecho dela.

            O stop final é opaco de propósito (sem alpha): com translucidez
            o backdrop-blur + saturate deixa a aurora atrás vazar e
            recolorir o "creme" de volta pra lavanda — medido no render, a
            coluna do preço saía tão roxa quanto o checklist. neutro-50
            (não branco puro) porque é a MESMA cor do fundo da seção — o
            "creme quase branco" da referência, não um branco frio. É essa
            cor que agora carrega a luz do card: as auroras que existiam
            atrás do palco morreram junto com o palco — não tem mais atrás
            do quê ficarem, o card É o palco. */}

        {/* grade de 2 colunas (card + phone), empacotada no INÍCIO (sem
            justify-center): o container agora é o mesmo max-w-6xl do
            header, então a borda esquerda do grid já É a borda do palco —
            é isso que alinha a borda do card com o "S" de "Sem surpresa"
            no h2. justify-center recentraria o par card+phone dentro do
            palco e quebraria esse alinhamento de novo.

            minmax(0,460px)/560px no card: teto de largura pra ele não
            esticar até o limite do container agora que só tem o phone como
            vizinho. O slot do phone segue em BREAKPOINT, não fluido: tem
            um footprint real em px (não pode ser %, senão o phone
            renderizado — cuja escala vem do próprio rect deste slot, ver
            ScrollPhone — encolheria/estufaria em qualquer largura
            intermediária). 207px em lg, 288px em xl — razão 0,5625 mantida
            nos dois (207/368, 288/512) pra não distorcer o phone.

            items-center (não items-stretch): são só dois blocos — o card de
            vidro (preço) e o slot de tamanho fixo (phone) — cada um
            assentando centrado no próprio tamanho, não um par de cards
            precisando ler com a mesma altura. */}
        <div className="relative z-[1] grid grid-cols-[minmax(0,460px)_207px] items-center gap-x-10 xl:grid-cols-[minmax(0,560px)_288px] xl:gap-x-14">
          {/* CARD DO PREÇO — coluna 1 (primeiro na leitura e no DOM):
              título, preço, checklist compacto e CTA. Sem badge "Plano
              único" — o card abre direto no h3 (removida; a versão MOBILE,
              outro card, manteve a sua). Único card de vidro do desktop,
              com a diagonal COMPLETA (não mais uma fatia dela — ver
              comentário do gradiente acima). Zonas próprias mantêm o mesmo
              cadenciamento de entrada de sempre. */}
          <div
            data-glass
            className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-[linear-gradient(135deg,rgba(193,169,211,0.78)_0%,rgba(234,223,239,0.42)_40%,#FAF9F5_86%)] p-10 shadow-glass backdrop-blur-xl backdrop-saturate-[1.1] xl:p-14"
          >
            {/* realce de vidro — camada separada, padrão CARD_SHEEN do CTAFinal */}
            <div aria-hidden className={CARD_SHEEN} />
            {/* sheen animado — mesmo device do card mobile (.gaia-card-sheen,
                ver globals.css). */}
            <span
              aria-hidden
              className="gaia-card-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            />

            <div className="relative z-[1] flex flex-col gap-5">
              <h3
                data-zone
                className="font-title text-[1.75rem] font-medium leading-[1.05] text-neutro-800 xl:text-[2.25rem]"
              >
                Um preço, sem letra miúda.
              </h3>

              {/* o preço agora é o valor cheio (R$ 49,90), não mais "0":
                  sem toggle não existe mais período gratuito a destacar
                  aqui — os "2 meses grátis" viraram a linha "Comece com 2
                  meses grátis." logo abaixo, então este lockup pode voltar
                  a mostrar o fato permanente do plano. */}
              <div data-zone>
                <div className="flex items-baseline gap-1">
                  {/* azul-700 e não neutro-400: este lockup era o pior caso da
                      seção — R$ e /mês em neutro-400 (#B7B6AD, o tom mais
                      quente da escala) encostados no 49,90 em neutro-800, que é
                      frio. O choque de matiz entre vizinhos imediatos denuncia o
                      oliva muito mais que nos títulos. E neutro-400 já era claro
                      demais aqui: a régua de "Sem fidelidade" abaixo registra
                      que ele SUMIA sobre o vidro — medido, dava 1.42:1.

                      azul-700 (#4B5D79) porque R$ e /mês têm ALVOS DIFERENTES
                      apesar de serem um par visual: 28px conta como texto grande
                      (3:1), 20px não (4.5:1). azul-600 passaria no R$ (3.21) e
                      falharia no /mês (4.12) — e pintar os dois lados do número
                      de tons diferentes pra satisfazer a régua leria como bug.
                      azul-700 passa nos dois (4.56 e 5.90) com uma cor só, e
                      segue claro o bastante pra não competir com o 49,90. */}
                  <span className="font-title text-[1.25rem] text-azul-700 xl:text-[1.75rem]">
                    R$
                  </span>
                  <span className="font-title text-[3.5rem] font-semibold leading-none tracking-[-0.03em] text-neutro-800 tabular-nums xl:text-[5rem]">
                    49,90
                  </span>
                  <span className="font-body text-[1rem] text-azul-700 xl:text-[1.25rem]">
                    /mês
                  </span>
                </div>
                {/* azul-700 e não azul-600: o 600 é o par de MATIZ do
                    neutro-600 que estava aqui, mas não de LUMINOSIDADE — trocar
                    um pelo outro derrubava o contraste de 4.67 (passava) pra
                    4.05 (falha), porque 18px não conta como texto grande e o
                    alvo é 4.5. azul-700 dá 5.86. Esfriar o tom não pode custar
                    a legibilidade que já estava boa. */}
                <p className="mt-2 font-body text-[1rem] text-azul-700 xl:text-[1.125rem]">
                  Comece com 2 meses grátis.
                </p>
              </div>

              {/* /25 já foi tentado — o comentário original desta régua
                  avisava "opacidade baixa simplesmente some" sobre o vidro
                  lavanda, e era verdade: conferido no render, sumia de
                  verdade. /50 é o piso onde ela volta a se ver sem virar
                  uma linha pesada. */}
              <div
                aria-hidden
                className="h-px bg-gradient-to-r from-transparent via-neutro-800/50 to-transparent"
              />

              {/* checklist compacto — mudou-se pra dentro do card (era um
                  bloco solto na antiga coluna 3, com h3 grande e pills
                  brancas; ver histórico). Aqui é subordinado ao preço, por
                  isso sem fundo/pill/borda — qualquer moldura o devolveria
                  pra uma briga de hierarquia que o card já resolveu.

                  neutro-700 no item e não neutro-600/500: a escala neutro
                  MUDA DE MATIZ na rampa — é fria no 800/700 e vira oliva no
                  600/500 (ver a nota irmã no h2 do header), e oliva suja
                  sobre o vidro lavanda. azul-700 no rótulo pelo mesmo
                  motivo, e é o mesmo tom já usado em "Comece com 2 meses
                  grátis." logo acima. */}
              <div data-zone className="flex flex-col gap-3">
                <p className="font-body text-[13px] text-azul-700">
                  Tudo incluído. <span className="italic">Sem add-on.</span>
                </p>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {INCLUDES.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <IconCheck
                        className="h-3.5 w-3.5 shrink-0 text-brand"
                        strokeWidth={2.5}
                      />
                      <span className="font-body text-[14px] text-neutro-700">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div data-zone className="flex flex-col items-start gap-3">
                {ctaLight}
                {/* azul-700 e não neutro-500: neutro-500 é o trecho oliva da
                    rampa (ver a nota do h2 do header) e sumia sobre o creme
                    do card — medido, ~2.5:1, abaixo do 4.5:1 que 13px pede.
                    azul-700 é o tom frio que o resto do card já usa (mesmo
                    de "Comece com 2 meses grátis." acima). */}
                <p className="font-body text-[13px] text-azul-700">
                  Sem fidelidade. Cancele quando quiser.
                </p>
              </div>
            </div>
          </div>

          {/* VÃO — só a âncora de pouso do ScrollPhone, ao lado do card de
              preço. Fluxo normal (não absoluto); com a grade em
              items-center o slot já centra sozinho, sem precisar de
              self-center. Renderizar o IPhone3D aqui seria dobrar o
              phone — o ScrollPhone já é quem desenha, este div só marca
              onde.

              O tamanho aqui é a FONTE ÚNICA da escala do phone: o
              ScrollPhone lê `rect.height` deste slot ao vivo (endG =
              rect.height / PHONE_FILL / 900 — PHONE_FILL corrige o phone
              pra preencher a altura inteira do slot, não só ~75% dela,
              ver ScrollPhone.tsx) em vez de uma constante — então qualquer
              ajuste de tamanho, inclusive por breakpoint como aqui, se
              propaga sozinho pro phone. Não tem mais como os dois lados
              desincronizarem.

              660px/460px eram grandes demais: mesmo com o slot preenchido
              de ponta a ponta, o phone (~0,58 de aspect largura/altura
              quando tilted) saía com ~29% da largura do card — a
              referência usa um aparelho mais contido, ~22%. h-512/w-288
              (xl) e h-368/w-207 (lg) foram recalculados pra bater nisso:
              largura-alvo = 0,22×largura-do-card, altura = largura-alvo /
              0,58. Menor slot = card mais baixo = sem sobra no rodapé. */}
          <div
            data-phone-end
            aria-hidden
            className="pointer-events-none relative z-20 mx-auto h-[368px] w-[207px] xl:h-[512px] xl:w-[288px]"
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        {/* ══ MOBILE (<lg) ════════════════════════════════════════════════
            Comportamento preservado: aparelho estático em fluxo acima,
            conteúdo empilhado num único card de vidro escuro abaixo. */}
        <div className="mt-12 lg:hidden">
          <div className="mx-auto -mb-24 h-[440px] w-[300px] animate-[gaia-float_6s_ease-in-out_infinite] motion-reduce:animate-none">
            <IPhone3D
              height="100%"
              scale={16}
              rotation={PHONE_POSE}
              screen={<PhoneScreen variant="inicio" />}
            />
          </div>

          <div
            data-glass
            className={`relative z-[70] overflow-hidden rounded-[2.25rem] border border-white/15 p-2.5 shadow-[0_40px_90px_-30px_rgba(0,10,26,0.55)] ${GLASS_MOBILE}`}
          >
            <div className="pointer-events-none absolute inset-0 rounded-[2.25rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(255,255,255,0.06)]" />
            <span
              aria-hidden
              className="gaia-card-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 bg-gradient-to-r from-transparent via-white/12 to-transparent"
            />

            <div className="relative z-[1] flex flex-col gap-7 p-7">
              {Preco}
              {Checklist}

              <div className="flex flex-col gap-5 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <p className="text-balance font-body text-small text-white/60">
                  Sem fidelidade. Cancele quando quiser.
                </p>
                {ctaDark}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

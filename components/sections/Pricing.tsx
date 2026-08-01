"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconCheck, IconArrowUpRight } from "@/components/ui/icons";
import PhoneScreen from "@/components/iphone3d/PhoneScreen";

gsap.registerPlugin(ScrollTrigger);

/* O <IPhone3D> declarado aqui foi removido em 2026-07-31: era um SEGUNDO
   Canvas WebGL, com Lights e IPhoneModel próprios, que nunca chegou ao JSX —
   o aparelho desta seção é o ScrollPhone, que pousa no slot [data-phone-end].
   Um `dynamic()` só baixa o chunk quando é renderizado, então ele não custava
   rede; custava um módulo vivo no grafo e um segundo contexto WebGL sempre a
   um render de distância. */

/* ── Pricing ────────────────────────────────────────────────────────────────
   Layout 2026-07-19 (mockup da Pronit): o campo florido vira o HERO da seção —
   full-bleed, aresta de baixo RETA — e dois cards montam sobre a metade de
   baixo dele. O mockup trazia cards brancos e accent laranja; a Pronit pediu o
   VIDRO que o card antigo já tinha (gradiente diagonal lavanda→creme denso,
   sheen, borda de luz) e a paleta do DS — só o CONTEÚDO segue o mockup.
   Card 1 (trial, LARGO): headline serifada "Teste grátis", subtítulo, o CTA
   padrão da casa (pill ink + seta) e o phone pousando na metade direita,
   descendo pra fora do card. Card 2 (preço, ESTREITO): toggle Anual/Mensal,
   lockup do preço, total do período e checklist com checks na cor da marca.
   (Ordem invertida em 2026-07-19: trial + phone foram pra ESQUERDA, o preço
   pra coluna estreita da direita — o tab preto acompanhou o phone.)

   A fita preta full-width morreu; sobrou só o TAB trapezoidal (a geometria do
   entalhe do Figma 303:119) atrás do phone, emergindo da aresta do campo e
   descendo sobre o creme. Ele é o [data-phone-clip]: o ScrollPhone corta o
   overlay na aresta de BAIXO dele (r.bottom), então o phone lê como mergulhando
   pra dentro do tab.

   Mobile (<lg), mock da Pronit 2026-07-20: o campo também é o HERO — mas em
   vez de full-bleed cortado, a imagem encolhe pro recorte retrato caber com
   TODO o contexto (céu, o "A", as duas colinas, flores) e o pé dela dissolve
   numa BANDA ESCURA (ink) que hospeda o pouso do phone e o card de preço,
   fechando em rounded-b sobre o creme. Topo da imagem derrete na descida
   lavanda via mask, como no desktop.

   STACKING: o ScrollPhone é um overlay `fixed z-[60]` na raiz que lê o rect
   vivo de [data-phone-end] a cada frame. O slot agora é ABSOLUTO dentro do
   card do trial (não mais coluna do grid): a altura do grid vem só dos cards,
   e o slot pode descer além do rodapé deles sem esticar nada. Como o overlay
   é z-[60] e os cards não passam do z do container, o phone sempre lê como
   flutuando SOBRE os cards. */

/* pose fixa do iPhone 3D — [x, y, z] rad. usada no mobile (estático) e espelha
   a pose final [END_TILT[0], END_YAW, END_TILT[1]] do ScrollPhone (desktop),
   pra que as duas versões pousem com a mesma inclinação editorial. */
const PHONE_POSE: [number, number, number] = [0, Math.PI, 0];

const INCLUDES = [
  "Anamnese ilimitada",
  "Pacientes ilimitados",
  "Celular e computador",
  "Suporte na migração",
] as const;

/* PREÇOS por período — o toggle Anual/Mensal troca o lockup inteiro (mensal
   equivalente + linha de total). Mensal é o preço vigente (R$ 49,90); o anual
   (R$ 39,90/mês → 478,80/ano) é PLACEHOLDER de negócio até a Pronit cravar o
   desconto real. `monthly` como string já formatada porque é texto de UI, não
   aritmética — o único consumidor numérico (count-up) faz o parse dele. */
const PRICES = {
  anual: { monthly: "39,90", note: "Total de R$ 478,80 anualmente" },
  mensal: { monthly: "49,90", note: "Cobrado mês a mês, sem fidelidade" },
} as const;
type Period = keyof typeof PRICES;

/* easing háptico (spring-like) para os hovers do CTA */
const HAPTIC = "ease-[cubic-bezier(0.32,0.72,0,1)]";

/* vidro claro dos cards desktop — o MESMO efeito do card antigo do Pricing:
   gradiente diagonal lavanda→creme com alphas DENSOS (~0.95 — o campo atrás é
   escuro e um vidro mais translúcido lavava o texto, medido no render),
   borda de luz, shadow-glass e backdrop-blur. rounded-card (40px) idem. */
const GLASS_DESKTOP =
  "overflow-hidden rounded-card border border-white/70 bg-[linear-gradient(135deg,rgba(206,190,222,0.95)_0%,rgba(233,225,239,0.94)_45%,rgba(250,249,245,0.97)_92%)] shadow-glass backdrop-blur-xl backdrop-saturate-[1.1]";

/* realce de vidro — camada SEPARADA (não empilhada no shadow-glass do shell),
   mesmo padrão do CARD_SHEEN do CTAFinal: 1px de luz na quina de cima. */
const CARD_SHEEN =
  "pointer-events-none absolute inset-0 rounded-card shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]";

/* TAB atrás do phone — iteração 2026-07-20 (2ª volta): a Pronit vetou o flare
   côncavo na saída ("não quero que aumente na saída") e mandou a referência —
   o TRAPÉZIO do Figma de volta, AFUNILANDO na descida, só que de cantos
   arredondados e mais raso. Shape em clip-path:path() com coordenadas
   absolutas, então é um path POR BREAKPOINT (o mesmo path esticado distorceria
   os raios). Geometria: retângulo cheio até a linha do campo (y 124/152 do
   topo do container — invisível, preto sobre grama), e daí o funil desce
   48/56px com inset de 26/42 por lado (slant ~28/37°). As pontas da base
   MAIOR são RETAS — sem raio (veto de 2026-07-21); só as quinas de baixo
   arredondam, ~12/14 — raio PEQUENO de propósito ("o trapézio não pode ser
   muito arredondado", 3ª volta de 2026-07-20): é quebra de canto, não curva.
   O que dimensiona o inset é a base RETA (o vão entre os dois cantos de
   baixo): 284/388, ~26px de sobra por lado sobre a largura VISUAL do phone
   (~232/334, medida no render) — é na base que o ScrollPhone corta (r.bottom)
   e o corte do phone não pode vazar do preto; a largura canto-a-canto nominal
   engana porque o raio come a reta. */
const TAB_FILL = "linear-gradient(180deg, #161616 0%, #000 55%)";
const TAB_PATH_LG =
  "path('M0,0 H360 V124 L339.7,161.5 Q334,172 322,172 L38,172 Q26,172 20.3,161.5 L0,124 Z')";
const TAB_PATH_XL =
  "path('M0,0 H500 V152 L466.4,196.8 Q458,208 444,208 L56,208 Q42,208 33.6,196.8 L0,152 Z')";

/* vidro fumê — versão MOBILE: card alto e estreito, single column. Tint
   uniforme e denso (sem gradiente) pro texto branco não lavar. */
const GLASS_MOBILE =
  "bg-[rgba(0,10,26,0.80)] backdrop-blur-[16px] backdrop-saturate-[1.6]";

export default function Pricing() {
  const root = useRef<HTMLElement>(null);

  /* toggle Anual/Mensal — estado único compartilhado por desktop e mobile. */
  const [period, setPeriod] = useState<Period>("anual");
  /* o count-up do preço escreve textContent por fora do React; guardar o tween
     pra poder matá-lo no primeiro toggle — senão ele continua contando pro
     alvo antigo por cima do valor que o React acabou de escrever. */
  const priceTween = useRef<gsap.core.Tween | null>(null);

  const switchPeriod = (p: Period) => {
    if (p === period) return;
    priceTween.current?.kill();
    priceTween.current = null;
    setPeriod(p);
  };

  // O gate de reduced-motion do campo saiu junto com o <video>: uma <img>
  // parada não tem autoplay para condicionar. Ele volta com o mp4.

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

      /* [data-glass] cobre os três cards (2 brancos desktop + vidro mobile).
         Entra sem filter: qualquer filter (mesmo blur(0px)) mexe em
         stacking/backdrop root — o card mobile precisa do backdrop limpo. */
      gsap.set("[data-glass]", { opacity: 0, y: 44 });
      gsap.to("[data-glass]", {
        opacity: 1,
        y: 0,
        duration: 1.1,
        delay: 0.14,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: trigger,
      });

      /* Zonas internas dos cards — ruler próprio, delay maior que o do vidro
         pra nascerem depois que ele assentou. A ordem DOM (headline do trial →
         CTA → toggle → preço → checklist) é a ordem da cascata. */
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

      /* Count-up do preço — 0→39,90 (o anual, estado inicial do toggle) DENTRO
         da revelação da zona do preço. Sob reduce nunca chega aqui e o valor
         do React fica parado. O tween vive em priceTween pra o toggle poder
         matá-lo (ver switchPeriod). */
      const price = root.current?.querySelector<HTMLElement>("[data-price]");
      if (price) {
        const target = Number(PRICES.anual.monthly.replace(",", "."));
        const obj = { v: 0 };
        priceTween.current = gsap.to(obj, {
          v: target,
          duration: 0.9,
          delay: 0.3,
          ease: "power2.out",
          scrollTrigger: trigger,
          onStart: () => {
            price.textContent = "0,00";
          },
          onUpdate: () => {
            price.textContent = obj.v.toFixed(2).replace(".", ",");
          },
        });
      }

      /* Cascata do checklist — as linhas pingam uma a uma dentro da própria
         zona; valores mínimos de propósito: é cadência, não segunda entrada. */
      gsap.set("[data-includes] li", { opacity: 0, y: 8 });
      gsap.to("[data-includes] li", {
        opacity: 1,
        y: 0,
        duration: 0.55,
        delay: 0.5,
        ease: "power3.out",
        stagger: 0.06,
        scrollTrigger: trigger,
      });
    },
    { scope: root },
  );

  /* toggle Anual/Mensal — dois skins do mesmo controle: claro (vidro desktop)
     e escuro (vidro mobile). Ativo em bg-brand (o roxo de CTA do DS, Figma
     17-38). aria-pressed carrega o estado pra leitores de tela; clicar o
     ativo é no-op (switchPeriod guarda). */
  const toggle = (dark: boolean) => (
    <div
      className={`inline-flex rounded-full p-1.5 ${
        dark
          ? "bg-white/10 ring-1 ring-inset ring-white/15"
          : "bg-white/45 ring-1 ring-inset ring-white/55"
      }`}
    >
      {(Object.keys(PRICES) as Period[]).map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={period === p}
          onClick={() => switchPeriod(p)}
          className={`rounded-full px-6 py-2 font-body text-[16px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            period === p
              ? "bg-brand text-white"
              : dark
                ? "text-white/65 hover:text-white"
                : "text-neutro-800 hover:text-azul-700"
          }`}
        >
          {p === "anual" ? "Anual" : "Mensal"}
        </button>
      ))}
    </div>
  );

  /* CTA — DARK: pill branca com círculo escuro pra seta. Card mobile. */
  const ctaDark = (
    <a
      href="#"
      className={`group/cta inline-flex shrink-0 items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 transition-[transform,box-shadow] duration-200 ${HAPTIC} hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`}
    >
      <span className="whitespace-nowrap font-body text-[15px] font-medium text-ink">
        Começar de graça
      </span>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-200 ${HAPTIC} group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5`}
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
         livre pro campo sangrar pra cima e fundir com a descida lavanda. */
      /* lg:pt-[22vh] — A DESCIDA SUBMERSA (ver Mergulho.tsx): o scroll entre a
         linha d'água e o pouso do phone. Não é respiro, é o espaço em que a
         câmera desvira e a água dissolve. */
      /* lg:pb-36 — o pb só precisa CONTER o SVG (o tab trapezoidal, onde o
         phone mergulha): medido, a base do tab cai 120px abaixo do rodapé dos
         cards, então 144px fecham a section ~24px depois dela. Era pb-72
         (288px) e sobrava um vão de creme de ~168px ABAIXO do SVG — a Pronit
         pediu o fundo "até o svg no máximo" pra matar essa transição vazia
         gigante. O respiro/costura com a próxima seção agora é do topo da
         Testimonials (fade creme→verde de h-52), não deste creme morto. */
      /* -mt-px: fresta de subpixel da boundary Mergulho→Pricing (alturas em vh
         → px fracionário). Invisível porque as duas encostam no #C0B0D7. */
      /* pt-0 no mobile (2026-07-20): o campo-hero começa NA aresta da section
         — o Mergulho mobile morre no índigo chapado (#151948, DIVE_STOPS) e é
         o céu do campo que emenda nele (ver o slab navy no bloco mobile). Um
         pt aqui reabria a fresta de lavanda entre os dois navies. */
      className="relative -mt-px overflow-x-clip pb-20 md:pb-24 lg:pt-[22vh] lg:pb-36"
      /* FUNDO = a descida lavanda→creme, curva-S de ~480px (stops por
         smoothstep, slope→0 nas pontas pra não criar banda de Mach na chegada
         do creme). O campo NÃO mora aqui: é camada própria (ver [data-campo]).
         Abaixo da aresta do campo, este creme é o "branco" do novo layout. */
      style={{
        background:
          "linear-gradient(180deg,#C0B0D7 0px,#C3B4D9 67px,#CBBEDD 134px,#D6CBE2 202px,#E4DDEA 274px,#EFEBEF 341px,#F6F5F3 408px,#FAF9F5 480px)",
      }}
    >
      {/* ══ DESKTOP (lg+) ═══════════════════════════════════════════════════
          Palco mais largo que o max-w-6xl do header (o mockup usa ~86% do
          viewport pros dois cards): max-w-[1280px] px-10. O campo e o tab são
          absolutos deste container; o grid dos cards é o único filho em fluxo,
          então "100%" nas âncoras verticais = rodapé dos cards. */}
      <div className="relative z-10 mx-auto mt-12 hidden w-full max-w-[1280px] px-6 md:px-10 lg:mt-[18vh] lg:block">
        {/* CAMPO FLORIDO — full-bleed (left-1/2 -ml-[50vw] w-screen), aresta de
            baixo RETA a 64px abaixo do rodapé dos cards (-bottom-16): é a linha
            campo→creme do mockup, sem melt. Cantos de BAIXO em rounded-b-card
            (40px, 2026-07-20): o mockup trata o campo como bloco arredondado,
            então a aresta curva pro creme nas duas pontas — só embaixo, porque
            o topo derrete na descida lavanda via mask (16% de fade) e um raio
            lá recortaria o fade ainda semi-visível. O aspect nativo (775/624)
            sobe a partir da aresta pra mostrar grama + o "A" + céu. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-1/2 z-0 -ml-[50vw] w-screen"
        >
          {/* Era um <div> com bg da webp; a intenção é VÍDEO — a mesma imagem em
              motion. Enquanto pricing-campo-motion.mp4 não existir, isto é uma
              <img> e NÃO um <video> com só o poster: o <video> pedia o mp4
              ausente em todo carregamento (404 no console, que derruba
              best-practices) e o `poster` não aceita lazy — os 410KB da webp
              entravam no boot disputando banda com o LCP, para pintar uma seção
              que só é vista depois de ~10 telas de scroll. Quando o mp4 chegar,
              volta o <video> com poster={CAMPO_STILL} e preload="none".
              Visualmente idêntico: o poster JÁ era esta webp. */}
          {/* <picture> e não <img> por DUAS razões, e a segunda é a que pesa.
              (1) 2400×1934 num celular é 18,6 MB de bitmap DECODIFICADO pra
              pintar uma caixa de 430×541 — o arquivo tem 412 KB, mas o que o
              iOS guarda é largura×altura×4, e é isso que mata a aba. A -1400
              cobre 2× o box no maior iPhone (58svh de 956 = 554 CSS, e
              554×1,241 = 688 → 1376) e é indistinguível na tela.
              (2) Esta montagem e a do bloco mobile (lg:hidden) coexistem no
              DOM — a escondida BAIXA do mesmo jeito. Com as duas resolvendo
              pela MESMA media query, os dois <img> pedem a mesma URL no mesmo
              viewport: o segundo vira cache hit e o download duplo some.
              Se mexer no breakpoint aqui, mexa no de lá no mesmo commit. */}
          <picture className="contents">
            <source media="(min-width: 1024px)" srcSet="/pricing-campo-bg.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-campo
              aria-hidden
              alt=""
              loading="lazy"
              decoding="async"
              src="/pricing-campo-bg-1400.webp"
              className="aspect-[775/624] w-full rounded-b-card object-cover object-center [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_16%)] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_16%)]"
            />
          </picture>
        </div>

        {/* TAB do phone ([data-phone-clip]) — o funil que o phone atravessa.
            O grosso continua ENFIADO atrás do card do trial (top: 100% −
            60/88px, card z-[2] > tab z-[1]); a base desce 48/56px além da
            aresta campo→creme (que fica a card bottom + 64 = o -bottom-16 do
            campo) — é essa sobra que faz o phone SAIR do frame, e o
            ScrollPhone corta em r.bottom, então a linha de corte anda junto.
            Dois filhos e não um porque o path é por breakpoint (ver
            TAB_PATH_*). Horizontal: o centro segue o centro do phone — aresta
            direita do card do trial (404/496 do container) + right do slot
            (20/20) + meia largura do slot (140/196) = centro a 564/712;
            right = centro − w/2 → 384/462. */}
        <div
          data-phone-clip
          aria-hidden
          className="absolute right-[384px] top-[calc(100%-60px)] z-[1] h-[172px] w-[360px] xl:right-[462px] xl:top-[calc(100%-88px)] xl:h-[208px] xl:w-[500px]"
        >
          <div
            aria-hidden
            className="absolute inset-0 xl:hidden"
            style={{ background: TAB_FILL, clipPath: TAB_PATH_LG }}
          />
          <div
            aria-hidden
            className="absolute inset-0 hidden xl:block"
            style={{ background: TAB_FILL, clipPath: TAB_PATH_XL }}
          />
        </div>

        {/* grade dos DOIS CARDS DE VIDRO — a proporção ~62/38 (o espelho da
            ~38/62 do mockup, invertida em 2026-07-19). Alturas iguais por
            stretch (default); quem dita é o card do preço. */}
        <div className="relative z-[2] grid grid-cols-[1fr_minmax(0,340px)] gap-6 xl:grid-cols-[1fr_minmax(0,420px)] xl:gap-9">
          {/* CARD DO TRIAL — headline serifada + subtítulo + CTA à esquerda;
              a metade direita é o pouso do phone. CTA no idioma da casa (pill
              ink com círculo branco pra seta — o mesmo desenho do ctaLight que
              este card sempre teve), não o botão chapado do mockup. relative
              porque o slot é absoluto DELE (é o que deixa o phone descer além
              do rodapé sem esticar o card). */}
          <div
            data-glass
            className={`relative ${GLASS_DESKTOP} p-10 xl:p-14`}
          >
            <div aria-hidden className={CARD_SHEEN} />
            <span
              aria-hidden
              className="gaia-card-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            />
            {/* max-w curto de propósito: a metade direita do card é do phone —
                o texto não pode correr por baixo dele (medido: a coluna útil
                até a borda do slot dá ~200px em lg, ~280px em xl). */}
            <div className="relative z-[1] flex max-w-[190px] flex-col items-start gap-6 xl:max-w-[270px] xl:gap-8">
              <h3
                data-zone
                className="font-title text-[2.25rem] font-medium leading-[1.12] text-neutro-800 xl:text-[2.75rem]"
              >
                Teste grátis
                <br />
                por 2 meses
              </h3>
              <p data-zone className="font-body text-[1.0625rem] leading-[1.55] text-azul-700 xl:text-[1.125rem]">
                Experimente todos os recursos da Gaia sem compromisso.
              </p>
              <div data-zone>
                <a
                  href="#"
                  className={`group/cta inline-flex shrink-0 items-center gap-3 rounded-full bg-ink py-2 pl-7 pr-2 transition-[transform,box-shadow] duration-200 ${HAPTIC} hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutro-50`}
                >
                  <span className="whitespace-nowrap font-body text-[15px] font-medium text-white">
                    Começar de graça
                  </span>
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-200 ${HAPTIC} group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5`}
                  >
                    <IconArrowUpRight className="h-4 w-4" />
                  </span>
                </a>
              </div>
            </div>

            {/* VÃO — âncora de pouso do ScrollPhone. O tamanho DESTE slot é a
                fonte única da escala do phone (endG = rect.height/PHONE_FILL/900,
                ver ScrollPhone.tsx), razão 0,5625 mantida nos dois breakpoints.
                Absoluto: desce ~170/260px além do rodapé do card — é essa sobra
                que o tab corta, dando o "phone mergulhando no tab". */}
            {/* top mais alto que o "90px abaixo do topo do card" do mockup de
                propósito: o pivot do glb pousa o aparelho ~0.12·h ABAIXO do
                centro do slot (PHONE_PIVOT_BIAS, ver ScrollPhone) — o slot sobe
                esses ~50/75px pra o topo VISUAL do phone cair onde o mockup
                pede. */}
            {/* +12% em 2026-07-20 ("o phone deve ser um pouco maior"):
                250×444→280×498, 350×622→392×697 — razão 0,5625 preservada.
                right-5 nos dois breakpoints ("phone um pouco mais para a
                direita", 2ª volta do mesmo dia): além do gosto, os 42px que o
                slot cresceu pra esquerda no xl comiam a folga da coluna de
                texto (max-w-270 + p-14 termina em 326 do card) — em right-5 a
                lateral visual do phone volta a ~34px disso. O right/384 e
                xl:right/462 do tab já somam a meia largura NOVA do slot
                (140/196); mexeu aqui, recentra lá. */}
            <div
              data-phone-end
              aria-hidden
              className="pointer-events-none absolute right-5 top-10 z-20 h-[498px] w-[280px] xl:right-5 xl:top-[25px] xl:h-[697px] xl:w-[392px]"
            />
          </div>

          {/* CARD DO PREÇO — toggle, lockup, total do período, checklist. Sem
              CTA de propósito: o botão único da seção vive no card do trial ao
              lado. Paleta do card antigo: número neutro-800 em Sentient,
              secundários azul-700 (o tom frio que crava 4.5:1+ sobre este
              vidro — medido na versão anterior; neutro-500/600 é o trecho
              oliva da rampa e suja sobre o lavanda). */}
          <div
            data-glass
            className={`relative ${GLASS_DESKTOP} p-9 xl:p-11`}
          >
            <div aria-hidden className={CARD_SHEEN} />
            <span
              aria-hidden
              className="gaia-card-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            />
            <div className="relative z-[1] flex flex-col gap-7">
              <div data-zone>{toggle(false)}</div>

              <div data-zone>
                <div className="flex items-baseline gap-1">
                  <span className="font-title text-[1.25rem] text-azul-700 xl:text-[1.75rem]">
                    R$
                  </span>
                  {/* data-price: alvo do count-up (ver useGSAP). tabular-nums
                      pra os dígitos não dançarem de largura enquanto contam. */}
                  <span
                    data-price
                    className="font-title text-[3.5rem] font-semibold leading-none tracking-[-0.03em] text-neutro-800 tabular-nums xl:text-[5rem]"
                  >
                    {PRICES[period].monthly}
                  </span>
                  <span className="font-body text-[1rem] text-azul-700 xl:text-[1.25rem]">
                    /mês
                  </span>
                </div>
                <p className="mt-3 font-body text-[1rem] text-azul-700 xl:text-[1.125rem]">
                  {PRICES[period].note}
                </p>
              </div>

              {/* /50 é o piso onde a régua se vê sobre o vidro lavanda sem
                  virar linha pesada (opacidade menor some — já medido). */}
              <div
                aria-hidden
                className="h-px bg-gradient-to-r from-transparent via-neutro-800/50 to-transparent"
              />

              {/* checklist — single column como no mockup; checks soltos na
                  cor da marca, sem pill (moldura devolveria a briga de
                  hierarquia que o card já resolveu). */}
              <ul data-zone data-includes className="flex flex-col gap-4">
                {INCLUDES.map((item) => (
                  <li key={item} className="flex items-center gap-3.5">
                    <IconCheck
                      className="h-[18px] w-[18px] shrink-0 text-brand"
                      strokeWidth={2.5}
                    />
                    <span className="font-body text-[16px] text-neutro-800 xl:text-[17px]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MOBILE (<lg) ══════════════════════════════════════════════════
          O campo como HERO retrato (ver o bloco de comentário no topo): a
          imagem NÃO é full-bleed cortado — o recorte h-[58svh] (era 70svh,
          2026-07-21: medido @430×932 o hero ia de 12812 a 13464 e a Pronit
          pediu a seção mais baixa — 58svh fecha em ~13353, ~111px a menos)
          mostra o contexto inteiro (céu estrelado, o "A", as duas colinas,
          as flores) e o pé da grama fecha na banda escura via degradê. */}
      <div className="relative z-10 lg:hidden">
        <div className="relative mx-auto w-full max-w-3xl">
          {/* slab navy ATRÁS do fade do topo da imagem: é ele que o mask revela
              — o MESMO índigo em que o Mergulho mobile morre (DIVE_STOPS), então
              a costura Mergulho→campo é navy→navy, sem faixa de lavanda. O img
              é `relative` pra pintar por cima do slab. */}
          {/* -top-[2px]: alturas em vh acima dão px fracionário e a 1ª linha do
              gradiente lavanda da section vazava na fresta (medido: 1 row
              #3c406f = lavanda⊕navy). O slab sobe 2px sobre o Mergulho — mesmo
              navy, invisível. */}
          <div aria-hidden className="absolute inset-x-0 -top-[2px] h-[45%] bg-[#151948]" />
          {/* Mesma media query do bloco desktop, de propósito — ver o comentário
              do <picture> de lá. O md: alarga a caixa mas o cover é por ALTURA,
              então a fonte necessária não cresce com a largura: 1400 cobre 2×
              até o maior iPhone. */}
          <picture className="contents">
            <source media="(min-width: 1024px)" srcSet="/pricing-campo-bg.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              src="/pricing-campo-bg-1400.webp"
              alt=""
              aria-hidden
              decoding="async"
              /* h-[58svh] (era 70svh, 2026-07-21 — a Pronit pediu a seção mais
                 baixa e o phone pousando SOBRE a grama, não numa faixa preta
                 abaixo dela): a altura fixa o recorte e a largura da tela
                 decide o quanto sobra dos lados — no phone vira o retrato do
                 mock (~0.64), no md alarga sozinho. O cover por altura nunca
                 corta o eixo vertical, então o contexto topo→pé está sempre
                 inteiro nos dois valores — só encolhe junto. Mask no topo
                 (12%) = o mesmo derretimento na lavanda do desktop. */
              className="relative h-[58svh] w-full object-cover object-center [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_12%)] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_12%)]"
            />
          </picture>
          {/* costura imagem→banda: força os últimos px a fecharem EXATO no ink
              da banda — a grama já é quase preta, o degradê é invisível. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent via-[rgba(5,7,14,0.55)] to-[#05070E]"
          />
        </div>

        {/* BANDA ESCURA — o "bg mais escuro" que o mock marca em marrom:
            continua a grama do campo, segura o pouso do phone e o card, e
            fecha em rounded-b-card sobre o creme da section. */}
        <div className="relative mx-auto -mt-px w-full max-w-3xl rounded-b-card bg-[#05070E] px-6 pt-[188px] pb-14 md:px-10">
          {/* O PHONE SAIU DO FLUXO (2026-07-21) — armadilha de margin collapse.
              Vale igual pro aparelho em DOM que ocupou o lugar em 2026-07-31:
              o que não pode voltar pro fluxo é a CAIXA, seja ela âncora vazia
              ou aparelho de verdade.

              Tentativa anterior subia o pouso do phone pro campo com um
              `-mt-[210px]` num filho EM FLUXO desta banda. Não funcionou: a
              banda (`bg-[#05070E]`) não tinha padding-top nem border-top, e
              margin-top NEGATIVO do primeiro filho em fluxo COLAPSA através
              do pai sem essas duas barreiras — arrasta o TOPO DA BANDA
              junto com o phone, não só o phone. Confirmado no render
              (@430×932): o preto #05070E passou a começar em doc y≈13142 em
              vez de 13352, cortando os últimos 210px da imagem do campo com
              uma ARESTA DURA no meio da grama viva — o degradê `h-44` da
              costura morreu, e o phone continuava pousando no breu, porque a
              própria banda tinha engolido a grama que ele deveria sobrepor.

              Fix: tirar a âncora do fluxo. `absolute` não participa de
              margin collapse — a posição dela não pode mais empurrar o pai.
              A banda recupera o padding-top (`pt-[188px]` acima, era 236 —
              2026-07-21, a Pronit pediu o card mais alto) pra RESERVAR o
              espaço do pouso — padding não colapsa, ao contrário de margin.

              GEOMETRIA ALVO (doc, @430×932 — confira com
              getBoundingClientRect, não com esta conta):
                imagem do campo: 12812 → 13352 (h-[58svh])
                topo da banda: de volta em 13352, degradê h-44 intacto
                âncora do phone: 13112 → 13612 (-top-[240px] a partir do
                  topo da banda — 240px dela sobrepõem a grama)
                topo do card: 13352 + 188 (pt) = 13540 — o clip
                  ([data-phone-clip] logo abaixo, intacto) corta ~142px da
                  base da âncora ali: é o mergulho no card que o antigo
                  -mb-16 tentava dar por margem, agora só geometria.
              h-[500px] w-[340px] inalterado — é a FONTE ÚNICA da escala do
              phone (endG = rect.height/PHONE_FILL/900, ver ScrollPhone) e já
              mediu bem no render. left-1/2 -translate-x-1/2 centraliza (era
              mx-auto, que só funciona em fluxo). */}
          {/* O POUSO VOLTOU A SER DOM (2026-07-31). O aparelho 3D não monta
              abaixo de lg (ver ScrollPhoneDeferred: three + glb + contexto
              WebGL por uma decoração), então aqui não pousa mais ninguém — e
              uma âncora vazia deixaria o card de preço encostando na grama, sem
              o objeto que a composição inteira desta banda existe pra receber.

              Quem ocupa o lugar é o MESMO <PhoneScreen> que rodava dentro do
              <Html transform> da cena: HTML puro, sem three, sem GPU. Variante
              "inicio" porque é a tela que o aparelho mostrava AO POUSAR aqui —
              ele troca de face no giro do Manifesto (ver showAlt no
              ScrollPhone). O que se perde no mobile é o giro e o mergulho; o
              enquadramento do pouso fica.

              A geometria é a mesma da âncora que saiu: -top-[240px], centrada,
              240px sobrepondo a grama.

              O CORTE NA ARESTA DO CARD CONTINUA SENDO OBRIGATÓRIO, e a primeira
              versão em DOM errou nisso. O raciocínio errado foi "o card é z-[70]
              e o aparelho não declara z, então o card cobre" — cobre, mas o card
              é VIDRO: `rgba(0,10,26,0.8)` com `blur(16px)`. Ablação (visibility
              hidden no aparelho, mesma rolagem, mesmo frame): os primeiros 120px
              do card subiam de luminância 8,45 para ~46 — +37,5 de média — com a
              tela branca do "Início" vazando borrada por dentro do vidro, e
              apagando de volta ao longo de ~23px. Sem degrau duro, mas com a
              superfície sob o painel ACESA justamente onde mora o toggle
              Anual/Mensal. A régua da casa é o contrário: cor sob vidro tem que
              ser funda.
              Então o aparelho é CORTADO na aresta, como o [data-phone-clip]
              fazia no 3D — só que aqui por altura de caixa em vez de recorte por
              frame. 428px é a medida, não a estimativa: card.top − phone.top
              (121 − (−307)) no render. +4px de sobra tuck pra o corte cair
              debaixo da borda do card e não rente a ela.

              Por isso o bisel arredonda SÓ EM CIMA (`rounded-t-`) e não tem
              padding embaixo: a base do aparelho não existe nesta composição —
              ela está dentro do card. Arredondar embaixo desenharia o fim do
              objeto 37px ANTES do card, e o aparelho passaria a flutuar em vez
              de mergulhar.

              A CONTA DA ESCALA — o PhoneScreen é um frame FIXO de 390×844 (W/H
              no módulo dele), então quem encolhe é um transform, não o CSS do
              filho. Alvo: 250px de tela ⇒ k = 250/390 = 0.6410. O raio acompanha
              o mesmo k: SCREEN_RADIUS 56 × 0.6410 = 36 na tela, +5 do bisel = 41
              na moldura. `origin-top-left` porque scale a partir do centro
              deixaria o topo do aparelho fora dos -240 combinados. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-[240px] left-1/2 h-[432px] w-[260px] -translate-x-1/2"
          >
            {/* Bisel — o glb trazia a carcaça junto com a tela; em DOM a tela
                sozinha seria um retângulo flutuando. Uma moldura escura de 5px
                com o raio do display + 5 é o mínimo que faz o objeto ler como
                aparelho. A sombra é a mesma família da do card de preço. */}
            <div className="h-full w-full overflow-hidden rounded-t-[41px] bg-[#0A0C11] px-[5px] pt-[5px] shadow-[0_40px_90px_-30px_rgba(0,10,26,0.7)] ring-1 ring-inset ring-white/10">
              <div className="h-full w-full overflow-hidden rounded-t-[36px]">
                <div className="origin-top-left scale-[0.6410]">
                  <PhoneScreen variant="inicio" />
                </div>
              </div>
            </div>
          </div>

          {/* O [data-phone-clip] mobile SAIU em 2026-07-31, junto com o
              aparelho 3D daqui. Ele existia por uma razão que deixou de valer:
              o overlay era `fixed` z-[60] e o card z-[70] NUNCA ganhava dele —
              "o phone termina atrás do card" só era possível recortando o
              desenho numa aresta lida do DOM (CLIP_GATE/clipPhone no
              ScrollPhone). O aparelho em DOM que ocupou o lugar está na mesma
              árvore que o card, então a mesma frase agora é só ordem de
              pintura. O do desktop (dentro de `hidden lg:block`) segue.
              O wrapper `relative` fica: é o ancestral posicionado do sheen e do
              inset shadow do card. */}
          <div className="relative">
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
                <div>
                  {toggle(true)}
                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="font-body text-h3 font-medium text-white/45">R$</span>
                    <span className="font-body text-[3.25rem] font-semibold leading-[0.9] tracking-[-0.02em] text-white tabular-nums">
                      {PRICES[period].monthly}
                    </span>
                    <span className="font-body text-body-l text-white/40">/mês</span>
                  </div>
                  <p className="mt-4 font-body text-small leading-[1.55] text-white/60">
                    {PRICES[period].note}
                  </p>
                </div>

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

                <div className="flex flex-col gap-5 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <p className="text-balance font-body text-small text-white/60">
                    Teste grátis por 2 meses. Cancele quando quiser.
                  </p>
                  {ctaDark}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

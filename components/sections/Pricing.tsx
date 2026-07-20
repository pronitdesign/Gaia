"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconCheck, IconArrowUpRight } from "@/components/ui/icons";
import PhoneScreen from "@/components/iphone3d/PhoneScreen";

gsap.registerPlugin(ScrollTrigger);

/* iPhone 15 Pro Max 3D (R3F) — client-only: usa WebGL, nunca renderiza no server */
const IPhone3D = dynamic(() => import("@/components/iphone3d/IPhone3D"), {
  ssr: false,
});

/* ── Pricing ────────────────────────────────────────────────────────────────
   Layout 2026-07-19 (mockup da Laura): o campo florido vira o HERO da seção —
   full-bleed, aresta de baixo RETA — e dois cards montam sobre a metade de
   baixo dele. O mockup trazia cards brancos e accent laranja; a Laura pediu o
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

   Mobile (<lg): comportamento antigo preservado — aparelho estático em fluxo,
   conteúdo empilhado num único card de vidro escuro abaixo (agora com o mesmo
   toggle/preço do desktop, via o mesmo estado React).

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
   (R$ 39,90/mês → 478,80/ano) é PLACEHOLDER de negócio até a Laura cravar o
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

/* TAB atrás do phone — trapézio do entalhe do Figma (topo 348 → base 247 numa
   altura de 36): ~14% de recuo por lado, slant na altura inteira. O topo dele
   fica ENTERRADO no campo (24px acima da aresta), preto sobre grama escura —
   é o que faz ele ler como emergindo do campo, não como colado por cima. */
const TAB_CLIP = "polygon(0 0, 100% 0, 86% 100%, 14% 100%)";
const TAB_FILL = "linear-gradient(180deg, #161616 0%, #000 100%)";

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

  // Campo em motion (ver [data-campo]): só dá autoplay se o usuário não pediu
  // menos movimento. Sob reduce fica no poster (o mesmo frame parado da webp).
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

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
      /* lg:pb-72 — o tab (e o phone clipado nele) agora morre na aresta do
         campo (+64px do rodapé dos cards); o pb segura essa descida e dá o
         creme de respiro antes do CTAFinal. */
      /* -mt-px: fresta de subpixel da boundary Mergulho→Pricing (alturas em vh
         → px fracionário). Invisível porque as duas encostam no #C0B0D7. */
      className="relative -mt-px overflow-x-clip py-20 md:py-24 lg:pt-[22vh] lg:pb-72"
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
            campo→creme do mockup, sem melt. O aspect nativo (775/624) sobe a
            partir daí pra mostrar grama + o "A" + céu; o topo derrete na
            descida lavanda via mask (16% de fade), como antes. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-1/2 z-0 -ml-[50vw] w-screen"
        >
          {/* Era um <div> com bg da webp; é VÍDEO — a mesma imagem em motion.
              poster = a webp, então enquanto pricing-campo-motion.mp4 não
              existir (ou sob reduce) o quadro parado idêntico aparece. */}
          <video
            data-campo
            aria-hidden
            poster="/pricing-campo-bg.webp"
            src="/pricing-campo-motion.mp4"
            autoPlay={!reduceMotion}
            loop
            muted
            playsInline
            preload="metadata"
            className="aspect-[775/624] w-full object-cover object-center [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_16%)] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_16%)]"
          />
        </div>

        {/* TAB do phone ([data-phone-clip]) — o trapézio preto que o phone
            atravessa. SUTIL de propósito (pedido 2026-07-20): o grosso do
            trapézio fica ENFIADO atrás do card do trial (top: 100% − 60/88px,
            card z-[2] > tab z-[1]) e a BASE cai EXATA na aresta campo→creme
            (card bottom + 64 = o -bottom-16 do campo) — as asas pretas só
            existem sobre a grama escura e morrem na linha, nunca pingam no
            creme. É essa base que o ScrollPhone usa como linha de corte
            (r.bottom), então o phone também mergulha mais cedo. Horizontal:
            aresta direita alinhada à aresta direita do card do TRIAL, que é o
            da ESQUERDA — o offset soma o px do container (40) + coluna do
            preço (340/420) + gap (24/36) = 404/496; com o slot em right-14 do
            card o centro do tab segue a ~1px do centro do phone no xl. */}
        <div
          data-phone-clip
          aria-hidden
          className="absolute right-[404px] top-[calc(100%-60px)] z-[1] h-[124px] w-[330px] xl:right-[496px] xl:top-[calc(100%-88px)] xl:h-[152px] xl:w-[460px]"
          style={{
            clipPath: TAB_CLIP,
            background: TAB_FILL,
          }}
        />

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
            <div
              data-phone-end
              aria-hidden
              className="pointer-events-none absolute right-8 top-10 z-20 h-[444px] w-[250px] xl:right-14 xl:top-[25px] xl:h-[622px] xl:w-[350px]"
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

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        {/* ══ MOBILE (<lg) ════════════════════════════════════════════════
            Comportamento preservado: aparelho estático em fluxo acima,
            conteúdo empilhado num único card de vidro escuro abaixo — agora
            com o mesmo toggle/preço do desktop (mesmo estado React). */}
        <div className="mt-12 lg:hidden">
          {/* Pouso mobile do ScrollPhone viajante: o aparelho estático saiu — é o
              MESMO phone que desceu do Features (ver [data-phone-start] mobile lá
              e o gate liberado no ScrollPhone). A âncora só reserva a caixa; o
              aparelho vive no overlay fixo. */}
          <div className="relative mx-auto -mb-24 h-[440px] w-[300px]">
            <div data-phone-end aria-hidden className="pointer-events-none absolute inset-0" />
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
    </section>
  );
}

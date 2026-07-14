"use client";

import { useRef, useState } from "react";
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
   Desktop: fundo claro, tipografia preta grande à esquerda, e o aparelho
   flutuando no canto direito sobre um campo de luz ambiente (auroras blur,
   sem forma/asset — só cor difusa). Duas zonas: eyebrow + h2 soltos sobre o
   fundo, e um card de vidro CLARO (frosted, bg-neutro-0/xx + backdrop-blur)
   envolvendo preço, toggle de migração, checklist e CTA. O canto direito é
   só camada visual: auroras (z-0) atrás do phone (z-20).

   Mobile (<lg): comportamento antigo preservado — aparelho estático em fluxo,
   conteúdo empilhado num único card de vidro escuro abaixo.

   STACKING: o ScrollPhone é um overlay `fixed z-[60]` na raiz que lê o rect
   vivo de [data-phone-end] a cada frame. Nada no desktop passa de z-20, então
   tudo na section fica atrás do phone naturalmente — é assim que ele lê como
   flutuando sobre o campo de luz. Não recriar o hack de z-70: não existe
   mais vidro no desktop pra disputar essa camada. */

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

/* grão fino (film grain) — textura física, aplicado como overlay estático */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* vidro fumê — versão MOBILE: card alto e estreito, single column. Um
   gradiente diagonal correria quase na vertical nessa proporção e a região
   mais rala cairia embaixo do checklist/CTA, matando o contraste do texto
   branco. Por isso aqui é tint uniforme e denso — sem gradiente. */
const GLASS_MOBILE =
  "bg-[rgba(0,10,26,0.80)] backdrop-blur-[16px] backdrop-saturate-[1.6]";

export default function Pricing() {
  const root = useRef<HTMLElement>(null);
  /* toggle real: ligado = migrando de outro sistema → 2 meses por conta da casa */
  const [migrando, setMigrando] = useState(true);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gsap.set("[data-reveal], [data-glass]", { opacity: 1, y: 0, filter: "none" });
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
    },
    { scope: root },
  );

  /* painel de migração — versão ESCURA/frosted, usada só no card mobile
     (que continua vivendo sobre o vidro escuro, como sempre viveu). */
  const PainelMigracao = (
    <div className="relative flex flex-col justify-center gap-8 overflow-hidden rounded-[1.75rem] border border-white/[0.18] bg-white/[0.14] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-md">
      <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <p className="font-title text-body-l font-medium leading-[1.25] text-white">
          Vem de outro sistema?
        </p>
        <p className="mt-2.5 font-body text-small leading-[1.6] text-white/65">
          A gente migra seus pacientes e seu histórico. Você confere e segue
          atendendo.
        </p>
      </div>

      <div className="relative flex items-center justify-between gap-4">
        <span className="font-body text-body font-medium tabular-nums text-white">
          2 meses grátis
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={migrando}
          aria-label="Estou migrando de outro sistema"
          onClick={() => setMigrando((v) => !v)}
          className={`relative h-8 w-[3.75rem] shrink-0 rounded-full border transition-colors duration-500 ${HAPTIC} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
            migrando
              ? "border-white/20 bg-gradient-to-r from-brand to-roxo-500 shadow-[0_4px_16px_-4px_rgba(138,105,216,0.7)]"
              : "border-white/15 bg-white/10"
          }`}
        >
          <span
            className={`absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_6px_-1px_rgba(0,10,26,0.5)] transition-transform duration-500 ${HAPTIC} ${
              migrando ? "translate-x-7" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );

  /* preço — versão MOBILE (grande, como sempre foi no card empilhado) */
  const Preco = (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
        Plano único
      </span>

      <div className="mt-5 flex items-start gap-1.5">
        <span className="mt-2 font-title text-h3 font-medium text-white/45">R$</span>
        <span className="font-title text-[4rem] font-semibold leading-[0.85] tracking-[-0.02em] text-white tabular-nums">
          {migrando ? "0" : "49,90"}
        </span>
        <span className="self-end pb-2 font-body text-body-l text-white/40">/mês</span>
      </div>

      <p className="mt-4 font-body text-small leading-[1.55] text-white/60">
        {migrando ? (
          <>
            Nos 2 primeiros meses.{" "}
            <span className="text-white/40">Depois R$ 49,90/mês.</span>
          </>
        ) : (
          <>
            Tudo incluído.{" "}
            <span className="text-white/40">Sem add-on, sem letra miúda.</span>
          </>
        )}
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
        {migrando ? "Migrar e ganhar 2 meses" : "Começar agora"}
      </span>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-500 ${HAPTIC} group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5`}
      >
        <IconArrowUpRight className="h-4 w-4" />
      </span>
    </a>
  );

  /* CTA — LIGHT: pill escura (agora vive sobre o fundo neutro-50, não mais
     sobre vidro) com círculo interno invertido (branco) pra seta. */
  const ctaLight = (
    <a
      href="#"
      className={`group/cta inline-flex w-fit shrink-0 items-center gap-3 rounded-full bg-ink py-2 pl-6 pr-2 transition-all duration-500 ${HAPTIC} hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutro-50`}
    >
      <span className="whitespace-nowrap font-body text-[15px] font-medium text-white">
        {migrando ? "Migrar e ganhar 2 meses" : "Começar agora"}
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
      /* overflow-x-clip (não -hidden): clipa as auroras laterais no eixo X — sem
         scroll horizontal — mas deixa o Y livre pra aurora do topo sangrar pra
         cima e fundir com o fim branco do Manifesto. -hidden cortava esse brilho
         numa linha reta na borda: era o "corte" visível entre as seções. */
      className="relative overflow-x-clip bg-neutro-50 py-28 md:py-36"
    >
      {/* AMBIENTE — luz de aurora escorrendo atrás da seção (profundidade) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-6rem] h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-roxo-200/35 blur-[130px]" />
        <div className="absolute -left-40 bottom-[-4rem] h-[440px] w-[560px] rounded-full bg-[#DFE9F1]/60 blur-[120px]" />
      </div>
      {/* film grain — overlay estático, mistura suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.045] mix-blend-soft-light"
        style={{ backgroundImage: NOISE, backgroundSize: "140px" }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        {/* framing editorial — eyebrow + título grande à esquerda */}
        <div data-reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-neutro-0/70 px-3.5 py-1.5 font-body text-[11px] font-semibold uppercase tracking-[0.22em] text-neutro-500 shadow-soft backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Preço
          </span>
          {/* max-w em ch VAI NO h2, não no pai: ch resolve na font-size do próprio
              elemento — no pai (16px) daria ~120px e quebrava o título em 4 linhas */}
          <h2 className="mt-6 max-w-[13ch] text-balance font-title text-h2 font-medium leading-[1.02] text-neutro-800 md:text-[4rem] lg:max-w-[11ch] lg:text-[5rem] lg:leading-[0.94] lg:tracking-[-0.032em] xl:text-[6rem]">
            Sem surpresa no{" "}
            <span className="italic text-neutro-600">fim do mês.</span>
          </h2>
        </div>

        {/* ══ DESKTOP (lg+) ═══════════════════════════════════════════════
            Palco sem transform/filter (o ScrollPhone precisa medir/pousar no
            slot sem stacking context estranho no caminho). Duas zonas: coluna
            esquerda ~52% com todo o conteúdo em fluxo normal — preço, toggle,
            checklist, CTA — e canto direito com as auroras ambiente (z-0) e o
            slot do phone (z-20) absolutos, sangrando pra fora do palco.

            mr-[-5rem]: sangra pra direita, alinhado à esquerda com o título e
            aberto pro lado oposto — a assimetria é o gesto editorial da
            referência. O slot (top-[2rem], absolute) pousa sempre na mesma
            posição em relação ao TOPO do palco, então min-h não precisa
            cobrir os 820px inteiros do slot pra ele "caber" — o phone só
            transborda visualmente pro padding-bottom da section, sem clip
            (overflow-x-clip só corta X). min-h aqui é calibrado pra fechar
            o vão entre o fim do phone (visual) e a próxima section: menor
            que isso e o phone esbarra no bloco seguinte, maior e sobra
            buraco morto abaixo do CTA/footnote da coluna esquerda. */}
        <div className="hidden relative mt-12 mr-[-5rem] min-h-[720px] lg:block">
          {/* campo de luz ambiente atrás do phone — sem asset, a cor vem só de
              auroras blur difusas (mesmo princípio das duas do topo/esquerda da
              section). Duas camadas puxando pra roxo e azul, deslocadas pra
              evitar ler como uma bolha única. Atrás do slot (z-0 < z-20). */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 top-0 z-0 h-[680px] w-[680px] rounded-full bg-roxo-300/60 blur-[140px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-[24rem] z-0 h-[560px] w-[560px] rounded-full bg-azul-200/60 blur-[120px]"
          />
          {/* terceira aurora, mais contida — passa por trás do card de vidro
              da coluna esquerda pra alimentar o backdrop-blur dele. Sem ela
              o card lê "chapado", já que as duas de cima ficam concentradas
              do lado do phone. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-10 z-0 h-[600px] w-[600px] rounded-full bg-roxo-300/40 blur-[130px]"
          />

          {/* slot/âncora de pouso do ScrollPhone — 461×820 (razão ~0.5625,
              igual ao canvas 506×900 do ScrollPhone). Maior e mais tortinho
              que a composição anterior: o phone tem que ler como flutuando
              por cima do asset. Este div não renderiza nada: só existe pro
              ScrollPhone ler seu rect ao vivo. */}
          <div
            data-phone-end
            aria-hidden
            className="pointer-events-none absolute right-[1rem] top-[2rem] z-20 h-[820px] w-[461px]"
          />

          {/* coluna esquerda — ~56% do palco. O card de vidro claro pega
              padding, então alarga um pouco em relação aos ~52% de fluxo
              livre de antes. */}
          <div className="relative z-10 w-[56%]">
            {/* card de vidro CLARO — frosted sobre o fundo neutro-50 (não o
                fumê escuro que existia antes: bg claro translúcido +
                backdrop-blur, borda branca, inset highlight na quina de
                cima. Sem filter (ver comentário no useGSAP acima) — só assim
                o backdrop-blur tem chance de borrar as auroras atrás dele. */}
            <div
              data-glass
              className="relative overflow-hidden rounded-card border border-white/60 bg-neutro-0/50 p-10 shadow-glass backdrop-blur-xl backdrop-saturate-150"
            >
              <div className="relative z-[1] flex flex-col gap-8">
                {/* preço como tipografia — segundo maior elemento da peça */}
                <div data-reveal>
                  <div className="flex items-baseline gap-1">
                    <span className="font-title text-h3 text-neutro-400">R$</span>
                    <span
                      className={`-ml-2 font-title font-semibold leading-[0.78] tracking-[-0.04em] text-ink tabular-nums ${
                        migrando ? "text-[11rem]" : "text-[7rem]"
                      }`}
                    >
                      {migrando ? "0" : "49,90"}
                    </span>
                    <span className="font-body text-body-l text-neutro-400">/mês</span>
                  </div>
                  <p className="mt-4 max-w-[30ch] text-pretty font-body text-small leading-[1.55] text-neutro-500">
                    {migrando ? (
                      <>
                        Nos 2 primeiros meses. Depois{" "}
                        <span className="whitespace-nowrap">R$ 49,90/mês.</span>
                      </>
                    ) : (
                      <>Tudo incluído. Sem add-on, sem letra miúda.</>
                    )}
                  </p>
                </div>

                {/* toggle tipográfico — linha, sem borda/bg/blur em volta */}
                <div data-reveal className="border-t border-white/50 pt-6">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="font-title text-body-l text-neutro-800">
                        Vem de outro sistema?
                      </p>
                      <p className="mt-1.5 font-body text-small leading-[1.6] text-neutro-500">
                        A gente migra seus pacientes e seu histórico. Você
                        confere e segue atendendo.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={migrando}
                      aria-label="Estou migrando de outro sistema"
                      onClick={() => setMigrando((v) => !v)}
                      className={`relative h-8 w-[3.75rem] shrink-0 rounded-full border transition-colors duration-500 ${HAPTIC} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutro-50 ${
                        migrando
                          ? "border-transparent bg-gradient-to-r from-brand to-roxo-500 shadow-[0_4px_16px_-4px_rgba(138,105,216,0.5)]"
                          : "border-neutro-200 bg-neutro-100"
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_6px_-1px_rgba(15,23,42,0.25)] transition-transform duration-500 ${HAPTIC} ${
                          migrando ? "translate-x-7" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* checklist — linha editorial, não cards */}
                <div data-reveal className="border-t border-white/50 pt-6">
                  <ul className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                    {INCLUDES.map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <IconCheck
                          className="h-3.5 w-3.5 shrink-0 text-brand"
                          strokeWidth={2.5}
                        />
                        <span className="font-body text-[13px] text-neutro-500">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA — sobre o vidro claro, pill escura */}
                <div data-reveal className="flex flex-col gap-4">
                  {ctaLight}
                  <p className="font-body text-small text-neutro-400">
                    Sem fidelidade. Cancele quando quiser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
              {PainelMigracao}
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

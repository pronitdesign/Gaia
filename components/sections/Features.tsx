"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@/lib/useGSAP";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconSparkles, IconSend } from "@/components/ui/icons";

gsap.registerPlugin(ScrollTrigger);

/* ── Features ──────────────────────────────────────────────────────────────
   Bento assimétrico (ref. Paraform) sobre fundo neutro escuro — clean, sem
   brilhos roxos. Cada card: superfície escura sóbria com hairline fina.
   As áreas de mídia são full-bleed (a imagem final ocupa o fundo do card).
   Enquanto não há foto, os mocks de UT abaixo servem de referência.
   Copy-âncora: "Tudo que a anamnese sempre precisou ser."               */

// chrome comum dos cards — superfície navy levemente acima do fundo #13161F
const CARD =
  "group relative flex flex-col overflow-hidden rounded-[22px] border border-white/[0.07] " +
  "bg-[#1A1E29] transition-[border-color,transform] duration-500 ease-gaia " +
  "hover:-translate-y-0.5 hover:border-white/[0.16]";

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-title text-[1.5rem] font-medium leading-[1.15] text-neutro-0">
      {children}
    </h3>
  );
}

function CardBody({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 max-w-md font-body text-body text-white/45">{children}</p>
  );
}

/* ── Mock A · conversa da anamnese (card hero, fundo claro) ─────────────── */
function MockConversa() {
  const Bubble = ({
    side,
    children,
  }: {
    side: "in" | "out";
    children: ReactNode;
  }) =>
    side === "in" ? (
      <div className="max-w-[78%] self-start rounded-[16px] rounded-tl-[4px] bg-neutro-0 px-3.5 py-2.5 font-body text-[13px] leading-snug text-neutro-800 shadow-[0_2px_10px_-4px_rgba(58,72,94,0.18)]">
        {children}
      </div>
    ) : (
      <div className="max-w-[78%] self-end rounded-[16px] rounded-br-[4px] bg-brand px-3.5 py-2.5 font-body text-[13px] leading-snug text-white shadow-[0_4px_14px_-4px_rgba(138,105,216,0.5)]">
        {children}
      </div>
    );

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-azul-50 via-neutro-100 to-azul-100">
      {/* chip flutuante — IA adaptando a pergunta */}
      <div className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-neutro-0/90 px-3 py-1.5 font-body text-[12px] font-medium text-neutro-700 shadow-soft backdrop-blur">
        <IconSparkles className="h-3.5 w-3.5 text-brand" />
        Pergunta adaptada
      </div>

      {/* “device” com a conversa */}
      <div className="absolute inset-x-0 bottom-0 top-16 mx-auto flex w-full max-w-[300px] flex-col rounded-t-[26px] border border-white/70 border-b-0 bg-neutro-0/70 p-4 shadow-[0_-2px_40px_-12px_rgba(58,72,94,0.25)] backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2 border-b border-neutro-200/70 pb-3">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand">
            G
          </span>
          <span className="font-body text-[12px] font-medium text-neutro-700">
            Anamnese · Marina
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          <Bubble side="in">Como foi sua alimentação ontem?</Bubble>
          <Bubble side="out">Café reforçado, almoço leve, jantei tarde.</Bubble>
          <Bubble side="in">Você costuma beliscar entre as refeições?</Bubble>
        </div>
      </div>
    </div>
  );
}

/* ── Mock B · resumo clínico estruturado (card claro dentro do card escuro) ─ */
function MockResumo() {
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="font-body text-[13px] text-neutro-500">{label}</span>
      <span className="text-right font-body text-[13px] font-medium text-neutro-800">
        {value}
      </span>
    </div>
  );

  return (
    <div className="rounded-[18px] bg-neutro-0 p-4 shadow-[0_12px_40px_-16px_rgba(58,72,94,0.4)]">
      <div className="flex items-center gap-3 border-b border-neutro-200/70 pb-3">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand/15 font-title text-[15px] font-semibold text-brand">
          MA
        </span>
        <div className="min-w-0">
          <p className="truncate font-title text-[15px] font-medium text-neutro-800">
            Marina Alves
          </p>
          <p className="font-body text-[12px] text-neutro-500">
            Anamnese concluída · hoje
          </p>
        </div>
        <span className="ml-auto rounded-full bg-sage-100 px-2.5 py-1 font-body text-[11px] font-medium text-sage-700">
          Pronta
        </span>
      </div>
      <div className="divide-y divide-neutro-200/60">
        <Row label="Queixa principal" value="Cansaço e ganho de peso" />
        <Row label="Restrições" value="Intolerância à lactose" />
        <Row label="Rotina" value="Sono irregular · sedentária" />
      </div>
      <button className="mt-3 w-full rounded-[12px] bg-brand py-2.5 font-body text-[13px] font-semibold text-white transition-colors hover:bg-brand-600">
        Abrir na consulta
      </button>
    </div>
  );
}

/* ── Mock C · busca entre pacientes ────────────────────────────────────── */
function MockBusca() {
  const people = ["Marina Alves", "Rafael Nunes", "Bianca Souza", "Téo Lima"];
  return (
    <div className="relative">
      <div className="space-y-3 opacity-35">
        {people.map((n) => (
          <div key={n} className="flex items-center gap-3">
            <span className="h-8 w-8 shrink-0 rounded-full bg-white/15" />
            <div className="flex-1">
              <div className="h-2.5 w-28 rounded-full bg-white/15" />
              <div className="mt-1.5 h-2 w-20 rounded-full bg-white/[0.08]" />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute left-1/2 top-1/2 flex w-[92%] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-[14px] border border-white/10 bg-[#242a3a] px-3 py-2.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]">
        <span className="font-body text-[13px] text-white/50">
          Buscar entre seus pacientes
        </span>
        <span className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-brand text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/* ── Mock D · follow-up automático (bolhas) ────────────────────────────── */
function MockFollowup() {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="self-center font-body text-[11px] text-white/35">
        Convite enviado · 09:12
      </p>
      <div className="max-w-[80%] self-start rounded-[16px] rounded-tl-[4px] border border-white/[0.08] bg-white/[0.06] px-3.5 py-2.5">
        <p className="font-body text-[12px] font-medium text-white/80">Marina</p>
        <p className="font-body text-[13px] text-white/60">
          Respondi tudo, obrigada! 🌿
        </p>
      </div>
      <div className="max-w-[80%] self-end rounded-[16px] rounded-br-[4px] bg-brand px-3.5 py-2.5">
        <p className="flex items-center gap-1.5 font-body text-[13px] font-medium text-white">
          <IconSend className="h-3.5 w-3.5" />
          Resumo gerado e no prontuário
        </p>
        <p className="mt-0.5 text-right font-body text-[11px] text-white/70">
          automático · 09:15
        </p>
      </div>
    </div>
  );
}

/* ── Mock E · IA entende a fala crua e organiza em campos ──────────────── */
function MockExtracao() {
  const chips = ["Sono irregular", "Refeições tardias", "Ansiedade"];
  return (
    <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="font-body text-[13px] leading-relaxed text-white/40">
        “…tenho dormido mal, como bem tarde e ando bem ansiosa ultimamente…”
      </p>
      <div className="my-3.5 flex items-center gap-2">
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span className="inline-flex items-center gap-1.5 font-body text-[11px] font-medium text-brand">
          <IconSparkles className="h-3.5 w-3.5" />
          Gaia organizou
        </span>
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 font-body text-[12px] font-medium text-white/75"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Features() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-reveal]", {
        y: 22,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: "top 80%", once: true },
      });
      gsap.from("[data-card]", {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: "[data-grid]", start: "top 82%", once: true },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="features"
      className="relative bg-[#13161F] py-24 md:py-32"
    >
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16">
        {/* header */}
        <header className="mb-14 max-w-2xl md:mb-16">
          <span
            data-reveal
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Recursos
          </span>
          <h2
            data-reveal
            className="text-balance font-title text-h2 font-medium text-neutro-0 md:text-h1"
          >
            Tudo que a anamnese sempre{" "}
            <span className="italic text-white/60">precisou ser.</span>
          </h2>
        </header>

        {/* bento */}
        <div
          data-grid
          className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2"
        >
          {/* A — texto (topo-esq) */}
          <article data-card className={CARD + " lg:col-start-1 lg:row-start-1"}>
            <div className="flex h-full flex-col p-7 md:p-8">
              <CardTitle>A IA faz a coleta por você</CardTitle>
              <CardBody>
                A Gaia conduz a anamnese, entende cada resposta e organiza tudo —
                você chega na consulta com o resumo pronto e foca no que só você
                faz: cuidar de gente.
              </CardBody>
              <div className="mt-6">
                <MockExtracao />
              </div>
            </div>
          </article>

          {/* B — hero full-bleed (topo-dir) */}
          <article
            data-card
            className={CARD + " min-h-[340px] lg:col-start-2 lg:row-start-1"}
          >
            <MockConversa />
          </article>

          {/* C — card alto (baixo-esq): título + mock + parágrafo */}
          <article
            data-card
            className={CARD + " h-full lg:col-start-1 lg:row-start-2"}
          >
            <div className="flex h-full flex-col p-7 md:p-9">
              <CardTitle>Adeus, formulário de 40 campos</CardTitle>
              <div className="flex flex-1 items-center justify-center py-8">
                <MockResumo />
              </div>
              <CardBody>
                A anamnese vira um resumo estruturado sozinha. Queixa, histórico e
                hábitos organizados do jeito que você lê — prontos antes de o
                paciente sentar.
              </CardBody>
            </div>
          </article>

          {/* coluna direita inferior — D e E empilhados */}
          <div className="flex flex-col gap-4 md:gap-5 lg:col-start-2 lg:row-start-2">
            {/* D — todos os pacientes num lugar */}
            <article data-card className={CARD + " flex-1"}>
              <div className="flex h-full flex-col p-7 md:p-8">
                <CardTitle>Seus pacientes num lugar só</CardTitle>
                <CardBody>
                  Busque, filtre e reveja qualquer anamnese em segundos.
                  Histórico completo, sem planilha, sem procurar em três lugares.
                </CardBody>
                <div className="mt-6">
                  <MockBusca />
                </div>
              </div>
            </article>

            {/* E — follow-ups por nossa conta */}
            <article data-card className={CARD + " flex-1"}>
              <div className="flex h-full flex-col p-7 md:p-8">
                <CardTitle>Os lembretes por nossa conta</CardTitle>
                <CardBody>
                  Convite, reenvio, lembrete de retorno — a Gaia cuida do
                  vai-e-vem pra você não perder ninguém no caminho.
                </CardBody>
                <div className="mt-6">
                  <MockFollowup />
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import type { ReactNode } from "react";

/* ──────────────────────────────────────────────────────────────
   Painéis "Como Começar" — placeholders de produto (nível awwwards).
   Backgrounds em gradiente = área da foto/lifestyle real (a definir).
   Cards flutuantes = recorte de UI real do Gaia (a definir).

   Desktop: texto centralizado à esquerda + cluster de UI denso,
   sobreposto e com profundidade à direita.
   Mobile: texto no topo + 1 mockup principal embaixo (secundários
   ficam ocultos pra não poluir a tela estreita).
   ────────────────────────────────────────────────────────────── */

type PanelProps = { active: boolean; reduced: boolean };

/**
 * Camadas separadas: A) posição estática (className, pode ter translate
 * de centragem) · B) parallax (mouse) · C) entrada em stagger · D) float idle.
 */
function Float({
  active,
  depth = 16,
  delay = 0,
  float = true,
  className = "",
  children,
}: {
  active: boolean;
  depth?: number;
  delay?: number;
  float?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`absolute ${className}`}>
      <div
        style={{
          transform: `translate3d(calc(var(--px) * ${depth}px), calc(var(--py) * ${
            depth * 0.7
          }px), 0)`,
          transition: "transform 350ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          className="transition-all duration-700 ease-gaia"
          style={{
            transitionDelay: `${delay}ms`,
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(28px)",
          }}
        >
          <div className={float ? "gaia-float" : ""} style={{ animationDelay: `${delay}ms` }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Overlay({
  eyebrow,
  headline,
  sub,
  active,
}: {
  eyebrow: string;
  headline: string;
  sub: string;
  active: boolean;
}) {
  return (
    <div
      className="absolute bottom-0 left-0 z-10 flex w-full flex-col px-7 pb-10 text-left transition-all duration-500 ease-gaia md:w-[58%] md:px-12 md:pb-16"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <p className="mb-3 font-body text-[13px] font-medium uppercase tracking-[0.14em] text-brand">
        {eyebrow}
      </p>
      <h3 className="mb-3 text-balance font-title font-medium leading-[1.04] text-neutro-900 text-[2rem] md:text-[3rem]">
        {headline}
      </h3>
      <p className="max-w-[40ch] font-body text-body text-neutro-700/90">
        {sub}
      </p>
    </div>
  );
}

const card = "rounded-2xl bg-neutro-0 shadow-soft-lg ring-1 ring-neutro-900/5";

/** posição do card principal: mobile topo-centro, desktop topo-direita
    (deixa o canto inferior-esquerdo livre pro título) */
const mainPos =
  "top-7 left-1/2 -translate-x-1/2 md:left-auto md:right-[7%] md:top-[10%] md:translate-x-0";

function Glow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-[6%] top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-neutro-0/40 blur-3xl"
    />
  );
}

/* ── Passo 01 · Traga seus pacientes ─────────────────────────── */
export function Panel1({ active }: PanelProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-afluente">
      <Glow />
      <Overlay
        active={active}
        eyebrow="Passo 01 · Migração"
        headline="Migre sem recomeçar do zero."
        sub="Traga seus pacientes da ferramenta atual. A gente faz a importação junto com você."
      />

      <Float
        active={active}
        depth={16}
        delay={120}
        className={`${mainPos} w-[270px] md:w-[340px]`}
      >
        <div className="relative">
          <div className={`${card} absolute -right-5 -top-6 h-full w-full opacity-60`} aria-hidden />
          <div className={`${card} relative p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-body text-small font-semibold text-neutro-800">
                Importar pacientes
              </p>
              <span className="rounded-full bg-sage-100 px-2 py-0.5 font-body text-[11px] font-medium text-sage-700">
                312 / 312
              </span>
            </div>
            <div className="space-y-3">
              {["Ana Beatriz", "Carla Menezes", "Marina Alves"].map((name, i) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-azul-200" />
                  <div className="flex-1">
                    <div className="mb-1.5 h-2 w-24 rounded-full bg-neutro-200" />
                    <div className="h-2 w-16 rounded-full bg-neutro-100" />
                  </div>
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#6F8354" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
                    style={{ opacity: 0.45 + i * 0.27 }}
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Float>
    </div>
  );
}

/* ── Passo 02 · Envie a anamnese ─────────────────────────────── */
export function Panel2({ active }: PanelProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-lavanda">
      <Glow />
      <Overlay
        active={active}
        eyebrow="Passo 02 · Envio"
        headline="Um link. Ela responde no celular."
        sub="Você envia por WhatsApp. O paciente responde no tempo dele, antes da consulta."
      />

      {/* Telefone (principal) */}
      <Float
        active={active}
        depth={14}
        delay={120}
        className={`${mainPos} w-[176px] md:w-[210px]`}
      >
        <div className="overflow-hidden rounded-[30px] border border-neutro-200 bg-neutro-0 p-2.5 shadow-soft-lg">
          <div className="rounded-[22px] bg-neutro-50 p-3">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-roxo-200" />
              <div className="h-2 w-16 rounded-full bg-neutro-200" />
            </div>
            <div className="mb-2 max-w-[88%] rounded-2xl rounded-tl-md bg-neutro-0 p-2.5 shadow-soft ring-1 ring-neutro-900/5">
              <p className="font-body text-[11px] leading-snug text-neutro-700">
                Oi, Maria! Sua anamnese:{" "}
                <span className="text-roxo-600">gaia.app/a/9f3</span> 💜
              </p>
            </div>
            <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-md bg-roxo-500 p-2.5">
              <div className="mb-1 h-1.5 w-14 rounded-full bg-neutro-0/70" />
              <div className="h-1.5 w-10 rounded-full bg-neutro-0/50" />
            </div>
          </div>
        </div>
      </Float>

      {/* Card pergunta — só desktop (sobrepõe o device à la Owner) */}
      <Float
        active={active}
        depth={30}
        delay={260}
        className="hidden md:block md:right-[27%] md:top-[46%] md:w-[260px]"
      >
        <div className={`${card} p-4`}>
          <p className="mb-3 font-body text-small font-semibold text-neutro-800">
            Como tem sido seu sono?
          </p>
          <div className="flex flex-wrap gap-2">
            {["Tranquilo", "Irregular", "Acordo cansada"].map((o, i) => (
              <span
                key={o}
                className={`rounded-full px-3 py-1.5 font-body text-[12px] ${
                  i === 1 ? "bg-roxo-500 text-neutro-0" : "bg-neutro-100 text-neutro-700"
                }`}
              >
                {o}
              </span>
            ))}
          </div>
        </div>
      </Float>
    </div>
  );
}

/* ── Passo 03 · Receba pronta ────────────────────────────────── */
export function Panel3({ active }: PanelProps) {
  const rows = [
    ["Objetivo", "Reeducação alimentar"],
    ["Restrições", "Intolerância a lactose"],
    ["Rotina", "Treina 4× por semana"],
  ];
  return (
    <div className="relative h-full w-full overflow-hidden bg-bruma">
      <Glow />
      <Overlay
        active={active}
        eyebrow="Passo 03 · Pronto"
        headline="Organizada e adaptada a cada pessoa."
        sub="Tudo chega estruturado e no contexto de quem respondeu. Você só atende."
      />

      <Float
        active={active}
        depth={16}
        delay={120}
        className={`${mainPos} w-[290px] md:w-[350px]`}
      >
        <div className="relative">
          <div className={`${card} absolute -right-5 -top-6 h-full w-full opacity-60`} aria-hidden />
          <div className={`${card} relative p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-roxo-200" />
              <div>
                <p className="font-body text-small font-semibold text-neutro-800">
                  Resumo · Maria Silva
                </p>
                <p className="font-body text-[11px] text-neutro-500">Anamnese concluída</p>
              </div>
              <span className="ml-auto rounded-full bg-roxo-100 px-2.5 py-1 font-body text-[11px] font-medium text-roxo-600">
                Adaptada
              </span>
            </div>
            <div className="space-y-2.5">
              {rows.map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between border-t border-neutro-100 pt-2.5 first:border-t-0 first:pt-0"
                >
                  <span className="font-body text-[12px] text-neutro-500">{k}</span>
                  <span className="font-body text-[12px] font-medium text-neutro-800">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Float>
    </div>
  );
}

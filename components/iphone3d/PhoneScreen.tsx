"use client";

/*
PhoneScreen — DOM real que vira a TELA do iPhone 3D via <Html transform>
(montagem em IPhoneModel.tsx). Duas variantes, cada uma com a paleta da seção
onde o aparelho está naquele ponto da viagem do ScrollPhone:

  - "prontuario": a Marina Alves — antes um painel de vidro flutuante ao lado
    do phone (MockProntuario, hoje removido de Features.tsx) — agora vive
    DENTRO da tela. Vidro escuro (mesma receita do resto do Features:
    backdrop-blur + gradiente preto + inset highlight), chip ativo em
    bg-brand. Os 8 chips das abas alternam sozinhos (useAutoCycle) e o
    conteúdo abaixo faz crossfade — igual ao "gaia-fade" já usado nos outros
    mocks vivos da seção.
  - "inicio": a tela "Início" de verdade do app (réplica de /phone-screen.png)
    — clara, cartão roxo de próxima consulta, lista de pacientes recentes.
    Usada quando o phone pousa no Pricing (seção clara).

Construído em CSS fixo 390×844 (referência iPhone 15 Pro Max, aspect ≈0.462,
bem próximo do 0.46 real do aparelho). Quem escala pro tamanho real da malha
é o <Html transform> em IPhoneModel — aqui só desenhamos em pixels de tela.
pointerEvents sempre "none": nada aqui é clicável (o overlay do ScrollPhone
também é pointer-events-none).
*/

import { useLayoutEffect, useRef } from "react";
import { useAutoCycle } from "@/lib/useAutoCycle";
import { IconCheck } from "@/components/ui/icons";

export type PhoneScreenVariant = "prontuario" | "inicio";

const W = 390;
const H = 844;

/* ── chrome comum: status bar minimalista (hora + 5G + bateria) ─────────── */
function StatusBar({ dark }: { dark?: boolean }) {
  return (
    <div
      className={
        "flex shrink-0 items-center justify-between px-7 pb-1 pt-3.5 font-title text-[15px] font-semibold " +
        (dark ? "text-white" : "text-neutro-800")
      }
    >
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <span className="font-body text-[11px] font-semibold tracking-tight">5G</span>
        <span
          aria-hidden
          className={"h-[11px] w-[22px] rounded-[3px] border " + (dark ? "border-white/70" : "border-neutro-800/60")}
        />
      </div>
    </div>
  );
}

function ChevronLeft({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 2.5 4 6l3.5 3.5" />
    </svg>
  );
}

function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M7 2v10M2 7h10" />
    </svg>
  );
}

/* Barra de navegação inferior + home indicator — o que fecha uma tela real
   de iPhone embaixo (réplica do que /phone-screen.png já mostrava: 3 pontos,
   o ativo em roxo). Compartilhada pelas duas variantes: sem ela (e sem algo
   que dê corpo ao meio), a tela lia como um card boiando num retângulo preto
   vazio em vez de uma primeira tela de app de verdade — ver comentário em
   ProntuarioScreen sobre o porquê do flex-1 na seção de atividade. */
function BottomNav({ activeIndex, dark }: { activeIndex: 0 | 1 | 2; dark?: boolean }) {
  return (
    <div className="mt-4 shrink-0 px-6 pb-2.5 pt-3">
      <div className="flex items-center justify-center gap-3">
        {[0, 1, 2].map((k) => (
          <span
            key={k}
            className={
              "h-1.5 w-1.5 rounded-full transition-colors " +
              (k === activeIndex ? "bg-brand" : dark ? "bg-white/20" : "bg-neutro-300")
            }
          />
        ))}
      </div>
      {/* home indicator — o traço de gesto do iOS */}
      <div className={"mx-auto mt-3 h-[5px] w-[134px] rounded-full " + (dark ? "bg-white/25" : "bg-neutro-800/20")} />
    </div>
  );
}

/* ═══════════════════════ variant="inicio" ═══════════════════════
   Réplica de /phone-screen.png: fundo claro, card roxo de próxima consulta,
   lista de pacientes recentes. Estática — é a tela de pouso, sem ciclo. */
function InicioScreen() {
  const patients = [
    { init: "MA", name: "Marina Alves", sub: "Anamnese hoje" },
    { init: "JS", name: "João Silva", sub: "Ontem" },
    { init: "AC", name: "Ana Costa", sub: "3 dias atrás" },
    { init: "PL", name: "Pedro Lima", sub: "5 dias atrás" },
  ];
  return (
    <div className="flex h-full w-full flex-col bg-neutro-50">
      <StatusBar />
      <div className="flex items-center justify-between px-7 pt-6">
        <h1 className="font-title text-[34px] font-medium leading-none text-neutro-800">Início</h1>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-soft">
          <PlusIcon className="h-4 w-4" />
        </span>
      </div>

      <div className="mx-7 mt-6 rounded-[24px] bg-gradient-to-br from-brand to-roxo-600 p-5 shadow-soft-lg">
        <p className="font-body text-[12.5px] text-white/70">Próxima consulta</p>
        <p className="mt-1 font-title text-[22px] font-medium leading-tight text-white">Marina Alves · 14h</p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 font-body text-[12px] font-medium text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-white/25">
            <IconCheck className="h-2.5 w-2.5" />
          </span>
          Anamnese pronta
        </span>
      </div>

      <p className="mx-7 mt-7 font-body text-[12px] font-semibold uppercase tracking-wide text-neutro-500">
        Pacientes recentes
      </p>
      {/* flex-1: o excesso de altura (390×844 é mais alto que a lista) some
          no FUNDO deste bloco, empurrando o BottomNav pro rodapé real da
          tela — em vez de deixar espaço morto espalhado ou o nav grudado
          logo abaixo do último paciente. */}
      <div className="mx-7 mt-3 flex flex-1 flex-col gap-2.5">
        {patients.map((p) => (
          <div key={p.name} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-soft">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-azul-100 font-title text-[13px] font-semibold text-azul-800">
              {p.init}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-title text-[15.5px] font-medium text-neutro-800">{p.name}</p>
              <p className="font-body text-[12px] text-neutro-500">{p.sub}</p>
            </div>
            <ChevronRight className="h-3 w-3 shrink-0 text-neutro-400" />
          </div>
        ))}
      </div>
      <BottomNav activeIndex={0} dark={false} />
    </div>
  );
}

/* ═══════════════════════ variant="prontuario" ═══════════════════════ */

/* União discriminada por `kind`: 7 abas continuam label/valor genérico
   ("rows"), só "Plano" carrega conteúdo próprio ("meals") — lista de
   refeições com foto real. Discriminar por `kind` (em vez de, digamos,
   checar `tab.k === "Plano"` no render) deixa o TypeScript estreitar o
   union sozinho no branch abaixo, sem cast nem "as any" no .meals/.rows. */
type Tab =
  | { k: string; kind: "rows"; rows: [string, string][] }
  | { k: string; kind: "meals"; meals: Meal[] };

type Meal = { img: string; name: string; detail: string; state: "done" | "pending" };

const MEALS: Meal[] = [
  { img: "/plano-cafe.webp", name: "Café da manhã", detail: "Ovos, abacate e pão de centeio · 38 g proteína", state: "done" },
  { img: "/plano-almoco.webp", name: "Almoço", detail: "Frango, arroz integral e brócolis · 620 kcal", state: "done" },
  // "Iogurte natural com frutas vermelhas · 180 kcal" estourava a linha e o
  // truncate comia justamente o "180 kcal" — o dado, não o enfeite. Detalhe
  // fica no teto de ~45 caracteres, medido: é o que cabe nos 390px de tela
  // antes do reticências (a linha do café, com 45, encosta e não corta).
  { img: "/plano-lanche.webp", name: "Lanche da tarde", detail: "Iogurte com frutas vermelhas · 180 kcal", state: "done" },
  { img: "/plano-jantar.webp", name: "Jantar", detail: "Salmão e legumes assados · 480 kcal", state: "pending" },
];

const TABS: Tab[] = [
  { k: "Anamnese", kind: "rows", rows: [
    ["Queixa principal", "Cansaço e ganho de peso"],
    ["Restrições", "Intolerância à lactose"],
    ["Rotina", "Sono irregular · sedentária"],
  ] },
  { k: "Avaliação", kind: "rows", rows: [
    ["Objetivo", "Perder 5 kg em 4 meses"],
    ["Nível de atividade", "Moderado · 3x/semana"],
    ["Observações", "Sem restrições articulares"],
  ] },
  { k: "Plano", kind: "meals", meals: MEALS },
  { k: "Exames", kind: "rows", rows: [
    ["Última coleta", "12 jun"],
    ["Alterado", "Vitamina D · TSH"],
    ["Próxima", "em 90 dias"],
  ] },
  { k: "Antropometria", kind: "rows", rows: [
    ["Peso atual", "72,8 kg"],
    ["Variação", "−5,2 kg em 6 meses"],
    ["IMC", "24,1"],
  ] },
  { k: "Agenda", kind: "rows", rows: [
    ["Próxima consulta", "Hoje · 14h"],
    ["Formato", "Teleconsulta"],
    ["Recorrência", "Quinzenal"],
  ] },
  { k: "Questionários", kind: "rows", rows: [
    ["Aplicados", "EAT-26 · PSQI · BSQ"],
    ["Pendente", "TFEQ-21"],
    ["Última pontuação", "EAT-26 · 19 pts"],
  ] },
  { k: "Histórico", kind: "rows", rows: [
    ["Consultas", "6 desde março"],
    ["Primeira visita", "14 mar"],
    ["Última atualização", "hoje"],
  ] },
];

const STATS = [
  { n: "6", k: "consultas" },
  { n: "3", k: "exames" },
  { n: "2", k: "planos" },
  { n: "7", k: "questionários" },
];

/* Linha de chips das 8 abas — o ativo desliza pro centro do viewport quando
   não cabe nos 390px (translate, nunca scrollbar). offsetLeft/scrollWidth
   não são afetados pelo transform já aplicado, então o cálculo fica estável
   entre re-renders. */
function ChipsRow({ active }: { active: number }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const chip = chipRefs.current[active];
    if (!viewport || !track || !chip) return;
    const viewportW = viewport.clientWidth;
    const trackW = track.scrollWidth;
    const chipCenter = chip.offsetLeft + chip.offsetWidth / 2;
    const minTx = Math.min(0, viewportW - trackW);
    const tx = Math.max(minTx, Math.min(0, viewportW / 2 - chipCenter));
    track.style.transform = `translate3d(${tx}px,0,0)`;
  }, [active]);

  // fade nas duas pontas via mask-image: quando o chip vizinho fica cortado
  // ao meio pela translação (a régua centraliza o ativo, então isso É
  // esperado quando os 8 chips não cabem em 390px), ele desaparece sob o
  // gradiente em vez de aparecer com a borda serrada — affordance de "tem
  // mais coisa aqui" em vez de bug visual. 24px de fade em cada ponta.
  const EDGE_FADE =
    "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)";

  return (
    <div className="mt-4 px-6">
      <div
        ref={viewportRef}
        className="overflow-hidden"
        style={{ WebkitMaskImage: EDGE_FADE, maskImage: EDGE_FADE }}
      >
        <div ref={trackRef} className="flex w-max gap-1.5 transition-transform duration-500 ease-gaia">
          {TABS.map((t, i) => (
            <span
              key={t.k}
              ref={(el) => { chipRefs.current[i] = el; }}
              className={
                // duration alinhada ao gaia-fade do conteúdo (0.45s ease, ver
                // globals.css) — bug reportado: com 500ms o chip ainda tava
                // no meio da transição de cor quando o conteúdo da aba nova
                // já tinha trocado, dando um instante com dois chips roxos.
                "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-body text-[12px] font-medium transition-colors duration-[450ms] ease-out " +
                (i === active
                  ? "bg-brand text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                  : "bg-white/10 text-white/55")
              }
            >
              {t.k}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Vidro escuro — inspirado na receita do Features.tsx (GLASS), mas SEM
   backdrop-filter. Medido com Playwright (probe injetando `backdrop-filter:
   none !important` global e comparando screenshots): dentro do <Html
   transform> do drei — que monta este DOM numa camada CSS3D com uma matriz
   de escala bem pequena (~0.003, a tela real cabe em ~7% do tamanho nativo
   390px) — o Chromium pinta qualquer elemento com backdrop-filter como um
   retângulo sólido preto, cobrindo o próprio conteúdo (texto incluso), em
   vez de borrar o que está atrás. Sem o filtro, tudo renderiza nítido. Não é
   só um artefato de teste headless — backdrop-filter dentro de contextos
   3D-transformados é uma combinação historicamente frágil entre browsers, e
   aqui não há nada interessante atrás dos cards pra borrar (tudo é cor
   sólida), então o filtro não faz falta: um overlay translúcido por cima do
   fundo escuro sólido da tela já dá a mesma leitura de "painel de vidro"
   por simples alpha blend, sem depender de filtro nenhum. */
const GLASS = "bg-gradient-to-b from-white/[0.09] to-white/[0.04] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(255,255,255,0.06)]";

// Timeline de atividade recente da paciente — dá corpo à metade de baixo da
// tela (ver comentário no card "flex-1" abaixo pro porquê).
const ACTIVITY: { label: string; time: string }[] = [
  { label: "Consulta realizada", time: "Hoje, 14h" },
  { label: "Exame de sangue anexado", time: "há 3 dias" },
  { label: "Plano alimentar atualizado", time: "há 6 dias" },
  { label: "Questionário EAT-26 respondido", time: "há 9 dias" },
];

function TimelineRow({ label, time, last }: { label: string; time: string; last?: boolean }) {
  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span aria-hidden className="absolute left-[4.5px] top-3 h-full w-px bg-white/10" />}
      <span aria-hidden className="relative z-10 mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full bg-brand ring-4 ring-[#0A0C11]" />
      <div className="min-w-0 flex-1">
        <p className="font-body text-[12.5px] font-medium text-white/90">{label}</p>
        <p className="font-body text-[11px] text-white/45">{time}</p>
      </div>
    </div>
  );
}

/* Linha da aba "Plano" — thumb real + nome + detalhe + status. `i` é o
   índice na lista (0-3): dita o delay escalonado da entrada (gaia-meal-rise,
   i*70ms) e, só nas refeições "done", o delay do tick do check
   (gaia-tick, 800+i*200ms — espera a linha assentar antes de "confirmar").
   O "pending" nunca recebe gaia-tick de propósito: o spinner fica girando
   pra sempre enquanto a aba está em tela, porque o dia da Marina ainda não
   acabou — não é um estado incompleto da implementação. */
function MealRow({ meal, i }: { meal: Meal; i: number }) {
  return (
    <div
      className="gaia-meal-rise flex items-center gap-3"
      style={{ animationDelay: `${i * 70}ms` }}
    >
      {/* wrapper 40×40 carrega tamanho/raio/recorte/anel — o <img> por
          dentro só preenche (object-cover h-full w-full). O inset ring
          separa a foto do vidro escuro em vez de deixá-la flutuar sem
          contorno, mesma lógica do avatar "MA" do card da paciente acima. */}
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[11px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]">
        {/* <img> cru, NUNCA next/image: este DOM não é montado pelo App
            Router — é uma React root PARALELA criada pelo <Html transform>
            do drei dentro do canvas 3D (ver comentário detalhado em
            lib/useAutoCycle.ts sobre essa root remontar a cada render do
            <Html>). next/image depende do ciclo de vida normal do Next
            (loader de otimização, layout effects de prioridade/intersection
            amarrados à árvore "real") pra funcionar direito; dentro dessa
            root isolada isso não tem garantia nenhuma e o risco não compensa
            economizar alguns KB numa thumb de 40px que nem é clicável.
            alt="" + aria-hidden: puramente decorativa, o nome da refeição ao
            lado já diz tudo que importa. */}
        <img src={meal.img} alt="" aria-hidden className="h-full w-full object-cover" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-title text-[13px] font-medium text-white/90">{meal.name}</p>
        <p className="truncate font-body text-[10.5px] text-white/45">{meal.detail}</p>
      </div>
      {meal.state === "done" ? (
        <span
          aria-hidden
          // sage-500 quase sólido + check branco: a 18px sobre vidro escuro,
          // o /25 anterior com ícone sage-200 lia como bolinha cinza apagada
          // — o "feito" sumia. É o único ponto de cor saturada da tela, e é
          // proposital: é ele que dá o pulso da lista (a paciente cumpriu).
          className="gaia-tick grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-sage-500/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
          style={{ animationDelay: `${800 + i * 200}ms` }}
        >
          <IconCheck className="h-2.5 w-2.5 text-white" />
        </span>
      ) : (
        // spinner entra junto com a linha (gaia-meal-rise já cuida disso) —
        // sem tick próprio, e sem fim: continua girando enquanto a aba
        // estiver em tela, de propósito (ver comentário da função).
        <span
          aria-hidden
          className="gaia-meal-spinner h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-brand"
        />
      )}
    </div>
  );
}

function ProntuarioScreen() {
  // Congela em "Anamnese" (índice 0) sob prefers-reduced-motion — useAutoCycle
  // já não inicia o intervalo nesse caso, então o índice nunca sai de 0.
  const [active, ref] = useAutoCycle(TABS.length, 2800);
  const tab = TABS[active];
  return (
    <div ref={ref} className="relative flex h-full w-full flex-col overflow-hidden bg-[#0A0C11]">
      {/* glow de marca atrás do vidro — mesmo recurso visual do resto do Features */}
      <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#8A69D8]/20 blur-[80px]" />

      {/* flex-1 + flex-col: o wrapper preenche os 844px inteiros da tela (só
          filho não-absolute do root, que já é flex-col h-full — ver default
          export). Sem isso todo o conteúdo ficava com altura de conteúdo
          (~470px) e sobrava quase metade da tela em preto morto embaixo —
          lia como um card colado no topo, não como a tela de um app. */}
      <div className="relative z-10 flex h-full flex-col">
        <StatusBar dark />
        <div className="mt-2 flex items-center gap-3 px-6">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white/70">
            <ChevronLeft className="h-3 w-3" />
          </span>
          <h1 className="font-title text-[26px] font-medium leading-none text-white">Prontuário</h1>
        </div>

        {/* card da paciente */}
        <div className={"mx-6 mt-4 flex items-center gap-3 rounded-[18px] p-3.5 " + GLASS}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-white/15 font-title text-[15px] font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            MA
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-title text-[15.5px] font-medium text-white">Marina Alves</p>
            <p className="font-body text-[11.5px] text-white/50">34 anos · última consulta hoje</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-body text-[11px] font-medium text-sage-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
            <span className="h-1.5 w-1.5 rounded-full bg-sage-300" /> Ativo
          </span>
        </div>

        <ChipsRow active={active} />

        {/* conteúdo da aba — crossfade (gaia-fade, definido em globals.css).
            min-h-[226px]: TRAVA DE ALTURA, valor MEDIDO, não estimado — rota
            de debug temporária (DOM normal, sem 3D) + getBoundingClientRect
            zerando o min-h pra pegar a altura natural: 4 linhas de refeição
            (thumb 40px + gap-2.5) fecham em 219px; as 7 abas de texto puro
            (3 linhas, sem thumb) ficam em ~130px. 226px = 219 + ~7px de
            folga pra variação de sub-pixel entre navegadores/fontes, sem
            sobrar gordura à toa. Sem essa trava, o card de conteúdo respira
            com o próprio conteúdo e TUDO abaixo dele (stats, card de
            atividade, BottomNav) pula a cada 2.8s só quando "Plano" entra no
            ciclo. Aplicando o min-h nas 8 abas por igual — não só na "Plano"
            — as 7 de texto ficam com folga no fundo do card (onde não
            incomoda, mesmo raciocínio do flex-1 da atividade abaixo).
            Conferido no mesmo harness: com essa trava, o card de atividade
            (flex-1) fecha em 249.5px em QUALQUER aba ativa — 844px de tela
            batendo exato com o scrollHeight do frame, sem overflow, sem
            sobra pulando de tamanho. */}
        <div className={"mx-6 mt-4 flex min-h-[226px] flex-col rounded-[16px] p-4 " + GLASS}>
          {tab.kind === "rows" ? (
            // flex-1 + justify-center: as 3 linhas são ~110px dentro de um
            // card travado em 226px pela lista de refeições. Alinhadas no
            // topo (como estavam), a sobra virava um buraco de 110px no pé
            // do card e a aba lia como meio carregada — o mesmo "espaço
            // morto" que o comentário do wrapper flex-col acima já combate.
            // Centrando o bloco, a folga se divide em duas margens iguais e
            // o card lê como arejado de propósito. Centrar (e não
            // justify-around) preserva o ritmo do divide-y: com as linhas
            // espalhadas, cada borda ficaria colada no topo da sua própria
            // linha em vez de no meio do vão entre duas.
            <div key={active} className="gaia-fade flex flex-1 flex-col justify-center divide-y divide-white/[0.08]">
              {tab.rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <span className="shrink-0 font-body text-[12.5px] text-white/50">{label}</span>
                  <span className="text-right font-body text-[12.5px] font-medium text-white/90">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div key={active} className="gaia-fade flex flex-col gap-2.5">
              {tab.meals.map((meal, i) => (
                <MealRow key={meal.name} meal={meal} i={i} />
              ))}
            </div>
          )}
        </div>

        {/* stats — resumo geral da paciente, não muda com a aba */}
        <div className="mx-6 mt-4 grid grid-cols-4 gap-2">
          {STATS.map((s) => (
            <div key={s.k} className="rounded-[10px] bg-white/[0.06] py-2 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
              <p className="font-title text-[15px] font-medium tabular-nums text-white">{s.n}</p>
              <p className="truncate px-1 font-body text-[9px] text-white/50">{s.k}</p>
            </div>
          ))}
        </div>

        {/* atividade recente — flex-1: cresce pra absorver o resto da altura
            da tela num ÚNICO card contido (não espalha gaps entre seções).
            As linhas ficam alinhadas no topo do card; a folga sobra dentro
            dele, embaixo da última linha — onde não chama atenção. */}
        <div className={"mx-6 mt-4 flex-1 rounded-[16px] p-4 " + GLASS}>
          <p className="mb-3 font-body text-[11px] font-semibold uppercase tracking-wide text-white/45">
            Atividade recente
          </p>
          {ACTIVITY.map((a, i) => (
            <TimelineRow key={a.label} label={a.label} time={a.time} last={i === ACTIVITY.length - 1} />
          ))}
        </div>

        <BottomNav activeIndex={1} dark />
      </div>
    </div>
  );
}

export default function PhoneScreen({ variant }: { variant: PhoneScreenVariant }) {
  // borderRadius casa os cantos do DOM com o recorte arredondado do display do
  // 15 Pro Max: o <Html transform> monta este frame como um retângulo reto sobre
  // a tela curva da malha, então sem o raio as 4 pontas quadradas escapam pra
  // fora do bisel (visível principalmente no topo). ~55px em 390px de largura
  // ≈ o raio real do display (55pt num ~430pt de largura). overflow-hidden já
  // recorta o conteúdo interno a essa curva.
  return (
    <div
      style={{ width: W, height: H, pointerEvents: "none", borderRadius: 56 }}
      className="select-none overflow-hidden"
    >
      {variant === "prontuario" ? <ProntuarioScreen /> : <InicioScreen />}
    </div>
  );
}

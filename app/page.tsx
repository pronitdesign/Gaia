import dynamic from "next/dynamic";
import ComoComecar from "@/components/sections/ComoComecar";
import Features from "@/components/sections/Features";
import ARoberta from "@/components/sections/ARoberta";
import Manifesto from "@/components/sections/Manifesto";
import Mergulho from "@/components/sections/Mergulho";
import Pricing from "@/components/sections/Pricing";
import CTAFinal from "@/components/sections/CTAFinal";

// ═══ Bloco do Kácio (topo da página) — portado de origin/main pra dentro da
// estrutura da Pronit. Tokens namespaceados em `k-*`, fonte de corpo Clash
// Grotesk escopada no wrapper. A HeroGrid já inclui a Navbar. Topo:
// LoadingScreen → HeroGrid → Benefits. Testimonials e Faq saíram daqui e foram
// pra baixo da Pricing (bloco de fechamento antes do CTA), a pedido da Pronit.
import CenaOpcional from "@/components/iphone3d/CenaOpcional";
import LoadingScreen from "@/components/kacio/LoadingScreen";
import Navbar from "@/components/kacio/Navbar";
import HeroGrid from "@/components/kacio/HeroGrid";
import Benefits from "@/components/kacio/Benefits";
import Testimonials from "@/components/kacio/Testimonials";
import Faq from "@/components/kacio/Faq";

/* iPhone 3D persistente que viaja Features → Manifesto → Pricing com o scroll.
   client-only (WebGL) e desktop-only por dentro. */
const ScrollPhone = dynamic(
  () => import("@/components/iphone3d/ScrollPhoneDeferred"),
  { ssr: false },
);

export default function Home() {
  return (
    <main>
      {/* ═══ Parte do Kácio — topo da página, na ordem original dele. A fonte
          de corpo (Clash Grotesk) fica escopada neste wrapper pra não tocar no
          corpo da Pronit (Clash Display via --font-body). A Navbar vem dentro da
          HeroGrid; a LoadingScreen é overlay fixo que some após o vídeo.

          A ORDEM hero → splash é medida, não estética (auditoria Felix
          2026-08-01): com o splash como primeiro filho, o H1 do hero só entrava
          num frame DEPOIS da hidratação — LCP mobile de 5,28s sendo 88% render
          delay. O Chrome registra candidato a LCP mesmo coberto por overlay
          opaco, então com o hero primeiro o H1 pinta cedo POR BAIXO do splash e
          o LCP destrava (~1,3–1,6s projetado). O splash fica IMEDIATAMENTE
          depois — a menos de ~25KB do início do HTML — pra chegar no mesmo voo
          de rede e nunca existir frame do hero sem a cortina por cima; movê-lo
          pro fim do main reabriria exatamente esse flash. O visual não muda:
          fixed inset-0 z-[100] independe de ordem no DOM. Preço aceito: na
          ordem de leitura/tab o progressbar vem depois do hero. */}
      <div className="font-grotesk">
        {/* A Navbar mora AQUI e não dentro da HeroGrid (de onde saiu em
            2026-08-05). Desde 9c1fcbb ela é `fixed` no mobile, e a HeroGrid é
            pinada pelo ScrollTrigger: o GSAP escreve `transform` no elemento
            pinado, e qualquer transform — inclusive a matriz identidade — cria
            containing block, fazendo `position: fixed` resolver contra aquela
            caixa em vez da viewport. MEDIDO antes da mudança: o header saía de
            quadro junto com a página (top=-736 em y=1500; top=-11236 em
            y=12000) e nunca voltava ao subir.
            Fica DENTRO do wrapper `font-grotesk` (é a fonte de corpo do bloco
            do Kácio) mas FORA do pin — este div não recebe transform. */}
        <Navbar />
        <HeroGrid />
        <LoadingScreen />
        <Benefits />
      </div>

      {/* ═══ Parte da Pronit ═══ */}
      <ComoComecar />
      <ARoberta />
      <Features />
      {/* Manifesto — interstitial cinético que costura o escuro do Features ao claro do Pricing */}
      <Manifesto />
      {/* Mergulho — o capítulo da água. Seção própria porque texto + travessia +
          Pricing não cabem em dois tempos de scroll; ver o cabeçalho dela. */}
      <Mergulho />
      <Pricing />
      {/* Fechamento do Kácio — abaixo da Pricing, antes do CTA (pedido da Pronit):
          Depoimentos ("Quem já atende com a Gaia") logo após o preço, e o FAQ por
          último. O wrapper `font-grotesk` mantém a fonte de corpo deles; os
          headings já são font-display (Sentient). */}
      <div className="font-grotesk">
        <Testimonials />
        <Faq />
      </div>
      {/* CTA Final — fecha a página com o footer embutido sobre a imagem */}
      <CTAFinal />

      {/* Overlay fixo — o aparelho que atravessa as três seções.
          Dentro do CenaOpcional porque um erro aqui (o glb não chegar, o WebGL
          não inicializar) subia pelo Suspense do Canvas e desmontava a página
          inteira: medido, o documento caía de 18746px para 932 e o scroll
          morria. Decorativo não pode derrubar conteúdo. */}
      <CenaOpcional>
        <ScrollPhone />
      </CenaOpcional>
    </main>
  );
}

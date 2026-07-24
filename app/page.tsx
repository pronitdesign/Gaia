import dynamic from "next/dynamic";
import ComoComecar from "@/components/sections/ComoComecar";
import Features from "@/components/sections/Features";
import ARoberta from "@/components/sections/ARoberta";
import Manifesto from "@/components/sections/Manifesto";
import Mergulho from "@/components/sections/Mergulho";
import Pricing from "@/components/sections/Pricing";
import CTAFinal from "@/components/sections/CTAFinal";

// ═══ Bloco do Kácio (topo da página) — portado de origin/main pra dentro da
// estrutura da Laura. Tokens namespaceados em `k-*`, fonte de corpo Clash
// Grotesk escopada no wrapper. A HeroGrid já inclui a Navbar. Topo:
// LoadingScreen → HeroGrid → Benefits. Testimonials e Faq saíram daqui e foram
// pra baixo da Pricing (bloco de fechamento antes do CTA), a pedido da Laura.
import LoadingScreen from "@/components/kacio/LoadingScreen";
import HeroGrid from "@/components/kacio/HeroGrid";
import Benefits from "@/components/kacio/Benefits";
import Testimonials from "@/components/kacio/Testimonials";
import Faq from "@/components/kacio/Faq";

/* iPhone 3D persistente que viaja Features → Manifesto → Pricing com o scroll.
   client-only (WebGL) e desktop-only por dentro. */
const ScrollPhone = dynamic(() => import("@/components/iphone3d/ScrollPhone"), {
  ssr: false,
});

export default function Home() {
  return (
    <main>
      {/* ═══ Parte do Kácio — topo da página, na ordem original dele. A fonte
          de corpo (Clash Grotesk) fica escopada neste wrapper pra não tocar no
          corpo da Laura (Clash Display via --font-body). A Navbar vem dentro da
          HeroGrid; a LoadingScreen é overlay fixo que some após o vídeo. */}
      <div className="font-grotesk">
        <LoadingScreen />
        <HeroGrid />
        <Benefits />
      </div>

      {/* ═══ Parte da Laura ═══ */}
      <ComoComecar />
      <ARoberta />
      <Features />
      {/* Manifesto — interstitial cinético que costura o escuro do Features ao claro do Pricing */}
      <Manifesto />
      {/* Mergulho — o capítulo da água. Seção própria porque texto + travessia +
          Pricing não cabem em dois tempos de scroll; ver o cabeçalho dela. */}
      <Mergulho />
      <Pricing />
      {/* Fechamento do Kácio — abaixo da Pricing, antes do CTA (pedido da Laura):
          Depoimentos ("Quem já atende com a Gaia") logo após o preço, e o FAQ por
          último. O wrapper `font-grotesk` mantém a fonte de corpo deles; os
          headings já são font-display (Sentient). */}
      <div className="font-grotesk">
        <Testimonials />
        <Faq />
      </div>
      {/* CTA Final — fecha a página com o footer embutido sobre a imagem */}
      <CTAFinal />

      {/* Overlay fixo — o aparelho que atravessa as três seções */}
      <ScrollPhone />
    </main>
  );
}

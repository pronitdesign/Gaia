import dynamic from "next/dynamic";
import ComoComecar from "@/components/sections/ComoComecar";
import Features from "@/components/sections/Features";
import ARoberta from "@/components/sections/ARoberta";
import Manifesto from "@/components/sections/Manifesto";
import Pricing from "@/components/sections/Pricing";
import CTAFinal from "@/components/sections/CTAFinal";

/* iPhone 3D persistente que viaja Features → Manifesto → Pricing com o scroll.
   client-only (WebGL) e desktop-only por dentro. */
const ScrollPhone = dynamic(() => import("@/components/iphone3d/ScrollPhone"), {
  ssr: false,
});

export default function Home() {
  return (
    <main>
      {/* Acima daqui é a parte do Kácio — nada renderiza por enquanto */}
      <ComoComecar />
      <ARoberta />
      <Features />
      {/* Manifesto — interstitial cinético que costura o escuro do Features ao claro do Pricing */}
      <Manifesto />
      <Pricing />
      {/* CTA Final — fecha a página com o footer embutido sobre a imagem */}
      <CTAFinal />

      {/* Overlay fixo — o aparelho que atravessa as três seções */}
      <ScrollPhone />
    </main>
  );
}

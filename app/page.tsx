import ComoComecar from "@/components/sections/ComoComecar";
import Features from "@/components/sections/Features";
import ARoberta from "@/components/sections/ARoberta";
import Pricing from "@/components/sections/Pricing";
import CTAFinal from "@/components/sections/CTAFinal";

export default function Home() {
  return (
    <main>
      {/* Acima daqui é a parte do Kácio — nada renderiza por enquanto */}
      <ComoComecar />
      <ARoberta />
      <Features />
      <Pricing />
      {/* CTA Final — fecha a página com o footer embutido sobre a imagem */}
      <CTAFinal />
    </main>
  );
}

import ComoComecar from "@/components/sections/ComoComecar";
import Features from "@/components/sections/Features";
import ARoberta from "@/components/sections/ARoberta";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <main>
        {/* Acima daqui é a parte do Kácio — nada renderiza por enquanto */}
        <ComoComecar />
        <ARoberta />
        <Features />
      </main>
      <Footer />
    </>
  );
}

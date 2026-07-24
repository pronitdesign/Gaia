import LoadingScreen from "@/components/LoadingScreen";
import HeroGrid from "@/components/HeroGrid";
import Benefits from "@/components/Benefits";
import Testimonials from "@/components/Testimonials";
import Faq from "@/components/Faq";

export default function Home() {
  return (
    <main>
      <LoadingScreen />
      <HeroGrid />
      <Benefits />
      <Testimonials />
      <Faq />
    </main>
  );
}

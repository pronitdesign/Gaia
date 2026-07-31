import type { Metadata } from "next";
import { sentient, clashDisplay, clashGrotesk } from "@/lib/fonts";
import SmoothScroll from "@/components/SmoothScroll";
import { SCRIPT_TIER_INICIAL } from "@/lib/gpu";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gaia — A anamnese que entende quem está do outro lado",
  description:
    "Gaia transforma a anamnese num questionário inteligente que se adapta a cada paciente e chega até você organizado — antes da consulta.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${sentient.variable} ${clashDisplay.variable} ${clashGrotesk.variable}`}
    >
      <head>
        {/* ORÇAMENTO DE GPU — antes de tudo, inclusive do preload abaixo.
            São ~15 linhas de leitura de propriedade (deviceMemory, núcleos,
            saveData, dpr) que escrevem `data-gaia-tier` no <html>. Precisa ser
            inline e precisa ser AQUI: o CSS keya nesse atributo pro raio dos
            borrões decorativos, e se o tier chegasse depois do primeiro paint
            a página pintaria uma vez em raio cheio — trabalho de GPU pago à
            toa, no aparelho que menos tem pra pagar — e encolheria na frente
            de quem está olhando. Ver lib/gpu.ts. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TIER_INICIAL }} />
        {/* O primeiro pixel da página é o poster da intro. O scanner de preload
            até acha `<video poster>` no HTML, mas o atribui prioridade baixa e
            ele entra atrás de ~250KB de JS e do hero-bg. Declarado aqui, em
            high, ele chega antes de tudo — 21KB que decidem se o primeiro
            segundo é a flor ou k-ink puro. */}
        <link
          rel="preload"
          as="image"
          href="/loading-poster.webp"
          type="image/webp"
          fetchPriority="high"
        />
      </head>
      <body className="bg-neutro-50 text-neutro-800 font-body antialiased">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}

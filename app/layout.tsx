import type { Metadata } from "next";
import { sentient, clashDisplay } from "@/lib/fonts";
import SmoothScroll from "@/components/SmoothScroll";
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
    <html lang="pt-BR" className={`${sentient.variable} ${clashDisplay.variable}`}>
      <body className="bg-neutro-50 text-neutro-800 font-body antialiased">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}

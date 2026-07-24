import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const clashDisplay = localFont({
  src: "../fonts/ClashDisplay-Regular.woff2",
  weight: "400",
  variable: "--font-clash-display",
});

const clashGrotesk = localFont({
  src: [
    { path: "../fonts/ClashGrotesk-Regular.woff2", weight: "400" },
    { path: "../fonts/ClashGrotesk-Medium.woff2", weight: "500" },
  ],
  variable: "--font-clash-grotesk",
});

const sentient = localFont({
  src: [
    { path: "../fonts/Sentient-Regular.woff2", weight: "400" },
    { path: "../fonts/Sentient-Medium.woff2", weight: "500" },
  ],
  variable: "--font-sentient",
});

export const metadata: Metadata = {
  title: "Gaia — Workspace clínico para nutricionistas",
  description:
    "A Gaia escuta a consulta e monta o prontuário. Plano, exames e agenda vivem no mesmo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${clashDisplay.variable} ${clashGrotesk.variable} ${sentient.variable} antialiased`}
    >
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}

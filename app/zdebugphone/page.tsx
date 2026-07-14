"use client";

/* Rota de debug TEMPORÁRIA — renderiza PhoneScreen em DOM normal (sem 3D,
   sem Html transform, sem Lenis) pra isolar e verificar as correções de
   layout/ciclo sem a complexidade do CSS3D/scroll. Apagar depois de usar. */
import PhoneScreen from "@/components/iphone3d/PhoneScreen";

export default function DebugPhone() {
  return (
    <div style={{ background: "#333", padding: 40, display: "flex", gap: 40 }}>
      <div style={{ width: 390, height: 844, outline: "2px solid red" }}>
        <PhoneScreen variant="prontuario" />
      </div>
      <div style={{ width: 390, height: 844, outline: "2px solid red" }}>
        <PhoneScreen variant="inicio" />
      </div>
    </div>
  );
}

"use client";

/*
IPhone3D — iPhone 15 Pro Max 3D pronto pra plugar em qualquer site React.
Em Next: carregue via dynamic(..., { ssr: false }) porque usa WebGL/Canvas.
*/
import { Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
import IPhoneModel from "./IPhoneModel";
import Lights from "./Lights";

type IPhone3DProps = {
  glb?: string;
  bodyColor?: string;
  screenImg?: string;
  /** DOM real (PhoneScreen) dentro da tela — tem prioridade sobre screenImg */
  screen?: ReactNode;
  height?: string;
  scale?: number;
  /** [x, y, z] em radianos — pose fixa do aparelho */
  rotation?: [number, number, number];
  /** gira sozinho; false = pose estática (sem controles) */
  autoRotate?: boolean;
  enableZoom?: boolean;
  className?: string;
};

export default function IPhone3D({
  glb = "/models/scene.glb",
  bodyColor = "#8F8A81",
  screenImg,
  screen,
  height = "80vh",
  scale = 17,
  rotation = [0, 0, 0],
  autoRotate = false,
  enableZoom = false,
  className = "",
}: IPhone3DProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <Canvas gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
        <ambientLight intensity={0.3} />
        <PerspectiveCamera makeDefault position={[0, 0, 4]} />
        <Lights />
        {/* controles só quando gira sozinho; estático não recebe interação */}
        {autoRotate && (
          <OrbitControls
            enableZoom={enableZoom}
            enablePan={false}
            rotateSpeed={0.4}
            autoRotate
            autoRotateSpeed={1.2}
          />
        )}
        <Suspense fallback={<Html center>Carregando…</Html>}>
          <IPhoneModel
            glb={glb}
            bodyColor={bodyColor}
            screenImg={screenImg}
            screen={screen}
            rotation={rotation}
            scale={[scale, scale, scale]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

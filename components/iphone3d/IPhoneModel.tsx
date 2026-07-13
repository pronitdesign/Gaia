"use client";

/*
Malha do iPhone 15 Pro Max — gerado por gltfjsx, adaptado para ser reutilizável.
Modelo original: polyman (https://sketchfab.com/Polyman_3D) — CC-BY-4.0
*/
import * as THREE from "three";
import { useEffect } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import type { GroupProps } from "@react-three/fiber";

// Materiais que NÃO recebem a cor do corpo (tela, vidros, câmera, etc.)
const KEEP_MATERIALS = new Set([
  "zFdeDaGNRwzccye",
  "ujsvqBWRMnqdwPx",
  "hUlRcbieVuIiOXG",
  "jlzuBkUzuJqgiAK",
  "xNrofRCqOXXHVZt",
]);

// Tela com textura (imagem) — material UNLIT: a tela emite a própria imagem,
// então nunca escurece com a luz da cena / mudança de ângulo (tela real).
function TexturedScreen({
  geometry,
  img,
}: {
  geometry: THREE.BufferGeometry;
  img: string;
}) {
  const texture = useTexture(img);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return (
    <mesh geometry={geometry} scale={0.01}>
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

// Tela escura (quando nenhuma imagem é passada)
function PlainScreen({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <mesh castShadow receiveShadow geometry={geometry} scale={0.01}>
      <meshStandardMaterial roughness={1} color="#111111" />
    </mesh>
  );
}

type IPhoneModelProps = GroupProps & {
  glb?: string;
  bodyColor?: string;
  screenImg?: string;
};

export default function IPhoneModel({
  glb = "/models/scene.glb",
  bodyColor = "#8F8A81",
  screenImg,
  ...props
}: IPhoneModelProps) {
  // gltfjsx tipa nodes/materials genericamente — mantemos frouxo de propósito.
  const { nodes, materials } = useGLTF(glb) as unknown as {
    nodes: Record<string, THREE.Mesh>;
    materials: Record<string, THREE.Material & { color?: THREE.Color }>;
  };

  useEffect(() => {
    Object.entries(materials).forEach(([name, material]) => {
      if (!KEEP_MATERIALS.has(name)) {
        material.color = new THREE.Color(bodyColor);
      }
      material.needsUpdate = true;
    });
  }, [materials, bodyColor]);

  return (
    <group {...props} dispose={null}>
      <mesh castShadow receiveShadow geometry={nodes.ttmRoLdJipiIOmf.geometry} material={materials.hUlRcbieVuIiOXG} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.DjsDkGiopeiEJZK.geometry} material={materials.PaletteMaterial001} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.buRWvyqhBBgcJFo.geometry} material={materials.PaletteMaterial002} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.MrMmlCAsAxJpYqQ_0.geometry} material={materials.dxCVrUCvYhjVxqy} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.wqbHSzWaUxBCwxY_0.geometry} material={materials.MHFGNLrDQbTNima} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.QvGDcbDApaGssma.geometry} material={materials.kUhjpatHUvkBwfM} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.vFwJFNASGvEHWhs.geometry} material={materials.RJoymvEsaIItifI} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.evAxFwhaQUwXuua.geometry} material={materials.KSIxMqttXxxmOYl} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.USxQiqZgxHbRvqB.geometry} material={materials.mcPrzcBUcdqUybC} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.TvgBVmqNmSrFVfW.geometry} material={materials.pIhYLPqiSQOZTjn} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.GuYJryuYunhpphO.geometry} material={materials.eShKpuMNVJTRrgg} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.pvdHknDTGDzVpwc.geometry} material={materials.xdyiJLYTYRfJffH} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.CfghdUoyzvwzIum.geometry} material={materials.jpGaQNgTtEGkTfo} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.DjdhycfQYjKMDyn.geometry} material={materials.ujsvqBWRMnqdwPx} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.usFLmqcyrnltBUr.geometry} material={materials.sxNzrmuTqVeaXdg} scale={0.01} />

      {/* Tela — textura opcional */}
      {screenImg ? (
        <TexturedScreen geometry={nodes.xXDHkMplTIDAXLN.geometry} img={screenImg} />
      ) : (
        <PlainScreen geometry={nodes.xXDHkMplTIDAXLN.geometry} />
      )}

      <mesh castShadow receiveShadow geometry={nodes.vELORlCJixqPHsZ.geometry} material={materials.zFdeDaGNRwzccye} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.EbQGKrWAqhBHiMv.geometry} material={materials.TBLSREBUyLMVtJa} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.EddVrWkqZTlvmci.geometry} material={materials.xNrofRCqOXXHVZt} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.KSWlaxBcnPDpFCs.geometry} material={materials.yQQySPTfbEJufve} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.TakBsdEjEytCAMK.geometry} material={materials.PaletteMaterial003} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.IykfmVvLplTsTEW.geometry} material={materials.PaletteMaterial004} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.wLfSXtbwRlBrwof.geometry} material={materials.oZRkkORNzkufnGD} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.WJwwVjsahIXbJpU.geometry} material={materials.yhcAXNGcJWCqtIS} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.YfrJNXgMvGOAfzz.geometry} material={materials.bCgzXjHOanGdTFV} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.DCLCbjzqejuvsqH.geometry} material={materials.vhaEJjZoqGtyLdo} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.CdalkzDVnwgdEhS.geometry} material={materials.jlzuBkUzuJqgiAK} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.NtjcIgolNGgYlCg.geometry} material={materials.PpwUTnTFZJXxCoE} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.pXBNoLiaMwsDHRF.geometry} material={materials.yiDkEwDSyEhavuP} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.IkoiNqATMVoZFKD.geometry} material={materials.hiVunnLeAHkwGEo} scale={0.01} />
      <mesh castShadow receiveShadow geometry={nodes.rqgRAGHOwnuBypi.geometry} material={materials.HGhEhpqSBZRnjHC} scale={0.01} />
    </group>
  );
}

// Pré-carrega o modelo padrão
useGLTF.preload("/models/scene.glb");

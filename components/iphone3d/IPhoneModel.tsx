"use client";

/*
Malha do iPhone 15 Pro Max — gerado por gltfjsx, adaptado para ser reutilizável.
Modelo original: polyman (https://sketchfab.com/Polyman_3D) — CC-BY-4.0
*/
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useGLTF, useTexture, Html } from "@react-three/drei";
import { useFrame, useThree, type GroupProps } from "@react-three/fiber";

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
// Aceita uma segunda imagem (imgAlt): ambas ficam pré-carregadas em memória e
// a troca (showAlt) é instantânea — usado pra swap de tela no meio do giro.
function TexturedScreen({
  geometry,
  img,
  imgAlt,
  showAlt = false,
}: {
  geometry: THREE.BufferGeometry;
  img: string;
  imgAlt?: string;
  showAlt?: boolean;
}) {
  const textures = useTexture(imgAlt ? [img, imgAlt] : [img]) as THREE.Texture[];
  textures.forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });
  const map = showAlt && textures[1] ? textures[1] : textures[0];
  return (
    <mesh geometry={geometry} scale={0.01}>
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

// Tela escura (quando nenhuma imagem é passada) — no modo DOM (ScreenHtml)
// também fica montada, preenchendo o recorte 3D real da tela. Importante:
// como o <Html transform occlude={false}> pinta numa camada CSS por CIMA do
// <canvas> (fora do depth buffer — não é um "atrás/na frente" em 3D, é
// compositing de camadas 2D empilhadas), esta mesh não "tapa buraco atrás do
// DOM" no sentido de z-order. O que ela cobre é: (1) a franja onde o recorte
// arredondado da malha real difere do retângulo reto do DOM (o <Html> é uma
// aproximação da bbox, não do contorno exato), e (2) o slot inteiro da tela
// quando o DOM está com visibility:hidden (giro de costas) — sem ela, esse
// vão mostraria vazio/void em vez de uma superfície de tela plausível.
function PlainScreen({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <mesh castShadow receiveShadow geometry={geometry} scale={0.01}>
      <meshStandardMaterial roughness={1} color="#111111" />
    </mesh>
  );
}

// Fator de escala aplicado a TODA a malha do corpo (ver os `scale={0.01}`
// espalhados abaixo) — usado pra converter a bbox crua da geometria (unidades
// do glTF) pro espaço local deste <group>, onde o <Html> é montado.
const MESH_SCALE = 0.01;
// Referência CSS em que PhoneScreen.tsx é construído (390×844, ~aspect do
// 15 Pro Max real). O <Html> escala esse frame pra bbox real da malha.
const SCREEN_CSS_W = 390;
const SCREEN_CSS_H = 844;
// Espaço CSS3D do drei <Html transform>: a matriz do objeto é montada com
// getObjectCSSMatrix(matrix, 1 / ((distanceFactor || 10) / 400)) — ver
// node_modules/@react-three/drei/web/Html.js. Com distanceFactor no default
// (10) esse fator é 400/10 = 40, ou seja: 1 unidade de mundo (no espaço
// local do nosso <group>) equivale a 40px CSS, não 1px. Sem compensar isso
// a tela sai exatamente 40x menor que o esperado (vira um pontinho no meio
// do vidro — foi exatamente o que apareceu no screenshot de verificação).
// Não passamos `distanceFactor` como prop pra não mexer em outros
// comportamentos do Html; compensamos aqui, na escala.
const CSS3D_PX_PER_UNIT = 40;
// Deslocamento pra fora do plano da tela (unidades cruas do geometry, antes
// do *MESH_SCALE), aplicado ao longo da normal REAL da malha. NÃO existe
// pra evitar z-fighting — com occlude={false} o <Html> pinta numa camada CSS
// própria, fora do depth buffer, então z-fighting com o vidro é IMPOSSÍVEL.
// É só uma folga cosmética pro DOM não parecer colado no plano exato da
// malha; a espessura total do aparelho é ~1.232 (medida no glb), então esse
// valor fica bem pequeno (~4%) — grande o bastante não faz diferença visual
// e só cria parallax indesejado quando o phone inclina (Pricing).
const SCREEN_Z_OFFSET = 0.05;

// Normal "média" da malha da tela, em espaço LOCAL — lida direto do atributo
// `normal` do BufferGeometry em vez de assumir que a face de frente é +Z
// (chute perigoso: no glb desse modelo a tela é plana em z=-0.616, no
// z-mínimo do corpo inteiro — a normal real é (0,0,-1), não (0,0,1)). Usada
// em dois lugares no ScreenHtml abaixo: pra orientar o <Html> (senão o DOM
// desenha de costas — ver comentário do componente) e pra deslocar a
// posição pra fora do plano da malha (SCREEN_Z_OFFSET).
function computeLocalNormal(geometry: THREE.BufferGeometry): THREE.Vector3 {
  const attr = geometry.getAttribute("normal");
  if (!attr) return new THREE.Vector3(0, 0, 1);
  const sum = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i < attr.count; i++) {
    v.fromBufferAttribute(attr, i);
    sum.add(v);
  }
  return sum.lengthSq() > 0 ? sum.normalize() : new THREE.Vector3(0, 0, 1);
}

// DOM real da tela (drei <Html transform>), ancorado no centro da bbox real
// da malha da tela — nunca chutado, sempre computado via
// geometry.computeBoundingBox(). Dois cuidados que só existem por causa da
// normal real (0,0,-1) medida no glb, não a +Z "de fábrica":
//
// 1) ORIENTAÇÃO — <Html transform> desenha o DOM olhando pro +Z LOCAL do
//    group que o contém (convenção do CSS3D: um plano sem rotação lê-se de
//    frente vindo de +Z). Se o group não girar pra alinhar +Z com a normal
//    real da malha, o plano fica de costas pra quem olha o aparelho de
//    frente — e como backface-visibility é 'visible' por padrão, isso
//    aparece como TEXTO ESPELHADO, não como sumiço. Por isso o group carrega
//    um quaternion que leva (0,0,1) até a normal real (setFromUnitVectors).
// 2) BACKFACE — no giro de 360º do ScrollPhone o DOM esconde quando a tela
//    vira de costas pra câmera. Como o group agora está orientado (1), o
//    +Z local dele já É a direção que o DOM encara — então a normal em
//    mundo pra esse teste é só (0,0,1) transformado pela orientação mundial
//    do group, sem precisar carregar localNormal separadamente até aqui.
function ScreenHtml({
  geometry,
  screen,
  screenRef,
}: {
  geometry: THREE.BufferGeometry;
  screen: ReactNode;
  screenRef?: React.RefObject<HTMLDivElement>;
}) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  // Direção em que o DOM está virado (dot > 0 com a câmera). Precisa ser
  // STATE, não escrita imperativa em div.style: o useLayoutEffect interno do
  // drei Html (node_modules/@react-three/drei/web/Html.js) roda sem array de
  // dependências e re-renderiza o div de conteúdo com `style={style}` a
  // qualquer re-render do <Html> — o que apaga qualquer style setado fora do
  // React. Como `screen` é recriado inline em cada re-render do ScrollPhone
  // (ex.: setShowAlt), isso acontecia toda hora — e podia reaparecer de
  // costas bem no instante da troca de tela, o pior momento possível.
  const [facing, setFacing] = useState(true);
  // guarda o último valor só pra não chamar setState todo frame — o estado
  // realmente vira só ~2x por giro completo, então isso é barato.
  const facingRef = useRef(true);
  // vetores/quatérnion reaproveitados entre frames — zero alocação no useFrame
  const normal = useMemo(() => new THREE.Vector3(), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const viewDir = useMemo(() => new THREE.Vector3(), []);
  const worldQuat = useMemo(() => new THREE.Quaternion(), []);

  const { position, scale, quaternion } = useMemo(() => {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox ?? new THREE.Box3();
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const n = computeLocalNormal(geometry);
    const offset = n.clone().multiplyScalar(SCREEN_Z_OFFSET);
    return {
      position: [
        (center.x + offset.x) * MESH_SCALE,
        (center.y + offset.y) * MESH_SCALE,
        (center.z + offset.z) * MESH_SCALE,
      ] as [number, number, number],
      // escala NÃO uniforme: absorve qualquer diferença entre o aspect real
      // da bbox e o aspect do frame CSS (390/844 ≈ 0.462, já bem próximo do
      // ~0.46 real do 15 Pro Max) sem esticar o conteúdo visivelmente. Z=1
      // (drei exige Vector3/tupla de 3 — a tela é plana, Z não importa).
      // *CSS3D_PX_PER_UNIT compensa a convenção px↔unidade do drei (ver
      // comentário da constante) — sem isso a tela sai 40x menor.
      scale: [
        (size.x * MESH_SCALE * CSS3D_PX_PER_UNIT) / SCREEN_CSS_W,
        (size.y * MESH_SCALE * CSS3D_PX_PER_UNIT) / SCREEN_CSS_H,
        1,
      ] as [number, number, number],
      // leva o +Z "de fábrica" do group até a normal real da malha — ver (1)
      // no comentário acima do componente.
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n),
    };
  }, [geometry]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    group.updateWorldMatrix(true, false);
    worldPos.setFromMatrixPosition(group.matrixWorld);
    group.getWorldQuaternion(worldQuat);
    normal.set(0, 0, 1).applyQuaternion(worldQuat);
    viewDir.copy(camera.position).sub(worldPos).normalize();
    // pequena margem (0.05) pra não piscar exatamente no perfil (90°)
    const next = normal.dot(viewDir) > 0.05;
    if (next !== facingRef.current) {
      facingRef.current = next;
      setFacing(next);
    }
  });

  return (
    <group ref={groupRef} position={position} quaternion={quaternion}>
      <Html
        transform
        occlude={false}
        scale={scale}
        /* POR QUE ISTO NÃO É DEFAULT, E POR QUE IMPORTA.

           O default do drei é [16777271, 0] — ele espalha a distância de câmera
           nesse intervalo e escreve o resultado como z-index no wrapper da camada
           CSS3D. Dezesseis MILHÕES põe a tela do phone acima de qualquer coisa
           que o ScrollPhone empilhe por cima do canvas: ordem de DOM só decide
           entre irmãos de mesmo z-index, e nada no overlay z-[60] tem como
           competir com esse número.

           O sintoma era a tela renderizando SECA dentro da água — nítida,
           branca, sem tinta — enquanto o corpo 3D do mesmo aparelho ia
           tingido. A tela não é WebGL (é DOM real numa camada CSS3D fora do
           canvas), então nenhum shader a alcança; quem tinge é a camada CSS de
           ScrollPhone, e ela vinha por baixo sem que ninguém percebesse.

           [10, 0] mantém o mesmo ordenamento por profundidade entre telas (só
           existe uma, mas o intervalo é o contrato do drei) e devolve a camada
           pra dentro de um alcance que a camada de tinta consegue disputar.

           ISTO SOZINHO NÃO CONSERTA NADA, e achar que sim custou um render: o
           container do canvas é position:absolute com z-index auto, logo NÃO
           cria stacking context, e este número sobe e compete direto no nível do
           overlay do ScrollPhone — onde `auto` vale 0. Medido: com [10, 0] e a
           tinta em `auto`, 10 > 0 e a tela continuava seca. O par é este teto
           mais o z-[20] do submergedEl (ver ScrollPhone.tsx); mexer num sem
           olhar o outro devolve o bug. */
        zIndexRange={[10, 0]}
        /* Em transform mode o drei encaminha este ref pro div de CONTEÚDO — o
           mesmo que recebe `style` e `className` (ver o render() dele em
           node_modules/@react-three/drei/web/Html.js). É por ele que o
           ScrollPhone borra a tela por frame quando o phone submerge: a tela é
           DOM fora do canvas, nenhum shader a alcança, e a tinta sozinha nunca
           ia dar conta porque tinta não desfoca. Ver SCREEN_WET_BLUR lá.

           `filter` aqui não quebra o CSS3D: quem carrega a matriz é o
           transformInner, o pai deste div, e este é folha da cadeia 3D (os
           filhos dele são UI 2D). Renderizado e conferido. */
        ref={screenRef}
        style={{ pointerEvents: "none", visibility: facing ? "visible" : "hidden" }}
      >
        {screen}
      </Html>
    </group>
  );
}

type IPhoneModelProps = GroupProps & {
  glb?: string;
  bodyColor?: string;
  screenImg?: string;
  /** segunda tela (pré-carregada) — trocada por showAlt */
  screenImgAlt?: string;
  /** true → mostra screenImgAlt no lugar de screenImg */
  showAlt?: boolean;
  /** DOM real (PhoneScreen) renderizado dentro da tela via <Html transform>.
   *  Tem prioridade sobre screenImg/screenImgAlt quando presente. */
  screen?: ReactNode;
  /** Ref pro div de conteúdo da tela — só faz sentido junto com `screen`.
   *  Quem escreve nele é o ScrollPhone, por frame (ver SCREEN_WET_BLUR lá). */
  screenRef?: React.RefObject<HTMLDivElement>;
};

export default function IPhoneModel({
  glb = "/models/scene.glb",
  bodyColor = "#8F8A81",
  screenImg,
  screenImgAlt,
  showAlt = false,
  screen,
  screenRef,
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

      {/* Tela — três modos: DOM real (screen, prioridade), textura estática
          com swap opcional (screenImg/screenImgAlt), ou tela escura (nenhum
          dos dois). No modo DOM, a mesh escura preenche o slot 3D real da
          tela — ver comentário de PlainScreen pro porquê exato. */}
      {screen ? (
        <>
          <PlainScreen geometry={nodes.xXDHkMplTIDAXLN.geometry} />
          <ScreenHtml geometry={nodes.xXDHkMplTIDAXLN.geometry} screen={screen} screenRef={screenRef} />
        </>
      ) : screenImg ? (
        <TexturedScreen
          geometry={nodes.xXDHkMplTIDAXLN.geometry}
          img={screenImg}
          imgAlt={screenImgAlt}
          showAlt={showAlt}
        />
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

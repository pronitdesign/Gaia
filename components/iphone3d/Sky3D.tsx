"use client";

/*
Sky3D — o gradiente do Manifesto, dentro da cena 3D, só pra água refletir.

POR QUE EXISTE: reflexão planar só reflete o que está na cena 3D. O céu do
Manifesto é um gradiente CSS, e CSS não existe pro WebGL. Sem isto a água
refletiria os Lightformers de estúdio do Lights.tsx — cinza e branco — e leria
como plástico roxo em vez de água.

SÓ PRO REFLEXO: nasce com visible=false e userData.reflectionOnly. O
onBeforeRender do WaterComplex liga durante os passes de reflexão/refração e
desliga depois. Se aparecesse no render principal, taparia o gradiente CSS de
verdade (com seu halo de aurora e seu grão) por uma cópia chapada.

POR QUE CÚPULA E NÃO UM PLANO: a primeira versão era um plano chapado atrás da
cena, espelhando o fato de que o SKY do Manifesto É um backdrop chapado. Isso é
fiel pra câmera principal e mentira pro espelho. A água se estende por centenas
de unidades em Z, e um backdrop em z=-30 deixa quase toda ela ATRÁS do céu; pior,
o reflexo rasante lança raios pra cima e pra fora, onde um plano simplesmente não
existe. O vazio voltava como uma faixa preta cruzando o horizonte. Reflexo
precisa de céu em todas as direções — logo, cúpula.

ALINHAMENTO COM O CSS: a cúpula é pintada por ELEVAÇÃO, e a elevação é convertida
na posição de tela que a câmera principal veria naquele ângulo:

    tanθ       = dir.y / |dir.xz|
    screenFrac = 0.5 · (1 - tanθ / tan(fov/2))
    gradientPos= fTop + screenFrac · (fBot - fTop)

…com fTop/fBot lidos do rect vivo da seção. Assim a cor no horizonte do reflexo é
a mesma cor que o gradiente CSS mostra na altura do horizonte, e subir na cúpula
percorre o gradiente como subir na tela. O reflexo e o fundo são o mesmo céu.
*/

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SKY_STOPS } from "@/lib/sky";

/** Raio da cúpula. Tem que englobar o plano da água inteiro (SPAN do
 *  WaterScene) com folga, senão a água volta a existir fora do céu. */
const RADIUS = 4000;

const TEX_H = 1024;

function useSkyTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d")!;
    // canvas interpola em sRGB entre stops, igual ao linear-gradient do CSS —
    // é por isso que o céu do reflexo casa com o fundo sem correção de cor.
    const g = ctx.createLinearGradient(0, 0, 0, TEX_H);
    SKY_STOPS.forEach((s) => g.addColorStop(s.pos, s.color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1, TEX_H);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, []);
}

export default function Sky3D() {
  const tex = useSkyTexture();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTex: { value: tex },
          uFTop: { value: 0 },
          uFBot: { value: 1 },
          uTanHalfFov: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            // direção do centro da cúpula até o fragmento, em espaço de mundo.
            // A cúpula é enorme, então isto aproxima muito bem a direção do
            // olho — e é o que faz a pintura depender só do ângulo.
            vDir = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uTex;
          uniform float uFTop;
          uniform float uFBot;
          uniform float uTanHalfFov;
          varying vec3 vDir;

          void main() {
            vec3 d = normalize(vDir);
            // tangente da elevação. O max() no denominador evita divisão por
            // zero exatamente no zênite/nadir, onde |d.xz| colapsa.
            float tanElev = d.y / max(length(d.xz), 1e-4);
            // qual altura de tela a câmera principal veria neste ângulo
            float screenFrac = 0.5 * (1.0 - tanElev / uTanHalfFov);
            screenFrac = clamp(screenFrac, 0.0, 1.0);
            // …e qual fração do gradiente da seção mora naquela altura
            float g = mix(uFTop, uFBot, screenFrac);
            // a textura tem a linha 0 = stop 0; com flipY o topo cai em v=1
            gl_FragColor = texture2D(uTex, vec2(0.5, 1.0 - clamp(g, 0.0, 1.0)));
          }
        `,
      }),
    [tex],
  );

  useEffect(() => {
    return () => {
      material.dispose();
      tex.dispose();
    };
  }, [material, tex]);

  useFrame(() => {
    const section = document.querySelector<HTMLElement>("[data-water-start]")
      ?.parentElement;
    if (!section) return;
    const r = section.getBoundingClientRect();
    if (r.height === 0) return;
    material.uniforms.uFTop.value = (0 - r.top) / r.height;
    material.uniforms.uFBot.value = (window.innerHeight - r.top) / r.height;
    material.uniforms.uTanHalfFov.value = Math.tan(
      (camera.fov * Math.PI) / 180 / 2,
    );
  });

  return (
    <mesh
      material={material}
      renderOrder={-1}
      visible={false}
      userData={{ reflectionOnly: true }}
    >
      <sphereGeometry args={[RADIUS, 32, 24]} />
    </mesh>
  );
}

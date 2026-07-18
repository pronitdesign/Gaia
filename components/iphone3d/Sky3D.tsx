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
na posição de tela que a câmera PRINCIPAL veria naquele ângulo:

    θ          = atan(dir.y, |dir.xz|)        ← elevação no MUNDO
    screenFrac = 0.5 · (1 - tan(θ - pitch) / tan(fov/2))
    gradientPos= fTop + screenFrac · (fBot - fTop)

…e a textura é o céu COMPOSTO do viewport, repintada por frame (ver
useSkyTexture): linha da textura = altura de tela, cor = o gradiente da seção
que estiver ali (Mergulho ou Manifesto — a mesma regra do FogSync). Assim a cor
no horizonte do reflexo é a mesma cor que o CSS mostra na altura do horizonte,
em QUALQUER frame da travessia — inclusive na entrada, quando quem está em
quadro ainda é o Manifesto. O reflexo e o fundo são o mesmo céu.

O `- pitch` existe porque a câmera INCLINA no mergulho (ver ScrollPhone). Sem ele
o céu escorregaria em relação ao gradiente CSS justamente no momento em que se
está olhando pra ele.

E repare que a conta parte da direção no MUNDO, não no espaço da câmera. Céu é
céu: a cor numa direção não pode depender de quem olha. Quem amostra esta cúpula
é a câmera ESPELHADA da reflexão — se a cor viesse do espaço de câmera, o reflexo
mostraria um céu diferente do céu. `uPitch` é um escalar da câmera principal,
igual pros dois passes, e é isso que mantém os dois honestos.
*/

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DIVE_STOPS, SKY_STOPS, sampleStops } from "@/lib/sky";

/** Raio da cúpula. Tem que englobar o plano da água inteiro (SPAN do
 *  WaterScene) com folga, senão a água volta a existir fora do céu. */
const RADIUS = 4000;

const TEX_H = 1024;

/* O CÉU DO DOMO É O CÉU COMPOSTO DA PÁGINA, REPINTADO POR FRAME — e isso
   conserta a ENTRADA da água.

   A versão anterior era uma textura ESTÁTICA dos DIVE_STOPS, mapeada no rect da
   seção do Mergulho por uFTop/uFBot. Funcionava no pico (o Mergulho em quadro) e
   quebrava na entrada, medido @1440×900, frac 1.15–1.35: o rect do Mergulho está
   ABAIXO do viewport, uFTop/uFBot resolvem negativos, o clamp satura tudo em g=0
   e o domo INTEIRO vira o primeiro stop chapado (#C0B0D7). A água nascia
   espelhando lavanda pálida uniforme SOB um céu de DOM que ainda é o roxo escuro
   do Manifesto — a banda dura no horizonte e o "mar de nuvens" sem textura eram
   isso: o reflexo mostrando um céu que não existia em quadro. O contrato do
   cabeçalho ("o reflexo e o fundo são o mesmo céu") estava implementado pra UMA
   seção só.

   Agora a textura é o que o CSS realmente mostra em cada altura do viewport:
   linha i = fração de tela i/TEX_H, cor = o gradiente da seção que estiver
   naquela altura — a MESMA regra de composição do FogSync em ScrollPhone
   (Mergulho, senão Manifesto, senão as bordas). Se mexer numa das duas listas
   de prioridade, mexa na outra. Acima do viewport o clamp repete a linha 0 e
   abaixo repete a última — pro espelho rasante, que amostra elevações fora do
   quadro, isso é a continuação natural do gradiente.

   Repintar custa 1×1024 sampleStops + um upload de 4KB, e SÓ quando os rects
   se moveram (a chave de cache corta os frames parados). É ordens de grandeza
   mais barato que os passes de reflexão que esta cena já paga. */
function useSkyTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d")!;
    // sampleStops interpola em sRGB entre stops, igual ao linear-gradient do
    // CSS — é por isso que o céu do reflexo casa com o fundo sem correção.
    const img = ctx.createImageData(1, TEX_H);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    let cacheKey = "";
    /** Repinta a coluna com o céu composto do viewport atual. */
    const repaint = () => {
      const dive = document.querySelector<HTMLElement>("[data-sky-dive]");
      const manifesto = document.querySelector<HTMLElement>(
        "[data-sky-manifesto]",
      );
      const dr = dive?.getBoundingClientRect() ?? null;
      const mr = manifesto?.getBoundingClientRect() ?? null;
      const H = window.innerHeight;
      const key = `${dr?.top.toFixed(1)}|${mr?.top.toFixed(1)}|${H}`;
      if (key === cacheKey) return;
      cacheKey = key;

      const data = img.data;
      for (let i = 0; i < TEX_H; i++) {
        const y = (i / (TEX_H - 1)) * H;
        let rgb: [number, number, number] | null = null;
        // mesma ordem do pick() do FogSync: o Mergulho tem prioridade, o
        // Manifesto responde pelo resto, e fora dos dois valem as bordas —
        // abaixo da aresta o céu É a cor da linha d'água (DIVE t=1).
        if (dr && dr.height > 0 && y >= dr.top && y <= dr.bottom) {
          rgb = sampleStops(DIVE_STOPS, (y - dr.top) / dr.height);
        } else if (mr && mr.height > 0 && y >= mr.top && y <= mr.bottom) {
          rgb = sampleStops(SKY_STOPS, (y - mr.top) / mr.height);
        } else if (dr && y > dr.bottom) {
          rgb = sampleStops(DIVE_STOPS, 1);
        } else if (mr && y < mr.top) {
          rgb = sampleStops(SKY_STOPS, 0);
        } else {
          rgb = sampleStops(DIVE_STOPS, 1);
        }
        data[i * 4] = Math.round(rgb[0] * 255);
        data[i * 4 + 1] = Math.round(rgb[1] * 255);
        data[i * 4 + 2] = Math.round(rgb[2] * 255);
        data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      tex.needsUpdate = true;
    };

    return { tex, repaint };
  }, []);
}

export default function Sky3D() {
  const { tex, repaint } = useSkyTexture();
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
          uPitch: { value: 0 },
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
          uniform float uPitch;
          varying vec3 vDir;

          void main() {
            vec3 d = normalize(vDir);
            // elevação no MUNDO. O max() evita o atan degenerar no zênite/nadir,
            // onde |d.xz| colapsa.
            float elev = atan(d.y, max(length(d.xz), 1e-4));
            // qual altura de tela a câmera principal veria neste ângulo — com a
            // inclinação dela descontada, senão o céu escorrega no mergulho
            float screenFrac = 0.5 * (1.0 - tan(elev - uPitch) / uTanHalfFov);
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
    /* A textura agora JÁ é o viewport (linha 0 = topo da tela, última = base),
       então o mapeamento uFTop/uFBot virou identidade: screenFrac amostra
       direto. Quem acompanha o scroll é o repaint(), não os uniforms. */
    repaint();
    material.uniforms.uFTop.value = 0;
    material.uniforms.uFBot.value = 1;
    material.uniforms.uTanHalfFov.value = Math.tan(
      (camera.fov * Math.PI) / 180 / 2,
    );
    // pitch da câmera PRINCIPAL. Escalar, igual pros dois passes de render —
    // ver o cabeçalho: é o que impede o reflexo de ver um céu diferente do céu.
    material.uniforms.uPitch.value = camera.rotation.x;
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

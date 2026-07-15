"use client";

/*
WaterScene — a água do Manifesto e o céu que ela reflete.

Vive DENTRO do Canvas do ScrollPhone, e não num canvas próprio, por uma razão
dura: reflexão planar reflete a cena em que está. Água num canvas separado
refletiria um mundo sem iPhone. Phone e água têm que dividir a cena, e é isso
que forçou o canvas do ScrollPhone a virar viewport inteiro.

GEOMETRIA — por que a água mora na metade de baixo:
A câmera é nivelada (posição [0,0,4], sem pitch). Pra uma câmera nivelada, o
horizonte de um plano horizontal cai SEMPRE na altura do olho — o centro exato
da tela — independente da altura do plano. Então a água ocupa a metade de baixo
e converge pro meio. É o escorço clássico de oceano, e sai de graça: não
precisou inclinar câmera nem re-enquadrar o phone.

Consequência: o plano tem que ficar ABAIXO da linha do olho (y < 0). Se subir
acima, a câmera vê o plano por baixo e a ilusão morre. Daí o clamp em Y_CEIL.

ONDE A LINHA D'ÁGUA CAI: rastreia [data-water-start] no Manifesto. Conforme a
âncora sobe na tela, o plano sobe até rasar a linha do olho — e quanto mais
rasante, mais o Fresnel puxa pro reflexo. A água fica espelhada sozinha, por
física, no fim do curso. Não é um efeito roteirizado.
*/

import { useContext, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import WaterSurfaceComplex from "@/components/iphone3d/water/WaterSurfaceComplex";
import RippleFX from "@/components/iphone3d/water/InteractiveFX/RippleFX";
import { WaterContext } from "@/components/iphone3d/water/WaterContext";

export type WaterState = {
  /** 0→1: quanto da água mostrar. 0 = ausente. */
  amount: number;
};

/* Altura da superfície no mundo. FIXA — quem se move é a câmera.

   A primeira versão perseguia a âncora do DOM com o plano, e isso estava errado
   de raiz: subir o plano até a linha do olho põe a água no meio da tela e
   AFOGA o phone, porque o horizonte de um plano horizontal cai sempre na altura
   do olho, não importa a altura do plano. A água não sobe — a câmera desce.
   Ver O MERGULHO em ScrollPhone.tsx.

   Com y = -1.2, CAM_Z = 4 e fov 50°, a linha d'água cruza a profundidade do
   phone a ~74% da tela: ele entra lá embaixo, fica seco acima e reflete logo
   abaixo. */
export const WATER_Y = -1.2;

/** Tamanho do plano. Precisa ser grande o bastante pra borda de trás colapsar
 *  DENTRO do horizonte — em 190 ela parava ~12px abaixo dele e aparecia como
 *  uma aresta reta escura atravessando a tela. */
const SPAN = 900;

/* Tinta da água. O upstream multiplica a cor por cima do mix reflexo/refração,
   então cor saturada aqui não "colore a água": ela ESCURECE tudo que a água
   mostra, e o reflexo do phone desaparece dentro do roxo. Um tom claro deixa o
   reflexo mandar e a cor só assinar — que é o que água faz.

   Calibrada contra o submerso do Pricing (Underwater.tsx, uDeep #A08FC4 sobre
   creme): mergulhar tem que ser uma passagem contínua de tom, não um baque. A
   superfície vista de cima é mais clara que a água vista de dentro, então este
   tom fica um degrau acima daquele. Se mexer num, olhe o outro. */
const WATER_COLOR = "#DDD4EC";

/* Escreve u_amount na material da água. Precisa ser FILHO do
   WaterSurfaceComplex, porque é ele quem provê o WaterContext com o ref da
   mesh — mesma via que o RippleFX usa pra escrever u_fx. */
function WaterAmount({ stateRef }: { stateRef: React.MutableRefObject<WaterState> }) {
  const { ref } = useContext(WaterContext);
  useFrame(() => {
    const m = ref?.current?.material;
    if (m?.uniforms?.u_amount) m.uniforms.u_amount.value = stateRef.current.amount;
  });
  return null;
}

export default function WaterScene({
  stateRef,
}: {
  stateRef: React.MutableRefObject<WaterState>;
}) {
  const holder = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);

  // O plano é enorme e a cena é pequena: a escala do render target não precisa
  // acompanhar a tela inteira. 1024 é o piso do que resolve as normais sem
  // serrilhar o reflexo do phone.
  const dimensions = useMemo(() => (size.width > 1800 ? 2048 : 1024), [size.width]);

  useFrame(() => {
    const g = holder.current;
    if (!g) return;
    g.visible = stateRef.current.amount > 0.001;
  });

  return (
    <group ref={holder} position={[0, WATER_Y, 0]} visible={false}>
      <WaterSurfaceComplex
        width={SPAN}
        length={SPAN}
        dimensions={dimensions}
        color={WATER_COLOR}
        // scale = quantas vezes a normal map repete no plano. Como SPAN subiu
        // pra 900, subir junto mantém as ondas do mesmo tamanho na tela — senão
        // elas esticariam em borrões do tamanho do oceano.
        scale={18}
        flowDirection={[1.0, 0.35]}
        flowSpeed={0.02}
        // reflectivity alimenta o termo de Fresnel: quanto o reflexo ganha da
        // refração. Perto de 1 vira espelho puro (lê como vidro); baixo demais e
        // o reflexo do phone some.
        reflectivity={0.6}
        fxDistortionFactor={0.06}
        fxDisplayColorAlpha={0.0}
      >
        <WaterAmount stateRef={stateRef} />
        {/* rastro de ondas no ponteiro. É o filho que preenche u_fx — sem ele o
            uniform cai no fallback 1×1 preto (ver WaterComplex, `// fx`). */}
        <RippleFX />
      </WaterSurfaceComplex>
    </group>
  );
}

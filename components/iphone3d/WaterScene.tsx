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

import { useContext, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import WaterSurfaceComplex from "@/components/iphone3d/water/WaterSurfaceComplex";
import RippleFX from "@/components/iphone3d/water/InteractiveFX/RippleFX";
import { WaterContext } from "@/components/iphone3d/water/WaterContext";

export type WaterState = {
  /** 0→1: quanto da água mostrar. 0 = ausente. */
  amount: number;
  /** 1 = mar correndo, 0 = parado. A entrega (ver deliver() em ScrollPhone)
   *  trava o fluxo no instante em que o phone toca a superfície — congelar
   *  em vez de deixar o flow map continuar é o que faz o pico do mergulho
   *  ler como um FRAME, não como uma travessia que segue rolando embaixo do
   *  usuário enquanto a câmera automática o leva pro pouso. */
  flow: number;
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

   Mas claro NÃO é o mesmo que sem cor. Já esvaziei este tom até a água virar um
   campo pálido chapado — e a cor não vinha de volta mexendo aqui, porque no
   rasante quem manda é o reflexo (ver DIVE_STOPS em lib/sky). Os dois juntos é
   que pintam: o céu dá a cor, este tom assina.

   Calibrada contra o submerso do Pricing: mergulhar tem que ser passagem
   contínua de tom, não baque. A superfície vista de cima é mais clara que a água
   vista de dentro, então este tom fica um degrau acima daquele. Se mexer num,
   olhe o outro.

   ATENÇÃO — a calibragem está MEIA: este tom ainda é lavanda, e o submerso do
   Pricing virou AZUL (Underwater.tsx, uDeep #7FA3CE sobre o céu de
   PRICING_STOPS). A passagem não quebrou porque o DIVE_STOPS resolve em creme
   antes da emenda, então as duas cores não se encostam — mas a água do Mergulho
   e a do Pricing deixaram de ser a mesma água. Se o Pricing azul ficar, este tom
   é o próximo a virar. */
const WATER_COLOR = "#B7A6D3";

/* Velocidade do flow map. Constante de MÓDULO, não prop viva do JSX: a config
   do WaterSurfaceComplex é um useMemo cujas deps reconstroem os dois render
   targets — variar isto por frame (que é o que a entrega precisa) recriaria a
   água inteira a 60fps. Quem varia por frame é o campo `flowSpeed` da MESH
   (ver WaterAmount), não este número; ele só fixa o ritmo de quando o mar
   está correndo. */
const FLOW_SPEED = 0.02;

/* Onde a água dissolve na página, em distância do olho — ver u_fade em
   WaterComplex pra POR QUE isto existe e por que a névoa não dá conta.

   Os números saem da geometria da câmera, não do gosto. No pico o olho está a
   ~0.38 acima da superfície, então a altura na tela é atan(0.38/r): r=12 cai a
   ~1.8° abaixo do horizonte (y≈212 num viewport de 900) e r=40 a ~0.5° (y≈190).
   A dissolução inteira mora nesses ~22px logo abaixo do horizonte — que é
   exatamente onde a borda dura do plano aparecia. Fora dessa faixa a água é
   cheia, e o phone cruza a ~4 do olho, bem dentro do cheio.

   Constante de MÓDULO, não literal inline: a config do WaterSurfaceComplex é um
   useMemo cujas deps reconstroem a água inteira (dois render targets). */
const WATER_FADE: [number, number] = [12, 40];

/* Escreve u_amount na material da água. Precisa ser FILHO do
   WaterSurfaceComplex, porque é ele quem provê o WaterContext com o ref da
   mesh — mesma via que o RippleFX usa pra escrever u_fx. */
function WaterAmount({ stateRef }: { stateRef: React.MutableRefObject<WaterState> }) {
  const { ref } = useContext(WaterContext);
  const scene = useThree((s) => s.scene);

  /* Força o recompile depois que a névoa existe na cena.

     O three decide o `#define USE_FOG` no PRIMEIRO compile do programa, olhando
     scene.fog naquele instante, e não revisita. A material da água é criada no
     useMemo do WaterSurfaceComplex — pode compilar antes do <fog> attachar — e
     aí o #include <fog_fragment> do shader vira no-op para sempre. O sintoma é
     cruel: nenhum erro, os uniforms de fog existem, e a água simplesmente ignora
     a névoa. Medido: a água distante ficava em 219,216,211 quando a névoa mandava
     243,240,241.

     needsUpdate força o programa a ser reconstruído já com a névoa na cena. */
  useEffect(() => {
    const m = ref?.current?.material;
    if (m && scene.fog) m.needsUpdate = true;
  }, [ref, scene.fog]);

  useFrame(() => {
    const m = ref?.current?.material;
    if (!m?.uniforms?.u_amount) return;
    /* A água chega OPACA depressa.

       O fade linear (amount = dive) mantinha a superfície translúcida em quase
       todo o mergulho, e água meio transparente não lê como água: lê como um véu
       cinza lavando a cena inteira — sem horizonte, sem reflexo, tudo pálido.
       Era a "espaço em branco".

       O alpha existe só pra ela não POPAR nas bordas da janela, onde ela está
       saindo de quadro de qualquer jeito. Dentro do mergulho ela é opaca, e é a
       CÂMERA chegando nela que faz a chegada — não a transparência. */
    const d = stateRef.current.amount;
    const t = Math.min(1, Math.max(0, d / 0.22));
    m.uniforms.u_amount.value = t * t * (3 - 2 * t);

    /* O mesh (não a config do useMemo) é quem recebe o campo mutável — ver o
       comentário de FLOW_SPEED. Multiplicar por `flow` é o que congela o mar
       no pico da entrega sem tocar no clock interno do WaterComplex: ele
       segue descontando delta a cada frame, só que contra um flowSpeed=0, e
       por isso não acumula salto pra quando o fluxo voltar. */
    const mesh = ref?.current;
    if (mesh) mesh.flowSpeed = FLOW_SPEED * stateRef.current.flow;
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
        flowSpeed={FLOW_SPEED}
        // reflectivity alimenta o termo de Fresnel: quanto o reflexo ganha da
        // refração. Perto de 1 vira espelho puro (lê como vidro); baixo demais e
        // o reflexo do phone some.
        //
        // Baixado de 0.6 → 0.35, e isto foi MEDIDO contra a queixa "capinha",
        // não escolhido por gosto. A tentativa óbvia — subir pra 0.88, virar
        // quase espelho — foi renderizada e REJEITADA: no render, o degrau
        // continuava exatamente no mesmo lugar, cortando o corpo do phone; só
        // trocou de tom (de tingido pra mais prateado). Reflectivity alta não
        // esconde o submerso, só troca a cor da laje. Não subir este número de
        // volta achando que é regressão — já foi tentado.
        //
        // 0.35 vai no sentido contrário: MAIS refração, não menos. É a
        // refração (não o reflexo) que deixa o corpo submerso aparecer com
        // distorção de onda em vez de um corte reto — e é essa distorção,
        // mais a normal map do WaterSurfaceComplex, que quebra a linha do
        // horizonte em vez de deixá-la um degrau duro atravessando o quadro.
        // A ondulação que isso traz na superfície é INTENCIONAL: é o que faz
        // a água ler como água, não como vidro. Ver o ataque ao tingimento em
        // WaterComplex.ts (`base = mix(tintedRefract, ...)`), que anda junto
        // com esta mudança — sem ele, mais refração só mostraria mais do
        // aparelho pintado de WATER_COLOR, o mesmo bug com o dial invertido.
        reflectivity={0.35}
        fxDistortionFactor={0.06}
        fxDisplayColorAlpha={0.0}
        fade={WATER_FADE}
      >
        <WaterAmount stateRef={stateRef} />
        {/* rastro de ondas no ponteiro. É o filho que preenche u_fx — sem ele o
            uniform cai no fallback 1×1 preto (ver WaterComplex, `// fx`). */}
        <RippleFX />
      </WaterSurfaceComplex>
    </group>
  );
}

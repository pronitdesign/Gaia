"use client";

/*
Depth — as coisas contra as quais a câmera se move.

POR QUE ISTO EXISTE, e é a coisa mais importante desta cena:

Movimento de câmera só é perceptível por deslocamento RELATIVO. Antes disto a
cena tinha três elementos, e nenhum dos três conseguia reportar a câmera:

  1. o PHONE é reposicionado por frame a partir da matriz da câmera, a distância
     constante CAM_Z (ScrollPhone, placeWorld) — a câmera desce e inclina, e o
     código desfaz isso no assunto. Ele é o único objeto legível em quadro e é,
     por construção, incapaz de denunciar a câmera.
  2. a ÁGUA é um plano uniforme. Andar sobre um plano infinito e uniforme não
     muda um pixel: não há nada nele pra deslocar contra.
  3. o CÉU é uma cúpula. Infinito por definição, imune a translação.

Resultado: a câmera mergulhava de verdade e a tela não sabia. Sobrava um recorte
de phone sobre um fundo que trocava de cor — o que lia como amador.

A referência (peachweb.io) não resolve isso com shader nem com pós. Medido: DOF
desligado, vignette desligada, bloom 0.2, e a NÉVOA DESLIGADA. O que ela tem é
POPULAÇÃO — peixe, colinas, grama, bolhas em muitas profundidades. Cada objeto é
um medidor de câmera. O segredo nunca foi o efeito; foi ter onde deslocar.

REGRA DE OURO DESTE ARQUIVO: tudo aqui é FIXO NO MUNDO. Nada pode ser filho do
grupo do phone nem derivar da posição da câmera — no instante em que derivar,
vira mais um objeto que não reporta movimento, e o arquivo perde a razão de
existir.

As dunas fazem um segundo trabalho de graça: elas OCLUEM o encontro do plano com
o céu. É assim que a peachweb nunca precisou esconder o horizonte — ele
simplesmente não aparece. Foram gastas várias rodadas caçando aquela linha; a
resposta era tapá-la com paisagem.
*/

import { useMemo } from "react";
import * as THREE from "three";
import { WATER_Y } from "@/components/iphone3d/WaterScene";

/** PRNG determinístico (mulberry32). Math.random daria uma cena diferente a cada
 *  montagem — e a montagem acontece toda vez que a janela do mergulho abre. */
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* Os escalões. O que importa não é a estética — é que existam profundidades
   DIFERENTES: dois objetos a distâncias diferentes deslizam a velocidades
   diferentes quando a câmera se move, e essa diferença É a leitura de
   "a câmera se moveu". Um escalão só não produz paralaxe. */
const TIERS = [
  { seed: 7, count: 26, z: [2, -22] as const, size: [0.035, 0.11] as const },
  { seed: 21, count: 22, z: [-22, -70] as const, size: [0.12, 0.34] as const },
  { seed: 53, count: 14, z: [-70, -170] as const, size: [0.4, 0.9] as const },
];

/** Bolhas de vidro, instanciadas — os medidores de câmera. 1 draw call por
 *  escalão. Espalhadas em Y em torno da linha d'água pra também darem escala a
 *  ela: um plano uniforme não tem tamanho até algo o cruzar. */
function Bubbles({ tier }: { tier: (typeof TIERS)[number] }) {
  const { geometry, material, matrices } = useMemo(() => {
    const r = rng(tier.seed);
    const mats: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    for (let i = 0; i < tier.count; i++) {
      const z = tier.z[0] + (tier.z[1] - tier.z[0]) * r();
      // largura cresce com a distância pra manter densidade aparente na tela
      const spread = 3 + Math.abs(z) * 0.55;
      const x = (r() - 0.5) * 2 * spread;
      const y = WATER_Y + 0.15 + r() * (1.9 + Math.abs(z) * 0.06);
      const s = tier.size[0] + (tier.size[1] - tier.size[0]) * r();
      m.makeTranslation(x, y, z);
      m.scale(new THREE.Vector3(s, s, s));
      mats.push(m.clone());
    }
    return {
      geometry: new THREE.SphereGeometry(1, 12, 10),
      /* Vidro barato: nada de transmission (custaria outro render target por
         bolha). Alta reflexão sobre o Environment já lê como bolha nesta escala,
         e o que importa aqui é a POSIÇÃO delas, não o material. */
      material: new THREE.MeshStandardMaterial({
        color: "#F1ECF8",
        roughness: 0.08,
        metalness: 0.0,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
      matrices: mats,
    };
  }, [tier]);

  return (
    <instancedMesh
      args={[geometry, material, matrices.length]}
      frustumCulled={false}
      ref={(inst) => {
        if (!inst) return;
        matrices.forEach((mm, i) => inst.setMatrixAt(i, mm));
        inst.instanceMatrix.needsUpdate = true;
      }}
    />
  );
}

/* As dunas — silhuetas opacas ao fundo.

   Duas funções, ambas essenciais:
   1. são o escalão MAIS distante, e portanto o que mais denuncia a rotação da
      câmera (o que está longe desliza devagar; o contraste com as bolhas de
      perto é a paralaxe);
   2. OCLUEM o horizonte. A borda do plano d'água morre atrás delas e deixa de
      ser um problema — em vez de escondida, ela some.

   Cor por perspectiva aérea: quanto mais longe, mais perto do céu. Sem isso elas
   leem como adesivo colado no fundo. */
const DUNES: { pos: [number, number, number]; scale: [number, number, number]; color: string }[] = [
  { pos: [-13, WATER_Y - 0.15, -95], scale: [30, 2.4, 12], color: "#A896C6" },
  { pos: [16, WATER_Y - 0.2, -150], scale: [42, 3.1, 14], color: "#B4A4CF" },
  { pos: [-4, WATER_Y - 0.25, -230], scale: [66, 4.0, 18], color: "#BEAFD6" },
];

function Dunes() {
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 40, 20), []);
  return (
    <>
      {DUNES.map((d, i) => (
        <mesh key={i} geometry={geometry} position={d.pos} scale={d.scale}>
          {/* basic + fog: elas são silhueta, não superfície. Luz nelas só ia
              revelar que são esferas achatadas. A névoa ainda as pega, que é o
              que integra elas à distância. */}
          <meshBasicMaterial color={d.color} fog />
        </mesh>
      ))}
    </>
  );
}

export default function Depth() {
  return (
    <group>
      <Dunes />
      {TIERS.map((t) => (
        <Bubbles key={t.seed} tier={t} />
      ))}
    </group>
  );
}

"use client";

/*
Underwater — o ambiente submerso do Pricing.

Depois de cruzar a superfície no fim do Manifesto, o leitor está DENTRO da água.
Esta é a camada que sustenta isso: cáusticas (a rede de luz que a superfície
projeta), raios de sol descendo e partículas subindo.

ONDE VIVE, E POR QUÊ: dentro do slot AMBIENTE do Pricing (absolute inset-0,
atrás do conteúdo), e NÃO no Canvas do ScrollPhone. O canvas do phone é z-[60],
por cima da página inteira — o submerso lá taparia os cards e o preço. Aqui ele
fica atrás, e os cards flutuam limpos por cima, como se tivessem ar dentro.

POR QUE A ÁGUA É CLARA: os cards do Pricing são "vidro claro frosted sobre o
fundo neutro-50" e o CTA é uma pill ESCURA desenhada pra viver sobre creme. Água
funda e escura apagaria a pill contra o fundo e mataria a legibilidade do preço.
Então isto é água RASA: logo abaixo de uma superfície iluminada, pálida e
luminosa. A profundidade vem da luz, não do escuro — a mesma régua que faz o céu
da seção ser claro em cima (ver PRICING_STOPS em lib/sky) em vez de escurecer
pra cima como um céu de verdade.

E ela é AZUL desde que a seção ganhou céu próprio. Antes esta camada era o único
pigmento do Pricing e tingia o creme do body de lavanda; hoje o azul vem do céu
e ela só assina por cima. Ver uDeep.

BLEND — e a lição que veio junto: `multiply`, não `screen`.

O primeiro palpite foi somar luz com `screen`, raciocinando "cáustica é luz".
Sobre o neutro-50 (#FAF9F5, quase branco) isso é matematicamente identidade:
screen só clareia, e o fundo já está no teto. Não aparecia nada — e não ia
aparecer nunca.

O erro não era só de blend, era de física. Debaixo d'água sobre fundo CLARO a
cáustica não é luz adicionada: é onde o fundo aparece limpo, e ENTRE os fios é
que a água tinge. O efeito é subtrativo. Então a camada é branca nas cristas
(multiply por branco = nada muda) e lavanda entre elas — a rede emerge como
ausência de tinta. É assim que se lê areia clara vista de dentro d'água.

Como multiply nunca clareia, o preço e a pill escura mantêm o contraste: no pior
caso a água tinge, jamais lava.
*/

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import * as THREE from "three";

/* vUv sai do POSITION, não do atributo uv — o ScreenQuad do drei não tem uv.
   A geometria dele é literalmente um triângulo de 3 vértices com um único
   atributo:

     geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 2))

   Ler `uv` ali devolve um valor constante (o atributo não existe, e o three
   declara a variável mesmo assim), e cáustica com coordenada constante é um
   valor único: a tela inteira vira uma cor chapada. Foi exatamente o sintoma —
   e enganava, porque o shader estava certo e renderizava. Derivar de position
   não depende de atributo nenhum.

   O triângulo cobre a tela com vértices em -1 e 3, então (position+1)/2 dá
   vUv ∈ [0,2] e a região visível cai em [0,1]. */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = (position.xy + 1.0) * 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/* Cáusticas — o padrão clássico de "Seascape/Caustics" do Shadertoy (domínio da
   comunidade; a linhagem usual é creditada a TDM/Dave_Hoskins). Um ponto é
   realimentado por senos e cossenos de si mesmo, e a soma dos inversos das
   distâncias forma as cristas de luz.

   A recorrência é `i = p + vec2(...)` — SEMPRE reancorada em p. Não é `i = i -
   ...`: essa variação diverge, e como o resultado passa por pow(abs(c), 8.0), a
   menor deriva de magnitude vira zero absoluto e a tela fica preta. Já
   aconteceu. Se for mexer, cheque a magnitude ANTES do pow.

   - ITER   → quantas dobras. Mais = rede mais fina e mais cara.
   - inten  → espessura das cristas. Menor = fio mais fino e mais brilhante.
   - uAspect→ sem ele o padrão estica junto com a janela e vira listra. */
const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;
  uniform vec3  uLight;
  uniform vec3  uDeep;
  uniform float uIntensity;

  const int ITER = 5;
  const float TAU = 6.28318530718;

  float caustics(vec2 uvIn, float t) {
    // mod(·, TAU) - 250 é do original: leva o domínio pra uma região onde os
    // senos batem bem e o padrão não repete de forma óbvia.
    vec2 p = mod(uvIn * TAU, TAU) - 250.0;
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;

    for (int n = 0; n < ITER; n++) {
      float tt = t * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      c += 1.0 / length(vec2(
        p.x / (sin(i.x + tt) / inten),
        p.y / (cos(i.y + tt) / inten)
      ));
    }
    c /= float(ITER);
    c = 1.17 - pow(c, 1.4);
    return clamp(pow(abs(c), 8.0), 0.0, 1.0);
  }

  // ruído barato pras partículas
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = vec2(uv.x * uAspect, uv.y);

    // A rede de luz. Duas passadas em escalas e velocidades diferentes: uma só
    // lê como padrão de proteção de tela; duas se batem e leem como água.
    float c1 = caustics(p * 1.2, uTime * 0.30);
    float c2 = caustics(p * 2.1 + 8.0, uTime * -0.21);
    float net = max(c1, c2 * 0.65);

    // Cáustica é luz da SUPERFÍCIE: mais forte perto dela (topo da seção) e
    // dissolvendo conforme desce. É esse gradiente que dá sensação de fundo.
    float depth = smoothstep(0.0, 0.95, 1.0 - uv.y);
    net *= mix(1.0, 0.25, depth);

    // Raios de sol: bandas verticais lentas, mais visíveis no alto.
    float rays =
      (sin(uv.x * 9.0 + uTime * 0.12) * 0.5 + 0.5) *
      (sin(uv.x * 3.4 - uTime * 0.07) * 0.5 + 0.5);
    rays *= smoothstep(0.0, 0.7, uv.y) * 0.16;

    // Partículas em suspensão, subindo devagar. Grid + hash: barato e não
    // repete de forma óbvia na escala em que aparece.
    vec2 gp = vec2(uv.x * uAspect, uv.y) * 26.0;
    gp.y -= uTime * 0.09;
    vec2 cell = floor(gp);
    vec2 f = fract(gp) - 0.5;
    float rnd = hash(cell);
    float mote = smoothstep(0.06, 0.0, length(f - (vec2(rnd, hash(cell + 7.0)) - 0.5) * 0.6));
    mote *= step(0.93, rnd) * 0.5;

    // SUBTRATIVO (ver BLEND no cabeçalho): branco = não mexe, uDeep = tinge.
    // A cáustica limpa a tinta; entre os fios a água colore.
    vec3 shade = mix(uDeep, uLight, net);

    // raios e partículas também "limpam" — são luz chegando, logo menos tinta
    shade = mix(shade, uLight, clamp(rays + mote, 0.0, 1.0));

    // uIntensity dosa o efeito inteiro contra o branco neutro do multiply
    vec3 outCol = mix(uLight, shade, uIntensity);
    gl_FragColor = vec4(outCol, 1.0);
  }
`;

function Caustics({ reduce }: { reduce: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      // uLight tem que ser BRANCO PURO: é o neutro do multiply, o valor que
      // deixa o fundo intacto sob as cristas da cáustica.
      uLight: { value: new THREE.Color("#FFFFFF") },
      /* A tinta da água entre os fios. TEAL, não mais periwinkle (#7FA3CE) —
         e antes disso já tinha sido lavanda (#A08FC4).

         Enquanto a seção não tinha fundo próprio, esta cor era a única coisa
         pintando o Pricing: multiply de lavanda sobre o creme do body dava todo
         o roxo da seção. Agora quem pinta é a água (PRICING_STOPS em lib/sky), e
         esta camada voltou ao papel que devia ter — a água tinge o que já está
         lá. Lavanda sobre um fundo azul só sujaria o azul de volta pra roxo.

         AS TRÊS COISAS SÃO UM PARAFUSO SÓ, e é por isso que ela mudou de novo:
         asset de fundo, PRICING_STOPS e este uDeep. O periwinkle era amostrado
         do céu do asset ANTIGO (o monólito no musgo). O asset virou recife
         ciano, os stops seguiram pro teal, e uma tinta periwinkle por cima disso
         puxaria o recife de volta pro roxo — o mesmo erro da lavanda, só que uma
         geração depois. Trocou o asset? Estas três andam juntas.

         Como é multiply, ela precisa ser mais CLARA que a cor final que se quer:
         multiply só escurece, e um teal "correto" aqui chegaria ao olho como
         teal-noite. Sobre a água pálida do topo ela cai em ~#A8C6CE, sobre o
         teal da base em ~#4E8FA0. */
      uDeep: { value: new THREE.Color("#8FC0CE") },
      uIntensity: { value: 0.6 },
    }),
    [],
  );

  useFrame((state) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    // reduced-motion: congela num quadro bonito em vez de sumir — a cáustica
    // parada ainda lê como água; o que incomoda é o movimento.
    u.uTime.value = reduce ? 12.0 : state.clock.elapsedTime;
    u.uAspect.value = state.size.width / state.size.height;
  });

  return (
    <ScreenQuad>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </ScreenQuad>
  );
}

/* As duas travessias, em máscara.

   Sem isto a água tem bordas retas: a seção começa lavanda contra o fim creme
   do Manifesto, e termina num talho contra o creme do CTA Final. Um corte reto
   no meio da página lê como bug, não como superfície.

   Topo (0→10%): o leitor acabou de cruzar a superfície vindo do Manifesto — a
   tinta entra enquanto o creme do fim do gradiente ainda está em tela, e as
   duas se encontram sem costura.
   Base (82→100%): emerge. A água se dissolve antes do CTA Final, que é onde ele
   volta a respirar. Ver a decisão "só o Pricing — e emerge depois". */
const DIVE_MASK =
  "linear-gradient(to bottom, transparent 0%, black 10%, black 82%, transparent 100%)";

export default function Underwater() {
  const wrap = useRef<HTMLDivElement>(null);
  // O rAF do Canvas rodava a página INTEIRA — shader iterando em cada frame
  // com o Pricing a 10.000px de distância. frameloop="never" congela o loop
  // fora de tela; o rootMargin dá uma folga pra ele já estar vivo quando a
  // água assoma. (IntersectionObserver, não ScrollTrigger: isto não é
  // coreografia de scroll, é liga/desliga de custo.)
  const [inView, setInView] = useState(false);
  // reduce era prop e o Pricing nunca passava — o still de reduced-motion
  // existia no shader e não chegava nele. Lido aqui dentro, onde é usado.
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setReduce(mq.matches);
    decide();
    mq.addEventListener("change", decide);

    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { rootMargin: "25%" },
    );
    if (wrap.current) io.observe(wrap.current);

    return () => {
      mq.removeEventListener("change", decide);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrap}
      aria-hidden
      className="pointer-events-none absolute inset-0 mix-blend-multiply"
      style={{ maskImage: DIVE_MASK, WebkitMaskImage: DIVE_MASK }}
    >
      <Canvas
        gl={{ alpha: true, antialias: false }}
        // dpr baixo de propósito: é luz difusa e borrada, ninguém enxerga o
        // pixel — e isto roda numa seção que já carrega o phone 3D por cima.
        dpr={[1, 1.5]}
        // reduce cai em "demand": renderiza O frame do mount (o still
        // congelado do shader, uTime=12) e para — cáustica parada ainda lê
        // como água; "never" aqui deixaria o canvas em branco.
        frameloop={!inView ? "never" : reduce ? "demand" : "always"}
        style={{ position: "absolute", inset: 0 }}
      >
        <Caustics reduce={reduce} />
      </Canvas>
    </div>
  );
}

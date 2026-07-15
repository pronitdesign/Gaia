import {
	Clock,
	Color,
	DataTexture,
	Matrix4,
	Mesh,
	RepeatWrapping,
	ShaderMaterial,
	Side,
	Texture,
	UniformsLib,
	UniformsUtils,
	Vector2,
	Vector3,
	Vector4,
} from 'three';
import { Reflector, Refractor } from 'three-stdlib';

type WaterOptions = {
	color?: Color | string | number;
	textureWidth?: number;
	textureHeight?: number;
	clipBias?: number;
	flowDirection?: Vector2;
	flowSpeed?: number;
	reflectivity?: number;
	scale?: number;
	shader?: object;
	flowMap?: Texture;
	normalMap0?: Texture;
	normalMap1?: Texture;
	encoding?: 3000 | 3001 | any;
	fxDisplayColorAlpha?: number;
	fxDistortionFactor?: number;
	/** [GAIA] Ver `u_fade` nos uniforms. [cheia, sumida] em distância do olho. */
	fade?: Vector2 | [number, number];
	/** [GAIA] Ver `u_lens` nos uniforms. [θ espelho, θ lente, quanto abre]. */
	lens?: Vector3 | [number, number, number];
};

class WaterComplex extends Mesh {
	static WaterShader = {
		uniforms: {
			color: {
				value: null,
			},

			reflectivity: {
				value: 0,
			},

			tReflectionMap: {
				value: null,
			},

			tRefractionMap: {
				value: null,
			},

			tNormalMap0: {
				value: null,
			},

			tNormalMap1: {
				value: null,
			},

			textureMatrix: {
				value: null,
			},

			config: {
				value: new Vector4(),
			},

			u_fx: { value: 0.0 },
			fxDistortionFactor: { value: 0.0 },
			fxDisplayColorAlpha: { value: 1.0 },

			/* [GAIA] 0→1: quanto da água existe. O upstream é opaco e sempre
			   presente (transparent: false), porque lá a água é o mundo. Aqui ela
			   é um momento: nasce quando o texto do Manifesto acaba e morre antes
			   do Pricing, senão o Canvas (z-[60], por cima da página inteira) a
			   deixaria boiando sobre as outras seções. */
			u_amount: { value: 1.0 },

			/* [GAIA] Onde a água DISSOLVE na página, em distância do olho.
			   x = ainda cheia; y = já sumiu. Entre os dois, smoothstep no alpha.

			   É isto que apaga o corte reto no horizonte — NÃO a névoa. A névoa não
			   pode fazer esse trabalho nesta câmera, e isso é geometria, não tuning:
			   no pico do mergulho o olho fica ~0.38 acima da superfície, e distância
			   na água vira altura de tela por atan(0.38/r), que satura brutalmente.
			   Com FOG_FAR=320, o ponto 100% enevoado cai a 0.05° abaixo do
			   horizonte — UM PIXEL. A rampa inteira da névoa vivia dentro do último
			   pixel do quadro, enquanto os ~700px de água visível estavam todos em
			   r<30, praticamente sem névoa. Medido: em y=190 a água tinha 3.7% de
			   névoa, e de y=182 a y=900 a cor não se movia — degrau seco de
			   (181,165,207) pra (151,123,187) na linha do horizonte. Nenhum valor de
			   FOG_NEAR/FOG_FAR salvava isso.

			   Alpha resolve melhor do que névoa resolveria: névoa acerta UMA cor
			   (por isso o FogSync amostra o gradiente por frame, e ainda assim só
			   acerta naquela linha). Alpha não acerta cor nenhuma — ele SOME, e o
			   que aparece é o gradiente CSS de verdade, com o grão e o halo dele. O
			   Canvas é overlay transparente sobre a página: a costura perfeita
			   sempre esteve embaixo, bastava parar de pintar por cima dela.
			   Medido depois: degrau de (30,42,20) → (1,1,0). */
			u_fade: { value: new Vector2(12.0, 40.0) },

			/* [GAIA] A ÁGUA COMO LENTE — alpha por ÂNGULO DE VISÃO, não por
			   distância. É o que faz a página aparecer DENTRO da água.

			   x = θ até onde a água é ESPELHO (opaca)
			   y = θ a partir de onde ela é LENTE (transparente)
			   z = quanto ela chega a abrir (1 = some de vez)

			   POR QUE FRESNEL E NÃO u_fade. As duas rampas parecem a mesma coisa
			   e não são. u_fade é distância radial (length(vToEye)), e distância
			   NÃO é uma grandeza estável em tela: a altura de um ponto do plano é
			   atan(h/r), então a mesma faixa de r vira 16px de tela com o olho a
			   0.3 da superfície e 33px com ele a 0.7 — e h varia por frame o
			   mergulho inteiro (camera.position.y = -DIVE_DROP·camAmt). Uma rampa
			   de distância anda em quadro sem ninguém mandar.

			   θ = dot(toEye, normal) = sin(ângulo de depressão). Com o plano
			   horizontal, esse ângulo sai SÓ da linha da tela e do pitch — h some
			   da conta. A mesma rampa cai nos mesmos pixels em qualquer altura de
			   câmera. Medido @1440×900, pitch 0 (fov 50, horizonte em y=450):
			   y=475 → θ=0.026 · y=505 → θ=0.057 · y=600 → θ=0.154 · y=900 → θ=0.42.

			   E o ângulo é a resposta CERTA, não só a estável: rasante é espelho,
			   fechado é vidro. É o que oceano faz. A faixa do horizonte fica opaca
			   — é lá que moram o reflexo do phone e a linha d'água — e o pé da
			   tela abre, que é onde se enxerga pra dentro. Onde abre, o que
			   aparece atrás é o DOM da página (o canvas é overlay alpha:true).

			   Isto NÃO entrega nada sozinho: a camada CSS irmã do canvas
			   (splitPaint em ScrollPhone) precisa virar backdrop-filter na mesma
			   leva, senão a água abre e a tinta chapada tapa do mesmo jeito. As
			   duas mudanças são uma coisa só.

			   Default vec3(0, 1, 0) = lens 0 = alpha intocado (upstream). */
			u_lens: { value: new Vector3(0.0, 1.0, 0.0) },
		},

		vertexShader: /* glsl */ `
  
            #include <common>
            #include <fog_pars_vertex>
            #include <logdepthbuf_pars_vertex>
    
            uniform mat4 textureMatrix;
    
            varying vec4 vCoord;
            varying vec2 vUv;
            varying vec3 vToEye;

            
    
            void main() {
    
                vUv = uv;
                vCoord = textureMatrix * vec4( position, 1.0 );
    
                vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                vToEye = cameraPosition - worldPosition.xyz;
    
                vec4 mvPosition =  viewMatrix * worldPosition; // used in fog_vertex
                gl_Position = projectionMatrix * mvPosition;
    
                #include <logdepthbuf_vertex>
                #include <fog_vertex>
  
        }`,

		fragmentShader: /* glsl */ `
  
            #include <common>
            #include <fog_pars_fragment>
            #include <logdepthbuf_pars_fragment>
    
            uniform sampler2D tReflectionMap;
            uniform sampler2D tRefractionMap;
            uniform sampler2D tNormalMap0;
            uniform sampler2D tNormalMap1;
    
            #ifdef USE_FLOWMAP
                uniform sampler2D tFlowMap;
            #else
                uniform vec2 flowDirection;
            #endif
    
            uniform vec3 color;
            uniform float reflectivity;
            uniform vec4 config;

            uniform sampler2D u_fx;
            uniform float fxDistortionFactor;
            uniform float fxDisplayColorAlpha;
            uniform float u_amount;
            uniform vec2 u_fade;
            uniform vec3 u_lens;

            varying vec4 vCoord;
            varying vec2 vUv;
            varying vec3 vToEye;
    
            void main() {
    
                #include <logdepthbuf_fragment>
    
                float flowMapOffset0 = config.x;
                float flowMapOffset1 = config.y;
                float halfCycle = config.z;
                float scale = config.w;
    
                vec3 toEye = normalize( vToEye );
    
                // determine flow direction
                vec2 flow;
                #ifdef USE_FLOWMAP
                    flow = texture2D( tFlowMap, vUv ).rg * 2.0 - 1.0;
                #else
                    flow = flowDirection;
                #endif
                flow.x *= - 1.0;
    
                // sample normal maps (distort uvs with flowdata)
                vec4 normalColor0 = texture2D( tNormalMap0, ( vUv * scale ) + flow * flowMapOffset0 );
                vec4 normalColor1 = texture2D( tNormalMap1, ( vUv * scale ) + flow * flowMapOffset1 );
    
                // linear interpolate to get the final normal color
                float flowLerp = abs( halfCycle - flowMapOffset0 ) / halfCycle;
                vec4 normalColor = mix( normalColor0, normalColor1, flowLerp );
    
                // calculate normal vector
                vec3 normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );
    
                // calculate the fresnel term to blend reflection and refraction maps
                float theta = max( dot( toEye, normal ), 0.0 );
                float reflectance = reflectivity + ( 1.0 - reflectivity ) * pow( ( 1.0 - theta ), 5.0 );
    
                // calculate final uv coords
                vec3 coord = vCoord.xyz / vCoord.w;
                vec2 uv = coord.xy + coord.z * normal.xz * 0.05;

                vec4 fx = texture2D(u_fx, vUv);
                float avgDistortion = (fx.r + fx.g + fx.b) / 3.0 * fxDistortionFactor;
    
                vec4 reflectColor = texture2D( tReflectionMap, vec2( 1.0 - uv.x, uv.y ) + avgDistortion );
                vec4 refractColor = texture2D( tRefractionMap, uv + avgDistortion );

                // [GAIA] Refração religada.
                //
                // O upstream calcula refractColor e joga fora: a linha do mix
                // original do Water2 vinha comentada logo abaixo do gl_FragColor,
                // e o resultado usava só reflectColor. Ou seja, o Refractor era
                // renderizado (um passe inteiro) e descartado — é por isso que o
                // README do repo diz "sem refração": não é falta, é fio solto.
                //
                // Este mix por Fresnel é o que faz a parte submersa do phone ler
                // como submersa em vez de sumir atrás de um espelho opaco:
                // rasante → reflete o céu; a pino → enxerga dentro d'água.
                // Sem ele não existe "atravessar", só "desaparecer".
                float luminance = dot(fx.rgb * fxDisplayColorAlpha, vec3(0.299, 0.587, 0.114));

                // [GAIA] Tingimento ASSIMETRICO entre reflexo e refracao.
                //
                // Antes, color multiplicava o mix inteiro - reflexo E refracao pelo
                // mesmo peso. Isso pintava o phone SUBMERSO (o que aparece via
                // refracao, olhando pra dentro dagua) do tom inteiro de
                // WATER_COLOR, e um objeto pintado do tom da agua nao le como
                // submerso: le como encapado. Foi a queixa "ele ta tipo com
                // capinha, mudando de cor meio quebrado" - e subir reflectivity pra
                // esconder isso atras de mais reflexo so trocou o TOM da capinha,
                // nao tirou a capinha (testado e descartado; ver reflectivity em
                // WaterScene.tsx).
                //
                // A distincao certa nao e reflexo-alto vs refracao-alta, e sim QUEM
                // cada um tinge. Reflexo e a cor da agua que se ve (o ceu batendo
                // na superficie) - faz sentido ele carregar o tom inteiro. Refracao
                // e o que esta DENTRO dela, olhando atraves - precisa manter a cor
                // REAL do objeto, so ligeiramente tingida (25%), senao "atravessar"
                // volta a ser "desaparecer atras de uma cor chapada".
                vec3 tintedRefract = mix(refractColor.rgb, color * refractColor.rgb, 0.25);
                vec3 base = mix(tintedRefract, color * reflectColor.rgb, reflectance);
                vec3 mixedColor = mix(base, fx.rgb * fxDisplayColorAlpha, luminance * fxDisplayColorAlpha);

                /* [GAIA] A dissolução. Ver u_fade nos uniforms.

                   length(vToEye), não a profundidade de câmera: o que decide a
                   altura na tela num plano horizontal é a distância RADIAL até o
                   olho. Profundidade em Z daria uma faixa reta e a borda voltaria,
                   torta. */
                float fade = 1.0 - smoothstep( u_fade.x, u_fade.y, length( vToEye ) );

                /* [GAIA] A LENTE. Ver u_lens nos uniforms.

                   theta é o MESMO da conta de Fresnel logo acima — de propósito.
                   O que decide se a água reflete é o que decide se dá pra ver
                   através dela; são a mesma pergunta, e derivar as duas do mesmo
                   número é o que impede o alpha de descolar do reflexo. Um alpha
                   com rampa própria abriria a água onde ela ainda está
                   espelhando, e um espelho que se vê através lê como bug.

                   E é a normal map que salva a linha de ser um risco: theta vem
                   da normal PERTURBADA, então cada crista de onda tem seu próprio
                   ângulo. A borda da rampa serpenteia com a ondulação em vez de
                   atravessar a tela reta. É por isso que a linha pode nascer daqui
                   e não precisa mais ser desenhada em CSS. */
                float lens = smoothstep( u_lens.x, u_lens.y, theta ) * u_lens.z;

                gl_FragColor = vec4(mixedColor, u_amount * fade * ( 1.0 - lens ));
    
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
                #include <fog_fragment>
    
            }`,
	};

	/** [GAIA] Velocidade do fluxo, exposta como campo mutável — não const de
	 *  closure. A entrega (ScrollPhone.deliver()) precisa PARAR o mar no
	 *  instante do gatilho sem recriar a instância (que já vinha de um
	 *  useMemo caro, dois render targets). `updateFlow()` lê este campo a
	 *  cada frame, então zerá-lo congela o fluxo imediatamente; `clock`
	 *  continua descontando o tempo mesmo assim, então voltar a 1 não herda
	 *  um salto acumulado do período parado. */
	flowSpeed = 0.03;

	/** [GAIA] 1×1 preto, compartilhado. Ver o uso em `// fx` no constructor. */
	private static _fxFallback: Texture | null = null;
	static fxFallback(): Texture {
		if (!WaterComplex._fxFallback) {
			const t = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
			t.needsUpdate = true;
			WaterComplex._fxFallback = t;
		}
		return WaterComplex._fxFallback;
	}

	constructor(geometry: any, options: WaterOptions = {}) {
		super(geometry);

		//this.isWater = true;

		//this.type = 'Water';

		const scope = this;

		const color =
			options.color !== undefined
				? new Color(options.color)
				: new Color(0xffffff);
		const textureWidth = options.textureWidth || 512;
		const textureHeight = options.textureHeight || 512;
		const clipBias = options.clipBias || 0;
		const flowDirection = options.flowDirection || new Vector2(1, 0);
		scope.flowSpeed = options.flowSpeed || 0.03;
		const reflectivity = options.reflectivity || 0.02;
		const scale = options.scale || 1;
		const shader: any = options.shader || WaterComplex.WaterShader;
		const encoding =
			options.encoding !== undefined ? options.encoding : 3000;

		const flowMap = options.flowMap || undefined;
		const normalMap0 = options.normalMap0;
		const normalMap1 = options.normalMap1;

		const fxDistortionFactor = options.fxDistortionFactor;
		const fxDisplayColorAlpha = options.fxDisplayColorAlpha;

		const cycle = 0.15; // a cycle of a flow map phase
		const halfCycle = cycle * 0.5;
		const textureMatrix = new Matrix4();
		const clock = new Clock();

		// internal components

		if (Reflector === undefined) {
			console.error(
				'THREE.Water: Required component Reflector not found.'
			);
			return;
		}

		if (Refractor === undefined) {
			console.error(
				'THREE.Water: Required component Refractor not found.'
			);
			return;
		}

		const reflector = new Reflector(geometry, {
			textureWidth: textureWidth,
			textureHeight: textureHeight,
			clipBias: clipBias,
			encoding: encoding,
		});

		const refractor = new Refractor(geometry, {
			textureWidth: textureWidth,
			textureHeight: textureHeight,
			clipBias: clipBias,
			encoding: encoding,
		});

		reflector.matrixAutoUpdate = false;
		refractor.matrixAutoUpdate = false;

		// material

		this.material = new ShaderMaterial({
			uniforms: UniformsUtils.merge([
				UniformsLib['fog'],
				shader.uniforms,
			]),
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader,
			// [GAIA] transparent — o upstream é opaco. Aqui a água dissolve no
			// gradiente CSS da página quando u_amount < 1. Ver u_amount.
			transparent: true,
			fog: true,
		});

		if (flowMap !== undefined) {
			if (this.material.defines !== undefined) {
				this.material.defines.USE_FLOWMAP = '';
			}
			(this.material as any).uniforms['tFlowMap'] = {
				type: 't',
				value: flowMap,
			};
		} else {
			(this.material as any).uniforms['flowDirection'] = {
				type: 'v2',
				value: flowDirection,
			};
		}

		// maps
		if (normalMap0) normalMap0.wrapS = normalMap0.wrapT = RepeatWrapping;
		if (normalMap1) normalMap1.wrapS = normalMap1.wrapT = RepeatWrapping;

		(this.material as any).uniforms['tReflectionMap'].value =
			reflector.getRenderTarget().texture;
		(this.material as any).uniforms['tRefractionMap'].value =
			refractor.getRenderTarget().texture;
		(this.material as any).uniforms['tNormalMap0'].value = normalMap0;
		(this.material as any).uniforms['tNormalMap1'].value = normalMap1;

		// water

		(this.material as any).uniforms['color'].value = color;
		(this.material as any).uniforms['reflectivity'].value = reflectivity;
		(this.material as any).uniforms['textureMatrix'].value = textureMatrix;

		// fx
		// [GAIA] O fragment amostra texture2D(u_fx, vUv) INCONDICIONALMENTE, mas
		// o upstream nasce com o uniform em null — sem um filho FX montado (ou
		// se ele falhar ao montar) isso amostra textura não-vinculada e o
		// resultado é indefinido por driver. 1×1 preto é o neutro exato dos dois
		// usos: avgDistortion = 0 (não distorce) e luminance = 0 (não tinge).
		(this.material as any).uniforms['u_fx'].value = WaterComplex.fxFallback();
		(this.material as any).uniforms['fxDistortionFactor'].value =
			fxDistortionFactor;
		(this.material as any).uniforms['fxDisplayColorAlpha'].value =
			fxDisplayColorAlpha;

		// dissolução
		if (options.fade !== undefined) {
			const f = options.fade;
			(this.material as any).uniforms['u_fade'].value = Array.isArray(f)
				? new Vector2(f[0], f[1])
				: f.clone();
		}

		// lente
		if (options.lens !== undefined) {
			const l = options.lens;
			(this.material as any).uniforms['u_lens'].value = Array.isArray(l)
				? new Vector3(l[0], l[1], l[2])
				: l.clone();
		}

		// inital values

		(this.material as any).uniforms['config'].value.x = 0; // flowMapOffset0
		(this.material as any).uniforms['config'].value.y = halfCycle; // flowMapOffset1
		(this.material as any).uniforms['config'].value.z = halfCycle; // halfCycle
		(this.material as any).uniforms['config'].value.w = scale; // scale

		// functions

		function updateTextureMatrix(camera: any) {
			textureMatrix.set(
				0.5,
				0.0,
				0.0,
				0.5,
				0.0,
				0.5,
				0.0,
				0.5,
				0.0,
				0.0,
				0.5,
				0.5,
				0.0,
				0.0,
				0.0,
				1.0
			);

			textureMatrix.multiply(camera.projectionMatrix);
			textureMatrix.multiply(camera.matrixWorldInverse);
			textureMatrix.multiply(scope.matrixWorld);
		}

		function updateFlow() {
			const delta = clock.getDelta();
			const config = (scope.material as any).uniforms['config'];

			config.value.x += scope.flowSpeed * delta; // flowMapOffset0
			config.value.y = config.value.x + halfCycle; // flowMapOffset1

			// Important: The distance between offsets should be always the value of "halfCycle".
			// Moreover, both offsets should be in the range of [ 0, cycle ].
			// This approach ensures a smooth water flow and avoids "reset" effects.

			if (config.value.x >= cycle) {
				config.value.x = 0;
				config.value.y = halfCycle;
			} else if (config.value.y >= cycle) {
				config.value.y = config.value.y - cycle;
			}
		}

		//

		/* [GAIA] Objetos "só de reflexo": existem para os passes do Reflector e do
		   Refractor, e somem no render principal.

		   Motivo: o céu do Manifesto é um gradiente CSS na página, e o Canvas é um
		   overlay transparente por cima dele. A água precisa de um céu DENTRO da
		   cena 3D pra ter o que refletir (ver Sky3D.tsx) — mas se esse céu também
		   for desenhado no render principal, ele vira um plano opaco tapando o
		   gradiente real, o halo de aurora e o grão da seção. O céu tem que
		   existir pro espelho e não existir pra câmera.

		   Marque com `userData.reflectionOnly = true` e deixe `visible = false`;
		   este hook liga durante os dois passes e desliga depois. traverse()
		   visita filhos invisíveis, então marcar e esconder funciona. */
		const revealReflectionOnly = (scene: any, on: boolean) => {
			scene.traverse((o: any) => {
				if (o.userData && o.userData.reflectionOnly) o.visible = on;
			});
		};

		this.onBeforeRender = function (renderer, scene, camera) {
			updateTextureMatrix(camera);
			updateFlow();

			scope.visible = false;
			revealReflectionOnly(scene, true);

			reflector.matrixWorld.copy(scope.matrixWorld);
			refractor.matrixWorld.copy(scope.matrixWorld);

			(reflector as any).onBeforeRender(renderer, scene, camera);
			(refractor as any).onBeforeRender(renderer, scene, camera);

			revealReflectionOnly(scene, false);
			scope.visible = true;
		};
	}
}

export { WaterComplex };

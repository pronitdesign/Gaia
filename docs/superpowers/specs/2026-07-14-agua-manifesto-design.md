# Água do Manifesto — superfície refletiva com travessia do iPhone

**Data:** 2026-07-14
**Status:** aprovado, bloqueado na entrada
**Escopo:** desktop (`lg:`, ≥1024px) apenas

## Objetivo

Ao fim do texto do Manifesto ("A Gaia cuida do resto."), uma superfície de água
nasce no horizonte. O iPhone 3D, que já desce pelo Manifesto, **cruza a linha
d'água e segue** até o slot do Pricing. A água reflete o phone e o céu roxo, e
refrata a parte submersa.

Régua: realismo. Se algo tiver que ser cortado, corte o RippleFX antes do céu 3D.

## Bloqueio de entrada

Outra sessão tem `components/iphone3d/ScrollPhone.tsx` modificado e **não
commitado** — está introduzindo `X_HOLD = 0.7` e `easeX` para o phone descer reto
pelo Manifesto em vez de derivar pro Pricing.

**Não começar antes desse commit cair.** A implementação parte dele. O trabalho
dela não é descartado: `easeX`/`X_HOLD` viram base deste refactor (ver
"Preservação da matemática").

## Estado atual (fatos verificados)

| Fato | Onde |
|---|---|
| Canvas do phone: **506×900 fixo**, overlay `fixed inset-0 z-[60] hidden lg:block` | `ScrollPhone.tsx:136-139` |
| Posição do phone: `translate3d` **no CSS do wrapper**, não em 3D | `ScrollPhone.tsx:81` |
| Câmera: **estática** em `[0,0,4]`, sem pitch. Quem se move é o grupo do modelo | `ScrollPhone.tsx:144` |
| Progresso: Lenis → `gsap.ticker` → `getBoundingClientRect()` por frame. **Não usa ScrollTrigger** | `ScrollPhone.tsx:111-128` |
| Âncoras: `[data-phone-start]` (Features) → `[data-phone-end]` (Pricing) | `Features.tsx:1373`, `Pricing.tsx:310` |
| Céu do Manifesto: gradiente **CSS**, 8 stops `#150F22 → #EFEBEC` | `Manifesto.tsx:45-51` |
| Luz: `Environment` com 3 Lightformers de estúdio, **sem HDRI** | `Lights.tsx:8-14` |
| Postprocessing: **não existe** no repo | — |
| Tela do phone: DOM real via drei `<Html transform>` | `ScrollPhone.tsx:158` |
| Modo textura com swap existe e está **completo, porém morto** — nada passa `screenImg` | `IPhoneModel.tsx:271-285`, `:38-41` |
| Texturas das duas telas **já estão no `public/`**; o DOM é réplica declarada delas | `PhoneScreen.tsx:15,108` |

### Compatibilidade (verificada)

| Pacote | Gaia | WaterSurface pede | Situação |
|---|---|---|---|
| `three` | 0.162.0 | ^0.162.0 | idêntico |
| `@react-three/fiber` | 8.18.0 | ^8.15.19 | ok |
| `@react-three/drei` | 9.122.0 | ^9.99.7 | ok |
| `three-stdlib` | 2.36.1 (transitivo via drei) | usado por `WaterComplex.ts:16` | **promover a dep explícita** |
| `@react-three/postprocessing` | ausente | ^2.16.1 | instalar (`^2.16.3`, peers: three ≥0.138, r3f ≥8.0) |
| `@funtech-inc/use-shader-fx` | ausente | ^1.1.3 | instalar **`^1.1.43`** — fixar em 1.x; peers 1.x: three ≥0.155, r3f ≥8.13. **2.x não verificado, provavelmente exige r3f 9** |

## Decisões

| Questão | Decisão |
|---|---|
| Onde a água entra | Horizonte no fim do Manifesto |
| O que "atravessar" significa | Cruza a linha d'água e **segue** até o Pricing |
| Reflexo da tela (é DOM, não reflete) | **Textura só na travessia**; volta pro DOM depois |
| Ondas | **RippleFX no ponteiro** (mouse deixa rastro) |
| Craft | Realismo máximo, vendorizando o repo |
| Conflito com a outra sessão | Esperar o commit dela |

## Arquitetura

### 1. Canvas full-viewport

O canvas deixa de ser 506×900 e passa a ocupar o viewport. Motivo: **reflexão
planar exige phone e água na mesma cena**, e a água atravessa a página inteira.

Consequência a compensar: hoje o phone tem tamanho em pixels **constante** (canvas
fixo). Com canvas do viewport, ele passaria a escalar com a altura da janela.
Corrigir com `scale × (900 / window.innerHeight)` para preservar o enquadramento
atual. Recalcular no resize.

### 2. Preservação da matemática (crítico)

`getBoundingClientRect` → `easePos` / `easeX` / `easeSpin` → `cx, cy` **não muda
nenhuma linha**. Muda só o destino do resultado:

```
antes:  el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%,-50%)`
depois: group.position.set(worldX, worldY, z)   // desprojeção de cx,cy
```

Desprojeção, com câmera estática em `[0,0,4]` e fov vertical:

```
visibleHeight = 2 · tan(fov/2) · dist
visibleWidth  = visibleHeight · aspect
worldX =  (cx / innerWidth  - 0.5) · visibleWidth
worldY = -(cy / innerHeight - 0.5) · visibleHeight
```

O tuning da outra sessão (`X_HOLD`, `easeX`) sobrevive intacto porque opera antes
desse ponto.

### 3. Água

Vendorizar do `nhtoby311/WaterSurface` para `components/iphone3d/water/`:

- `WaterSurfaceComplex.tsx` — wrapper R3F
- `Water/WaterComplex.ts` — shader (fork do `Water2` do three)
- `InteractiveFX/RippleFX.tsx` + `WaterContext.tsx` — ondas de ponteiro

Assets para `public/water/complex/`: `Water_1_M_Normal.jpg`, `Water_2_M_Normal.jpg`.
**Não** copiar `/cubemap` nem `/fx/smoke.png` (o cubemap sunset do repo não serve —
nosso céu é o roxo do Manifesto; ver §4).

Plano em `y = -3`, `rotation-x = -π/2`. Câmera nivelada em `y = 0` **acima** do
plano ⇒ horizonte no centro da tela, água na metade de baixo com escorço de
oceano. Sem pitch, sem re-enquadrar o phone.

Cor da água derivada da paleta `roxo` (`tailwind.config.ts:24-35`), não hardcoded
avulso.

#### 3a. Refração — descomentar

`WaterComplex.ts` **já paga o passe do Refractor e descarta o resultado**:

```glsl
vec4 refractColor = texture2D( tRefractionMap, uv );        // :178 — calculado
gl_FragColor = vec4(mixedColor, 1.0);                       // :186 — só reflexo
//gl_FragColor = vec4( color, 1.0 ) * mix( refractColor, reflectColor, reflectance );  // :188 — morto
```

Religar o mix do Water2 original e tunar. É o que faz a parte submersa do phone
ler como submersa — o coração do "atravessar". É também por isso que o README diz
"sem refração": não é falta, é fio solto.

#### 3b. `u_fx` nunca é null

`texture2D(u_fx, vUv)` é amostrado **incondicionalmente** (`WaterComplex.ts:174`).
Como vamos usar RippleFX, o uniform é preenchido. Mas se o FX falhar ao montar, o
uniform fica null. Fornecer fallback de textura 1×1 preta.

### 4. Céu 3D (o item de maior impacto no realismo)

A reflexão planar só reflete o que está **na cena 3D**. O céu roxo do Manifesto é
CSS — não existe pro WebGL. Sem intervenção, a água refletiria os três Lightformers
de estúdio (`Lights.tsx:8-14`): cinza e branco. Água roxa refletindo estúdio cinza
= o plástico que o pedido quer evitar.

Portar o gradiente do Manifesto (`Manifesto.tsx:45-51`, os 8 stops de `#150F22` a
`#EFEBEC`) para dentro da cena, como fonte de verdade única compartilhada entre o
CSS e o 3D — extrair os stops para um módulo (`lib/sky.ts`) consumido pelos dois,
para não haver duas listas divergindo.

Forma: **skydome** — esfera `BackSide` com gradiente vertical por shader. (Descartado:
`Environment` com textura gerada — indireção a mais para o mesmo resultado, e a
reflexão precisa de geometria real no lugar certo.)

O skydome deve ser visível **só na janela da água** (§5) e não pode vazar por cima
das outras seções.

### 5. Janela de vida da água

O canvas é `z-[60]` — **por cima da página inteira**. Água fora da janela do
Manifesto taparia Features, Pricing e CTA Final.

Portanto água e céu 3D **montam e desmontam** dentro da janela, com fade nas bordas.
Não é um efeito estético opcional: é o que torna o "nascer quando o texto acaba"
uma consequência da arquitetura.

Janela derivada do progresso `p` já existente em `ScrollPhone.tsx:122`, com âncora
DOM nova no fim do texto do Manifesto (`data-water-start`), seguindo o padrão de
`[data-phone-start]`/`[data-phone-end]`. Limites exatos a calibrar visualmente.

Fora da janela: `alpha: true` do canvas preservado, nada renderizado além do phone.

### 6. Tela: DOM ↔ textura na travessia

DOM não existe pro WebGL: a tela via `<Html transform>` **não aparece no reflexo**.
Trocar para textura durante a travessia.

As texturas **já existem e casam com o DOM por construção** — o `PhoneScreen` é
réplica declarada delas (`PhoneScreen.tsx:15,108`):

| variante | textura | componente DOM |
|---|---|---|
| `prontuario` | `/phone-screen-prontuario.png` | `<PhoneScreen variant="prontuario" />` |
| `inicio` | `/phone-screen.png` | `<PhoneScreen variant="inicio" />` |

`IPhoneModel` escolhe modo por **presença de prop** (`screen ? DOM : screenImg ?
Textura : Plain`, `:271-285`), e o modo textura já implementa o swap por `showAlt`
(`:38-41`). O caminho está completo e apenas **morto** — `ScrollPhone.tsx:158` passa
só `screen`. Ligar:

```
screen={crossing ? undefined : (showAlt ? <PhoneScreen variant="inicio" />
                                        : <PhoneScreen variant="prontuario" />)}
screenImg="/phone-screen-prontuario.png"
screenImgAlt="/phone-screen.png"
showAlt={showAlt}
```

`crossing` = janela estreita em torno da linha d'água. Fora dela, DOM vivo.

O estado `showAlt` já existe (`ScrollPhone.tsx:62,99-103`, dispara em `eS > 0.5`) e
passa a dirigir os dois modos — **não criar estado novo**.

Nota: `X_HOLD = 0.7` faz o phone descer reto pelo Manifesto, e `easeSpin` o põe de
costas no miolo — provavelmente a travessia acontece com o phone de costas, e a tela
nem aparece. Se a medição confirmar isso, este item inteiro cai por desnecessário.
**Verificar antes de implementar.**

### 7. Grade de filme

`EffectComposer` + `ToneMapping` (ACES). Sem tonemapping o reflexo estoura nos
destaques. O próprio repo de referência usa (`Scene.tsx:11,162-164`).

Bloom e grain: **não** neste escopo. ACES primeiro, medir, decidir depois.

## Performance

Reflexão planar + refração = cena renderizada **3× por frame**, agora em canvas de
viewport em vez de 506×900. Desktop apenas (`hidden lg:block`), que já é a regra do
ScrollPhone.

- `dimensions` do render target: começar em 1024, subir só se necessário
- `dpr={[1,2]}` já existe — considerar teto menor na janela da água
- Medir com `r3f-perf` antes de entregar. **Meta: 60fps no MacBook da Pronit.**
  Não fechar sem medição real; "parece fluido" não conta.

## Fora de escopo

- Mobile (`IPhone3D.tsx` no Pricing continua como está)
- Features, Pricing, CTA Final, ARoberta, Footer — nenhuma alteração
- Bloom, film grain
- Ripple onde o phone entra na água (só ponteiro; o repo não faz, exigiria escrever)
- Refração no repo upstream (não vamos abrir PR)

## Arquivos afetados

```
components/iphone3d/ScrollPhone.tsx      refactor: canvas viewport + posição 3D + janela
components/iphone3d/Lights.tsx           céu 3D substitui/complementa os Lightformers
components/iphone3d/water/               vendorizado do WaterSurface (novo)
components/sections/Manifesto.tsx        âncora data-water-start; consumir lib/sky.ts
lib/sky.ts                               stops do gradiente, fonte única CSS+3D (novo)
public/water/complex/*.jpg               2 normal maps (novo — únicos assets novos)
package.json                             +three-stdlib, +@react-three/postprocessing,
                                         +@funtech-inc/use-shader-fx@^1.1.43
```

## Critérios de aceite

1. O texto "A Gaia cuida do resto." termina e a água nasce no horizonte — sem
   corte visível, sem pop.
2. O phone desce, **cruza** a superfície e **continua** até o slot do Pricing.
3. O reflexo do phone acompanha na água e bate com a posição real.
4. A parte submersa do phone lê como submersa (refração ligada).
5. A água reflete o roxo do Manifesto — não estúdio cinza.
6. O mouse deixa rastro de ondas.
7. Nenhuma seção fora da janela é ocluída pelo canvas.
8. 60fps medido (não estimado) no MacBook da Pronit.
9. `prefers-reduced-motion` respeitado (o path de `ScrollPhone.tsx:99-109` continua
   válido — sem viagem, e sem água).
10. Zero regressão visual em Features / Pricing / CTA Final.

## Riscos

| Risco | Mitigação |
|---|---|
| Merge com a outra sessão | Esperar o commit. Partir dele. |
| 3 passes de render matam o fps | Medir cedo, baixar `dimensions`/dpr. Ponto de recuo: cortar RippleFX. |
| Céu 3D e céu CSS divergirem | `lib/sky.ts` como fonte única |
| Desprojeção quebrar o enquadramento atual | Compensação `900/innerHeight` + comparar screenshot antes/depois |
| Água vazar por cima de outras seções | Montagem condicional na janela; critério de aceite #7 |
| `use-shader-fx` 2.x exigir r3f 9 | Fixar `^1.1.43` |
| PNG da tela divergir do DOM (são réplicas mantidas à mão) | Travessia é curta e o phone está de costas; se divergir, some no reflexo antes de aparecer |

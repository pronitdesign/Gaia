# GAIA — Contexto do Projeto (brief para o agente de build)

> Este repositório constrói o **site de marketing (landing) do Gaia**. O app em si já existe como PWA em gaianutri.app — aqui é o site que apresenta e vende o produto. Não invente features nem escopo além deste brief. Onde estiver `[CONFIRMAR]`, pergunte antes de assumir.

---

## Stack (martelo batido)

- **Next.js 14+ (App Router) + TypeScript + Tailwind CSS**
- **GSAP + ScrollTrigger** (reveals / scrollytelling) · **Lenis** (smooth scroll) — motion precisa ser fluido
- **Framer Motion** para transições de componente (opcional)
- Fontes via `next/font/local` a partir de `public/fonts/`
- Gradiente animado do hero: começar com CSS/canvas leve; **R3F/shader só se** quisermos o "afluente" fluido em WebGL (avaliar performance — Core Web Vitals é prioridade)
- Deploy Vercel
- Config Tailwind: mapear as famílias de cor como `colors.azul/roxo/sage/neutro`, `fontFamily.title = Sentient`, `fontFamily.body = ClashDisplay`, raios e spacing conforme o sistema.

---

## Divisão de trabalho (Figma: arquivo `12hv0KMqXBqRShavGowzdn`, página "Arquitetura da Informação")

| # | Section | Node ID | Dono |
|---|---------|---------|------|
| 1 | HERO | 9:375 | Kácio |
| 2 | BENEFITS | 9:403 | Kácio |
| 3 | MISSÃO DA GAIA | 9:581 | Kácio |
| 4 | COMO COMEÇAR | 9:433 | **Laura** |
| 5 | A ROBERTA (quem é) | 9:579 | **Laura** |
| 6 | FEATURES | 9:448 | **Laura** |
| 7 | PRICING | 9:508 | **Laura** |
| 8 | TESTIMONIALS | 9:523 | Kácio |
| 9 | FAQ | 9:538 | Kácio |
| 10 | CTA FINAL | 9:553 | **Laura** |
| 11 | FOOTER | 9:567 | **Laura** |

Laura constrói: **Como Começar, A Roberta, Features, Pricing, CTA Final, Footer.**
Nenhuma das sections da Laura inclui o hero → do lado dela, motion = scroll reveals (Lenis + GSAP), sem shader/WebGL.

---

## 0. Essencial em uma frase
**Gaia é a anamnese inteligente para nutricionistas.** O paciente responde um questionário que se adapta a ele, antes da consulta, e o nutricionista recebe tudo organizado — chegando à consulta já entendendo quem está do outro lado.

- Categoria: SaaS de saúde (nutrição) · anamnese/intake inteligente
- Modelo: PWA (sem instalar), celular e computador
- Preço: **R$49,90/mês**, com **2 meses grátis para quem migra** da ferramenta atual

---

## 1. Fundadora — a maior alavanca de conversão
**Roberta Carbonari** — Mestre em Nutrição, especialista em Comportamento Alimentar (CRN3 54892). Gere 3 clínicas (Muzy, Health2You, Performance Com Saúde), lidera +20 profissionais, coordena pós-graduações, +1M de seguidores. Ex-executiva (FedEx) que voltou à faculdade aos 30 pra ser nutricionista. Tem agenda com lista de espera.

O nome dela **vende** para o público (nutricionistas). Deve aparecer com destaque: selo no hero, seção própria, e como âncora dos depoimentos.

## 2. Posicionamento, conceito e voz
- **Conceito central:** *Nenhum paciente é igual — a anamnese também não deveria ser.* Individualização e comportamento alimentar; a filosofia anti-"fórmula mágica" da Roberta.
- **Metáfora de marca (in.package):** *afluentes que se encontram* — fluxos orgânicos que convergem. "Simplificar para sofisticar."
- **Voz:** direta, confiante, humana. Premium sem ser fria (Stripe/Mercury), não corporativa. Frases curtas.
- **Anti-jargão:** evitar termo técnico de nutrição sem necessidade; "anamnese" é o termo âncora (é o próprio produto).

## 3. Público
Nutricionistas de consultório (muitos do ecossistema/formação da Roberta) que hoje usam papel, formulário genérico, WhatsApp ou ferramenta antiga pra coletar histórico — e querem atender com mais presença e menos burocracia.

---

## 4. Arquitetura do site (ordem) + copy final aprovada
Formato de copy por seção: **campos rotulados** (Eyebrow / Headline / Subheadline / etc.). Regras: headline ≤8 palavras (benefício direto), sub ≤20 palavras, CTA = verbo + valor. **Nunca** "Saiba mais", nunca slider na hero, no máx. 1 CTA primário por viewport.

**HERO**
- Eyebrow: Para nutricionistas que querem atender com mais presença
- Headline: Entenda seu paciente antes da primeira consulta.
- Subheadline: Gaia transforma a anamnese num questionário inteligente que se adapta a cada paciente e chega até você organizado — antes de ele sentar na sua frente.
- CTA primário: Começar grátis · CTA secundário: Ver como funciona
- Microcopy: 2 meses grátis migrando sua ferramenta atual.
- Selos rápidos: Criada por Roberta Carbonari · Anamnese adaptativa · Sem instalar nada · Celular e computador · Dados protegidos (LGPD)

**BENEFITS**
- Eyebrow: O que muda na sua rotina · Headline: Menos formulário. Mais paciente.
- Recupere horas toda semana — A anamnese se preenche antes de o paciente sentar. Você chega pra tratar, não pra digitar.
- Chegue sabendo com quem você fala — Histórico, rotina, restrições e comportamento organizados num só lugar. A primeira consulta rende como se fosse a terceira.
- Uma anamnese pra cada pessoa — As perguntas se ajustam a quem responde. Porque nenhum paciente é igual.

**MISSÃO DA GAIA**
- Eyebrow: Por que a Gaia existe · Headline: Nutrição é sobre pessoas. Não sobre formulários.
- Corpo: Todo nutricionista entrou nessa profissão pra entender gente. Mas a rotina empurra a consulta pra dentro do papel — preencher, transcrever, repetir a mesma pergunta pra pacientes que não têm nada a ver um com o outro. Gaia nasceu do avesso disso: uma anamnese que se molda a cada pessoa e te devolve o tempo de fazer o que importa. Cuidar.

**COMO COMEÇAR** (3 passos)
1. Traga seus pacientes — Migre da sua ferramenta atual. A gente ajuda na importação.
2. Envie a anamnese — Um link por WhatsApp. O paciente responde no celular, antes da consulta.
3. Receba pronta — Tudo chega organizado e adaptado a cada pessoa. Você só atende.

**A ROBERTA**
- Eyebrow: Quem construiu · Headline: Feita por quem atende de verdade.
- Corpo: Roberta Carbonari é Mestre em Nutrição e especialista em Comportamento Alimentar. Gere três clínicas, lidera mais de 20 profissionais e coordena pós-graduações que formam nutricionistas Brasil afora. Foi executiva antes de ser nutricionista — voltou pra faculdade aos 30 pra cuidar de gente. Hoje tem agenda com lista de espera e mais de um milhão de pessoas acompanhando como ela une ciência, comportamento e gestão. A anamnese sempre foi o ponto mais importante e o mais travado da rotina dela. Gaia é a ferramenta que ela queria ter tido — construída de dentro do consultório.
- Assinatura: Roberta Carbonari · Nutricionista (CRN3 54892) e fundadora da Gaia
- Selos: 3 clínicas · +20 profissionais · +1M de seguidores · Mestre em Nutrição

**FEATURES** (1 feature = 1 bloco)
- Anamnese que o paciente responde sozinho — link; responde no celular, no tempo dele; você recebe completo.
- Perguntas que se adaptam — aprofunda onde precisa, pula o que não faz sentido.
- Organizado sem transcrever — respostas viram um resumo estruturado; você entende em segundos.
- Histórico que evolui — cada retorno soma ao anterior, numa linha só.
- Funciona onde você estiver — celular ou computador, sem instalar nada.
- `[CONFIRMAR]` capacidades exatas (adaptatividade, resumo automático, histórico) com o produto.

**PRICING**
- Headline: R$49,90 por mês. Comece com 2 meses grátis. · Sub: Migre da sua ferramenta atual.
- Plano Gaia — R$49,90/mês · Badge: 2 meses grátis na migração
- Inclui: Anamnese ilimitada · Pacientes ilimitados · Celular e computador · Suporte na migração
- CTA: Migrar e ganhar 2 meses · Confiança: Sem fidelidade. Cancele quando quiser.
- (Opcional a decidir: toggle Mensal/Anual, anual com 2 meses grátis.)

**TESTIMONIALS** — `[CONFIRMAR]` 2–3 depoimentos reais (citação + nome · área · cidade + foto). Manter oculto até ter reais.

**FAQ** — usar/instalar, migração, "serve pra qualquer atendimento", segurança (LGPD `[CONFIRMAR]`), cancelamento `[CONFIRMAR]`.

**CTA FINAL** — Eyebrow: Pronta pra começar? · Headline: Sua próxima consulta pode começar diferente. · Subheadline: Traga seus pacientes, envie a primeira anamnese e sinta a diferença já no próximo atendimento. · CTA: Começar grátis · Microcopy: 2 meses grátis migrando.

**FOOTER** — Logo Gaia + tagline "A anamnese que entende quem está do outro lado." · Produto (Recursos · Preço · Como começar) / Empresa (A Roberta · Contato) / Legal (Privacidade · Termos · LGPD) · © 2026 Gaia · `[CONFIRMAR razão social / CNPJ]`

> A copy completa e a direção criativa por seção estão no Figma (arquivo `12hv0KMqXBqRShavGowzdn`, página "Arquitetura da Informação").

---

## 5. Design System

### Aparência geral
**Claro, aéreo, sofisticado. Gradiente é assinatura.** Base marfim, washes suaves azul-lavanda-sage que se fundem (afluentes). NÃO é dark. Referências de acabamento: Stripe / Mercury (claro, premium).

### Fontes (já no repo — `public/fonts/`, woff2/woff)
- **Títulos:** Sentient (serifada elegante) — carregar via `next/font/local`, family `--font-title`.
- **Descrição/corpo:** Clash Display — family `--font-body`.
- Escala (desktop): Display 72 / H1 56 / H2 40 / H3 28 (Sentient Medium/SemiBold); Body L 20 / Body 17 / Small 14 / Eyebrow 13 (Clash). Mobile: 44 / 36 / 28 / 22 / 16.

### Paleta (famílias 50→900 — usar como tokens)
```
azul (Azul-Névoa): 50 #EFF4F8 · 100 #DFE9F1 · 200 #C2D2E4 · 300 #A6BAD5 · 400 #95A9C4 · 500 #7A90AE · 600 #617697 · 700 #4B5D79 · 800 #3A485E · 900 #2A3446
roxo (Lavanda/Roxo Gaia): 50 #F5F1F7 · 100 #EADFEF · 200 #D9C8E3 · 300 #C1A9D3 · 400 #A385C0 · 500 #7454AA · 600 #5F4590 · 700 #4A3670 · 800 #372953 · 900 #241A38
sage (Verde): 50 #EEF2E8 · 100 #DDE4D2 · 200 #C4CFB4 · 300 #A6B58F · 400 #8B9E6F · 500 #6F8354 · 600 #586B42 · 700 #445333 · 800 #333F27 · 900 #232B1B
neutro: 0 #FFFFFF · 50 #FAF9F5 · 100 #F4F2EC · 200 #E8E5DC · 300 #D7D5CB · 400 #B7B6AD · 500 #8E8E86 · 600 #6A6B6E · 700 #4C4F5A · 800 #2B2E3A
semântico: success #6F8354 · warning #D6A04E · error #C05B5B · info #7A90AE
```
- **Uso:** fundo = neutro 50 (#FAF9F5). Texto = neutro 800 (#2B2E3A) / grafite. CTA primário = **roxo 500 (#7454AA)**. Tints claros (50–200) para fundos e gradientes; tons fortes (600–900) para texto/contraste.

### Gradientes "Fluxo" (assinatura)
```
Bruma:    #DFE9F1 → #C2D2E4 → #95A9C4
Lavanda:  #F1ECF2 → #E6DBE2 → #CFC5DA
Afluente: #DFE9F1 → #E6DBE2 → #FAF9F5
Aurora:   #95A9C4 → #CFC5DA → #E6DBE2 → #FAF9F5
```
Usar em hero e seções imersivas. Idealmente **animados** (mesh/flow lento) — ver Motion.

### Sistema
- Raio: 8 (sm) · 16 (md) · 24 (lg) · 40 (card) · full (pills)
- Espaçamento base-4: 4·8·12·16·24·32·48·64·96·128
- Elevação: sombras baixas e suaves, leve tint frio/lavanda.

### Motion (direção)
- Scroll suave (Lenis). Reveals scroll-triggered (fade-up + scale sutil, stagger 60–80ms, easing `cubic-bezier(0.16,1,0.3,1)`).
- Gradiente do hero com movimento lento (~20s loop) — os "afluentes" fluindo.
- Micro-interações hover: scale 1.02–1.05 + elevação. Nunca bounce. Transições <400ms.
- Referências de motion: Jeton, Lusion, Aino Agency (calma, tipografia que respira).

---

## 6. Regras de conversão & anti-padrões (diretora)
- Hero: headline (benefício) + sub (contexto) + visual (produto) + CTA + prova. **Nunca slider.**
- 1 feature = 1 bloco visual (nunca bullets de 6 features).
- Pricing: destaque no plano-alvo (Von Restorff), sem dark patterns.
- CTA = Call to Value ("Começar grátis", "Migrar e ganhar 2 meses"), nunca "Saiba mais".
- Prova social: só verdadeira (sem depoimento fake).
- Sem pop-up de email nos primeiros 10s. Máx. 1 CTA primário por viewport.

## 7. Confirmado vs pendente
Confirmado: produto, Roberta, posicionamento, copy, cores, tipografia, fontes no repo, pricing, stack.
Pendente `[CONFIRMAR]`: capacidades exatas das features · depoimentos reais · LGPD/segurança · CNPJ · toggle anual.

## 8. Referências
- Site atual (vamos refazer): https://gaianutri.app/
- Concorrente: https://dietbox.me/pt-BR

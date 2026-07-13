# GAIA — Contexto do Projeto (brief canônico para o build)

> Este repositório constrói o **site de marketing (landing) do Gaia**. O app já existe (PWA em gaianutri.app) — aqui é o site que apresenta e vende. Fonte da verdade: briefing do Notion (Gaia Nutri, atualizado 13/jul/2026). Onde estiver `[CONFIRMAR]`, pergunte antes de assumir.

> ⚠️ **MUDANÇA DE POSICIONAMENTO (13/jul).** O produto evoluiu de *"anamnese que o paciente responde antes da consulta"* → **"workspace clínico onde a IA assiste a consulta ao vivo"**. A copy das seções já construídas (Hero, Benefits, Missão, Como Começar, Features, Pricing, CTA) foi escrita no posicionamento **antigo** e precisa ser reescrita. Ver §4 e §9.

---

## 0. Essencial em uma frase
**Gaia é o workspace clínico para nutricionistas.** Duas metades de mesmo peso:
1. **Consulta assistida por IA** — a nutri grava a consulta olhando pro paciente; a Gaia transcreve ao vivo, monta a anamnese em blocos que ela aceita ou edita (checklist de 14 tópicos) e entrega um resumo SOAP.
2. **Workspace completo** — prontuário de 8 abas, plano alimentar (TACO), antropometria e exames por PDF, agenda (Google + Meet), 7 questionários validados. Tudo num lugar só.

- Categoria: SaaS de saúde (nutrição) · workspace clínico com IA assistiva
- Modelo: sem instalar, celular e computador · login Google, sem cartão (beta grátis)
- Eixo de copy: **presença** — "anotar tira você da consulta"
- Preço: **R$49,90/mês** ou **R$490,20/ano** `[CONFIRMAR]` · **2 meses grátis para quem migra**

---

## 1. Fundadora — a maior alavanca de conversão
**Roberta Carbonari** — Mestre em Nutrição, especialista em Comportamento Alimentar (CRN3 54892). Gere 3 clínicas (Muzy, Health2You, Performance Com Saúde), lidera +20 profissionais, coordena pós-graduações, +1M de seguidores. Ex-executiva (FedEx) que voltou à faculdade aos 30 pra ser nutricionista. Agenda com lista de espera.

O nome dela **vende** para o público (nutricionistas). Aparece com destaque: selo no hero, seção própria, âncora dos depoimentos. Autoridade real: "feita por quem atende".

## 2. Posicionamento, conceito e voz
- **Promessa central:** Para nutricionistas que perdem a consulta anotando, a Gaia é o workspace clínico que escuta a consulta e monta o prontuário — e reúne plano, exames e agenda num lugar só — diferente das ferramentas fragmentadas (Dietbox/WebDiet/Dairy), porque a IA assiste o atendimento em tempo real e nasceu da rotina de quem atende.
- **De → Para:** de ferramenta genérica/simplona (Dairy/Lightbox) e papel/WhatsApp → workspace inteligente, premium e individualizado. Consciência de mercado média-alta.
- **Conceito central:** *Nenhum paciente é igual — a anamnese também não deveria ser.* Individualização e comportamento alimentar; anti-"fórmula mágica".
- **Metáfora de marca (in.package):** *afluentes que se encontram* — fluxos orgânicos que convergem. "Simplificar para sofisticar."
- **Arquétipo:** Cuidador + Sábio (o profissional experiente que cuida).
- **Voz:** direta, confiante, humana, sofisticada, acolhedora. Premium acessível (Stripe/Mercury), não corporativa. Frases curtas.
- **Pilares de voz:** Individualização · Presença (menos burocracia, mais cuidado) · Autoridade real (feita por quem atende).
- **Proibido:** "fórmula mágica", jargão de nutrição sem necessidade, promessa milagrosa, excesso de exclamação, "Bem-vindo", "Saiba mais". ("Anamnese" é permitido — é o produto.)
- **Tom certo:** "Volte a olhar pro seu paciente." · **Errado:** "A solução definitiva que vai revolucionar sua clínica!"

## 3. Público
Nutricionistas de consultório (muitos do ecossistema/formação da Roberta) que hoje usam papel, formulário genérico, WhatsApp ou ferramenta fragmentada — e querem atender com mais presença e menos burocracia. Vocabulário real: anamnese, consulta, paciente, consultório, comportamento alimentar, retorno, evolução.

---

## 4. Arquitetura do site + estado da copy

> ⚠️ **A copy aprovada abaixo é do posicionamento ANTIGO (anamnese pré-consulta).** Está marcada `[SUPERSEDED]`. Cada seção traz o que precisa passar a comunicar no novo posicionamento (`→ novo`). A copy final do novo posicionamento ainda **não foi aprovada** — não inventar; escrever draft e validar com a Laura/Roberta.

Regras de copy (mantêm-se): headline ≤8 palavras (benefício direto), sub ≤20 palavras, CTA = verbo + valor. **Nunca** "Saiba mais", nunca slider na hero, no máx. 1 CTA primário por viewport.

**HERO** `[SUPERSEDED]`
- Antigo: "Entenda seu paciente antes da primeira consulta." / anamnese que o paciente responde no celular antes.
- **→ novo:** presença na consulta. Tagline âncora: **"Volte a olhar pro seu paciente."** A IA grava e transcreve ao vivo; você atende olhando pro paciente e termina com o prontuário pronto. Selos: Criada por Roberta Carbonari · Consulta assistida por IA · Sem instalar · Celular e computador · Dados protegidos (LGPD).

**BENEFITS / "O que muda na sua rotina"** `[SUPERSEDED]`
- **→ novo:** (1) Atenda olhando pro paciente — a IA anota por você. (2) Termine com o prontuário pronto — transcrição vira anamnese em blocos + SOAP. (3) Tudo num lugar só — plano (TACO), exames, agenda, prontuário.

**MISSÃO DA GAIA** — em grande parte reaproveitável.
- Headline: "Nutrição é sobre pessoas. Não sobre formulários." → ajustar o corpo: a burocracia da consulta (anotar, transcrever) tira a nutri do paciente; a Gaia escuta e monta o prontuário, devolvendo o tempo de cuidar.

**COMO COMEÇAR** `[SUPERSEDED]` (era: traga pacientes → envie anamnese por WhatsApp → receba pronta)
- **→ novo:** o fluxo agora é gravar a consulta ao vivo, não enviar link. Reescrever os 3 passos em cima de: migre seus pacientes → grave a consulta (a IA transcreve) → revise a anamnese em blocos e o SOAP prontos.

**A ROBERTA** — reaproveitável (autoridade não mudou). "Feita por quem atende de verdade." Selos: 3 clínicas · +20 profissionais · +1M seguidores · Mestre em Nutrição. Assinatura: Roberta Carbonari · Nutricionista (CRN3 54892) e fundadora da Gaia.

**FEATURES** `[SUPERSEDED]` — antes descrevia só a anamnese pré-consulta. Novo conjunto (1 feature = 1 bloco):
- Consulta gravada e transcrita ao vivo — você atende, a IA escuta.
- Anamnese em blocos — a transcrição vira 14 tópicos que você aceita ou edita.
- Resumo SOAP automático — o prontuário sai estruturado.
- Prontuário de 8 abas — histórico, evolução, tudo numa linha.
- Plano alimentar com base TACO.
- Antropometria e exames por PDF.
- Agenda Google + Meet · 7 questionários validados.
- `[CONFIRMAR]` capacidades e limites exatos de cada uma com o produto.

**PRICING** `[SUPERSEDED na copy, valores a confirmar]`
- R$49,90/mês ou R$490,20/ano `[CONFIRMAR]` · Badge: 2 meses grátis na migração · Hoje em **beta grátis** (login Google, sem cartão) — decidir como a landing trata beta vs. preço.
- Inclui: tudo do workspace · celular e computador · suporte na migração. Sem fidelidade.
- (Opcional: toggle Mensal/Anual.)

**TESTIMONIALS** — `[CONFIRMAR]` depoimentos reais. Ocultar até ter reais.

**FAQ** — usar/instalar, migração, segurança/LGPD (áudio não armazenado, sem treinar IA, dados no Brasil) `[CONFIRMAR]`, cancelamento `[CONFIRMAR]`.

**CTA FINAL** — "Volte a olhar pro seu paciente." / começar grátis · 2 meses grátis migrando.

**FOOTER** — Logo + tagline · Produto / Empresa (A Roberta · Contato) / Legal (Privacidade · Termos · LGPD) · © 2026 Gaia · `[CONFIRMAR razão social / CNPJ]`.

> Copy completa e direção criativa por seção estão no Figma (arquivo `12hv0KMqXBqRShavGowzdn`, página "Arquitetura da Informação"). Direção criativa por seção também vive na database "Produção" do Notion.

---

## 5. Design System (inalterado — vale para os dois posicionamentos)

### Aparência geral
**Claro, aéreo, sofisticado. Gradiente é assinatura.** Base marfim, washes suaves azul-lavanda-sage que se fundem (afluentes). NÃO é dark. Acabamento: Stripe / Mercury.

### Fontes (já no repo — `public/fonts/`, woff2/woff)
- **Títulos:** Sentient — `next/font/local`, family `--font-title`.
- **Descrição/corpo:** Clash Display — family `--font-body`.
- Escala (desktop): Display 72 / H1 56 / H2 40 / H3 28 · Body L 20 / Body 17 / Small 14 / Eyebrow 13. Mobile: 44 / 36 / 28 / 22 / 16.

### Paleta (famílias 50→900 — tokens)
```
azul (Azul-Névoa): 50 #EFF4F8 · 100 #DFE9F1 · 200 #C2D2E4 · 300 #A6BAD5 · 400 #95A9C4 · 500 #7A90AE · 600 #617697 · 700 #4B5D79 · 800 #3A485E · 900 #2A3446
roxo (Lavanda/Roxo Gaia): 50 #F5F1F7 · 100 #EADFEF · 200 #D9C8E3 · 300 #C1A9D3 · 400 #A385C0 · 500 #7454AA · 600 #5F4590 · 700 #4A3670 · 800 #372953 · 900 #241A38
sage (Verde): 50 #EEF2E8 · 100 #DDE4D2 · 200 #C4CFB4 · 300 #A6B58F · 400 #8B9E6F · 500 #6F8354 · 600 #586B42 · 700 #445333 · 800 #333F27 · 900 #232B1B
neutro: 0 #FFFFFF · 50 #FAF9F5 · 100 #F4F2EC · 200 #E8E5DC · 300 #D7D5CB · 400 #B7B6AD · 500 #8E8E86 · 600 #6A6B6E · 700 #4C4F5A · 800 #2B2E3A
semântico: success #6F8354 · warning #D6A04E · error #C05B5B · info #7A90AE
```
- **Uso:** fundo = neutro 50 (#FAF9F5). Texto = neutro 800 (#2B2E3A). CTA primário = **roxo 500 (#7454AA)**. Tints (50–200) para fundos/gradientes; tons fortes (600–900) para texto/contraste.

### Gradientes "Fluxo" (assinatura)
```
Bruma:    #DFE9F1 → #C2D2E4 → #95A9C4
Lavanda:  #F1ECF2 → #E6DBE2 → #CFC5DA
Afluente: #DFE9F1 → #E6DBE2 → #FAF9F5
Aurora:   #95A9C4 → #CFC5DA → #E6DBE2 → #FAF9F5
```
Hero e seções imersivas. Idealmente **animados** (mesh/flow lento). Biblioteca "Fluxo" (Claros/Vivos/Escuros) no Style Guide do Figma.

### Sistema
- Raio: 8 (sm) · 16 (md) · 24 (lg) · 40 (card) · full (pills)
- Espaçamento base-4: 4·8·12·16·24·32·48·64·96·128
- Elevação: sombras baixas e suaves, leve tint frio/lavanda.

### Motion (direção)
- Scroll suave (Lenis). Reveals scroll-triggered (fade-up + scale sutil, stagger 60–80ms, easing `cubic-bezier(0.16,1,0.3,1)`).
- Gradiente do hero com movimento lento (~20s loop) — "afluentes" fluindo.
- Device de marca: raiz / crescimento orgânico atravessando seções no scroll; image sequence de flor crescendo na hero (maduro, não literal). Easter eggs (hover/scroll) na camada de polimento.
- Micro-interações hover: scale 1.02–1.05 + elevação. Nunca bounce. Transições <400ms.
- Refs de motion: Jeton, Lusion, Aino Agency, Immersive Garden (gradiente no fecho).

### Logo & imagery
- Logo aprovada (in.package) — símbolo "afluentes que se encontram". Usar maduro, não literal (nada de folha óbvia).
- Roberta como face principal (fotos públicas manipuladas) · Clara Pereira apoio · minimizar stock · **não reusar as mulheres da Sintropia** · opção de ilustração abstrata do app (evita defasar com mudança de interface).

---

## 6. Stack (martelo batido)
- **Next.js 14+ (App Router) + TypeScript + Tailwind CSS**
- **GSAP + ScrollTrigger** (reveals/scrollytelling) · **Lenis** (smooth scroll) · **Framer Motion** (transições de componente, opcional)
- **Three.js / WebGL / R3F** — só para o "afluente" fluido no hero, avaliando Core Web Vitals (performance é prioridade).
- Fontes via `next/font/local` a partir de `public/fonts/`. Deploy Vercel.
- Tailwind: mapear cores como `colors.azul/roxo/sage/neutro`, `fontFamily.title = Sentient`, `fontFamily.body = ClashDisplay`, raios e spacing conforme o sistema.

## 7. Divisão de trabalho (Figma arquivo `12hv0KMqXBqRShavGowzdn`, página "Arquitetura da Informação")

| # | Section | Node ID | Dono |
|---|---------|---------|------|
| 1 | HERO | 9:375 | Kácio |
| 2 | BENEFITS | 9:403 | Kácio |
| 3 | MISSÃO DA GAIA | 9:581 | Kácio |
| 4 | COMO COMEÇAR | 9:433 | **Laura** |
| 5 | A ROBERTA | 9:579 | **Laura** |
| 6 | FEATURES | 9:448 | **Laura** |
| 7 | PRICING | 9:508 | **Laura** |
| 8 | TESTIMONIALS | 9:523 | Kácio |
| 9 | FAQ | 9:538 | Kácio |
| 10 | CTA FINAL | 9:553 | **Laura** |
| 11 | FOOTER | 9:567 | **Laura** |

Laura constrói: **Como Começar, A Roberta, Features, Pricing, CTA Final, Footer.** Nenhuma inclui o hero → motion do lado dela = scroll reveals (Lenis + GSAP), sem shader/WebGL.

## 8. Regras de conversão & anti-padrões
- Hero: headline (benefício) + sub (contexto) + visual (produto) + CTA + prova. **Nunca slider.**
- 1 feature = 1 bloco visual. Pricing com destaque no plano-alvo (Von Restorff), sem dark patterns.
- CTA = Call to Value ("Começar grátis", "Migrar e ganhar 2 meses"), nunca "Saiba mais".
- Prova social só verdadeira. Sem pop-up de email nos primeiros 10s. Máx. 1 CTA primário por viewport.

## 9. Não-negociáveis & pendências
- **Não-negociáveis:** fidelidade ao frame · performance budget (Core Web Vitals) · acessibilidade · LGPD/sigilo (áudio não armazenado, sem treinar IA, dados no Brasil `[CONFIRMAR]`).
- **Dívida aberta (posicionamento novo):** reescrever copy de Hero, Benefits, Como Começar, Features, Pricing, CTA para o produto "workspace clínico + consulta assistida". A copy atual no repo é do produto antigo.
- **`[CONFIRMAR]`:** capacidades/limites exatos das features · valores e política de beta vs. preço · depoimentos reais · postura LGPD detalhada · CNPJ/razão social · toggle anual.

## 10. Referências & links
- Site atual (a refazer): https://gaianutri.app/ · Concorrente: https://dietbox.me/pt-BR
- Notion (fonte da verdade): Gaia Nutri — briefing, Design System, databases (Personas, Dor→Solução→Feature, Concorrentes, Funil, Produção).
- Figma: arquivo `12hv0KMqXBqRShavGowzdn` — Arquitetura da Informação · Style Guide · Direção Criativa · Inspiração.
- Refs premiadas: Paraform, Linear, Stripe, Mercury (founder editorial), Jeton (scroll/image sequence), Immersive Garden, Aino Agency.

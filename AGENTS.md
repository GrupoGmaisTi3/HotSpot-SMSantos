# Supermercado Santos — MikroTik HotSpot Portal

Static HTML/CSS/JS captive portal served by MikroTik RouterOS. No build system, no dependencies, no package.json.

## Architecture

- **No build step** — files upload directly to `/hotspot/` on the MikroTik router via `ftp` or `files` upload.
- **Server-side templating** — MikroTik `$(variable)` syntax (not JS). Never convert these to JS template literals. They are substituted by RouterOS before the page reaches the browser.
- **Single-page login flow**: `login.html` contains both the landing content (hero, offers, stores) AND the login form. The CTA button reveals the inline form via `#login-form` anchor + JS toggle — no page navigation needed, avoiding MikroTik daemon URL interception.
- **Error handling**: on failed login, MikroTik injects `$(error)` into the URL as `?error=...`. The JS on `login.html` detects this parameter and auto-reveals the form section with the error message displayed.
- **CHAP authentication**: `connect.html` uses `md5.js` + hidden form with `hexMD5('$(chap-id)' + password + '$(chap-challenge)')`. Must be preserved exactly.
- **WISPr support**: `xml/` dir contains XML versions for RFC-compliant clients (Android/iOS auto-captive-portal detection).

## Pages

| File | Route | Purpose |
|------|-------|---------|
| `login.html` | `/login` (default) | Landing: offers + store info + CTA |
| `departamento.html` | `/departamento` | Offers filtered by department (`?depto=key`, ex: `?depto=hortifruti`) |
| `connect.html` | `/connect` | Login form (CHAP-aware) |
| `alogin.html` | `/alogin` | Post-auth success + redirect |
| `status.html` | `/status` | Session status, traffic, uptime, logout |
| `logout.html` | `/logout` | Disconnected confirmation |
| `error.html` | `/error` | Generic error display |
| `redirect.html` | `/redirect` | Post-auth redirect to original URL |
| `rlogin.html` | `/rlogin` | WISPr XML redirect (auto-detection) |
| `radvert.html` | `/radvert` | Advertisement interstitial |
| `api.json` | `/api.json` | JSON captive portal status API |
| `fechado.html` | `/fechado` | Fora do horário: logo + "Estamos Fechados", sem login |

## Offers system

- `js/ofertas.js` fetches offers from **RP Services API** (`http://flexapp.grupogmais.com:9000`) on page load.
- **Auth**: `POST /v1.1/auth` with `{"usuario":"100049","senha":"gr142536"}` → receives `token` + `tokenExpiration`.
- Token cached in localStorage (`@smsantos_hs_token`), auto-refreshes when expired.
- **Departments**: `GET /v1.1/departamentos` → list of `{codigo, descricao}`.
- **Offers**: `GET /v1.0/produtounidade/ofertas?unidade={CNPJ}&departamento={codigo}&limit=N` per department.
- **Hybrid strategy**: fetches up to 5 departments, queries each in parallel via `Promise.all`.
- **Mapping (`normalizarOferta`)**: `nomeProduto` → `descricaoproduto`, `precoAtual` → `preco`, `marca` → `marca`, calculates `descontoPct` from `precoAnterior/Atual`, infers `destacar` when discount ≥15%. Also calls `SantosDeptos.identificar()` to add `deptoKey` (slug) and `departamento` (display name) to each normalized offer.
- **Fallback**: if API fails, tries `/ofertas.json` (local file).
- 4h localStorage cache (`@smsantos_hs_ofertas`).
- Renders offers grouped by department (`.offers-department`) with department heading + CSS grid.
- Up to 8 offer cards, distributed across departments.
- New card fields: `.offer-card__marca` (brand), `.offer-card__old-price` (strikethrough), `.offer-card__badge--off` (%-off badge).
- Exposed globally as `window.SantosOffers`.
- **Config**: `js/config.js` contém `window.RP_CONFIG` com `baseUrl`, `fallbackUrl`, `unidade`, `usuario`, `senha`. Carregado antes de `ofertas.js` em todas as páginas que exibem ofertas. Use `.env` para documentar variáveis localmente (sem build step).
- **Fallback de servidor**: se `baseUrl` falhar (CORS/rede), `ofertas.js` tenta `fallbackUrl` automaticamente via `fetchWithFallback()`. Se ambos falharem, usa `/ofertas.json` (fallback local).

## Department identification

- `js/departamentos.js` exports `window.SantosDeptos.identificar(item)` → returns slug key (e.g. `"acougue"`).
- Priority flow — **4 steps, early return on match**:
  1. **Código da API** (`_departamento_codigo`) — consulta `CODIGO_MAP`, um dicionário que mapeia códigos numéricos da RP Services (ex: `"001"`) para slugs (ex: `"mercearia"`). Esta é a fonte primária e mais precisa, adicionada em 2026-06.
  2. **Nome do departamento** (`_departamento_nome`) — normaliza via NFD → lowercase, busca `indexOf(key)` contra os slugs conhecidos. Cobre dados da API que não tenham código mapeado.
  3. **Nome do produto** — varre `nomeProduto + marca` contra `PALAVRAS_CHAVE`. Fallback para dados legado sem metadados de departamento.
  4. **Exceções** — regras em `EXCECOES` corrigem falsos positivos dos passos 2-3 (ex: salgadinho sabor picanha não vai para Açougue). Não se aplicam quando o match veio do passo 1 (código).

### `CODIGO_MAP` — mapeamento código → departamento

Adicionado em 2026-06-11. Antes o `_departamento_codigo` era ignorado e a classificação dependia exclusivamente de palavras-chave, o que deixava ~44% dos produtos sem departamento (nome do departamento da API não coincidia com slugs conhecidos, e o nome do produto não continha palavras-chave relevantes).

**⚠️ Atenção:** Toda chamada a `identificar()` deve incluir `_departamento_codigo` no objeto passado. A função `normalizarOferta` em `ofertas.js` foi corrigida em 2026-06-11 para incluir o código, mas qualquer nova chamada a `identificar()` deve seguir o mesmo padrão — passar o item completo ou, se construindo um objeto parcial, incluir explicitamente `_departamento_codigo` e `_departamento_nome`.

O mapa cobre 24 códigos da RP Services e direciona cada um para um dos 10 slugs de departamento do portal:

| Código | Departamento RP | Mapeado para | Produtos |
|--------|-----------------|-------------|:--------:|
| 001 | Alim Basico Pesado | mercearia | 7 |
| 002 | Alim Basico Leve | mercearia | 37 |
| 003 | Alim Ind Salgado | mercearia | 146 |
| 004 | Alim Ind Doce | bomboniere | 157 |
| 005 | Matinal | matinal | 30 |
| 006 | Bomboniere | bomboniere | 58 |
| 007 | Light / Diet / Integral / Organico | mercearia | 12 |
| 010 | Bebida Quente | bebidas | 20 |
| 011 | Bebida Fria | bebidas | 64 |
| 012 | Agua / Suco / Cha | bebidas | 18 |
| 015 | Hig Pessoal / Perfumaria | limpeza | 165 |
| 016 | Limpeza | limpeza | 123 |
| 017 | Pet Shop | mercearia | 35 |
| 019 | Automotivo | mercearia | 4 |
| 025 | Acougue | acougue | 14 |
| 026 | Hortifruti | hortifruti | 7 |
| 027 | Frios | frios | 44 |
| 028 | Laticinios | frios | 50 |
| 029 | Congelados | congelados | 74 |
| 030 | Padaria | padaria | 1 |
| 032 | Rotisseria | acougue | 4 |
| 035 | Utilidade Domestica | mercearia | 22 |
| 036 | Bazar Geral | mercearia | 6 |
| 039 | Descartaveis | limpeza | 11 |

Cobertura: **99,7%** (1.109 de 1.112 produtos classificados). Os 3 não mapeados são do código 037 (Calcados), que não tem equivalente nos slugs existentes.

Códigos RP Services sem produtos no último export (potenciais para futuro): Cesta Basica (008), Tabacaria (018), Almoxarifado (033), Materia Prima (034), Manutencao (038), Classificar (099).

### Fallback legado

Os passos 2-4 (PALAVRAS_CHAVE + EXCECOES) permanecem intactos para classificar produtos de fontes legado que não tenham `_departamento_codigo` ou `_departamento_nome` (ex: `ofertas.json` raiz).

### Dependência entre páginas

O arquivo `departamentos.js` deve ser carregado **antes** de `departamento-page.js` em qualquer página que filtre por departamento (`departamento.html`). Sem ele, `window.SantosDeptos` fica `undefined` e o filtro em `processar()` é ignorado, exibindo todos os produtos independente do parâmetro `?depto=`. Corrigido em 2026-06-11 ao adicionar o `<script>` faltante em `departamento.html`.

## Localization

- **Language**: Brazilian Portuguese (`pt-BR`)
- **Error messages**: `errors.txt` — editable text file for hotspot error i18n (not HTML). When the `$(error)` variable in templates evaluates, it looks up strings here.

## Style

- Single CSS file: `css/style.css` (~2278 lines)
- CSS custom properties (`--primary: #E8732A`, etc.)
- Font: Nunito Sans (self-hosted, `fonts/nunito-sans-latin.woff2`)
- No external font dependencies — Google Fonts links removed for captive portal compatibility
- Mobile-first responsive (breakpoints at 575px, 576px, 768px)

### Layout breakpoints

| Breakpoint | Target | What changes |
|-----------|--------|-------------|
| < 576px | Mobile | Single-column, full-width, no glassmorphism. Must not be altered. |
| ≥ 576px | Tablet | Body keeps default flow. Header logo+tagline side by side. Hero/offers/stores/CTA/form scale up. Secondary pages (status/error/logout/alogin/redirect) use card-centered layout with max-width constraints. |
| ≥ 768px | Desktop | Body becomes a floating glass card (`max-width: 1160px`, `margin: 28px auto`, `backdrop-filter: blur(40px)`). Login page uses 2-column flex layout (offers 2/3 + stores 1/3) via `:has()` selectors. Premium hover effects on cards. Pill-shaped CTA button. Elevated login form card. Sticky stores sidebar. |

### Desktop glass card effect

The `html` element shows the animated warp gradient (`linear-gradient` with `gradientShift` keyframes). On ≥768px, the `body` is styled as a translucent floating card that sits on top:

```
body {
  max-width: 1160px;
  margin: 28px auto;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(40px) saturate(1.6);
  box-shadow: 0 24px 80px rgba(0,0,0,0.18);
  min-height: calc(100vh - 56px);
}
```

### Login page (≥768px)

Offers are full-width in `#main-content` (`max-width: 1060px; margin-inline: auto`). Store cards and institutional info moved to `footer-extended` section below quick links.

Stores section footer uses flex layout: `stores-grid` (flex: 2) + `footer-extended__info` card (flex: 1, sticky info block with hours/contact).

Footer inside `footer-extended` is a horizontal flex row with brand/slogan, info (addresses), and "Powered by" line.

Same `:has()` approach used on `.header` to place logo left + tagline right side by side on both tablet and desktop.

### Mobile footer (login page)

The mobile footer (`.footer--mobile`) uses the same BEM structure as the desktop sub-footer for visual consistency:
- `.footer__row` — flex row with `space-between`, wrapping
- `.footer__brand-block` (left) — `.footer__brand` (name) + `.footer__slogan`
- `.footer__info` (right) — addresses
- `.footer__powered` (full width, centered) — "Powered by MikroTik • Desenvolvido por GMais"
- Hidden at ≥576px via `display: none`, where `.footer-extended` takes over.

## Auto-close (fora do horário)

- `login.html` has an inline script at the top of `<head>` that checks the current time.
- Between **20:40 and 06:00** (market closed), it redirects to `fechado.html`.
- `fechado.html` shows logo + "Estamos Fechados" message + store hours. No login option.
- Quick links on `fechado.html`: only Status and Sair (no Conectar).
- Threshold: `20 * 60 + 40 = 1240` minutes and `6 * 60 = 360` minutes.

## External resources & Walled Garden

Since switching to self-hosted fonts, **no external font requests are required**. However, `ofertas.js` now calls the **RP Services API** at `flexapp.grupogmais.com:9000` for dynamic offers. This domain MUST be allowed in the MikroTik Walled Garden.

| Domain | Port | Purpose | Required |
|--------|------|---------|----------|
| `flexapp.grupogmais.com` | 9000 | RP Services API (offers) | Yes |
| `fonts.googleapis.com` | 443 | Google Fonts CSS | Only if not self-hosted |
| `fonts.gstatic.com` | 443 | Google Fonts WOFF2 | Only if not self-hosted |

Add to MikroTik Walled Garden:

```
/ip hotspot walled-garden add dst-host=flexapp.grupogmais.com
/ip hotspot walled-garden add dst-host=fonts.googleapis.com
/ip hotspot walled-garden add dst-host=fonts.gstatic.com
```

## CSS compatibility notes

- `color-mix()` is **not used** — replaced with `rgba()` + CSS custom properties for broader browser support.
- `backdrop-filter` has a solid `rgba()` background fallback.
- `font-display: swap` is set on the self-hosted `@font-face` so text remains visible during load.

## Uploading

Copy all files to the MikroTik's hotspot directory. Recommended via MikroTik's FTP or `/file` upload interface. No CI/CD exists.

## Observability & Logging

### Structured JSON Logger (`js/logger.js`)

Client-side structured logger carregado em **todas as páginas**. Nao depende de Node.js ou build step.

**Niveis de log:** `trace` | `debug` | `info` | `warn` | `error` | `fatal`

**Eventos padronizados (namespace `dominio.acao.resultado`):**
```
auth.attempt / auth.success / auth.fail / auth.retry / auth.exhausted
auth.token.cached / token.cache.hit / token.cache.miss / token.cache.error
offers.fetch.start / offers.fetch.ok / offers.fetch.error / offers.fetch.empty
offers.cache.hit / offers.cache.valid / offers.cache.expired / offers.cache.error
offers.depto.request / offers.depto.ok / offers.depto.empty / offers.depto.httpError
offers.fallback.start / offers.fallback.ok / offers.fallback.empty / offers.fallback.error
offers.render.ok / offers.render.empty
dept.load.start / dept.load.ok / dept.load.empty / dept.load.error
page.init / page.init.noContainer
global.error / global.unhandledRejection
```

**Contexto automatico injetado em TODO log (vindo de `HS_CONTEXT`):**
| Campo | Origem | Exemplo |
|-------|--------|---------|
| `macAddress` | `$(mac-address)` | `AA:BB:CC:DD:EE:FF` |
| `ipAddress` | `$(ip)` | `192.168.88.100` |
| `routerIdentity` | `$(identity)` | `SupermercadoSantos` |
| `hotspotUser` | `$(username)` | `maria` |
| `sessionId` | `$(session-id)` | `HS0012345` |
| `loginBy` | `$(login-by)` | `user` |
| `page` | Nome da pagina | `login`, `status`, `error` |

**Campos adicionais em cada entrada:**
`timestamp` (ISO 8601), `level`, `event`, `message`, `userAgent` (truncado 200 chars), `url` (truncado 500 chars), `executionMs` (when applicable).

### Data Masking (LGPD)

O logger redacta automaticamente qualquer campo cuja chave case-insensitive corresponda a:
`password`, `senha`, `passwd`, `secret`, `token`, `jwt`, `auth`, `authorization`, `cookie`, `sessionId`, `apiKey`, `cpf`, `cnpj`, `email`, `phone`, `telefone`, `celular`, `creditCard`, `cardNumber`, `cvv`, `cvc`

Valores mascarados como `***REDACTED***`. Strings >1000 chars truncadas.

### Error Handling Global

- `window.onerror` captura excecoes nao tratadas → `fatal` level.
- `window.onunhandledrejection` captura Promises sem catch → `error` level.
- Ambos incluem stack trace (truncado 2000 chars).

### Retry Pattern

Autenticacao na RP API usa retry com backoff exponencial:
- 3 tentativas maximas (`AUTH_MAX_RETRY`)
- Intervalo: 1s, 2s, 3s (`1000 * tentativa`)
- Logging em cada tentativa (`auth.retry`)
- Log `auth.exhausted` quando todas falham
- Fallback para `/ofertas.json` apos exaustao

### Log Remoto

Em producao, configure `window.LOG_ENDPOINT` no HTML. Erros e fatais sao enviados via `navigator.sendBeacon()` (sem bloqueio, sem CORS preflight).

### Health Check (`/api.json`)

Endpoint JSON agora inclui:
```json
{
   "captive": true/false,
   "status": "connected" | "redirect",
   "appVersion": "1.1.0",
   "hotspot": {
      "identity": "SupermercadoSantos",
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "ipAddress": "192.168.88.100",
      "username": "maria",
      "loginBy": "user",
      "uptime": "1h 23m 45s"
   },
   "monitoring": {
      "health": "ok",
      "timestamp": "...",
      "endpoints": {
         "offers": "/ofertas.json",
         "config": "/js/config.js"
      }
   }
}
```

### Script Loading Order

**Página inicial (`login.html`) — com ofertas e grid de departamentos:**
```
1. HS_CONTEXT injection (inline no <head>)
2. js/logger.js          — Logger global + error handlers
3. js/config.js          — Credenciais RP API
4. js/masks.js           — Máscaras de input (CPF, telefone)
5. js/utils.js           — Utilitarios (formatarPreco)
6. js/quick-links.js     — Navegacao rapida (Status, Sair)
7. js/departamentos.js   — Identificacao de departamentos + CODIGO_MAP
8. js/dynamic-hero.js    — Hero dinamico
9. js/header-scroll.js   — Efeito de scroll no header
10. js/ofertas.js        — Sistema de ofertas (usa Logger + SantosDeptos)
```

**Página de departamento (`departamento.html`) — filtro por `?depto=`:**
```
1. HS_CONTEXT injection (inline no <head>)
2. js/logger.js          — Logger global + error handlers
3. js/utils.js           — Utilitarios (formatarPreco)
4. js/quick-links.js     — Navegacao rapida (Inicio, Status)
5. js/departamentos.js   — Identificacao de departamentos + CODIGO_MAP (OBRIGATORIO)
6. js/departamento-page.js — Filtro e renderizacao de ofertas por departamento
```

> `departamentos.js` deve SEMPRE preceder `departamento-page.js`. Sem ele, `window.SantosDeptos` fica `undefined` e o filtro por `?depto=` é ignorado, exibindo todas as ofertas.

### Paginas sem ofertas

Ainda carregam `js/logger.js` para captura de erros globais:
- `connect.html`, `error.html`, `logout.html`, `alogin.html`, `redirect.html`

## What not to do

- Do not add package.json, npm, or build tools.
- Do not convert `$(var)` to `${var}` or template literals.
- Do not remove `md5.js` or the CHAP hidden form in `connect.html`.
- Do not remove `onerror` handlers on `<img>` tags (fallback for logo files on MikroTik).

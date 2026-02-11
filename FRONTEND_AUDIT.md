# Frontend Audit Report — Stonk Terminal Alpha View

**Scope:** Code quality, production readiness, security  
**Date:** February 10, 2025

---

## Executive summary

The app is a React + Vite + TypeScript SPA with wallet auth (SIWE), TradingView charting, WebSockets, and EVM trading. **Overall:** good structure, clear security awareness in several places, and some gaps to address before treating as production-ready (env validation, logging, ESLint, and auth storage).

---

## 1. Security

### 1.1 Positive findings

- **Security headers (vercel.json):** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and a Content-Security-Policy are set.
- **WebSocket message validation:** Incoming WS messages are validated with Zod (`websocketValidation.ts`), reducing risk of malformed or malicious payloads.
- **Middleware meta-tag injection:** Token data (symbol, name, logoUrl, request URL) is sanitized with DOMPurify and URL validation (no `javascript:`/`data:` for images, protocol check).
- **Comment content:** Rendered as React text (`{comment.content}`), so default escaping prevents XSS. No `dangerouslySetInnerHTML` for user content.
- **Explorer links:** `getExplorer(chain)` is a closed switch over `Chain` (e.g. `"SEP"`); no user-controlled redirect URLs.
- **Logger:** Production builds only log `warn`/`error`; `api`, `websocket`, `trade`, `debug` are dev-only.
- **ErrorBoundary:** Full error details (e.g. stack) only in non-production; production shows a generic message.

### 1.2 Issues and recommendations

| Issue | Location | Recommendation |
|-------|----------|----------------|
| **Tokens in localStorage** | `AuthContext.tsx` | Comments in code already flag this: tokens are XSS-recoverable. Prefer moving to httpOnly cookie–based auth and removing token storage from JS. |
| **CSP allows `unsafe-inline` and `unsafe-eval`** | `vercel.json` | Tighten when possible (e.g. nonces or hashes for scripts; avoid `unsafe-eval`). |
| **Contract addresses not validated at build** | `env.ts`, `trade-token.ts`, `deploy-token.ts`, `TradingForm.tsx`, `rpc.ts` | `VITE_EVM_ROUTER_ADDRESS`, `VITE_EVM_TOKEN_FACTORY_ADDRESS`, `VITE_EVILWETH_ADDRESS` are used but not in `validate-env.js` or `env.ts`. Add to build-time validation and fail build if missing in production. |
| **Middleware API URL hardcoded** | `middleware.ts` | `API_URL = 'https://api.stonkmarket.xyz'` is hardcoded. Prefer env (e.g. `VERCEL_ENV` + env var) so staging/local can override. |
| **`innerHTML` usage** | `TradingViewChart.tsx` (price/asset buttons) | Content is static (Price/MCap, USD/WETH). Prefer DOM APIs or React to avoid future misuse; if kept, add a short comment that content is static only. |
| **`dangerouslySetInnerHTML` in chart** | `components/ui/chart.tsx` | Used for theme CSS variables; input is theme/config-driven. Ensure `id` and theme config are never user-controlled. |

---

## 2. Code quality

### 2.1 Strengths

- **TypeScript:** Project compiles with `tsc --noEmit`; types and interfaces are used consistently.
- **Structure:** Clear separation (api, components, contexts, hooks, pages, services, utils).
- **Env validation:** `scripts/validate-env.js` (prebuild) and `src/utils/env.ts` validate `VITE_API_URL`, `VITE_AUTH_URL`, `VITE_WALLETCONNECT_PROJECT_ID` and URL format; prod build fails on missing required vars (in `env.ts` when `PROD`).
- **API client:** Centralized `apiClient` with auth injection, 401 handling and retry, and `credentials: 'include'`.

### 2.2 Issues and recommendations

| Issue | Location | Recommendation |
|-------|----------|----------------|
| **ESLint failing** | `npm run lint` | Fails with `@typescript-eslint/no-unused-expressions` (e.g. in `middleware.ts`). Fix ESLint/TypeScript-ESLint version or config so `lint` passes in CI. |
| **Many raw `console.*` calls** | See list below | Use the existing `logger` (or a single logging abstraction) everywhere and gate by environment so production bundles don’t log sensitive or noisy data. |
| **Missing effect dependency** | `AuthContext.tsx` | `useEffect` that calls `signOut()` when `!isConnected && user` does not list `signOut` (and possibly `user`) in the dependency array. Add deps or suppress with an explicit comment and ensure behavior is correct. |
| **Inconsistent error handling** | Various api modules | Many `catch` blocks only `console.error` and rethrow. Prefer consistent handling (e.g. user-facing toasts, optional reporting) and use `logger.error` instead of `console.error`. |

**Files with notable `console.*` usage (replace with logger):**

- `src/pages/TokenDetail/utils/trade-token.ts` — multiple `console.log`/`console.error` (trade params, errors).
- `src/pages/TokenDetail/components/TradingForm.tsx` — debug and error logs.
- `src/pages/Launchpad/utils/deploy-token.ts` — deployment flow logs.
- `src/api/comment.ts`, `src/api/user.ts`, `src/api/watchlist.ts`, `src/api/token.ts`, `src/api/rpc.ts` — `console.error` in catch blocks.
- `src/components/*`, `src/hooks/useComments.ts`, `src/contexts/UserContext.tsx`, etc. — scattered `console.log`/`console.error`.

---

## 3. Production readiness

### 3.1 Build and deploy

- **Prebuild validation:** `validate-env.js` runs before build; good.
- **Source maps:** Disabled in production in `vite.config.ts` (security/maintenance tradeoff is reasonable).
- **Chunking:** Sensible `manualChunks` (react, web3, ui, chart) for caching.

### 3.2 Gaps

| Gap | Recommendation |
|-----|----------------|
| **Contract address env vars** | Add `VITE_EVM_ROUTER_ADDRESS`, `VITE_EVM_TOKEN_FACTORY_ADDRESS`, `VITE_EVILWETH_ADDRESS` to `scripts/validate-env.js` and to `env.ts` (or a similar runtime validation) for production. |
| **Dev vs prod env behavior** | `env.ts` throws in PROD for missing required vars but only warns in dev; ensure all required vars are listed and that optional ones (e.g. `VITE_WEBSOCKET_URL`) are documented. |
| **Error monitoring** | `ErrorBoundary` has a placeholder for Sentry; no active error reporting. Add at least one error-reporting integration for production. |
| **Dependency audit** | Run `npm audit` (with network) and fix critical/high issues; add `npm audit` to CI. |

---

## 4. Other observations

- **Naming:** `VITE_EVILWETH_ADDRESS` is used in `.env.example` and code; confirm naming is intentional (e.g. “EVM WETH” vs “evil”) for maintainability.
- **Middleware:** Runs on Vercel; ensure matcher and token-page logic are covered by tests or a quick manual check after deploy.
- **Comments:** Several TODOs (e.g. httpOnly cookies, Sentry) are documented; track these for follow-up.

---

## 5. Checklist before production

- [ ] Fix ESLint so `npm run lint` passes.
- [ ] Validate contract-related env vars at build and document in `.env.example`.
- [ ] Replace remaining `console.*` with logger and ensure prod log level is appropriate.
- [ ] Fix `AuthContext` useEffect dependency (and verify sign-out on disconnect behavior).
- [ ] Add error reporting (e.g. Sentry) and optionally health/error endpoint as in ErrorBoundary comment.
- [ ] Run `npm audit` and address critical/high findings.
- [ ] (Optional) Harden CSP (reduce or remove `unsafe-inline`/`unsafe-eval`).
- [ ] Plan migration from localStorage tokens to httpOnly cookies when backend supports it.

---

*End of audit.*

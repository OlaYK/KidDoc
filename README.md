# KidDoc (MediKids)

KidDoc is a kid-friendly symptom explainer app with:

- React + Vite frontend
- Express backend proxy for Anthropic API
- Input validation with `zod`
- Request logging, security headers, rate limiting, and upload guards
- CI pipeline with lint + tests + build checks
- Render Blueprint deployment (`render.yaml`) with auto-deploy from Git
- Red-flag triage metadata in API and UI
- Multilingual response controls (English/Spanish/French)
- Reading-level controls (very simple/simple/detailed)
- Printable doctor handoff summary

## Why this structure

The original single-file app called the AI provider directly from the browser, which is not production-safe. This version keeps the API key server-side and enforces backend protections before calling the model.

## Prerequisites

- Node.js 18.17+ (Node 20+ recommended)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set your key:

```bash
copy .env.example .env
```

3. Start app + API in development:

```bash
npm run dev
```

Frontend: `http://localhost:5173`  
API health check: `http://localhost:8787/api/health`

## Scripts

- `npm run dev`: start frontend + backend in watch mode
- `npm run lint`: run ESLint
- `npm run test`: run Vitest in watch mode
- `npm run test:run`: run tests once (CI mode)
- `npm run build`: production build
- `npm start`: run backend server (serves `dist/` in production)

## Testing

Current automated tests cover:

- Backend health endpoint
- Backend diagnose flow (missing key, invalid upload type, success path)
- Frontend form validation and submit flow

## CI (GitHub Actions)

Workflow file: `.github/workflows/ci.yml`

On every push to `main` and every pull request, CI runs:

1. `npm ci`
2. `npm run lint`
3. `npm run test:run`
4. `npm run build`

## Render deployment with auto updates

Blueprint file: `render.yaml`

How it works:

1. Connect your GitHub repo in Render.
2. Choose Blueprint deploy and select this `render.yaml`.
3. Set required secrets (`ANTHROPIC_API_KEY`, `CORS_ORIGIN`) in Render.
4. Keep branch as `main`.

`autoDeploy: true` is enabled, so every new commit pushed to `main` triggers automatic deployment.

## Environment variables

- `ANTHROPIC_API_KEY` (required)
- `PORT` (default: `8787`)
- `MODEL` (default: `claude-sonnet-4-20250514`)
- `CORS_ORIGIN` (default: `http://localhost:5173`, comma-separated for multiple)
- `RATE_LIMIT_MAX` (default: `20` requests/10 minutes for `/api/diagnose`)
- `API_RATE_LIMIT_MAX` (default: `120` requests/15 minutes for all `/api/*`)
- `MAX_FILE_BYTES` (default: `4194304` = 4MB)
- `TRUST_PROXY` (`true` when running behind a reverse proxy)
- `ENABLE_REQUEST_LOGGING` (`true` by default)
- `NODE_ENV` (`development` or `production`)

## Feature roadmap ideas

- Symptom check history for parents (consent-based, encrypted at rest)
- Child-safe multilingual support with reading-level control
- Red-flag triage mode for emergency symptom patterns
- Structured lab report parser with value trend charts
- Parent handoff summary (print/share PDF for real doctor visits)
- Pediatric telehealth integration hooks
- Follow-up reminder plans (hydration, rest, medicine schedule)
- Consent + privacy center (COPPA/GDPR-friendly data controls)

## Production hardening next

- Add centralized logs + alerting (Sentry/OpenTelemetry)
- Add integration test in CI that boots server and calls real endpoints
- Add dependency update automation and security scanning

# Project rules for Claude Code

## Working style

- For anything bigger than a small fix, write a plan and wait for approval before coding.
- Never say a task is done without showing: type check, lint and tests passing, and a screenshot of changed screens.
- Say plainly what you could not verify.
- If a request conflicts with a security rule below, stop and explain instead of working around it.

## Stack (use these, do not hand-roll)

- TypeScript strict. Vite default multi-file build with hashed assets. React + TanStack Router.
- Tailwind CSS + shadcn/ui (Radix). Lucide icons. No large hand-written CSS files.
- Charts: Recharts or ECharts. Never hand-written SVG charts.
- Tables: TanStack Table + TanStack Virtual. Server data: TanStack Query, never fetch in useEffect.
- Forms: React Hook Form + Zod. Dates: date-fns. Money: decimal.js, never floats.
- Backend: TypeScript (Fastify) or Python (FastAPI). Oracle via node-oracledb / python-oracledb with bind variables and a pool.
- Validate every API request and response with Zod or Pydantic.
- Tests: Vitest, Testing Library, Playwright. Logging: Pino or structlog, errors to Sentry.
- Before adding a dependency: actively maintained, widely used, MIT/Apache/BSD, no duplicate of an existing one.

## Numbers and data

- All figures shown together come from the same filtered row set.
- Related figures must reconcile (estimate - actual = saving; parts sum to total), enforced by unit tests.
- Excluded rows are counted and shown, never silently dropped.
- Code computes every number. The AI model only writes text from computed values; check its numbers before display.
- Every number shows its unit and date range. One formula per metric, defined in metrics.ts.
- Null means unknown and shows as a dash, never as 0, unless the column is defined otherwise.
- Never show raw database column names; use a label map.

## Security

- No secrets in frontend code, localStorage, URLs or git. Server env vars only. Keep .env.example, gitignore .env.
- AI and other third-party APIs are called only from the server, with rate limits and a spend cap.
- Sessions in Secure, HttpOnly, SameSite cookies. Prefer SSO / Cloudflare Access. Passwords hashed with Argon2id.
- Check authorization on the server for every request.
- Bind variables for all SQL. App DB user is least-privilege, read-only on approved views. No free-form SQL for regular users.
- DEMO EXCEPTION (approved by project owner): the SQL editor is open to all users and uses the existing `KTMPL_AI` account. Allowed only while the database is a non-production copy. Even in demo, the backend must enforce SELECT-only: one statement, no DML/DDL, no PL/SQL blocks, row cap and timeout. No table is ever written. Remove this exception before any production use.
- Never render model or user text with dangerouslySetInnerHTML; sanitize Markdown with DOMPurify.
- Set CSP, HSTS, X-Content-Type-Options, frame-ancestors and Referrer-Policy. CORS to own origins only.
- User-facing errors never include stack traces, SQL or internal paths.
- Send the AI model only the data it needs; validate its output with a schema.

## UI: no AI look

- No sparkle icons, "AI Insights" labels, purple/cyan gradients, glows, glassmorphism or emoji.
- No chatty filler copy and no em dashes in UI text. Short, factual labels with numbers.
- No confidence meters or progress bars without a documented formula.
- One font family, tabular-nums for figures, a 4/8 px spacing scale, at most five type sizes.
- Light and dark themes from the same tokens; set color-scheme.
- No developer-facing text in the UI.

## Performance and accessibility

- First screen usable in under 2 s; first-load JS under 300 KB gzipped. Lazy-load heavy features.
- No duplicate requests; no polling without backoff. Virtualize lists over about 100 rows.
- WCAG 2.2 AA: labelled inputs, real buttons, 4.5:1 contrast, keyboard access, reduced motion, print styles.
- Run axe or Lighthouse on new screens and fix serious issues.

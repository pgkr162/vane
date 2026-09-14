# Medal Sports Vane overlay

Vane is forked from [ItzCrazyKns/Vane](https://github.com/ItzCrazyKns/Vane) and deployed from this GitHub repo to Railway.

Upstream Vane has no login. This overlay:

1. Uses the same Clerk instance as MD Connect (`clerk.connect.medalsports.us`).
2. After Clerk authenticates the employee, Vane asks MD Connect `POST /api/integrations/vane/access`.
3. Only active `@medalsports.com` employees with a Vane `launch` or `admin` grant can use the app.
4. Settings and `/api/config` writes require the `admin` grant.

Auth runs from `src/proxy.ts` (Next.js 16). HTML pages skip Clerk JS so Safari cannot handshake-bounce. MD Connect opens Vane with a short-lived `launch` token; the proxy stores it in an HttpOnly cookie and APIs accept that grant. `/api/health` is public so Railway can probe the container without Clerk keys. The image copies Playwright from the yarn lockfile instead of running `yarn add` at runtime, which was upgrading Next past 16.2.2.

## Token allowance

Vane does not keep a separate monthly quota. Each search reserves against the MD Connect employee AI ledger (UTC month total, plus an optional Vane app cap) via:

- `POST /api/integrations/ai/usage/reserve` (`app: vane.search`)
- `POST /api/integrations/ai/usage/complete`
- `POST /api/integrations/ai/usage/balance`

The older `/api/integrations/vane/usage/*` aliases on Connect still exist, but Vane calls `/api/integrations/ai/usage` only. Employees view remaining tokens at `https://connect.medalsports.us/ai/usage`. Admins set the employee total and optional per-app caps at `/admin/ai`. Missing policy rows mean unlimited; `0` blocks.

## Railway

- `Vane` service builds `Dockerfile.slim` from this repo.
- `SearXNG` service builds `searxng/Dockerfile` (root directory `searxng`).
- Persist `/home/vane/data` on Vane.
- Point `SEARXNG_API_URL` at the private SearXNG service.

## Clerk dashboard

Add `vane.medalsports.us` to the Clerk application's allowed subdomains / origins, using the same application keys as MD Connect. Set `VANE_PUBLIC_URL=https://vane.medalsports.us`.

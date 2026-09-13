# Medal Sports Vane overlay

Vane is forked from [ItzCrazyKns/Vane](https://github.com/ItzCrazyKns/Vane) and deployed from this GitHub repo to Railway.

Upstream Vane has no login. This overlay:

1. Uses the same Clerk instance as MD Connect (`clerk.connect.medalsports.us`).
2. After Clerk authenticates the employee, Vane asks MD Connect `POST /api/integrations/vane/access`.
3. Only active `@medalsports.com` employees with a Vane `launch` or `admin` grant can use the app.
4. Settings and `/api/config` writes require the `admin` grant.

Auth runs from `src/proxy.ts` (Next.js 16). HTML pages are allowed through so Clerk can sync the company session on `vane.medalsports.us` without a Safari redirect bounce. APIs still require a Clerk session and an MD Connect Vane grant. `/api/health` is public so Railway can probe the container without Clerk keys. The image copies Playwright from the yarn lockfile instead of running `yarn add` at runtime, which was upgrading Next past 16.2.2.

## Railway

- `Vane` service builds `Dockerfile.slim` from this repo.
- `SearXNG` service builds `searxng/Dockerfile` (root directory `searxng`).
- Persist `/home/vane/data` on Vane.
- Point `SEARXNG_API_URL` at the private SearXNG service.

## Clerk dashboard

Add `vane.medalsports.us` to the Clerk application's allowed subdomains / origins, using the same application keys as MD Connect. Set `VANE_PUBLIC_URL=https://vane.medalsports.us`.

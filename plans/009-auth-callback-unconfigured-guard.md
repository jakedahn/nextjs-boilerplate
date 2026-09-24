# Plan 009: Auth callback redirects to the error page instead of 500 when Supabase is unconfigured

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat dbd0ab8..HEAD -- src/app/auth/callback/`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `dbd0ab8` + staged dependency refresh, 2026-09-24

## Why this matters

Supabase is optional in this boilerplate: with no env vars, the middleware is a
no-op and `createClient()` throws a descriptive error. The OAuth callback route
calls `createClient()` whenever a `code` query param is present, without
checking `isSupabaseConfigured()`. Any request to `/auth/callback?code=x` on an
unconfigured deployment therefore throws inside the route handler and returns
a 500 with a stack trace in the server log, instead of the graceful redirect to
`/auth/auth-code-error` that every other failure path takes. The same route
also has no test of its `GET` handler at all (only the `sanitizeNextPath`
helper is tested). After this plan the route never throws for configuration
reasons, and both branches of `GET` are covered.

## Current state

- `src/app/auth/callback/route.ts` — the route handler (29 lines).
- `src/app/auth/callback/route.test.ts` — 6 tests for `sanitizeNextPath` only.
- `src/lib/supabase/config.ts` — exports `isSupabaseConfigured(): boolean`
  (checks `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `src/lib/supabase/server.ts:12-17` — `createClient()` throws
  `Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ...')`
  when unconfigured.

`src/app/auth/callback/route.ts:14-29` today:

```ts
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

The exemplar for "branch on configuration" is `src/app/auth/login/page.tsx:20-29`:

```tsx
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    ...
  }
```

Conventions: this file uses single quotes and no semicolons — keep that style
inside it (the repo is mixed; match the file you are in). Imports use the
`@/` alias.

## Commands you will need

| Purpose    | Command                                              | Expected on success |
|------------|------------------------------------------------------|---------------------|
| Install    | `npm ci`                                             | exit 0              |
| Lint       | `npm run lint`                                       | exit 0              |
| Typecheck  | `npm run type-check`                                 | exit 0              |
| One test   | `npx vitest run src/app/auth/callback/route.test.ts` | exit 0, 9 tests pass |
| Tests      | `npm test`                                           | exit 0, all pass    |
| Build      | `npm run build`                                      | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/app/auth/callback/route.ts`
- `src/app/auth/callback/route.test.ts`
- `plans/README.md` (status row only)

**Out of scope**:
- `src/lib/supabase/*` — the throwing behavior of `createClient()` is the
  documented contract (CLAUDE.md "Supabase Clients"); do not soften it.
- `src/app/auth/auth-code-error/page.tsx` — the destination page is fine.
- `src/proxy.ts` / middleware — unrelated.

## Git workflow

- Branch: `advisor/009-auth-callback-unconfigured-guard`
- One commit, e.g. `fix: redirect auth callback to the error page when Supabase is unconfigured`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Guard the exchange on configuration

Edit `src/app/auth/callback/route.ts`:

1. Add the import after the existing `createClient` import:
   `import { isSupabaseConfigured } from '@/lib/supabase/config'`
2. Change `if (code) {` to `if (code && isSupabaseConfigured()) {`.

The resulting handler:

```ts
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

**Verify**: `npm run type-check` → exit 0. `npm run lint` → exit 0.

### Step 2: Test both `GET` branches

Append to `src/app/auth/callback/route.test.ts` (keep the existing
`sanitizeNextPath` tests). Because the module under test imports
`@/lib/supabase/server` at top level, mock it and `@/lib/supabase/config`
with `vi.mock`; import `GET` after the mocks are declared (vi.mock is
hoisted, so a normal top-level import works).

```ts
import { afterEach, describe, expect, it, vi } from "vitest"

import { GET, sanitizeNextPath } from "@/app/auth/callback/route"

const { exchangeCodeForSession, isSupabaseConfigured } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(async () => ({ error: null })),
  isSupabaseConfigured: vi.fn(() => true),
}))

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}))

// ...existing describe("sanitizeNextPath") block stays unchanged...

describe("GET /auth/callback", () => {
  afterEach(() => {
    exchangeCodeForSession.mockClear()
    isSupabaseConfigured.mockReset()
    isSupabaseConfigured.mockReturnValue(true)
  })

  it("exchanges the code and redirects to the sanitized next path", async () => {
    const response = await GET(
      new Request("http://localhost:3000/auth/callback?code=abc&next=/dashboard")
    )

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc")
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard")
  })

  it("redirects to the error page when the exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: new Error("bad code") })

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc"))

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/auth-code-error"
    )
  })

  it("redirects to the error page without touching Supabase when unconfigured", async () => {
    isSupabaseConfigured.mockReturnValue(false)

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc"))

    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/auth-code-error"
    )
  })
})
```

Merge the `import` line with the existing one at the top of the file (the
file already imports `describe, expect, it` from vitest; add `afterEach`,
`vi`, and `GET`). If the mocked `exchangeCodeForSession` return type makes
`mockResolvedValueOnce({ error: new Error(...) })` a type error, declare the
mock as `vi.fn<() => Promise<{ error: Error | null }>>(async () => ({ error: null }))`.

**Verify**: `npx vitest run src/app/auth/callback/route.test.ts` → exit 0, `Tests 9 passed (9)`.

To prove the third test detects the bug: `git stash push src/app/auth/callback/route.ts`,
re-run the file (expect the "unconfigured" test to fail because
`exchangeCodeForSession` was called), then `git stash pop`.

### Step 3: Full gates

**Verify**: `npm test` → exit 0, all files pass (26 tests if plan 008 has landed, 24 otherwise).
**Verify**: `npm run build` → exit 0; route list still shows `ƒ /auth/callback`.
**Verify** (manual smoke, unconfigured env): `npm run build && npm run start -p 3131` then
`curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'http://localhost:3131/auth/callback?code=x'`
→ `307 http://localhost:3131/auth/auth-code-error`. Stop the server.

## Test plan

- New tests in `src/app/auth/callback/route.test.ts`: success redirect with
  sanitized `next`; exchange error → error page; unconfigured → error page
  without calling Supabase. Pattern: `vi.hoisted` + `vi.mock`, as in the
  vitest docs; assertion style as in the existing file.
- Verification: `npx vitest run src/app/auth/callback/route.test.ts` → 9 pass.

## Done criteria

- [ ] `npm run lint` exits 0
- [ ] `npm run type-check` exits 0
- [ ] `npm test` exits 0 and `route.test.ts` has 9 passing tests
- [ ] `npm run build` exits 0
- [ ] `grep -n "isSupabaseConfigured" src/app/auth/callback/route.ts` → 2 matches (import + condition)
- [ ] Production smoke: `/auth/callback?code=x` with no Supabase env → 307 to `/auth/auth-code-error`, no stack trace in the server log
- [ ] `git status` shows only the two in-scope files changed (plus `plans/README.md`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `route.ts` no longer matches the excerpt (e.g. someone already added a guard).
- `vi.mock` of `@/lib/supabase/server` does not take effect (the real module
  throws "Supabase is not configured" inside the test) after two attempts —
  report; do not set env vars in the test to work around it.
- The fix appears to require changing `createClient()`'s throwing contract.

## Maintenance notes

- If a magic-link / OTP `token_hash` branch is added to this route later, it
  needs the same `isSupabaseConfigured()` guard.
- Reviewer: confirm the `next` sanitization call is still before the guard so
  the redirect target is validated regardless of configuration.

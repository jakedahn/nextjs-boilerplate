# Plan 010: Ship `error.tsx` and `not-found.tsx` boundaries in the app root

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `ls src/app/error.tsx src/app/not-found.tsx 2>&1`
> Both must report "No such file". If either exists, STOP (someone did this
> already) and report.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (plan 011 depends on this one)
- **Category**: tech-debt
- **Planned at**: commit `dbd0ab8` + staged dependency refresh, 2026-09-24

## Why this matters

`src/app/` contains only `layout.tsx`, `page.tsx`, `globals.css`,
`favicon.ico` and the `auth/` routes. There is no `error.tsx`, so any runtime
render error anywhere in the app falls through to Next's unstyled default
boundary, and no `not-found.tsx`, so 404s render Next's default page that
ignores the app's theme and fonts. `CLAUDE.md:27` nevertheless tells agents the
App Router pages include `loading.tsx` and `error.tsx`. A boilerplate meant to
start new projects should ship both boundaries styled with its own components
so nobody discovers the gap in production. Note: Next's `error.tsx` prop for
retrying is named `retry` in the installed Next 16.3 docs
(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`),
not `reset` as in older tutorials.

## Current state

- `src/app/layout.tsx` — root layout wraps children in `<Providers>` (theme +
  QueryClient). Boundaries added at `src/app/` level render inside it, so they
  get the theme and fonts automatically.
- `src/app/auth/auth-code-error/page.tsx` — the closest visual exemplar: a
  centered `Card` with title, description and a `Button` rendered as a `Link`
  via the Base UI `render` prop. Copy its structure.

`src/app/auth/auth-code-error/page.tsx:12-33` today:

```tsx
const AuthCodeErrorPage = () => {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in failed</CardTitle>
          <CardDescription>
            The confirmation link may have expired or already been used.
            Please try signing in again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/auth/login" />}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuthCodeErrorPage
```

Installed Next docs excerpt (`error.md`) for the error boundary signature:

```tsx
'use client' // Error boundaries must be Client Components

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) { ... }
```

Conventions (CLAUDE.md): default to Server Components; `"use client"` only
where required (error boundaries require it; `not-found.tsx` does not). `const`
arrow components, `handle`-prefixed handlers, double quotes, no semicolons
(match `auth-code-error/page.tsx`). Compose with the `render` prop, never
`asChild`. Use `@/` imports.

## Commands you will need

| Purpose    | Command                     | Expected on success |
|------------|-----------------------------|---------------------|
| Lint       | `npm run lint`              | exit 0              |
| Typecheck  | `npm run type-check`        | exit 0              |
| Tests      | `npm test`                  | exit 0, all pass    |
| Build      | `npm run build`             | exit 0; the route list already shows `○ /_not-found` — after this plan that entry is rendered by your `not-found.tsx` |
| Prod smoke | `npm run start -p 3132`     | serves on 3132      |

## Scope

**In scope** (the only files you should create/modify):
- `src/app/error.tsx` (create)
- `src/app/not-found.tsx` (create)
- `src/app/not-found.test.tsx` (create)
- `plans/README.md` (status row only)

**Out of scope**:
- `src/app/global-error.tsx` — only needed to catch errors in the root layout
  itself; adds a second copy of `<html>`/`<body>` markup. Skip.
- `src/app/loading.tsx` — a root-level Suspense fallback would flash on every
  navigation of this mostly-static app; leave it to per-route decisions.
  (Plan 011 removes the CLAUDE.md claim that it exists.)
- `next.config.ts` — do not enable `globalNotFound`.
- `CLAUDE.md` / `README.md` — plan 011 owns the docs.

## Git workflow

- Branch: `advisor/010-error-and-not-found-boundaries`
- One commit, e.g. `feat: add themed error and not-found boundaries`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `src/app/not-found.tsx`

```tsx
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const NotFound = () => {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The page you are looking for does not exist or has moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/" />}>Back to home</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotFound
```

**Verify**: `npm run type-check` → exit 0.

### Step 2: Create `src/app/error.tsx`

```tsx
"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ErrorPageProps = {
  error: Error & { digest?: string }
  retry: () => void
}

const ErrorPage = ({ error, retry }: ErrorPageProps) => {
  useEffect(() => {
    // Replace with your error-reporting service.
    console.error(error)
  }, [error])

  const handleRetry = () => {
    retry()
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred while rendering this page.
            {error.digest ? ` Reference: ${error.digest}` : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRetry}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default ErrorPage
```

If `npm run type-check` reports that the boundary's second prop is named
`reset` rather than `retry` (Next's generated route types in `.next/types`
validate this), rename the prop to what the installed Next expects and note it
in your report — do not keep both.

**Verify**: `npm run type-check` → exit 0. `npm run lint` → exit 0.

### Step 3: Add a render test for the not-found page

Create `src/app/not-found.test.tsx` (pattern: `src/components/ui/button.test.tsx`):

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import NotFound from "@/app/not-found"

describe("NotFound", () => {
  it("renders the message and a link home", () => {
    render(<NotFound />)

    expect(screen.getByText("Page not found")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/"
    )
  })
})
```

`error.tsx` is intentionally not unit-tested: it is a client boundary that
only renders when Next hands it an error; the production smoke in step 4
covers it.

**Verify**: `npx vitest run src/app/not-found.test.tsx` → exit 0, 1 test passes.

### Step 4: Build and smoke

**Verify**: `npm run build` → exit 0.
**Verify**: `npm run start -p 3132 &` then
`curl -s http://localhost:3132/does-not-exist | grep -c "Page not found"` → `1`,
and `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3132/does-not-exist` → `404`.
Stop the server (`kill %1` or the PID).

For `error.tsx`, a one-off manual check (do not commit): temporarily add
`throw new Error("boom")` at the top of the `Home` component in
`src/app/page.tsx`, run `npm run dev`, load `http://localhost:3000/`, confirm
the "Something went wrong" card renders with a "Try again" button, then
`git checkout -- src/app/page.tsx` and stop the dev server.

**Verify**: `git status --short` → only the three new files (and `plans/README.md`).

## Test plan

- New: `src/app/not-found.test.tsx`, 1 test (message + home link).
- Manual: production 404 smoke and dev-mode error smoke described in step 4.
- Verification: `npm test` → all files pass (previous count + 1 file / + 1 test).

## Done criteria

- [ ] `src/app/error.tsx` exists, starts with `"use client"`, default-exports a component taking `{ error, retry }`
- [ ] `src/app/not-found.tsx` exists and default-exports a Server Component (no `"use client"`)
- [ ] `npm run lint`, `npm run type-check`, `npm test`, `npm run build` all exit 0
- [ ] `curl` of an unknown path on `next start` returns 404 and contains "Page not found"
- [ ] `git status` shows only the three new files (plus `plans/README.md`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Either boundary file already exists.
- The Next route type check rejects both `retry` and `reset` prop names — report the exact error.
- The 404 smoke returns 200 for an unknown path (would indicate a catch-all route was added elsewhere).
- Any step appears to require touching `layout.tsx`, `next.config.ts` or `components/ui`.

## Maintenance notes

- If the root layout ever throws (fonts, providers), only a `global-error.tsx`
  catches it; add one then, with its own `<html>`/`<body>`.
- Nested route groups can add their own `error.tsx` for finer recovery; the
  root one stays as the last resort.
- The `console.error` in `error.tsx` is the hook for Sentry/PostHog error
  tracking; reviewers should expect that line to be replaced, not removed.

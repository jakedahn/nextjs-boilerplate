# Plan 011: CLAUDE.md truth pass — commands, key directories, shadcn CLI invocation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat dbd0ab8..HEAD -- CLAUDE.md`
> The dependency refresh commit(s) after `dbd0ab8` touched CLAUDE.md (that is
> expected). Confirm the "Current state" excerpts below still match the live
> file with `sed -n 9,32p CLAUDE.md`; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/010-error-and-not-found-boundaries.md (the Key Directories line must describe what 010 shipped)
- **Category**: docs
- **Planned at**: commit `dbd0ab8` + staged dependency refresh, 2026-09-24

## Why this matters

`CLAUDE.md` is the file every agent reads before touching this repo, so
statements in it that are wrong cost more than missing ones. Three are wrong
today: (1) the Commands block omits `npm test` and `npm run test:watch`, even
though CI runs the test suite as a hard gate, so agents that follow the block
skip it; (2) Key Directories lists `supabase/migrations/` (the directory does
not exist; `supabase/` holds only a `.gitignore`) and, before plan 010,
`loading.tsx`/`error.tsx` that did not exist; (3) "Adding shadcn components"
says `npx shadcn@latest add`, which bypasses the CLI pinned in
`devDependencies` (`shadcn@^4.21.0`) — the file's own later bullet describes
seams (`from "cn"` imports, `add chart` downgrading recharts) that were
reproduced with the pinned version, and a floating `@latest` can differ. This
plan corrects all three without restructuring the file or touching the
Next-managed block at the end.

## Current state

`CLAUDE.md:9-19` today:

```md
## Commands

```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run type-check # Run TypeScript compiler (no emit)
```

**Adding shadcn components**: `npx shadcn@latest add <component-name>`
```

`CLAUDE.md:26-32` today:

```md
### Key Directories
- `src/app/` - App Router pages (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`)
- `src/components/ui/` - shadcn/ui components (63, incl. toast (Base UI), questionnaire, and chat: message-scroller, message, bubble, attachment, marker)
- `src/components/providers.tsx` - App providers (QueryClient, Theme)
- `src/lib/supabase/` - Supabase client configuration
- `src/hooks/` - Custom React hooks
- `supabase/migrations/` - Database migrations
```

Facts to encode (verified during recon):
- `package.json` scripts: `dev`, `build`, `start`, `lint`, `type-check`,
  `test` (`vitest run`), `test:watch` (`vitest`).
- `.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm run type-check`,
  `npm test`, `npm run build` on Node 24.
- `src/app/` after plan 010: `layout.tsx`, `page.tsx`, `error.tsx`,
  `not-found.tsx`, `globals.css`, `auth/` (login, callback, auth-code-error).
  No `loading.tsx`.
- `src/lib/auth/schemas.ts` (zod schemas) and `src/test/setup.ts` (Vitest
  setup) exist and are not listed.
- `supabase/` contains only `.gitignore`. README.md already says: "Supabase-related
  files (empty by default; add migrations/ if you use the Supabase CLI)".
- The pinned CLI runs with `npx shadcn add <name>` (npx resolves the local
  devDependency first).
- The "Migrations" bullet under "Database Conventions" (`supabase/migrations/`
  naming format) is a convention for when migrations are added; keep it.

## Commands you will need

| Purpose   | Command                                   | Expected on success |
|-----------|-------------------------------------------|---------------------|
| Lint      | `npm run lint`                            | exit 0 (docs-only change; sanity) |
| Managed block intact | `diff <(git show HEAD:CLAUDE.md \| sed -n '/BEGIN:nextjs-agent-rules/,$p') <(sed -n '/BEGIN:nextjs-agent-rules/,$p' CLAUDE.md)` | no output |
| Dev smoke | `npm run dev` (a few seconds), then stop  | `git status --short CLAUDE.md` unchanged by the dev server |

## Scope

**In scope** (the only file you should modify):
- `CLAUDE.md` — lines 9-32 only (Commands block, "Adding shadcn components" line, Key Directories list)
- `plans/README.md` (status row only)

**Out of scope**:
- Everything in `CLAUDE.md` below "### Key Directories", including the
  "Dependency notes" section and the `<!-- BEGIN:nextjs-agent-rules -->` block
  (managed by `next dev`; editing it creates a perpetual diff).
- `README.md` — already accurate on these points (its "Available Scripts" lists
  `npm test`; its project tree describes `supabase/` correctly).
- `.claude/`, `.agents/` skill directories.

## Git workflow

- Branch: `advisor/011-claude-md-truth-pass`
- One commit, e.g. `docs: align CLAUDE.md commands and key directories with the repo`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Complete the Commands block

Replace the fenced block at `CLAUDE.md:11-16` with:

```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run type-check # Run TypeScript compiler (no emit)
npm test           # Run the Vitest suite once (CI gate)
npm run test:watch # Vitest in watch mode
```

Directly after the closing fence, add one line (before the shadcn line):

```md
CI (`.github/workflows/ci.yml`) runs lint → type-check → test → build on Node 24; all four must pass before merging.
```

**Verify**: `grep -c '^npm test ' CLAUDE.md` → `1`.

### Step 2: Point the shadcn instruction at the pinned CLI

Replace `CLAUDE.md:18`:

```md
**Adding shadcn components**: `npx shadcn@latest add <component-name>`
```

with:

```md
**Adding shadcn components**: `npx shadcn add <component-name>` (uses the CLI pinned in devDependencies; do not use `@latest`). Afterwards rewrite the generated `from "cn"` import to `from "@/lib/utils"` — see Component Patterns below.
```

**Verify**: `grep -c 'shadcn@latest' CLAUDE.md` → `0`.

### Step 3: Make Key Directories match the tree

Replace the six bullets at `CLAUDE.md:27-32` with:

```md
- `src/app/` - App Router pages (`layout.tsx`, `page.tsx`, `error.tsx`, `not-found.tsx`, `auth/` routes)
- `src/components/ui/` - shadcn/ui components (63, incl. toast (Base UI), questionnaire, and chat: message-scroller, message, bubble, attachment, marker)
- `src/components/providers.tsx` - App providers (QueryClient, Theme)
- `src/lib/supabase/` - Supabase client configuration
- `src/lib/auth/` - Zod schemas shared by client and server validation
- `src/hooks/` - Custom React hooks
- `src/test/` - Vitest setup (`setup.ts`); tests live next to the code as `*.test.ts(x)`
- `supabase/` - Empty by default; add `migrations/` here if you use the Supabase CLI (naming rules under Database Conventions)
```

If plan 010 has **not** landed yet (no `src/app/error.tsx`), STOP: this plan
depends on it.

**Verify**: for each path named in the bullets, `ls` it:
`ls src/app/error.tsx src/app/not-found.tsx src/lib/auth src/test/setup.ts src/hooks supabase` → all exist.
**Verify**: `grep -c 'supabase/migrations/\` - Database migrations' CLAUDE.md` → `0`.

### Step 4: Confirm nothing else moved

**Verify**: `git diff --stat -- CLAUDE.md` → one file, roughly `+12 / -8` lines.
**Verify**: `git diff CLAUDE.md | grep '^[-+]' | grep -v '^[-+][-+]' | awk 'NR>0' | grep -n 'nextjs-agent-rules\|Dependency notes'` → no output (untouched sections).
**Verify**: run `npm run dev` for ~5 seconds, stop it, then `git status --short CLAUDE.md` → still just ` M CLAUDE.md` with the same diff (the managed block was not rewritten).
**Verify**: `npm run lint` → exit 0.

## Test plan

Docs-only; no code tests. The verifications above are the test: every path
mentioned exists, the managed block is byte-identical, and the dev server does
not dirty the file.

## Done criteria

- [ ] Commands block lists `npm test` and `npm run test:watch`, and the CI sentence is present
- [ ] `grep -c 'shadcn@latest' CLAUDE.md` → `0`
- [ ] Every path in Key Directories exists on disk; `loading.tsx` and `supabase/migrations/` are no longer claimed to exist
- [ ] The `<!-- BEGIN:nextjs-agent-rules -->` … `<!-- END -->` block and the "Dependency notes" section are byte-identical to `HEAD`
- [ ] `git status` shows only `CLAUDE.md` (plus `plans/README.md`) modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- `sed -n 9,32p CLAUDE.md` does not match the "Current state" excerpts.
- `src/app/error.tsx` or `src/app/not-found.tsx` is missing (plan 010 not landed).
- `npm run dev` rewrites CLAUDE.md into a different diff (managed-block drift) — report the diff rather than hand-editing the block.

## Maintenance notes

- Whenever a script is added to `package.json`, the Commands block must gain
  a line; whenever a top-level directory appears, Key Directories must too.
- README.md "Available Scripts" and "Project Structure" carry the same facts;
  reviewers should check the two files agree.

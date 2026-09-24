# Plan 012: Toolchain hygiene — clear npm audit, ESM-safe vitest config, Node version pin

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat dbd0ab8..HEAD -- vitest.config.ts package.json .github/workflows/ci.yml`
> The dependency refresh commit(s) after `dbd0ab8` touched `vitest.config.ts`
> and `package.json` (expected). Confirm the "Current state" excerpts match the
> live files before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (land alone — it changes `package-lock.json`)
- **Category**: dx
- **Planned at**: commit `dbd0ab8` + staged dependency refresh, 2026-09-24

## Why this matters

Three small, independent irritants left over after the dependency refresh:

1. `npm audit` reports 4 advisories (fast-uri high, js-yaml high, hono
   moderate, qs moderate). None is reachable at runtime — fast-uri only via
   the unused `@hookform/resolvers/ajv` subpath, the other three only via the
   `shadcn` CLI — but `npm audit fix --dry-run` shows all four resolve with
   in-range, lockfile-only bumps, so leaving them red is pure noise for the
   next person who runs `npm audit` or wires it into CI.
2. `vitest.config.ts` uses `import`/`export` and `__dirname` in a file Vite
   loads as CommonJS. Every `npm test` prints: `(!) Your Vite config uses
   features that are unsupported by configLoader: 'native', which is planned to
   become the default in a future major version of Vite: ESM syntax in a file
   loaded as CommonJS (vitest.config.ts:1:1). Use a .mjs extension or set
   "type": "module"`. Renaming to `.mts` and using `import.meta.dirname` fixes
   it now, before the next Vite major makes it a hard failure.
3. There is no Node version pin. jsdom 30 requires Node `^22.22.2 || ^24.15.0 || >=26`;
   on the maintainer's Node 24.12 machine `npm ci` prints four EBADENGINE
   warnings and `npm outdated` mis-reports jsdom's latest as 29.x. CI pins
   `node-version: 24` independently. An `.nvmrc` plus an `engines` field make
   the floor explicit and let CI read it from one place.

## Current state

`vitest.config.ts` (whole file, 15 lines):

```ts
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

`package.json:1-4` — `"name": "nextjs-boilerplate"`, `"version": "0.1.0"`,
`"private": true`, then `"scripts"`; there is no `"engines"` key and no
`"type"` key (the project deliberately stays CommonJS-typed so Next's default
config loading is unaffected — do **not** add `"type": "module"`).

`.github/workflows/ci.yml:12-15`:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
```

`npm audit fix --dry-run` output (verified 2026-09-24):

```
change qs 6.15.3 => 6.16.0
change js-yaml 4.3.1 => 4.3.2
change hono 4.12.33 => 4.13.9
change fast-uri 3.1.5 => 3.1.8
```

Dependency notes in `CLAUDE.md` (bullet 3) already say: "Node >= 24.15 is
required by jsdom 30 (older 24.x prints EBADENGINE warnings but works ...)".
README.md Quick Start step 2 says "Requires Node.js 24 (24.15 or newer ...)".
Keep both statements true.

## Commands you will need

| Purpose        | Command                        | Expected on success |
|----------------|--------------------------------|---------------------|
| Audit          | `npm audit`                    | `found 0 vulnerabilities`, exit 0 |
| Clean install  | `rm -rf node_modules && npm ci`| exit 0; only the 3 known ERESOLVE peer warnings (ESLint 10) and, on Node < 24.15, EBADENGINE warnings |
| Lint           | `npm run lint`                 | exit 0              |
| Typecheck      | `npm run type-check`           | exit 0              |
| Tests          | `npm test`                     | exit 0; **no** `configLoader` warning |
| Build          | `npm run build`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `package-lock.json` (via `npm audit fix` only — never by hand)
- `vitest.config.ts` → renamed to `vitest.config.mts` (git mv)
- `package.json` (add `engines` only)
- `.nvmrc` (create)
- `.github/workflows/ci.yml` (switch to `node-version-file`)
- `plans/README.md` (status row only)

**Out of scope**:
- Any version range in `package.json` `dependencies`/`devDependencies` — if
  `npm audit fix` wants to change one, STOP (it should be lockfile-only).
- `tsconfig.json` — `.mts` is not matched by the existing `**/*.ts` include,
  and that is fine: Vitest type-checks its own config. Do not add it to
  `include`.
- `"type": "module"` in `package.json` — see above.
- `eslint.config.mjs` — already ESM.
- `src/**` — nothing here changes.

## Git workflow

- Branch: `advisor/012-toolchain-hygiene`
- Three commits, one per step (they are independent and easy to revert
  separately):
  1. `chore: npm audit fix (lockfile-only, in-range)`
  2. `chore: rename vitest config to .mts to silence Vite ESM warning`
  3. `chore: pin Node 24.15+ via .nvmrc and engines`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Apply the in-range audit fix

Run `npm audit fix` (no `--force`).

**Verify**: `git status --short` → only ` M package-lock.json`. If
`package.json` is also modified, STOP (see out of scope).
**Verify**: `npm audit` → `found 0 vulnerabilities`, exit 0.
**Verify**: `npm ls fast-uri js-yaml hono qs` → versions 3.1.8, 4.3.2, 4.13.9, 6.16.0 respectively (the tree may show `deduped` entries; that is fine).
**Verify**: `npm test` → exit 0, all tests pass.
Commit.

### Step 2: Rename the vitest config to `.mts`

1. `git mv vitest.config.ts vitest.config.mts`
2. Edit `vitest.config.mts` so it reads exactly:

```ts
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
```

(`import.meta.dirname` is available on Node >= 20.11; this repo requires 24.)

Vitest discovers `vitest.config.mts` automatically; no script change is needed.

**Verify**: `ls vitest.config.*` → only `vitest.config.mts`.
**Verify**: `npm test 2>&1 | tee /tmp/vitest-out.txt; grep -c "configLoader" /tmp/vitest-out.txt` → `0`, and the run reports all tests passed (`Test Files N passed (N)`).
**Verify**: `npm run lint` → exit 0 (ESLint's config ignores are unaffected; if lint now reports the `.mts` file, add nothing — report instead).
**Verify**: `npm run type-check` → exit 0.
Commit.

### Step 3: Pin the Node version

1. Create `.nvmrc` containing exactly `24.15.0` followed by a newline.
   (`nvm`, `fnm`, Volta and `actions/setup-node` all read it; a full
   version keeps the resolution deterministic.)
2. In `package.json`, add after the `"private": true,` line:

```json
  "engines": {
    "node": ">=24.15.0"
  },
```

3. In `.github/workflows/ci.yml`, replace `node-version: 24` with
   `node-version-file: .nvmrc` (keep `cache: npm`).

**Verify**: `node -e 'console.log(require("./package.json").engines.node)'` → `>=24.15.0`.
**Verify**: `cat .nvmrc` → `24.15.0`.
**Verify**: `grep -n "node-version-file: .nvmrc" .github/workflows/ci.yml` → one match; `grep -c "node-version:" .github/workflows/ci.yml` → `0`.
**Verify**: `npm ci` → exit 0. On a machine with Node < 24.15 this now also prints one `EBADENGINE` warning for `nextjs-boilerplate@0.1.0` itself — that is the intended signal, not an error (`engine-strict` is off by default). Do **not** add `engine-strict=true` to an `.npmrc`.
**Verify**: `npm run build` → exit 0.
Commit.

### Step 4: Full clean verification

`rm -rf node_modules && npm ci && npm run lint && npm run type-check && npm test && npm run build` → all exit 0.

## Test plan

No new unit tests (tooling only). The suite itself is the test for step 2;
`npm audit` is the test for step 1; `npm ci` + CI on the next push is the test
for step 3.

## Done criteria

- [ ] `npm audit` exits 0 with 0 vulnerabilities
- [ ] `package.json` dependency ranges are unchanged versus `HEAD~3` (`git diff HEAD~3 -- package.json` shows only the added `engines` block)
- [ ] `vitest.config.mts` exists, `vitest.config.ts` does not, and `npm test` output contains no `configLoader` warning
- [ ] `.nvmrc` = `24.15.0`; `engines.node` = `>=24.15.0`; CI uses `node-version-file: .nvmrc`
- [ ] Clean `npm ci` + all four gates pass
- [ ] `git status` clean after the three commits; no `.npmrc` was added
- [ ] `plans/README.md` status row updated

## STOP conditions

- `npm audit fix` modifies `package.json` or wants `--force`.
- After step 1, `npm test` or `npm run build` fails (an in-range transitive
  bump broke something — report the package; do not pin around it by hand).
- Vitest does not pick up `vitest.config.mts` (tests run with no jsdom
  environment and fail on `document`) — report; do not add `--config` flags
  to the scripts without noting it.
- `import.meta.dirname` is `undefined` at config load (would mean Vite is
  transpiling the config to CJS despite `.mts`) — fall back to
  `path.dirname(fileURLToPath(import.meta.url))` from `node:url`, and say so
  in the report.

## Maintenance notes

- Bump `.nvmrc` and `engines.node` together; CI reads only `.nvmrc`.
- When jsdom or another dev dependency raises its Node floor again, the
  EBADENGINE warnings on `npm ci` are the cue to revisit this pin.
- `npm audit fix` is safe to re-run periodically as long as it stays
  lockfile-only; anything that needs `--force` deserves its own review.

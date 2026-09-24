# Plan 008: Make the "Create account" button actually call `signUp`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat dbd0ab8..HEAD -- src/app/auth/login/login-form.tsx src/app/auth/login/actions.ts`
> The dependency refresh commit(s) after `dbd0ab8` touched `actions.ts` (zod
> `flattenError`); that is expected. If `login-form.tsx` changed, compare the
> "Current state" excerpt against the live file before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `dbd0ab8` + staged dependency refresh, 2026-09-24

## Why this matters

The login form has one `useActionState` whose action branches on
`formData.get("intent")`, and two submit buttons that set `name="intent"`
with different `value`s while also passing a **function** as `formAction`.
React 19 does not include the submitter's `name`/`value` in the `FormData`
when the submitter's `formAction` is a function (it nulls the submitter
before building the FormData; see `node_modules/react-dom/cjs/react-dom-client.development.js:20741-20746`),
and warns in dev: `Cannot specify a "name" prop for a button that specifies a
function as a formAction ... It will get overridden.` The result is that
`intent` is never `"sign-up"`, so **"Create account" runs `signIn`** and a new
user sees "Invalid login credentials" instead of an account being created.
After this plan, each button dispatches its own intent explicitly, the
warning is gone, and a test pins the behavior.

## Current state

- `src/app/auth/login/login-form.tsx` — client component; the bug lives here.
- `src/app/auth/login/actions.ts` — server actions `signIn` and `signUp`, both
  `(prevState: AuthFormState, formData: FormData) => Promise<AuthFormState>`.
  Do not change this file.

`src/app/auth/login/login-form.tsx:15-24` today:

```tsx
const initialState: AuthFormState = {}

export const LoginForm = () => {
  const [state, formAction, isPending] = useActionState(
    (prev: AuthFormState, formData: FormData) =>
      formData.get("intent") === "sign-up"
        ? signUp(prev, formData)
        : signIn(prev, formData),
    initialState
  )
```

`src/app/auth/login/login-form.tsx:55-75` today:

```tsx
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            name="intent"
            value="sign-in"
            formAction={formAction}
            disabled={isPending}
          >
            Sign in
          </Button>
          <Button
            type="submit"
            variant="outline"
            name="intent"
            value="sign-up"
            formAction={formAction}
            disabled={isPending}
          >
            Create account
          </Button>
        </div>
```

Conventions that apply (from `CLAUDE.md`):
- `const` arrow functions; event handlers prefixed `handle` (`handleSignIn`).
- No semicolons, double quotes (match the rest of this file).
- `useActionState` is the form-state hook; `useFormStatus` is not used.

`useActionState` accepts a typed payload (from `node_modules/@types/react/index.d.ts:1987-1991`):

```ts
export function useActionState<State, Payload>(
    action: (state: Awaited<State>, payload: Payload) => State | Promise<State>,
    initialState: Awaited<State>,
    permalink?: string,
): [state: Awaited<State>, dispatch: (payload: Payload) => void, isPending: boolean];
```

A button's `formAction` may be a function `(formData: FormData) => void`; React
runs it inside a transition, so calling the `useActionState` dispatcher from
it is supported.

Test conventions: Vitest + Testing Library + jsdom; tests sit next to the code
as `*.test.tsx`; `vi.mock` for module mocks. Exemplar for a click-driven test:
`src/components/ui/button.test.tsx`. Exemplar for `vi.fn` + async assertions:
`src/components/ui/alert-dialog.test.tsx`.

## Commands you will need

| Purpose    | Command                                              | Expected on success |
|------------|------------------------------------------------------|---------------------|
| Install    | `npm ci`                                             | exit 0 (peer/engine warnings are expected, see CLAUDE.md "Dependency notes") |
| Lint       | `npm run lint`                                       | exit 0, no output   |
| Typecheck  | `npm run type-check`                                 | exit 0              |
| Tests      | `npm test`                                           | exit 0, `Test Files 9 passed`, `Tests 25 passed` |
| One test   | `npx vitest run src/app/auth/login/login-form.test.tsx` | exit 0, 2 tests pass |
| Build      | `npm run build`                                      | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/app/auth/login/login-form.tsx`
- `src/app/auth/login/login-form.test.tsx` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):
- `src/app/auth/login/actions.ts` — server actions are correct; the bug is
  purely in how the client picks one.
- `src/app/auth/login/page.tsx`
- `src/components/ui/*` — shadcn components; `Button` already forwards
  `formAction`.
- Do not add a hidden `<input name="intent">`; the payload approach below
  removes the need for the field entirely.

## Git workflow

- Branch: `advisor/008-login-form-sign-up-dispatch`
- One commit; conventional-commit style as in `git log`, e.g.
  `fix: dispatch sign-up intent explicitly from the login form`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace the intent-sniffing action with a typed payload

In `src/app/auth/login/login-form.tsx`, replace lines 15-24 with:

```tsx
const initialState: AuthFormState = {}

type AuthIntent = "sign-in" | "sign-up"

type AuthDispatch = {
  intent: AuthIntent
  formData: FormData
}

export const LoginForm = () => {
  const [state, dispatch, isPending] = useActionState(
    (prev: AuthFormState, { intent, formData }: AuthDispatch) =>
      intent === "sign-up" ? signUp(prev, formData) : signIn(prev, formData),
    initialState
  )

  const handleSignIn = (formData: FormData) => {
    dispatch({ intent: "sign-in", formData })
  }

  const handleSignUp = (formData: FormData) => {
    dispatch({ intent: "sign-up", formData })
  }
```

Then replace the two buttons (lines 56-74 in the original) with:

```tsx
          <Button type="submit" formAction={handleSignIn} disabled={isPending}>
            Sign in
          </Button>
          <Button
            type="submit"
            variant="outline"
            formAction={handleSignUp}
            disabled={isPending}
          >
            Create account
          </Button>
```

Nothing else in the file changes (imports, the `<form>`, the fields, the
error/success rendering all stay as they are).

**Verify**: `grep -n 'name="intent"\|formData.get("intent")' src/app/auth/login/login-form.tsx` → no output.
**Verify**: `npm run type-check` → exit 0.
**Verify**: `npm run lint` → exit 0.

### Step 2: Add a test that pins which server action each button calls

Create `src/app/auth/login/login-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LoginForm } from "@/app/auth/login/login-form"

const { signIn, signUp } = vi.hoisted(() => ({
  signIn: vi.fn(async () => ({})),
  signUp: vi.fn(async () => ({})),
}))

vi.mock("@/app/auth/login/actions", () => ({ signIn, signUp }))

const fillCredentials = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Email"), "jane@example.com")
  await user.type(screen.getByLabelText("Password"), "correct-horse")
}

describe("LoginForm", () => {
  beforeEach(() => {
    signIn.mockClear()
    signUp.mockClear()
  })

  it("calls signIn when Sign in is clicked", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await fillCredentials(user)

    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await vi.waitFor(() => expect(signIn).toHaveBeenCalledTimes(1))
    expect(signUp).not.toHaveBeenCalled()
    const formData = signIn.mock.calls[0][1] as FormData
    expect(formData.get("email")).toBe("jane@example.com")
  })

  it("calls signUp when Create account is clicked", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await fillCredentials(user)

    await user.click(screen.getByRole("button", { name: "Create account" }))

    await vi.waitFor(() => expect(signUp).toHaveBeenCalledTimes(1))
    expect(signIn).not.toHaveBeenCalled()
  })
})
```

Notes for the executor:
- `vi.hoisted` is required because `vi.mock` factories are hoisted above the
  imports; defining the mocks inside `vi.hoisted` makes them visible to both
  the factory and the tests.
- The mocked actions are typed loosely on purpose; if TypeScript complains
  about `mock.calls[0][1]`, cast through `unknown` (`as unknown as FormData`).
- jsdom 30 implements `requestSubmit(submitter)` and `SubmitEvent.submitter`,
  which is what React's form-action plumbing relies on. Testing Library's
  `user.click` on a submit button triggers a real submit in jsdom.
- The `<Input>` fields are labelled through `FieldLabel htmlFor="email"` /
  `htmlFor="password"`, so `getByLabelText("Email")` resolves.

**Verify**: `npx vitest run src/app/auth/login/login-form.test.tsx` → exit 0, `Tests 2 passed (2)`.

To confirm the test actually detects the original bug, temporarily run it
against the pre-change component: `git stash push src/app/auth/login/login-form.tsx`,
re-run the single test (expect the "Create account" test to **fail** with
`signUp` called 0 times), then `git stash pop`. Do not commit the stash state.

### Step 3: Full gates

**Verify**: `npm test` → exit 0, `Test Files 9 passed (9)`, `Tests 25 passed (25)`.
**Verify**: `npm run build` → exit 0.
**Verify**: `npm run dev` for a few seconds, then `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/auth/login` → `200`, and the dev server log does **not** contain `Cannot specify a "name" prop`. Stop the dev server afterwards.

## Test plan

- New: `src/app/auth/login/login-form.test.tsx` — 2 tests (sign-in dispatch,
  sign-up dispatch), mocking `@/app/auth/login/actions`. Modelled after
  `src/components/ui/button.test.tsx` (userEvent + role queries).
- Existing: all 23 tests must keep passing.
- Verification: `npm test` → 9 files / 25 tests pass.

## Done criteria

- [ ] `npm run lint` exits 0
- [ ] `npm run type-check` exits 0
- [ ] `npm test` exits 0 with 9 files / 25 tests, including the 2 new ones
- [ ] `npm run build` exits 0
- [ ] `grep -rn 'name="intent"' src/` returns no matches
- [ ] `grep -rn 'formData.get("intent")' src/` returns no matches
- [ ] Dev-server log for `/auth/login` no longer prints the React `formAction` warning
- [ ] `git status` shows only the two in-scope source files changed/added (plus `plans/README.md`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `src/app/auth/login/login-form.tsx` does not match the "Current state"
  excerpts (someone already changed the dispatch shape).
- The new sign-up test cannot observe a call to `signUp` after two honest
  attempts **and** the sign-in test also fails — that indicates jsdom is not
  delivering the submit event to React's action plumbing; report rather than
  switching to `fireEvent.submit` hacks.
- TypeScript rejects the `useActionState<State, Payload>` overload (would mean
  `@types/react` regressed); do not fall back to `any`.
- The fix appears to require editing `actions.ts` or any `components/ui` file.

## Maintenance notes

- Any future button added to this form must dispatch through `dispatch({ intent, formData })`;
  never reintroduce `name`/`value` on a button whose `formAction` is a
  function (React discards them).
- Reviewer should confirm `isPending` still disables both buttons and that
  `state.errors`/`state.success` rendering is untouched.
- Deferred: tests for `actions.ts` itself (needs mocking `next/navigation` and
  the Supabase server client) — see finding 10 in `plans/README.md`.

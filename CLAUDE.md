# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 + React 19 + TypeScript + Supabase + shadcn/ui boilerplate using the App Router.

## Commands

```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run type-check # Run TypeScript compiler (no emit)
```

**Adding shadcn components**: `npx shadcn@latest add <component-name>`

## Architecture

**Stack**: Next.js 16, React 19, TypeScript 6, Tailwind CSS 4, Supabase, shadcn/ui on Base UI, react-hook-form + zod

**Path alias**: `@/*` → `./src/*` (always use this for imports)

### Key Directories
- `src/app/` - App Router pages (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`)
- `src/components/ui/` - shadcn/ui components (63, incl. toast (Base UI), questionnaire, and chat: message-scroller, message, bubble, attachment, marker)
- `src/components/providers.tsx` - App providers (QueryClient, Theme)
- `src/lib/supabase/` - Supabase client configuration
- `src/hooks/` - Custom React hooks
- `supabase/migrations/` - Database migrations

## Supabase Clients

**Optional by default**: Supabase is disabled until env vars are set. When `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent, `updateSession` middleware is a no-op (no auth redirects) and the `createClient`/`createAdminClient` factories throw a clear error. Use `isSupabaseConfigured()` from `@/lib/supabase/config` to branch. When the vars are set, all behavior is unchanged.

**Critical**: Server client is async and requires `await`.

```tsx
// Client Component - synchronous
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()

// Server Component - async (MUST await)
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Admin operations (bypasses RLS - use carefully)
import { createAdminClient } from "@/lib/supabase/server"
const adminSupabase = await createAdminClient()
```

**Error handling**: Throw errors in Server Components, use `setState` in Client Components.

## Component Patterns

- Default to **Server Components**; add `"use client"` only for interactivity, browser APIs, or real-time
- Prefer **Server Actions** over API routes
- Always use shadcn/ui components from `@/components/ui/`
- Components are built on **Base UI** (`@base-ui/react`), not Radix: compose triggers with the `render` prop (`<DialogTrigger render={<Button />}>icon</DialogTrigger>`), not `asChild`
- Real-time subscriptions must be in Client Components
- cn() is re-exported from the zero-dependency `cn` package via `@/lib/utils`; always import it from `@/lib/utils` and rewrite the `from "cn"` import that `shadcn add` writes into new files
- Never run `shadcn add --all`, `add chart` (downgrades recharts) or `add calendar` (re-adds date-fns); alert-dialog, slider, carousel, calendar, sidebar, navigation-menu, form and use-mobile carry local fixes and must not be overwritten
- toast.tsx (Base UI) and sonner.tsx both export a Toaster; mount one, not both

## React 19 + Server Actions

**Form handling with Server Actions**:
```tsx
"use server"
async function submitForm(prevState: State, formData: FormData) {
  const validated = schema.safeParse(Object.fromEntries(formData))
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors }
  }
  // Process data...
  revalidatePath("/")
  return { success: true }
}
```

**Client-side with useActionState** (replaces deprecated useFormStatus):
```tsx
"use client"
import { useActionState } from "react"

const [state, formAction, isPending] = useActionState(submitForm, initialState)
```

**Optimistic updates**:
```tsx
const [optimisticItems, addOptimistic] = useOptimistic(items, (state, newItem) => [...state, newItem])
```

**Form validation**: Use shared Zod schemas for both client and server validation. Server-side validation is the security layer; client-side is for UX.

## Code Style

- Use `const` arrow functions: `const handleClick = () => {}`
- Prefix event handlers with `handle`: `handleSubmit`, `handleKeyDown`
- Use early returns for readability
- Use descriptive variable names
- Use `cn()` utility for conditional Tailwind classes

## TanStack Query (Client-Side Data)

Configured in `src/components/providers.tsx` (wraps app with QueryClientProvider + ThemeProvider).

```tsx
"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

// Fetch with caching
const { data, isPending } = useQuery({
  queryKey: ["posts"],
  queryFn: async () => {
    const supabase = createClient()
    const { data } = await supabase.from("posts").select("id, title")
    return data
  },
})

// Mutate with cache invalidation
const queryClient = useQueryClient()
const mutation = useMutation({
  mutationFn: async (newPost: Post) => {
    const supabase = createClient()
    return supabase.from("posts").insert(newPost)
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
})
```

## Animation

**Motion** (motion.dev, formerly Framer Motion) - for complex animations:
```tsx
import { motion, AnimatePresence, useReducedMotion } from "motion/react"

// Basic animation
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

// Wrap shadcn components
const MotionCard = motion.create(Card)
<MotionCard whileHover={{ scale: 1.02 }} />

// Enter/exit animations require AnimatePresence wrapper
<AnimatePresence>
  {isVisible && <motion.div exit={{ opacity: 0 }}>...</motion.div>}
</AnimatePresence>
```

Server Components: import from "motion/react-client" (`import * as motion from "motion/react-client"`); "motion/react" is client-only.

**CSS animations**: Use **tw-animate-css** (not tailwindcss-animate) for Tailwind v4.

**Best practices**:
- Prefer `transform` and `opacity` for GPU-accelerated animations
- Support `prefers-reduced-motion`: `const prefersReduced = useReducedMotion()`
- Keep micro-interactions under 500ms

## Accessibility

- Implement proper ARIA labels and roles
- Ensure keyboard navigation works (tabindex, focus management)
- Use semantic HTML elements
- Test with screen readers

## Database Conventions

**Naming**: Tables use snake_case plurals (`users`, `user_profiles`). Columns use snake_case singular. Foreign keys: `{table_singular}_id`.

**RLS policies**:
- Enable RLS on all tables
- Separate policies per operation (SELECT, INSERT, UPDATE, DELETE)
- Use `(select auth.uid())` (with select wrapper for performance)
- Always specify roles with `TO authenticated` or `TO anon`

**Migrations**: Files in `supabase/migrations/` follow format `YYYYMMDDHHmmss_description.sql`

## SQL Style

- Lowercase SQL keywords
- Always specify schema (`public.`)
- Use `identity generated always` for IDs
- Add table comments describing purpose
- Specify columns in queries (avoid `select *`)

## Environment Variables

**Supabase is optional** — the boilerplate runs without any of these. Setting them enables Supabase (auth middleware + clients); leaving them unset keeps Supabase disabled (middleware no-op, clients throw if called).

- `NEXT_PUBLIC_SUPABASE_URL` (required to enable Supabase)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required to enable Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (additionally required for the admin client)
- when designing UI or building frontend components, make sure to use the frontend-design skill

## Dependency notes

- TypeScript stays on 6.x on purpose: typescript-eslint (pulled in by eslint-config-next/typescript) throws at load on TS >= 7 and TS 7.0 ships no JS compiler API. Revisit when typescript-eslint supports TS 7.1+.
- ESLint 10 runs with eslint-config-next via `settings.react.version: "19"` in eslint.config.mjs (eslint-plugin-react's version detection crashes on ESLint 10). The 3 `ERESOLVE overriding peer dependency` warnings on install are expected; do not add --legacy-peer-deps.
- Node >= 24.15 is required by jsdom 30 (older 24.x prints EBADENGINE warnings but works, and `npm outdated` there wrongly lists jsdom's latest as 29.x; do not downgrade). CI uses Node 24.
- Vitest uses Vite 8's built-in TSX transform; @vitejs/plugin-react is intentionally not installed.
- Next 16.3 manages the `nextjs-agent-rules` block at the end of this file (`agentRules`, default on); keep it committed so `next dev` does not dirty the tree.
- No `overrides` or platform `optionalDependencies` are needed; npm >= 11.3 records linux binaries in a macOS-generated lockfile.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

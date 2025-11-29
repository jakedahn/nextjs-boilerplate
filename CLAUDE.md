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

**Stack**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Supabase, react-hook-form + zod

**Path alias**: `@/*` → `./src/*` (always use this for imports)

### Key Directories
- `src/app/` - App Router pages (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`)
- `src/components/ui/` - shadcn/ui components (40+)
- `src/components/providers.tsx` - App providers (QueryClient, Theme)
- `src/lib/supabase/` - Supabase client configuration
- `src/hooks/` - Custom React hooks
- `supabase/migrations/` - Database migrations

## Supabase Clients

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
- Real-time subscriptions must be in Client Components

## React 19 + Server Actions

**Form handling with Server Actions**:
```tsx
"use server"
async function submitForm(prevState: State, formData: FormData) {
  const validated = schema.safeParse(Object.fromEntries(formData))
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
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

**Framer Motion** - for complex animations:
```tsx
import { motion, AnimatePresence } from "framer-motion"

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

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin client)
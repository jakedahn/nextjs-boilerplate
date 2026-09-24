# Next.js 16 Boilerplate

A modern, feature-rich boilerplate for building full-stack web applications with Next.js 16, React 19, optional Supabase, and shadcn/ui. Get started in minutes with a component library, auth pages, testing, and CI already configured.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-optional-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

## ✨ Features

### 🚀 Next.js 16 & React 19
- **App Router** with server and client components
- **Server Actions** for seamless data mutations
- **Streaming** with loading states and Suspense
- **React 19** features including `use()` hook

### 🎨 Beautiful UI Components
- **63 shadcn/ui components** pre-configured, built on **Base UI** (`@base-ui/react`) — not Radix. Compose triggers with the `render` prop (e.g. `<DialogTrigger render={<Button />}>`), not `asChild`
- Includes a chat component set: `message`, `bubble`, `message-scroller`, `attachment`, `marker`
- Includes a Base UI `toast` (an alternative to `sonner`; mount only one `Toaster`) and a multi-step `questionnaire`
- **Tailwind CSS 4**, configured directly in `src/app/globals.css` (`@theme`, `@custom-variant`) — there is no separate JS/TS config file for it
- **Dark/light mode** theming via `next-themes`, wired up in `src/components/providers.tsx` and toggled with `src/components/theme-toggle.tsx`
- **Motion** (`motion/react`) for animations, **tw-animate-css** for CSS-based ones

### 🔐 Authentication & Database (Supabase — optional)
- **Supabase is optional.** The app runs without it: with no env vars set, the auth middleware becomes a no-op (no redirects) and `createClient`/`createAdminClient` throw a clear error if called. Set the env vars to turn it on — see the "Environment Variables" section below
- **Auth pages** at `/auth/login` (email/password sign-in and sign-up via Server Actions, validated with Zod schemas in `src/lib/auth/schemas.ts`), plus `/auth/callback` (route handler with a sanitized `next` redirect) and `/auth/auth-code-error`
- **Row Level Security (RLS)** conventions for `supabase/migrations/` are documented in `CLAUDE.md` for when you add tables
- **Real-time subscriptions** supported from Client Components

### 📡 Data Fetching
- **TanStack Query** configured in `src/components/providers.tsx` for client-side caching and mutations

### 🛠 Developer Experience
- **TypeScript** with strict type checking
- **ESLint 10** (`eslint-config-next`)
- **Vitest 5 + Testing Library** test harness (`npm test`) — component and route tests live next to the code they cover
- **GitHub Actions CI** (`.github/workflows/ci.yml`): lint → type-check → test → build on every push and PR
- **Path mapping** for clean imports (`@/components`, `@/lib`, ...)

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/nextjs-boilerplate.git
cd nextjs-boilerplate
```

### 2. Install dependencies
Requires Node.js 24 (24.15 or newer; older 24.x releases work but print `EBADENGINE` warnings).
```bash
npm install
```

### 3. (Optional) Set up Supabase
Supabase is off by default. To enable it, copy the example env file and fill in your project credentials:
```bash
cp .env.example .env.local
```
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
Leave these commented out (the default in `.env.example`) to run without Supabase — auth pages and clients stay disabled until they're set.

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application!

## 📁 Project Structure

```
├── src/
│   ├── app/                     # Next.js App Router pages
│   │   ├── auth/
│   │   │   ├── login/           # Sign-in / sign-up (Server Actions)
│   │   │   ├── callback/        # Auth callback route handler
│   │   │   └── auth-code-error/
│   │   ├── globals.css          # Tailwind 4 theme (@theme, @custom-variant)
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Homepage
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (Base UI)
│   │   ├── providers.tsx        # QueryClient + Theme providers
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── hooks/                   # Custom React hooks
│   ├── lib/
│   │   ├── auth/                # Zod schemas for auth forms
│   │   ├── supabase/             # Supabase client/server/middleware/config
│   │   └── utils.ts              # General utilities (cn(), etc.)
│   └── test/                    # Vitest setup
├── supabase/                     # Supabase-related files (empty by default; add migrations/ if you use the Supabase CLI)
├── .github/workflows/ci.yml      # CI: lint → type-check → test → build
└── package.json
```

## 🎯 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run the TypeScript compiler (no emit)
- `npm test` - Run the Vitest test suite
- `npm run test:watch` - Run Vitest in watch mode

## 🔧 Configuration

### Tailwind CSS
The project uses Tailwind CSS 4, which is configured in CSS rather than a JS config file. Customize your design tokens in `src/app/globals.css` (`@theme`, `@custom-variant`).

### shadcn/ui Components
Add new components using the shadcn/ui CLI:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
```
Components are built on Base UI — compose triggers with the `render` prop instead of Radix's `asChild`.

### Supabase Integration
- **Client setup**: `src/lib/supabase/client.ts`
- **Server setup**: `src/lib/supabase/server.ts` (async — see usage example below)
- **Config helper**: `isSupabaseConfigured()` in `src/lib/supabase/config.ts` lets you branch on whether Supabase env vars are set
- **Middleware**: `src/lib/supabase/middleware.ts` — a no-op when Supabase isn't configured

## 📚 Usage Examples

### Creating a Server Component with Data Fetching
```tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
export default async function PostsPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts?.map(post => (
        <Card key={post.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>{post.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{post.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

### Creating a Client Component with Real-time Data
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function LiveNotifications() {
  const [notifications, setNotifications] = useState([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [supabase])

  return (
    <div className="space-y-4">
      {notifications.map(notification => (
        <div key={notification.id} className="p-4 border rounded-lg">
          {notification.message}
        </div>
      ))}
    </div>
  )
}
```

## 🔑 Environment Variables

Supabase is **optional**. With no env vars set, the auth middleware no-ops (no redirects) and `createClient`/`createAdminClient` throw a helpful error if called. Set these to enable it:

- `NEXT_PUBLIC_SUPABASE_URL` (required to enable Supabase)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required to enable Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (additionally required for the admin client)

See `.env.example` for the full reference.

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add your environment variables in the Vercel dashboard (optional — only needed if you're using Supabase)
4. Deploy automatically on every push

### Other Platforms
This project can be deployed to any platform that supports Next.js:
- **Netlify**: Use `@netlify/plugin-nextjs`
- **Railway**: Connect your GitHub repository
- **AWS Amplify**: Use the Next.js build settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Base UI Documentation](https://base-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)

---

**Built with ❤️ by jakedahn**

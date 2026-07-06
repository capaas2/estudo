<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# StudyPro v4 — Agent Instructions

## Plano Completo
Leia `PLANO-STUDYPRO-V4.md` na raiz antes de qualquer mudança significativa.

## Stack
- **Frontend:** Next.js 16 (App Router, Server Components), Tailwind CSS v4
- **Backend:** Appwrite (Auth, Databases, Storage, Functions, Realtime)
- **IA:** Gemini + OpenRouter (via API routes em `src/app/api/`)
- **State:** Zustand (global), TanStack React Query (server state)
- **UI:** Framer Motion, Lucide Icons, Recharts, Tiptap

## Convenções
- Sempre use Português do Brasil para textos da UI.
- Tipos em `src/types/database.ts` — nunca use `any`.
- IDs de coleções centralizados em `src/lib/appwrite/collections.ts`.
- Permissões via `userPermissions(userId)` de `src/lib/appwrite/permissions.ts`.
- Design system em `src/app/globals.css` — use classes existentes, não crie classes ad-hoc.
- Componentes unificados: `QuestoesView`, `FlashcardsView`, etc., aceitam `materiaId?` como prop.
- Auth é resolvida no `middleware.ts` (server-side) — não use contexto React para auth.

## Fases
O desenvolvimento segue as fases do `PLANO-STUDYPRO-V4.md` (seção 8).
Cada sessão deve focar em uma fase específica e ter critério de aceite claro.

# Repository Guidelines

## Project Structure & Module Organization
The app is a Next.js 16 + React 19 client-side WebGPU project.

- `src/app/`: App Router routes (for example `chat/`, `speech-to-text/`, `vision-chat/`) and colocated Web Workers (`*-worker.ts`).
- `src/components/`: Reusable UI, split by feature (`chat/`, `detection/`, `shared/`, etc.).
- `src/hooks/`: Feature hooks that bridge worker messages to React state (`useChatBot.ts`, `useTranscriber.ts`).
- `src/lib/`: Model registries (`*-constants.ts`), utilities, and WebGPU internals.
- `src/types/`: Shared TypeScript types.
- `public/`: Static assets.

Preferred feature pattern: `constants -> worker -> hook -> page`.

## Build, Test, and Development Commands
- `pnpm install`: Install dependencies.
- `pnpm dev`: Start local dev server at `http://localhost:3000`.
- `pnpm lint`: Run ESLint (`eslint-config-next` + TypeScript rules).
- `pnpm build`: Create a production build.
- `pnpm start`: Serve the production build locally.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict` mode enabled in `tsconfig.json`).
- Indentation: 2 spaces; keep existing semicolon and double-quote style.
- Components: PascalCase file/function names (for example `FeatureCard.tsx`).
- Hooks: `useXxx` camelCase naming (for example `useWebcam.ts`).
- Constants/registries: kebab-case files ending in `-constants.ts`.
- Imports: prefer `@/*` path alias for `src` imports.

## Testing Guidelines
There is no dedicated automated test suite configured yet. For every change:

- Run `pnpm lint`.
- Validate affected routes in `pnpm dev` (especially WebGPU-dependent flows in Chrome/Edge).
- For UI changes, verify both desktop and mobile breakpoints.

If you add tests, use `*.test.ts`/`*.test.tsx` naming and colocate near the feature module.

## Commit & Pull Request Guidelines
Commit history follows concise, imperative subjects (for example `Add WebGPU chat with model registry`).

- Keep commits focused to one feature/fix.
- Use clear subjects starting with a verb (`Add`, `Fix`, `Refactor`, `Redesign`).
- PRs should include: summary, impacted routes/files, manual test steps, and screenshots/video for UI changes.
- Link related issues when applicable.

## Security & Configuration Tips
- Never commit secrets or local overrides (`.env.local` is local-only).
- Keep inference client-side; avoid adding code that uploads user media/text unless explicitly required.

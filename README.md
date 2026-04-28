# incremental-math

A content site replicating and extending Anthony Pecorella's [_The Math of Idle Games_ (Part I–III)](https://www.sirpinski.com/the-math-of-idle-games-part-i/), with live sims and demos backed by [open-loop-engine](../open-loop-engine).

Faithful re-do first; modern evolution (softcaps, etc.) follows.

Source pages archived under `docs/source/` (HTML snapshots, gitignored).

## Stack

Astro 5 + TypeScript + Vue (for interactive demo islands) + open-loop-engine. Prose lives in `.md` pages; demos are Vue components hydrated per-island via `client:visible`.

## Commands

```bash
pnpm install          # engine resolves via link: to ../open-loop-engine
pnpm dev              # Astro dev server
pnpm build            # astro build (static output to dist/)
pnpm preview          # preview production build
pnpm check            # astro check (type + content validation)
pnpm lint             # eslint src/
pnpm format           # prettier --write
```

## Layout

```
src/
├── pages/             # File-based routing
│   ├── index.astro    # Landing / TOC
│   ├── part-i.md      # Part I prose (uses Article layout)
│   ├── part-ii.md
│   └── part-iii.md
├── layouts/
│   └── Article.astro  # Wrapper for prose pages
├── components/        # Vue demo components — each owns one engine instance
│                      # Embed in .md pages as: <DemoName client:visible />
└── styles/base.css    # Prose typography + CSS variables
```

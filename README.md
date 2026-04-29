# incremental-math

A content site replicating and extending Anthony Pecorella's [_The Math of Idle Games_ (Part I–III)](https://www.sirpinski.com/the-math-of-idle-games-part-i/), with every chart re-rendered as a live interactive demo.

**Live site:** https://namahanna.codeberg.page/incremental-math/

Faithful Pecorella distillation first; modern evolution (softcaps, synergy multipliers, production graphs, etc.) follows in a dedicated section.

Source HTML snapshots of the originals are archived under `docs/source/` (gitignored). The backing GDC spreadsheets are served from `public/source/sheets/` and available at `/incremental-math/source/sheets/` on the live site.

## Stack

Astro 5 · TypeScript · Vue 3 (demo islands) · break_eternity.js · eternal_notations · KaTeX

Prose lives in `.mdx` pages; interactive demos are Vue components hydrated lazily via `client:visible`.

## Commands

```bash
pnpm install          # engine resolves via link: to ../open-loop-engine
pnpm dev              # Astro dev server
pnpm build            # static output → dist/
pnpm preview          # preview production build
pnpm check            # astro check (type + content validation)
pnpm lint             # eslint
pnpm format           # prettier --write
```

## Layout

```
src/
├── pages/
│   ├── index.astro          # Landing / TOC
│   ├── part-i.mdx           # Pecorella Part I — Cost & Production
│   ├── part-ii.mdx          # Pecorella Part II — Derivative Growth
│   ├── part-iii.mdx         # Pecorella Part III — Prestige Cycles
│   └── modern/              # Post-2016 patterns (independent topics)
│       ├── big-numbers.mdx
│       ├── softcaps.mdx
│       ├── challenges.mdx
│       ├── offline-progress.mdx
│       ├── production-graphs.mdx
│       ├── synergy-multipliers.mdx
│       ├── modifier-chains.mdx
│       ├── cost-acceleration.mdx
│       ├── layered-prestige.mdx
│       ├── time-as-resource.mdx
│       └── automation.mdx
├── layouts/
│   └── Article.astro        # Prose page wrapper
├── components/              # Vue demo islands — one engine instance each
└── styles/base.css          # Typography + CSS variables
```

## Deployment

Pushes to `main` trigger a Codeberg Pages deploy via `.forgejo/workflows/deploy.yml`.

# incremental-math

A content site replicating and extending Anthony Pecorella's [_The Math of Idle Games_ (Part I–III)](https://www.sirpinski.com/the-math-of-idle-games-part-i/), with every chart re-rendered as a live interactive demo.

**Live site:** https://open-loop-games.github.io/incremental-math/

Faithful Pecorella distillation first; modern evolution (softcaps, synergy multipliers, production graphs, etc.) follows in a dedicated section.

Source HTML snapshots of the originals are archived under `docs/source/` (gitignored). The backing GDC spreadsheets are served from `public/source/sheets/` and available at `/incremental-math/source/sheets/` on the live site.

## Stack

Astro 5 · TypeScript · Vue 3 (demo islands) · break_eternity.js · eternal_notations · KaTeX

Prose lives in `.mdx` pages; interactive demos are Vue components hydrated lazily via `client:visible`.

## Commands

```bash
pnpm install
pnpm dev              # Astro dev server
pnpm build            # static output → dist/
pnpm preview          # preview production build
pnpm typecheck        # astro check (type + content validation)
pnpm lint             # oxlint
pnpm format           # oxfmt (prettier for .astro, which oxfmt skips)
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

Pushes to `main` deploy to GitHub Pages via `.github/workflows/pages.yml`, which runs on the GitHub mirror of this repo.

## License

The written pages (`src/pages/**/*.mdx`) are [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): reuse them with attribution. See `LICENSE-CONTENT`.

Everything else, including the demos, components and scripts, is MIT. See `LICENSE`.

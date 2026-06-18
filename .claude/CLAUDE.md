# CLAUDE.md

`incremental-math` — research output surface in the studio (see `/work/studio/CLAUDE.md` § Studio components). Distillation site that consumes the corpus to publish content slices: Pecorella's Part I–III replication (`part-i/ii/iii.mdx`), modern post-2015 patterns (`modern/`), the design playbook (`design-playbook/`), and the rate-function lineage (`rate-functions/`). Pecorella replication is one slice, ~10% of the site.

This is a content site, not a game: demos are static curves and self-contained sims built directly on `break_eternity.js` via `src/lib/decimal.ts` and `src/lib/formula.ts`.

**Stack:** Astro 5 + TypeScript + Vue (demo islands) + break_eternity.js + eternal_notations.

## Project shape

- **Pages (`src/pages/*.md` and `*.astro`)** — file-based routing. Prose lives in `.md`; the index is `.astro` for the TOC.
- **Layouts (`src/layouts/Article.astro`)** — prose page wrapper. Pulled in via frontmatter `layout:`.
- **Demos (`src/components/*.vue`)** — self-contained sliders + chart, built directly on `src/lib/`. No global state. Embedded in `.md` pages as `<DemoName client:visible />` (lazy-hydrate when scrolled into view).
- **Source pages (`docs/source/`, gitignored)** — HTML snapshots of Pecorella's three posts plus the `Idle Game Models (GDC Talk)/*.xlsx` sheets that are the formula source-of-truth. Reference, not authored content. Demos transcribe formulas directly from these sheets.
- **Charts** — uPlot, wrapped by `src/components/RatePlot.vue` (multi-series, log-scale, and overlay annotations). Demos parameterize it; reach for hand-rolled SVG only when a demo isn't a function-over-a-domain plot.
- **Math rendering** — KaTeX via `remark-math` + `rehype-katex`, wired into the Astro markdown pipeline (`astro.config.mjs`). Author `$inline$` and `$$display$$` directly in `.md`/`.mdx`.

## Conventions

- Faithful Part I–III replication first. Modern evolution (softcaps, post-2015 patterns) follows in dedicated pages, not interleaved into the originals.
- **No raw plots.** Every chart figure is a Vue demo island parameterized by the data behind it. If a section would otherwise show a static curve, render it interactively with sliders for the inputs that produced the curve.
- Each demo is self-contained. No shared instance, no save state, no settings module — those would be game-shaped, this is content-shaped.
- All game quantities use `Decimal` from `src/lib/decimal.ts` (a thin wrapper over `break_eternity.js` with an `eternal_notations`-backed `format` helper).
- Markdown for prose. Vue SFCs only when the demo needs interactivity. Resist building shells until two demos converge on the same shape.
- Prefer `client:visible` for demo hydration. `client:load` only if the demo must be interactive above the fold.
- Paraphrase + cite — not verbatim reproduction of Pecorella's text. Each part page ends with a `<Sources>` block linking the original post and any backing spreadsheets.
- **Link concepts, not games.** Named math/CS concepts (series, theorems, numerical methods, named curves) link to a canonical source (Wikipedia) on first mention only. Game names stay plain text — cited via `<Cite>` and listed in `<Sources>`, never hyperlinked.
- **Research is confidence, not citation.** Write as an informed author who knows the field; research tells you what's true and how strongly. No variation letters, corpus counts, or "validated across N games" phrasing in page prose.

## Research reference

- `open-loop-research/LIBRARY.md` — pattern library, source of truth for "is this validated?"
- `open-loop-research/analyses/complete/` — per-game analyses to cite for "evolution since 2015" sections.

## Must Not

- Add Tailwind, shadcn-vue, or any CSS framework. Theme by CSS variable.
- Hydrate demos with `client:load` when `client:visible` would do.
- Add SSR. Static output only.

<!-- Private, gitignored per-repo notes (replaces auto-memory). Resolves to .claude/CLAUDE.local.md. -->

@CLAUDE.local.md

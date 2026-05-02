# CLAUDE.md

`incremental-math` — research output surface in the studio (see `/work/studio/CLAUDE.md` § Studio components). Distillation site that consumes the corpus and engine to publish content slices: Pecorella's Part I–III replication (`part-i/ii/iii.mdx`), modern post-2015 patterns (`modern/`), the design playbook (`design-playbook/`), and the rate-function lineage (`rate-functions/`). Pecorella replication is one slice, ~10% of the site.

This is a content site, not a game. It consumes the engine the way a research artifact would: many small isolated engine instances per demo, harness primitives (`run-sensitivity`, `run-matrix`) for static parameter-sweep charts. It also drives engine work — math pages name genre-converged shapes (cost acceleration, synergy multipliers, offline-progress banking) that the engine's `candidate-primitives.md` cites as research-refs for parked primitives.

**Stack:** Astro 5 + TypeScript + Vue (demo islands) + open-loop-engine + break_eternity.js.

## Project shape

- **Pages (`src/pages/*.md` and `*.astro`)** — file-based routing. Prose lives in `.md`; the index is `.astro` for the TOC.
- **Layouts (`src/layouts/Article.astro`)** — prose page wrapper. Pulled in via frontmatter `layout:`.
- **Demos (`src/components/*.vue`)** — one isolated engine instance per demo. Self-contained sliders + chart. No global state. Embedded in `.md` pages as `<DemoName client:visible />` (lazy-hydrate when scrolled into view).
- **Source pages (`docs/source/`, gitignored)** — HTML snapshots of Pecorella's three posts plus the `Idle Game Models (GDC Talk)/*.xlsx` sheets that are the formula source-of-truth. Reference, not authored content. Demos transcribe formulas directly from these sheets.
- **Charts** — TBD on first chart need (uplot is the leading candidate for sweep visualizations).
- **Math rendering** — TBD on first formula need (KaTeX via `remark-math` + `rehype-katex` integrated into Astro's markdown pipeline).

## Conventions

- Faithful Part I–III replication first. Modern evolution (softcaps, post-2015 patterns) follows in dedicated pages, not interleaved into the originals.
- **Faithful+, not just faithful.** Pecorella's formulas are paraphrased verbatim, but each demo also notes the engine equivalent inline. The engine's `Formula` class (Profectus/TMT lineage closed-form DSL, exported by `open-loop-engine/core`) collapses several of Pecorella's hand-rolled loops into one call: `Formula.exponential(level, base, growth)` is his cost formula; `.evaluateIntegral(N)` is the Part I bulk-buy "BONUS CONTENT" formula; `.invert(value)` is "what level costs X?" / max-affordable. Demos that mirror Pecorella's longhand math keep the longhand (transcribing the formula is the teaching tool); demos for the BONUS CONTENT and any closed-form-only ideas (max-affordable, inverse, integral-of-cost) use `Formula` directly because that's the whole point. Annotations are inline asides — short callouts placed next to the relevant formula or demo, not segregated into a per-section "Modern API" block.
- **No raw plots.** Every chart figure is a Vue demo island parameterized by the data behind it. If a section would otherwise show a static curve, render it interactively with sliders for the inputs that produced the curve.
- **Engine on demand.** Static curves (cost vs N owned) use `Decimal` math directly — no engine instance. Engine instances are reserved for time-evolving sims (production-over-time, prestige cycles, full reset loops). Don't force engine where it doesn't earn its weight.
- Each demo is self-contained. No shared engine instance, no save state, no settings module — those would be game-shaped, this is content-shaped.
- All game quantities use `Decimal` from `open-loop-engine` (re-exported), not `break_eternity.js` directly.
- Markdown for prose. Vue SFCs only when the demo needs interactivity. Resist building shells until two demos converge on the same shape.
- Prefer `client:visible` for demo hydration. `client:load` only if the demo must be interactive above the fold.
- Paraphrase + cite — not verbatim reproduction of Pecorella's text. Each part page ends with a `<Sources>` block linking the original post and any backing spreadsheets.

## Engine reference

- `open-loop-engine/docs/api/INDEX.md` — per-symbol directory.
- `open-loop-engine/docs/consumer-guide.md` — abstraction-layer guidance.
- Harness primitives (`src/harness/run-sensitivity.ts`, `run-matrix.ts`) for static parameter sweeps.

## Research reference

- `open-loop-research/LIBRARY.md` — pattern library, source of truth for "is this validated?"
- `open-loop-research/analyses/complete/` — per-game analyses to cite for "evolution since 2015" sections.

## Must Not

- Add Tailwind, shadcn-vue, or any CSS framework. Theme by CSS variable.
- Bundle the engine — it's a `link:` peer.
- Hydrate demos with `client:load` when `client:visible` would do.
- Add SSR. Static output only.

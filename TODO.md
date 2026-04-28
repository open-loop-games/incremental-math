# TODO — incremental-math

Living plan. Replication of Pecorella's _The Math of Idle Games_ (Part I–III) plus a modern-evolution Part IV. Informal tracking — promote to Vikunja only if something demands it.

## Decisions locked in

- **Multi-page routing.** Pecorella's three at `/part-i`, `/part-ii`, `/part-iii`. Modern lives under `/modern/<topic>` — multiple focused pages, not one mega-page, because Pecorella's per-part discipline is the load-bearing trick.
- **No raw plots** — every chart figure is a Vue demo island parameterized by the data behind it. If we'd draw a static line, we render it interactively instead.
- **Engine on demand** — static curves use `Decimal` math directly. Engine instances reserved for time-evolving sims (production-over-time, prestige cycles).
- **Paraphrase + cite** — not verbatim reproduction. Source links per page.
- **Source spreadsheets** — `docs/source/Idle Game Models (GDC Talk)/*.xlsx` are the formula source-of-truth for Part I–III. Demos transcribe directly from them.
- **Modern register switch.** Modern pages are _distillations_ from the research corpus, not paraphrases of a single source. Tone is "Pecorella stopped here; here's what the genre learned." Demo density may drop in favor of context/text — undecided per-topic; one anchor demo + narrative is fine when text is the point.
- **Length discipline.** Per-topic target ~2500–4000 words (Pecorella's range). Overrun = signal the topic is actually two topics; split rather than dilute.
- **Citations.** Modern pages cite upstream GitHub/GitLab paths with line numbers and pinned SHAs. `src/lib/cite.ts` resolves a `{ repo, path, line }` triple at build time against `../open-loop-research/.gitmodules` + `git submodule status`. `<Cite>` for inline; `<Sources cites={[...]}>` for the footer block. Both shapes coexist with the legacy `post`/`sheets` shape.
- **One global sidebar.** `Sidebar.astro` renders site nav (grouped by section) + per-page TOC, both collapsible. Reused on every page including `/`. Mobile is a hamburger drawer with scrim. Index page is content + sidebar; no separate `/modern` hub page — the sidebar is the hub.
- **`pages.ts` shape.** Sections concept (`label`, `blurb`, `pages[]`); `partChain` is the flatmap; `adjacent()` walks the flat chain unchanged. `PagePointer.description` provides the one-line hook shown on the index landing cards.

## Source ↔ demo mapping

| Sheet                                         | Pecorella scope                           | Demo target                 |
| --------------------------------------------- | ----------------------------------------- | --------------------------- |
| `1a. Simple Exponential Growth`               | Part I — cost vs production seesaw        | `<ExponentialGrowthSim>`    |
| `1b. Multibuy Calculation Formula`            | Part I — bulk-buy cost math               | `<MultibuyCalculator>`      |
| `1c. Optimal Choice`                          | Part I — which generator to buy           | `<OptimalChoiceTable>`      |
| `1d. Optimal Choice + Global Multipliers`     | Part I — milestone multipliers            | `<OptimalChoiceGlobal>`     |
| `1e. Optimal Choice + Individual Multipliers` | Part I — per-gen multipliers              | `<OptimalChoiceIndividual>` |
| `2a. Simple Derivative Growth Model`          | Part II — generators producing generators | `<DerivativeCascadeSim>`    |
| `3a. Prestige Patterns`                       | Part III — prestige loop math             | `<PrestigePatterns>`        |

Anything Pecorella illustrates _without_ a sheet (e.g., Part II step-through visualization, Part III narrative on cadence) gets its own derived demo.

## Phase 0 — Plumbing ✅

- [x] KaTeX integration (`remark-math` + `rehype-katex`) — formulas via `$...$` and `$$...$$`
- [x] TOC sidebar component — auto-extracted h2/h3 in `Article.astro` from `Astro.props.headings`, sticky on desktop, collapsible everywhere
- [x] Prev/next nav in `Article.astro` — wired via `src/data/pages.ts` (`partChain` + `adjacent()`)
- [x] `<Demo>` reference component — `src/components/DemoExponent.vue` shows the canonical shape (props in, reactive computation, output via engine `Decimal` + `format`)
- [x] `<Sources>` footer block — `src/components/Sources.astro`
- [x] **Pages switched from `.md` to `.mdx`** — Astro `.md` doesn't process `import` statements or framework component tags. MDX is required for Vue islands inside prose. `@astrojs/mdx` integration added; `client:*` directives + JSX-style props (`base={2}`, not `:base="2"`) work.
- [x] **Citation helper** — `src/lib/cite.ts` resolves `{ repo, path, line }` against research-corpus submodules at build time, returning a pinned-SHA GitHub/GitLab URL. `<Cite>` for inline use; `<Sources cites={[...]}>` for footer lists. Handles GitHub + GitLab; falls back to a struck-through display when the repo isn't a known submodule.
- [x] **Sidebar refactor** — single global `Sidebar.astro` replaces the per-page TOC rail. Renders sections nav + on-this-page TOC, collapsible. Mobile hamburger drawer with scrim, scroll lock, Esc-to-close, anchor-click-to-close. Reused on every page including `/`.
- [x] **Index overhaul** — section cards with one-line hooks per page (`PagePointer.description`). Two mirrored groupings (Pecorella / Modern). Reuses sidebar shell.
- [x] **Modern page stubs** — eight `/modern/<topic>.mdx` files with frontmatter + h1 + teaser + "draft pending" placeholder, so the chain links and prev/next work before content lands.
- [ ] Decide chart approach on first concrete need (hand-rolled SVG vs uPlot) — deferred to Phase 1

## Phase 1 — Faithful Part I ✅

- [x] Pull prose from `docs/source/The Math of Idle Games, Part I.html` into `src/pages/part-i.mdx` (paraphrased, not verbatim — per CLAUDE.md)
- [x] Open & transcribe formulas from `1a`–`1e` sheets
- [x] `<ExponentialGrowthSim>` — sliders for `costBase`, `rateGrowth`, `productionBase`; lines for cost(N), production(N), with log-scale + milestone-bumps toggles. Raw `Decimal` math (faithful longhand per the Faithful+ rule).
- [x] `<MultibuyCalculator>` — Pecorella's BONUS CONTENT: cost-to-buy table + max-affordable. Uses engine `Formula.exponential` + `calculateCost` + `invertIntegral` directly per the Faithful+ closed-form-only rule.
- [x] `<OptimalChoiceTable>` — given cash + 5 owned counts, which generator is the next-best buy? Uses Pecorella's `cost/income + cost/itemIncome` score. Subsumes 1d + 1e via a milestone-mode toggle (none / global / individual) — collapsed three planned components into one because they share UI shell and only differ in the bonus-lookup function. Not separate `<OptimalChoiceGlobal>` / `<OptimalChoiceIndividual>` components.
- [x] `<Sources>` block: links to original post + sheets `1a`–`1e`
- [x] **Faithful+ convention encoded in CLAUDE.md.** Inline-aside annotations note the engine `Formula` API equivalent next to each Pecorella formula. Demos that mirror Pecorella's longhand keep raw math; closed-form-only demos use `Formula` directly.

## Phase 2 — Faithful Part II ✅

- [x] Pull prose into `src/pages/part-ii.mdx` (paraphrased per CLAUDE.md, MDX so `.vue` islands embed)
- [x] Open & transcribe `2a. Simple Derivative Growth Model` — forward-Euler recurrence `T_i(t+1) = T_i(t) + T_{i+1}(t) · r_i`, Tier 0 income = baseIncome
- [x] `<DiscreteStepThrough>` — depth-selectable stepper (1..4) showing tier counts + half-on-creation currency emission. Theoretical `t^d/d!` shown alongside; agrees exactly at d=1, 2, drifts above
- [x] `<DerivativeCascadeSim>` — 5-tier cascade with sheet-2a defaults, depth slider, top-tier seed, rate scale, base income, log toggle, play/pause/scrub
- [x] `<NTierGrowthCompare>` — `t^d/d!` for d∈[1,5] plus Cookie-Clicker-style `base · r^t` exponential overlay, log scale by default
- [x] `<Sources>` block: original post + sheet 2a

## Phase 3 — Faithful Part III ✅

- [x] Pull prose into `src/pages/part-iii.mdx` (paraphrased per CLAUDE.md, MDX so `.vue` islands embed)
- [x] Open & transcribe `3a. Prestige Patterns` — single-generator tick sim with milestone bumps, sqrt-of-lifetime prestige formula, auto-prestige threshold
- [x] `<PrestigePatterns>` — five named-game curves (Realm Grinder, AdCap, Cookie Clicker, Egg Inc., Clicker Heroes) on Δp/p vs run-ratio axes, sliders for prev-run scale + lifetime fraction + x-range + slice cursor. Raw `Decimal` math (faithful longhand).
- [x] `<PrestigeLoop>` — sheet 3a sim. Generators-vs-time chart with reset boundaries marked. Sliders for cost mult, prestige exponent, prestige-trigger ratio, first-prestige threshold. Cadence + reset-loop folded into one demo per the design discussion. Raw `Decimal` math; engine reset/resource API documented in the inline aside per Faithful+ rule (engine integration as code didn't earn its weight for a deterministic precompute and triggered "persistent ref outside context" warnings — moved to the aside instead).
- [x] `<Sources>` block: original post + sheet 3a

## Phase 4 — Modern evolution (post-Pecorella, since Oct 2016)

Pin date: Pecorella Part I published 2016-10-04. Modern = ~10 years of evolution since.

Slug + read-order chain (locked in `pages.ts`, stubs in place under `src/pages/modern/`):

1. `/modern/big-numbers` — break_infinity (2018) → break_eternity (2020). The substrate. Foundations for everything below.
2. `/modern/softcaps` — sublinear gear-shifts at thresholds. Universal modifier on Pecorella's pure exponentials. Research: 62% piecewise prevalence (50-game spray test).
3. `/modern/cost-acceleration` — AD's quadratic-in-exponent: `base × mult^owned × scale^(excess·(excess+1)/2)`. The canonical post-Pecorella cost curve.
4. `/modern/layered-prestige` — Transcendence → Eternity → Reality. Nested resets where each layer rewrites the prior loop's math, not just multiplies it.
5. `/modern/modifier-chains` — Profectus/TMT lineage. Additive → multiplicative → exponent ladders as a first-class abstraction. Engine's `Formula` class is exactly this.
6. `/modern/time-as-resource` — Eternities-per-second, theory in Exponential Idle, time studies in AD. Pecorella's `t` is an axis; modern `t` is a currency.
7. `/modern/active-idle-hybrid` — Melvor, NGU, AD: offline catch-up as a first-class math input, not an afterthought.
8. `/modern/achievement-as-modifier` — Cookie Clicker grandma synergies as the prototype. Achievement-as-multiplier, not just badge.

Drafting order ≠ reading order. Recommended drafting order:

1. **`big-numbers.mdx`** ✅ — drafted; `<BigNumberTower>` shows native vs. break_infinity vs. break_eternity diverging at the layer-2 step.
2. **`cost-acceleration.mdx`** ✅ — drafted; `<CostAccelerationCompare>` overlays Pecorella's pure exponential and AD's scaling-past-threshold curve in log space, with sliders for base, mult, scale, threshold, and a cursor readout. Closed-form max-affordable derivation is text + cited code (no second demo — the inversion is a square root, didn't earn a separate component).
3. **`softcaps.mdx`** — the four canonical shapes (sqrt, log, piecewise log, hard-then-soft) on one chart with toggles.
4. Remainder in any order; each is independent.
   - `modifier-chains.mdx` ✅ — drafted; `<ModifierChainBuilder>` toggles six modifiers (add/mul/exp) with live breakdown + a structured-form code panel mirroring the active set. Lineage walk: Cookie Clicker hand-rolled `Game.CalculateGains` → Prestige Tree per-layer `gainMult` → TMT named slots → Profectus `createSequentialModifier` chain-as-data, citing each.

Citation guidance per page: cite via `<Cite>` inline next to formula claims, plus a footer `<Sources cites={[...]}>` listing the games surveyed for that topic. Repos in `../open-loop-research/reference-code/` (72 game source repos pinned to specific SHAs).

Open question per page: where on the demo-vs-text axis does it sit? Big-numbers is demo-led (the cap visualization carries the point). Time-as-resource may be more text-led (the conceptual shift matters more than any single curve). Decide per page during drafting; don't pre-commit.

## Phase 5 — Polish & publish

- [ ] Mobile layout pass (sidebar TOC behavior, demo input controls on small screens)
- [ ] OpenGraph + Twitter card metadata
- [ ] Decide deploy target (GH Pages / Netlify / gitea pages)
- [ ] Sitemap, RSS (optional)
- [ ] Typography pass — once content is in, refine
- [ ] Theme polish — light/dark, palette beyond starter inheritance

## Parking lot

- Do we want a `/playground` page where readers can mash arbitrary parameter combos across demos? Defer.
- Spreadsheet → JSON pipeline (parse `.xlsx` at build time, dump test fixtures we verify demos against)? Defer until we hit a demo where transcription is risky.
- Phase 4 ordering — interleave with Phase 1-3, or strictly after? Going strictly-after for now; revisit if a faithful section begs for a "but modern games do X" callout.

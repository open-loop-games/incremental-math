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
6. `/modern/time-as-resource` — Pecorella's `t` is an axis; modern `t` is a currency. Four pins:
   - **Pin 1 — Zero-sum time budgets (anchor demo, the project namesake).** Groundhog Life's 1440 min/loop, Omsi Loops' 250 mana where mana = time (`baseManaPerSecond = 50`, `curAction.manaUsed++`), Cavernous II's action queues. Math is knapsack: `Σ duration_i · count_i ≤ T_budget`, maximize `Σ reward_i · count_i`. Demo: drag-bars allocator across 3–4 activities with marginal-yield curves. Source: `patterns/tier-1-foundation/time-systems.md:485-575` (Variation C).
   - **Pin 2 — Speed multipliers as effective time.** AD's tickspeed (the genuine time mechanic in AD, not Eternities), Progress Knight 2's 10,000×. Math: `effective_time = ∫ speed(t) dt`, with the feedback wrinkle that speed itself is bought from production → exponential cost has to tame the runaway. Demo: production-over-time with speed slider + toggle for "speed buys feed back from production" to show the divergence. Source: `patterns/tier-1-foundation/time-systems.md:416-482` (Variation B).
   - **Pin 3 — Action duration as mutable state.** Cavernous II / Omsi Loops sub-pattern: `actionDuration = baseDuration × specialMult × realmMult`, training reduces base duration. Order of operations matters because earlier actions reshape later costs. Math: a planning problem where the time-cost function evolves with use. Demo: 4-action queue, skill levels visible, drag-to-reorder, total-time readout.
   - **Pin 4 — Time as decay/pressure (text-led, one anchor demo).** Increlution's `health = 0.5 × 1.25^(seconds/60)` makes time the opponent — exponential decay forces termination at ~60 min. Optimization shifts to "maximize progress before death." Demo: progress-vs-time under varying decay exponents with the optimal-action-mix changing along the curve.
7. `/modern/offline-progress` — the math of being away. Four families: **delta-time extrapolation** (`rate × elapsed`; Cookie Clicker with 5s timeout cap, AD), **tick simulation** (run the loop; Melvor 24h full sim, NGU, Synergism 200-tick budget, Shark Incremental accelerated 12–20x), **bonus-time banking** (offline time becomes a spendable currency burned during active play; KTL `bonusTime`, Trimps, Cavernous II at 50% efficiency), and **the cap** (universal — 3h to 72h). #6 made in-game `t` a resource; #7 asks what wall-clock absence converts to. Banking is the spicy reframe — it keeps the active loop primary instead of turning the player into a returning spectator. Stub file rename pending: `active-idle-hybrid.mdx` → `offline-progress.mdx` (also `pages.ts` slug + `description`).
8. `/modern/production-graphs` — Pecorella's Part II cascade is a linear chain (tier `i` produces tier `i+1`). Modern games run DAGs and sometimes cycles: AD's antimatter ↔ dimension boosts ↔ infinity points ↔ eternity, Synergism's particles/quarks/runes/ascensions, NGU's energy/magic/R3. Adjacency-matrix view of "X produces Y at rate r"; steady-state via dominant eigenvalue when linear (Part II's `t^d/d!` is the chain-length-`d` special case); cycles introduce feedback — runaway or fixed point depending on softcap placement. Capstone for Part II the way #3 is for Part I.
9. `/modern/synergy-multipliers` — modifier chains (#5) are scalar operators applied sequentially to one number. Synergies are _set functions_: multipliers that depend on the **combination** of owned things, not the count. Cookie Clicker grandma types unlocking each other, Realm Grinder faction synergies, AD dimension-boost interactions, Synergism corruption combinations. Math is set-function maximization — often submodular, which is why these games _feel_ solvable (greedy is near-optimal). Genuinely orthogonal to #5. Stub `achievement-as-modifier.mdx` was repurposed → `synergy-multipliers.mdx` (the original framing was a thin restatement of #5; this delivers what it gestured at, generalized).
10. `/modern/automation` — Pecorella's `1c–1e` Optimal Choice answers "which generator do I buy next?" statically. Modern games turn that into a UI surface and a _policy_: AD's autobuyer priority sliders, Synergism's auto-everything tiers, NGU's "buy max" toggles. Three canonical policies — **buy-when-affordable**, **buy-max-each-tick**, **threshold-based** — produce different production-curve shapes. Priority-N autobuyers create regimes: low priority → all tiers grow together, high priority → collapses to top-tier-only. Convergence question: does dynamic autobuy approach the static-optimal answer, or systematically deviate? Sibling to #3 the way #8 is sibling to Part II. Stub creation pending: new `automation.mdx` (also `pages.ts`).
11. `/modern/challenges` — challenge runs as a first-class modern mechanic. Pecorella has zero on it. AD challenges (disable a layer, mutate an exponent), Synergism corruptions (stackable debuff multipliers persisting across ascensions), NGU challenges (re-runs under constraints), Realm Grinder R-challenges. The design math: how do you build a "hard mode" that produces a **different curve shape**, not just a slower one? Disabling a layer changes the production-graph topology (cf. #8); raising an exponent shifts the regime (cf. #3); corruption stacking is its own modifier-chain problem (cf. #5). The genre's answer to "what do you do once the main curve is solved" — prestige cycles run the same loop bigger; challenges run _different loops_. Stub creation pending: new `challenges.mdx` (also `pages.ts`).

Drafting order ≠ reading order. Recommended drafting order:

1. **`big-numbers.mdx`** ✅ — drafted; `<BigNumberTower>` shows native vs. break_infinity vs. break_eternity diverging at the layer-2 step.
2. **`cost-acceleration.mdx`** ✅ — drafted; `<CostAccelerationCompare>` overlays Pecorella's pure exponential and AD's scaling-past-threshold curve in log space, with sliders for base, mult, scale, threshold, and a cursor readout. Closed-form max-affordable derivation is text + cited code (no second demo — the inversion is a square root, didn't earn a separate component).
3. **`softcaps.mdx`** — the four canonical shapes (sqrt, log, piecewise log, hard-then-soft) on one chart with toggles.
4. Remainder in any order; each is independent.
   - `modifier-chains.mdx` ✅ — drafted; `<ModifierChainBuilder>` toggles six modifiers (add/mul/exp) with live breakdown + a structured-form code panel mirroring the active set. Lineage walk: Cookie Clicker hand-rolled `Game.CalculateGains` → Prestige Tree per-layer `gainMult` → TMT named slots → Profectus `createSequentialModifier` chain-as-data, citing each.
   - `time-as-resource.mdx` — stub. Four pins (see #6 above): zero-sum budgets (anchor + namesake), speed-as-effective-time, action-duration as mutable state, time-as-decay/pressure. Each pin needs its own component.

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
- Notation transitions (when does a game switch from `1.23M` → `1.23e9` → `1.23aa`?) belongs as a sidebar inside `big-numbers.mdx`, not its own page. Real concern (log-log readability, perceptual scale, forced past `1e308`) but doesn't earn a slot on the chain.

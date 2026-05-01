---
title: Engine mapping (placeholder, pre-publish)
status: harvest
---

# Engine mapping

`open-loop-engine`-attributed prose harvested from the published incremental-math pages while OLE remains unpublished. Pre-publish staging: when OLE publishes, this content is the launch-time payload — re-inject inline at original anchor points, ship as a sibling `/engine-mapping` page on the site, or compose a hybrid (consolidated topic page with inline backlinks from each demo). The shape of re-injection is deferred; the harvest preserves enough metadata for any of those options.

Organized by source page + line range. Content verbatim. Topic tags inline so a future re-org by topic stays cheap.

## src/pages/part-i.mdx

### Lines 39–42 — cost-formula closed-form (Modern API note aside)

[topic: cost formula, closed-form inverse, integral, `Formula.exponential`]

> The cost formula here is `Formula.exponential(level, costBase, rateGrowth)` in `open-loop-engine`'s Profectus/TMT-lineage `Formula` DSL — same expression, but the resulting object also carries a closed-form inverse (`.invert(value)` answers "what level costs _X_?") and integral (`.evaluateIntegral(N)` answers "what does buying _N_ in bulk cost?"). Pecorella derived both of those by hand later in Part I as bonus content; the engine bakes them in.

### Lines 71–74 — bulk-buy closed-form (Modern API note aside)

[topic: bulk buy, `calculateCost`, `invertIntegral`, continuous-vs-discrete, `directSum`]

> The engine collapses both formulas into the cost expression itself. `Formula.exponential(currentlyOwned, baseCost, rateGrowth)` is the per-level cost; `calculateCost(formula, n)` answers "what does buying _n_ more cost?"; `formula.invertIntegral(cash + integralAtCurrent) - currentlyOwned` answers "how many can I afford?". The engine uses the _continuous_ integral as the closed-form (Pecorella derives the _discrete_ geometric-series sum), which is accurate to a few percent for typical incremental ratios and exact when you ask `calculateCost` to direct-sum the tail. Both approaches collapse the loop; the engine's pays in one extra parameter (`directSum`) for picking the speed/exactness tradeoff per call.

Note: the math observation underneath ("continuous integral approximates the discrete sum to a few percent at typical ratios") was lifted into the page body as a Riemann-sum-linked sentence; only the engine-API framing was harvested here.

### Lines 93–96 — next-best-buy primitive (Modern API note aside)

[topic: best buy, optimization criterion, NPV, `argmin`]

> The per-generator cost is `Formula.exponential(owned + 1, startingCost, rateGrowth).evaluate()` — same DSL as the seesaw demo, just instantiated five times. The optimization itself is a hand-rolled `argmin` over the per-generator scores; the engine doesn't bake in a "next-best-buy" primitive because the ratio you optimize is design-dependent (Pecorella's `cost/income + cost/itemIncome` is one common pick, others use plain `cost/income`, `cost/itemIncome`, or [NPV](https://en.wikipedia.org/wiki/Net_present_value) with a discount rate). The closed-form leverage is in the cost expression; the choice criterion stays game-side.

Note: the alternative-rubrics observation ("Pecorella's is one criterion among several — plain `cost/income`, `cost/itemIncome`, NPV with a discount rate") was lifted into the page body parenthetically; only the engine-API framing was harvested here.

### Lines 109–112 — milestone bonuses as modifier chain (Modern API note aside)

[topic: milestone bonuses, modifier chains, `createMultiplicativeModifier`, modifier-source attribution]

> Milestone bonuses aren't part of the cost formula here — they're income-side multipliers that scale how much each generator contributes per owned count. The engine has a different primitive for this: modifier chains. `createMultiplicativeModifier({ multiplier: () => bonusAt(owned, i) })` plus `applyModifier(...)` on each generator's income would compose the same effect declaratively, with the chain visible to debug tooling and the modifier-source attribution panel. Pecorella's spreadsheet bakes the lookup directly into each row's formula; the engine pulls it out into a stack you can introspect. Same math, different ergonomics.

## src/pages/part-ii.mdx

### Lines 61–70 — cascade as composed primitives (Modern API note aside)

[topic: derivative cascade, `createTickEffect`, composition over existing kit, no new primitive]

> The engine has resources and modifier chains, but a derivative cascade like this is a fixed-step coupled difference equation — there is no closed-form `Formula` for it the way there is for exponential cost. The pragmatic shape in `open-loop-engine` is one resource per tier with a `createTickEffect` per pair: tier-(i+1)'s count, scaled by its generation rate, applied to tier-i each tick. That maps 1:1 onto the recurrence above. Currency is just Tier 0 times base income, applied as a multiplicative modifier on the income chain. No new primitive needed — the cascade is composition over the existing kit.

## src/pages/part-iii.mdx

### Lines 93–108 — prestige loop full API enumeration (Modern API note aside)

[topic: prestige, `createReset`, `createResource`, `Formula.exponential`, milestones, modifier-source attribution]

> The sim above is plain `Decimal` math because the loop is a deterministic precompute — sliders in, sample array out — and engine resources don't earn their bookkeeping for that. In a real game you would build it differently: `createResource` for currency, generators, lifetime, and prestige currency; `createReset({ thingsToReset: [currency, generators], onReset })` declares which resources clear at the prestige boundary and leaves lifetime + prestige currency persistent by default, with the `onReset` hook the natural place to bank pending into prestige currency. Cost side, `Formula.exponential(count, startCost, 1.05)` plus `formula.invertIntegral(...)` is Part I's closed-form max-affordable doing the same job each tick. Milestones would land as a `createMultiplicativeModifier` whose multiplier looks up the running product over crossed thresholds, with the prestige multiplier a second modifier on the same chain — both visible to the engine's modifier-source attribution panel rather than buried in the production expression. The sim demo collapses all of that into one closed-form tick because no human is playing it; the engine surface exists to make the same math composable when humans are.

## src/pages/modern/big-numbers.mdx

### Line 108 — `eternal_notations` vendoring (inline)

[topic: `eternal_notations`, vendoring]

Original sentence (engine ref bolded for harvest):

> `eternal_notations` **(vendored into `open-loop-engine`)** ships a dozen of these as configurable presentations and is the lineage to inherit if you're starting a new project.

Harvested fragment: `(vendored into open-loop-engine)`. Body retained the rest of the sentence with the parenthetical removed.

### Line 114 — save layer roundtrip (inline)

[topic: serialization, save-layer roundtrip]

Original sentence (engine clause bolded for harvest):

> The fix is convention: serialize via `.toString()` (which produces a parseable string like `"e1e10"`), and rehydrate via `new Decimal(savedString)`. **open-loop-engine's save layer does this automatically;** raw consumers of break_eternity have to remember.

Harvested fragment: `open-loop-engine's save layer does this automatically;`. Body retained the surrounding observation with a genre-neutral substitution.

### Lines 130–134 — "What this site uses" closer paragraph 1

[topic: `Decimal`/`format` re-export, demo routing through engine]

> ## What this site uses
>
> `open-loop-engine` re-exports `Decimal` from `break_eternity.js` and `format` from a vendored fork of `eternal_notations`. Every Pecorella demo on this site already routes through them — you've been reading break_eternity output since `<ExponentialGrowthSim>` in Part I. The choice was inherited from the genre rather than designed. This page makes it explicit: when an incremental game's source code, in 2026, says `import Decimal from 'break_eternity.js'`, it's continuing a chain that started with Patashu's commit log in 2018 and hasn't yet had a reason to break.

Note: paragraph 2 of the original section — the adoption-split observation about AD/Synergism on `break_infinity` and Prestige Tree / Distance Incremental / IMR on `break_eternity` — was kept in the body under a new heading and is _not_ harvested here (no engine attribution to remove).

## src/pages/modern/modifier-chains.mdx

### Line 397 — `createModifierChain` registry (inline trailing sentence)

[topic: `createModifierChain`, chain registry, balance-tool enumeration]

Trailing sentence at end of the paragraph that begins "The Profectus engine ships a `createModifierSection` helper…":

> The engine in this site exports `createModifierChain` with a similar shape, plus a chain registry so balance tools can enumerate every chain across the game.

### Lines 400–413 — "What this site uses" closer (full section)

[topic: `createSequentialModifier` (Profectus, kept inline), `createModifierChain` (OLE), `chain.bind` attribution facility]

> ## What this site uses
>
> The Pecorella demos on this site don't use modifier chains internally — they're focused on a single formula each, and a chain abstraction would hide what the demo is teaching. The page above renders a chain in raw `Decimal` math because the lesson is _the chain_, not the engine API.
>
> A real game built on `open-loop-engine` would use `createSequentialModifier` directly for any production rate that has more than two contributions, and `createModifierChain` (the registry-backed version) for chains that other modules push into from outside. The attribution facility — `chain.bind({ ... })` — makes balance-sim introspection a property of using the engine, not a thing each game re-implements.

Note: the body retained a tightened, Profectus-framed version of paragraph 1's observation about why the demos don't use chains. Only the OLE-specific elements (`createModifierChain`, `chain.bind`, "open-loop-engine") were harvested here.

## src/pages/modern/layered-prestige.mdx

### Lines 201–205 — "What this site uses" closer (over-claimed `addLayer`)

[topic: `addLayer`, configuration shape, Prestige Tree lineage]

⚠ **Pre-publish caveat.** This was the section flagged in OL-812 as outrunning the actual API. OLE does not ship layered prestige as a single-shape declaration; it composes from existing primitives (resources, resets, formulas, modifier chains). Re-injecting the original "configuration shape" framing as-is would re-introduce the over-claim — when OLE publishes, the language must match what the API actually delivers, not what the closer asserted.

> ## What this site uses
>
> `open-loop-engine` ships layered prestige as a configuration shape, not a fixed mechanic. Layer registration mirrors Prestige Tree's `addLayer`: a tier number, a base resource, a formula, and a list of branches. A reset declaration takes a target — the highest layer this reset wipes — plus per-currency exemption flags. The cascade walks rows the way Prestige Tree does. The vocabulary maps onto the research: tier structure, reset scope, persistence type, formula family, timing mode — five orthogonal dimensions, each declarable per layer.
>
> The reason to declare it as a configuration rather than implement it as a feature is exactly the entanglement above. A game that stacks five layers without engine support will end up with five hand-rolled cascade routines, five hand-rolled save-shape extensions, and five hand-rolled milestone-exemption checks. The cost compounds layer-by-layer. The engine eats the bookkeeping so the per-game work is just the formula and the cadence — the parts that actually matter to the design. Prestige Tree proved this trade was worth making in 2020; the engine inherits the lesson.

Note: the body was rewritten to attribute Prestige Tree's `addLayer` directly (the actual lineage). The "Prestige Tree proved this trade in 2020" line and the bookkeeping-compounds observation were preserved in the rewrite — those are corpus observations, not engine-attributed.

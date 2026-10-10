# Terms

The site's controlled vocabulary for page text and demo labels. Each term has one meaning, and each meaning has one term. A word in the "not" column is retired in that meaning.

## Scope

- **The list governs domain nouns** in page text, demo labels, `src/data/pages.ts` and the section landing pages. Everyday verbs stay, such as "the formula runs".
- **Formulas and code keep their source names.** A symbol, a code span or a spreadsheet variable such as `rate_growth` is never renamed. The text around it uses the term from this list.
- **A game's own name stays** when the page describes that game: Infinity, Ascension, Cookie Clicker's buildings, Antimatter Dimensions' Dimensions. Map it to the site's term at its first use.
- **A demo that copies one game's structure** may use that game's names in its labels and in the text about it.
- **Pecorella's words** are given once, at their first use on Part I–III, when they differ from the site's term.
- **Research's meaning holds** where `open-loop-research/LIBRARY.md` defines a word. A research pattern handle with no defined prose word leaves the choice to this list.
- **This list overrides the studio list inside this repo.** The studio uses "layer", "tier" and "composition" in other senses.

A text that needs a term this list does not have stops, and the term goes to the user.

## PR: prestige structure

| ID   | term                  | meaning                                                                                 | not                                                                                                                                                                    |
| ---- | --------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR1  | **layer**             | a reset boundary whose currency persists through the reset of the layer below           | prestige tier, row (Prestige Tree's `row` stays in code); also not a modifier stage (MO3), a system, or meta-progression (PR10). "Spec layer" is research's term (DS1) |
| PR2  | **run**               | the play between two resets of one layer                                                | cycle, prestige cycle, generation, lap                                                                                                                                 |
| PR3  | **loop**              | the production feedback loop: currency buys generators, and generators produce currency | a run; a code loop (say "iteration"). "Time-loop game" names a genre                                                                                                   |
| PR4  | **cycle**             | a cycle in a graph, such as a production graph with feedback                            | a run                                                                                                                                                                  |
| PR5  | **reset**             | the event that clears a layer's progress and pays its prestige currency; also the verb  | "to prestige", ascend, rebirth (a game's own names stay)                                                                                                               |
| PR6  | **hard reset**        | a save wipe, with no gain formula                                                       |                                                                                                                                                                        |
| PR7  | **prestige**          | the mechanic: reset progress for a currency that makes later runs faster                | the event (PR5); the currency (PR8)                                                                                                                                    |
| PR8  | **prestige currency** | the currency a reset pays                                                               | bare "prestige", prestige points (unless a game's name)                                                                                                                |
| PR9  | **session**           | one continuous sitting of play                                                          | a run                                                                                                                                                                  |
| PR10 | **meta-progression**  | progression outside the reset that clears the rest, so each run starts further along    | persistent layer, meta-progression layer, meta-progress                                                                                                                |
| PR11 | **prestige loop**     | one layer's repeating cycle: a run, a reset, the next run                               | bare "loop" (PR3 is the production loop)                                                                                                                               |
| PR12 | **stack**             | all of a game's layers together                                                         | depth (TI2 counts tiers); write "the number of layers"                                                                                                                 |

## RA: rate

| ID  | term            | meaning                                                                            | not                                                                                          |
| --- | --------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| RA1 | **rate**        | production per unit time, as a function of state: r(x). The **rate function** is r | the cost ratio (CO1), a marginal gain per unit ("increment"), an edge weight ("edge weight") |
| RA2 | **growth rate** | the rate divided by the state, r(x)/x. Constant for exponential growth             | the cost ratio                                                                               |
| RA3 | **production**  | what generators make; the rate is production per unit time                         | income (the sheet's `baseIncome` stays in formulas), output, yield                           |
| RA4 | **gain**        | the amount of prestige currency a reset pays, from the gain formula                |                                                                                              |
| RA5 | **exponent**    | the power a quantity is raised to, such as p in x^p                                | power (except in "power law"), strength. "Degree" stays for a polynomial                     |

## CO: cost

| ID  | term           | meaning                                                      | not                                                                                                                                    |
| --- | -------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| CO1 | **cost ratio** | the factor m that each purchase multiplies the next price by | cost multiplier, rate growth, multiplier, mult, growth, exponential growth, exponential base. Pecorella's sheet calls it `rate_growth` |
| CO2 | **base cost**  | the price of the first unit                                  | cost base                                                                                                                              |

## MO: modifiers

| ID  | term           | meaning                                                                      | not                                                                |
| --- | -------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| MO1 | **modifier**   | any term that changes a value: added, multiplied, or used as an exponent     | bonus, boost, factor, contributor, effect, stat line               |
| MO2 | **multiplier** | a modifier that multiplies                                                   | an additive modifier ("additive multiplier"); the cost ratio (CO1) |
| MO3 | **category**   | a group of modifiers combined by one operation before the next group applies | additive layer, multiplicative layer                               |
| MO4 | **chain**      | the modifier chain: the ordered modifiers applied to one value               | a production line (TI3)                                            |

## TI: tiers

| ID  | term        | meaning                                                                                                | not                                                                                                           |
| --- | ----------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| TI1 | **tier**    | a generator's position in a production cascade. Tier 1 produces currency, and tier k produces tier k−1 | a prestige level (PR1), an upgrade level, an automation stage, a speed level, a faction rank, a softcap stage |
| TI2 | **depth**   | the number of tiers in a cascade                                                                       | the number of layers (PR12)                                                                                   |
| TI3 | **cascade** | generators wired so each tier produces the tier below                                                  | chain, production line                                                                                        |

## GE: generators

| ID  | term          | meaning                                                                                               | not                                              |
| --- | ------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| GE1 | **generator** | an owned unit that produces a currency or a lower-tier generator, at a rate set by how many are owned | building, producer, gens; "node" outside a graph |

## SC: caps

| ID  | term                            | meaning                                                                                                                                                      | not                                                               |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| SC1 | **softcap**                     | a growing quantity run through a decelerating function of itself, so it keeps climbing while each further unit returns less                                  | soft cap, soft-cap; a bounded approach (SC2); the offline trickle |
| SC2 | **ceiling**                     | a value a quantity approaches but never passes                                                                                                               | soft cap for a bounded shape                                      |
| SC3 | **hard cap**                    | a value a quantity reaches and stops at: min(x, c)                                                                                                           |                                                                   |
| SC4 | **the JavaScript Number limit** | the largest value a JS Number stores, about 1.8 × 10^308. Past it, values overflow to `Infinity`. A big-number library's own maximum is that library's limit | ceiling, hard cap, IEEE 754 cap                                   |

## PA: points on the progress axis

| ID  | term          | meaning                                                                                                                                                                                                                                                       | not                                                                                                            |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| PA1 | **milestone** | a bonus paid when the owned count of a generator reaches a set number, such as ×2 at 25 (Pecorella's sense)                                                                                                                                                   | a target (PA3); an achievement's trigger (PA2); a checkpoint or gate (Prestige Tree's milestones stay by name) |
| PA2 | **threshold** | a value where something happens automatically once a quantity passes it: a softcap's onset, the start of cost scaling, a level-up, an achievement's trigger, an autobuyer's reset point. A **threshold achievement** fires once its stat passes its threshold | a target (PA3); milestone achievement                                                                          |
| PA3 | **target**    | a value the player works toward: a price, a prestige requirement, the C of a first-passage                                                                                                                                                                    | threshold, milestone, hurdle                                                                                   |
| PA4 | **wall**      | a long stretch before the next purchase or target, as the player feels it ("infinity wall" stays as a game's term)                                                                                                                                            | plateau, stall                                                                                                 |

## QU: quantities

| ID  | term               | meaning                                                                       | not                                          |
| --- | ------------------ | ----------------------------------------------------------------------------- | -------------------------------------------- |
| QU1 | **currency**       | a quantity the player holds and spends                                        | cash, money, stock (a game's own names stay) |
| QU2 | **resource**       | anything in limited supply that the player allocates: a currency, time, slots |                                              |
| QU3 | **state**          | the variable x that the rate reads                                            | stock, level, amount                         |
| QU4 | **game state**     | everything a save records                                                     | bare "state"                                 |
| QU5 | **level**          | a whole number derived from XP by a level curve: a skill, pet or hero level   | a purchase count (QU6)                       |
| QU6 | **purchase count** | how many units of one generator the player has bought: the n of a cost curve  | level, owned count                           |

## FP: first-passage

| ID  | term                   | meaning                                                                             | not                                              |
| --- | ---------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------ |
| FP1 | **first-passage time** | T(C): the time, or purchase count, at which the cumulative first reaches a target C | time-to-threshold, time-to-milestone, cycle time |
| FP2 | **hitting time**       | the stochastic first-passage time, a random variable                                | the deterministic T(C)                           |
| FP3 | **beat time**          | the time between two purchases at level n                                           |                                                  |
| FP4 | **doubling time**      | the interval over which a quantity doubles. State its unit: seconds or purchases    |                                                  |

## CF: closed-form

| ID  | term            | meaning                                                                  | not                            |
| --- | --------------- | ------------------------------------------------------------------------ | ------------------------------ |
| CF1 | **closed-form** | written with a finite combination of named functions, Lambert W included |                                |
| CF2 | **elementary**  | closed-form without Lambert W or other special functions                 | closed-form when W is excluded |

## CA: the catalog

| ID  | term                       | meaning                                                                                 | not                                                          |
| --- | -------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| CA1 | **composition**            | combining rate functions, in any of the catalog's kinds; mechanics compose the same way |                                                              |
| CA2 | **piecewise splice**       | the composition kind that switches formula at a threshold of state                      | piecewise composition                                        |
| CA3 | **functional composition** | the composition kind r₁(g(x))                                                           | bare "composition" for this kind                             |
| CA4 | **entry**                  | one rate function in the catalog                                                        | row, bucket (`bifurcations` keeps research's bucket and row) |
| CA5 | **family**                 | catalog entries that share a form, such as the power-law family                         |                                                              |

## AU: automation

| ID  | term           | meaning                                                                  | not                                              |
| --- | -------------- | ------------------------------------------------------------------------ | ------------------------------------------------ |
| AU1 | **automation** | the mechanic: the game makes purchase or reset decisions for the player  |                                                  |
| AU2 | **autobuyer**  | one automated purchaser                                                  | auto-buy, auto-clicker (a game's own names stay) |
| AU3 | **policy**     | the decision rule an autobuyer follows                                   | strategy, for this meaning                       |
| AU4 | **offline**    | the time the player is away and the game is not running in front of them | away, absence                                    |
| AU5 | **bulk buy**   | buying several units at once at their summed price                       | multibuy (the `MultibuyCalculator` name stays)   |

## RE: regimes

| ID  | term       | meaning                                                             | not                                                                                       |
| --- | ---------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| RE1 | **regime** | one interval of state on which a piecewise rate has one formula     | a parameter range (RE2), a phase of a curve, a period of play ("early game", "late game") |
| RE2 | **case**   | a range of a parameter with one qualitative behavior, such as p < 1 | regime                                                                                    |

## DS: design method

| ID  | term           | meaning                                                                                                | not                     |
| --- | -------------- | ------------------------------------------------------------------------------------------------------ | ----------------------- |
| DS1 | **spec layer** | research's term: the level of design where progression is written as math, closed-form where it can be | spec (bare), math layer |

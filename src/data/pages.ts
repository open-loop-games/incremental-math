export interface PagePointer {
  href: string;
  title: string;
  /** One-line hook shown on the index landing page. */
  description?: string;
}

export interface PageSection {
  label: string;
  /** Shown on the index landing page below the section label. */
  blurb?: string;
  /** External source links shown beneath the blurb (e.g. originals being distilled). */
  originals?: { label: string; links: { title: string; url: string }[] };
  pages: PagePointer[];
}

export const sections: PageSection[] = [
  {
    label: 'Pecorella (2016–2017)',
    blurb:
      'Faithful distillation of Anthony Pecorella’s three-part series, with every chart re-rendered as an interactive demo.',
    originals: {
      label: 'Originals',
      links: [
        { title: 'Part I', url: 'https://www.sirpinski.com/the-math-of-idle-games-part-i/' },
        { title: 'Part II', url: 'https://www.sirpinski.com/the-math-of-idle-games-part-ii/' },
        { title: 'Part III', url: 'https://www.sirpinski.com/the-math-of-idle-games-part-iii/' },
      ],
    },
    pages: [
      {
        href: '/part-i',
        title: 'Part I — Cost & Production',
        description:
          'Exponential cost vs. linear production: the seesaw that drives every clicker.',
      },
      {
        href: '/part-ii',
        title: 'Part II — Derivative Growth',
        description: 'Generators that produce generators: nested derivatives and t^d/d! cascades.',
      },
      {
        href: '/part-iii',
        title: 'Part III — Prestige Cycles',
        description: 'Resets, prestige currency, cycle cadence, and the long-run reward curve.',
      },
    ],
  },
  {
    label: 'Modern (since 2016)',
    blurb:
      'Where the genre went after Pecorella stopped writing. Each topic is an independent distillation — not a continuation.',
    pages: [
      {
        href: '/modern/big-numbers',
        title: 'Big Numbers',
        description:
          'break_infinity.js and break_eternity.js: the substrate that lifted incrementals past 1e308.',
      },
      {
        href: '/modern/softcaps',
        title: 'Softcaps',
        description:
          'Sublinear gear-shifts at thresholds. The universal modifier on Pecorella’s pure exponentials.',
      },
      {
        href: '/modern/cost-acceleration',
        title: 'Cost Acceleration',
        description:
          'Antimatter Dimensions’ quadratic-in-exponent cost curve and the era of “infinity walls.”',
      },
      {
        href: '/modern/layered-prestige',
        title: 'Layered Prestige',
        description:
          'Transcendence → Eternity → Reality: nested resets where each layer rewrites the prior loop.',
      },
      {
        href: '/modern/modifier-chains',
        title: 'Modifier Chains',
        description:
          'Profectus/TMT lineage: additive → multiplicative → exponent ladders as a first-class abstraction.',
      },
      {
        href: '/modern/time-as-resource',
        title: 'Time as a Resource',
        description:
          'Zero-sum budgets, speed multipliers, mutable durations, and decay: the four ways modern games make time a currency.',
      },
      {
        href: '/modern/offline-progress',
        title: 'Offline Progress',
        description:
          'Delta-time extrapolation, tick simulation, bonus-time banking, and the cap: the math of being away.',
      },
      {
        href: '/modern/production-graphs',
        title: 'Production Graphs',
        description:
          'Part II’s linear cascade generalized to DAGs and cycles: adjacency-matrix production with feedback loops.',
      },
      {
        href: '/modern/synergy-multipliers',
        title: 'Synergy Multipliers',
        description:
          'Set-function multipliers that depend on which things you own together — not how many. Greedy is near-optimal.',
      },
      {
        href: '/modern/automation',
        title: 'Automation',
        description:
          'Pecorella’s static Optimal Choice turned into a dynamic policy: autobuyers, priorities, and the curves they produce.',
      },
      {
        href: '/modern/challenges',
        title: 'Challenges',
        description:
          'Hard-mode runs that change the curve’s shape, not just its speed. Prestige loops bigger; challenges loop different.',
      },
      {
        href: '/modern/achievements',
        title: 'Achievements',
        description:
          'Passive observers on game state. Geometric thresholds turn exponential growth into a steady drumbeat; rewards couple the count back into the loop.',
      },
      {
        href: '/modern/skill-curves',
        title: 'Skill Curves',
        description:
          'Advancement you accumulate by doing, not buying. An XP accumulator, a floored level curve, and the staircase it delivers.',
      },
    ],
  },
  {
    label: 'Rate Functions',
    blurb:
      'Progression as integration. Each idle/incremental subsystem has a rate function; the time to a milestone is the first-passage time of its cumulative. The catalog walks the small algebra of integrable building blocks one family at a time.',
    pages: [
      {
        href: '/rate-functions',
        title: 'Overview',
        description:
          'The first-passage frame: T(C) = inf{t : ∫r ds ≥ C}. What closes, what doesn’t, and why this is the shape of the work.',
      },
      {
        href: '/rate-functions/power-law',
        title: 'Power-law shapes',
        description:
          'Constant, linear, polynomial, rational/hyperbolic. The xᵖ family — including bounded-ceiling soft caps when p > 1.',
      },
      {
        href: '/rate-functions/exponential',
        title: 'Exponential family',
        description:
          'Geometric (discrete) and exponential (continuous) — same family, two notations. Cookie Clicker’s 1.15ⁿ lives here.',
      },
      {
        href: '/rate-functions/bounded-growth',
        title: 'Bounded growth',
        description:
          'Logistic. The only sigmoid in the catalog whose first-passage is fully elementary.',
      },
      {
        href: '/rate-functions/log-frontier',
        title: 'Log and the Lambert-W frontier',
        description:
          'Logarithmic rate, x ln x first-passage, Lambert W as the boundary of elementary closed-form.',
      },
      {
        href: '/rate-functions/composition',
        title: 'Composition rules',
        description:
          'Piecewise splice, modifier-product, and the sum/product/composition rules that determine when systems-of-shapes still close.',
      },
      {
        href: '/rate-functions/bifurcations',
        title: 'Bifurcations — where the algebra ends',
        description:
          'Eight rows where the rate-function algebra stops and named adjacent math takes over: coupled-state, strategy-space, stochastic, network-topological, bilevel interdiction, optimal stopping, combinatorial selection, discrete planning.',
      },
    ],
  },
  {
    label: 'Design Playbook',
    blurb:
      'Math as a design tool. Each page bundles a few real designer questions and walks the rate-function math that diagnoses them. The catalog is the reference; this is how to think with it.',
    pages: [
      {
        href: '/design-playbook',
        title: 'Overview',
        description:
          'The math-as-tool thesis. What the playbook diagnoses, what it prescribes, where designer judgment takes over.',
      },
      {
        href: '/design-playbook/pacing',
        title: 'Pacing — targeting milestones',
        description:
          'Doubling time as the design knob, first-passage targeting, last-K-levels concentration, when 1.15 is wrong.',
      },
      {
        href: '/design-playbook/composition',
        title: 'Composition — when mechanics blend',
        description:
          'Why some mechanics keep mattering and others go obsolete. The four canonical boosts. Prestige as composition.',
      },
      {
        href: '/design-playbook/bending',
        title: 'Bending the curve — soft caps and regime breaks',
        description:
          'When to soft cap (math diagnosis), which shape, how many to stack, hard vs soft as a derivative-discontinuity choice.',
      },
      {
        href: '/design-playbook/modifier-chains',
        title: 'Modifier chains — stacking that stays legible',
        description:
          'Additive vs multiplicative as the load-bearing distinction. State-independent vs state-dependent. Legibility-vs-power.',
      },
      {
        href: '/design-playbook/prestige',
        title: 'Prestige cycles — cadence and conversion',
        description:
          'Prestige formula choice, cycle length as optimal-stopping, layered prestige as iterated functional composition.',
      },
      {
        href: '/design-playbook/multi-resource',
        title: 'Multi-resource — lattices and the triangular escape',
        description:
          'Currency conversion ratios, when separate currencies blend vs sit beside each other, the triangular structure most shipped games are.',
      },
    ],
  },
];

export const partChain: PagePointer[] = sections.flatMap((s) => s.pages);

export function adjacent(currentHref: string): { prev?: PagePointer; next?: PagePointer } {
  const i = partChain.findIndex((p) => p.href === currentHref);
  if (i === -1) return {};
  return {
    prev: i > 0 ? partChain[i - 1] : undefined,
    next: i < partChain.length - 1 ? partChain[i + 1] : undefined,
  };
}

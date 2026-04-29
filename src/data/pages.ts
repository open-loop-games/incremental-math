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

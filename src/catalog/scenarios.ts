export type ScenarioStatus = 'available' | 'coming';

export type ScenarioOption = {
  id: string;
  label: string;
  status: ScenarioStatus;
};

export type Scenario = {
  slug: string;
  title: string;
  /** Topic · setup, e.g. Dynamics · Pulley */
  path: string[];
  summary: string;
  /** Meta description + Article schema. Same wording everywhere it is used. */
  description: string;
  /** ISO date of the last real copy/physics edit. Required once the experiment is available. */
  dateModified?: string;
  /** Tokens for search. Include the topic id used by filter chips. */
  tags: string[];
  status: ScenarioStatus;
  /** Knobs on this setup — not separate catalog entries. */
  options: ScenarioOption[];
};

export type FilterChip = {
  id: string;
  label: string;
};

export const FILTERS: FilterChip[] = [
  { id: 'all', label: 'All' },
  { id: 'dynamics', label: 'Dynamics' },
  { id: 'statics', label: 'Statics' },
  { id: 'oscillations', label: 'Oscillations' },
];

export const scenarios: Scenario[] = [
  {
    slug: 'two-particle-pulley',
    title: 'Two-particle pulley',
    path: ['Dynamics', 'Pulley'],
    summary:
      'Two particles joined by a light inextensible string over a smooth pulley; one sits on an incline.',
    description:
      'Two-particle pulley: two masses joined by a light inextensible string over a smooth pulley share one acceleration and one tension. Resolve along the string, include friction on the incline when μ > 0, then solve for a and T.',
    dateModified: '2026-09-05',
    tags: ['dynamics', 'pulley', 'incline', 'two masses', 'string', 'tension', 'atwood', 'friction'],
    status: 'available',
    options: [],
  },
  {
    slug: 'connected-particles',
    title: 'Connected particles',
    path: ['Dynamics', 'Connected particles'],
    summary:
      'Two particles on one horizontal surface, joined by a string and pulled by a horizontal force.',
    description:
      'Connected particles: two masses on one horizontal surface joined by a light inextensible string. A horizontal force P on the leading particle gives one acceleration and one tension. Resolve the system for a, then the trailer for T; μ = 0 is smooth.',
    dateModified: '2026-09-05',
    tags: [
      'dynamics',
      'connected particles',
      'string',
      'tension',
      'friction',
      'horizontal',
      'two masses',
      'force',
    ],
    status: 'available',
    options: [],
  },
  {
    slug: 'ladder-against-wall',
    title: 'Ladder against a wall',
    path: ['Statics', 'Ladder'],
    summary: 'A uniform ladder on rough ground against a smooth wall; resolve and take moments.',
    description:
      'Ladder against a wall: a uniform ladder leans on a smooth wall and rough ground. Resolve and take moments for the ground normal N, wall reaction S, and friction F. The ladder stands while F ≤ μN; μ = 0 is smooth ground.',
    dateModified: '2026-09-05',
    tags: ['statics', 'ladder', 'wall', 'friction', 'equilibrium', 'moments', 'rigid body'],
    status: 'available',
    options: [],
  },
  {
    slug: 'projectile-motion',
    title: 'Projectile motion',
    path: ['Dynamics', 'Projectile'],
    summary: 'A particle launched at speed u and angle θ; find range, greatest height, and time of flight.',
    description:
      'Projectile motion: a particle launched at speed u and angle θ from height h follows constant acceleration. Split the velocity, then read range R, greatest height H, and time of flight T; h = 0 is level ground.',
    dateModified: '2026-09-05',
    tags: ['dynamics', 'projectile', 'range', 'trajectory', 'flight', 'angle', 'gravity'],
    status: 'available',
    options: [],
  },
  {
    slug: 'springs',
    title: 'Springs',
    path: ['Dynamics', 'Spring'],
    summary: 'Hooke’s law, extension, and energy in a light spring.',
    description: 'Springs: Hooke’s law, extension, and energy in a light spring.',
    tags: ['dynamics', 'oscillations', 'spring', 'hooke', 'extension', 'energy'],
    status: 'coming',
    options: [],
  },
  {
    slug: 'simple-harmonic-motion',
    title: 'Simple harmonic motion',
    path: ['Oscillations', 'SHM'],
    summary: 'Displacement, velocity, and acceleration in SHM.',
    description: 'Simple harmonic motion: displacement, velocity, and acceleration in SHM.',
    tags: ['oscillations', 'shm', 'spring', 'pendulum', 'frequency', 'amplitude'],
    status: 'coming',
    options: [],
  },
];

export function getScenario(slug: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.slug === slug);
}

export function availableScenarios(): Scenario[] {
  return scenarios.filter((scenario) => scenario.status === 'available');
}

export function scenarioHref(scenario: Scenario): string | undefined {
  if (scenario.status !== 'available') return undefined;
  return `/sim/${scenario.slug}`;
}

export function searchHaystack(scenario: Scenario): string {
  return [
    scenario.title,
    scenario.summary,
    scenario.slug,
    ...scenario.path,
    ...scenario.tags,
    ...scenario.options.map((option) => option.label),
  ]
    .join(' ')
    .toLowerCase();
}

export function matchesScenario(
  scenario: Scenario,
  query: string,
  filterId: string,
): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const tokens = tokenize(searchHaystack(scenario));
  const matchesQuery = words.every((word) => tokens.some((token) => wordMatchesToken(word, token)));
  const matchesFilter = filterId === 'all' || scenario.tags.includes(filterId);
  return matchesQuery && matchesFilter;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function wordMatchesToken(word: string, token: string): boolean {
  return token === word || token === `${word}s` || token === `${word}es`;
}

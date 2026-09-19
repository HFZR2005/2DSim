export const CONFIDENCE = ['struggled', 'okay', 'confident'] as const;
export type Confidence = (typeof CONFIDENCE)[number];

const CONFIDENCE_SIGNAL: Record<Confidence, number> = {
  struggled: 0.2,
  okay: 0.55,
  confident: 0.9,
};

const SCORE_PATTERN = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/;

export function isConfidence(value: string): value is Confidence {
  return (CONFIDENCE as readonly string[]).includes(value);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function parseScoreFraction(score: string): number | null {
  const match = score.match(SCORE_PATTERN);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return clamp01(numerator / denominator);
}

export function sessionSignal(input: { score?: string | null; confidence?: string | null }): number {
  const score = input.score?.trim();
  if (score) {
    const fromScore = parseScoreFraction(score);
    if (fromScore !== null) return fromScore;
  }
  const confidence = input.confidence?.trim();
  if (confidence && isConfidence(confidence)) {
    return CONFIDENCE_SIGNAL[confidence];
  }
  return CONFIDENCE_SIGNAL.okay;
}

export type Trend = 'up' | 'down' | 'flat';

export function trendFromSignals(signals: number[]): Trend {
  if (signals.length < 2) return 'flat';
  const latest = signals[signals.length - 1];
  const rest = signals.slice(0, -1);
  const average = rest.reduce((sum, value) => sum + value, 0) / rest.length;
  const delta = latest - average;
  if (delta > 0.05) return 'up';
  if (delta < -0.05) return 'down';
  return 'flat';
}

const CORAL = { r: 225, g: 84, b: 63 };
const AMBER = { r: 242, g: 169, b: 59 };
const GREEN = { r: 47, g: 158, b: 110 };

function mix(
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  t: number,
): string {
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function signalColor(signal: number): string {
  const value = clamp01(signal);
  if (value <= 0.5) return mix(CORAL, AMBER, value / 0.5);
  return mix(AMBER, GREEN, (value - 0.5) / 0.5);
}

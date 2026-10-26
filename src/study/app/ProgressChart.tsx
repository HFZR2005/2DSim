import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { hasMeasuredSignal, signalColor } from '../signal';
import type { SessionRecord, TestRecord } from './api';
import { formatLoggedAt, formatPercent, formatWeek, localDayKey, startOfWeek } from './format';

export type ProgressSeries = 'topic' | 'paper';

export type ProgressPoint = {
  id: string;
  at: string;
  signal: number;
  label: string;
  series: ProgressSeries;
};

type Placed = ProgressPoint & { x: number; y: number };

const SERIES_NAME: Record<ProgressSeries, string> = {
  topic: 'Topics',
  paper: 'Papers',
};

const DAY_MS = 86_400_000;
const MIN_SPAN_MS = 14 * DAY_MS;

function timeMs(iso: string): number {
  return new Date(iso).getTime();
}

function axisDate(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(ms));
}

function describe(points: ProgressPoint[]): string {
  if (points.length === 0) return 'No measured progress yet.';
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length === 1) {
    return `${first.label} at ${formatPercent(first.signal)}`;
  }
  return `${formatPercent(first.signal)} to ${formatPercent(last.signal)} across ${points.length} logs`;
}

function plotY(signal: number, padTop: number, innerH: number): number {
  return padTop + (1 - signal) * innerH;
}

function placeIndex(
  points: ProgressPoint[],
  width: number,
  height: number,
  pad: { l: number; r: number; t: number; b: number },
): Placed[] {
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  return points.map((point, index) => ({
    ...point,
    x:
      points.length === 1
        ? pad.l + innerW / 2
        : pad.l + (index / (points.length - 1)) * innerW,
    y: plotY(point.signal, pad.t, innerH),
  }));
}

function placeTime(
  points: ProgressPoint[],
  width: number,
  height: number,
  pad: { l: number; r: number; t: number; b: number },
): { mapped: Placed[]; minT: number; maxT: number } {
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const times = points.map((point) => timeMs(point.at));
  let maxT = Math.max(...times, Date.now());
  let minT = Math.min(...times);
  if (maxT - minT < MIN_SPAN_MS) minT = maxT - MIN_SPAN_MS;
  const span = maxT - minT;
  return {
    minT,
    maxT,
    mapped: points.map((point) => ({
      ...point,
      x: pad.l + ((timeMs(point.at) - minT) / span) * innerW,
      y: plotY(point.signal, pad.t, innerH),
    })),
  };
}

function linePath(points: Placed[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

function areaPath(points: Placed[], bottom: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  const ridge = points.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  return `M ${first.x.toFixed(1)} ${bottom.toFixed(1)} ${ridge} L ${last.x.toFixed(1)} ${bottom.toFixed(1)} Z`;
}

function weekAverage(points: ProgressPoint[], series: ProgressSeries): ProgressPoint[] {
  const groups = new Map<string, number[]>();
  for (const point of points) {
    if (point.series !== series) continue;
    const week = startOfWeek(localDayKey(point.at));
    const list = groups.get(week) ?? [];
    list.push(point.signal);
    groups.set(week, list);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, signals]) => ({
      id: `${series}-${week}`,
      at: `${week}T12:00:00`,
      signal: signals.reduce((sum, value) => sum + value, 0) / signals.length,
      label: `${SERIES_NAME[series]} · week of ${formatWeek(week)}`,
      series,
    }));
}

const PLOT_H = 88;

function usePlotWidth(): [ReturnType<typeof useRef<HTMLElement | null>>, number] {
  const ref = useRef<HTMLElement | null>(null);
  const [width, setWidth] = useState(560);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const sync = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export function topicPoints(sessions: SessionRecord[], subject: string, topic?: string): ProgressPoint[] {
  return sessions
    .filter(
      (session) =>
        session.subject === subject &&
        (topic === undefined || session.topic === topic) &&
        hasMeasuredSignal(session),
    )
    .map((session) => ({
      id: session.id,
      at: session.created_at,
      signal: session.signal,
      label: session.topic,
      series: 'topic' as const,
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function paperPoints(tests: TestRecord[], subject: string, track?: string): ProgressPoint[] {
  return tests
    .filter(
      (test) =>
        test.subject === subject && (track === undefined || test.track === track) && hasMeasuredSignal(test),
    )
    .map((test) => ({
      id: test.id,
      at: test.created_at,
      signal: test.signal,
      label: `${test.track} · ${test.title}`,
      series: 'paper' as const,
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

function Dots({ points }: { points: Placed[] }) {
  return (
    <>
      {points.map((point) =>
        point.series === 'paper' ? (
          <rect
            key={point.id}
            x={point.x - 3.5}
            y={point.y - 3.5}
            width="7"
            height="7"
            rx="1"
            fill={signalColor(point.signal)}
            stroke="var(--study-card)"
            strokeWidth="1.25"
          >
            <title>{`${point.label} · ${formatPercent(point.signal)}`}</title>
          </rect>
        ) : (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill={signalColor(point.signal)}
            stroke="var(--study-card)"
            strokeWidth="1.25"
          >
            <title>{`${point.label} · ${formatPercent(point.signal)}`}</title>
          </circle>
        ),
      )}
    </>
  );
}

export function Sparkline({ points }: { points: ProgressPoint[] }) {
  if (points.length === 0) {
    return <span class="muted">—</span>;
  }
  const width = 64;
  const height = 18;
  const pad = { l: 3, r: 3, t: 3, b: 3 };
  const mapped = placeIndex(points, width, height, pad);
  const color = signalColor(mapped[mapped.length - 1].signal);
  return (
    <svg
      class="progress-spark"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={describe(points)}
    >
      {mapped.length === 1 && (
        <line
          x1={pad.l}
          x2={width - pad.r}
          y1={mapped[0].y}
          y2={mapped[0].y}
          stroke={color}
          strokeOpacity="0.22"
          strokeWidth="1"
        />
      )}
      {mapped.length > 1 && (
        <polyline
          points={linePath(mapped)}
          fill="none"
          stroke="var(--study-navy)"
          strokeOpacity="0.28"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {mapped.map((point) => (
        <circle key={point.id} cx={point.x} cy={point.y} r="1.8" fill={signalColor(point.signal)}>
          <title>{`${point.label} · ${formatPercent(point.signal)} · ${formatLoggedAt(point.at)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function ProgressChart({ points }: { points: ProgressPoint[] }) {
  const [frame, width] = usePlotWidth();
  if (points.length === 0) return null;
  const topics = weekAverage(points, 'topic');
  const papers = weekAverage(points, 'paper');
  const weekly = [...topics, ...papers];
  const height = PLOT_H;
  const pad = { l: 8, r: 8, t: 10, b: 10 };
  const { mapped, minT, maxT } = placeTime(weekly, width, height, pad);
  const topicLine = mapped.filter((point) => point.series === 'topic');
  const paperLine = mapped.filter((point) => point.series === 'paper');
  const innerH = height - pad.t - pad.b;
  const yFor = (signal: number) => plotY(signal, pad.t, innerH);
  const floor = yFor(0);
  const ticks = [1, 0.5, 0];

  return (
    <figure class="progress-panel">
      <div class="progress-plot">
        <div class="progress-scale" aria-hidden="true">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div ref={frame} class="progress-plot-main">
          <svg
            class="progress-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={describe(weekly)}
          >
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={pad.l}
                x2={width - pad.r}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="var(--study-line)"
                strokeWidth="1"
              />
            ))}
            {topicLine.length > 1 && (
              <path d={areaPath(topicLine, floor)} fill="var(--study-navy)" fillOpacity="0.06" />
            )}
            {topicLine.length > 1 && (
              <polyline
                points={linePath(topicLine)}
                fill="none"
                stroke="var(--study-navy)"
                strokeOpacity="0.55"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {paperLine.length > 1 && (
              <polyline
                points={linePath(paperLine)}
                fill="none"
                stroke="var(--study-indigo)"
                strokeOpacity="0.85"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <Dots points={mapped} />
          </svg>
        </div>
      </div>
      <p class="progress-meta">
        <span>{axisDate(minT)}</span>
        <span class="progress-legend">
          {topics.length > 0 && (
            <span>
              <i class="progress-key-topic" aria-hidden="true" />
              {SERIES_NAME.topic}
            </span>
          )}
          {papers.length > 0 && (
            <span>
              <i class="progress-key-paper" aria-hidden="true" />
              {SERIES_NAME.paper}
            </span>
          )}
        </span>
        <span>{axisDate(maxT)}</span>
      </p>
    </figure>
  );
}

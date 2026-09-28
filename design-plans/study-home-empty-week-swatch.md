# Plan: Use the line token for empty Home week swatches

Status: executed  

Commit: `38cacb6c7b8b1fffc7df784dec5b9aeecbb06cb8`  
Finding: Empty days on the Home week strip use `#D5D8E0` instead of the tracker’s empty-cell grey.

## Intent

An unlogged day on Home must use the same empty fill as the rest of the Study Tracker occupancy cells: `--study-line` (`#e1e4ea`). History already paints empty `.grid-cell`s as `#E1E4EA`; the recency week ticks use `background: var(--study-line)`. Home’s `.week-swatch` is the outlier.

Do not invent a new grey. Do not change logged-day colors (`signalColor`).

## Affected surfaces

- Home (`/`) last-seven-days strip, empty `.week-swatch` only

Out of scope: History grid (already `#E1E4EA`), recency ticks (already the token), signal/logged fills.

## File to edit

`src/study/app/views/Home.tsx` — the empty-day inline background on `.week-swatch`.

## Edit

Replace the empty-day literal with the existing token:

```tsx
style={{ background: signal === undefined ? 'var(--study-line)' : signalColor(signal) }}
```

Leave `signalColor(signal)` unchanged. Do not add CSS rules for `.week-swatch` background; the logged-day color still has to come from the inline signal.

## Reuse

- Token: `--study-line: #e1e4ea` in `src/study/app/styles.css`
- Same-surface exemplars: History empty cells `#E1E4EA`; `.recency-weeks i { background: var(--study-line); }`

No new tokens, components, or primitives.

## Out of scope

- Findings 1 and 3
- Week-strip layout, labels, or logged-day colors
- History `#E1E4EA` string vs token (same computed color)

## Verify

1. Open Home with at least one empty day in the last seven.
2. The empty `.week-swatch` computed `background-color` matches `var(--study-line)` (`#e1e4ea`).
3. A logged day’s swatch still uses `signalColor`, not the line grey.

# Plan: Drop the Progress heading size override

Status: executed  

Commit: `38cacb6c7b8b1fffc7df784dec5b9aeecbb06cb8`  
Finding: Progress section titles are `1.2rem` while every other Study Tracker `h2` is `1.1rem`.

## Intent

Retrospective and Results headings on Progress must use the same `h2` size as Home (“Recent”), Log, and the rest of the tracker: `1.1rem` from the global `h2` rule.

Do not invent a new heading size. Remove the local override.

## Affected surfaces

- Progress (`/topics`) `.progress-block > h2` (Retrospective, Results)

Other `h2`s already use the global rule. Leave them unchanged.

## File to edit

`src/study/app/styles.css`

## Edit

Delete this rule entirely:

```css
.progress-block > h2 {
  font-size: 1.2rem;
}
```

Do not add a replacement `font-size` on `.progress-block` or those headings. They inherit:

```css
h2 {
  font-size: 1.1rem;
}
```

Leave `.progress-block` spacing and border rules as they are.

## Reuse

- Global `h2 { font-size: 1.1rem; }` in `src/study/app/styles.css`

No new tokens, components, or primitives.

## Out of scope

- Findings 1 and 2
- Heading copy, section order, card chrome

## Verify

1. Open Progress.
2. Computed `font-size` on Retrospective and Results `h2`s is `1.1rem`, matching Home’s Recent `h2`.
3. `.progress-block` still has its top border and padding.

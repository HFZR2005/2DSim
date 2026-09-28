# Plan: Clear Study Tracker content above the mobile nav

Status: executed  

Commit: `38cacb6c7b8b1fffc7df784dec5b9aeecbb06cb8`  
Finding: On viewports `max-width: 900px`, the last content in `.study-content` sits under the fixed bottom section nav.

## Intent

The `900px` layout already treats the section nav as a fixed bottom bar and already budgets overlay clearance as `calc(72px + env(safe-area-inset-bottom))`. That padding is currently on `.study-nav` (the top aside: brand, student switch, staff tools). It must sit on `.study-content` instead, so Home, Log, Progress, and History can scroll clear of the bar.

Do not invent a new clearance value. Reuse the existing `72px` + safe-area expression.

## Affected surfaces

All Study Tracker pages rendered inside `.study-content`:

- Home (`/`)
- Log (`/log`)
- Progress (`/topics`)
- History (`/history`)

Login (`/login`) does not use `.study-shell` / `.study-content`. Leave it unchanged.

The public mechanics lab is out of scope.

## File to edit

`src/study/app/styles.css` — the `@media (max-width: 900px)` block starting at line 821.

## Edits

1. **Remove** the overlay clearance from `.study-nav` in that media query. After the change, the mobile `.study-nav` rule must only set width:

```css
.study-nav {
  width: 100%;
}
```

The base rule `.study-nav { padding: 20px 18px 24px; }` remains the aside padding. Do not add a replacement `padding-bottom` on `.study-nav`.

2. **Add** this rule in the same media query, next to the other layout rules (beside `.study-shell` / `.study-nav`):

```css
.study-content {
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}
```

Do not change the desktop rule `.study-content { padding: 24px 28px 40px; }`. The media query only overrides `padding-bottom`.

Leave `.study-nav nav { position: fixed; bottom: 0; ... }` unchanged.

## Reuse

- Overlay budget already in source: `calc(72px + env(safe-area-inset-bottom))` (current `.study-nav` mobile padding-bottom)
- Safe-area already used on the fixed nav: `padding: 8px 8px calc(8px + env(safe-area-inset-bottom))`

No new tokens, components, or primitives.

## Out of scope

- Findings 2 and 3 (empty-day grey; Progress `h2` size)
- Nav item layout, colors, or labels
- Timetable height (`70dvh`)
- Accessibility / ARIA

## Verify

1. Resize the tracker to a width below 900px (phone and iPad portrait).
2. Confirm the bottom bar still overlays the viewport and remains tappable.
3. Scroll to the end of Home (recent cards), Progress (results tables), and History (last evidence card). The last block must sit fully above the bar, including on a device with a home indicator (safe area).
4. Confirm the top aside no longer has a large empty gap under staff tools / Sign out before page content.
5. At a width above 900px, the sidebar stays a left column with original padding; `.study-content` stays `24px 28px 40px`.

# Site creation skills (client-side)

These skills are injected **only** when the user is creating a site, page, component, or UI animation. Base prompts are unchanged.

## Motion (official skill principles)
- Prefer Motion (`motion/react`) or modern CSS
- Independent transforms (x, y, scale, rotate) + opacity
- Short durations (150–300ms small, ≤500ms large)
- Springs for interruptible physical motion
- GPU-friendly properties only
- Respect `prefers-reduced-motion`

## motion-anything style
- Think in intent: entrance, exit, hover-press, state-transition, feedback, scroll-reveal
- Keep restraint — purposeful motion over decoration
- Output clean CSS or React when useful

Both skills activate automatically on site/UI requests so the model produces more intentional interfaces instead of templates.

# Eduardo — personal site

A one-page portfolio built with plain HTML, CSS, and a small amount of vanilla JavaScript. No build step, no framework, no dependencies.

Positioned as a credibility artifact for client / warm-network work: software engineering with a sharp edge in healthcare and operational data, shown as case files rather than a capability list. See `POSITIONING.md` for direction and `HANDOFF.md` for current state and next steps.

## Run locally

```bash
python3 -m http.server 5173
```

Then open <http://localhost:5173>.

## Structure

```
index.html              One page: hero, work (case files), approach, about, contact
styles.css              Design tokens + section styles
script.js               Header scroll, smooth scroll, marquee loop, scroll reveal
case-tuya-analytics.html  Long-form case file (in progress)
POSITIONING.md          Direction + locked decisions
HANDOFF.md              Practical working notes
```

## Edit

- Copy, projects, and links live in `index.html`.
- Colors, type, and layout in `styles.css` (tokens at the top).

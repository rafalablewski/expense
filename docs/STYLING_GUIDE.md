# Styling Guide

## CSS Architecture

All styles are in `src/styles/` as pure CSS files (no preprocessor, no CSS-in-JS).

### File Organization

| File | Purpose |
|------|---------|
| `variables.css` | CSS custom properties (colors, spacing) |
| `reset.css` | Reset, fonts, keyframes, reduced motion |
| `dark-mode.css` | All `[data-dark="1"]` overrides |
| `layout.css` | Page structure: topnav, botnav, page, container, fab |
| `components.css` | Shared components: card, chip, btn-*, stat-card, etc. |
| `views.css` | View-specific styles |
| `modals.css` | Modal/overlay styles |
| `index.css` | Barrel file importing all above |

### CSS Custom Properties

Colors from the theme are available as custom properties:
```css
:root {
  --c-green: #06C167;
  --c-green-bg: rgba(6,193,103,0.10);
  --c-ink0: #1D1D1F;
  --c-ink1: #3D3D3F;
  --c-ink2: #6E6E73;
  --c-ink3: #AEAEB2;
  --c-ink4: rgba(0,0,0,0.09);
  --c-red: #FF3B30;
  /* ... see variables.css for full list */
}
```

### Naming Convention

BEM-like with component prefix: `component-element--modifier`

Examples:
- `.stats-filter-bar` — filter bar in StatsView
- `.stats-filter-btn` — filter button
- `.stats-filter-btn--active` — active state
- `.dashboard-widget` — dashboard metric widget
- `.dashboard-widget-value` — value inside widget

### Dynamic Values

When CSS needs JS-computed values (e.g., category colors), use CSS custom properties:
```jsx
<div className="cat-chip" style={{ '--cat-color': color }}>
```
```css
.cat-chip { background: var(--cat-color); }
```

### No Inline Styles

Inline `style={{}}` is forbidden except for:
- Chart SVG coordinates (truly computed at render time)
- CSS custom property injection (`style={{ '--var': value }}`)

### Dark Mode

Dark mode is toggled via `data-dark="1"` attribute on the root element.
All dark overrides live in `dark-mode.css` using `[data-dark="1"]` selector.

### Fonts

- **Bricolage Grotesque**: Headlines, logo
- **Plus Jakarta Sans**: Body text, UI
- **JetBrains Mono**: Monospace numbers (`.mono` class)

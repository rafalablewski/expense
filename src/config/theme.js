// Theme color object — used by components that need JS color values
// (e.g., chart SVGs, dynamic backgrounds).
// For CSS, use var(--c-xxx) custom properties from styles/variables.css.

const $ = {
  // Core
  black:   "#000000",
  white:   "#FFFFFF",
  canvas:  "transparent",

  // Glass surfaces
  glass:      "rgba(255,255,255,0.60)",
  glassFull:  "rgba(255,255,255,0.78)",
  glassHero:  "rgba(255,255,255,0.55)",
  glassBorder:"rgba(255,255,255,0.75)",
  glassHover: "rgba(255,255,255,0.88)",

  // Ink scale
  ink0:    "#1D1D1F",
  ink1:    "#3D3D3F",
  ink2:    "#6E6E73",
  ink3:    "#AEAEB2",
  ink4:    "rgba(0,0,0,0.09)",

  // Green — single, purposeful
  green:   "#06C167",
  greenBg: "rgba(6,193,103,0.10)",
  greenRim:"rgba(6,193,103,0.28)",

  // Red — discounts only
  red:     "#D93025",
  redBg:   "rgba(217,48,37,0.08)",
  redRim:  "rgba(217,48,37,0.22)",

  // Amber
  amber:   "#D97706",
  amberBg: "rgba(217,119,6,0.08)",

  // Accent alias
  accent:  "#06C167",
};

export default $;

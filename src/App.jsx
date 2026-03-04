import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { loadUserData, saveAllUserData, updateField } from "./firestore";

/* ══════════════════════════════════════════
   KUCHNIAPP — Complete redesign
   Inspired by: Apple.com × Uber Eats
   
   Black nav · White canvas · Bold typography
   Card-first · Mobile-native · Zero clutter
══════════════════════════════════════════ */

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
};

const CATS = {
  // Grocery / food
  "Nabiał":        "#0369A1",
  "Mięso":         "#DC2626",
  "Warzywa":       "#16A34A",
  "Owoce":         "#EA580C",
  "Napoje":        "#6D28D9",
  "Pieczywo":      "#D97706",
  "Słodycze":      "#BE185D",
  "Chemia":        "#0891B2",
  // Bills & services
  "Paliwo":        "#F59E0B",
  "Subskrypcje":   "#7C3AED",
  "Restauracje":   "#EF4444",
  "Transport":     "#8B5CF6",
  "Rozrywka":      "#F97316",
  // One-time purchases
  "Elektronika":   "#3B82F6",
  "Odzież":        "#EC4899",
  "Zdrowie":       "#10B981",
  "Narzędzia":     "#92400E",
  "Meble":         "#78350F",
  "AGD":           "#1E3A5F",
  "Ogród":         "#166534",
  "Zwierzęta":     "#713F12",
  "Podróże":       "#0C4A6E",
  "Sport":         "#064E3B",
  "Kosmetyki":     "#831843",
  "Edukacja":      "#1E1B4B",
  "Prezenty":      "#4A1D96",
  "Dom":           "#374151",
  "Inne":          "#6B7280",
};

// Category groups for UI
const CAT_GROUPS = {
  "Spożywcze":   ["Nabiał","Mięso","Warzywa","Owoce","Napoje","Pieczywo","Słodycze","Chemia"],
  "Rachunki":    ["Paliwo","Subskrypcje","Transport","Rozrywka","Restauracje"],
  "Jednorazowe": ["Elektronika","Odzież","Zdrowie","Narzędzia","Meble","AGD","Ogród","Zwierzęta","Podróże","Sport","Kosmetyki","Edukacja","Prezenty","Dom","Inne"],
};

// Category icons
const CAT_ICONS = {
  "Nabiał":"🥛","Mięso":"🥩","Warzywa":"🥦","Owoce":"🍎","Napoje":"🥤","Pieczywo":"🍞","Słodycze":"🍬","Chemia":"🧹",
  "Paliwo":"⛽","Subskrypcje":"📱","Restauracje":"🍽️","Transport":"🚗","Rozrywka":"🎬",
  "Elektronika":"💻","Odzież":"👔","Zdrowie":"💊","Narzędzia":"🔧","Meble":"🛋️","AGD":"🫙",
  "Ogród":"🌿","Zwierzęta":"🐾","Podróże":"✈️","Sport":"🏃","Kosmetyki":"💄","Edukacja":"📚","Prezenty":"🎁","Dom":"🏠","Inne":"📦",
};


/* ─── FX Rates (approximate, refreshed manually) ── */
const FX = { PLN: 1, EUR: 0.234, USD: 0.252 };
const FX_SYMBOLS = { PLN: "zł", EUR: "€", USD: "$" };

function convertAmt(amt, currency) {
  const n = parseFloat(amt) || 0;
  return (n * (FX[currency] || 1)).toFixed(2);
}


/* ─── Haptic feedback ────────────────────────── */
function haptic(ms = 10) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch(e) {}
}

/* ─── Fonts + Reset ──────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }

body {
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  background:
    radial-gradient(ellipse 80% 60% at 10% 0%,   #c8f7dc 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 90% 5%,   #daf0ff 0%, transparent 50%),
    radial-gradient(ellipse 50% 70% at 85% 90%,  #ffe8d6 0%, transparent 55%),
    radial-gradient(ellipse 70% 50% at 5%  95%,  #e5f0ff 0%, transparent 55%),
    radial-gradient(ellipse 90% 80% at 50% 50%,  #f5fff9 0%, transparent 70%),
    #eef8f2;
  background-attachment: fixed;
  color: ${$.ink0};
  -webkit-font-smoothing: antialiased;
  min-height: 100dvh;
  line-height: 1.5;
}

:focus-visible {
  outline: 2px solid ${$.green};
  outline-offset: 3px;
  border-radius: 6px;
}

::-webkit-scrollbar { width: 0; height: 0; }

/* ── Keyframes ── */
@keyframes fadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
@keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
@keyframes spin     { to { transform: rotate(360deg) } }
@keyframes shimmer  { 0%{background-position:-200%} 100%{background-position:200%} }
@keyframes checkPop { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
@keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ── DARK MODE ── */
[data-dark="1"] body {
  background:
    radial-gradient(ellipse 80% 60% at 10% 0%,   #0a2e1a 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 90% 5%,   #0d1a2e 0%, transparent 50%),
    radial-gradient(ellipse 50% 70% at 85% 90%,  #2a1500 0%, transparent 55%),
    radial-gradient(ellipse 70% 50% at 5%  95%,  #0a0f1e 0%, transparent 55%),
    radial-gradient(ellipse 90% 80% at 50% 50%,  #0a1f12 0%, transparent 70%),
    #080e0a;
  color: #F5F5F7;
}
[data-dark="1"] .card,
[data-dark="1"] .stat-card,
[data-dark="1"] .shop-item,
[data-dark="1"] .widget {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.12);
}
[data-dark="1"] .card:hover,
[data-dark="1"] .stat-card:hover,
[data-dark="1"] .widget:hover {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.20);
}
[data-dark="1"] .page-hero {
  background: rgba(0,0,0,0.30);
  border-bottom-color: rgba(255,255,255,0.10);
}
[data-dark="1"] .topnav { background: rgba(0,0,0,0.96); }
[data-dark="1"] .botnav-pill {
  background: rgba(20,30,22,0.88);
  border-color: rgba(255,255,255,0.15);
}
[data-dark="1"] .field {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.18);
  color: #F5F5F7;
}
[data-dark="1"] .field::placeholder { color: rgba(255,255,255,0.30); }
[data-dark="1"] .tbl th { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.45); }
[data-dark="1"] .tbl td { border-bottom-color: rgba(255,255,255,0.08); }
[data-dark="1"] .pill {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.75);
}
[data-dark="1"] .pill:hover { border-color: #06C167; color: #06C167; }
[data-dark="1"] .btn-secondary {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.80);
}
[data-dark="1"] .mgrid-outer { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); }
[data-dark="1"] .dropzone { background: rgba(255,255,255,0.05); }
[data-dark="1"] .dropzone:hover, [data-dark="1"] .dropzone.drag { background: rgba(6,193,103,0.08); }
[data-dark="1"] .feature-pill { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.14); }
[data-dark="1"] .cur-toggle { background: rgba(255,255,255,0.08); }

/* Dark mode toggle button */
.dark-btn {
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.20);
  border-radius: 99px;
  width: 32px; height: 32px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  transition: background .15s, transform .15s;
  flex-shrink: 0;
  margin-left: 8px;
}
.dark-btn:hover { background: rgba(255,255,255,0.18); transform: scale(1.08); }


/* ── QUICK ADD DRAWER ── */
@keyframes slideUp   { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:none} }
@keyframes slideDown2{ from{opacity:1;transform:none} to{opacity:0;transform:translateY(40px)} }

.qa-overlay {
  position: fixed;
  inset: 0;
  z-index: 600;
  background: rgba(0,0,0,0.40);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: fadeIn .2s ease both;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.qa-drawer {
  width: 100%;
  max-width: 640px;
  background: rgba(248,255,252,0.96);
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border-radius: 24px 24px 0 0;
  border: 1px solid rgba(255,255,255,0.90);
  border-bottom: none;
  padding: 0 0 env(safe-area-inset-bottom, 16px);
  box-shadow: 0 -12px 60px rgba(0,0,0,0.18);
  animation: slideUp .38s cubic-bezier(.16,1,.3,1) both;
  max-height: 92dvh;
  overflow-y: auto;
}
[data-dark="1"] .qa-drawer {
  background: rgba(12,22,15,0.95);
  border-color: rgba(255,255,255,0.12);
}
.qa-handle {
  width: 36px; height: 4px;
  border-radius: 2px;
  background: rgba(0,0,0,0.15);
  margin: 12px auto 0;
}
[data-dark="1"] .qa-handle { background: rgba(255,255,255,0.20); }
.qa-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px 12px;
}
.qa-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -.03em;
  color: ${$.ink0};
}
.qa-body { padding: 0 24px 24px; }

/* ── RECEIPT REVIEW (bottom-sheet, matches QA drawer) ── */
.rv-overlay {
  position: fixed;
  inset: 0;
  z-index: 700;
  background: rgba(0,0,0,0.40);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: fadeIn .2s ease both;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.rv-drawer {
  width: 100%;
  max-width: 640px;
  max-height: 92dvh;
  overflow-y: auto;
  background: rgba(248,255,252,0.96);
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border-radius: 24px 24px 0 0;
  border: 1px solid rgba(255,255,255,0.90);
  border-bottom: none;
  padding: 0 0 env(safe-area-inset-bottom, 12px);
  box-shadow: 0 -12px 60px rgba(0,0,0,0.18);
  animation: slideUp .38s cubic-bezier(.16,1,.3,1) both;
}
[data-dark="1"] .rv-drawer {
  background: rgba(12,22,15,0.95);
  border-color: rgba(255,255,255,0.12);
}
.rv-handle {
  width: 36px; height: 4px;
  border-radius: 2px;
  background: rgba(0,0,0,0.15);
  margin: 10px auto 0;
}
[data-dark="1"] .rv-handle { background: rgba(255,255,255,0.20); }
.rv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 8px;
}
.rv-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -.03em;
  color: ${$.ink0};
}
[data-dark="1"] .rv-title { color: #F5F5F7; }
.rv-body { padding: 0 20px 16px; }
.rv-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: ${$.ink2};
  margin-bottom: 4px;
  display: block;
}
[data-dark="1"] .rv-lbl { color: rgba(255,255,255,0.55); }
.rv-meta {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.rv-item {
  background: rgba(255,255,255,0.40);
  border: 1px solid rgba(255,255,255,0.60);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 6px;
  animation: slideDown .2s ease both;
}
[data-dark="1"] .rv-item {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.12);
}
/* Row 1: # badge + total price + delete */
.rv-item-r1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.rv-item-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: ${$.ink3};
  background: rgba(0,0,0,0.04);
  border-radius: 5px;
  padding: 2px 6px;
  flex-shrink: 0;
  line-height: 1;
}
[data-dark="1"] .rv-item-num { background: rgba(255,255,255,0.08); }
.rv-item-r1 .rv-i-name { flex: 1; min-width: 0; }
.rv-del-btn {
  background: none;
  border: none;
  color: ${$.ink2};
  font-size: 15px;
  cursor: pointer;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
  transition: color .15s, background .15s;
}
.rv-del-btn:hover { color: ${$.red}; background: ${$.redBg}; }
[data-dark="1"] .rv-del-btn { color: rgba(255,255,255,0.50); }
[data-dark="1"] .rv-del-btn:hover { color: #FF6B6B; background: rgba(217,48,37,0.15); }
/* Row 2: category | total price */
.rv-item-r2 {
  display: flex;
  gap: 6px;
  align-items: end;
  margin-bottom: 2px;
}
.rv-item-r2 > div { flex: 1; min-width: 0; }
.rv-item-r2 .rv-i-cat { flex: 1.5; }
/* Suggestions row */
.rv-suggest {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 6px;
  align-items: center;
}
.rv-suggest-lbl {
  font-size: 9px;
  font-weight: 700;
  color: ${$.ink3};
  letter-spacing: .05em;
  text-transform: uppercase;
  margin-right: 2px;
}
.rv-suggest-pill {
  font-size: 12px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  padding: 6px 14px;
  min-height: 34px;
  border-radius: 10px;
  border: 1.5px solid ${$.greenRim};
  background: ${$.greenBg};
  color: #05964E;
  cursor: pointer;
  transition: all .15s;
  line-height: 1.3;
  display: inline-flex;
  align-items: center;
}
.rv-suggest-pill:hover { background: ${$.green}; color: #fff; }
[data-dark="1"] .rv-suggest-pill { border-color: rgba(6,193,103,0.35); background: rgba(6,193,103,0.12); color: #3DDC84; }
[data-dark="1"] .rv-suggest-pill:hover { background: ${$.green}; color: #fff; }
/* Row 3 (expanded): unit | discount */
.rv-item-r3 {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  align-items: end;
}
.rv-item-r3 > div { flex: 1; min-width: 0; }
/* More toggle */
.rv-more-toggle {
  background: none;
  border: none;
  color: ${$.ink2};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 12px;
  margin-top: 2px;
  min-height: 32px;
  border-radius: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: color .15s, background .15s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.rv-more-toggle:hover { color: ${$.green}; background: rgba(6,193,103,0.06); }
[data-dark="1"] .rv-more-toggle { color: rgba(255,255,255,0.50); }
[data-dark="1"] .rv-more-toggle:hover { color: ${$.green}; background: rgba(6,193,103,0.12); }
/* Row 4 (expanded): unit | discount | unit_price */
.rv-item-r4 {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  align-items: end;
}
.rv-item-r4 > div { flex: 1; min-width: 0; }
/* Row 5 (expanded): discount label full width */
.rv-item-r5 { margin-top: 6px; }
.rv-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid rgba(255,255,255,0.45);
}
[data-dark="1"] .rv-footer { border-color: rgba(255,255,255,0.10); }
.rv-info {
  padding: 10px 20px 14px;
  font-size: 11px;
  line-height: 1.5;
  color: ${$.ink2};
  display: flex;
  flex-direction: column;
  gap: 4px;
}
[data-dark="1"] .rv-info { color: rgba(255,255,255,0.45); }
.rv-info-note {
  font-size: 10px;
  opacity: 0.7;
  font-style: italic;
}
@media (max-width: 480px) {
  .rv-meta { grid-template-columns: 1fr 1fr; }
  .rv-item-r2 { flex-wrap: wrap; }
  .rv-item-r2 > div { min-width: calc(50% - 3px); }
  .rv-item-r3 { flex-wrap: wrap; }
  .rv-item-r3 > div { min-width: calc(50% - 3px); }
  .rv-item-r4 { flex-wrap: wrap; }
  .rv-item-r4 > div { min-width: calc(50% - 3px); }
}

/* Type toggle */
.type-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 18px;
}
.type-btn {
  padding: 12px 14px;
  border-radius: 14px;
  border: 2px solid rgba(255,255,255,0.65);
  background: rgba(255,255,255,0.50);
  cursor: pointer;
  text-align: left;
  transition: all .18s cubic-bezier(.16,1,.3,1);
  display: flex;
  align-items: center;
  gap: 10px;
}
.type-btn:hover { border-color: ${$.green}; }
.type-btn.on {
  border-color: ${$.green};
  background: ${$.greenBg};
}
.type-btn .tb-icon {
  font-size: 20px;
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,0.6);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.type-btn.on .tb-icon { background: rgba(6,193,103,0.15); }

/* Cat grid */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
  gap: 6px;
  margin-bottom: 16px;
}
.cat-tile {
  padding: 8px 4px;
  border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,0.60);
  background: rgba(255,255,255,0.45);
  cursor: pointer;
  text-align: center;
  transition: all .15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 18px;
  min-height: 62px;
  justify-content: center;
}
.cat-tile:hover { border-color: ${$.green}; transform: scale(1.03); }
.cat-tile.on {
  border-color: ${$.green};
  background: ${$.greenBg};
}
.cat-tile span {
  font-size: 10px;
  font-weight: 600;
  color: ${$.ink2};
  letter-spacing: -.01em;
  line-height: 1.2;
}
.cat-tile.on span { color: ${$.green}; }

/* FAB */
.fab {
  position: fixed;
  bottom: calc(92px + env(safe-area-inset-bottom, 0px));
  right: 20px;
  z-index: 300;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: ${$.green};
  border: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 24px rgba(6,193,103,0.40), 0 2px 8px rgba(0,0,0,0.12);
  transition: transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s;
  color: white;
  font-size: 22px;
  -webkit-tap-highlight-color: transparent;
}
.fab:hover { transform: scale(1.10); box-shadow: 0 10px 36px rgba(6,193,103,0.50); }
.fab:active { transform: scale(0.95); }
@media (min-width: 681px) { .fab { bottom: 32px; } }

/* ── ONBOARDING ── */
.onboard-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn .35s ease both;
}
.onboard-card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border: 1px solid rgba(255,255,255,0.95);
  border-radius: 28px;
  padding: 40px 36px;
  max-width: 460px;
  width: 100%;
  box-shadow: 0 24px 80px rgba(0,0,0,0.22);
  animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both;
}
[data-dark="1"] .onboard-card {
  background: rgba(20,30,22,0.92);
  border-color: rgba(255,255,255,0.15);
  color: #F5F5F7;
}

.au  { animation: fadeUp .45s cubic-bezier(.16,1,.3,1) both; }
.au1 { animation: fadeUp .45s cubic-bezier(.16,1,.3,1) .08s both; }
.au2 { animation: fadeUp .45s cubic-bezier(.16,1,.3,1) .16s both; }
.au3 { animation: fadeUp .45s cubic-bezier(.16,1,.3,1) .24s both; }

/* ── TOP NAV (Apple-style black bar) ── */
.topnav {
  position: sticky;
  top: 0;
  z-index: 500;
  background: rgba(0,0,0,0.92);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 0;
}

.topnav-logo {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: ${$.white};
  letter-spacing: -.03em;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  flex-shrink: 0;
}

.topnav-logo-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: ${$.green};
  animation: fadeIn 1s ease;
}

.topnav-items {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 32px;
  flex: 1;
}

.topnav-btn {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.72);
  background: transparent;
  border: none;
  padding: 6px 14px;
  border-radius: 99px;
  cursor: pointer;
  transition: color .15s, background .15s;
  white-space: nowrap;
  min-height: 34px;
  letter-spacing: -.01em;
  position: relative;
}
.topnav-btn:hover { color: ${$.white}; background: rgba(255,255,255,0.10); }
.topnav-btn.active { color: ${$.white}; background: rgba(255,255,255,0.12); }

.topnav-badge {
  position: absolute;
  top: 2px; right: 2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: ${$.green};
  color: ${$.black};
  font-size: 9px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  display: flex; align-items: center; justify-content: center;
  line-height: 1;
}

/* Mobile: hide text nav, show bottom bar */
.topnav-mobile-title {
  display: none;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: ${$.white};
  letter-spacing: -.02em;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}


/* ── Currency toggle ── */
.cur-toggle {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.10);
  border-radius: 99px;
  padding: 3px;
  gap: 1px;
  margin-left: auto;
  flex-shrink: 0;
}
.cur-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,255,255,0.55);
  background: transparent;
  border: none;
  padding: 4px 8px;
  border-radius: 99px;
  cursor: pointer;
  transition: all .15s;
  letter-spacing: .02em;
  min-height: 24px;
}
.cur-btn.active { background: rgba(255,255,255,0.20); color: #fff; }

/* ── Budget progress ── */
.budget-bar-track {
  height: 6px;
  border-radius: 99px;
  background: rgba(0,0,0,0.07);
  overflow: hidden;
  flex: 1;
}
.budget-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width .7s cubic-bezier(.16,1,.3,1);
}

/* ── Recurring badge ── */
.rec-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 99px;
}

/* ── Dashboard widgets ── */
.widget-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.widget {
  background: ${$.glass};
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.72);
  border-radius: 20px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.06);
  padding: 20px 22px;
  transition: box-shadow .2s, border-color .2s;
  overflow: hidden;
  position: relative;
}
.widget:hover {
  box-shadow: 0 8px 40px rgba(0,0,0,0.10);
  border-color: rgba(255,255,255,0.96);
}
.widget-full { grid-column: span 2; }
.widget-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: ${$.ink3};
  margin-bottom: 10px;
}
.widget-big {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(28px,3vw,36px);
  font-weight: 800;
  letter-spacing: -.04em;
  line-height: 1;
}

@media (max-width: 500px) {
  .widget-grid { grid-template-columns: 1fr; }
  .widget-full { grid-column: span 1; }
}
/* ── BOTTOM NAV (mobile) ── */
/* ── FLOATING PILL NAV (mobile) ── */
.botnav {
  display: none;
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 400;
  animation: navFloat .5s cubic-bezier(.16,1,.3,1) both;
}
@keyframes navFloat {
  from { opacity:0; transform: translateX(-50%) translateY(24px); }
  to   { opacity:1; transform: translateX(-50%) translateY(0); }
}
.botnav-pill {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(255,255,255,0.78);
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border: 1px solid rgba(255,255,255,0.90);
  border-radius: 99px;
  padding: 5px;
  box-shadow:
    0 8px 32px rgba(0,0,0,0.12),
    0 2px 8px rgba(0,0,0,0.08),
    inset 0 1px 0 rgba(255,255,255,1);
}
.botnav-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 99px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  transition: transform .2s cubic-bezier(.16,1,.3,1);
  -webkit-tap-highlight-color: transparent;
}
.botnav-btn:hover  { transform: scale(1.08); }
.botnav-btn:active { transform: scale(0.94); }
.botnav-btn .bn-bg {
  position: absolute;
  inset: 0;
  border-radius: 99px;
  background: ${$.green};
  opacity: 0;
  transform: scale(0.6);
  transition: opacity .22s cubic-bezier(.16,1,.3,1), transform .22s cubic-bezier(.16,1,.3,1);
}
.botnav-btn.active .bn-bg {
  opacity: 1;
  transform: scale(1);
}
.botnav-btn .bn-icon {
  position: relative;
  z-index: 1;
  font-size: 18px;
  line-height: 1;
  transition: transform .2s cubic-bezier(.16,1,.3,1), filter .2s;
  filter: grayscale(1) opacity(0.45);
}
.botnav-btn.active .bn-icon {
  filter: grayscale(0) brightness(10);
  transform: scale(1.05);
}
.botnav-divider {
  width: 1px;
  height: 24px;
  background: rgba(0,0,0,0.08);
  border-radius: 1px;
  flex-shrink: 0;
  margin: 0 2px;
}

/* ── PAGE SHELL ── */
.page {
  min-height: calc(100dvh - 52px);
  padding-bottom: 60px;
}

.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ── PAGE HERO (bold header area) ── */
.page-hero {
  background: ${$.glassHero};
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-bottom: 1px solid rgba(255,255,255,0.50);
  padding: 40px 0 32px;
}
.page-hero-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px;
}
.page-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(32px, 5vw, 52px);
  font-weight: 800;
  color: ${$.ink0};
  letter-spacing: -.04em;
  line-height: 1.05;
}
.page-title span { color: ${$.green}; }
.page-subtitle {
  font-size: 15px;
  color: ${$.ink2};
  margin-top: 8px;
  font-weight: 400;
}

/* ── SECTION ── */
.section { padding: 36px 0; }
.section + .section { padding-top: 0; }

.section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: ${$.ink3};
  margin-bottom: 16px;
}

/* ── CARDS ── */
.card {
  background: ${$.glass};
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.72);
  box-shadow: 0 2px 16px rgba(0,0,0,0.06);
  overflow: hidden;
  transition: box-shadow .2s, border-color .2s;
}
.card:hover {
  box-shadow: 0 8px 40px rgba(0,0,0,0.10);
  border-color: rgba(255,255,255,0.96);
}

.card-sm {
  background: ${$.glass};
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.70);
  overflow: hidden;
}

/* ── STAT CARDS ── */
.stat-card {
  background: ${$.glass};
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.72);
  padding: 24px 26px;
  transition: box-shadow .2s;
}
.stat-card:hover { box-shadow: 0 8px 40px rgba(0,0,0,0.10); border-color: rgba(255,255,255,0.96); }
.stat-val {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(28px, 3vw, 36px);
  font-weight: 800;
  letter-spacing: -.04em;
  line-height: 1;
  margin-top: 10px;
}
.stat-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: ${$.ink2};
}

/* ── DROP ZONE ── */
.dropzone {
  background: ${$.glass};
  border: 2px dashed rgba(6,193,103,0.30);
  border-radius: 24px;
  padding: 64px 40px;
  text-align: center;
  cursor: pointer;
  transition: all .25s cubic-bezier(.16,1,.3,1);
  position: relative;
  overflow: hidden;
}
.dropzone::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 120%, ${$.greenBg} 0%, transparent 65%);
  pointer-events: none;
  opacity: 0;
  transition: opacity .3s;
}
.dropzone:hover, .dropzone.drag {
  border-color: ${$.green};
  background: rgba(6,193,103,0.08);
  transform: scale(1.008);
}
.dropzone:hover::after, .dropzone.drag::after { opacity: 1; }
.dropzone-icon {
  width: 72px; height: 72px;
  border-radius: 20px;
  background: rgba(6,193,103,0.12);
  border: 1px solid ${$.greenRim};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: 20px;
}
.dropzone-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: ${$.ink0};
  letter-spacing: -.03em;
  margin-bottom: 8px;
}
.dropzone-sub {
  font-size: 14px;
  color: ${$.ink2};
  line-height: 1.6;
}
.dropzone-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  background: ${$.green};
  color: ${$.white};
  font-size: 13px;
  font-weight: 600;
  padding: 10px 22px;
  border-radius: 99px;
  transition: opacity .15s;
  pointer-events: none;
}

/* ── RECEIPT CARD ── */
.receipt-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  cursor: pointer;
  width: 100%;
  background: none;
  border: none;
  text-align: left;
  transition: background .15s;
}
.receipt-header:hover { background: rgba(255,255,255,0.55); }
.receipt-store-icon {
  width: 48px; height: 48px;
  border-radius: 14px;
  background: rgba(255,255,255,0.40);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.70);
}
.receipt-name {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: ${$.ink0};
  letter-spacing: -.02em;
  line-height: 1.2;
}
.receipt-meta { font-size: 13px; color: ${$.ink3}; margin-top: 2px; }

/* ── TABLE ── */
.tbl { border-collapse: collapse; width: 100%; }
.tbl th {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: ${$.ink3};
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.50);
  background: rgba(255,255,255,0.5);
  white-space: nowrap;
}
.tbl td {
  padding: 14px 20px;
  font-size: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.50);
  vertical-align: middle;
}
.tbl tr:last-child td { border-bottom: none; }
.tbl tbody tr { transition: background .1s; }
.tbl tbody tr:hover td { background: rgba(6,193,103,0.08); }
.tbl-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

/* ── CHIP ── */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 99px;
  letter-spacing: .01em;
  white-space: nowrap;
}

/* ── FIELDS ── */
.field {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 400;
  color: ${$.ink0};
  background: rgba(255,255,255,0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255,255,255,0.6);
  border-radius: 12px;
  padding: 12px 16px;
  width: 100%;
  outline: none;
  transition: border-color .18s, box-shadow .18s;
  -webkit-appearance: none;
  min-height: 48px;
}
.field:focus {
  border-color: ${$.green};
  box-shadow: 0 0 0 4px ${$.greenBg};
}
.field::placeholder { color: ${$.ink3}; }

/* ── BUTTONS ── */
.btn-primary {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: ${$.white};
  background: ${$.green};
  border: none;
  border-radius: 12px;
  padding: 0 24px;
  cursor: pointer;
  transition: background .15s, transform .1s, box-shadow .15s;
  white-space: nowrap;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  letter-spacing: -.01em;
}
.btn-primary:hover { background: #059955; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(6,193,103,.28); }
.btn-primary:active { transform: none; box-shadow: none; }

.btn-secondary {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: ${$.ink0};
  background: rgba(255,255,255,0.5);
  border: 1.5px solid rgba(255,255,255,0.65);
  border-radius: 10px;
  padding: 0 18px;
  cursor: pointer;
  transition: background .15s, border-color .15s;
  white-space: nowrap;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  letter-spacing: -.01em;
}
.btn-secondary:hover { background: rgba(255,255,255,0.75); border-color: rgba(255,255,255,0.9); }

.btn-danger {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: ${$.red};
  background: ${$.redBg};
  border: 1.5px solid ${$.redRim};
  border-radius: 10px;
  padding: 0 16px;
  cursor: pointer;
  transition: background .15s;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.btn-danger:hover { background: #fde8e6; }

.btn-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: transparent;
  border: 1.5px solid rgba(255,255,255,0.65);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  color: ${$.ink2};
  transition: all .15s;
  flex-shrink: 0;
}
.btn-icon:hover { border-color: ${$.red}; color: ${$.red}; background: ${$.redBg}; }

/* ── FILTER PILLS (scrollable row) ── */
.pills-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.pills-row::-webkit-scrollbar { display: none; }
.pill {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  padding: 7px 16px;
  border-radius: 99px;
  border: 1.5px solid rgba(255,255,255,0.65);
  background: ${$.glass};
  color: ${$.ink1};
  cursor: pointer;
  transition: all .15s;
  min-height: 36px;
  letter-spacing: -.01em;
}
.pill:hover { border-color: ${$.green}; color: ${$.green}; }
.pill.on { background: ${$.green}; border-color: ${$.green}; color: ${$.white}; }

/* ── SHOPPING LIST ITEMS ── */
.shop-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: ${$.glass};
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.68);
  transition: opacity .2s, border-color .2s;
}
.shop-item.done { opacity: .4; }
.shop-item.done:hover { opacity: .6; }

.check-btn {
  width: 24px; height: 24px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.70);
  background: rgba(255,255,255,0.2);
  cursor: pointer;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s cubic-bezier(.16,1,.3,1);
}
.check-btn.on {
  background: ${$.green};
  border-color: ${$.green};
  box-shadow: 0 4px 16px rgba(6,193,103,.35);
}
.check-btn.on svg { animation: checkPop .3s cubic-bezier(.16,1,.3,1); }

/* ── TOASTS ── */
.toast-ok {
  background: ${$.greenBg};
  border: 1px solid ${$.greenRim};
  border-radius: 14px;
  padding: 13px 18px;
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 14px;
  color: #0A5E38;
  font-weight: 500;
  animation: slideDown .3s cubic-bezier(.16,1,.3,1);
}
.toast-err {
  background: ${$.redBg};
  border: 1px solid ${$.redRim};
  border-radius: 14px;
  padding: 13px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 11px;
  font-size: 14px;
  color: #7F1D1D;
  font-weight: 500;
  animation: slideDown .3s cubic-bezier(.16,1,.3,1);
}

/* ── PROGRESS ── */
.prog {
  height: 4px;
  background: rgba(255,255,255,0.45);
  border-radius: 99px;
  overflow: hidden;
  flex: 1;
}
.prog-fill {
  height: 100%;
  background: ${$.green};
  border-radius: 99px;
  transition: width .6s cubic-bezier(.16,1,.3,1);
}

/* ── MEAL GRID ── */
.mgrid-outer {
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.55);
  box-shadow: 0 4px 24px rgba(0,0,0,0.07);
  background: rgba(255,255,255,0.15);
}
.mgrid {
  display: grid;
  grid-template-columns: 90px repeat(7,1fr);
  gap: 1px;
}
.mgrid-cell {
  background: ${$.glass};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background .15s;
  padding: 8px;
}
.mgrid-cell:hover { background: ${$.greenBg}; }

/* ── COMING SOON FEATURE PILLS ── */
.feature-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 99px;
  background: ${$.glass};
  border: 1.5px solid rgba(255,255,255,0.65);
  font-size: 13px;
  font-weight: 500;
  color: ${$.ink2};
  letter-spacing: -.01em;
}

/* ── EMPTY STATE ── */
.empty {
  text-align: center;
  padding: 80px 24px;
}
.empty-icon {
  width: 80px; height: 80px;
  border-radius: 22px;
  background: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.65);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 36px;
  margin-bottom: 20px;
}
.empty-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -.03em;
  color: ${$.ink0};
  margin-bottom: 8px;
}
.empty-sub { font-size: 14px; color: ${$.ink2}; line-height: 1.65; }

/* ── MONO ── */
.mono { font-family: 'JetBrains Mono', monospace; }

/* ── RESPONSIVE ── */
@media (max-width: 680px) {
  .topnav { overflow: hidden; }
  .topnav-items { display: none; }
  .topnav-mobile-title { display: block; }
  .topnav-logo { margin-right: auto; }
  .cur-toggle { display: none; }
  .topnav .nav-add-btn { display: none; }
  .botnav { display: block; }
  .page { padding-bottom: 100px; }
  .page-hero { padding: 28px 0 22px; }
  .page-title { font-size: 32px; }
  .container { padding: 0 16px; }
  .section { padding: 24px 0; }
  .stat-grid { grid-template-columns: 1fr 1fr !important; }
  .dropzone { padding: 44px 24px; }
  .mgrid { grid-template-columns: 60px repeat(4,1fr); }
  .mgrid-hide { display: none !important; }
  .receipt-header { padding: 16px 18px; gap: 12px; }
}
@media (max-width: 420px) {
  .stat-grid { grid-template-columns: 1fr !important; }
}
`;

/* ─── Helpers ──────────────────────────────── */
function Zl({ v, size = 14 }) {
  if (v == null || v === "") return <span style={{ color: $.ink3 }}>—</span>;
  const n = parseFloat(v);
  return (
    <span className="mono" style={{ fontSize: size }}>
      {n.toFixed(2)}<span style={{ color: $.ink3, fontSize: size - 2, marginLeft: 2 }}> zł</span>
    </span>
  );
}
function CatChip({ cat }) {
  const c = CATS[cat] || CATS["Inne"];
  return (
    <span className="chip" style={{ background: c + "15", color: c, border: `1px solid ${c}25` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, flexShrink: 0 }} aria-hidden="true" />
      {cat}
    </span>
  );
}
function Spinner() {
  return <div style={{ width: 16, height: 16, border: `2.5px solid ${$.ink4}`, borderTopColor: $.green, borderRadius: "50%", animation: "spin .65s linear infinite", flexShrink: 0 }} role="status" aria-label="Ładowanie" />;
}
function Empty({ icon, title, sub }) {
  return (
    <div className="empty" role="status">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
    </div>
  );
}

/* ─── Claude API ─────────────────────────────── */
async function scanReceipt(b64, mt, apiKey) {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mt, data: b64 } },
          {
            type: "text",
            text: `Scan this Polish receipt. Respond with ONLY raw JSON — no markdown, no backticks, no commentary.

{
  "store": string | null,
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": string,
      "quantity": number | null,
      "unit": string | null,
      "unit_price": number | null,
      "total_price": number,
      "discount": number | null,
      "discount_label": string | null,
      "category": "Nabiał"|"Mięso"|"Warzywa"|"Owoce"|"Napoje"|"Pieczywo"|"Słodycze"|"Chemia"|"Paliwo"|"Subskrypcje"|"Restauracje"|"Transport"|"Rozrywka"|"Elektronika"|"Odzież"|"Zdrowie"|"Narzędzia"|"Meble"|"AGD"|"Ogród"|"Zwierzęta"|"Podróże"|"Sport"|"Kosmetyki"|"Edukacja"|"Prezenty"|"Dom"|"Inne"
    }
  ],
  "total": number | null,
  "total_discounts": number | null
}

Rules:
- date MUST be in YYYY-MM-DD format. Extract from receipt header/footer. NEVER return null for date.
- Product names: read carefully, expand abbreviations into readable Polish names (e.g. "PomidGustBel400g" → "Pomidory Gusto Bello 400g").
- Categorize food products correctly: tomatoes/vegetables → "Warzywa", fruits → "Owoce", etc.
- Prices = plain numbers (4.99). Discounts = positive numbers. Missing qty = 1.${(() => {
  const c = getCorrections();
  const nameEntries = Object.entries(c.names);
  const catEntries = Object.entries(c.categories);
  if (!nameEntries.length && !catEntries.length) return "";
  let hint = "\n\nUser corrections from past receipts — apply these:";
  if (nameEntries.length) hint += "\nName fixes: " + nameEntries.slice(-30).map(([k,v]) => {
    const arr = Array.isArray(v) ? v : [v];
    return arr.length === 1 ? `"${k}" → "${arr[0]}"` : `"${k}" → one of [${arr.map(x => `"${x}"`).join(", ")}] (ambiguous, pick best match based on context)`;
  }).join(", ");
  if (catEntries.length) hint += "\nCategory fixes: " + catEntries.slice(-30).map(([k,v]) => `"${k}" → ${v}`).join(", ");
  return hint;
})()}`
          }
        ]
      }]
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  const raw = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim());
}

function getCorrectionsHint() {
  const c = getCorrections();
  const nameEntries = Object.entries(c.names);
  const catEntries = Object.entries(c.categories);
  if (!nameEntries.length && !catEntries.length) return "";
  let hint = "\n\nUser corrections from past receipts — apply these:";
  if (nameEntries.length) hint += "\nName fixes: " + nameEntries.slice(-30).map(([k,v]) => {
    const arr = Array.isArray(v) ? v : [v];
    return arr.length === 1 ? `"${k}" → "${arr[0]}"` : `"${k}" → one of [${arr.map(x => `"${x}"`).join(", ")}] (ambiguous, pick best match based on context)`;
  }).join(", ");
  if (catEntries.length) hint += "\nCategory fixes: " + catEntries.slice(-30).map(([k,v]) => `"${k}" → ${v}`).join(", ");
  return hint;
}

async function parseTextReceipt(text, apiKey) {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Parse the following Polish shopping list / receipt text into structured JSON. Each line is a product. Respond with ONLY raw JSON — no markdown, no backticks, no commentary.

{
  "store": string | null,
  "date": "${new Date().toISOString().slice(0, 10)}",
  "items": [
    {
      "name": string,
      "quantity": number | null,
      "unit": string | null,
      "unit_price": number | null,
      "total_price": number,
      "discount": number | null,
      "discount_label": string | null,
      "category": "Nabiał"|"Mięso"|"Warzywa"|"Owoce"|"Napoje"|"Pieczywo"|"Słodycze"|"Chemia"|"Paliwo"|"Subskrypcje"|"Restauracje"|"Transport"|"Rozrywka"|"Elektronika"|"Odzież"|"Zdrowie"|"Narzędzia"|"Meble"|"AGD"|"Ogród"|"Zwierzęta"|"Podróże"|"Sport"|"Kosmetyki"|"Edukacja"|"Prezenty"|"Dom"|"Inne"
    }
  ],
  "total": number | null,
  "total_discounts": number | null
}

Rules:
- Each line is a separate product. Extract name, quantity, unit, and price from the text.
- If price is missing for a product, set total_price to 0.
- If quantity is mentioned (e.g. "2kg", "3 szt", "3 jogurty"), extract it. Otherwise default to 1.
- Calculate unit_price = total_price / quantity when both are known.
- "total" = sum of all total_price values.
- Categorize products into the correct Polish category.
- Prices = plain numbers (4.99). Discounts = positive numbers. Missing qty = 1.${getCorrectionsHint()}

Text to parse:
${text}`
      }]
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  const raw = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim());
}

/* ─── Drop Zone ──────────────────────────────── */
function DropZone({ onFiles }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const pick = useCallback(files => {
    const imgs = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imgs.length) onFiles(imgs);
  }, [onFiles]);
  return (
    <div
      role="button" tabIndex={0}
      aria-label="Dodaj zdjęcia paragonów — kliknij lub przeciągnij i upuść"
      className={`dropzone${drag ? " drag" : ""}`}
      onClick={() => ref.current.click()}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files); }}
    >
      <input ref={ref} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => pick(e.target.files)} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="dropzone-icon" aria-hidden="true">📸</div>
        <div className="dropzone-title">Skanuj paragon</div>
        <div className="dropzone-sub">
          Przeciągnij zdjęcie tutaj<br />
          <span style={{ color: $.ink3, fontSize: 13 }}>JPG · PNG · WEBP — Claude automatycznie odczyta dane</span>
        </div>
        <div className="dropzone-hint" aria-hidden="true">
          <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Wybierz pliki
        </div>
      </div>
    </div>
  );
}

/* ─── Receipt Review Drawer ──────────────────── */
const ALL_CATS = Object.keys(CATS);

function ReceiptReviewModal({ receipt, onConfirm, onCancel }) {
  const [data, setData] = useState(() => ({
    store: receipt.store || "",
    date: receipt.date || new Date().toISOString().slice(0, 10),
    total: receipt.total ?? 0,
    total_discounts: receipt.total_discounts ?? 0,
    items: (receipt.items || []).map((it, i) => ({ ...it, _key: i })),
  }));
  const [expandedItem, setExpandedItem] = useState(null);
  const overlayRef = useRef();
  const drawerRef = useRef();
  const firstFieldRef = useRef();

  /* ── Focus trap & keyboard ── */
  useEffect(() => {
    firstFieldRef.current?.focus();
    const handleKey = e => {
      if (e.key === "Escape") { onCancel(); return; }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll(
        'input,select,textarea,button,[tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const updateField = (field, val) => setData(d => ({ ...d, [field]: val }));
  const updateItem = (idx, field, val) => setData(d => ({
    ...d,
    items: d.items.map((it, i) => i === idx ? { ...it, [field]: val } : it),
  }));
  const removeItem = idx => {
    haptic(12);
    setData(d => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
    setExpandedItem(null);
  };
  const addItem = () => {
    haptic(12);
    const key = Date.now();
    setData(d => ({
      ...d,
      items: [...d.items, { _key: key, name: "", quantity: 1, unit: null, unit_price: 0, total_price: 0, discount: null, discount_label: null, category: "Inne" }],
    }));
    setExpandedItem(data.items.length);
  };

  const warnings = useMemo(() => {
    const w = [];
    const itemsSum = data.items.reduce((s, it) => s + (parseFloat(it.total_price) || 0), 0);
    const total = parseFloat(data.total) || 0;
    if (Math.abs(total - itemsSum) > 0.01) {
      w.push(`Suma (${total.toFixed(2)}) nie zgadza się z sumą pozycji (${itemsSum.toFixed(2)})`);
    }
    data.items.forEach((it, idx) => {
      const up = parseFloat(it.unit_price);
      const qty = parseFloat(it.quantity);
      const tp = parseFloat(it.total_price) || 0;
      const disc = parseFloat(it.discount) || 0;
      if (up && qty) {
        const expected = up * qty - disc;
        if (Math.abs(tp - expected) > 0.01) {
          w.push(`Produkt ${idx + 1} "${it.name || "?"}": cena (${tp.toFixed(2)}) \u2260 cena jedn. \u00d7 ilo\u015b\u0107 \u2212 zni\u017cka (${expected.toFixed(2)})`);
        }
      }
    });
    return w;
  }, [data]);

  const handleConfirm = () => {
    haptic(20);
    const cleaned = {
      ...data,
      total: parseFloat(data.total) || 0,
      total_discounts: parseFloat(data.total_discounts) || 0,
      items: data.items.map(({ _key, _suggestions, ...it }) => ({
        ...it,
        quantity: parseFloat(it.quantity) || 1,
        unit_price: parseFloat(it.unit_price) || null,
        total_price: parseFloat(it.total_price) || 0,
        discount: it.discount ? parseFloat(it.discount) : null,
      })),
    };
    onConfirm(cleaned);
  };

  return (
    <div className="rv-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onCancel()}
      role="dialog" aria-modal="true" aria-labelledby="rv-dialog-title">
      <div className="rv-drawer" ref={drawerRef}>
        <div className="rv-handle" aria-hidden="true" />
        <div className="rv-head">
          <h2 id="rv-dialog-title" className="rv-title">Sprawdź paragon</h2>
          <button onClick={onCancel} aria-label="Zamknij"
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:$.ink2, padding:"8px 10px",
              borderRadius:10, minWidth:36, minHeight:36, display:"flex", alignItems:"center", justifyContent:"center",
              transition:"background .15s, color .15s" }}>✕</button>
        </div>

        <div className="rv-body">
          {/* Header: date | shop | price | discounts */}
          <div className="rv-meta">
            <div>
              <label className="rv-lbl" htmlFor="rv-date">Data</label>
              <input id="rv-date" ref={firstFieldRef} className="field" type="date" value={data.date} onChange={e => updateField("date", e.target.value)} />
            </div>
            <div>
              <label className="rv-lbl" htmlFor="rv-store">Sklep</label>
              <input id="rv-store" className="field" value={data.store} onChange={e => updateField("store", e.target.value)} placeholder="Nazwa" />
            </div>
            <div>
              <label className="rv-lbl" htmlFor="rv-total">Suma</label>
              <input id="rv-total" className="field" type="number" step="0.01" value={data.total}
                onChange={e => updateField("total", e.target.value)} placeholder="0.00" style={{ textAlign:"right" }} />
            </div>
            <div>
              <label className="rv-lbl" htmlFor="rv-discounts">Zniżki</label>
              <input id="rv-discounts" className="field" type="number" step="0.01" value={data.total_discounts || 0}
                onChange={e => updateField("total_discounts", e.target.value)} placeholder="0.00" style={{ textAlign:"right" }} />
            </div>
          </div>

          {/* Items header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div className="rv-lbl" style={{ marginBottom:0 }} aria-live="polite" aria-atomic="true">Produkty · {data.items.length}</div>
            <button onClick={addItem} aria-label="Dodaj produkt"
              style={{ background:$.greenBg, border:`1px solid ${$.greenRim}`, borderRadius:8, padding:"6px 14px",
                fontSize:12, fontWeight:700, color:"#05964E", cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif",
                minHeight:34, display:"inline-flex", alignItems:"center", gap:4, transition:"background .15s" }}>
              + Dodaj
            </button>
          </div>

          {/* Items */}
          {data.items.map((item, idx) => {
            const isExpanded = expandedItem === idx;
            const suggestions = item._suggestions;
            const itemId = `rv-item-${item._key}`;
            return (
              <div key={item._key} className="rv-item" role="group" aria-label={`Produkt ${idx + 1}: ${item.name || "bez nazwy"}`}>
                {/* Row 1: # badge, product name, delete */}
                <div className="rv-item-r1">
                  <div className="rv-item-num" aria-hidden="true">{idx + 1}</div>
                  <div className="rv-i-name">
                    <input id={`${itemId}-name`} className="field" value={item.name || ""} onChange={e => updateItem(idx, "name", e.target.value)}
                      placeholder="Nazwa produktu" aria-label={`Nazwa produktu ${idx + 1}`} style={{ fontWeight:600 }} />
                  </div>
                  <button className="rv-del-btn" onClick={() => removeItem(idx)} title="Usuń" aria-label={`Usuń produkt ${idx + 1}${item.name ? ": " + item.name : ""}`}>✕</button>
                </div>

                {/* Suggestions (when ambiguous) */}
                {suggestions && suggestions.length > 1 && (
                  <div className="rv-suggest" role="group" aria-label="Sugerowane nazwy">
                    <span className="rv-suggest-lbl" aria-hidden="true">Może:</span>
                    {suggestions.map(s => (
                      <button key={s} className="rv-suggest-pill"
                        aria-label={`Użyj nazwy: ${s}`}
                        onClick={() => { haptic(10); updateItem(idx, "name", s); updateItem(idx, "_suggestions", null); }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Row 2: category | total price */}
                <div className="rv-item-r2">
                  <div className="rv-i-cat">
                    <label className="rv-lbl" htmlFor={`${itemId}-cat`}>Kategoria</label>
                    <select id={`${itemId}-cat`} className="field" value={item.category || "Inne"} onChange={e => updateItem(idx, "category", e.target.value)}
                      style={{ cursor:"pointer" }}>
                      {ALL_CATS.map(c => <option key={c} value={c}>{CAT_ICONS[c] || ""} {c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="rv-lbl" htmlFor={`${itemId}-price`}>Cena</label>
                    <input id={`${itemId}-price`} className="field" type="number" step="0.01" value={item.total_price ?? 0}
                      onChange={e => updateItem(idx, "total_price", e.target.value)}
                      placeholder="0.00" style={{ textAlign:"right", fontWeight:700 }} />
                  </div>
                </div>

                {/* More toggle */}
                <button className="rv-more-toggle"
                  aria-expanded={isExpanded}
                  aria-controls={`${itemId}-details`}
                  onClick={() => { haptic(10); setExpandedItem(isExpanded ? null : idx); }}>
                  {isExpanded ? "▲ Mniej" : "▼ Więcej"}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div id={`${itemId}-details`} role="group" aria-label="Szczegóły produktu">
                    {/* Row 3: jednostka | zniżka */}
                    <div className="rv-item-r3">
                      <div>
                        <label className="rv-lbl" htmlFor={`${itemId}-unit`}>Jednostka</label>
                        <input id={`${itemId}-unit`} className="field" value={item.unit || ""} onChange={e => updateItem(idx, "unit", e.target.value)}
                          placeholder="szt, kg…" />
                      </div>
                      <div>
                        <label className="rv-lbl" htmlFor={`${itemId}-discount`}>Zniżka</label>
                        <input id={`${itemId}-discount`} className="field" type="number" step="0.01" value={item.discount ?? ""}
                          onChange={e => updateItem(idx, "discount", e.target.value)} placeholder="0.00" style={{ textAlign:"right" }} />
                      </div>
                    </div>
                    {/* Row 4: cena jednostkowa | ilość */}
                    <div className="rv-item-r4">
                      <div>
                        <label className="rv-lbl" htmlFor={`${itemId}-uprice`}>Cena jedn.</label>
                        <input id={`${itemId}-uprice`} className="field" type="number" step="0.01" value={item.unit_price ?? ""}
                          onChange={e => updateItem(idx, "unit_price", e.target.value)} placeholder="—" style={{ textAlign:"right" }} />
                      </div>
                      <div>
                        <label className="rv-lbl" htmlFor={`${itemId}-qty`}>Ilość</label>
                        <input id={`${itemId}-qty`} className="field" type="number" step="0.001" value={item.quantity ?? 1}
                          onChange={e => updateItem(idx, "quantity", e.target.value)} style={{ textAlign:"right" }} />
                      </div>
                    </div>
                    {/* Row 5: etykieta zniżki (full width) */}
                    <div className="rv-item-r5">
                      <label className="rv-lbl" htmlFor={`${itemId}-dlabel`}>Etykieta zniżki</label>
                      <input id={`${itemId}-dlabel`} className="field" value={item.discount_label || ""}
                        onChange={e => updateItem(idx, "discount_label", e.target.value)} placeholder="np. -20%, PROMO, 2+1 gratis…" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {warnings.length > 0 && (
            <div style={{ margin: "12px 0", padding: "10px 14px", background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 10, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{"\u26A0"} Uwaga — niezgodności:</div>
              {warnings.map((w, i) => <div key={i}>• {w}</div>)}
            </div>
          )}
        </div>

        <div className="rv-footer">
          <button className="btn-secondary" onClick={onCancel}>Odrzuć</button>
          <button className="btn-primary" onClick={handleConfirm}>Zatwierdź</button>
        </div>

        {/* Learning info */}
        <div className="rv-info" role="note">
          {(() => {
            const s = getCorrectionStats();
            return s.names + s.categories > 0
              ? <span>Nauczono: {s.names} nazw, {s.categories} kategorii — poprawki stosowane automatycznie.</span>
              : <span>Popraw błędy AI — aplikacja zapamięta Twoje korekty na przyszłość.</span>;
          })()}
          <span className="rv-info-note">
            Korekty działają lokalnie (słownik). Uczenie modelu AI w czasie rzeczywistym wymaga treningu na serwerze (server-side ML) — nie jest dostępne w trybie przeglądarkowym.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Receipt Card ───────────────────────────── */
function ReceiptCard({ r, onDelete, delay = 0 }) {
  const [open, setOpen] = useState(false);
  const saved = parseFloat(r.total_discounts) || 0;
  const bid = `rc-${r.id}`;
  return (
    <article
      className="card"
      style={{ animation: `fadeUp .45s cubic-bezier(.16,1,.3,1) ${delay}s both` }}
      aria-labelledby={`${bid}-name`}
    >
      <button
        className="receipt-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={`${bid}-body`}
      >
        <div className="receipt-store-icon" aria-hidden="true">🧾</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div id={`${bid}-name`} className="receipt-name"
            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.store || "Paragon"}
          </div>
          <div className="receipt-meta">
            {r.date || "Brak daty"} · {r.items?.length || 0} produktów
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div className="mono" style={{ fontSize: 20, fontWeight: 500, color: $.green, lineHeight: 1 }}>
            {parseFloat(r.total || 0).toFixed(2)}
            <span style={{ fontSize: 12, color: $.ink3, marginLeft: 3 }}>zł</span>
          </div>
          {saved > 0 && (
            <div style={{ fontSize: 12, color: $.red, fontWeight: 700, marginTop: 3 }}>
              −{saved.toFixed(2)} zł saved
            </div>
          )}
        </div>

        <div
          aria-hidden="true"
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginLeft: 8, flexShrink: 0,
            transition: "transform .25s cubic-bezier(.16,1,.3,1)",
            transform: open ? "rotate(180deg)" : "none",
            fontSize: 10, color: $.ink2,
          }}
        >▼</div>
      </button>

      {open && (
        <div id={`${bid}-body`} style={{ borderTop: `1px solid rgba(255,255,255,0.45)` }}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  {["Produkt", "Kat.", "Ilość", "Cena jedn.", "Opust", "Razem"].map((h, i) => (
                    <th key={h} scope="col" style={{ textAlign: i >= 2 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(r.items || []).map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                      {item.discount_label && (
                        <div style={{ color: $.red, fontSize: 11, marginTop: 2, fontWeight: 500 }}>
                          🏷 {item.discount_label}
                        </div>
                      )}
                    </td>
                    <td><CatChip cat={item.category} /></td>
                    <td style={{ textAlign: "right", color: $.ink2 }} className="mono">
                      {item.quantity || 1}{item.unit ? ` ${item.unit}` : ""}
                    </td>
                    <td style={{ textAlign: "right" }}><Zl v={item.unit_price} /></td>
                    <td style={{ textAlign: "right" }}>
                      {item.discount
                        ? <span className="mono" style={{ color: $.red, fontWeight: 600 }}>−{item.discount.toFixed(2)}</span>
                        : <span style={{ color: $.ink3 }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: "right" }}><Zl v={item.total_price} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "14px 20px", display: "flex", justifyContent: "flex-end", borderTop: `1px solid rgba(255,255,255,0.45)`, background: "rgba(255,255,255,0.45)" }}>
            <button className="btn-danger" onClick={onDelete} aria-label={`Usuń paragon ${r.store || "Paragon"}`}>
              Usuń paragon
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ─── Views ──────────────────────────────────── */

function ReceiptsView({ receipts, setReceipts, processing, errors, setErrors, onFiles }) {
  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Twoje <span>dokumenty</span></h1>
          <p className="page-subtitle au1">Skanuj paragony i faktury — Claude odczyta wszystko automatycznie</p>
        </div>
      </div>

      <div className="container">
        <div className="section" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="au1"><DropZone onFiles={onFiles} /></div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {processing.map(p => (
              <div key={p.id} className="toast-ok" role="status" aria-live="polite">
                <Spinner />
                <span>Analizuję <strong>{p.name}</strong>…</span>
              </div>
            ))}
            {errors.map((err, i) => (
              <div key={i} className="toast-err" role="alert">
                <span>{err}</span>
                <button
                  onClick={() => setErrors(e => e.filter((_, j) => j !== i))}
                  aria-label="Zamknij"
                  style={{ background: "none", border: "none", cursor: "pointer", color: $.red, fontSize: 20, lineHeight: 1, flexShrink: 0 }}
                >×</button>
              </div>
            ))}
          </div>

          {receipts.length > 0 && (
            <div>
              <div className="section-label">Zeskanowane · {receipts.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {receipts.map((r, i) => (
                  <ReceiptCard
                    key={r.id} r={r} delay={i * 0.05}
                    onDelete={() => setReceipts(p => p.filter(x => x.id !== r.id))}
                  />
                ))}
              </div>
            </div>
          )}

          {!receipts.length && !processing.length && (
            <p className="au2" style={{ textAlign: "center", color: $.ink3, fontSize: 14, paddingTop: 4 }}>
              Brak paragonów — dodaj pierwszy powyżej
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function ProductsView({ receipts }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const all = receipts.flatMap(r => (r.items || []).map(it => ({ ...it, store: r.store, date: r.date })));
  const cats = [...new Set(all.map(i => i.category).filter(Boolean))];
  const list = all.filter(i =>
    (i.name || "").toLowerCase().includes(q.toLowerCase()) &&
    (cat === "All" || i.category === cat)
  );
  const spent = receipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
  const saved = receipts.reduce((s, r) => s + (parseFloat(r.total_discounts) || 0), 0);

  if (!receipts.length) return (
    <>
      <div className="page-hero"><div className="page-hero-inner"><h1 className="page-title">Produkty</h1></div></div>
      <div className="container"><Empty icon="🛒" title="Brak produktów" sub="Dodaj paragony, aby zobaczyć bazę produktów" /></div>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Baza <span>wydatków</span></h1>
          <p className="page-subtitle au1">{all.length} produktów ze {receipts.length} paragon{receipts.length === 1 ? "u" : "ów"}</p>
        </div>
      </div>

      <div className="container">
        <div className="section" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stats */}
          <div className="stat-grid au" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { l: "Produktów", v: all.length, unit: "", color: $.ink0 },
              { l: "Wydano łącznie", v: spent.toFixed(2), unit: "zł", color: $.green },
              { l: "Zaoszczędzono", v: saved.toFixed(2), unit: "zł", color: $.red },
            ].map(s => (
              <div className="stat-card" key={s.l}>
                <div className="stat-label">{s.l}</div>
                <div className="stat-val" style={{ color: s.color }}>
                  {s.v}<span style={{ fontSize: 16, color: $.ink3, marginLeft: 4 }}>{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div className="au1" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label htmlFor="psearch" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Szukaj produktu</label>
            <input
              id="psearch"
              className="field"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Szukaj produktu…"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="pills-row" role="group" aria-label="Filtruj kategorię">
                <button className={`pill${cat === "All" ? " on" : ""}`} onClick={() => setCat("All")} aria-pressed={cat === "All"}>Wszystko</button>
                {Object.entries(CAT_GROUPS).map(([group, groupCats]) => {
                  const available = groupCats.filter(gc => cats.includes(gc));
                  if (!available.length) return null;
                  return (
                    <span key={group} style={{ display: "contents" }}>
                      <span style={{ width: 1, height: 28, background: "rgba(0,0,0,0.08)", borderRadius: 1, flexShrink: 0, margin: "0 4px", alignSelf: "center" }} aria-hidden="true" />
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: $.ink3, alignSelf: "center", whiteSpace: "nowrap", paddingRight: 2 }}>{group}</span>
                      {available.map(gc => (
                        <button key={gc} className={`pill${cat === gc ? " on" : ""}`} onClick={() => setCat(gc)} aria-pressed={cat === gc}>{gc}</button>
                      ))}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card tbl-wrap au2">
            <table className="tbl" aria-label="Baza produktów">
              <thead>
                <tr>
                  {["Produkt", "Kategoria", "Sklep", "Data", "Ilość", "Cena jedn.", "Opust", "Razem"].map((h, i) => (
                    <th key={h} scope="col" style={{ textAlign: i >= 4 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", color: $.ink3, padding: "36px 0" }}>Brak wyników dla &ldquo;{q}&rdquo;</td></tr>
                ) : list.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td><CatChip cat={item.category} /></td>
                    <td style={{ color: $.ink2 }}>{item.store || "—"}</td>
                    <td className="mono" style={{ color: $.ink3, fontSize: 12 }}>{item.date || "—"}</td>
                    <td className="mono" style={{ textAlign: "right", color: $.ink2, fontSize: 12 }}>{item.quantity || 1}{item.unit ? ` ${item.unit}` : ""}</td>
                    <td style={{ textAlign: "right" }}><Zl v={item.unit_price} /></td>
                    <td style={{ textAlign: "right" }}>
                      {item.discount
                        ? <span className="mono" style={{ color: $.red, fontWeight: 600, fontSize: 13 }}>−{item.discount.toFixed(2)}</span>
                        : <span style={{ color: $.ink3 }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: "right" }}><Zl v={item.total_price} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function ShoppingView({ receipts }) {
  const [items, setItems] = useState([]);
  const [val, setVal] = useState("");
  const [qty, setQty] = useState(1);
  const inputRef = useRef();
  const known = [...new Set(receipts.flatMap(r => (r.items || []).map(i => i.name)).filter(Boolean))].sort();

  const add = () => {
    if (!val.trim()) { inputRef.current?.focus(); return; }
    setItems(p => [...p, { name: val.trim(), qty, done: false, id: Date.now() }]);
    setVal(""); setQty(1); inputRef.current?.focus();
  };
  const toggle = id => { haptic(15); setItems(p => p.map(i => i.id === id ? { ...i, done: !i.done } : i)); };
  const remove = id => setItems(p => p.filter(i => i.id !== id));
  const done = items.filter(i => i.done).length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Lista <span>zakupów</span></h1>
          <p className="page-subtitle au1">
            {items.length > 0 ? `${done} z ${items.length} zakupiono` : "Zaplanuj co kupić"}
          </p>
        </div>
      </div>

      <div className="container">
        <div className="section" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>

          {/* Add form */}
          <div className="card au" style={{ padding: "22px 24px" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label htmlFor="si" style={{ fontSize: 12, fontWeight: 600, color: $.ink2, marginBottom: 6, display: "block", letterSpacing: ".04em", textTransform: "uppercase" }}>Produkt</label>
                <input
                  id="si"
                  ref={inputRef}
                  className="field"
                  list="kp"
                  value={val}
                  onChange={e => setVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && add()}
                  placeholder="np. Mleko, Chleb…"
                  autoComplete="off"
                />
                <datalist id="kp">{known.map(p => <option key={p} value={p} />)}</datalist>
              </div>
              <div style={{ width: 80 }}>
                <label htmlFor="sq" style={{ fontSize: 12, fontWeight: 600, color: $.ink2, marginBottom: 6, display: "block", letterSpacing: ".04em", textTransform: "uppercase" }}>Ilość</label>
                <input
                  id="sq"
                  className="field"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, +e.target.value))}
                  style={{ textAlign: "center" }}
                />
              </div>
              <button className="btn-primary" onClick={add} style={{ marginTop: 2 }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                Dodaj
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {items.length > 0 && (
            <div className="au1" style={{ display: "flex", alignItems: "center", gap: 12 }}
              role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={items.length} aria-label={`${done} z ${items.length} zakupiono`}>
              <div className="prog"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
              <span className="mono" style={{ fontSize: 12, color: $.ink3, whiteSpace: "nowrap" }}>{done}/{items.length}</span>
            </div>
          )}

          {/* Items */}
          {items.length === 0 ? (
            <Empty icon="📋" title="Lista jest pusta" sub="Dodaj produkty powyżej. Podpowiedzi z paragonów pojawią się automatycznie." />
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }} aria-label="Lista zakupów">
              {items.map((item, i) => (
                <li key={item.id} style={{ animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * .04}s both` }}>
                  <div className={`shop-item${item.done ? " done" : ""}`}>
                    <button
                      role="checkbox"
                      aria-checked={item.done}
                      aria-label={`${item.done ? "Odznacz" : "Zaznacz"} ${item.name}`}
                      className={`check-btn${item.done ? " on" : ""}`}
                      onClick={() => toggle(item.id)}
                    >
                      {item.done && (
                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true">
                          <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    <span style={{ flex: 1, fontSize: 15, fontWeight: 500, textDecoration: item.done ? "line-through" : "none", color: item.done ? $.ink3 : $.ink0, transition: "color .2s" }}>
                      {item.name}
                    </span>

                    <span className="mono" style={{ fontSize: 12, color: $.ink3, background: "rgba(255,255,255,0.45)", padding: "4px 12px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.55)", flexShrink: 0 }}>
                      ×{item.qty}
                    </span>

                    <button
                      className="btn-icon"
                      onClick={() => remove(item.id)}
                      aria-label={`Usuń ${item.name}`}
                      style={{ marginLeft: 4 }}
                    >×</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function MealPlanView({ receipts, apiKey }) {
  const DAYS  = ["Pon","Wt","Śr","Czw","Pt","Sob","Ndz"];
  const MEALS = ["Śniadanie","Obiad","Kolacja"];
  const [plan,     setPlan]     = useState({}); // {`${day}-${meal}`: text}
  const [loading,  setLoading]  = useState(null); // cell key being generated
  const [pantry,   setPantry]   = useState("");
  const [genAll,   setGenAll]   = useState(false);
  const [shopList, setShopList] = useState([]);
  const [genShop,  setGenShop]  = useState(false);

  // Build ingredient list from recent receipts
  const knownItems = useMemo(() => {
    const cats = new Set(["Nabiał","Mięso","Warzywa","Owoce","Pieczywo","Słodycze"]);
    return [...new Set(
      receipts.flatMap(r => (r.items||[])
        .filter(it => cats.has(it.category))
        .map(it => it.name)
        .filter(Boolean)
      )
    )].slice(0, 40);
  }, [receipts]);

  const callClaude = async (prompt) => {
    if (!apiKey) throw new Error("Brak klucza API");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    return d.content?.find(b => b.type === "text")?.text || "";
  };

  const generateCell = async (day, meal) => {
    const key = `${day}-${meal}`;
    setLoading(key);
    haptic(15);
    try {
      const context = knownItems.length
        ? `Produkty dostępne w lodówce: ${knownItems.slice(0,20).join(", ")}.`
        : "";
      const extra = pantry ? `Dodatkowe składniki: ${pantry}.` : "";
      const text = await callClaude(
        `Zaproponuj jedno konkretne danie na ${meal} na ${day}. ${context} ${extra}
Odpowiedz TYLKO nazwą dania i jednym zdaniem opisu (max 60 znaków). Format: "Nazwa — opis". Bez list, bez gwiazdek.`
      );
      setPlan(p => ({ ...p, [key]: text.trim() }));
      haptic(20);
    } catch(e) {
      setPlan(p => ({ ...p, [key]: "Błąd — spróbuj ponownie" }));
    } finally {
      setLoading(null);
    }
  };

  const generateAll = async () => {
    setGenAll(true);
    haptic(30);
    for (const day of DAYS) {
      for (const meal of MEALS) {
        const key = `${day}-${meal}`;
        if (plan[key]) continue;
        setLoading(key);
        try {
          const context = knownItems.length ? `Produkty w lodówce: ${knownItems.slice(0,15).join(", ")}.` : "";
          const text = await callClaude(
            `Danie na ${meal}, ${day}. ${context} Odpowiedz TYLKO: "Nazwa — krótki opis" (max 55 znaków). Zero list.`
          );
          setPlan(p => ({ ...p, [key]: text.trim() }));
        } catch(e) { /* skip */ }
        setLoading(null);
        await new Promise(r => setTimeout(r, 200));
      }
    }
    setGenAll(false);
  };

  const generateShoppingList = async () => {
    if (!Object.keys(plan).length) return;
    setGenShop(true);
    haptic(20);
    try {
      const meals = Object.values(plan).join("\n");
      const text = await callClaude(
        `Na podstawie tych posiłków: ${meals}
        
Wygeneruj listę zakupów. Odpowiedz TYLKO jako JSON array stringów, np. ["Mleko","Jajka"]. Zero innych słów.`
      );
      const clean = text.replace(/```(?:json)?/g,"").trim();
      const arr = JSON.parse(clean);
      if (Array.isArray(arr)) setShopList(arr);
    } catch(e) { setShopList([]); }
    setGenShop(false);
  };

  const clearPlan = () => { setPlan({}); setShopList([]); };

  const filledCells = Object.keys(plan).length;
  const totalCells  = DAYS.length * MEALS.length;

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">AI <span>Meal Planner</span></h1>
          <p className="page-subtitle au1">
            {filledCells > 0 ? `${filledCells}/${totalCells} posiłków zaplanowanych` : "Kliknij komórkę lub wygeneruj cały plan"}
          </p>
        </div>
      </div>
      <div className="container">
        <div className="section" style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Controls */}
          <div className="card au" style={{ padding:"20px 22px" }}>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
              <div style={{ flex:1, minWidth:200 }}>
                <label htmlFor="pantry" style={{ fontSize:11, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:$.ink3, marginBottom:6, display:"block" }}>
                  Dodatkowe składniki (opcjonalnie)
                </label>
                <input id="pantry" className="field" value={pantry} onChange={e=>setPantry(e.target.value)}
                  placeholder="np. ryż, pomidory, ser żółty…" />
              </div>
              <button className="btn-primary" onClick={generateAll} disabled={genAll}
                style={{ gap:8, minHeight:48, opacity: genAll ? 0.7 : 1 }}>
                {genAll ? <><Spinner />Generuję…</> : "✦ Generuj cały plan"}
              </button>
              {filledCells > 0 && (
                <>
                  <button className="btn-secondary" onClick={generateShoppingList} disabled={genShop}
                    style={{ minHeight:48 }}>
                    {genShop ? <><Spinner />Listuję…</> : "🛒 Lista zakupów"}
                  </button>
                  <button onClick={clearPlan}
                    style={{ background:"none", border:"1.5px solid rgba(255,255,255,0.65)", borderRadius:10, padding:"0 16px", minHeight:48, cursor:"pointer", color:$.ink2, fontSize:13, fontWeight:600, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                    Wyczyść
                  </button>
                </>
              )}
            </div>
            {knownItems.length > 0 && (
              <div style={{ marginTop:14, fontSize:12, color:$.ink2 }}>
                <span style={{ fontWeight:700, color:$.ink3 }}>Z Twoich paragonów: </span>
                {knownItems.slice(0,12).join(" · ")}
                {knownItems.length > 12 && ` +${knownItems.length-12} więcej`}
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="mgrid-outer au1">
            <div style={{ overflowX:"auto" }}>
              <table style={{ borderCollapse:"collapse", width:"100%", minWidth:560 }}>
                <thead>
                  <tr>
                    <th style={{ width:80, background:"rgba(255,255,255,0.40)", padding:"10px 8px", fontSize:9, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:$.ink3 }}></th>
                    {DAYS.map(d => (
                      <th key={d} style={{ background:"rgba(255,255,255,0.40)", padding:"10px 4px", fontSize:9, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:$.ink2, textAlign:"center" }}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MEALS.map((meal, mi) => (
                    <tr key={meal}>
                      <td style={{ background:"rgba(255,255,255,0.40)", padding:"8px", fontSize:9, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:$.ink3, textAlign:"center", writingMode:"vertical-rl", verticalAlign:"middle" }}>{meal}</td>
                      {DAYS.map(day => {
                        const key   = `${day}-${meal}`;
                        const text  = plan[key];
                        const busy  = loading === key;
                        const [name, desc] = text ? text.split("—").map(s=>s.trim()) : ["",""];
                        return (
                          <td key={key} style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.30)", padding:0, verticalAlign:"top", minWidth:100 }}>
                            <button
                              onClick={() => !busy && generateCell(day, meal)}
                              aria-label={`${meal} ${day}${text ? ": "+text : " — kliknij aby wygenerować"}`}
                              style={{
                                width:"100%", minHeight:72, padding:"8px 6px",
                                background:"transparent", border:"none", cursor: busy?"wait":"pointer",
                                textAlign:"left", transition:"background .15s",
                                display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"flex-start", gap:2,
                              }}
                              onMouseOver={e => { if(!busy) e.currentTarget.style.background="rgba(6,193,103,0.06)"; }}
                              onMouseOut={e => { e.currentTarget.style.background="transparent"; }}
                            >
                              {busy ? (
                                <div style={{ display:"flex", justifyContent:"center", width:"100%", padding:"4px 0" }}>
                                  <Spinner />
                                </div>
                              ) : text ? (
                                <>
                                  <span style={{ fontSize:11, fontWeight:700, color:$.ink0, lineHeight:1.3, letterSpacing:"-.01em" }}>{name}</span>
                                  {desc && <span style={{ fontSize:10, color:$.ink3, lineHeight:1.3 }}>{desc}</span>}
                                </>
                              ) : (
                                <span style={{ fontSize:18, color:"rgba(0,0,0,0.12)", margin:"0 auto" }}>+</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Generated shopping list */}
          {shopList.length > 0 && (
            <div className="card au2" style={{ padding:"22px 24px" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:$.ink3, marginBottom:14 }}>
                Lista zakupów z planu — {shopList.length} pozycji
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {shopList.map((item, i) => (
                  <span key={i} style={{
                    padding:"6px 14px", borderRadius:99,
                    background:$.greenBg, border:`1px solid ${$.greenRim}`,
                    fontSize:13, fontWeight:500, color:$.ink0,
                  }}>{item}</span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}


/* ─── Stats helpers ──────────────────────────── */
function DonutChart({ data, size = 200 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const cx = size / 2, cy = size / 2;
  const R = size * 0.38, r = size * 0.24;
  const circ = 2 * Math.PI * R;
  let cumPct = 0;
  const slices = data.map(d => {
    const pct = d.value / total;
    const offset = circ * (1 - cumPct - pct);
    const dash   = circ * pct - 2;
    cumPct += pct;
    return { ...d, offset, dash, pct };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.12)" />
        </filter>
      </defs>
      {/* Track */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={R - r} />
      {/* Slices */}
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={R} fill="none"
          stroke={s.color} strokeWidth={R - r}
          strokeDasharray={`${Math.max(0, s.dash)} ${circ}`}
          strokeDashoffset={s.offset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: `stroke-dasharray .8s cubic-bezier(.16,1,.3,1) ${i * .06}s, stroke-dashoffset .8s cubic-bezier(.16,1,.3,1) ${i * .06}s` }}
          filter="url(#ds)"
        />
      ))}
      {/* Centre label */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={size * 0.09} fontWeight="700"
        fill="#1D1D1F" fontFamily="'JetBrains Mono', monospace">{(total).toFixed(0)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={size * 0.054} fill="#AEAEB2"
        fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">łącznie zł</text>
    </svg>
  );
}

function BarChart({ months, maxVal }) {
  const W = 36, GAP = 10, H = 100;
  const total = months.length;
  const width = total * (W + GAP) - GAP;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${H + 32}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {months.map((m, i) => {
        const barH = maxVal ? Math.max(4, (m.total / maxVal) * H) : 4;
        const x = i * (W + GAP);
        const isLast = i === months.length - 1;
        return (
          <g key={m.label}>
            <rect x={x} y={H - barH} width={W} height={barH} rx={6}
              fill={isLast ? "#06C167" : "rgba(6,193,103,0.20)"}
              style={{ transition: `height .7s cubic-bezier(.16,1,.3,1) ${i * .05}s, y .7s cubic-bezier(.16,1,.3,1) ${i * .05}s` }}
            />
            {isLast && (
              <text x={x + W / 2} y={H - barH - 6} textAnchor="middle"
                fontSize={9} fontWeight="700" fill="#06C167"
                fontFamily="'JetBrains Mono', monospace">{m.total.toFixed(0)}</text>
            )}
            <text x={x + W / 2} y={H + 16} textAnchor="middle"
              fontSize={9} fill="#AEAEB2"
              fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function InsightCard({ icon, title, sub, accent }) {
  return (
    <div style={{
      background: accent ? "rgba(6,193,103,0.07)" : $.glass,
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      border: `1px solid ${accent ? "rgba(6,193,103,0.25)" : "rgba(255,255,255,0.70)"}`,
      borderRadius: 16, padding: "16px 20px",
      display: "flex", alignItems: "flex-start", gap: 14,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: accent ? "rgba(6,193,103,0.15)" : "rgba(255,255,255,0.6)",
        border: `1px solid ${accent ? "rgba(6,193,103,0.30)" : "rgba(255,255,255,0.7)"}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: $.ink0, letterSpacing: "-.01em" }}>{title}</div>
        <div style={{ fontSize: 12, color: $.ink2, marginTop: 3, lineHeight: 1.5 }}>{sub}</div>
      </div>
    </div>
  );
}

function StatsView({ receipts, expenses = [], allItems: allItemsProp = [], currency = "PLN" }) {
  // ── Category breakdown — use merged allItems if provided ──
  const all = allItemsProp.length > 0 ? allItemsProp :
    receipts.flatMap(r => (r.items || []).map(it => ({ ...it, store: r.store, date: r.date })));
  const catTotals = useMemo(() => {
    const map = {};
    all.forEach(item => {
      const cat = item.category || "Inne";
      map[cat] = (map[cat] || 0) + (parseFloat(item.total_price) || 0);
    });
    return Object.entries(map)
      .map(([cat, value]) => ({ cat, value, color: CATS[cat] || "#9CA3AF" }))
      .sort((a, b) => b.value - a.value);
  }, [all]);

  // ── Monthly aggregation ──
  const monthData = useMemo(() => {
    const map = {};
    receipts.forEach(r => {
      if (!r.date) return;
      // try parse date — accept "YYYY-MM-DD", "DD.MM.YYYY", "DD/MM/YYYY"
      let key = null;
      const m1 = r.date.match(/^(\d{4})-(\d{2})/);
      const m2 = r.date.match(/^(\d{2})[./](\d{2})[./](\d{4})/);
      if (m1) key = `${m1[1]}-${m1[2]}`;
      else if (m2) key = `${m2[3]}-${m2[2]}`;
      if (!key) return;
      map[key] = (map[key] || 0) + (parseFloat(r.total) || 0);
    });
    const months = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([key, total]) => {
        const [, mStr] = key.split("-");
        return { label: months[parseInt(mStr, 10) - 1] || mStr, total };
      });
  }, [receipts]);

  // ── Summary numbers ──
  const totalSpent  = receipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
  const totalSaved  = receipts.reduce((s, r) => s + (parseFloat(r.total_discounts) || 0), 0);
  const avgReceipt  = receipts.length ? totalSpent / receipts.length : 0;
  const maxMonth    = Math.max(...monthData.map(m => m.total), 1);

  // ── Insights ──
  const topCat    = catTotals[0];
  const topCatPct = topCat && totalSpent ? ((topCat.value / totalSpent) * 100).toFixed(0) : 0;
  const savePct   = totalSpent ? ((totalSaved / (totalSpent + totalSaved)) * 100).toFixed(1) : 0;

  if (!receipts.length) return (
    <>
      <div className="page-hero"><div className="page-hero-inner">
        <h1 className="page-title au">Statystyki</h1>
        <p className="page-subtitle au1">Dodaj paragony, aby zobaczyć analizę wydatków</p>
      </div></div>
      <div className="container"><div style={{ height: 200 }}><div className="empty" style={{ paddingTop: 60 }}>
        <div className="empty-icon">📊</div>
        <div className="empty-title">Brak danych</div>
        <div className="empty-sub">Dodaj paragony, aby zobaczyć wykresy i statystyki</div>
      </div></div></div>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Statystyki <span>wydatków</span></h1>
          <p className="page-subtitle au1">{receipts.length} paragon{receipts.length === 1 ? "" : "ów"} · {all.length} pozycji</p>
        </div>
      </div>

      <div className="container">
        <div className="section" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── Top stats row ── */}
          <div className="stat-grid au" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { l: "Łącznie wydano",    v: totalSpent.toFixed(2),  u: "zł", col: $.ink0 },
              { l: "Śr. paragon",       v: avgReceipt.toFixed(2),  u: "zł", col: $.ink0 },
              { l: "Zaoszczędzono",     v: totalSaved.toFixed(2),  u: "zł", col: $.red  },
            ].map(s => (
              <div className="stat-card" key={s.l}>
                <div className="stat-label">{s.l}</div>
                <div className="stat-val" style={{ color: s.col }}>
                  {s.v}<span style={{ fontSize: 16, color: $.ink3, marginLeft: 4 }}>{s.u}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Donut + legend row ── */}
          <div className="card au1" style={{ padding: "28px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3, marginBottom: 20 }}>
              Podział wg kategorii
            </div>
            <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
              {/* Donut */}
              <div style={{ flexShrink: 0 }}>
                <DonutChart data={catTotals.map(d => ({ value: d.value, color: d.color }))} size={180} />
              </div>
              {/* Legend */}
              <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 10 }}>
                {catTotals.slice(0, 7).map(d => {
                  const pct = totalSpent ? (d.value / totalSpent * 100).toFixed(1) : 0;
                  return (
                    <div key={d.cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: $.ink0 }}>{d.cat}</div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ width: 64, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: d.color, borderRadius: 2, transition: "width .8s cubic-bezier(.16,1,.3,1)" }} />
                        </div>
                        <span className="mono" style={{ fontSize: 12, color: $.ink2, width: 36, textAlign: "right" }}>{pct}%</span>
                        <span className="mono" style={{ fontSize: 12, color: $.ink3, width: 52, textAlign: "right" }}>{d.value.toFixed(0)} zł</span>
                      </div>
                    </div>
                  );
                })}
                {catTotals.length > 7 && (
                  <div style={{ fontSize: 12, color: $.ink3, marginTop: 2 }}>+ {catTotals.length - 7} innych kategorii</div>
                )}
              </div>
            </div>
          </div>

          {/* ── Monthly bar chart ── */}
          {monthData.length > 0 && (
            <div className="card au2" style={{ padding: "28px 24px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3, marginBottom: 20 }}>
                Wydatki miesięczne
              </div>
              <BarChart months={monthData} maxVal={maxMonth} />
            </div>
          )}

          {/* ── Insight cards ── */}
          <div className="au3" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3, marginBottom: 4 }}>
              Spostrzeżenia
            </div>

            {topCat && (
              <InsightCard
                icon="📌"
                title={`${topCat.cat} to Twój największy wydatek`}
                sub={`${topCat.value.toFixed(2)} zł · ${topCatPct}% wszystkich wydatków`}
                accent={false}
              />
            )}

            {totalSaved > 0 && (
              <InsightCard
                icon="✦"
                title={`Zaoszczędziłeś ${savePct}% dzięki rabatom`}
                sub={`${totalSaved.toFixed(2)} zł zaoszczędzono na ${receipts.length} paragonach`}
                accent={true}
              />
            )}

            {avgReceipt > 0 && (
              <InsightCard
                icon="🧾"
                title={`Średni paragon: ${avgReceipt.toFixed(2)} zł`}
                sub={`Łącznie ${receipts.length} wizyt zakupowych · ${all.length} unikalnych pozycji`}
                accent={false}
              />
            )}

            {catTotals.length >= 3 && (
              <InsightCard
                icon="📊"
                title={`${catTotals.length} aktywnych kategorii wydatków`}
                sub={`Top 3: ${catTotals.slice(0,3).map(d => d.cat).join(", ")}`}
                accent={false}
              />
            )}
          </div>

        </div>
      </div>
    </>
  );
}


/* ─── StoresView ─────────────────────────────── */
const TIME_RANGES = [
  { id: "7",   label: "7 dni"   },
  { id: "30",  label: "30 dni"  },
  { id: "90",  label: "3 mies." },
  { id: "all", label: "Wszystko" },
];

function parseDate(str) {
  if (!str) return null;
  const m1 = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const m2 = str.match(/^(\d{2})[./](\d{2})[./](\d{4})/);
  if (m1) return new Date(+m1[1], +m1[2]-1, +m1[3]);
  if (m2) return new Date(+m2[3], +m2[2]-1, +m2[1]);
  return null;
}

function StoresView({ receipts }) {
  const [range,      setRange]      = useState("all");
  const [storeQ,     setStoreQ]     = useState("");
  const [activeStore,setActiveStore] = useState(null); // drilldown
  const [drillQ,     setDrillQ]     = useState("");
  const [drillCat,   setDrillCat]   = useState("All");

  // ── Filter receipts by time range ──
  const now = new Date();
  const filtered = useMemo(() => {
    if (range === "all") return receipts;
    const days = parseInt(range, 10);
    const cutoff = new Date(now - days * 864e5);
    return receipts.filter(r => {
      const d = parseDate(r.date);
      return d && d >= cutoff;
    });
  }, [receipts, range]);

  // ── Build store summary map ──
  const storeMap = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const key = (r.store || "Nieznany sklep").trim();
      if (!map[key]) map[key] = { name: key, visits: 0, total: 0, saved: 0, items: [], lastDate: null };
      map[key].visits++;
      map[key].total  += parseFloat(r.total) || 0;
      map[key].saved  += parseFloat(r.total_discounts) || 0;
      (r.items || []).forEach(it => map[key].items.push({ ...it, date: r.date }));
      const d = parseDate(r.date);
      if (d && (!map[key].lastDate || d > map[key].lastDate)) map[key].lastDate = d;
    });
    return map;
  }, [filtered]);

  const stores = useMemo(() =>
    Object.values(storeMap)
      .filter(s => s.name.toLowerCase().includes(storeQ.toLowerCase()))
      .sort((a, b) => b.total - a.total),
    [storeMap, storeQ]
  );

  const totalAll = stores.reduce((s, st) => s + st.total, 0);

  // ── Drilldown data ──
  const drillStore = activeStore ? storeMap[activeStore] : null;
  const drillItems = useMemo(() => {
    if (!drillStore) return [];
    return drillStore.items.filter(it =>
      (it.name || "").toLowerCase().includes(drillQ.toLowerCase()) &&
      (drillCat === "All" || it.category === drillCat)
    );
  }, [drillStore, drillQ, drillCat]);
  const drillCats = drillStore
    ? ["All", ...new Set(drillStore.items.map(i => i.category).filter(Boolean))]
    : [];

  // ── Store initial letter avatar color ──
  const storeColor = name => {
    const colors = ["#06C167","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#EC4899","#0891B2","#D97706"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFFFF;
    return colors[Math.abs(h) % colors.length];
  };

  const fmtDate = d => d ? d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";

  if (!receipts.length) return (
    <>
      <div className="page-hero"><div className="page-hero-inner">
        <h1 className="page-title au">Sklepy</h1>
        <p className="page-subtitle">Dodaj paragony, aby zobaczyć analizę sklepów</p>
      </div></div>
      <div className="container">
        <Empty icon="🏪" title="Brak sklepów" sub="Dodaj paragony — każdy sklep otrzyma własną kartę z historią zakupów" />
      </div>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            {activeStore ? (
              <>
                <button
                  onClick={() => { setActiveStore(null); setDrillQ(""); setDrillCat("All"); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: $.green, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "-.01em", padding: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}
                  aria-label="Wróć do listy sklepów"
                >
                  ← Sklepy
                </button>
                <h1 className="page-title au" style={{ fontSize: "clamp(26px,4vw,42px)" }}>{activeStore}</h1>
                <p className="page-subtitle au1">
                  {drillStore?.visits} wizyt · {drillStore?.items.length} pozycji · ostatnia {fmtDate(drillStore?.lastDate)}
                </p>
              </>
            ) : (
              <>
                <h1 className="page-title au">Moje <span>sklepy</span></h1>
                <p className="page-subtitle au1">{stores.length} sklepów · {filtered.length} paragonów</p>
              </>
            )}
          </div>
          {/* Time range pills */}
          {!activeStore && (
            <div className="pills-row" role="group" aria-label="Zakres czasowy" style={{ flexShrink: 0 }}>
              {TIME_RANGES.map(tr => (
                <button key={tr.id} className={`pill${range === tr.id ? " on" : ""}`}
                  onClick={() => setRange(tr.id)} aria-pressed={range === tr.id}>
                  {tr.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container">
        <div className="section" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── LIST MODE ── */}
          {!activeStore && (<>
            {/* Search */}
            <div className="au">
              <label htmlFor="sq" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Szukaj sklepu</label>
              <input id="sq" className="field" value={storeQ} onChange={e => setStoreQ(e.target.value)} placeholder="Szukaj sklepu…" />
            </div>

            {/* Store cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stores.length === 0 && (
                <div style={{ textAlign: "center", color: $.ink3, fontSize: 14, padding: "40px 0" }}>Brak wyników</div>
              )}
              {stores.map((st, i) => {
                const pct = totalAll ? (st.total / totalAll * 100) : 0;
                const avg = st.visits ? st.total / st.visits : 0;
                const col = storeColor(st.name);
                return (
                  <button
                    key={st.name}
                    onClick={() => setActiveStore(st.name)}
                    aria-label={`Otwórz ${st.name}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      background: $.glass,
                      backdropFilter: "blur(24px) saturate(180%)",
                      WebkitBackdropFilter: "blur(24px) saturate(180%)",
                      border: "1px solid rgba(255,255,255,0.72)",
                      borderRadius: 20,
                      padding: "18px 22px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "box-shadow .2s, border-color .2s, transform .15s",
                      animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * .05}s both`,
                      boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                    }}
                    onMouseOver={e => { e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.10)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.96)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseOut={e => { e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.72)"; e.currentTarget.style.transform = "none"; }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                      background: col + "18", border: `1px solid ${col}35`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Bricolage Grotesque',serif", fontSize: 18, fontWeight: 800,
                      color: col, letterSpacing: "-.02em",
                    }}>
                      {st.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "-.02em", color: $.ink0, marginBottom: 4 }}>
                        {st.name}
                      </div>
                      {/* Progress bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 2, transition: "width .8s cubic-bezier(.16,1,.3,1)" }} />
                        </div>
                        <span style={{ fontSize: 11, color: $.ink3, whiteSpace: "nowrap", fontFamily: "'JetBrains Mono',monospace" }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ fontSize: 12, color: $.ink2, marginTop: 5, display: "flex", gap: 14, flexWrap: "wrap" }}>
                        <span>{st.visits} wizyt</span>
                        <span>śr. {avg.toFixed(0)} zł/wizyta</span>
                        {st.saved > 0 && <span style={{ color: $.red }}>−{st.saved.toFixed(2)} zł saved</span>}
                        <span style={{ color: $.ink3 }}>ost. {fmtDate(st.lastDate)}</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: 20, fontWeight: 500, color: col, lineHeight: 1 }}>
                        {st.total.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: $.ink3, marginTop: 2 }}>zł łącznie</div>
                    </div>

                    <div style={{ color: $.ink3, fontSize: 12, marginLeft: 4, flexShrink: 0 }}>›</div>
                  </button>
                );
              })}
            </div>
          </>)}

          {/* ── DRILLDOWN MODE ── */}
          {activeStore && drillStore && (<>
            {/* Drilldown stats */}
            <div className="stat-grid au" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { l: "Łącznie",    v: drillStore.total.toFixed(2), u: "zł", col: storeColor(activeStore) },
                { l: "Wizyt",      v: drillStore.visits,           u: "",   col: $.ink0 },
                { l: "Zaoszcz.",   v: drillStore.saved.toFixed(2), u: "zł", col: $.red  },
              ].map(s => (
                <div className="stat-card" key={s.l}>
                  <div className="stat-label">{s.l}</div>
                  <div className="stat-val" style={{ color: s.col }}>
                    {s.v}<span style={{ fontSize: 15, color: $.ink3, marginLeft: 3 }}>{s.u}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Drill filters */}
            <div className="au1" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input className="field" value={drillQ} onChange={e => setDrillQ(e.target.value)} placeholder={`Szukaj w ${activeStore}…`} />
              <div className="pills-row" role="group" aria-label="Filtruj kategorię">
                {drillCats.map(dc => (
                  <button key={dc} className={`pill${drillCat === dc ? " on" : ""}`}
                    onClick={() => setDrillCat(dc)} aria-pressed={drillCat === dc}>
                    {dc === "All" ? "Wszystko" : dc}
                  </button>
                ))}
              </div>
            </div>

            {/* Drilldown table */}
            <div className="card tbl-wrap au2">
              <table className="tbl" aria-label={`Produkty z ${activeStore}`}>
                <thead>
                  <tr>
                    {["Produkt", "Kategoria", "Data", "Ilość", "Cena jedn.", "Opust", "Razem"].map((h, i) => (
                      <th key={h} scope="col" style={{ textAlign: i >= 3 ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drillItems.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", color: $.ink3, padding: "36px 0" }}>Brak wyników</td></tr>
                  ) : drillItems.map((item, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td><CatChip cat={item.category} /></td>
                      <td className="mono" style={{ color: $.ink3, fontSize: 12 }}>{item.date || "—"}</td>
                      <td className="mono" style={{ textAlign: "right", color: $.ink2, fontSize: 12 }}>{item.quantity || 1}{item.unit ? ` ${item.unit}` : ""}</td>
                      <td style={{ textAlign: "right" }}><Zl v={item.unit_price} /></td>
                      <td style={{ textAlign: "right" }}>
                        {item.discount
                          ? <span className="mono" style={{ color: $.red, fontWeight: 600, fontSize: 13 }}>−{item.discount.toFixed(2)}</span>
                          : <span style={{ color: $.ink3 }}>—</span>}
                      </td>
                      <td style={{ textAlign: "right" }}><Zl v={item.total_price} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>)}

        </div>
      </div>
    </>
  );
}


/* ─── ExportView ─────────────────────────────── */
function ExportView({ receipts }) {
  const [range,    setRange]    = useState("all");
  const [format,   setFormat]   = useState("items"); // "items" | "receipts"
  const [exported, setExported] = useState(false);

  const filtered = useMemo(() => {
    if (range === "all") return receipts;
    const days = parseInt(range, 10);
    const cutoff = new Date(Date.now() - days * 864e5);
    return receipts.filter(r => {
      const d = parseDate(r.date);
      return d && d >= cutoff;
    });
  }, [receipts, range]);

  const allItems = useMemo(() =>
    filtered.flatMap(r =>
      (r.items || []).map(it => ({ ...it, store: r.store, date: r.date }))
    ), [filtered]
  );

  const totalSpent = filtered.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
  const totalSaved = filtered.reduce((s, r) => s + (parseFloat(r.total_discounts) || 0), 0);

  const downloadCSV = () => {
    let rows, headers;

    if (format === "items") {
      headers = ["Produkt","Kategoria","Sklep","Data","Ilość","Jednostka","Cena jedn.","Opust","Razem"];
      rows = allItems.map(it => [
        it.name || "",
        it.category || "",
        it.store || "",
        it.date || "",
        it.quantity ?? 1,
        it.unit || "",
        it.unit_price != null ? parseFloat(it.unit_price).toFixed(2) : "",
        it.discount != null ? parseFloat(it.discount).toFixed(2) : "",
        parseFloat(it.total_price || 0).toFixed(2),
      ]);
    } else {
      headers = ["Sklep","Data","Pozycji","Łącznie","Zaoszczędzono"];
      rows = filtered.map(r => [
        r.store || "",
        r.date || "",
        (r.items || []).length,
        parseFloat(r.total || 0).toFixed(2),
        parseFloat(r.total_discounts || 0).toFixed(2),
      ]);
    }

    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(esc).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `maszkaapp-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const previewRows = format === "items"
    ? allItems.slice(0, 6)
    : filtered.slice(0, 6);

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Eksport <span>danych</span></h1>
          <p className="page-subtitle au1">
            {filtered.length} paragonów · {allItems.length} pozycji · {totalSpent.toFixed(2)} zł
          </p>
        </div>
      </div>

      <div className="container">
        <div className="section" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 780 }}>

          {/* ── Config card ── */}
          <div className="card au" style={{ padding: "28px 28px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Format */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3, marginBottom: 12 }}>
                  Co eksportować
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { id: "items",    label: "Pozycje",   sub: "Każdy produkt osobno",   icon: "📦" },
                    { id: "receipts", label: "Paragony",  sub: "Podsumowanie per wizyta", icon: "🧾" },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      aria-pressed={format === f.id}
                      style={{
                        flex: 1, minWidth: 140,
                        padding: "14px 18px",
                        borderRadius: 14,
                        border: `2px solid ${format === f.id ? $.green : "rgba(255,255,255,0.65)"}`,
                        background: format === f.id ? $.greenBg : "rgba(255,255,255,0.45)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all .18s",
                        display: "flex", alignItems: "center", gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{f.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: format === f.id ? $.green : $.ink0, letterSpacing: "-.01em" }}>{f.label}</div>
                        <div style={{ fontSize: 12, color: $.ink3, marginTop: 2 }}>{f.sub}</div>
                      </div>
                      {format === f.id && (
                        <div style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: $.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Range */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3, marginBottom: 12 }}>
                  Zakres czasowy
                </div>
                <div className="pills-row" role="group" aria-label="Zakres czasowy">
                  {[...TIME_RANGES].map(tr => (
                    <button key={tr.id} className={`pill${range === tr.id ? " on" : ""}`}
                      onClick={() => setRange(tr.id)} aria-pressed={range === tr.id}>
                      {tr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary row */}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", padding: "16px 20px", background: "rgba(255,255,255,0.45)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.6)" }}>
                {[
                  { l: "Wierszy CSV",    v: (format === "items" ? allItems.length : filtered.length).toLocaleString("pl-PL") },
                  { l: "Kolumn",         v: format === "items" ? "9" : "5" },
                  { l: "Łącznie",        v: `${totalSpent.toFixed(2)} zł` },
                  { l: "Zaoszczędzono",  v: `${totalSaved.toFixed(2)} zł` },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: $.ink3 }}>{s.l}</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: $.ink0, marginTop: 4 }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Download button */}
              <button
                className="btn-primary"
                onClick={downloadCSV}
                disabled={!filtered.length}
                style={{ alignSelf: "flex-start", gap: 10, opacity: filtered.length ? 1 : 0.4 }}
                aria-label="Pobierz plik CSV"
              >
                {exported ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8.5L5.5 12L14 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Pobrano!
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v9M3.5 7l4 4 4-4M2 13h11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Pobierz CSV
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Preview table ── */}
          {previewRows.length > 0 && (
            <div className="au1">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3, marginBottom: 12 }}>
                Podgląd · pierwsze {previewRows.length} wierszy
              </div>
              <div className="card tbl-wrap">
                <table className="tbl" aria-label="Podgląd eksportu">
                  <thead>
                    <tr>
                      {format === "items"
                        ? ["Produkt","Kategoria","Sklep","Data","Razem"].map((h,i) => (
                            <th key={h} scope="col" style={{ textAlign: i >= 4 ? "right" : "left" }}>{h}</th>
                          ))
                        : ["Sklep","Data","Pozycji","Łącznie","Zaoszcz."].map((h,i) => (
                            <th key={h} scope="col" style={{ textAlign: i >= 2 ? "right" : "left" }}>{h}</th>
                          ))
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {format === "items"
                      ? (previewRows).map((it, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{it.name}</td>
                            <td><CatChip cat={it.category} /></td>
                            <td style={{ color: $.ink2 }}>{it.store || "—"}</td>
                            <td className="mono" style={{ color: $.ink3, fontSize: 12 }}>{it.date || "—"}</td>
                            <td style={{ textAlign: "right" }}><Zl v={it.total_price} /></td>
                          </tr>
                        ))
                      : (previewRows).map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{r.store || "—"}</td>
                            <td className="mono" style={{ color: $.ink3, fontSize: 12 }}>{r.date || "—"}</td>
                            <td className="mono" style={{ textAlign: "right", color: $.ink2 }}>{(r.items || []).length}</td>
                            <td style={{ textAlign: "right" }}><Zl v={r.total} /></td>
                            <td style={{ textAlign: "right" }}>
                              {parseFloat(r.total_discounts || 0) > 0
                                ? <span className="mono" style={{ color: $.red, fontWeight: 600, fontSize: 13 }}>−{parseFloat(r.total_discounts).toFixed(2)}</span>
                                : <span style={{ color: $.ink3 }}>—</span>}
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
                {(format === "items" ? allItems.length : filtered.length) > 6 && (
                  <div style={{ padding: "11px 20px", fontSize: 12, color: $.ink3, borderTop: "1px solid rgba(255,255,255,0.40)", background: "rgba(255,255,255,0.30)" }}>
                    + {(format === "items" ? allItems.length : filtered.length) - 6} więcej wierszy w pliku CSV
                  </div>
                )}
              </div>
            </div>
          )}

          {!filtered.length && (
            <Empty icon="📂" title="Brak danych do eksportu" sub="Dodaj paragony, aby móc eksportować dane" />
          )}

        </div>
      </div>
    </>
  );
}


/* ─── BudgetsView ────────────────────────────── */
function BudgetsView({ receipts, expenses = [], allItems = [], budgets, setBudgets, currency }) {
  const sym = FX_SYMBOLS[currency] || "zł";
  const [editing, setEditing] = useState(null); // cat being edited
  const [editVal, setEditVal] = useState("");

  // Current month spending per category
  const now = new Date();
  const monthItems = useMemo(() => {
    const receiptItems = receipts.flatMap(r => {
      const d = parseDate(r.date);
      if (!d || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return [];
      return (r.items || []).map(it => ({ ...it }));
    });
    const manualItems = expenses
      .filter(e => {
        const d = parseDate(e.date);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .map(e => ({ name: e.name, total_price: e.amount, category: e.category }));
    return [...receiptItems, ...manualItems];
  }, [receipts, expenses]);

  const spending = useMemo(() => {
    const map = {};
    monthItems.forEach(it => {
      const cat = it.category || "Inne";
      map[cat] = (map[cat] || 0) + (parseFloat(it.total_price) || 0);
    });
    return map;
  }, [monthItems]);

  const allCats = Object.keys(CATS);
  const activeCats = allCats.filter(c => spending[c] || budgets[c]);
  const totalBudget = Object.values(budgets).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalSpent  = Object.values(spending).reduce((s, v) => s + v, 0);

  const saveEdit = (cat) => {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v > 0) {
      setBudgets(b => ({ ...b, [cat]: v }));
    } else if (editVal === "" || v === 0) {
      setBudgets(b => { const n = { ...b }; delete n[cat]; return n; });
    }
    setEditing(null); setEditVal("");
  };

  const monthName = now.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Budżety <span>miesięczne</span></h1>
          <p className="page-subtitle au1">{monthName} · {activeCats.length} kategorii · {convertAmt(totalBudget, currency)} {sym} łącznie</p>
        </div>
      </div>
      <div className="container">
        <div className="section" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Summary */}
          {totalBudget > 0 && (
            <div className="stat-grid au" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { l: "Budżet łączny",  v: convertAmt(totalBudget, currency), u: sym, col: $.ink0 },
                { l: "Wydano (mies.)", v: convertAmt(totalSpent,  currency), u: sym, col: $.green },
                { l: "Pozostało",      v: convertAmt(Math.max(0, totalBudget - totalSpent), currency), u: sym,
                  col: totalSpent > totalBudget ? $.red : $.green },
              ].map(s => (
                <div className="stat-card" key={s.l}>
                  <div className="stat-label">{s.l}</div>
                  <div className="stat-val" style={{ color: s.col }}>
                    {s.v}<span style={{ fontSize: 15, color: $.ink3, marginLeft: 3 }}>{s.u}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Category budget rows */}
          <div className="card au1" style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 22px 8px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3 }}>
              Kategorie — kliknij aby ustawić limit
            </div>
            {allCats.map((cat, i) => {
              const spent   = spending[cat] || 0;
              const budget  = budgets[cat] || 0;
              const pct     = budget ? Math.min(100, (spent / budget) * 100) : 0;
              const over    = budget && spent > budget;
              const catCol  = CATS[cat] || "#9CA3AF";
              const isEditing = editing === cat;

              return (
                <div key={cat} style={{
                  padding: "14px 22px",
                  borderBottom: i < allCats.length - 1 ? "1px solid rgba(255,255,255,0.40)" : "none",
                  display: "flex", alignItems: "center", gap: 14,
                  background: over ? "rgba(217,48,37,0.04)" : "transparent",
                  transition: "background .2s",
                }}>
                  {/* Dot */}
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: catCol, flexShrink: 0 }} />

                  {/* Cat name */}
                  <div style={{ width: 110, fontWeight: 600, fontSize: 14, color: $.ink0, flexShrink: 0 }}>{cat}</div>

                  {/* Bar + amounts */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {budget > 0 ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span className="mono" style={{ fontSize: 12, color: over ? $.red : $.ink2, fontWeight: over ? 700 : 400 }}>
                            {convertAmt(spent, currency)} {sym}
                          </span>
                          <span className="mono" style={{ fontSize: 12, color: $.ink3 }}>
                            / {convertAmt(budget, currency)} {sym}
                          </span>
                        </div>
                        <div className="budget-bar-track">
                          <div className="budget-bar-fill" style={{
                            width: `${pct}%`,
                            background: over ? $.red : pct > 80 ? $.amber : catCol,
                          }} />
                        </div>
                        {over && (
                          <div style={{ fontSize: 11, color: $.red, fontWeight: 600, marginTop: 4 }}>
                            Przekroczono o {convertAmt(spent - budget, currency)} {sym}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: $.ink3 }}>
                        {spent > 0 ? `${convertAmt(spent, currency)} ${sym} wydano` : "Brak wydatków"}
                      </div>
                    )}
                  </div>

                  {/* Edit */}
                  {isEditing ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <input
                        autoFocus
                        className="field"
                        type="number"
                        min="0"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(cat); if (e.key === "Escape") { setEditing(null); setEditVal(""); }}}
                        placeholder="Limit zł"
                        style={{ width: 100, padding: "7px 10px", fontSize: 13, minHeight: 36 }}
                        aria-label={`Ustaw budżet dla ${cat}`}
                      />
                      <button className="btn-primary" onClick={() => saveEdit(cat)} style={{ padding: "0 12px", minHeight: 36, fontSize: 13 }}>✓</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditing(cat); setEditVal(budget ? String(budget) : ""); }}
                      style={{ flexShrink: 0, background: "none", border: `1.5px solid rgba(255,255,255,0.65)`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: $.ink2, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, transition: "all .15s", minHeight: 32 }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = catCol; e.currentTarget.style.color = catCol; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.65)"; e.currentTarget.style.color = $.ink2; }}
                      aria-label={`Edytuj budżet ${cat}`}
                    >
                      {budget > 0 ? "Zmień" : "+ Limit"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="au2" style={{ fontSize: 12, color: $.ink3, textAlign: "center" }}>
            Budżety są zapisane lokalnie w tej sesji · limity dotyczą bieżącego miesiąca
          </p>
        </div>
      </div>
    </>
  );
}

/* ─── RecurringView ──────────────────────────── */
const REC_CYCLES = ["Miesięcznie","Tygodniowo","Rocznie","Kwartalnie"];

function RecurringView({ recurring, setRecurring, currency }) {
  const sym = FX_SYMBOLS[currency] || "zł";
  const [form, setForm]   = useState({ name: "", amount: "", cycle: "Miesięcznie", category: "Subskrypcje", currency: "PLN" });
  const [adding, setAdding] = useState(false);

  const add = () => {
    if (!form.name.trim() || !parseFloat(form.amount)) return;
    setRecurring(r => [...r, { ...form, id: Date.now(), amount: parseFloat(form.amount) }]);
    setForm({ name: "", amount: "", cycle: "Miesięcznie", category: "Subskrypcje", currency: "PLN" });
    setAdding(false);
  };

  // Monthly equivalent
  const toMonthly = (item) => {
    const a = parseFloat(item.amount) || 0;
    const base = { "Miesięcznie": a, "Tygodniowo": a * 4.33, "Rocznie": a / 12, "Kwartalnie": a / 3 };
    return base[item.cycle] || a;
  };
  const totalMonthly = recurring.reduce((s, r) => s + toMonthly(r) * (FX[currency] || 1), 0);

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 className="page-title au">Cykliczne <span>wydatki</span></h1>
            <p className="page-subtitle au1">
              {recurring.length} pozycji · ~{(totalMonthly).toFixed(2)} {sym}/mies.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setAdding(a => !a)} aria-expanded={adding}>
            {adding ? "✕ Anuluj" : "+ Dodaj"}
          </button>
        </div>
      </div>
      <div className="container">
        <div className="section" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>

          {/* Add form */}
          {adding && (
            <div className="card au" style={{ padding: "22px 24px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3, marginBottom: 14 }}>Nowy cykliczny wydatek</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 2, minWidth: 160 }}>
                    <label htmlFor="rname" style={{ fontSize: 12, fontWeight: 600, color: $.ink2, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: ".04em" }}>Nazwa</label>
                    <input id="rname" className="field" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="np. Spotify, Siłownia…" onKeyDown={e => e.key === "Enter" && add()} />
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <label htmlFor="ramt" style={{ fontSize: 12, fontWeight: 600, color: $.ink2, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: ".04em" }}>Kwota (PLN)</label>
                    <input id="ramt" className="field" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="29.99" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: $.ink2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Cykl</div>
                    <div className="pills-row" role="group" aria-label="Cykl płatności">
                      {REC_CYCLES.map(c => (
                        <button key={c} className={`pill${form.cycle === c ? " on" : ""}`} onClick={() => setForm(f => ({...f, cycle: c}))} aria-pressed={form.cycle === c}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: $.ink2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Kategoria</div>
                    <div className="pills-row" role="group" aria-label="Kategoria">
                      {["Subskrypcje","Zdrowie","Dom","Rozrywka","Transport","Inne"].map(c => (
                        <button key={c} className={`pill${form.category === c ? " on" : ""}`} onClick={() => setForm(f => ({...f, category: c}))} aria-pressed={form.category === c}>{c}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <button className="btn-primary" onClick={add} style={{ alignSelf: "flex-start" }}>Zapisz wydatek</button>
              </div>
            </div>
          )}

          {/* Monthly summary */}
          {recurring.length > 0 && (
            <div className="stat-grid au" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { l: "Miesięcznie",  v: totalMonthly.toFixed(2),                              u: sym, col: $.ink0 },
                { l: "Rocznie",      v: (totalMonthly * 12).toFixed(2),                        u: sym, col: $.red  },
                { l: "Pozycji",      v: recurring.length,                                      u: "",  col: $.ink0 },
              ].map(s => (
                <div className="stat-card" key={s.l}>
                  <div className="stat-label">{s.l}</div>
                  <div className="stat-val" style={{ color: s.col }}>
                    {s.v}<span style={{ fontSize: 15, color: $.ink3, marginLeft: 3 }}>{s.u}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List */}
          {recurring.length === 0 && !adding ? (
            <div style={{ height: 20 }}><Empty icon="🔄" title="Brak cyklicznych wydatków" sub="Dodaj subskrypcje, abonament siłowni, czynsz — wszystko co płacisz regularnie" /></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recurring.map((item, i) => {
                const monthly = toMonthly(item) * (FX[currency] || 1);
                const catCol = CATS[item.category] || "#9CA3AF";
                const dispAmt = (parseFloat(item.amount) * (FX[currency] || 1)).toFixed(2);
                return (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: $.glass,
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.72)",
                    borderRadius: 16, padding: "16px 20px",
                    animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * .05}s both`,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  }}>
                    {/* Icon */}
                    <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: catCol + "18", border: `1px solid ${catCol}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {item.category === "Subskrypcje" ? "📱" : item.category === "Zdrowie" ? "💪" : item.category === "Dom" ? "🏠" : item.category === "Transport" ? "🚗" : item.category === "Rozrywka" ? "🎬" : "🔄"}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: $.ink0, letterSpacing: "-.01em" }}>{item.name}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                        <CatChip cat={item.category} />
                        <span className="rec-badge" style={{ background: catCol + "15", color: catCol, border: `1px solid ${catCol}25` }}>
                          🔄 {item.cycle}
                        </span>
                        {item.cycle !== "Miesięcznie" && (
                          <span style={{ fontSize: 11, color: $.ink3 }}>≈ {monthly.toFixed(2)} {sym}/mies.</span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: catCol, lineHeight: 1 }}>
                        {dispAmt}
                      </div>
                      <div style={{ fontSize: 11, color: $.ink3, marginTop: 2 }}>{sym} / {item.cycle.toLowerCase()}</div>
                    </div>

                    <button onClick={() => setRecurring(r => r.filter(x => x.id !== item.id))}
                      style={{ background: "none", border: "1.5px solid rgba(255,255,255,0.65)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: $.ink3, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s", flexShrink: 0 }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = $.red; e.currentTarget.style.color = $.red; e.currentTarget.style.background = $.redBg; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.65)"; e.currentTarget.style.color = $.ink3; e.currentTarget.style.background = "none"; }}
                      aria-label={`Usuń ${item.name}`}>×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── DashboardView ──────────────────────────── */
function DashboardView({ receipts, expenses = [], budgets, recurring, currency, go, allItems = [] }) {
  const sym = FX_SYMBOLS[currency] || "zł";
  const now = new Date();

  // allItems comes from App (merged receipts + manual)
  // This month — receipts
  const thisMonth = useMemo(() => receipts.filter(r => {
    const d = parseDate(r.date);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }), [receipts]);

  // This month — manual expenses
  const thisMonthExpenses = useMemo(() => expenses.filter(e => {
    const d = parseDate(e.date);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }), [expenses]);

  const monthReceiptSpent = thisMonth.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
  const monthExpenseSpent = thisMonthExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const monthSpent = monthReceiptSpent + monthExpenseSpent;
  const totalSpent = receipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0)
    + expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalSaved = receipts.reduce((s, r) => s + (parseFloat(r.total_discounts) || 0), 0);

  // Budget alerts
  const monthItems = useMemo(() => {
    const fromReceipts = thisMonth.flatMap(r => r.items || []);
    const fromExpenses = thisMonthExpenses.map(e => ({
      name: e.name, total_price: e.amount, category: e.category,
    }));
    return [...fromReceipts, ...fromExpenses];
  }, [thisMonth, thisMonthExpenses]);
  const monthSpending = useMemo(() => {
    const map = {};
    monthItems.forEach(it => { const c = it.category || "Inne"; map[c] = (map[c] || 0) + (parseFloat(it.total_price) || 0); });
    return map;
  }, [monthItems]);
  const alerts = Object.entries(budgets)
    .filter(([cat, bgt]) => monthSpending[cat] > bgt * 0.8)
    .map(([cat, bgt]) => ({ cat, spent: monthSpending[cat] || 0, budget: bgt, over: monthSpending[cat] > bgt }));

  // Monthly recurring total
  const toMonthly = item => {
    const a = parseFloat(item.amount) || 0;
    return { "Miesięcznie": a, "Tygodniowo": a * 4.33, "Rocznie": a / 12, "Kwartalnie": a / 3 }[item.cycle] || a;
  };
  const recurringMonthly = recurring.reduce((s, r) => s + toMonthly(r), 0);

  // Duplicates: items bought in 2+ stores, find price variance
  const duplicates = useMemo(() => {
    const nameMap = {};
    allItems.forEach(it => {
      if (!it.name) return;
      const key = it.name.toLowerCase().trim();
      if (!nameMap[key]) nameMap[key] = [];
      nameMap[key].push(it);
    });
    return Object.entries(nameMap)
      .filter(([, items]) => {
        const stores = new Set(items.map(i => i.store).filter(Boolean));
        return stores.size >= 2;
      })
      .map(([name, items]) => {
        const prices = items.map(i => parseFloat(i.unit_price || i.total_price) || 0).filter(p => p > 0);
        const minP = Math.min(...prices), maxP = Math.max(...prices);
        return { name, count: items.length, minP, maxP, savings: maxP - minP };
      })
      .filter(d => d.savings > 0.01)
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 5);
  }, [allItems]);

  // Recent receipts
  const recent = receipts.slice(0, 3);

  const monthName = now.toLocaleDateString("pl-PL", { month: "long" });

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Cześć! <span>MaszkaApp</span></h1>
          <p className="page-subtitle au1">
            {receipts.length ? `${receipts.length} paragonów · ${allItems.length} pozycji` : "Dodaj pierwszy paragon aby zacząć"}
          </p>
        </div>
      </div>

      <div className="container">
        <div className="section" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Main widgets ── */}
          <div className="widget-grid au">
            {/* This month */}
            <div className="widget">
              <div className="widget-label">Ten miesiąc</div>
              <div className="widget-big" style={{ color: $.green }}>
                {convertAmt(monthSpent, currency)}
                <span style={{ fontSize: 18, color: $.ink3, marginLeft: 6 }}>{sym}</span>
              </div>
              <div style={{ fontSize: 12, color: $.ink2, marginTop: 8 }}>
                {thisMonth.length} paragonów{thisMonthExpenses.length > 0 ? ` · ${thisMonthExpenses.length} wydatków` : ""} · {monthName}
              </div>
              <button onClick={() => go("stats")} style={{ marginTop: 12, background: "none", border: "none", color: $.green, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                Zobacz statystyki →
              </button>
            </div>

            {/* Total saved */}
            <div className="widget">
              <div className="widget-label">Zaoszczędzono</div>
              <div className="widget-big" style={{ color: $.red }}>
                {convertAmt(totalSaved, currency)}
                <span style={{ fontSize: 18, color: $.ink3, marginLeft: 6 }}>{sym}</span>
              </div>
              <div style={{ fontSize: 12, color: $.ink2, marginTop: 8 }}>
                dzięki rabatom i promocjom
              </div>
            </div>

            {/* Recurring */}
            <div className="widget">
              <div className="widget-label">Cykliczne / mies.</div>
              <div className="widget-big" style={{ color: $.ink0 }}>
                {convertAmt(recurringMonthly, currency)}
                <span style={{ fontSize: 18, color: $.ink3, marginLeft: 6 }}>{sym}</span>
              </div>
              <div style={{ fontSize: 12, color: $.ink2, marginTop: 8 }}>
                {recurring.length} aktywnych subskrypcji
              </div>
              <button onClick={() => go("recurring")} style={{ marginTop: 12, background: "none", border: "none", color: $.green, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                Zarządzaj →
              </button>
            </div>

            {/* All time */}
            <div className="widget">
              <div className="widget-label">Łącznie wydano</div>
              <div className="widget-big" style={{ color: $.ink0 }}>
                {convertAmt(totalSpent, currency)}
                <span style={{ fontSize: 18, color: $.ink3, marginLeft: 6 }}>{sym}</span>
              </div>
              <div style={{ fontSize: 12, color: $.ink2, marginTop: 8 }}>
                ze {receipts.length} paragonów
              </div>
            </div>
          </div>

          {/* ── Budget alerts ── */}
          {alerts.length > 0 && (
            <div className="au1">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3, marginBottom: 12 }}>Alerty budżetowe</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alerts.map(a => (
                  <div key={a.cat} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 20px", borderRadius: 14,
                    background: a.over ? $.redBg : $.amberBg,
                    border: `1px solid ${a.over ? $.redRim : "rgba(217,119,6,0.22)"}`,
                  }}>
                    <span style={{ fontSize: 20 }}>{a.over ? "🔴" : "🟡"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: a.over ? $.red : $.amber }}>
                        {a.cat} — {a.over ? "Przekroczono limit!" : "Zbliżasz się do limitu"}
                      </div>
                      <div style={{ fontSize: 12, color: $.ink2, marginTop: 2 }}>
                        {convertAmt(a.spent, currency)} {sym} z {convertAmt(a.budget, currency)} {sym}
                        {" "}({(a.spent / a.budget * 100).toFixed(0)}%)
                      </div>
                    </div>
                    <button onClick={() => go("budgets")} style={{ background: "none", border: `1.5px solid rgba(255,255,255,0.65)`, borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", color: $.ink2, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600 }}>
                      Budżety
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Smart savings (duplicates) ── */}
          {duplicates.length > 0 && (
            <div className="au2">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3, marginBottom: 12 }}>Gdzie kupisz taniej</div>
              <div className="card" style={{ overflow: "hidden" }}>
                {duplicates.map((d, i) => (
                  <div key={d.name} style={{
                    padding: "13px 20px",
                    borderBottom: i < duplicates.length - 1 ? "1px solid rgba(255,255,255,0.40)" : "none",
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: $.greenBg, border: `1px solid ${$.greenRim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💡</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: $.ink0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: $.ink2, marginTop: 2 }}>
                        Cena od <span className="mono">{convertAmt(d.minP, currency)} {sym}</span> do <span className="mono">{convertAmt(d.maxP, currency)} {sym}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: $.green }}>
                        -{convertAmt(d.savings, currency)} {sym}
                      </div>
                      <div style={{ fontSize: 11, color: $.ink3 }}>możliwa oszczędność</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent receipts ── */}
          {recent.length > 0 && (
            <div className="au3">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: $.ink3 }}>Ostatnie paragony</div>
                <button onClick={() => go("receipts")} style={{ background: "none", border: "none", color: $.green, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Wszystkie →</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recent.map(r => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: $.glass, backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)",
                    border: "1px solid rgba(255,255,255,0.72)", borderRadius: 14, padding: "13px 18px",
                  }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: $.greenBg, border: `1px solid ${$.greenRim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🧾</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: $.ink0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.store || "Paragon"}</div>
                      <div style={{ fontSize: 12, color: $.ink3 }}>{r.date || "—"} · {(r.items || []).length} pozycji</div>
                    </div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 500, color: $.green, flexShrink: 0 }}>
                      {convertAmt(r.total || 0, currency)} {sym}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty CTA */}
          {receipts.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-.03em", color: $.ink0, marginBottom: 8 }}>Zacznij od paragonu</div>
              <div style={{ color: $.ink2, fontSize: 14, marginBottom: 20, lineHeight: 1.65 }}>Dodaj swój pierwszy paragon — Claude automatycznie odczyta produkty, ceny i kategorie.</div>
              <button className="btn-primary" onClick={() => go("receipts")}>
                📸 Skanuj paragon
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}


/* ─── InflationView ──────────────────────────── */
function SparkLine({ points, color, width=120, height=36 }) {
  if (!points || points.length < 2) return null;
  const minV = Math.min(...points), maxV = Math.max(...points);
  const range = maxV - minV || 1;
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((v - minV) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transition: "all .5s" }} />
      <circle cx={pts.split(" ").at(-1).split(",")[0]} cy={pts.split(" ").at(-1).split(",")[1]}
        r="3" fill={color} />
    </svg>
  );
}

function InflationView({ receipts, currency }) {
  const sym = FX_SYMBOLS[currency] || "zł";
  const [minOccurrences, setMin] = useState(2);
  const [q, setQ] = useState("");

  // Group items by name + date, track unit_price over time
  const priceHistory = useMemo(() => {
    const map = {};
    receipts.forEach(r => {
      const d = parseDate(r.date);
      if (!d) return;
      const dateKey = r.date;
      (r.items || []).forEach(it => {
        if (!it.name) return;
        const key = it.name.toLowerCase().trim();
        if (!map[key]) map[key] = { name: it.name, entries: [] };
        const price = parseFloat(it.unit_price || it.total_price) || 0;
        if (price > 0) map[key].entries.push({ date: d, dateKey, price, store: r.store });
      });
    });
    return Object.values(map)
      .filter(p => p.entries.length >= minOccurrences)
      .map(p => {
        const sorted = [...p.entries].sort((a, b) => a.date - b.date);
        const prices  = sorted.map(e => e.price);
        const first   = prices[0], last = prices[prices.length - 1];
        const change  = first > 0 ? ((last - first) / first) * 100 : 0;
        return { ...p, sorted, prices, first, last, change };
      })
      .filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [receipts, minOccurrences, q]);

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Inflacja <span>cenowa</span></h1>
          <p className="page-subtitle au1">Jak zmieniają się ceny tych samych produktów w czasie</p>
        </div>
      </div>
      <div className="container">
        <div className="section" style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Filters */}
          <div className="au" style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
            <div style={{ flex:1, minWidth:180 }}>
              <input className="field" value={q} onChange={e => setQ(e.target.value)} placeholder="Szukaj produktu…" />
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ fontSize:12, color:$.ink2, fontWeight:600, whiteSpace:"nowrap" }}>Min. zakupów:</span>
              {[2,3,5].map(n => (
                <button key={n} className={`pill${minOccurrences === n ? " on" : ""}`}
                  onClick={() => setMin(n)} style={{ padding:"6px 12px" }}>{n}+</button>
              ))}
            </div>
          </div>

          {priceHistory.length === 0 ? (
            <Empty icon="📈" title="Za mało danych"
              sub={`Potrzebujesz co najmniej ${minOccurrences} zakupów tego samego produktu w różnych datach`} />
          ) : (
            <div className="card au1" style={{ overflow:"hidden" }}>
              <div className="tbl-wrap">
                <table className="tbl" aria-label="Zmiany cen produktów">
                  <thead>
                    <tr>
                      <th scope="col" style={{ textAlign:"left" }}>Produkt</th>
                      <th scope="col" style={{ textAlign:"right" }}>Pierwsza cena</th>
                      <th scope="col" style={{ textAlign:"right" }}>Ostatnia cena</th>
                      <th scope="col" style={{ textAlign:"right" }}>Zmiana</th>
                      <th scope="col" style={{ textAlign:"center" }}>Trend</th>
                      <th scope="col" style={{ textAlign:"right" }}>Zakupów</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.slice(0, 40).map((p, i) => {
                      const up    = p.change > 0.5;
                      const down  = p.change < -0.5;
                      const color = up ? $.red : down ? $.green : $.ink3;
                      const arrow = up ? "↑" : down ? "↓" : "→";
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight:600 }}>{p.name}</td>
                          <td style={{ textAlign:"right" }}>
                            <Zl v={p.first} />
                          </td>
                          <td style={{ textAlign:"right" }}>
                            <span className="mono" style={{ fontWeight: up||down ? 700:400, color }}>{(p.last*(FX[currency]||1)).toFixed(2)} {sym}</span>
                          </td>
                          <td style={{ textAlign:"right" }}>
                            <span className="mono" style={{ fontSize:13, fontWeight:700, color }}>
                              {arrow} {Math.abs(p.change).toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ textAlign:"center", padding:"8px 12px" }}>
                            <SparkLine points={p.prices} color={color} width={100} height={28} />
                          </td>
                          <td style={{ textAlign:"right" }} className="mono">
                            <span style={{ color:$.ink3, fontSize:12 }}>{p.entries.length}×</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="au2" style={{ fontSize:12, color:$.ink3, textAlign:"center" }}>
            Porównanie ceny jednostkowej pierwszego i ostatniego zakupu tego samego produktu
          </p>
        </div>
      </div>
    </>
  );
}

/* ─── PredictionView ─────────────────────────── */
function PredictionView({ receipts, currency }) {
  const sym = FX_SYMBOLS[currency] || "zł";

  // Build last 6 months of data
  const monthlyData = useMemo(() => {
    const map = {};
    receipts.forEach(r => {
      const d = parseDate(r.date);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      map[key] = (map[key]||0) + (parseFloat(r.total)||0);
    });
    const sorted = Object.entries(map).sort(([a],[b]) => a.localeCompare(b));
    const MONTH_NAMES = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
    return sorted.map(([key, total]) => {
      const [y, m] = key.split("-");
      return { key, label: MONTH_NAMES[parseInt(m,10)-1] + " '" + y.slice(2), total };
    });
  }, [receipts]);

  // Simple linear regression on last months
  const prediction = useMemo(() => {
    const data = monthlyData.slice(-6);
    if (data.length < 2) return null;
    const n = data.length;
    const xs = data.map((_, i) => i);
    const ys = data.map(d => d.total);
    const sumX  = xs.reduce((s,x) => s+x, 0);
    const sumY  = ys.reduce((s,y) => s+y, 0);
    const sumXY = xs.reduce((s,x,i) => s+x*ys[i], 0);
    const sumX2 = xs.reduce((s,x) => s+x*x, 0);
    const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
    const intercept = (sumY - slope*sumX) / n;
    const predicted = slope * n + intercept;
    const avg = sumY / n;
    const trend = slope > avg * 0.03 ? "rosnący" : slope < -avg * 0.03 ? "malejący" : "stabilny";
    const trendColor = slope > avg * 0.03 ? $.red : slope < -avg * 0.03 ? $.green : $.ink2;
    return { predicted: Math.max(0, predicted), avg, slope, trend, trendColor, data };
  }, [monthlyData]);

  // Category breakdown prediction
  const catPrediction = useMemo(() => {
    if (monthlyData.length < 2) return [];
    const recentMonths = 2;
    const cutoff = monthlyData.slice(-recentMonths);
    const keys = new Set(cutoff.map(m => m.key));
    const recentItems = receipts.flatMap(r => {
      const d = parseDate(r.date);
      if (!d) return [];
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!keys.has(key)) return [];
      return (r.items||[]).map(it => ({ ...it }));
    });
    const catMap = {};
    recentItems.forEach(it => {
      const cat = it.category || "Inne";
      catMap[cat] = (catMap[cat]||0) + (parseFloat(it.total_price)||0);
    });
    const total = Object.values(catMap).reduce((s,v)=>s+v,0);
    return Object.entries(catMap)
      .map(([cat, v]) => ({ cat, v: v/recentMonths, pct: total ? v/total*100 : 0, color: CATS[cat]||"#9CA3AF" }))
      .sort((a,b) => b.v - a.v)
      .slice(0, 8);
  }, [receipts, monthlyData]);

  const maxBar = monthlyData.length ? Math.max(...monthlyData.slice(-6).map(m=>m.total), prediction?.predicted||0, 1) : 1;
  const MONTH_NAMES = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
  const nextMonth = MONTH_NAMES[(new Date().getMonth()+1) % 12];

  if (monthlyData.length < 2) return (
    <>
      <div className="page-hero"><div className="page-hero-inner">
        <h1 className="page-title au">Predykcja <span>wydatków</span></h1>
        <p className="page-subtitle">Potrzebujesz co najmniej 2 miesięcy danych</p>
      </div></div>
      <div className="container">
        <Empty icon="🔮" title="Za mało danych" sub="Dodaj paragony z co najmniej 2 różnych miesięcy aby zobaczyć prognozę" />
      </div>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Predykcja <span>wydatków</span></h1>
          <p className="page-subtitle au1">Prognoza na {nextMonth} na podstawie Twoich danych</p>
        </div>
      </div>
      <div className="container">
        <div className="section" style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Hero prediction card */}
          {prediction && (
            <div className="card au" style={{ padding:"32px 28px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(6,193,103,0.06)", pointerEvents:"none" }} />
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:$.ink3, marginBottom:12 }}>
                Prognozowane wydatki — {nextMonth}
              </div>
              <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:"clamp(40px,6vw,64px)", fontWeight:800, letterSpacing:"-.05em", color:$.ink0, lineHeight:1, marginBottom:12 }}>
                {convertAmt(prediction.predicted, currency)}
                <span style={{ fontSize:24, color:$.ink3, marginLeft:8 }}>{sym}</span>
              </div>
              <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:11, color:$.ink3, fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" }}>Trend</div>
                  <div style={{ fontSize:16, fontWeight:700, color:prediction.trendColor, marginTop:4 }}>
                    {prediction.trend === "rosnący" ? "↑" : prediction.trend === "malejący" ? "↓" : "→"} {prediction.trend}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:$.ink3, fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" }}>Średnia miesięczna</div>
                  <div className="mono" style={{ fontSize:16, fontWeight:700, color:$.ink0, marginTop:4 }}>
                    {convertAmt(prediction.avg, currency)} {sym}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:$.ink3, fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" }}>Zmiana vs śr.</div>
                  <div className="mono" style={{ fontSize:16, fontWeight:700, color: prediction.predicted > prediction.avg ? $.red : $.green, marginTop:4 }}>
                    {prediction.predicted > prediction.avg ? "+" : ""}{convertAmt(prediction.predicted - prediction.avg, currency)} {sym}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bar chart - history + prediction */}
          <div className="card au1" style={{ padding:"24px" }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:$.ink3, marginBottom:20 }}>
              Historia + prognoza
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:120 }}>
              {monthlyData.slice(-6).map((m, i) => {
                const h = Math.max(8, (m.total / maxBar) * 100);
                return (
                  <div key={m.key} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <span className="mono" style={{ fontSize:10, color:$.ink3 }}>{convertAmt(m.total, currency)}</span>
                    <div style={{ width:"100%", height:h, background:"rgba(6,193,103,0.25)", borderRadius:"6px 6px 0 0",
                      transition:`height .7s cubic-bezier(.16,1,.3,1) ${i*.05}s` }} />
                    <span style={{ fontSize:10, color:$.ink3, fontWeight:600 }}>{m.label}</span>
                  </div>
                );
              })}
              {/* Prediction bar */}
              {prediction && (
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <span className="mono" style={{ fontSize:10, color:$.green, fontWeight:700 }}>{convertAmt(prediction.predicted, currency)}</span>
                  <div style={{ width:"100%", height: Math.max(8,(prediction.predicted/maxBar)*100),
                    background:$.green, borderRadius:"6px 6px 0 0", opacity:0.7,
                    border:`2px dashed ${$.green}`, boxSizing:"border-box",
                    transition:"height .7s cubic-bezier(.16,1,.3,1) .35s" }} />
                  <span style={{ fontSize:10, color:$.green, fontWeight:700 }}>{nextMonth} ✦</span>
                </div>
              )}
            </div>
          </div>

          {/* Category breakdown */}
          {catPrediction.length > 0 && (
            <div className="card au2" style={{ padding:"24px 24px" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:$.ink3, marginBottom:16 }}>
                Prognoza per kategoria (śr. ostatnie 2 mies.)
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {catPrediction.map(cp => (
                  <div key={cp.cat} style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:cp.color, flexShrink:0 }} />
                    <div style={{ width:100, fontSize:13, fontWeight:500, color:$.ink0 }}>{cp.cat}</div>
                    <div style={{ flex:1, height:4, borderRadius:2, background:"rgba(0,0,0,0.06)", overflow:"hidden" }}>
                      <div style={{ width:`${cp.pct}%`, height:"100%", background:cp.color, borderRadius:2, transition:"width .8s cubic-bezier(.16,1,.3,1)" }} />
                    </div>
                    <span className="mono" style={{ fontSize:12, color:$.ink2, width:80, textAlign:"right", flexShrink:0 }}>
                      {convertAmt(cp.v, currency)} {sym}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize:12, color:$.ink3, textAlign:"center" }}>
            Prognoza oparta na regresji liniowej z ostatnich {Math.min(6, monthlyData.length)} miesięcy
          </p>
        </div>
      </div>
    </>
  );
}


/* ─── Onboarding Overlay ─────────────────────── */
const ONBOARD_STEPS = [
  { icon:"📸", title:"Skanuj paragon", desc:"Dodaj zdjęcie paragonu — Claude automatycznie odczyta produkty, ceny i rabaty." },
  { icon:"📊", title:"Analizuj wydatki", desc:"Wykresy, statystyki, porównanie sklepów i inflacja cenowa w jednym miejscu." },
  { icon:"💰", title:"Kontroluj budżet", desc:"Ustaw limity per kategorię i śledź cykliczne wydatki jak subskrypcje." },
  { icon:"🔮", title:"Przewiduj przyszłość", desc:"AI prognozuje Twoje wydatki i sugeruje tygodniowy plan posiłków." },
];

function OnboardingOverlay({ onDone, darkMode }) {
  const [step, setStep] = useState(0);
  const current = ONBOARD_STEPS[step];
  const isLast  = step === ONBOARD_STEPS.length - 1;

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" aria-label="Witaj w MaszkaApp">
      <div className="onboard-card">
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:32 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:"#06C167" }} />
          <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:16, fontWeight:700, letterSpacing:"-.02em", color:"#1D1D1F" }}>MaszkaApp</span>
          <span style={{ marginLeft:"auto", fontSize:11, color:"#AEAEB2", fontWeight:600 }}>{step+1} / {ONBOARD_STEPS.length}</span>
        </div>

        {/* Step icon */}
        <div style={{ fontSize:56, marginBottom:20, display:"flex", justifyContent:"center",
          animation:"fadeUp .4s cubic-bezier(.16,1,.3,1) both" }} key={step}>
          {current.icon}
        </div>

        {/* Title */}
        <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, fontWeight:800,
          letterSpacing:"-.04em", color:"#1D1D1F", textAlign:"center", marginBottom:12,
          animation:"fadeUp .4s cubic-bezier(.16,1,.3,1) .05s both" }} key={step+"t"}>
          {current.title}
        </div>

        {/* Desc */}
        <div style={{ fontSize:15, color:"#6E6E73", textAlign:"center", lineHeight:1.65, marginBottom:32,
          animation:"fadeUp .4s cubic-bezier(.16,1,.3,1) .10s both" }} key={step+"d"}>
          {current.desc}
        </div>

        {/* Dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:28 }}>
          {ONBOARD_STEPS.map((_,i) => (
            <button key={i} onClick={() => setStep(i)} aria-label={`Krok ${i+1}`}
              style={{ width: i===step ? 22:8, height:8, borderRadius:99,
                background: i===step ? "#06C167":"rgba(0,0,0,0.12)",
                border:"none", cursor:"pointer", transition:"all .3s cubic-bezier(.16,1,.3,1)", padding:0 }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", gap:10 }}>
          {!isLast ? (
            <>
              <button onClick={onDone}
                style={{ flex:1, background:"none", border:"1.5px solid rgba(0,0,0,0.12)", borderRadius:12,
                  padding:"12px", cursor:"pointer", fontSize:14, color:"#6E6E73", fontFamily:"'Plus Jakarta Sans',sans-serif",
                  fontWeight:600, transition:"all .15s" }}>
                Pomiń
              </button>
              <button onClick={() => setStep(s => s+1)}
                className="btn-primary" style={{ flex:2, justifyContent:"center" }}>
                Dalej →
              </button>
            </>
          ) : (
            <button onClick={onDone} className="btn-primary" style={{ flex:1, justifyContent:"center", fontSize:16 }}>
              ✦ Zaczynamy!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


/* ─── QuickAddExpense ────────────────────────── */
const EXPENSE_TYPES = [
  { id: "one-time",  label: "Jednorazowy",  icon: "🛒", sub: "zakup, sprzęt, usługa" },
  { id: "recurring", label: "Cykliczny",    icon: "🔄", sub: "subskrypcja, abonament" },
];

function QuickAddExpense({ onAdd, onClose, onTextReceipt, apiKey, onNeedKey }) {
  const [type,     setType]     = useState("one-time");
  const [name,     setName]     = useState("");
  const [amount,   setAmount]   = useState("");
  const [category, setCategory] = useState("Inne");
  const [date,     setDate]     = useState(new Date().toISOString().slice(0,10));
  const [store,    setStore]    = useState("");
  const [note,     setNote]     = useState("");
  const [cycle,    setCycle]    = useState("Miesięcznie");
  const [catGroup, setCatGroup] = useState("Jednorazowe");
  const [textMode, setTextMode] = useState(false);
  const [textVal,  setTextVal]  = useState("");
  const nameRef = useRef();
  const textRef = useRef();

  useEffect(() => {
    if (textMode) textRef.current?.focus();
    else nameRef.current?.focus();
  }, [textMode]);

  // Close on overlay click
  const overlayRef = useRef();

  const submit = () => {
    if (!name.trim() || !parseFloat(amount)) return;
    haptic(20);
    onAdd({
      id:       Date.now() + Math.random(),
      name:     name.trim(),
      amount:   parseFloat(amount),
      category,
      date,
      store:    store.trim(),
      note:     note.trim(),
      type,
      cycle:    type === "recurring" ? cycle : null,
      source:   "manual",
    });
    onClose();
  };

  const allCatGroups = Object.entries(CAT_GROUPS);

  return (
    <div className="qa-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      role="dialog" aria-modal="true" aria-label="Dodaj wydatek">
      <div className="qa-drawer">
        <div className="qa-handle" aria-hidden="true" />
        <div className="qa-head">
          <div className="qa-title">{textMode ? "Wpisz listę" : "Dodaj wydatek"}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button onClick={() => setTextMode(m => !m)}
              style={{ background:textMode ? $.greenBg : "rgba(0,0,0,0.04)", border:`1px solid ${textMode ? $.greenRim : "rgba(0,0,0,0.08)"}`,
                borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:700, cursor:"pointer",
                color:textMode ? "#05964E" : $.ink2, fontFamily:"'Plus Jakarta Sans',sans-serif",
                minHeight:32, display:"inline-flex", alignItems:"center", gap:4, transition:"all .15s" }}>
              {textMode ? "Formularz" : "Wpisz listę"}
            </button>
            <button onClick={onClose} aria-label="Zamknij"
              style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:$.ink3, padding:"4px 8px", borderRadius:8 }}>✕</button>
          </div>
        </div>
        <div className="qa-body">

          {textMode ? (
            <>
              <div style={{ fontSize:13, color:$.ink2, marginBottom:12, lineHeight:1.6 }}>
                Wpisz produkty — każdy w nowej linii. AI odczyta nazwy, ilości i ceny.
              </div>
              <textarea ref={textRef} className="field" value={textVal} onChange={e => setTextVal(e.target.value)}
                placeholder={"mleko 2zł\n2kg ziemniaków 6zł\n3 jogurty greckie activia\nchleb razowy 5.50\nmasło extra 200g 8.99zł"}
                style={{ width:"100%", minHeight:200, resize:"vertical", fontFamily:"'Plus Jakarta Sans',sans-serif",
                  fontSize:14, lineHeight:1.7, padding:"12px 14px", boxSizing:"border-box" }} />
              <button className="btn-primary" onClick={() => {
                  if (!textVal.trim()) return;
                  if (!apiKey) { onNeedKey(); return; }
                  haptic(20);
                  onTextReceipt(textVal.trim());
                }}
                disabled={!textVal.trim()}
                style={{ width:"100%", justifyContent:"center", minHeight:52, fontSize:16, marginTop:14,
                  opacity: textVal.trim() ? 1 : 0.4 }}
                aria-label="Analizuj z AI">
                Analizuj z AI
              </button>
            </>
          ) : (
            <>
              {/* Type */}
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:$.ink3, marginBottom:10 }}>Rodzaj</div>
              <div className="type-row">
                {EXPENSE_TYPES.map(t => (
                  <button key={t.id} className={`type-btn${type === t.id ? " on" : ""}`}
                    onClick={() => setType(t.id)} aria-pressed={type === t.id}>
                    <div className="tb-icon">{t.icon}</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:type===t.id ? $.green : $.ink0, letterSpacing:"-.01em" }}>{t.label}</div>
                      <div style={{ fontSize:11, color:$.ink3, marginTop:1 }}>{t.sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Name + amount row */}
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:2, minWidth:0 }}>
                  <label htmlFor="qa-name" style={{ fontSize:11, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:$.ink3, marginBottom:6, display:"block" }}>Nazwa</label>
                  <input id="qa-name" ref={nameRef} className="field" value={name}
                    onChange={e => setName(e.target.value)} onKeyDown={e => e.key==="Enter" && submit()}
                    placeholder="np. Młotek, Spotify, Pralka…" />
                </div>
                <div style={{ flex:1, minWidth:90 }}>
                  <label htmlFor="qa-amt" style={{ fontSize:11, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:$.ink3, marginBottom:6, display:"block" }}>Kwota (PLN)</label>
                  <input id="qa-amt" className="field" type="number" min="0" step="0.01"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && submit()} placeholder="0.00" style={{ textAlign:"right" }} />
                </div>
              </div>

              {/* Cycle (only for recurring) */}
              {type === "recurring" && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:$.ink3, marginBottom:8 }}>Cykl płatności</div>
                  <div className="pills-row" role="group" aria-label="Cykl">
                    {REC_CYCLES.map(c => (
                      <button key={c} className={`pill${cycle===c?" on":""}`} onClick={() => setCycle(c)} aria-pressed={cycle===c}>{c}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:$.ink3, marginBottom:8 }}>Kategoria</div>
                {/* Group tabs */}
                <div className="pills-row" style={{ marginBottom:10 }} role="group" aria-label="Grupa kategorii">
                  {allCatGroups.map(([grp]) => (
                    <button key={grp} className={`pill${catGroup===grp?" on":""}`} onClick={() => setCatGroup(grp)} aria-pressed={catGroup===grp}>{grp}</button>
                  ))}
                </div>
                {/* Cat grid */}
                <div className="cat-grid" role="group" aria-label="Wybierz kategorię">
                  {(CAT_GROUPS[catGroup] || []).map(cat => (
                    <button key={cat} className={`cat-tile${category===cat?" on":""}`}
                      onClick={() => setCategory(cat)} aria-pressed={category===cat} aria-label={cat}>
                      {CAT_ICONS[cat] || "📦"}
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + store row */}
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1 }}>
                  <label htmlFor="qa-date" style={{ fontSize:11, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:$.ink3, marginBottom:6, display:"block" }}>Data</label>
                  <input id="qa-date" className="field" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div style={{ flex:1 }}>
                  <label htmlFor="qa-store" style={{ fontSize:11, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:$.ink3, marginBottom:6, display:"block" }}>Sklep / źródło</label>
                  <input id="qa-store" className="field" value={store} onChange={e => setStore(e.target.value)} placeholder="np. Leroy Merlin, Amazon…" />
                </div>
              </div>

              {/* Note */}
              <div style={{ marginBottom:20 }}>
                <label htmlFor="qa-note" style={{ fontSize:11, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:$.ink3, marginBottom:6, display:"block" }}>Notatka (opcjonalnie)</label>
                <input id="qa-note" className="field" value={note} onChange={e => setNote(e.target.value)} placeholder="Do czego służy, gdzie kupiłeś…" />
              </div>

              {/* Submit */}
              <button className="btn-primary" onClick={submit}
                disabled={!name.trim() || !parseFloat(amount)}
                style={{ width:"100%", justifyContent:"center", minHeight:52, fontSize:16, opacity: name.trim() && parseFloat(amount) ? 1 : 0.4 }}
                aria-label="Dodaj wydatek">
                {type==="recurring" ? "🔄 Dodaj cykliczny" : "✦ Dodaj wydatek"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── ExpensesView (unified manual + receipts) ── */
function ExpensesView({ expenses, receipts, onDelete, currency }) {
  const sym = FX_SYMBOLS[currency] || "zł";
  const [q,   setQ]   = useState("");
  const [cat, setCat] = useState("All");
  const [src, setSrc] = useState("All"); // All | manual | receipt
  const [sort,setSort] = useState("date"); // date | amount | name

  // Merge manual expenses + receipt items
  const allItems = useMemo(() => [
    ...expenses.map(e => ({
      id: e.id, name: e.name, total_price: e.amount, category: e.category,
      date: e.date, store: e.store, note: e.note, source: "manual", type: e.type,
      unit_price: null, quantity: null, discount: null,
    })),
    ...receipts.flatMap(r =>
      (r.items || []).map(it => ({
        ...it, store: r.store, date: r.date, source: "receipt", type: "one-time", note: null,
      }))
    ),
  ], [expenses, receipts]);

  const cats = useMemo(() => [...new Set(allItems.map(i => i.category).filter(Boolean))], [allItems]);

  const list = useMemo(() => {
    let out = allItems.filter(i =>
      (i.name || "").toLowerCase().includes(q.toLowerCase()) &&
      (cat === "All" || i.category === cat) &&
      (src === "All" || i.source === src)
    );
    if (sort === "date") out = [...out].sort((a,b) => (b.date||"").localeCompare(a.date||""));
    if (sort === "amount") out = [...out].sort((a,b) => (parseFloat(b.total_price)||0) - (parseFloat(a.total_price)||0));
    if (sort === "name") out = [...out].sort((a,b) => (a.name||"").localeCompare(b.name||""));
    return out;
  }, [allItems, q, cat, src, sort]);

  const totalManual  = expenses.reduce((s,e) => s + e.amount, 0);
  const totalReceipt = receipts.reduce((s,r) => s + (parseFloat(r.total)||0), 0);
  const totalAll     = totalManual + totalReceipt;

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Wszystkie <span>wydatki</span></h1>
          <p className="page-subtitle au1">{allItems.length} pozycji · {convertAmt(totalAll, currency)} {sym} łącznie</p>
        </div>
      </div>
      <div className="container">
        <div className="section" style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Stats */}
          <div className="stat-grid au" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[
              { l:"Łącznie",      v:convertAmt(totalAll,    currency), u:sym, col:$.ink0  },
              { l:"Ręcznie",      v:convertAmt(totalManual, currency), u:sym, col:$.green },
              { l:"Z paragonów",  v:convertAmt(totalReceipt,currency), u:sym, col:"#3B82F6" },
            ].map(s => (
              <div className="stat-card" key={s.l}>
                <div className="stat-label">{s.l}</div>
                <div className="stat-val" style={{ color:s.col }}>
                  {s.v}<span style={{ fontSize:15, color:$.ink3, marginLeft:3 }}>{s.u}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="au1" style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", gap:10 }}>
              <input className="field" value={q} onChange={e=>setQ(e.target.value)}
                placeholder="Szukaj wydatku…" style={{ flex:1 }} />
              <select className="field" value={sort} onChange={e=>setSort(e.target.value)}
                style={{ width:"auto", flex:"none", minWidth:130, cursor:"pointer" }}
                aria-label="Sortuj">
                <option value="date">Data ↓</option>
                <option value="amount">Kwota ↓</option>
                <option value="name">Nazwa A–Z</option>
              </select>
            </div>

            {/* Source toggle */}
            <div className="pills-row" role="group" aria-label="Źródło">
              {[["All","Wszystko"],["manual","✏️ Ręczne"],["receipt","🧾 Paragony"]].map(([id,lbl])=>(
                <button key={id} className={`pill${src===id?" on":""}`}
                  onClick={()=>setSrc(id)} aria-pressed={src===id}>{lbl}</button>
              ))}
            </div>

            {/* Category filter */}
            <div className="pills-row" role="group" aria-label="Kategoria">
              <button className={`pill${cat==="All"?" on":""}`} onClick={()=>setCat("All")} aria-pressed={cat==="All"}>Wszystkie kat.</button>
              {cats.map(c => (
                <button key={c} className={`pill${cat===c?" on":""}`} onClick={()=>setCat(c)} aria-pressed={cat===c}>
                  {CAT_ICONS[c]||"📦"} {c}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {list.length === 0 ? (
            <Empty icon="📋" title="Brak wyników" sub="Spróbuj zmienić filtry lub dodaj pierwszy wydatek przyciskiem +" />
          ) : (
            <div className="card tbl-wrap au2">
              <table className="tbl" aria-label="Lista wydatków">
                <thead>
                  <tr>
                    {["Nazwa","Kategoria","Źródło","Sklep","Data","Kwota"].map((h,i)=>(
                      <th key={h} scope="col" style={{ textAlign:i>=5?"right":"left" }}>{h}</th>
                    ))}
                    <th scope="col" aria-label="Akcje" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((item,i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight:600, fontSize:14 }}>{CAT_ICONS[item.category]||"📦"} {item.name}</div>
                        {item.note && <div style={{ fontSize:11, color:$.ink3, marginTop:2 }}>{item.note}</div>}
                      </td>
                      <td><CatChip cat={item.category} /></td>
                      <td>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:99,
                          background: item.source==="manual" ? "rgba(6,193,103,0.10)" : "rgba(59,130,246,0.10)",
                          color:      item.source==="manual" ? $.green : "#3B82F6",
                          border: `1px solid ${item.source==="manual" ? "rgba(6,193,103,0.25)" : "rgba(59,130,246,0.25)"}`,
                          whiteSpace:"nowrap",
                        }}>
                          {item.source==="manual" ? "✏️ Ręczny" : "🧾 Paragon"}
                        </span>
                      </td>
                      <td style={{ color:$.ink2, fontSize:13 }}>{item.store||"—"}</td>
                      <td className="mono" style={{ color:$.ink3, fontSize:12 }}>{item.date||"—"}</td>
                      <td style={{ textAlign:"right" }}>
                        <span className="mono" style={{ fontWeight:600, fontSize:14 }}>
                          {convertAmt(item.total_price||0, currency)} {sym}
                        </span>
                        {item.discount > 0 && (
                          <div style={{ fontSize:11, color:$.red, fontWeight:600 }}>−{convertAmt(item.discount, currency)}</div>
                        )}
                      </td>
                      <td style={{ textAlign:"right" }}>
                        {item.source==="manual" && (
                          <button className="btn-icon"
                            onClick={() => { haptic(10); onDelete(item.id); }}
                            aria-label={`Usuń ${item.name}`}>×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Nav config ─────────────────────────────── */
const VIEWS = [
  { id: "home",       label: "Dashboard",   icon: "🏠", mobile: true  },
  { id: "receipts",   label: "Paragony",    icon: "🧾", mobile: true  },
  { id: "expenses",   label: "Wydatki",     icon: "💳", mobile: false },
  { id: "stores",     label: "Sklepy",      icon: "🏪", mobile: false },
  { id: "shopping",   label: "Lista",       icon: "🛒", mobile: true  },
  { id: "budgets",    label: "Budżety",     icon: "💰", mobile: true  },
  { id: "recurring",  label: "Cykliczne",   icon: "🔄", mobile: false },
  { id: "stats",      label: "Statystyki",  icon: "📊", mobile: true  },
  { id: "inflation",  label: "Inflacja",    icon: "📈", mobile: false },
  { id: "prediction", label: "Predykcja",   icon: "🔮", mobile: false },
  { id: "mealplan",   label: "Planner",     icon: "🗓️", mobile: false },
  { id: "export",     label: "Eksport",     icon: "⬇️", mobile: false },
];
const MOBILE_VIEWS = VIEWS.filter(v => v.mobile);

/* ─── ROOT APP ───────────────────────────────── */
/* ─── localStorage helpers ────────────────────── */
const LS_KEYS = {
  receipts: "maszka_receipts",
  expenses: "maszka_expenses",
  budgets: "maszka_budgets",
  recurring: "maszka_recurring",
  currency: "maszka_currency",
  darkMode: "maszka_darkMode",
  onboarded: "maszka_onboarded",
  apiKey: "maszka_apiKey",
  corrections: "maszka_corrections",
};
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ─── Correction Learning System ─────────────── */
// Stored shape: { names: { "AI_NAME": ["correction1", "correction2"], ... }, categories: { "product_lower": "Category", ... } }
let _correctionsCache = { names: {}, categories: {} };
let _correctionsUid = null;
function initCorrections(uid, data) { _correctionsUid = uid; _correctionsCache = data || { names: {}, categories: {} }; }
function getCorrections() { return _correctionsCache; }
function saveCorrections(c) {
  _correctionsCache = c;
  if (_correctionsUid) updateField(_correctionsUid, "corrections", c);
}

function learnFromCorrections(original, confirmed) {
  const corr = getCorrections();
  let changed = false;
  const origItems = original.items || [];
  const confItems = confirmed.items || [];
  const len = Math.min(origItems.length, confItems.length);
  for (let i = 0; i < len; i++) {
    const oi = origItems[i];
    const ci = confItems[i];
    // Learn name corrections — store as array of alternatives
    if (oi.name && ci.name && oi.name !== ci.name) {
      const key = oi.name.trim();
      const val = ci.name.trim();
      if (!corr.names[key]) corr.names[key] = [];
      if (Array.isArray(corr.names[key])) {
        if (!corr.names[key].includes(val)) corr.names[key].push(val);
      } else {
        // Migrate old string format to array
        const prev = corr.names[key];
        corr.names[key] = prev === val ? [val] : [prev, val];
      }
      changed = true;
    }
    // Learn category corrections (keyed by confirmed name lowercase)
    if (ci.name && oi.category !== ci.category) {
      corr.categories[ci.name.trim().toLowerCase()] = ci.category;
      changed = true;
    }
    if (oi.name && ci.name && oi.name !== ci.name && ci.category) {
      corr.categories[oi.name.trim().toLowerCase()] = ci.category;
    }
  }
  if (changed) saveCorrections(corr);
  return corr;
}

function applyLearnedCorrections(parsed) {
  const corr = getCorrections();
  if (!parsed.items?.length) return parsed;
  const hasNames = Object.keys(corr.names).length > 0;
  const hasCats = Object.keys(corr.categories).length > 0;
  if (!hasNames && !hasCats) return parsed;
  return {
    ...parsed,
    items: parsed.items.map(it => {
      let name = it.name;
      let category = it.category;
      let _suggestions = null;
      // Check name corrections
      if (hasNames && name) {
        const corrections = corr.names[name.trim()];
        if (corrections) {
          const arr = Array.isArray(corrections) ? corrections : [corrections];
          if (arr.length === 1) {
            // Unambiguous — auto-apply
            name = arr[0];
          } else if (arr.length > 1) {
            // Ambiguous — mark for suggestion, don't auto-apply
            _suggestions = arr;
          }
        }
      }
      // Apply category correction
      const lookupKey = (name || "").trim().toLowerCase();
      if (hasCats && corr.categories[lookupKey]) {
        category = corr.categories[lookupKey];
      }
      return { ...it, name, category, _suggestions };
    }),
  };
}

function getCorrectionStats() {
  const corr = getCorrections();
  return { names: Object.keys(corr.names).length, categories: Object.keys(corr.categories).length };
}

export default function App({ uid }) {
  const [view,      setView]      = useState("home");
  const [receipts,  setReceipts]  = useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [processing,setProcessing]= useState([]);
  const [errors,    setErrors]    = useState([]);
  const [budgets,   setBudgets]   = useState({});
  const [recurring, setRecurring] = useState([]);
  const [currency,  setCurrency]  = useState("PLN");
  const [darkMode,  setDarkMode]  = useState(() => lsGet(LS_KEYS.darkMode, false));
  const [onboarded, setOnboarded] = useState(false);
  const [showQA,    setShowQA]    = useState(false);
  const [apiKey,    setApiKey]    = useState(() => lsGet(LS_KEYS.apiKey, ""));
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [reviewQueue, setReviewQueue] = useState([]); // receipts awaiting user approval
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const pendingFilesRef = useRef(null);
  const pageRef = useRef();
  const initialLoadDone = useRef(false);
  const reviewQueueRef = useRef(reviewQueue);
  reviewQueueRef.current = reviewQueue;

  // Load data from Firestore on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadUserData(uid);
        if (cancelled) return;

        if (data === null) {
          // No Firestore data — migrate from localStorage
          const migrated = {
            receipts:    lsGet(LS_KEYS.receipts, []),
            expenses:    lsGet(LS_KEYS.expenses, []),
            budgets:     lsGet(LS_KEYS.budgets, {}),
            recurring:   lsGet(LS_KEYS.recurring, []),
            currency:    lsGet(LS_KEYS.currency, "PLN"),
            darkMode:    lsGet(LS_KEYS.darkMode, false),
            onboarded:   lsGet(LS_KEYS.onboarded, false),
            corrections: lsGet(LS_KEYS.corrections, { names: {}, categories: {} }),
          };
          await saveAllUserData(uid, migrated);
          // Verify migration succeeded before clearing localStorage
          const verify = await loadUserData(uid);
          if (verify && (verify.receipts || []).length >= (migrated.receipts || []).length) {
            Object.entries(LS_KEYS).forEach(([k, v]) => {
              if (k !== "apiKey") localStorage.removeItem(v);
            });
          }
          applyData(migrated);
        } else {
          // Check if localStorage has receipts that Firestore is missing (recovery)
          const lsReceipts = lsGet(LS_KEYS.receipts, []);
          if (lsReceipts.length > 0 && (data.receipts || []).length === 0) {
            data.receipts = lsReceipts;
            await saveAllUserData(uid, { receipts: lsReceipts });
          } else if (lsReceipts.length > 0) {
            // Merge any localStorage receipts not already in Firestore (by id)
            const existingIds = new Set((data.receipts || []).map(r => r.id));
            const missing = lsReceipts.filter(r => !existingIds.has(r.id));
            if (missing.length > 0) {
              data.receipts = [...missing, ...(data.receipts || [])];
              await saveAllUserData(uid, { receipts: data.receipts });
            }
          }
          applyData(data);
        }
        setDataLoaded(true);
      } catch (e) {
        console.error("Failed to load data from Firestore:", e);
        setErrors(["Nie udało się załadować danych. Odśwież stronę."]);
        setLoadFailed(true);
        setDataLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  function applyData(d) {
    setReceipts(d.receipts || []);
    setExpenses(d.expenses || []);
    setBudgets(d.budgets || {});
    setRecurring(d.recurring || []);
    setCurrency(d.currency || "PLN");
    setDarkMode(d.darkMode || false);
    setOnboarded(d.onboarded || false);
    initCorrections(uid, d.corrections);
  }

  // Persist to Firestore on change (skip initial load; NEVER write if load failed)
  useEffect(() => {
    if (dataLoaded && !loadFailed) initialLoadDone.current = true;
  }, [dataLoaded, loadFailed]);

  // Track previous values so we skip the redundant write-back that fires
  // in the same render cycle where data loads from Firestore.  Without this,
  // a stale "write loaded data back" can race with the user's first edit and
  // overwrite it, causing receipts to vanish on refresh.
  const prevReceipts  = useRef(null);
  const prevExpenses  = useRef(null);
  const prevBudgets   = useRef(null);
  const prevRecurring = useRef(null);
  const prevCurrency  = useRef(null);
  const prevDarkMode  = useRef(null);
  const prevOnboarded = useRef(null);

  useEffect(() => {
    if (!initialLoadDone.current) {
      // Even before Firestore load completes (or if it fails), save non-empty
      // receipts to localStorage so they survive a refresh and can be recovered
      if (receipts.length > 0) lsSet(LS_KEYS.receipts, receipts);
      return;
    }
    if (prevReceipts.current === null) { prevReceipts.current = receipts; return; }
    prevReceipts.current = receipts;
    updateField(uid, "receipts", receipts);
    lsSet(LS_KEYS.receipts, receipts);
  }, [receipts]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevExpenses.current === null) { prevExpenses.current = expenses; return; }
    prevExpenses.current = expenses;
    updateField(uid, "expenses", expenses);
  }, [expenses]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevBudgets.current === null) { prevBudgets.current = budgets; return; }
    prevBudgets.current = budgets;
    updateField(uid, "budgets", budgets);
  }, [budgets]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevRecurring.current === null) { prevRecurring.current = recurring; return; }
    prevRecurring.current = recurring;
    updateField(uid, "recurring", recurring);
  }, [recurring]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevCurrency.current === null) { prevCurrency.current = currency; return; }
    prevCurrency.current = currency;
    updateField(uid, "currency", currency);
  }, [currency]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevDarkMode.current === null) { prevDarkMode.current = darkMode; return; }
    prevDarkMode.current = darkMode;
    updateField(uid, "darkMode", darkMode);
    lsSet(LS_KEYS.darkMode, darkMode);
  }, [darkMode]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevOnboarded.current === null) { prevOnboarded.current = onboarded; return; }
    prevOnboarded.current = onboarded;
    updateField(uid, "onboarded", onboarded);
  }, [onboarded]);

  // Unified allItems: manual expenses + receipt items
  const allItems = useMemo(() => [
    ...expenses.map(e => ({
      id: e.id, name: e.name, total_price: e.amount, category: e.category,
      date: e.date, store: e.store, note: e.note, source: "manual", type: e.type,
    })),
    ...receipts.flatMap(r =>
      (r.items || []).map(it => ({ ...it, store: r.store, date: r.date, source: "receipt" }))
    ),
  ], [expenses, receipts]);

  const addExpense = useCallback((exp) => {
    if (exp.type === "recurring") {
      setRecurring(r => [...r, { ...exp, amount: exp.amount, cycle: exp.cycle || "Miesięcznie" }]);
    } else {
      setExpenses(e => [exp, ...e]);
    }
  }, []);

  // Sync dark mode to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-dark", darkMode ? "1" : "0");
  }, [darkMode]);

  const processFiles = useCallback(async (files, key) => {
    for (const file of files) {
      const id = Date.now() + Math.random();
      setProcessing(p => [...p, { id, name: file.name }]);
      try {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const parsed = await scanReceipt(b64, file.type, key);
        const corrected = applyLearnedCorrections(parsed);
        // Enqueue for review instead of overwriting
        setReviewQueue(q => [...q, { ...corrected, id, _original: parsed }]);
        haptic(30);
      } catch (e) {
        setErrors(p => [...p, `${file.name}: ${e.message}`]);
      } finally {
        setProcessing(p => p.filter(x => x.id !== id));
      }
    }
  }, []);

  const handleFiles = useCallback(async files => {
    if (!apiKey) {
      pendingFilesRef.current = files;
      setShowKeyModal(true);
      return;
    }
    processFiles(files, apiKey);
  }, [apiKey, processFiles]);

  useEffect(() => {
    if (apiKey && pendingFilesRef.current) {
      const files = pendingFilesRef.current;
      pendingFilesRef.current = null;
      processFiles(files, apiKey);
    }
  }, [apiKey, processFiles]);

  const go = id => {
    setView(id);
    pageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalItems = allItems.length;
  const currentView = VIEWS.find(v => v.id === view);

  if (!dataLoaded) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#000", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🧾</div>
        <div style={{ fontSize: 14, color: "#aaa" }}>Ładowanie danych...</div>
      </div>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>

      {/* Onboarding */}
      {!onboarded && <OnboardingOverlay onDone={() => { setOnboarded(true); haptic(30); }} darkMode={darkMode} />}

      {/* Quick Add Drawer */}
      {showQA && (
        <QuickAddExpense
          onAdd={addExpense}
          onClose={() => setShowQA(false)}
          apiKey={apiKey}
          onNeedKey={() => setShowKeyModal(true)}
          onTextReceipt={async (text) => {
            setShowQA(false);
            const id = Date.now() + Math.random();
            setProcessing(p => [...p, { id, name: "Analiza tekstu..." }]);
            try {
              const parsed = await parseTextReceipt(text, apiKey);
              const corrected = applyLearnedCorrections(parsed);
              setReviewQueue(q => [...q, { ...corrected, id, _original: parsed }]);
              haptic(30);
            } catch (e) {
              setErrors(p => [...p, `Tekst: ${e.message}`]);
            } finally {
              setProcessing(p => p.filter(x => x.id !== id));
            }
          }}
        />
      )}

      {/* Receipt Review Modal — processes queue one at a time */}
      {reviewQueue.length > 0 && (
        <ReceiptReviewModal
          key={reviewQueue[0].id}
          receipt={reviewQueue[0]}
          onConfirm={(reviewed) => {
            const current = reviewQueueRef.current[0];
            if (current) {
              // Learn from user corrections vs original AI parse
              if (current._original) {
                learnFromCorrections(current._original, reviewed);
              }
              const { _original, ...rest } = current;
              setReceipts(p => [{ ...reviewed, id: rest.id }, ...p]);
            }
            setReviewQueue(q => q.slice(1));
            haptic(30);
          }}
          onCancel={() => setReviewQueue(q => q.slice(1))}
        />
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div style={{ position:"fixed", inset:0, zIndex:10000, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={() => setShowKeyModal(false)}>
          <div style={{ background:"var(--dark,0) == 1 ? #1a1a1a : #fff", backgroundColor: darkMode ? "#1a1a1a" : "#fff",
            borderRadius:20, padding:"32px 28px", maxWidth:420, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:18, fontWeight:800, color: darkMode ? "#fff" : $.ink0, marginBottom:4 }}>Klucz API Anthropic</div>
            <div style={{ fontSize:13, color: darkMode ? "#aaa" : $.ink2, marginBottom:16 }}>
              Wymagany do skanowania paragonów i planowania posiłków. Klucz jest przechowywany tylko lokalnie w przeglądarce.
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); lsSet(LS_KEYS.apiKey, e.target.value); }}
              placeholder="sk-ant-..."
              style={{ width:"100%", padding:"10px 14px", fontSize:14, border:`2px solid ${darkMode ? "#333" : "#e0e0e0"}`,
                borderRadius:12, background: darkMode ? "#222" : "#f9f9f9", color: darkMode ? "#fff" : $.ink0,
                outline:"none", boxSizing:"border-box", fontFamily:"monospace" }}
              onFocus={e => e.target.style.borderColor = $.green}
              onBlur={e => e.target.style.borderColor = darkMode ? "#333" : "#e0e0e0"}
            />
            <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"flex-end" }}>
              <button onClick={() => setShowKeyModal(false)}
                style={{ padding:"8px 20px", borderRadius:10, border:"none", background:$.green, color:"#fff",
                  fontSize:13, fontWeight:700, cursor:"pointer" }}>
                Zapisz
              </button>
            </div>
            {apiKey && <div style={{ marginTop:12, fontSize:12, color:$.green, fontWeight:600 }}>Klucz ustawiony ({apiKey.slice(0,10)}...)</div>}
          </div>
        </div>
      )}

      {/* Skip link */}
      <a href="#main"
        style={{ position: "absolute", top: -60, left: 12, zIndex: 9999, background: $.green, color: $.white, padding: "8px 18px", borderRadius: "0 0 10px 10px", fontSize: 13, fontWeight: 700, textDecoration: "none", transition: "top .15s" }}
        onFocus={e => e.target.style.top = "0"}
        onBlur={e => e.target.style.top = "-60px"}
      >Przejdź do treści</a>

      {/* ── TOP NAV ── */}
      <header>
        <nav className="topnav" aria-label="Nawigacja główna">
          {/* Logo */}
          <a href="#" className="topnav-logo" onClick={e => { e.preventDefault(); go("receipts"); }} aria-label="MaszkaApp — strona główna">
            <div className="topnav-logo-dot" aria-hidden="true" />
            MaszkaApp
          </a>

          {/* Desktop links */}
          <div className="topnav-items" role="list">
            {VIEWS.map(v => {
              const count = v.id === "receipts" ? receipts.length : v.id === "expenses" ? totalItems : 0;
              return (
                <div key={v.id} role="listitem">
                  <button
                    className={`topnav-btn${view === v.id ? " active" : ""}`}
                    onClick={() => go(v.id)}
                    aria-current={view === v.id ? "page" : undefined}
                  >
                    {v.label}
                    {count > 0 && (
                      <span className="topnav-badge" aria-label={`${count} elementów`}>
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Currency toggle */}
          <div className="cur-toggle" role="group" aria-label="Waluta">
            {["PLN","EUR","USD"].map(c => (
              <button key={c} className={`cur-btn${currency === c ? " active" : ""}`}
                onClick={() => setCurrency(c)} aria-pressed={currency === c}>{c}</button>
            ))}
          </div>

          {/* Add expense */}
          <button
            className="nav-add-btn"
            onClick={() => { setShowQA(true); haptic(12); }}
            aria-label="Dodaj wydatek"
            style={{ marginLeft:8, background:$.green, border:"none", borderRadius:99, padding:"6px 14px", cursor:"pointer",
              color:"#fff", fontSize:13, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif",
              display:"flex", alignItems:"center", gap:5, minHeight:30, transition:"opacity .15s", flexShrink:0 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg>
            Dodaj
          </button>

          {/* API Key */}
          <button className="dark-btn" onClick={() => { setShowKeyModal(true); haptic(12); }}
            aria-label="Klucz API" title="Klucz API"
            style={{ position:"relative" }}>
            🔑
            {!apiKey && <span style={{ position:"absolute", top:2, right:2, width:8, height:8, borderRadius:"50%", background:$.red }} />}
          </button>

          {/* Dark mode */}
          <button className="dark-btn" onClick={() => { setDarkMode(d => !d); haptic(12); }}
            aria-label={darkMode ? "Tryb jasny" : "Tryb ciemny"} title={darkMode ? "Tryb jasny" : "Tryb ciemny"}>
            {darkMode ? "☀️" : "🌙"}
          </button>

          {/* Logout */}
          <button className="dark-btn" onClick={() => signOut(auth)}
            aria-label="Wyloguj" title="Wyloguj">
            🚪
          </button>

          {/* Mobile: centered title */}
          <span className="topnav-mobile-title" aria-hidden="true">{currentView?.label}</span>
        </nav>
      </header>

      {/* ── PAGE ── */}
      <main id="main" className="page" ref={pageRef}>
        {view === "receipts" && (
          <ReceiptsView
            receipts={receipts}
            setReceipts={setReceipts}
            processing={processing}
            errors={errors}
            setErrors={setErrors}
            onFiles={handleFiles}
          />
        )}
        {view === "home"      && <DashboardView receipts={receipts} expenses={expenses} budgets={budgets} recurring={recurring} currency={currency} go={go} allItems={allItems} />}
        {view === "expenses"  && <ExpensesView expenses={expenses} receipts={receipts} onDelete={id => setExpenses(e=>e.filter(x=>x.id!==id))} currency={currency} />}
        {view === "shopping"  && <ShoppingView receipts={receipts} />}
        {view === "stores"    && <StoresView receipts={receipts} expenses={expenses} />}
        {view === "budgets"   && <BudgetsView receipts={receipts} expenses={expenses} allItems={allItems} budgets={budgets} setBudgets={setBudgets} currency={currency} />}
        {view === "recurring" && <RecurringView recurring={recurring} setRecurring={setRecurring} currency={currency} />}
        {view === "stats"     && <StatsView receipts={receipts} expenses={expenses} allItems={allItems} currency={currency} />}
        {view === "inflation"  && <InflationView receipts={receipts} currency={currency} />}
        {view === "prediction" && <PredictionView receipts={receipts} currency={currency} />}
        {view === "mealplan"   && <MealPlanView receipts={receipts} apiKey={apiKey} />}
        {view === "export"     && <ExportView receipts={receipts} />}
      </main>

      {/* ── FAB ── */}
      <button className="fab" onClick={() => { setShowQA(true); haptic(12); }} aria-label="Dodaj wydatek">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 2v18M2 11h18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
      </button>

      {/* ── FLOATING PILL NAV (mobile) ── */}
      <nav className="botnav" aria-label="Nawigacja mobilna">
        <div className="botnav-pill" role="list">
          {MOBILE_VIEWS.map((v, i) => (
            <div key={v.id} role="listitem" style={{ display: "contents" }}>
              {i === 3 && <div className="botnav-divider" aria-hidden="true" />}
              <button
                className={`botnav-btn${view === v.id ? " active" : ""}`}
                onClick={() => go(v.id)}
                aria-label={v.label}
                aria-current={view === v.id ? "page" : undefined}
              >
                <div className="bn-bg" aria-hidden="true" />
                <span className="bn-icon" aria-hidden="true">{v.icon}</span>
              </button>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}

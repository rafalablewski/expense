import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { VIEWS } from "../../config/constants";
import { haptic } from "../../utils/helpers";
import { useAppData } from "../../contexts/AppDataContext";
import { LS_KEYS, lsSet } from "../../services/localStorage";

export default function TopNav({ view, go, onAddExpense, onApiKey }) {
  const { receipts, currency, setCurrency, apiKey, darkMode, setDarkMode, allItems, aiProvider, setAiProvider, activeApiKey } = useAppData();
  const totalItems = allItems.length;
  const currentView = VIEWS.find(v => v.id === view);
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (id) => {
    go(id);
    setMenuOpen(false);
  };

  return (
    <header>
      <nav className="topnav" aria-label="Nawigacja główna">
        {/* Logo */}
        <a href="#" className="topnav-logo" onClick={e => { e.preventDefault(); navigate("receipts"); }} aria-label="MaszkaApp — strona główna">
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
          onClick={() => { onAddExpense(); haptic(12); }}
          aria-label="Dodaj wydatek">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg>
          Dodaj
        </button>

        {/* AI Provider toggle */}
        <button
          className="ai-toggle-btn"
          onClick={() => {
            const next = aiProvider === "claude" ? "deepseek" : "claude";
            setAiProvider(next);
            lsSet(LS_KEYS.aiProvider, next);
            haptic(12);
          }}
          aria-label={`Dostawca AI: ${aiProvider === "claude" ? "Claude" : "DeepSeek"}`}
          title={`Dostawca AI: ${aiProvider === "claude" ? "Claude" : "DeepSeek"} — kliknij aby przełączyć`}
        >
          <span className="ai-toggle-label">{aiProvider === "claude" ? "Claude" : "DeepSeek"}</span>
        </button>

        {/* API Key */}
        <button className="dark-btn pos-relative" onClick={() => { onApiKey(); haptic(12); }}
          aria-label="Klucz API" title="Klucz API">
          🔑
          {!activeApiKey && <span className="key-dot" />}
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

        {/* Mobile: hamburger button */}
        <button
          className={`hamburger-btn${menuOpen ? " open" : ""}`}
          onClick={() => { setMenuOpen(o => !o); haptic(8); }}
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          aria-expanded={menuOpen}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>

        {/* Mobile: centered title */}
        <span className="topnav-mobile-title" aria-hidden="true">{currentView?.label}</span>
      </nav>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu-grid">
              {VIEWS.map(v => (
                <button
                  key={v.id}
                  className={`mobile-menu-item${view === v.id ? " active" : ""}`}
                  onClick={() => navigate(v.id)}
                >
                  <span className="mobile-menu-icon">{v.icon}</span>
                  <span className="mobile-menu-label">{v.label}</span>
                </button>
              ))}
            </div>
            <div className="mobile-menu-footer">
              <div className="cur-toggle" role="group" aria-label="Waluta">
                {["PLN","EUR","USD"].map(c => (
                  <button key={c} className={`cur-btn${currency === c ? " active" : ""}`}
                    onClick={() => setCurrency(c)} aria-pressed={currency === c}>{c}</button>
                ))}
              </div>
              <div className="cur-toggle" role="group" aria-label="Dostawca AI">
                {["claude","deepseek"].map(p => (
                  <button key={p} className={`cur-btn${aiProvider === p ? " active" : ""}`}
                    onClick={() => { setAiProvider(p); lsSet(LS_KEYS.aiProvider, p); haptic(12); }}
                    aria-pressed={aiProvider === p}>{p === "claude" ? "Claude" : "DeepSeek"}</button>
                ))}
              </div>
              <button className="mobile-menu-action" onClick={() => { onAddExpense(); setMenuOpen(false); haptic(12); }}>
                + Dodaj wydatek
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

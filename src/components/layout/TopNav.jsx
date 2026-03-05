import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { VIEWS } from "../../config/constants";
import { haptic } from "../../utils/helpers";

export default function TopNav({ view, go, receipts, totalItems, currency, setCurrency, onAddExpense, onApiKey, apiKey, darkMode, setDarkMode, currentView }) {
  return (
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
          onClick={() => { onAddExpense(); haptic(12); }}
          aria-label="Dodaj wydatek">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg>
          Dodaj
        </button>

        {/* API Key */}
        <button className="dark-btn pos-relative" onClick={() => { onApiKey(); haptic(12); }}
          aria-label="Klucz API" title="Klucz API">
          🔑
          {!apiKey && <span className="key-dot" />}
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
  );
}

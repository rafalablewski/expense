import $ from "../../config/theme";
import { LS_KEYS, lsSet } from "../../services/localStorage";
import { useAppData } from "../../contexts/AppDataContext";

export default function ApiKeyModal({ onClose }) {
  const { apiKey, setApiKey, darkMode } = useAppData();

  return (
    <div className="apikey-overlay" onClick={onClose}>
      <div className={`apikey-box ${darkMode ? "apikey-box-dark" : "apikey-box-light"}`}
        onClick={e => e.stopPropagation()}>
        <div className="apikey-title" style={{ color: darkMode ? "#fff" : $.ink0 }}>Klucz API Anthropic</div>
        <div className="apikey-desc" style={{ color: darkMode ? "#aaa" : $.ink2 }}>
          Wymagany do skanowania paragonów i planowania posiłków. Klucz jest przechowywany tylko lokalnie w przeglądarce.
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={e => { setApiKey(e.target.value); lsSet(LS_KEYS.apiKey, e.target.value); }}
          placeholder="sk-ant-..."
          className={`apikey-input ${darkMode ? "apikey-input-dark" : "apikey-input-light"}`}
          onFocus={e => e.target.style.borderColor = $.green}
          onBlur={e => e.target.style.borderColor = darkMode ? "#333" : "#e0e0e0"}
        />
        <div className="apikey-actions">
          <button onClick={onClose} className="apikey-save">Zapisz</button>
        </div>
        {apiKey && <div className="apikey-status">Klucz ustawiony ({apiKey.slice(0,10)}...)</div>}
      </div>
    </div>
  );
}

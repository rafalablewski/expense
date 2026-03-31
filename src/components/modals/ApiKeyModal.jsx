import $ from "../../config/theme";
import { LS_KEYS, lsSet } from "../../services/localStorage";
import { useAppData } from "../../contexts/AppDataContext";

export default function ApiKeyModal({ onClose }) {
  const { apiKey, setApiKey, deepseekApiKey, setDeepseekApiKey, aiProvider, darkMode } = useAppData();

  return (
    <div className="apikey-overlay" onClick={onClose}>
      <div className={`apikey-box ${darkMode ? "apikey-box-dark" : "apikey-box-light"}`}
        onClick={e => e.stopPropagation()}>
        <div className="apikey-title" style={{ color: darkMode ? "#fff" : $.ink0 }}>Klucze API</div>
        <div className="apikey-desc" style={{ color: darkMode ? "#aaa" : $.ink2 }}>
          Wymagane do skanowania paragonów i planowania posiłków. Klucze są przechowywane tylko lokalnie w przeglądarce.
          Aktywny dostawca: <strong>{aiProvider === "claude" ? "Claude" : "DeepSeek"}</strong>
        </div>

        <div className="apikey-section-label" style={{ color: darkMode ? "#ccc" : $.ink1, marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
          Anthropic (Claude)
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
        {apiKey && <div className="apikey-status" style={{ marginBottom: 8 }}>Klucz ustawiony (sk-ant-***)</div>}

        <div className="apikey-section-label" style={{ color: darkMode ? "#ccc" : $.ink1, marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
          DeepSeek
        </div>
        <input
          type="password"
          value={deepseekApiKey}
          onChange={e => { setDeepseekApiKey(e.target.value); lsSet(LS_KEYS.deepseekApiKey, e.target.value); }}
          placeholder="sk-..."
          className={`apikey-input ${darkMode ? "apikey-input-dark" : "apikey-input-light"}`}
          onFocus={e => e.target.style.borderColor = $.green}
          onBlur={e => e.target.style.borderColor = darkMode ? "#333" : "#e0e0e0"}
        />
        {deepseekApiKey && <div className="apikey-status">Klucz DeepSeek ustawiony (sk-***)</div>}

        <div className="apikey-actions">
          <button onClick={onClose} className="apikey-save">Zapisz</button>
        </div>
      </div>
    </div>
  );
}

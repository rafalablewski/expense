import $ from "../../config/theme";
import { LS_KEYS, lsSet } from "../../services/localStorage";
import { useAppData } from "../../contexts/AppDataContext";
import { AI_PROVIDER } from "../../services/ai";

export default function ApiKeyModal({ onClose }) {
  const {
    apiKey,
    setApiKey,
    deepseekApiKey,
    setDeepseekApiKey,
    aiProvider,
    setAiProvider,
    darkMode,
  } = useAppData();

  const isDeepseek = aiProvider === AI_PROVIDER.DEEPSEEK;
  const currentKey = isDeepseek ? deepseekApiKey : apiKey;

  const setProvider = (p) => {
    setAiProvider(p);
    lsSet(LS_KEYS.aiProvider, p);
  };

  const onKeyChange = (e) => {
    const v = e.target.value;
    if (isDeepseek) setDeepseekApiKey(v);
    else setApiKey(v);
  };

  const persistKeysAndClose = () => {
    lsSet(LS_KEYS.apiKey, apiKey);
    lsSet(LS_KEYS.deepseekApiKey, deepseekApiKey);
    onClose();
  };

  const btnBase = darkMode
    ? { border: "2px solid #333", background: "#222", color: "#ccc" }
    : { border: "2px solid #e0e0e0", background: "#f5f5f5", color: $.ink0 };
  const btnActive = { borderColor: $.green, background: darkMode ? "#1a2e1f" : "#e8f5e9", color: darkMode ? "#fff" : $.ink0 };

  return (
    <div className="apikey-overlay" onClick={persistKeysAndClose}>
      <div
        className={`apikey-box ${darkMode ? "apikey-box-dark" : "apikey-box-light"}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="apikey-title" style={{ color: darkMode ? "#fff" : $.ink0 }}>
          Klucz API — analiza AI
        </div>
        <div className="apikey-desc" style={{ color: darkMode ? "#aaa" : $.ink2 }}>
          DeepSeek: wybierz „DeepSeek” (tutaj lub przełącznik Claude/DeepSeek w pasku obok 🔑), wklej klucz z konsoli API DeepSeek (zwykle{" "}
          <code style={{ fontSize: 12 }}>sk-...</code>
          ) w pole poniżej i Zapisz. Anthropic: przełącz „Claude”, klucz{" "}
          <code style={{ fontSize: 12 }}>sk-ant-...</code>
          . Ikona 🔑 otwiera to okno. Klucze tylko lokalnie w przeglądarce.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setProvider(AI_PROVIDER.ANTHROPIC)}
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              ...btnBase,
              ...(isDeepseek ? {} : btnActive),
            }}
          >
            Anthropic (Claude)
          </button>
          <button
            type="button"
            onClick={() => setProvider(AI_PROVIDER.DEEPSEEK)}
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              ...btnBase,
              ...(isDeepseek ? btnActive : {}),
            }}
          >
            DeepSeek
          </button>
        </div>
        <input
          type="password"
          value={currentKey}
          onChange={onKeyChange}
          placeholder={isDeepseek ? "sk-..." : "sk-ant-..."}
          className={`apikey-input ${darkMode ? "apikey-input-dark" : "apikey-input-light"}`}
          onFocus={e => (e.target.style.borderColor = $.green)}
          onBlur={e => (e.target.style.borderColor = darkMode ? "#333" : "#e0e0e0")}
        />
        <div className="apikey-actions">
          <button type="button" onClick={persistKeysAndClose} className="apikey-save">
            Zapisz
          </button>
        </div>
        {apiKey && (
          <div className="apikey-status" style={{ marginTop: 8 }}>
            Anthropic: ustawiony
          </div>
        )}
        {deepseekApiKey && (
          <div className="apikey-status" style={{ marginTop: 4 }}>
            DeepSeek: ustawiony
          </div>
        )}
      </div>
    </div>
  );
}

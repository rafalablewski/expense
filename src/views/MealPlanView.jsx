import { useMemo, useState } from "react";
import { haptic } from "../utils/helpers";
import Spinner from "../components/primitives/Spinner";
import { useAppData } from "../contexts/AppDataContext";
import { aiChat } from "../services/ai";

export default function MealPlanView({ onNeedKey }) {
  const { receipts, activeApiKey, aiProvider } = useAppData();
  const DAYS  = ["Pon","Wt","Śr","Czw","Pt","Sob","Ndz"];
  const MEALS = ["Śniadanie","Obiad","Kolacja"];
  const [plan,     setPlan]     = useState({}); // {`${day}-${meal}`: text}
  const [loading,  setLoading]  = useState(null); // cell key being generated
  const [pantry,   setPantry]   = useState("");
  const [genAll,   setGenAll]   = useState(false);
  const [shopList, setShopList] = useState([]);
  const [genShop,  setGenShop]  = useState(false);
  const [error,    setError]    = useState(null);

  // Build ingredient list from recent receipts
  const knownItems = useMemo(() => {
    const cats = new Set(["Nabiał","Mięso","Warzywa","Owoce","Pieczywo","Zboża","Słodycze"]);
    return [...new Set(
      receipts.flatMap(r => (r.items||[])
        .filter(it => cats.has(it.category))
        .map(it => it.name)
        .filter(Boolean)
      )
    )].slice(0, 40);
  }, [receipts]);

  const callAI = (prompt) => {
    if (!activeApiKey) {
      if (onNeedKey) onNeedKey();
      throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
    }
    return aiChat(prompt, activeApiKey, aiProvider);
  };

  const generateCell = async (day, meal) => {
    const key = `${day}-${meal}`;
    setLoading(key);
    setError(null);
    haptic(15);
    try {
      const context = knownItems.length
        ? `Produkty dostępne w lodówce: ${knownItems.slice(0,20).join(", ")}.`
        : "";
      const extra = pantry ? `Dodatkowe składniki: ${pantry}.` : "";
      const text = await callAI(
        `Zaproponuj jedno konkretne danie na ${meal} na ${day}. ${context} ${extra}
Odpowiedz TYLKO nazwą dania i jednym zdaniem opisu (max 60 znaków). Format: "Nazwa — opis". Bez list, bez gwiazdek.`
      );
      setPlan(p => ({ ...p, [key]: text.trim() }));
      haptic(20);
    } catch(e) {
      setError(e.message || "Błąd generowania — spróbuj ponownie");
      setPlan(p => ({ ...p, [key]: "Błąd" }));
    } finally {
      setLoading(null);
    }
  };

  const generateAll = async () => {
    if (!apiKey) {
      if (onNeedKey) onNeedKey();
      setError("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
      return;
    }
    setGenAll(true);
    setError(null);
    haptic(30);
    let failCount = 0;
    for (const day of DAYS) {
      for (const meal of MEALS) {
        const key = `${day}-${meal}`;
        if (plan[key]) continue;
        setLoading(key);
        try {
          const context = knownItems.length ? `Produkty w lodówce: ${knownItems.slice(0,15).join(", ")}.` : "";
          const text = await callAI(
            `Danie na ${meal}, ${day}. ${context} Odpowiedz TYLKO: "Nazwa — krótki opis" (max 55 znaków). Zero list.`
          );
          setPlan(p => ({ ...p, [key]: text.trim() }));
        } catch(e) {
          failCount++;
          if (e.message?.includes("klucz") || e.message?.includes("401")) {
            setLoading(null);
            setGenAll(false);
            setError(e.message);
            return;
          }
        }
        setLoading(null);
        await new Promise(r => setTimeout(r, 200));
      }
    }
    if (failCount > 0) {
      setError(`${failCount} posiłków nie udało się wygenerować — spróbuj ponownie`);
    }
    setGenAll(false);
  };

  const generateShoppingList = async () => {
    if (!Object.keys(plan).length) return;
    if (!apiKey) {
      if (onNeedKey) onNeedKey();
      setError("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
      return;
    }
    setGenShop(true);
    setError(null);
    haptic(20);
    try {
      const meals = Object.values(plan).join("\n");
      const text = await callAI(
        `Na podstawie tych posiłków: ${meals}

Wygeneruj listę zakupów. Odpowiedz TYLKO jako JSON array stringów, np. ["Mleko","Jajka"]. Zero innych słów.`
      );
      const clean = text.replace(/```(?:json)?/g,"").trim();
      const arr = JSON.parse(clean);
      if (Array.isArray(arr)) setShopList(arr);
    } catch(e) {
      setError(e.message || "Nie udało się wygenerować listy zakupów");
      setShopList([]);
    }
    setGenShop(false);
  };

  const clearPlan = () => { setPlan({}); setShopList([]); setError(null); };

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
        <div className="section flex-col gap-20">

          {/* Error banner */}
          {error && (
            <div className="toast-err" role="alert">
              <span>{error}</span>
              <button onClick={() => setError(null)} aria-label="Zamknij" className="btn-err-close">×</button>
            </div>
          )}

          {/* API key warning */}
          {!apiKey && (
            <div className="toast-warn au" role="alert">
              <span>🔑 Ustaw klucz API Anthropic aby korzystać z planera posiłków</span>
              {onNeedKey && <button className="btn-primary" style={{ marginLeft: "auto", minHeight: 36, fontSize: 13 }} onClick={onNeedKey}>Ustaw klucz</button>}
            </div>
          )}

          {/* Controls */}
          <div className="card au card--p20">
            <div className="flex-row flex-wrap gap-10 flex-end">
              <div className="form-group min-w-200">
                <label htmlFor="pantry" className="field-label">
                  Dodatkowe składniki (opcjonalnie)
                </label>
                <input id="pantry" className="field" value={pantry} onChange={e=>setPantry(e.target.value)}
                  placeholder="np. ryż, pomidory, ser żółty…" />
              </div>
              <button className="btn-primary" onClick={generateAll} disabled={genAll || !apiKey}
                style={{ gap: 8, minHeight: 48, opacity: (genAll || !apiKey) ? 0.5 : 1 }}>
                {genAll ? <><Spinner />Generuję…</> : "✦ Generuj cały plan"}
              </button>
              {filledCells > 0 && (
                <>
                  <button className="btn-secondary" onClick={generateShoppingList} disabled={genShop}
                    style={{ minHeight: 48 }}>
                    {genShop ? <><Spinner />Listuję…</> : "🛒 Lista zakupów"}
                  </button>
                  <button onClick={clearPlan}
                    className="btn-ghost">
                    Wyczyść
                  </button>
                </>
              )}
            </div>
            {knownItems.length > 0 && (
              <div className="known-items-hint">
                <span className="known-items-label">Z Twoich paragonów: </span>
                {knownItems.slice(0,12).join(" · ")}
                {knownItems.length > 12 && ` +${knownItems.length-12} więcej`}
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="mgrid-outer au1">
            <div className="meal-scroll">
              <table className="meal-table">
                <thead>
                  <tr>
                    <th className="meal-th--row"></th>
                    {DAYS.map(d => (
                      <th key={d} className="meal-th">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MEALS.map((meal, mi) => (
                    <tr key={meal}>
                      <td className="meal-td-label">{meal}</td>
                      {DAYS.map(day => {
                        const key   = `${day}-${meal}`;
                        const text  = plan[key];
                        const busy  = loading === key;
                        const [name, desc] = text ? text.split("—").map(s=>s.trim()) : ["",""];
                        return (
                          <td key={key} className="meal-td">
                            <button
                              onClick={() => !busy && generateCell(day, meal)}
                              aria-label={`${meal} ${day}${text ? ": "+text : " — kliknij aby wygenerować"}`}
                              className={`meal-cell-btn${busy ? " busy" : ""}`}
                              disabled={!apiKey}
                            >
                              {busy ? (
                                <div className="meal-spinner-wrap">
                                  <Spinner />
                                </div>
                              ) : text ? (
                                <>
                                  <span className="meal-cell-name">{name}</span>
                                  {desc && <span className="meal-cell-desc">{desc}</span>}
                                </>
                              ) : (
                                <span className="meal-cell-plus">+</span>
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
            <div className="card au2 card--p22">
              <div className="section-heading mb-14">
                Lista zakupów z planu — {shopList.length} pozycji
              </div>
              <div className="flex-row flex-wrap gap-8">
                {shopList.map((item, i) => (
                  <span key={i} className="meal-shop-pill">{item}</span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

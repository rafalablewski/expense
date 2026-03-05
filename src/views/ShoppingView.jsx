import { useRef, useState } from "react";
import { haptic } from "../utils/helpers";
import Empty from "../components/primitives/Empty";
import { useAppData } from "../contexts/AppDataContext";

export default function ShoppingView() {
  const { receipts } = useAppData();
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
        <div className="section flex-col gap-16" style={{ maxWidth: 680 }}>

          {/* Add form */}
          <div className="card au card--p22">
            <div className="flex-row flex-wrap gap-10 flex-end">
              <div className="form-group min-w-180">
                <label htmlFor="si" className="field-label-sm">Produkt</label>
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
              <div className="min-w-80" style={{ width: 80 }}>
                <label htmlFor="sq" className="field-label-sm">Ilość</label>
                <input
                  id="sq"
                  className="field text-center"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, +e.target.value))}
                />
              </div>
              <button className="btn-primary" onClick={add}>
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                Dodaj
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {items.length > 0 && (
            <div className="au1 flex-row gap-12"
              role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={items.length} aria-label={`${done} z ${items.length} zakupiono`}>
              <div className="prog"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
              <span className="mono text-muted nowrap">{done}/{items.length}</span>
            </div>
          )}

          {/* Items */}
          {items.length === 0 ? (
            <Empty icon="📋" title="Lista jest pusta" sub="Dodaj produkty powyżej. Podpowiedzi z paragonów pojawią się automatycznie." />
          ) : (
            <ul className="shop-list" aria-label="Lista zakupów">
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

                    <span className={`shop-item-text${item.done ? " done" : ""}`}>
                      {item.name}
                    </span>

                    <span className="mono shop-item-qty">
                      ×{item.qty}
                    </span>

                    <button
                      className="btn-icon"
                      onClick={() => remove(item.id)}
                      aria-label={`Usuń ${item.name}`}
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

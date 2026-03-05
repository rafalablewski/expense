import { useState } from "react";
import { useAppData } from '../../contexts/AppDataContext';

const ONBOARD_STEPS = [
  { icon:"📸", title:"Skanuj paragon", desc:"Dodaj zdjęcie paragonu — Claude automatycznie odczyta produkty, ceny i rabaty." },
  { icon:"📊", title:"Analizuj wydatki", desc:"Wykresy, statystyki, porównanie sklepów i inflacja cenowa w jednym miejscu." },
  { icon:"💰", title:"Kontroluj budżet", desc:"Ustaw limity per kategorię i śledź cykliczne wydatki jak subskrypcje." },
  { icon:"🔮", title:"Przewiduj przyszłość", desc:"AI prognozuje Twoje wydatki i sugeruje tygodniowy plan posiłków." },
];

export default function OnboardingOverlay({ onDone }) {
  const { darkMode } = useAppData();
  const [step, setStep] = useState(0);
  const current = ONBOARD_STEPS[step];
  const isLast  = step === ONBOARD_STEPS.length - 1;

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" aria-label="Witaj w MaszkaApp">
      <div className="onboard-card">
        {/* Logo */}
        <div className="onboard-logo-row">
          <div className="onboard-logo-dot" />
          <span className="onboard-logo-text">MaszkaApp</span>
          <span className="onboard-step-counter">{step+1} / {ONBOARD_STEPS.length}</span>
        </div>

        {/* Step icon */}
        <div className="onboard-step-icon" key={step}>
          {current.icon}
        </div>

        {/* Title */}
        <div className="onboard-step-title" key={step+"t"}>
          {current.title}
        </div>

        {/* Desc */}
        <div className="onboard-step-desc" key={step+"d"}>
          {current.desc}
        </div>

        {/* Dots */}
        <div className="onboard-dots">
          {ONBOARD_STEPS.map((_,i) => (
            <button key={i} onClick={() => setStep(i)} aria-label={`Krok ${i+1}`}
              className={`onboard-dot ${i===step ? "onboard-dot--active" : "onboard-dot--inactive"}`} />
          ))}
        </div>

        {/* Buttons */}
        <div className="onboard-btns">
          {!isLast ? (
            <>
              <button onClick={onDone}
                className="onboard-skip">
                Pomiń
              </button>
              <button onClick={() => setStep(s => s+1)}
                className="btn-primary onboard-next">
                Dalej →
              </button>
            </>
          ) : (
            <button onClick={onDone} className="btn-primary onboard-start">
              ✦ Zaczynamy!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

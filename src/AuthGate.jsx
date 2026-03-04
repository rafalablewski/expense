import { useState, useEffect } from "react";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

function mapFirebaseError(code) {
  const map = {
    "auth/email-already-in-use": "Ten email jest już zarejestrowany",
    "auth/invalid-email": "Nieprawidłowy adres email",
    "auth/weak-password": "Hasło musi mieć co najmniej 6 znaków",
    "auth/user-not-found": "Nie znaleziono konta z tym emailem",
    "auth/wrong-password": "Nieprawidłowe hasło",
    "auth/invalid-credential": "Nieprawidłowy email lub hasło",
    "auth/too-many-requests": "Zbyt wiele prób. Spróbuj ponownie później",
  };
  return map[code] || "Wystąpił błąd. Spróbuj ponownie.";
}

export function useAuthState() {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u ?? null));
  }, []);
  return user;
}

export default function AuthGate({ children }) {
  const user = useAuthState();

  if (user === undefined) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#000", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🧾</div>
          <div style={{ fontSize: 14, color: "#aaa" }}>Ładowanie...</div>
        </div>
      </div>
    );
  }

  if (user === null) {
    return <LoginForm />;
  }

  return children(user);
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(mapFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#000", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <form onSubmit={handleSubmit} style={{
        width: "100%", maxWidth: 380, padding: 32,
        background: "rgba(255,255,255,0.06)", borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.10)", margin: 16,
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧾</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
            MaszkaApp
          </div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
            {isRegister ? "Utwórz nowe konto" : "Zaloguj się do swojego konta"}
          </div>
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
          style={{
            width: "100%", padding: "12px 16px", fontSize: 14,
            border: "2px solid rgba(255,255,255,0.12)", borderRadius: 12,
            background: "rgba(255,255,255,0.06)", color: "#fff",
            outline: "none", boxSizing: "border-box", marginBottom: 12,
          }}
          onFocus={(e) => (e.target.style.borderColor = "#06C167")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Hasło"
          required
          autoComplete={isRegister ? "new-password" : "current-password"}
          style={{
            width: "100%", padding: "12px 16px", fontSize: 14,
            border: "2px solid rgba(255,255,255,0.12)", borderRadius: 12,
            background: "rgba(255,255,255,0.06)", color: "#fff",
            outline: "none", boxSizing: "border-box", marginBottom: 16,
          }}
          onFocus={(e) => (e.target.style.borderColor = "#06C167")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
        />

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 14,
            background: "rgba(217,48,37,0.12)", color: "#ff6b6b",
            fontSize: 13, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 12,
            border: "none", background: "#06C167", color: "#fff",
            fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1, transition: "opacity 0.2s",
          }}
        >
          {loading ? "Proszę czekać..." : isRegister ? "Zarejestruj się" : "Zaloguj się"}
        </button>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            style={{
              background: "none", border: "none", color: "#06C167",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              textDecoration: "underline", textUnderlineOffset: 3,
            }}
          >
            {isRegister ? "Mam już konto — zaloguj się" : "Nie mam konta — zarejestruj się"}
          </button>
        </div>
      </form>
    </div>
  );
}

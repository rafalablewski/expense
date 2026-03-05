# Firestore Schema

## Collections

### `users/{uid}` — Per-user data

```javascript
{
  receipts: [                    // Scanned receipt data
    {
      id: number,
      store: string,
      date: string,              // "YYYY-MM-DD" or "DD.MM.YYYY"
      total: number,
      total_discounts: number,
      address: string,
      zip_code: string,
      items: [
        {
          name: string,
          quantity: number,
          unit_price: number,
          total_price: number,
          category: string,      // One of 29 categories
          discount: number
        }
      ]
    }
  ],
  expenses: [                    // Manual one-time expenses
    {
      id: string,
      name: string,
      amount: number,
      category: string,
      date: string,
      store: string,
      type: "one-time" | "recurring",
      note: string
    }
  ],
  budgets: {                     // Monthly category budgets
    "Nabiał": number,
    "Mięso": number,
    // ... keyed by category name
  },
  recurring: [                   // Subscriptions & recurring payments
    {
      id: string,
      name: string,
      amount: number,
      category: string,
      frequency: "monthly" | "weekly" | "yearly",
      paused: boolean
    }
  ],
  currency: "PLN" | "EUR" | "USD",
  darkMode: boolean,
  onboarded: boolean,
  corrections: {                 // AI learning system
    names: { [original]: corrected },
    categories: { [itemName]: category }
  },
  customStores: [string]         // User-added store names
}
```

### `config/appConfig` — App-level configuration

```javascript
{
  categories: {                  // Category definitions
    "Nabiał": { color: "#0369A1", icon: "🥛", group: "Spożywcze" },
    "Mięso":  { color: "#DC2626", icon: "🥩", group: "Spożywcze" },
    // ... 29 categories total
  },
  categoryGroups: {              // Category groupings
    "Spożywcze": ["Nabiał", "Mięso", "Warzywa", ...],
    "Rachunki": ["Paliwo", "Subskrypcje", ...],
    "Jednorazowe": ["Elektronika", "Odzież", ...]
  },
  defaultStores: [               // Default store suggestions
    "Biedronka", "Auchan", "Lidl", ...
  ],
  fxRates: {                     // Currency exchange rates
    PLN: 1, EUR: 0.234, USD: 0.252
  },
  fxSymbols: {                   // Currency display symbols
    PLN: "zł", EUR: "€", USD: "$"
  }
}
```

### Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /config/{docId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

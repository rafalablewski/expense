# MaszkaApp 💳

AI-powered expense tracker. Scan receipts with Claude Vision, track one-time purchases, manage subscriptions, set budgets, and predict future spending.

## Features

- 📸 **Receipt scanning** — Claude AI reads products, prices, discounts automatically
- ✏️ **Manual expenses** — one-time purchases (tools, appliances, anything) + recurring (subscriptions, rent)
- 🏪 **Store analysis** — spending per store with drilldown
- 💰 **Budgets** — monthly limits per category with alerts
- 📊 **Statistics** — donut chart, bar chart, insight cards
- 📈 **Price inflation** — track how prices change over time
- 🔮 **Prediction** — linear regression forecast for next month
- 🗓️ **AI Meal Planner** — Claude suggests weekly meals from your pantry
- ⬇️ **CSV export** — items or receipts, with date range filter
- 🌙 **Dark mode** — full dark theme
- 💱 **Multi-currency** — PLN / EUR / USD

## Stack

- React 18 + Vite
- Anthropic Claude API (Vision + chat)
- Pure CSS — glass morphism, no UI library
- 29 expense categories

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

> **Note:** Requires Anthropic API access for receipt scanning and AI meal planner. The app calls the API directly from the browser using `anthropic-dangerous-direct-browser-access: true` — suitable for personal use.

## Deploy

```bash
npm run build
# deploy /dist to Vercel, Netlify, or any static host
```

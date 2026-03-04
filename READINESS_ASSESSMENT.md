# MaszkaApp Readiness Assessment

**Date:** 2026-03-04
**Status:** Not Ready

## Build Status

- Builds successfully with `vite build`
- Output: 267.9 kB JS (76 kB gzipped)
- Zero build warnings or errors

## What Works Well

- Feature-rich: receipt scanning, expense tracking, budgets, statistics, inflation tracking, predictions, meal planner, CSV export, dark mode, multi-currency
- Clean build with no warnings
- No TODO/FIXME/HACK markers in codebase
- Dependencies installed and working
- Polish-language UI with glassmorphism design and mobile navigation

## Critical Issues

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | **Missing API key** | Blocker | Both `scanReceipt()` (line 1248) and `callClaude()` (line 1761) call `api.anthropic.com` without an `x-api-key` header. No API key input, no env variable, no localStorage lookup. All AI features fail with 401. |
| 2 | **No data persistence** | Blocker | No localStorage, no database, no backend. All expenses, receipts, and budgets are lost on page refresh. |
| 3 | **Monolith file** | High | Entire app is a single 4,324-line `App.jsx` (183 KB) — all components, styles, API logic, and state in one file. |
| 4 | **No tests** | High | Zero test files, no test framework (Jest/Vitest/Cypress) configured. |
| 5 | **No .env support** | High | No `import.meta.env` usage, no `.env.example` file. |
| 6 | **No CI/CD** | Medium | No GitHub Actions or deployment pipeline. |

## Recommendations (Priority Order)

1. **Add API key management** — prompt user for key on first launch, store in localStorage, pass as `x-api-key` header
2. **Add localStorage persistence** — save/load receipts, expenses, budgets, and settings
3. **Split `App.jsx`** — extract components, hooks, API utils, and styles into separate files
4. **Add Vitest + basic tests** — at minimum, unit tests for data transformations and API parsing
5. **Add `.env.example`** — document required environment variables
6. **Set up CI** — GitHub Actions for build + lint + test

## Verdict

The app builds and renders, but **cannot function** as an expense tracker due to two blockers: broken API calls (no key) and zero data persistence. These must be fixed before the app is usable.

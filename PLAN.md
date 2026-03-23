# Implementation Plan: Store Location Auto-Match + Pending Receipt Queue

## Feature 1: Auto-create store location for known stores at new addresses

### Current state
- `learnStoreLocation()` already auto-creates new store locations when a receipt is confirmed
- `matchStoreAddress()` matches receipt addresses against known locations by exact normalized store name
- Issue: Store name matching is exact — "LIDL Sp. z o.o." won't match "Lidl"

### Changes needed

**A. Fuzzy store name matching in `addressMatcher.js`**
- Add a `fuzzyStoreMatch()` function that normalizes store names more aggressively (strip legal suffixes like "sp. z o.o.", "s.a.", "s.c.", etc.)
- Use this in `matchStoreAddress()` to find relevant locations even when store name has legal suffixes
- When a match is found but at a different address (no address match), auto-set the canonical store name from the known location

**B. Auto-populate canonical store name in `AppDataContext.jsx`**
- In each `process*` function, after `matchStoreAddress`, if the store name matches a known store but with different casing/suffix, replace it with the canonical name
- This ensures "LIDL Sp. z o.o." becomes "Lidl" in the review modal

**C. Visual indicator in `ReceiptReviewModal.jsx`**
- When the receipt has a known store name but new address, show a small "New location" badge next to the address info
- This is informational only — helps user know this location will be auto-saved

### Files to modify
1. `src/utils/addressMatcher.js` — add fuzzy store matching
2. `src/contexts/AppDataContext.jsx` — use canonical store names, pass store info

---

## Feature 2: Pending Receipt Queue (Save for Later)

### Concept
Users can scan a receipt and save it as "pending" instead of immediately confirming. Pending receipts are persisted to Firestore and can be reviewed later.

### Changes needed

**A. State + persistence in `AppDataContext.jsx`**
- Add `pendingReceipts` state (array), persisted to Firestore like `receipts`
- Add `savePending(receipt)` action — saves receipt to pending queue
- Add `confirmPending(id, reviewed)` action — moves from pending to confirmed receipts
- Add `deletePending(id)` action — removes from pending queue
- Add persistence effect for `pendingReceipts` field

**B. Firestore defaults in `firestore.js`**
- Add `pendingReceipts: []` to DEFAULTS

**C. "Save as pending" button in `ReceiptReviewModal.jsx`**
- Add a third button "Save as pending" (between Confirm and Cancel)
- When clicked, calls `onSavePending(data)` callback
- Visual distinction: secondary/outline style button

**D. Wire up in `App.jsx`**
- Pass `savePending` handler to `ReceiptReviewModal` as `onSavePending`
- When saving pending, pop from reviewQueue + save to pendingReceipts

**E. Pending tab in `ReceiptsView.jsx`**
- Add a "Pending" tab (🕐 Oczekujące) to the tab bar
- Show pending receipts as cards with "Review" and "Delete" buttons
- "Review" opens the receipt in ReceiptReviewModal for final confirmation
- Show pending count badge on the tab
- Visual distinction: pending cards have a subtle yellow/orange border or badge

### Files to modify
1. `src/firestore.js` — add default
2. `src/contexts/AppDataContext.jsx` — pendingReceipts state, persistence, actions
3. `src/components/modals/ReceiptReviewModal.jsx` — add "Save as pending" button
4. `src/App.jsx` — wire up savePending, handle pending review flow
5. `src/views/ReceiptsView.jsx` — add Pending tab with cards
6. `src/styles/modals.css` — style pending button
7. `src/styles/components.css` — style pending cards/badges

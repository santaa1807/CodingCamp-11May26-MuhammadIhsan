# Implementation Plan: Expense & Budget Visualizer

## Overview

This plan implements the Expense & Budget Visualizer — a zero-dependency, client-side web application built with plain HTML, CSS, and Vanilla JavaScript. Tasks are ordered so that each layer (scaffolding → structure → styling → logic → tests) builds on the previous one. Property-based tests use fast-check and cover all 8 correctness properties defined in the design document.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4"] },
    { "wave": 5, "tasks": ["5"] },
    { "wave": 6, "tasks": ["6"] },
    { "wave": 7, "tasks": ["7", "8", "9"] },
    { "wave": 8, "tasks": ["10"] },
    { "wave": 9, "tasks": ["11", "12"] },
    { "wave": 10, "tasks": ["13"] }
  ]
}
```

## Tasks

- [x] 1. Project Scaffolding
  - Create the project root directory with the following exact file structure:
    - `index.html` at the project root
    - `css/styles.css` inside a `css/` subdirectory
    - `js/app.js` inside a `js/` subdirectory
  - `index.html` must include:
    - A `<!DOCTYPE html>` declaration and `<html lang="en">` root element
    - A `<meta charset="UTF-8">` and `<meta name="viewport" content="width=device-width, initial-scale=1.0">` in `<head>`
    - A `<link rel="stylesheet" href="css/styles.css">` tag
    - A Chart.js CDN `<script>` tag: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>`
    - A `<script src="js/app.js" defer></script>` tag placed after the Chart.js tag
  - `css/styles.css` and `js/app.js` must be created as empty stub files
  - **Acceptance Criteria:**
    - Exactly one HTML file exists at the project root, one CSS file in `css/`, and one JS file in `js/` (Req 6.1)
    - No package.json, build config, or framework files are present (Req 6.2)
    - Opening `index.html` directly in a browser produces no console errors (Req 6.3)

- [x] 2. HTML Structure and Layout
  - Implement the full semantic HTML skeleton inside `index.html` `<body>`:
    - A `<header>` containing the app title and the `<span id="balance-display">$0.00</span>` balance element
    - A `<main>` section containing:
      - `<form id="expense-form">` with:
        - `<input type="text" id="name-input" maxlength="100">` and `<span class="error" id="name-error"></span>`
        - `<input type="number" id="amount-input" step="0.01" min="0.01">` and `<span class="error" id="amount-error"></span>`
        - `<select id="category-select">` with `<option>` elements for Food, Transport, and Fun
        - `<button type="submit">Add Expense</button>`
      - `<div id="list-container">` wrapping `<ul id="transaction-list"></ul>`
      - `<div id="chart-container">` wrapping `<canvas id="spending-chart"></canvas>`
    - A `<div id="storage-error" role="alert" aria-live="assertive" hidden></div>` for storage error banners
    - All interactive elements must have associated `<label>` elements or `aria-label` attributes
  - **Acceptance Criteria:**
    - All required element IDs are present and match the design spec exactly (Design §Components)
    - The form contains all three input fields and a submit button (Req 1.1)
    - Inline error spans exist for name and amount fields (Req 1.3, 1.5)
    - The transaction list `<ul>` and chart `<canvas>` are present (Req 2.1, 4.1)
    - The storage error banner element is present with `role="alert"` (Req 1.6, 5.6)
    - All form inputs have associated labels (Req 8.3 / WCAG AA)

- [x] 3. CSS Styling
  - Implement all styles in `css/styles.css`:
    - **Layout:** Responsive single-column layout on narrow viewports (≤ 768px) and a two-column layout (form + list on the left, chart on the right) on wider viewports; no horizontal scrolling at any width from 320px to 2560px
    - **Balance Display:** Large, prominent typography; visually distinct from body text
    - **Input Form:** Full-width inputs with clear focus indicators (visible outline); submit button with hover/active states
    - **Error spans:** `.error` class styled in red (`color: #D32F2F` or equivalent with ≥ 4.5:1 contrast on white); hidden by default (empty content collapses them)
    - **Transaction List:** `#list-container` has a fixed `max-height` with `overflow-y: auto` to enable scrolling; each `<li>` displays name, amount, category, and delete button in a single row using flexbox
    - **Delete button:** `.delete-btn` styled as a small icon button; visible focus ring; hover state
    - **Empty state:** `.empty-state` styled with muted/italic text
    - **Chart container:** `#chart-container` constrains the canvas to a reasonable max-width/height
    - **Category colours** (used in chart, may also be used in list badges):
      - Food: `#E07B54`
      - Transport: `#4A90D9`
      - Fun: `#6DBF67`
    - **WCAG AA:** All body text / background pairs must achieve ≥ 4.5:1 contrast ratio
  - **Acceptance Criteria:**
    - No horizontal scroll at 320px, 768px, 1280px, and 1920px viewport widths (Req 7.3, 8.4)
    - Transaction list scrolls when content overflows (Req 2.7)
    - All text/background contrast ratios ≥ 4.5:1 (Req 8.3)
    - Focus indicators are visible on all interactive elements (WCAG AA)
    - No CSS framework or preprocessor is used (Req 6.2)

- [x] 4. State Management and localStorage
  - Implement the **State** and **Storage** sections in `js/app.js`:
    - Declare `let transactions = [];` as the single in-memory source of truth
    - Implement `loadFromStorage()`:
      - Reads `localStorage["transactions"]`
      - Returns `[]` if the key is absent
      - Calls `JSON.parse`; if it throws, calls `console.error` and returns `[]`
      - Returns the parsed array on success
    - Implement `saveToStorage(transactions)`:
      - Calls `JSON.stringify(transactions)` then `localStorage.setItem("transactions", json)`
      - If `setItem` throws, calls `console.error` and returns `{ ok: false, error }`
      - Returns `{ ok: true }` on success
    - Implement `init()` bootstrap:
      - Detects `typeof localStorage === 'undefined'`; if true, shows an unsupported-browser message and halts
      - Calls `loadFromStorage()` and assigns the result to `transactions`
      - Calls `renderAll()` (stub for now)
    - Wire `init()` to `DOMContentLoaded`
  - **Acceptance Criteria:**
    - `loadFromStorage()` returns `[]` for absent key and malformed JSON (Req 5.4)
    - `loadFromStorage()` returns the correct array for valid JSON (Req 5.3)
    - `saveToStorage()` returns `{ ok: true }` on success and `{ ok: false, error }` on `setItem` throw (Req 5.6)
    - `init()` populates `transactions` from storage on page load (Req 5.3)
    - Missing `localStorage` API shows a graceful unsupported-browser message (Req 7.2)
    - `crypto.randomUUID` absence is detected and `Date.now().toString()` is used as fallback (Design §Error Handling)

- [x] 5. Validator Logic
  - Implement `validateForm()` in `js/app.js`:
    - Reads current values from `#name-input`, `#amount-input`, and `#category-select`
    - Returns an error map object `{ name?: string, amount?: string }`
    - **Name validation:** trims the value; if empty string, sets `errors.name = "Item name is required."`
    - **Amount validation:** trims the string value; if empty, non-numeric, zero, negative, or does not match `/^\d+(\.\d{1,2})?$/`, sets `errors.amount = "Enter a positive amount (up to 2 decimal places)."`
    - **Category:** always valid (dropdown with fixed options); no validation needed
    - Returns the errors object (empty object `{}` means valid)
  - Implement `showErrors(errors)` helper:
    - Populates `#name-error` and `#amount-error` spans with the corresponding error strings
    - Clears spans for fields with no error
  - Implement `clearErrors()` helper:
    - Clears both error spans
  - **Acceptance Criteria:**
    - Empty name returns `{ name: "Item name is required." }` (Req 1.3)
    - Whitespace-only name returns a name error (Req 1.3)
    - Amount of `0`, `-1`, `"abc"`, `"1.234"` each return an amount error (Req 1.5)
    - Amount of `"1"`, `"1.5"`, `"1.50"`, `"100.99"` return no amount error (Req 1.5)
    - Valid name + valid amount returns `{}` (Req 1.2)
    - Error spans are populated/cleared correctly by `showErrors` / `clearErrors`

- [x] 6. Transaction Add and Delete Logic
  - Implement `addTransaction(name, amount, category)` in `js/app.js`:
    - Generates a unique `id` using `crypto.randomUUID()` with `Date.now().toString()` fallback
    - Builds a transaction object `{ id, name: name.trim(), amount: parseFloat(amount), category }`
    - Unshifts the object into `transactions` (index 0 = newest)
    - Calls `saveToStorage(transactions)`; if `ok` is false: splices the item back out, shows the storage error banner, and returns without calling `renderAll()`
    - On success: hides the storage error banner, calls `renderAll()`
  - Implement `deleteTransaction(id)` in `js/app.js`:
    - Finds the index of the transaction with the matching `id`
    - Splices it from `transactions`
    - Calls `saveToStorage(transactions)`; if `ok` is false: re-inserts the item at its original index, shows the storage error banner, and returns without calling `renderAll()`
    - On success: hides the storage error banner, calls `renderAll()`
  - Wire the form `submit` event:
    - Calls `validateForm()`; if errors exist, calls `showErrors(errors)` and returns
    - Calls `clearErrors()`, then `addTransaction(...)`, then resets the form
  - **Acceptance Criteria:**
    - Adding a valid transaction prepends it to `transactions` at index 0 (Req 2.3, Design P5)
    - Adding a transaction persists it to `localStorage["transactions"]` (Req 1.2, 5.1)
    - Form resets after successful add (Req 1.4)
    - Deleting a transaction removes it from `transactions` and from `localStorage` (Req 2.4, 5.2)
    - `saveToStorage` failure on add rolls back the in-memory array (Req 1.6, Design P8)
    - `saveToStorage` failure on delete rolls back the in-memory array (Req 5.6, Design P8)
    - Storage error banner is shown on write failure and hidden on success (Req 1.6, 5.6)

- [x] 7. Balance Display Rendering
  - Implement `formatCurrency(value)` in `js/app.js`:
    - Uses `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)`
    - Returns the formatted string (e.g., `$1,234.56`, `-$10.00`, `$0.00`)
  - Implement `renderBalance()` in `js/app.js`:
    - Sums all `transaction.amount` values using `Array.prototype.reduce`
    - Calls `formatCurrency(total)` and sets `document.getElementById('balance-display').textContent`
  - Include `renderBalance()` in `renderAll()`
  - **Acceptance Criteria:**
    - Empty `transactions` array renders `$0.00` (Req 3.4)
    - Known array `[{amount: 4.50}, {amount: 2.00}]` renders `$6.50` (Req 3.1)
    - Negative total renders with minus sign prefix, e.g., `-$10.00` (Req 3.5)
    - Balance updates immediately on add and delete without page reload (Req 3.2, 3.3)
    - Thousands separator is present for values ≥ 1000 (Req 3.1)

- [x] 8. Transaction List Rendering
  - Implement `renderList()` in `js/app.js`:
    - Clears `#transaction-list` (`innerHTML = ''`)
    - If `transactions.length === 0`: appends `<li class="empty-state">No transactions recorded.</li>` and returns
    - Otherwise iterates `transactions` (index 0 first) and for each builds an `<li data-id="{id}">` containing:
      - `<span class="tx-name">{name}</span>`
      - `<span class="tx-amount">{formatCurrency(amount)}</span>`
      - `<span class="tx-category">{category}</span>`
      - `<button class="delete-btn" aria-label="Delete {name}">×</button>`
    - Attaches a `click` event listener to each delete button that calls `deleteTransaction(id)`
  - Include `renderList()` in `renderAll()`
  - **Acceptance Criteria:**
    - Empty array renders the empty-state `<li>` (Req 2.5)
    - After deleting the last transaction, empty-state message appears (Req 2.6)
    - Each row shows name, formatted amount, and category (Req 2.1)
    - Most recently added transaction appears at the top of the list (Req 2.2, 2.3)
    - Each delete button has `aria-label="Delete {name}"` (WCAG AA)
    - Clicking a delete button calls `deleteTransaction` with the correct `id` (Req 2.4)
    - List updates without page reload on add and delete (Req 2.3, 2.4)

- [x] 9. Chart.js Pie Chart Integration and Rendering
  - Declare `let chartInstance = null;` at module scope
  - Implement `aggregateByCategory(transactions)` helper:
    - Returns an object `{ Food: number, Transport: number, Fun: number }` summing amounts per category
    - Only includes categories with a total > 0 in the output labels/data arrays
  - Implement `renderChart()` in `js/app.js`:
    - If `typeof Chart === 'undefined'`: sets `#chart-container` innerHTML to a fallback message ("Chart unavailable — Chart.js could not be loaded.") and returns
    - If `transactions.length === 0`:
      - If `chartInstance` exists: calls `chartInstance.destroy()` and sets `chartInstance = null`
      - Shows placeholder text in `#chart-container` ("No spending data available.")
      - Returns
    - Aggregates category totals via `aggregateByCategory(transactions)`
    - Defines fixed colour map: `{ Food: '#E07B54', Transport: '#4A90D9', Fun: '#6DBF67' }`
    - If `chartInstance` exists: updates `chartInstance.data.labels`, `chartInstance.data.datasets[0].data`, `chartInstance.data.datasets[0].backgroundColor`, then calls `chartInstance.update()`
    - Otherwise: creates a new `Chart(canvas, { type: 'pie', data: {...}, options: { plugins: { legend: { display: true } } } })` and assigns to `chartInstance`
  - Include `renderChart()` in `renderAll()`
  - **Acceptance Criteria:**
    - Pie chart renders with one segment per category that has transactions (Req 4.1)
    - Chart uses Chart.js loaded via CDN (Req 4.2)
    - Chart updates on add and delete without page reload (Req 4.3, 4.4)
    - Zero transactions shows placeholder text, not an empty chart (Req 4.5)
    - Chart legend is visible and maps colours to category labels (Req 4.6)
    - No two categories share the same colour (Req 4.6)
    - CDN failure shows fallback message; rest of app continues to function (Design §Error Handling)
    - Category totals sum to 100% of total spending (Design P7)

- [x] 10. Error Handling
  - Implement the storage error banner:
    - `showStorageError(message)`: sets `#storage-error` `textContent` and removes the `hidden` attribute
    - `hideStorageError()`: adds the `hidden` attribute back
  - Implement the unsupported-browser guard in `init()`:
    - Check `typeof localStorage === 'undefined'`; if true, replace `<body>` content with a user-visible message and call `return` to halt further execution
  - Implement the Chart.js CDN failure guard in `renderChart()` (already specified in Task 9):
    - `typeof Chart === 'undefined'` check with fallback message
  - Implement the `crypto.randomUUID` fallback in `addTransaction()` (already specified in Task 6):
    - `const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()`
  - Implement malformed JSON guard in `loadFromStorage()` (already specified in Task 4):
    - Wrap `JSON.parse` in try/catch; on catch call `console.error` and return `[]`
  - **Acceptance Criteria:**
    - `localStorage` quota exceeded on add: error banner shown, transaction NOT added to list or storage (Req 1.6)
    - `localStorage` quota exceeded on delete: error banner shown, transaction NOT removed from list or storage (Req 5.6)
    - Malformed JSON in storage: app initialises with empty list, no crash (Req 5.4)
    - Missing `localStorage` API: user-visible unsupported-browser message, no JS error (Req 7.2)
    - Chart.js CDN failure: fallback message in chart area, form/list/balance still functional (Design §Error Handling)
    - `crypto.randomUUID` absent: `Date.now().toString()` used as ID, no crash (Design §Error Handling)

- [x] 11. Unit Tests (Example-Based)
  - Set up a test environment:
    - Create `js/app.test.js` (or a `tests/` directory with `unit.test.js`)
    - Use a Node-compatible test runner (e.g., Vitest or Jest) configured to run without a build step, OR write a self-contained browser test harness in `tests/unit.html` using a CDN-loaded test library
    - Export the pure functions from `app.js` (or extract them into a testable module) so they can be imported in tests
  - Write unit tests covering:
    - **`validateForm()`:**
      - Empty name → returns `{ name: "Item name is required." }`
      - Whitespace-only name (`"   "`) → returns name error
      - Amount `"0"` → returns amount error
      - Amount `"-5"` → returns amount error
      - Amount `"1.234"` (3 decimal places) → returns amount error
      - Amount `"abc"` → returns amount error
      - Valid name + amount `"9.99"` → returns `{}`
    - **`formatCurrency()`:**
      - `0` → `"$0.00"`
      - `4.5` → `"$4.50"`
      - `-10` → `"-$10.00"`
      - `1234.56` → `"$1,234.56"`
    - **`loadFromStorage()`:**
      - Absent key → returns `[]`
      - Valid JSON string → returns correct array
      - Malformed JSON → returns `[]` and calls `console.error`
    - **`saveToStorage()`:**
      - Normal call → returns `{ ok: true }` and value is stored
      - Mock `setItem` throws → returns `{ ok: false, error }` and calls `console.error`
    - **`renderBalance()`:**
      - Empty array → `#balance-display` shows `"$0.00"`
      - `[{amount: 4.50}, {amount: 2.00}]` → `#balance-display` shows `"$6.50"`
    - **`deleteTransaction(id)`:**
      - Known ID in array → array length decreases by 1, ID no longer present
  - **Acceptance Criteria:**
    - All unit tests pass (green)
    - Tests cover all scenarios listed above
    - No mocks are used to fake the core logic under test (only `localStorage` may be mocked for storage tests)
    - Tests run without a server (file:// or Node environment)

- [ ] 12. Property-Based Tests (fast-check)
  - Set up fast-check:
    - Install `fast-check` as a dev dependency (`npm install --save-dev fast-check`) OR load it via CDN in a browser test harness
    - Create `tests/property.test.js` (or equivalent)
  - Implement all 8 properties from the design document. Each test must include the comment tag:
    `// Feature: expense-budget-visualizer, Property N: <property text>`
  - **Generators to define:**
    - `validTransaction`: `fc.record({ id: fc.uuidV(4), name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), amount: fc.float({ min: 0.01, max: 9999.99, noNaN: true }).map(n => Math.round(n * 100) / 100), category: fc.constantFrom('Food', 'Transport', 'Fun') })`
    - `whitespaceString`: `fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 })`
    - `invalidAmount`: `fc.oneof(fc.constant('0'), fc.constant('-1'), fc.constant('abc'), fc.constant('1.234'), fc.constant(''), fc.double({ max: 0, noNaN: true }).map(String))`
  - **P1 — Serialisation Round-Trip** (`// Property 1`):
    - `fc.array(validTransaction)` → `JSON.parse(JSON.stringify(arr))` deep-equals `arr`
    - **Validates: Requirements 5.1, 5.2, 5.5**
  - **P2 — Balance Equals Sum** (`// Property 2`):
    - `fc.array(validTransaction, { minLength: 1 })` → `computeBalance(arr) === arr.reduce((s,t) => s + t.amount, 0)` (use a tolerance of `1e-9` for floating-point)
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - **P3 — Whitespace Names Rejected** (`// Property 3`):
    - `whitespaceString` → `validateForm({ name: s, amount: '1.00', category: 'Food' }).name` is defined
    - **Validates: Requirements 1.3**
  - **P4 — Invalid Amounts Rejected** (`// Property 4`):
    - `invalidAmount` → `validateForm({ name: 'Test', amount: v, category: 'Food' }).amount` is defined
    - **Validates: Requirements 1.5**
  - **P5 — Add Grows List by One** (`// Property 5`):
    - `fc.array(validTransaction)` + `validTransaction` → after `addTransaction`, `transactions.length === before + 1` and `transactions[0].id === newTx.id`
    - **Validates: Requirements 1.2, 2.3**
  - **P6 — Delete Shrinks List by One** (`// Property 6`):
    - `fc.array(validTransaction, { minLength: 1 })` + pick random index → after `deleteTransaction(id)`, `transactions.length === before - 1` and no item with that `id` remains
    - **Validates: Requirements 2.4**
  - **P7 — Chart Aggregation Covers 100%** (`// Property 7`):
    - `fc.array(validTransaction, { minLength: 1 })` → `Object.values(aggregateByCategory(arr)).reduce((s,v) => s+v, 0)` equals `arr.reduce((s,t) => s+t.amount, 0)` (tolerance `1e-9`)
    - **Validates: Requirements 4.1**
  - **P8 — Write Failure Rolls Back State** (`// Property 8`):
    - `fc.array(validTransaction)` + mock `setItem` that throws → after failed `saveToStorage`, in-memory array equals pre-call snapshot and `localStorage["transactions"]` equals pre-call value
    - **Validates: Requirements 1.6, 5.6**
  - Each property must run a minimum of 100 iterations (`{ numRuns: 100 }`)
  - **Acceptance Criteria:**
    - All 8 property tests pass
    - Each test has the required comment tag referencing the property number
    - Each test references the correct requirements in a `// Validates: Requirements X.Y` comment
    - Minimum 100 iterations per property
    - Tests are runnable in Node without a browser

- [~] 13. Integration / Smoke Tests and Accessibility Checks
  - **Integration / Smoke Tests** (manual checklist or automated with Playwright/Puppeteer):
    - Open `index.html` in Chrome, Firefox, Edge, and Safari; verify zero console errors on load (Req 7.1)
    - Add a transaction (e.g., "Coffee", $4.50, Food); verify it appears at the top of the list, balance shows `$4.50`, and chart shows a Food segment (Req 1.2, 2.3, 3.2, 4.3)
    - Refresh the page; verify the transaction is restored from `localStorage` (Req 5.3)
    - Delete the transaction; verify the list shows the empty-state message, balance shows `$0.00`, and chart shows the placeholder (Req 2.4, 2.6, 3.3, 4.5)
    - Add multiple transactions across all three categories; verify chart shows three segments (Req 4.1)
    - Simulate `localStorage` full by overriding `setItem` to throw; verify error banner appears and no data is lost (Req 1.6, 5.6)
    - Resize viewport to 320px; verify no horizontal scroll and no overlapping components (Req 7.3)
    - Resize viewport to 2560px; verify layout is still usable (Req 7.3)
    - Submit the form with an empty name; verify inline error appears and no transaction is added (Req 1.3)
    - Submit the form with amount `0`; verify inline error appears (Req 1.5)
  - **Accessibility Checks:**
    - Run axe-core or Lighthouse against `index.html`; verify zero WCAG AA violations (Req 8.3)
    - Verify all delete buttons have `aria-label="Delete {name}"` (WCAG AA)
    - Verify `#storage-error` has `role="alert"` and `aria-live="assertive"` (WCAG AA)
    - Verify all form inputs have associated `<label>` elements (WCAG AA)
    - Verify colour contrast ratios ≥ 4.5:1 for all text/background pairs using a contrast checker (Req 8.3)
    - Verify keyboard navigation: Tab through all interactive elements in logical order; Enter/Space activates buttons (WCAG AA)
  - **Acceptance Criteria:**
    - All smoke test scenarios pass in all four target browsers (Req 7.1)
    - Zero WCAG AA violations reported by axe-core or Lighthouse (Req 8.3)
    - All interactive elements are keyboard-accessible (WCAG AA)
    - All delete buttons have correct `aria-label` values (WCAG AA)
    - App loads and restores data within 2 seconds on a 10 Mbps connection (Req 8.1)
    - UI updates (add/delete) complete within 100 milliseconds (Req 8.2)

## Notes

- Tasks 7, 8, and 9 (Balance, List, and Chart rendering) can be implemented in parallel since they are independent render functions that all read from the shared `transactions` array.
- Task 10 (Error Handling) consolidates guards that are partially introduced in Tasks 4, 6, and 9; it serves as a hardening pass to ensure all error paths are complete and consistent.
- Tasks 11 and 12 (Unit and Property-Based Tests) require that the pure logic functions (`validateForm`, `formatCurrency`, `loadFromStorage`, `saveToStorage`, `aggregateByCategory`, `computeBalance`) are exported or otherwise accessible outside the browser context. Consider structuring `app.js` with a conditional export block: `if (typeof module !== 'undefined') { module.exports = { ... }; }`.
- Property-based tests (Task 12) use fast-check. The `validTransaction` generator constrains `amount` to at most 2 decimal places via `Math.round(n * 100) / 100` to match the validator's rules.
- Task 13 integration tests are primarily manual; if Playwright is available in the environment, they can be automated. The accessibility checks can be automated with `axe-core` via its Node API or browser DevTools extension.

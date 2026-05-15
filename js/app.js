/* ============================================================
   Expense & Budget Visualizer — app.js
   Zero-dependency, plain Vanilla JavaScript
   ============================================================ */

/* ============================================================
   STATE
   Single source of truth. Index 0 = most recently added.
   ============================================================ */

let transactions = [];

/* Chart.js instance — persisted across renders so we can update in-place */
let chartInstance = null;

/* ============================================================
   UTILITY
   ============================================================ */

/**
 * Generate a unique ID for a transaction.
 * Prefers crypto.randomUUID(); falls back to Date.now().toString()
 * when the API is unavailable (e.g. non-secure contexts, older browsers).
 *
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: Date.now() + random suffix to reduce collision risk
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

/* ============================================================
   STORAGE
   All localStorage I/O is isolated here so the rest of the
   app never touches localStorage directly.
   ============================================================ */

/**
 * Read and deserialise the transaction list from localStorage.
 *
 * - Returns [] if the key is absent.
 * - Returns [] (and logs to console) if the stored value is malformed JSON.
 * - Returns the parsed array on success.
 *
 * @returns {Array}
 */
function loadFromStorage() {
  const raw = localStorage.getItem('transactions');

  // Key absent
  if (raw === null) {
    return [];
  }

  // Attempt to parse
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('[loadFromStorage] Failed to parse stored transactions:', err);
    return [];
  }
}

/**
 * Serialise and persist the transaction list to localStorage.
 *
 * @param {Array} txList - The current in-memory transaction array.
 * @returns {{ ok: boolean, error?: Error }}
 */
function saveToStorage(txList) {
  const json = JSON.stringify(txList);
  try {
    localStorage.setItem('transactions', json);
    return { ok: true };
  } catch (err) {
    console.error('[saveToStorage] Failed to write to localStorage:', err);
    return { ok: false, error: err };
  }
}

/* ============================================================
   VALIDATOR
   ============================================================ */

/**
 * Validate the expense form inputs.
 *
 * Supports an optional `overrides` parameter for testability in Node
 * environments where the DOM is unavailable.
 *
 * @param {{ name?: string, amount?: string, category?: string }} [overrides]
 *   When provided, these values are used instead of reading from the DOM.
 * @returns {{ name?: string, amount?: string }}
 *   An error map. An empty object `{}` means all fields are valid.
 */
function validateForm(overrides) {
  // Read values — prefer overrides (for unit tests), fall back to DOM
  let nameVal, amountVal;

  if (overrides !== undefined) {
    nameVal   = overrides.name   !== undefined ? String(overrides.name)   : '';
    amountVal = overrides.amount !== undefined ? String(overrides.amount) : '';
  } else {
    nameVal   = document.getElementById('name-input').value;
    amountVal = document.getElementById('amount-input').value;
  }

  const errors = {};

  // --- Name validation ---
  if (nameVal.trim() === '') {
    errors.name = 'Item name is required.';
  }

  // --- Amount validation ---
  const trimmedAmount = amountVal.trim();
  const amountRegex   = /^\d+(\.\d{1,2})?$/;
  const numericValue  = parseFloat(trimmedAmount);

  if (
    trimmedAmount === '' ||
    !amountRegex.test(trimmedAmount) ||
    isNaN(numericValue) ||
    numericValue <= 0
  ) {
    errors.amount = 'Enter a positive amount (up to 2 decimal places).';
  }

  return errors;
}

/**
 * Populate the inline error spans with messages from the errors map.
 * Clears spans for fields that have no error.
 *
 * @param {{ name?: string, amount?: string }} errors
 */
function showErrors(errors) {
  const nameSpan   = document.getElementById('name-error');
  const amountSpan = document.getElementById('amount-error');

  nameSpan.textContent   = errors.name   || '';
  amountSpan.textContent = errors.amount || '';
}

/**
 * Clear both inline error spans.
 */
function clearErrors() {
  document.getElementById('name-error').textContent   = '';
  document.getElementById('amount-error').textContent = '';
}

/* ============================================================
   STORAGE ERROR BANNER
   ============================================================ */

/**
 * Show the storage error banner with a given message.
 *
 * @param {string} message
 */
function showStorageError(message) {
  const banner = document.getElementById('storage-error');
  if (banner) {
    banner.textContent = message;
    banner.removeAttribute('hidden');
  }
}

/**
 * Hide the storage error banner.
 */
function hideStorageError() {
  const banner = document.getElementById('storage-error');
  if (banner) {
    banner.setAttribute('hidden', '');
  }
}

/* ============================================================
   TRANSACTION MUTATIONS
   ============================================================ */

/**
 * Add a new transaction to the in-memory array and persist it.
 *
 * - Generates a unique id (crypto.randomUUID with Date.now fallback).
 * - Unshifts the new object so index 0 is always the newest.
 * - Rolls back and shows the error banner if localStorage write fails.
 * - Hides the error banner and calls renderAll() on success.
 *
 * @param {string} name
 * @param {string|number} amount
 * @param {string} category
 */
function addTransaction(name, amount, category) {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString();

  const tx = {
    id,
    name: name.trim(),
    amount: parseFloat(amount),
    category,
  };

  transactions.unshift(tx);

  const result = saveToStorage(transactions);

  if (!result.ok) {
    // Rollback: remove the item we just added at index 0
    transactions.splice(0, 1);
    showStorageError(
      'Unable to save your transaction — storage quota may be exceeded. Please free up space and try again.'
    );
    return;
  }

  hideStorageError();
  renderAll();
}

/**
 * Delete a transaction by id from the in-memory array and persist the change.
 *
 * - Finds the item's index, splices it out.
 * - Rolls back and shows the error banner if localStorage write fails.
 * - Hides the error banner and calls renderAll() on success.
 *
 * @param {string} id
 */
function deleteTransaction(id) {
  const index = transactions.findIndex((tx) => tx.id === id);

  if (index === -1) {
    return; // id not found — nothing to do
  }

  const [removed] = transactions.splice(index, 1);

  const result = saveToStorage(transactions);

  if (!result.ok) {
    // Rollback: re-insert the removed item at its original position
    transactions.splice(index, 0, removed);
    showStorageError(
      'Unable to delete the transaction — storage quota may be exceeded. Please free up space and try again.'
    );
    return;
  }

  hideStorageError();
  renderAll();
}

/* ============================================================
   BALANCE DISPLAY
   ============================================================ */

/**
 * Format a numeric value as a USD currency string.
 *
 * Uses the native Intl.NumberFormat API for locale-aware formatting:
 * - Positive: "$1,234.56"
 * - Zero:     "$0.00"
 * - Negative: "-$10.00"
 *
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/**
 * Compute the numeric balance from an array of transactions.
 * Pure helper — does not touch the DOM or global state.
 *
 * @param {Array<{ amount: number }>} arr
 * @returns {number}
 */
function computeBalance(arr) {
  return arr.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Render the current balance into #balance-display.
 * Reads from the global `transactions` array.
 */
function renderBalance() {
  const total = computeBalance(transactions);
  const el = document.getElementById('balance-display');
  if (el) {
    el.textContent = formatCurrency(total);
  }
}

/* ============================================================
   CHART HELPERS
   ============================================================ */

/**
 * Aggregate transaction amounts by category.
 *
 * Always returns an object with all three category keys.
 * Categories with no transactions will have a value of 0.
 *
 * @param {Array<{ category: string, amount: number }>} txList
 * @returns {{ Food: number, Transport: number, Fun: number }}
 */
function aggregateByCategory(txList) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  for (const tx of txList) {
    if (totals[tx.category] !== undefined) {
      totals[tx.category] += tx.amount;
    }
  }
  return totals;
}

/**
 * Render (or update) the Chart.js pie chart inside #chart-container.
 *
 * - If Chart.js is not available, shows a fallback message.
 * - If there are no transactions, destroys any existing chart and shows
 *   a placeholder message.
 * - Otherwise creates a new chart or updates the existing one in-place.
 */
function renderChart() {
  const container = document.getElementById('chart-container');

  // Guard: Chart.js CDN failed to load
  if (typeof Chart === 'undefined') {
    if (container) {
      container.innerHTML = 'Chart unavailable — Chart.js could not be loaded.';
    }
    return;
  }

  // Guard: no transactions — show placeholder, destroy stale chart
  if (transactions.length === 0) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    if (container) {
      container.innerHTML = '<canvas id="spending-chart"></canvas>';
      // Replace canvas with plain text placeholder
      container.innerHTML = 'No spending data available.';
    }
    return;
  }

  // Aggregate totals and build chart data arrays
  const totals = aggregateByCategory(transactions);

  const colourMap = {
    Food:      '#E07B54',
    Transport: '#4A90D9',
    Fun:       '#6DBF67',
  };

  const labels          = [];
  const data            = [];
  const backgroundColor = [];

  for (const [category, total] of Object.entries(totals)) {
    if (total > 0) {
      labels.push(category);
      data.push(total);
      backgroundColor.push(colourMap[category]);
    }
  }

  if (chartInstance) {
    // Update existing chart in-place (no flicker, no full re-create)
    chartInstance.data.labels                        = labels;
    chartInstance.data.datasets[0].data              = data;
    chartInstance.data.datasets[0].backgroundColor   = backgroundColor;
    chartInstance.update();
  } else {
    // Ensure the canvas element is present (may have been replaced by placeholder text)
    if (container && !document.getElementById('spending-chart')) {
      container.innerHTML = '<canvas id="spending-chart"></canvas>';
    }

    const canvas = document.getElementById('spending-chart');
    if (!canvas) return;

    chartInstance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
          },
        },
      },
    });
  }
}

/* ============================================================
   TRANSACTION LIST RENDERING
   ============================================================ */

/**
 * Re-render the transaction list from the current `transactions` array.
 *
 * - Clears #transaction-list (innerHTML = '').
 * - If transactions is empty, appends a single empty-state <li> and returns.
 * - Otherwise iterates transactions (index 0 first) and for each builds an
 *   <li data-id="{id}"> containing name, formatted amount, category, and a
 *   delete button with aria-label="Delete {name}".
 * - Attaches a click event listener to each delete button that calls
 *   deleteTransaction(id).
 */
function renderList() {
  const ul = document.getElementById('transaction-list');
  if (!ul) return;

  // Clear existing content
  ul.innerHTML = '';

  // Empty state
  if (transactions.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-state';
    emptyItem.textContent = 'No transactions recorded.';
    ul.appendChild(emptyItem);
    return;
  }

  // Build one row per transaction (index 0 = most recently added → top of list)
  transactions.forEach(function (tx) {
    const li = document.createElement('li');
    li.setAttribute('data-id', tx.id);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tx-name';
    nameSpan.textContent = tx.name;

    const amountSpan = document.createElement('span');
    amountSpan.className = 'tx-amount';
    amountSpan.textContent = formatCurrency(tx.amount);

    const categorySpan = document.createElement('span');
    categorySpan.className = 'tx-category';
    categorySpan.textContent = tx.category;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('aria-label', 'Delete ' + tx.name);
    deleteBtn.textContent = '\u00d7'; // ×

    // Capture id in closure so the click handler always references the correct id
    (function (id) {
      deleteBtn.addEventListener('click', function () {
        deleteTransaction(id);
      });
    }(tx.id));

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteBtn);

    ul.appendChild(li);
  });
}

/* ============================================================
   RENDER ALL
   ============================================================ */

/**
 * Re-render all UI components from the current `transactions` array.
 */
function renderAll() {
  renderBalance();
  renderList();
  renderChart();
}

/* ============================================================
   CONTROLLER — init
   ============================================================ */

/**
 * Bootstrap the application.
 *
 * 1. Detect missing localStorage (unsupported browser) and halt gracefully.
 * 2. Load persisted transactions into the in-memory array.
 * 3. Render the initial UI.
 */
function init() {
  // Req 7.2 — graceful unsupported-browser message when localStorage is absent
  if (typeof localStorage === 'undefined') {
    document.body.innerHTML =
      '<p style="padding:2rem;font-family:sans-serif;color:#c0392b;">' +
      'Your browser does not support localStorage. ' +
      'Please use a modern browser (Chrome, Firefox, Edge, or Safari) to run this app.' +
      '</p>';
    return; // halt
  }

  // Req 5.3 — populate in-memory array from storage on page load
  transactions = loadFromStorage();

  // Wire the expense form submit event
  const form = document.getElementById('expense-form');
  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      const errors = validateForm();

      if (Object.keys(errors).length > 0) {
        showErrors(errors);
        return;
      }

      clearErrors();

      const name     = document.getElementById('name-input').value;
      const amount   = document.getElementById('amount-input').value;
      const category = document.getElementById('category-select').value;

      addTransaction(name, amount, category);

      form.reset();
    });
  }

  // Render initial UI (stub for now)
  renderAll();
}

// Wire init() to DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);

/* ============================================================
   TEST HELPERS
   State accessors used by both Node and browser test environments.
   These are plain functions so they are accessible as globals in
   the browser (where `let transactions` is not on `window`).
   ============================================================ */

/**
 * Return the current in-memory transactions array.
 * Used by tests to inspect state without touching the DOM.
 * @returns {Array}
 */
function getTransactions() {
  return transactions;
}

/**
 * Replace the in-memory transactions array.
 * Used by tests to set up a known state before exercising a function.
 * @param {Array} arr
 */
function setTransactions(arr) {
  transactions = arr;
}

/* ============================================================
   EXPORTS (Node / test environment only)
   Allows unit and property-based tests to import individual
   functions without a browser environment.
   ============================================================ */
if (typeof module !== 'undefined') {
  module.exports = {
    generateId,
    loadFromStorage,
    saveToStorage,
    validateForm,
    showErrors,
    clearErrors,
    showStorageError,
    hideStorageError,
    addTransaction,
    deleteTransaction,
    aggregateByCategory,
    formatCurrency,
    computeBalance,
    renderBalance,
    renderList,
    renderAll,
    init,
    getTransactions,
    setTransactions,
  };
}

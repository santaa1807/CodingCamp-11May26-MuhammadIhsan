<<<<<<< HEAD
/**
 * Unit Tests (Example-Based) — Expense & Budget Visualizer
 *
 * Covers: validateForm, formatCurrency, loadFromStorage, saveToStorage,
 *         renderBalance, deleteTransaction
 *
 * Test runner: Vitest (jsdom environment)
 * Run with:   npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

// ---------------------------------------------------------------------------
// Bootstrap a minimal DOM so app.js can be required without crashing.
// jsdom is provided by the Vitest environment.
// ---------------------------------------------------------------------------
function setupDOM() {
  document.body.innerHTML = `
    <span id="balance-display">$0.00</span>
    <form id="expense-form">
      <input type="text"   id="name-input"       value="" />
      <span  class="error" id="name-error"></span>
      <input type="number" id="amount-input"      value="" />
      <span  class="error" id="amount-error"></span>
      <select id="category-select">
        <option value="Food">Food</option>
        <option value="Transport">Transport</option>
        <option value="Fun">Fun</option>
      </select>
      <button type="submit">Add Expense</button>
    </form>
    <ul id="transaction-list"></ul>
    <div id="chart-container"><canvas id="spending-chart"></canvas></div>
    <div id="storage-error" role="alert" aria-live="assertive" hidden></div>
  `;
}

// Set up DOM before requiring app.js so the module-level addEventListener
// call finds a valid document.
setupDOM();

// app.js uses CommonJS module.exports — use createRequire for ESM interop.
const require = createRequire(import.meta.url);
const app = require('./app.js');

const {
  validateForm,
  formatCurrency,
  loadFromStorage,
  saveToStorage,
  renderBalance,
  deleteTransaction,
  setTransactions,
  getTransactions,
} = app;

// ===========================================================================
// 1. validateForm()
// ===========================================================================

describe('validateForm()', () => {
  it('empty name → returns name error', () => {
    const errors = validateForm({ name: '', amount: '9.99', category: 'Food' });
    expect(errors.name).toBe('Item name is required.');
    expect(errors.amount).toBeUndefined();
  });

  it('whitespace-only name ("   ") → returns name error', () => {
    const errors = validateForm({ name: '   ', amount: '9.99', category: 'Food' });
    expect(errors.name).toBe('Item name is required.');
  });

  it('amount "0" → returns amount error', () => {
    const errors = validateForm({ name: 'Coffee', amount: '0', category: 'Food' });
    expect(errors.amount).toBeDefined();
    expect(errors.name).toBeUndefined();
  });

  it('amount "-5" → returns amount error', () => {
    const errors = validateForm({ name: 'Coffee', amount: '-5', category: 'Food' });
    expect(errors.amount).toBeDefined();
  });

  it('amount "1.234" (3 decimal places) → returns amount error', () => {
    const errors = validateForm({ name: 'Coffee', amount: '1.234', category: 'Food' });
    expect(errors.amount).toBeDefined();
  });

  it('amount "abc" → returns amount error', () => {
    const errors = validateForm({ name: 'Coffee', amount: 'abc', category: 'Food' });
    expect(errors.amount).toBeDefined();
  });

  it('valid name + amount "9.99" → returns {}', () => {
    const errors = validateForm({ name: 'Coffee', amount: '9.99', category: 'Food' });
    expect(errors).toEqual({});
  });
});

// ===========================================================================
// 2. formatCurrency()
// ===========================================================================

describe('formatCurrency()', () => {
  it('0 → "$0.00"', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('4.5 → "$4.50"', () => {
    expect(formatCurrency(4.5)).toBe('$4.50');
  });

  it('-10 → "-$10.00"', () => {
    expect(formatCurrency(-10)).toBe('-$10.00');
  });

  it('1234.56 → "$1,234.56"', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});

// ===========================================================================
// 3. loadFromStorage()
// ===========================================================================

describe('loadFromStorage()', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('absent key → returns []', () => {
    const result = loadFromStorage();
    expect(result).toEqual([]);
  });

  it('valid JSON string → returns correct array', () => {
    const data = [
      { id: '1', name: 'Coffee', amount: 4.5, category: 'Food' },
      { id: '2', name: 'Bus',    amount: 2.0, category: 'Transport' },
    ];
    localStorage.setItem('transactions', JSON.stringify(data));
    const result = loadFromStorage();
    expect(result).toEqual(data);
  });

  it('malformed JSON → returns [] and calls console.error', () => {
    localStorage.setItem('transactions', '{not valid json}');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = loadFromStorage();

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

// ===========================================================================
// 4. saveToStorage()
// ===========================================================================

describe('saveToStorage()', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normal call → returns { ok: true } and value is stored', () => {
    const data = [{ id: '1', name: 'Coffee', amount: 4.5, category: 'Food' }];
    const result = saveToStorage(data);
    expect(result).toEqual({ ok: true });
    expect(localStorage.getItem('transactions')).toBe(JSON.stringify(data));
  });

  it('mock setItem throws → returns { ok: false, error } and calls console.error', () => {
    const mockError = new Error('QuotaExceededError');
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => { throw mockError; });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = saveToStorage([{ id: '1', name: 'Test', amount: 1, category: 'Fun' }]);

    expect(result.ok).toBe(false);
    expect(result.error).toBe(mockError);
    expect(errorSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

// ===========================================================================
// 5. renderBalance()
// ===========================================================================

describe('renderBalance()', () => {
  beforeEach(() => {
    setupDOM();
    setTransactions([]);
  });

  it('empty array → #balance-display shows "$0.00"', () => {
    setTransactions([]);
    renderBalance();
    expect(document.getElementById('balance-display').textContent).toBe('$0.00');
  });

  it('[{amount:4.50},{amount:2.00}] → #balance-display shows "$6.50"', () => {
    setTransactions([
      { id: '1', name: 'Coffee', amount: 4.50, category: 'Food' },
      { id: '2', name: 'Bus',    amount: 2.00, category: 'Transport' },
    ]);
    renderBalance();
    expect(document.getElementById('balance-display').textContent).toBe('$6.50');
  });
});

// ===========================================================================
// 6. deleteTransaction(id)
// ===========================================================================

describe('deleteTransaction(id)', () => {
  beforeEach(() => {
    setupDOM();
    localStorage.clear();
  });

  it('known ID in array → array length decreases by 1, ID no longer present', () => {
    const initial = [
      { id: 'aaa', name: 'Coffee', amount: 4.5,  category: 'Food' },
      { id: 'bbb', name: 'Bus',    amount: 2.0,  category: 'Transport' },
      { id: 'ccc', name: 'Movie',  amount: 12.0, category: 'Fun' },
    ];
    setTransactions([...initial]);
    localStorage.setItem('transactions', JSON.stringify(initial));

    const beforeLength = getTransactions().length;
    deleteTransaction('bbb');

    const after = getTransactions();
    expect(after.length).toBe(beforeLength - 1);
    expect(after.find((tx) => tx.id === 'bbb')).toBeUndefined();
  });
});
=======
/**
 * Unit Tests (Example-Based) — Expense & Budget Visualizer
 *
 * Covers: validateForm, formatCurrency, loadFromStorage, saveToStorage,
 *         renderBalance, deleteTransaction
 *
 * Test runner: Vitest (jsdom environment)
 * Run with:   npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

// ---------------------------------------------------------------------------
// Bootstrap a minimal DOM so app.js can be required without crashing.
// jsdom is provided by the Vitest environment.
// ---------------------------------------------------------------------------
function setupDOM() {
  document.body.innerHTML = `
    <span id="balance-display">$0.00</span>
    <form id="expense-form">
      <input type="text"   id="name-input"       value="" />
      <span  class="error" id="name-error"></span>
      <input type="number" id="amount-input"      value="" />
      <span  class="error" id="amount-error"></span>
      <select id="category-select">
        <option value="Food">Food</option>
        <option value="Transport">Transport</option>
        <option value="Fun">Fun</option>
      </select>
      <button type="submit">Add Expense</button>
    </form>
    <ul id="transaction-list"></ul>
    <div id="chart-container"><canvas id="spending-chart"></canvas></div>
    <div id="storage-error" role="alert" aria-live="assertive" hidden></div>
  `;
}

// Set up DOM before requiring app.js so the module-level addEventListener
// call finds a valid document.
setupDOM();

// app.js uses CommonJS module.exports — use createRequire for ESM interop.
const require = createRequire(import.meta.url);
const app = require('./app.js');

const {
  validateForm,
  formatCurrency,
  loadFromStorage,
  saveToStorage,
  renderBalance,
  deleteTransaction,
  setTransactions,
  getTransactions,
} = app;

// ===========================================================================
// 1. validateForm()
// ===========================================================================

describe('validateForm()', () => {
  it('empty name → returns name error', () => {
    const errors = validateForm({ name: '', amount: '9.99', category: 'Food' });
    expect(errors.name).toBe('Item name is required.');
    expect(errors.amount).toBeUndefined();
  });

  it('whitespace-only name ("   ") → returns name error', () => {
    const errors = validateForm({ name: '   ', amount: '9.99', category: 'Food' });
    expect(errors.name).toBe('Item name is required.');
  });

  it('amount "0" → returns amount error', () => {
    const errors = validateForm({ name: 'Coffee', amount: '0', category: 'Food' });
    expect(errors.amount).toBeDefined();
    expect(errors.name).toBeUndefined();
  });

  it('amount "-5" → returns amount error', () => {
    const errors = validateForm({ name: 'Coffee', amount: '-5', category: 'Food' });
    expect(errors.amount).toBeDefined();
  });

  it('amount "1.234" (3 decimal places) → returns amount error', () => {
    const errors = validateForm({ name: 'Coffee', amount: '1.234', category: 'Food' });
    expect(errors.amount).toBeDefined();
  });

  it('amount "abc" → returns amount error', () => {
    const errors = validateForm({ name: 'Coffee', amount: 'abc', category: 'Food' });
    expect(errors.amount).toBeDefined();
  });

  it('valid name + amount "9.99" → returns {}', () => {
    const errors = validateForm({ name: 'Coffee', amount: '9.99', category: 'Food' });
    expect(errors).toEqual({});
  });
});

// ===========================================================================
// 2. formatCurrency()
// ===========================================================================

describe('formatCurrency()', () => {
  it('0 → "$0.00"', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('4.5 → "$4.50"', () => {
    expect(formatCurrency(4.5)).toBe('$4.50');
  });

  it('-10 → "-$10.00"', () => {
    expect(formatCurrency(-10)).toBe('-$10.00');
  });

  it('1234.56 → "$1,234.56"', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});

// ===========================================================================
// 3. loadFromStorage()
// ===========================================================================

describe('loadFromStorage()', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('absent key → returns []', () => {
    const result = loadFromStorage();
    expect(result).toEqual([]);
  });

  it('valid JSON string → returns correct array', () => {
    const data = [
      { id: '1', name: 'Coffee', amount: 4.5, category: 'Food' },
      { id: '2', name: 'Bus',    amount: 2.0, category: 'Transport' },
    ];
    localStorage.setItem('transactions', JSON.stringify(data));
    const result = loadFromStorage();
    expect(result).toEqual(data);
  });

  it('malformed JSON → returns [] and calls console.error', () => {
    localStorage.setItem('transactions', '{not valid json}');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = loadFromStorage();

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

// ===========================================================================
// 4. saveToStorage()
// ===========================================================================

describe('saveToStorage()', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normal call → returns { ok: true } and value is stored', () => {
    const data = [{ id: '1', name: 'Coffee', amount: 4.5, category: 'Food' }];
    const result = saveToStorage(data);
    expect(result).toEqual({ ok: true });
    expect(localStorage.getItem('transactions')).toBe(JSON.stringify(data));
  });

  it('mock setItem throws → returns { ok: false, error } and calls console.error', () => {
    const mockError = new Error('QuotaExceededError');
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => { throw mockError; });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = saveToStorage([{ id: '1', name: 'Test', amount: 1, category: 'Fun' }]);

    expect(result.ok).toBe(false);
    expect(result.error).toBe(mockError);
    expect(errorSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

// ===========================================================================
// 5. renderBalance()
// ===========================================================================

describe('renderBalance()', () => {
  beforeEach(() => {
    setupDOM();
    setTransactions([]);
  });

  it('empty array → #balance-display shows "$0.00"', () => {
    setTransactions([]);
    renderBalance();
    expect(document.getElementById('balance-display').textContent).toBe('$0.00');
  });

  it('[{amount:4.50},{amount:2.00}] → #balance-display shows "$6.50"', () => {
    setTransactions([
      { id: '1', name: 'Coffee', amount: 4.50, category: 'Food' },
      { id: '2', name: 'Bus',    amount: 2.00, category: 'Transport' },
    ]);
    renderBalance();
    expect(document.getElementById('balance-display').textContent).toBe('$6.50');
  });
});

// ===========================================================================
// 6. deleteTransaction(id)
// ===========================================================================

describe('deleteTransaction(id)', () => {
  beforeEach(() => {
    setupDOM();
    localStorage.clear();
  });

  it('known ID in array → array length decreases by 1, ID no longer present', () => {
    const initial = [
      { id: 'aaa', name: 'Coffee', amount: 4.5,  category: 'Food' },
      { id: 'bbb', name: 'Bus',    amount: 2.0,  category: 'Transport' },
      { id: 'ccc', name: 'Movie',  amount: 12.0, category: 'Fun' },
    ];
    setTransactions([...initial]);
    localStorage.setItem('transactions', JSON.stringify(initial));

    const beforeLength = getTransactions().length;
    deleteTransaction('bbb');

    const after = getTransactions();
    expect(after.length).toBe(beforeLength - 1);
    expect(after.find((tx) => tx.id === 'bbb')).toBeUndefined();
  });
});
>>>>>>> 8a5f858c99ac510a7aac5d6e6994ac478786749c

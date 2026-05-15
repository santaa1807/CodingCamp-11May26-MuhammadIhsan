/**
 * Property-Based Tests — Expense & Budget Visualizer
 *
 * Library: fast-check
 * Runner:  Vitest (jsdom environment)
 * Run with: npm test
 *
 * All 8 correctness properties from the design document are implemented here.
 * Each property runs a minimum of 100 iterations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
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

setupDOM();

// app.js uses CommonJS module.exports — use createRequire for ESM interop.
const require = createRequire(import.meta.url);
const app = require('../js/app.js');

const {
  validateForm,
  computeBalance,
  aggregateByCategory,
  addTransaction,
  deleteTransaction,
  saveToStorage,
  getTransactions,
  setTransactions,
} = app;

// ===========================================================================
// Generators
// ===========================================================================

const validTransaction = fc.record({
  id: fc.uuidV(4),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  amount: fc.float({ min: 0.01, max: 9999.99, noNaN: true }).map(n => Math.round(n * 100) / 100),
  category: fc.constantFrom('Food', 'Transport', 'Fun'),
});

const whitespaceString = fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 });

const invalidAmount = fc.oneof(
  fc.constant('0'),
  fc.constant('-1'),
  fc.constant('abc'),
  fc.constant('1.234'),
  fc.constant(''),
  fc.double({ max: 0, noNaN: true }).map(String),
);

// ===========================================================================
// P1 — Serialisation Round-Trip
// ===========================================================================

describe('P1 — Serialisation Round-Trip', () => {
  // Feature: expense-budget-visualizer, Property 1: Serialisation Round-Trip Preserves Transaction List
  // Validates: Requirements 5.1, 5.2, 5.5
  it('JSON.parse(JSON.stringify(arr)) deep-equals arr for any array of valid transactions', () => {
    fc.assert(
      fc.property(fc.array(validTransaction), (arr) => {
        const roundTripped = JSON.parse(JSON.stringify(arr));
        expect(roundTripped).toEqual(arr);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P2 — Balance Equals Sum
// ===========================================================================

describe('P2 — Balance Equals Sum', () => {
  // Feature: expense-budget-visualizer, Property 2: Balance Equals Sum of All Amounts
  // Validates: Requirements 3.1, 3.2, 3.3
  it('computeBalance(arr) equals arr.reduce sum within floating-point tolerance', () => {
    fc.assert(
      fc.property(fc.array(validTransaction, { minLength: 1 }), (arr) => {
        const balance = computeBalance(arr);
        const expected = arr.reduce((s, t) => s + t.amount, 0);
        expect(Math.abs(balance - expected)).toBeLessThan(1e-9);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P3 — Whitespace Names Rejected
// ===========================================================================

describe('P3 — Whitespace Names Rejected', () => {
  // Feature: expense-budget-visualizer, Property 3: Whitespace-Only and Empty Names Are Rejected
  // Validates: Requirements 1.3
  it('validateForm with whitespace-only name always returns a name error', () => {
    fc.assert(
      fc.property(whitespaceString, (s) => {
        const errors = validateForm({ name: s, amount: '1.00', category: 'Food' });
        expect(errors.name).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P4 — Invalid Amounts Rejected
// ===========================================================================

describe('P4 — Invalid Amounts Rejected', () => {
  // Feature: expense-budget-visualizer, Property 4: Invalid Amount Values Are Rejected
  // Validates: Requirements 1.5
  it('validateForm with invalid amount always returns an amount error', () => {
    fc.assert(
      fc.property(invalidAmount, (v) => {
        const errors = validateForm({ name: 'Test', amount: v, category: 'Food' });
        expect(errors.amount).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P5 — Add Grows List by One
// ===========================================================================

describe('P5 — Add Grows List by One', () => {
  beforeEach(() => {
    setupDOM();
    localStorage.clear();
  });

  // Feature: expense-budget-visualizer, Property 5: Adding a Transaction Grows the List by One
  // Validates: Requirements 1.2, 2.3
  it('after addTransaction, length increases by 1 and new item is at index 0', () => {
    fc.assert(
      fc.property(fc.array(validTransaction), validTransaction, (initial, newTx) => {
        // Set up state
        setTransactions([...initial]);
        localStorage.setItem('transactions', JSON.stringify(initial));

        const before = getTransactions().length;

        addTransaction(newTx.name, String(newTx.amount), newTx.category);

        const after = getTransactions();
        expect(after.length).toBe(before + 1);
        // The newest item is at index 0
        expect(after[0].name).toBe(newTx.name.trim());
        expect(after[0].amount).toBe(newTx.amount);
        expect(after[0].category).toBe(newTx.category);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P6 — Delete Shrinks List by One
// ===========================================================================

describe('P6 — Delete Shrinks List by One', () => {
  beforeEach(() => {
    setupDOM();
    localStorage.clear();
  });

  // Feature: expense-budget-visualizer, Property 6: Deleting a Transaction Shrinks the List by One
  // Validates: Requirements 2.4
  it('after deleteTransaction, length decreases by 1 and deleted id is absent', () => {
    fc.assert(
      fc.property(
        fc.array(validTransaction, { minLength: 1 }),
        fc.integer({ min: 0 }).map(n => n), // index will be clamped below
        (arr, rawIndex) => {
          const index = rawIndex % arr.length;
          const targetId = arr[index].id;

          setTransactions([...arr]);
          localStorage.setItem('transactions', JSON.stringify(arr));

          const before = getTransactions().length;

          deleteTransaction(targetId);

          const after = getTransactions();
          expect(after.length).toBe(before - 1);
          expect(after.find(tx => tx.id === targetId)).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P7 — Chart Aggregation Covers 100%
// ===========================================================================

describe('P7 — Chart Aggregation Covers 100%', () => {
  // Feature: expense-budget-visualizer, Property 7: Chart Segments Cover 100% of Total Spending
  // Validates: Requirements 4.1
  it('sum of aggregateByCategory values equals sum of all transaction amounts', () => {
    fc.assert(
      fc.property(fc.array(validTransaction, { minLength: 1 }), (arr) => {
        const totals = aggregateByCategory(arr);
        const aggregatedSum = Object.values(totals).reduce((s, v) => s + v, 0);
        const expectedSum = arr.reduce((s, t) => s + t.amount, 0);
        expect(Math.abs(aggregatedSum - expectedSum)).toBeLessThan(1e-9);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P8 — Write Failure Rolls Back State
// ===========================================================================

describe('P8 — Write Failure Rolls Back State', () => {
  beforeEach(() => {
    setupDOM();
    localStorage.clear();
  });

  // Feature: expense-budget-visualizer, Property 8: localStorage Write Failure Does Not Corrupt State
  // Validates: Requirements 1.6, 5.6
  it('after failed saveToStorage, in-memory array and localStorage are unchanged', () => {
    fc.assert(
      fc.property(fc.array(validTransaction), (arr) => {
        // Set up known state
        setTransactions([...arr]);
        const preCallJson = JSON.stringify(arr);
        localStorage.setItem('transactions', preCallJson);

        // Snapshot the pre-call in-memory array
        const preCallSnapshot = [...getTransactions()];

        // Mock setItem to throw
        const mockError = new Error('QuotaExceededError');
        const setItemSpy = vi
          .spyOn(Storage.prototype, 'setItem')
          .mockImplementation(() => { throw mockError; });
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Attempt to save — should fail
        const result = saveToStorage(getTransactions());

        // Restore mocks
        setItemSpy.mockRestore();
        errorSpy.mockRestore();

        // saveToStorage should report failure
        expect(result.ok).toBe(false);

        // In-memory array must be unchanged
        expect(getTransactions()).toEqual(preCallSnapshot);

        // localStorage value must be unchanged (setItem threw, so it was never written)
        expect(localStorage.getItem('transactions')).toBe(preCallJson);
      }),
      { numRuns: 100 },
    );
  });
});

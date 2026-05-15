# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by entering transactions with a name, amount, and category. The app displays a running total balance, a scrollable transaction list with delete capability, and a live pie chart showing spending distribution by category. All data is persisted in the browser's Local Storage. The application is built with plain HTML, CSS, and Vanilla JavaScript — no backend, no frameworks, and no build tools required.

## Glossary

- **App**: The Expense & Budget Visualizer web application running in the browser.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Category**: One of three predefined spending labels: Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI component that displays all stored transactions.
- **Balance_Display**: The UI element at the top of the page that shows the computed total of all transaction amounts.
- **Input_Form**: The HTML form through which the user enters a new transaction.
- **Chart**: The pie chart rendered via Chart.js that visualises spending distribution by category.
- **Local_Storage**: The browser's built-in `localStorage` API used as the sole persistence layer.
- **Validator**: The client-side logic that checks form field completeness before a transaction is accepted.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter a new expense through a form, so that I can record my spending quickly without any setup.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name (maximum 100 characters), a numeric field for amount, and a dropdown selector for category (Food, Transport, Fun).
2. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add the transaction to the Transaction_List and persist it to Local_Storage.
3. WHEN the user submits the Input_Form with one or more empty fields, THE Validator SHALL prevent submission and display an inline error message identifying the missing field(s).
4. WHEN a transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty/placeholder state.
5. WHEN the amount field receives input, THE Validator SHALL accept only positive numeric values greater than zero, with up to two decimal places, and SHALL display an inline error message if the value is zero, negative, non-numeric, or exceeds two decimal places.
6. IF the Local_Storage write operation fails (e.g., quota exceeded) when adding a transaction, THEN THE App SHALL display an error message to the user and SHALL NOT add the transaction to the Transaction_List.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a scrollable list, so that I can review my spending history at a glance.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction as a row showing the item name, amount formatted with a currency symbol prefix and exactly two decimal places, and category.
2. WHILE transactions exist in Local_Storage, THE Transaction_List SHALL render all stored transactions on page load, with the most recently added transaction appearing first.
3. WHEN a new transaction is added, THE Transaction_List SHALL prepend the new row at the top of the list without requiring a page reload.
4. WHEN the user clicks the delete control on a transaction row, THE App SHALL remove that transaction from the Transaction_List and from Local_Storage.
5. IF no transactions exist in Local_Storage on page load, THEN THE Transaction_List SHALL display an empty-state message indicating no transactions are recorded.
6. IF the last remaining transaction is deleted, THEN THE Transaction_List SHALL display an empty-state message indicating no transactions are recorded.
7. THE Transaction_List SHALL be scrollable when the number of rows exceeds the visible viewport height allocated to the list.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the algebraic sum of all transaction amounts, formatted with a currency symbol prefix, a comma thousands separator, and exactly two decimal places.
2. WHEN a transaction is added, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the reduced total without requiring a page reload.
4. WHILE no transactions exist, THE Balance_Display SHALL show a value of zero formatted as currency (e.g., $0.00).
5. IF the computed total is negative, THEN THE Balance_Display SHALL display the value with a minus sign prefix (e.g., -$10.00).

---

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going visually.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart displaying one segment per category that has at least one transaction, where each segment's arc is proportional to that category's share of the total spending amount.
2. THE Chart SHALL use Chart.js loaded via a CDN script tag, requiring no local installation or build step.
3. WHEN a transaction is added, THE Chart SHALL re-render to reflect the updated category totals without requiring a page reload.
4. WHEN a transaction is deleted, THE Chart SHALL re-render to reflect the updated category totals without requiring a page reload.
5. WHEN the transaction count is zero, THE Chart SHALL display a placeholder text message indicating no spending data is available, regardless of whether categories previously existed in the system.
6. THE Chart SHALL include a legend that maps each visually distinct colour segment to its corresponding category label, ensuring no two segments share the same colour.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I do not lose my data when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL serialise the current transaction list to JSON and write it to Local_Storage under the fixed key `"transactions"`.
2. WHEN a transaction is deleted, THE App SHALL serialise the updated transaction list to JSON and overwrite the Local_Storage entry under the key `"transactions"`.
3. WHEN the App initialises, THE App SHALL read the Local_Storage entry under `"transactions"`, deserialise the JSON, and replace the in-memory transaction list with the deserialised data.
4. IF the Local_Storage entry under `"transactions"` is absent or contains malformed JSON, THEN THE App SHALL initialise with an empty transaction list and log an error message to the browser console.
5. WHEN a valid transaction list is serialised to JSON and then deserialised, THE resulting list SHALL contain the same number of transactions with identical item names, amounts, categories, and insertion order as the original list.
6. IF a Local_Storage write operation fails (e.g., storage quota exceeded), THEN THE App SHALL log an error to the browser console and display a user-visible error message without corrupting the existing stored data.

---

### Requirement 6: File and Project Structure

**User Story:** As a developer, I want the project to follow a clean, minimal file structure, so that the codebase is easy to read and maintain.

#### Acceptance Criteria

1. THE App SHALL be structured with exactly one HTML file at the project root, exactly one CSS file inside a `css/` directory, and exactly one JavaScript file inside a `js/` directory.
2. THE App SHALL use no JavaScript frameworks, no CSS preprocessors, and no build tools; all code SHALL be plain HTML, CSS, and Vanilla JavaScript.
3. WHEN a user opens the HTML file directly in the current stable release of Chrome, Firefox, Edge, or Safari without a local server, THE App SHALL load and render all UI components without errors.
4. WHEN the App is loaded as a browser extension in Chrome or Firefox, THE App SHALL render all UI components, accept form input, persist data to Local_Storage, and display the Chart without errors or missing functionality.

---

### Requirement 7: Browser Compatibility

**User Story:** As a user, I want the app to work in any modern browser, so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE App SHALL pass all functional acceptance criteria when tested in the stable release of Chrome, Firefox, Edge, and Safari available at the time of testing.
2. THE App SHALL use only Web APIs (localStorage, DOM, Fetch if needed) that are natively supported in all four target browsers without requiring polyfills; IF a required API is not natively available in one of the target browsers, THEN THE App SHALL display a user-visible unsupported-browser message instead of a JavaScript error.
3. WHEN rendered on screens with a viewport width between 320px and 2560px, THE App SHALL display all UI components without horizontal scrolling, and no two UI components SHALL overlap each other.

---

### Requirement 8: Performance and Visual Design

**User Story:** As a user, I want the app to load quickly and look clean, so that using it feels effortless and pleasant.

#### Acceptance Criteria

1. THE App SHALL render the initial UI and restore persisted transactions within 2 seconds on a network connection with a download speed of at least 10 Mbps.
2. WHEN the user submits a new transaction via the Input_Form or deletes a transaction from the Transaction_List, THE App SHALL update the Balance_Display, Transaction_List, and Chart within 100 milliseconds.
3. THE App SHALL apply a colour contrast ratio of at least 4.5:1 between body text and its background, conforming to WCAG AA, across all UI components.
4. THE App SHALL use a responsive layout so that the Input_Form, Transaction_List, Balance_Display, and Chart are all fully rendered and operable at viewport widths between 320px and 1920px inclusive.

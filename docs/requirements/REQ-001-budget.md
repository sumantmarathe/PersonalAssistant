# Software Requirements Specification (SRS): Budget & Expense Planner

**Document ID**: `REQ-SPEC-001`  
**Parent Epic**: `EPIC-01: Personal Assistant Portal & Local Budget Planner`  
**Author**: Requirements Analyst  
**Approved By**: Tech Lead (Gate 0 Clearance)  
**Status**: 🟢 APPROVED  

---

## 1. Executive Summary & Business Objective
The Budget & Expense Planner is a privacy-first, client-side personal finance tool. It allows users to track incomes, expenses, view running balances, and manage financial records across PC and mobile devices without transmitting any personal data over the internet.

---

## 2. Traceable Functional Requirements

### `REQ-001`: Multi-App Master Shell & Navigation
- **Description**: The application must provide a top-level Personal Assistant navigation header that supports switching between modular sub-applications, with the Budget Planner active by default.
- **Gherkin**:
  ```gherkin
  Scenario: Launching the Personal Assistant
    Given the user navigates to the application
    Then the user sees the "Personal Assistant" brand header
    And the "Budget Planner" module is loaded as the active workspace
  ```

### `REQ-002`: Transaction Entry (Incomes & Expenses)
- **Description**: The user must be able to record a financial transaction with Type (`Income` or `Expense`), Amount (positive decimal), Category, Date, and Description.
- **Gherkin**:
  ```gherkin
  Scenario: Adding an expense transaction
    Given the user is on the Budget Planner screen
    When the user submits an expense of "45.50" with category "Food & Dining" and note "Groceries"
    Then the transaction is added to the ledger
    And the Total Expenses increments by "45.50"
    And the Net Balance decrements by "45.50"
  ```

### `REQ-003`: Transaction Deletion
- **Description**: The user can remove any existing transaction from the ledger.
- **Gherkin**:
  ```gherkin
  Scenario: Deleting an existing transaction
    Given a transaction exists with an amount of "100.00"
    When the user clicks the delete button for that transaction
    Then the transaction is removed from the ledger
    And the balance metrics are recalculated immediately
  ```

### `REQ-004`: Financial Summary Metrics
- **Description**: The UI must display real-time summary cards for **Net Balance**, **Total Income**, and **Total Expenses**, formatted cleanly with the Indian Rupee (INR `₹`) currency symbol.
- **Gherkin**:
  ```gherkin
  Scenario: Dynamic financial balance calculation
    Given the user has total incomes of 5000.00 and total expenses of 1200.00
    Then the Net Balance card displays "+₹3,800.00"
    And the Total Income card displays "₹5,000.00"
    And the Total Expenses card displays "₹1,200.00"
  ```

### `REQ-005`: Ledger Filtering & Search
- **Description**: The user can filter the ledger view by transaction type (`All`, `Income`, `Expense`) and search descriptions/categories in real-time.
- **Gherkin**:
  ```gherkin
  Scenario: Filtering ledger to expenses only
    Given the ledger contains 3 incomes and 4 expenses
    When the user clicks the "Expenses" filter tab
    Then only the 4 expense records are displayed in the list
  ```

### `REQ-006`: 100% Local-First Persistence (IndexedDB)
- **Description**: All transactions and user preferences must be persisted locally in the browser's IndexedDB database. No personal financial records shall ever be transmitted over external network requests.
- **Gherkin**:
  ```gherkin
  Scenario: Persistence across browser sessions
    Given the user has recorded transactions
    When the user refreshes or reopens the browser tab
    Then all previous transactions are retrieved from local storage and displayed accurately
  ```

### `REQ-007`: Cross-Device Data Backup & Restore (JSON)
- **Description**: The user can export all transactions to a downloadable timestamped JSON backup file and import a JSON backup file to restore records on any PC or mobile browser.
- **Gherkin**:
  ```gherkin
  Scenario: Exporting data to local file
    Given transactions exist in the ledger
    When the user clicks "Export Backup"
    Then a JSON file named "personal-assistant-budget-backup-[timestamp].json" is downloaded
  
  Scenario: Restoring data from local file
    Given the user selects a valid budget backup JSON file
    When the user clicks "Import Backup"
    Then the local database is updated with the imported records
    And the ledger UI updates immediately
  ```

### `REQ-008`: Responsive Layout (Mobile & Desktop Viewports)
- **Description**: The user interface must adapt seamlessly to desktop screens (1920x1080) and mobile touch screens (390x844) with ergonomic touch targets and legible typography.
- **Gherkin**:
  ```gherkin
  Scenario: Mobile viewport rendering
    Given the browser viewport width is 390px
    Then the summary cards stack vertically
    And the transaction entry form is fully accessible with touch inputs
  ```

---

## 3. Definition of Ready (DoR) Gate 0 Sign-Off
- [x] All 8 requirements uniquely identified and mapped.
- [x] Gherkin scenarios defined for verification.
- [x] Privacy non-functional constraint validated.
- **Gate 0 Status**: **PASSED** &rarr; Ready for System Architect (`TASK-002`).

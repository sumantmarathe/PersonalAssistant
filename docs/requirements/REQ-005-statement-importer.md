# Requirements Specification: Bank Statement Importer (PDF & CSV) (REQ-005)

**Sprint**: Sprint 05 (v1.4.0)  
**Author**: **Product Owner / Requirements Analyst**  
**Reviewer**: **Tech Lead**  
**Target Delivery**: Web (PWA) & Standalone Android Application  
**Status**: 🟢 **BASELINED & CERTIFIED (Gate 0)**  

---

## 1. Context & Business Need

Users accumulate financial transactions in external bank accounts and credit cards. Manually keying in dozens or hundreds of entries per month is tedious, time-consuming, and error-prone.

The customer requires the ability to upload a **Bank Statement (PDF or CSV)**, have the application extract transactions (dates, descriptions, amounts, and income/expense classification), and batch-import them directly into Personal Assistant.

### Key Privacy & Security Mandate
Bank statements contain the user's most sensitive personal information (account numbers, names, addresses, and balances). In strict compliance with Personal Assistant's **Zero-Knowledge Architecture (CN-04)**:
- **100% In-Browser / On-Device Parsing**: File contents MUST NEVER leave the user's device. No third-party OCR, backend servers, or external parsing APIs are permitted. All PDF and CSV extraction must occur strictly locally in client-side JavaScript.

---

## 2. Discrete Requirements & Gherkin Specifications

### [REQ-023] Zero-Knowledge Client-Side File Ingestion
- **Description**: The application MUST allow users to select or drag-and-drop a statement file (`.csv`, `.pdf`) via HTML5 File API and `FileReader`. The file data must be processed entirely in client memory and discarded upon modal closure.
- **Gherkin Scenario**:
  ```gherkin
  Scenario: Upload statement file locally
    Given the user opens the "Import Statement" modal
    When the user selects a bank statement PDF or CSV file
    Then the file is read entirely in local client memory
    And no network request is dispatched to any external server.
  ```

---

### [REQ-024] PDF Statement Text Extraction Engine
- **Description**: The application MUST extract tabular transaction records from text-based PDF bank statements using a locally bundled, offline-capable PDF parser (`pdf.min.js`). The parser must reconstruct lines, table columns, and cell coordinates to identify transactional rows.
- **Gherkin Scenario**:
  ```gherkin
  Scenario: Extract transactions from text PDF
    Given a valid text-based bank statement PDF
    When the PDF extraction engine processes the pages
    Then it identifies lines containing dates, narration, withdrawal/deposit amounts, and balance
    And reconstructs individual transaction candidates.
  ```

---

### [REQ-025] CSV Bank Statement Tabular Parsing Engine
- **Description**: The application MUST parse standard CSV files, supporting comma, semicolon, and tab delimiters, quoted multi-line fields, and automatic detection of header rows containing Date, Description, and Debit/Credit columns.
- **Gherkin Scenario**:
  ```gherkin
  Scenario: Parse standard CSV bank statement
    Given a bank statement in CSV format
    When the CSV parser processes the file
    Then it identifies header rows
    And maps columns for Date, Description/Narration, Debit (Expense), and Credit (Income).
  ```

---

### [REQ-026] Bank Statement Preset Heuristics & Normalization
- **Description**: The engine MUST provide preset profile recognition for major Indian banks (HDFC, SBI, ICICI, Axis) and a Universal/Generic fallback parser:
  - **Date Normalization**: Standardizes dates from formats such as `DD/MM/YYYY`, `DD-MM-YYYY`, `DD-MMM-YYYY` (e.g. `15-Jan-2026`), or `YYYY-MM-DD` into standard `YYYY-MM-DD`.
  - **Amount Normalization**: Strips currency symbols (`₹`, `Rs.`), commas (`1,25,000.50`), and whitespace, converting amounts to decimal numbers.
  - **Transaction Type**:
    - Debit / Withdrawal / Dr -> **Expense** (`type: 'expense'`)
    - Credit / Deposit / Cr -> **Income** (`type: 'income'`)
  - **Smart Category Inference**: Auto-suggests budget categories based on description keywords:
    - Food & Dining: Swiggy, Zomato, Starbucks, McDonald, Restaurant, Cafe, Blinkit, Zepto, Instamart.
    - Shopping: Amazon, Flipkart, Myntra, Zara, Retail.
    - Transportation: Uber, Ola, Fuel, Petrol, Indian Oil, Shell, Metro, Fastag.
    - Utilities: Electricity, Bescom, Water, Airtel, Jio, Broadband, Billdesk, Gas.
    - Salary / Investment: Salary, Dividend, Interest, Zerodha, Groww, Mutual Fund.
- **Gherkin Scenario**:
  ```gherkin
  Scenario: Normalize bank transaction and suggest category
    Given a parsed transaction with description "UPI-SWIGGY-12345" and debit amount "450.00"
    When the heuristic engine classifies the record
    Then the type is set to "expense"
    And the suggested category is set to "Food"
    And the amount is formatted to 450.00 INR.
  ```

---

### [REQ-027] Interactive Review, Mapping & Batch Commit Modal
- **Description**: The application MUST display an interactive modal table prior to committing entries into the budget:
  - Table displaying: Checkbox, Date, Description, Type badge (Income/Expense toggle), Amount, and Category dropdown.
  - Controls: "Select All" / "Deselect All", individual row exclusion, category modification.
  - Summary metrics: Count of transactions selected, Total Income, Total Expenses, and Net Balance impact.
  - Action: "Import Selected Entries (N)" commits all checked transactions in a single batch to IndexedDB, recalculates budget totals, triggers Google Drive cloud sync (if authenticated), and closes the modal with a success toast.
- **Gherkin Scenario**:
  ```gherkin
  Scenario: User reviews and batch imports transactions
    Given the review modal displays 15 extracted transactions
    When the user unchecks 2 personal transfers and clicks "Import Selected Entries (13)"
    Then exactly 13 transactions are committed to IndexedDB
    And the net balance and metric cards update immediately
    And an automated cloud backup is initiated if Google account is connected.
  ```

---

### [REQ-028] Duplicate Transaction Detection
- **Description**: The system MUST compare extracted transactions against existing transactions in IndexedDB (matching `date`, `amount`, and `description`). If a duplicate is detected, it MUST be flagged visually with a warning badge (e.g. `⚠️ Potential Duplicate`) and unchecked by default to prevent accidental double-counting.
- **Gherkin Scenario**:
  ```gherkin
  Scenario: Duplicate detection on import
    Given an existing transaction for ₹1,200 on 2026-10-15 with description "Electricity Bill"
    When an imported statement contains an identical ₹1,200 transaction on 2026-10-15
    Then the entry is flagged as "Potential Duplicate"
    And its checkbox is unchecked by default.
  ```

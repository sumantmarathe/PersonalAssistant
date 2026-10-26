# Technical Design Specification: Bank Statement Importer (SPEC-005)

**Sprint**: Sprint 05 (v1.4.0)  
**Author**: **Software Architect**  
**Reviewer**: **Tech Lead**  
**Gate**: Gate 1 (Architecture & Pre-Flight)  
**Status**: 🟢 **APPROVED & BASELINED**  

---

## 1. Architectural Pipeline

```
+---------------------------------------------------------------------------------+
|                        Client-Side Zero-Knowledge Pipeline                      |
|                                                                                 |
|   [User File Upload] (.pdf / .csv via Drag & Drop or File Picker)              |
|           |                                                                     |
|           v (Local ArrayBuffer / Text via HTML5 FileReader)                     |
|   +-------------------------------------------------------------------------+   |
|   | Format Router (MIME / Extension)                                        |   |
|   +-------------------------------------------------------------------------+   |
|           |                                                 |                   |
|           v (.csv)                                          v (.pdf)            |
|   +-----------------------------+   +---------------------------------------+   |
|   | CSV Tabular Parser Engine   |   | PDF.js Offline Text Extractor         |   |
|   | - Delimiter Detection       |   | - Page Iteration                      |   |
|   | - Quoted String Unescaping  |   | - Y-coordinate Line Grouping          |   |
|   | - Header Row Resolution     |   | - X-coordinate Column Clustering      |   |
|   +-----------------------------+   +---------------------------------------+   |
|           |                                                 |                   |
|           +-----------------------+-------------------------+                   |
|                                   | (Raw Row Streams)                           |
|                                   v                                             |
|   +-------------------------------------------------------------------------+   |
|   | Bank Heuristic Normalizer (js/statementParser.js)                       |   |
|   | - Presets: HDFC, SBI, ICICI, Axis, Universal/Generic                   |   |
|   | - Date Normalizer -> YYYY-MM-DD                                         |   |
|   | - Amount Sanitizer -> Float INR (strips ₹, commas, Dr/Cr)               |   |
|   | - Type Classifier -> Debit: Expense, Credit: Income                     |   |
|   | - Smart Category Suggestion -> Keyword Matching Engine                  |   |
|   | - Duplicate Detector -> Hash vs IndexedDB Existing Transactions         |   |
|   +-------------------------------------------------------------------------+   |
|                                   |                                             |
|                                   v                                             |
|   +-------------------------------------------------------------------------+   |
|   | Interactive Review & Confirmation Modal                                 |   |
|   | - Tabular Preview with Checkboxes & Category Overrides                  |   |
|   | - Duplicate Warnings (Unchecked by default)                             |   |
|   | - Dynamic Impact Metrics (Total Income, Total Expense, Net Balance)     |   |
|   | - "Import Selected Entries (N)" Action Button                           |   |
|   +-------------------------------------------------------------------------+   |
|                                   |                                             |
|                                   v (Batch Commit)                              |
|   +-----------------------------+   +---------------------------------------+   |
|   | Local IndexedDB (Storage)   |   | User's Private Google Drive Sync      |   |
|   +-----------------------------+   +---------------------------------------+   |
+---------------------------------------------------------------------------------+
```

---

## 2. Component Specifications

### 2.1 File Ingestion & Format Router (`js/statementParser.js`)
- Uses standard `HTML5 FileReader`:
  - `.csv`: Read as text using UTF-8 encoding.
  - `.pdf`: Read as `ArrayBuffer` for processing by `pdfjs-dist`.
- File content is kept in ephemeral variables during modal execution and released once the modal is closed.

### 2.2 CSV Tabular Parser
- Handles RFC 4180 compliant CSVs, semicolon-delimited (`.csv`), and tab-delimited (`.tsv` / `.txt`).
- Automatic Header Detection: Searches top 25 rows for columns matching regex:
  - Date: `/date|txndate|txn_date|value_date/i`
  - Narration: `/narration|description|particulars|remarks|details/i`
  - Debit: `/debit|withdrawal|dr|paid\s*out/i`
  - Credit: `/credit|deposit|cr|paid\s*in/i`
  - Balance: `/balance|closing\s*bal/i`

### 2.3 PDF Statement Extractor (`js/vendor/pdf.min.js`)
- Loads PDF document via `pdfjsLib.getDocument({ data: arrayBuffer })`.
- For each page:
  - Calls `page.getTextContent()`.
  - Groups text items by vertical position (`transform[5]` Y-coord within a 3px threshold) to form horizontal lines.
  - Sorts items horizontally (`transform[4]` X-coord) to preserve column order.
  - Identifies transactional rows matching date patterns (e.g. `^\d{2}[/-]\d{2}[/-]\d{4}` or `^\d{2}\s+[A-Za-z]{3}\s+\d{4}`).

### 2.4 Bank Preset Profiles
- **HDFC Bank**: Date (DD/MM/YY or DD/MM/YYYY), Narration, Chq/Ref No, Value Date, Withdrawal Amt, Deposit Amt, Closing Balance.
- **State Bank of India (SBI)**: Txn Date, Value Date, Description, Ref No/Cheque No, Debit, Credit, Balance.
- **ICICI Bank**: S No, Value Date, Transaction Date, Cheque Number, Transaction Remarks, Debit Amount, Credit Amount, Balance.
- **Axis Bank**: Tran Date, CHQNO, Particulars, Debit, Credit, Balance, Init. Br.
- **Universal / Generic**: Detects any column sequence matching Date, Narration, Debit/Withdrawal, Credit/Deposit.

### 2.5 Smart Category Classification Engine
Matches transaction narration against keywords:
```javascript
const CATEGORY_RULES = [
  { category: 'Food', regex: /\b(swiggy|zomato|mcdonald|starbucks|kfc|pizza|domino|burger|restaurant|cafe|eats|blinkit|zepto|instamart|bigbasket|grocer)\b/i },
  { category: 'Transportation', regex: /\b(uber|ola|rapido|fuel|petrol|diesel|iocl|bpcl|hpcl|shell|fastag|toll|railway|irctc|metro|flight|indigo|airindia)\b/i },
  { category: 'Shopping', regex: /\b(amazon|flipkart|myntra|zara|h&m|ajio|tata\s*cliq|retail|store|mall|croma|reliance)\b/i },
  { category: 'Utilities', regex: /\b(bescom|electricity|power|water|airtel|jio|vodafone|vi|broadband|wifi|billdesk|gas|lpg|cylinder|recharge)\b/i },
  { category: 'Housing', regex: /\b(rent|maintenance|society|landlord|housing|nobroker|nestaway)\b/i },
  { category: 'Health', regex: /\b(pharmacy|apollo|medplus|pharmeasy|1mg|hospital|clinic|doctor|dental|lab|diagnostic)\b/i },
  { category: 'Entertainment', regex: /\b(netflix|prime\s*video|hotstar|spotify|cinema|pvr|inox|bookmyshow|youtube|gaming|playstation)\b/i },
  { category: 'Salary', regex: /\b(salary|payroll|stipend|wages|remuneration)\b/i },
  { category: 'Investment', regex: /\b(zerodha|groww|upstox|mutual\s*fund|sip|dividend|interest|fd|fixed\s*deposit|nse|bse)\b/i }
];
```

### 2.6 Duplicate Detection Strategy
- When parsing transactions, the parser queries existing entries in `budgetApp.transactions`.
- A transaction is flagged as duplicate if:
  `existing.date === candidate.date && Math.abs(existing.amount - candidate.amount) < 0.01 && normalize(existing.description) === normalize(candidate.description)`.
- Flagged entries receive visual badge `⚠️ Duplicate` and their checkbox is deselected by default.

---

## 3. Pre-Flight Dependency & Verification Checklist

- [x] **Zero External Network Requests**: Verified. All parsing logic executes 100% on-device in client memory. No backend server or third-party OCR API required.
- [x] **Offline PDF.js Bundling**: Certified. `pdf.min.js` and `pdf.worker.min.js` will be stored in `js/vendor/` and precached by `sw.js` for full offline availability.
- [x] **Dual-Target Parity**: `scripts/build-android.mjs` will copy `js/vendor/` to `android/app/src/main/assets/www/js/vendor/` so the Android `.apk` gets identical statement parsing capabilities.
- [x] **Currency Conformity**: All extracted amounts formatted to Indian Rupee (`₹`).

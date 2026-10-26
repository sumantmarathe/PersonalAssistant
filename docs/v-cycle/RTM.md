# Requirements Traceability Matrix (RTM)

**Sprint**: Sprint 01  
**Target Delivery**: Budget & Expense Planner MVP  
**Last Updated**: 2026-10-26 (Sprint 01 Full Clearance)  

| Req ID | Customer Need | Description | Design Spec | Implementation | Unit Test | Integration / E2E Test | L1 Sign-off | L2 Sign-off |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-001** | CN-01 | Multi-App Shell & Navigation | `SPEC-001#Section-2` | `index.html`, `js/app.js` | `budget_logic.test.mjs` | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-002** | CN-02 | Add Incomes & Expenses | `SPEC-001#Section-3` | `js/budgetApp.js#L210` | `budget_logic.test.mjs` (TC-1,2) | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-003** | CN-02 | Delete Transactions | `SPEC-001#Section-3` | `js/budgetApp.js#L239` | `storage_persistence.test.mjs` | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-004** | CN-02 | Balance & Summary Metrics | `SPEC-001#Section-4` | `js/budgetApp.js#L125` | `budget_logic.test.mjs` (TC-1..4) | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-005** | CN-02 | Ledger Filter & Search | `SPEC-001#Section-5` | `js/budgetApp.js#L159` | `budget_logic.test.mjs` (TC-5..8) | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-006** | CN-04 | 100% Local IndexedDB Persistence | `SPEC-001#Section-6` | `js/storage.js#L21` | `storage_persistence.test.mjs` | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-007** | CN-03,04 | Cross-Device JSON Backup/Restore | `SPEC-001#Section-7` | `js/storage.js#L152` | `budget_logic.test.mjs` (TC-9..11)| `storage_persistence.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-008** | CN-03 | Mobile & Desktop Responsive Layout | `SPEC-001#Section-8` | `css/style.css#L427` | Viewport Media Queries | Browser E2E Mobile Inspection | 🟢 Approved | 🟢 Certified |

# Requirements Traceability Matrix (RTM)

**Sprint**: Sprint 02 (Completed & Certified)  
**Target Delivery**: Google Sign-In & Google Drive Sync (v1.1.0)  
**Branch**: `feat/sprint-02-google-drive-sync`  
**Last Updated**: 2026-10-26 (Full Clearance)  

---

## Sprint 01 Baseline (Certified in Production `main`)
| Req ID | Customer Need | Description | Design Spec | Implementation | Unit Test | Integration / E2E Test | L1 Sign-off | L2 Sign-off |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-001** | CN-01 | Multi-App Shell & Navigation | `SPEC-001#S2` | `index.html`, `js/app.js` | `budget_logic.test.mjs` | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-002** | CN-02 | Add Incomes & Expenses | `SPEC-001#S3` | `js/budgetApp.js#L210` | `budget_logic.test.mjs` (TC-1,2) | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-003** | CN-02 | Delete Transactions | `SPEC-001#S3` | `js/budgetApp.js#L239` | `storage_persistence.test.mjs` | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-004** | CN-02 | Balance & Summary Metrics | `SPEC-001#S4` | `js/budgetApp.js#L125` | `budget_logic.test.mjs` (TC-1..4) | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-005** | CN-02 | Ledger Filter & Search | `SPEC-001#S5` | `js/budgetApp.js#L159` | `budget_logic.test.mjs` (TC-5..8) | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-006** | CN-04 | 100% Local IndexedDB Persistence | `SPEC-001#S6` | `js/storage.js#L21` | `storage_persistence.test.mjs` | Browser E2E Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-007** | CN-03,04 | Cross-Device JSON Backup/Restore | `SPEC-001#S7` | `js/storage.js#L152` | `budget_logic.test.mjs` (TC-9..11)| `storage_persistence.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-008** | CN-03 | Mobile & Desktop Responsive Layout | `SPEC-001#S8` | `css/style.css#L427` | Viewport Media Queries | Browser E2E Mobile Inspection | 🟢 Approved | 🟢 Certified |

---

## Sprint 02 Scope (Google Drive Cloud Sync)
| Req ID | Customer Need | Description | Design Spec | Implementation | Unit Test | Integration / E2E Test | L1 Sign-off | L2 Sign-off |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-009** | CN-05 | Google Identity OAuth 2.0 Sign-In | `SPEC-002#S2` | `js/googleDriveService.js#L78` | `google_drive_sync.test.mjs` (TC-5) | `qa-e2e-report-sprint-02.md` | 🟢 Approved | 🟢 Certified |
| **REQ-010** | CN-05 | Custom OAuth Client ID Config | `SPEC-002#S3` | `js/googleDriveService.js#L48` | `google_drive_sync.test.mjs` (TC-1,2) | `qa-e2e-report-sprint-02.md` | 🟢 Approved | 🟢 Certified |
| **REQ-011** | CN-05 | Sync to Drive (Cloud Backup) | `SPEC-002#S4` | `js/googleDriveService.js#L143` | `drive_sync_persistence.test.mjs` (TC-1) | `qa-e2e-report-sprint-02.md` | 🟢 Approved | 🟢 Certified |
| **REQ-012** | CN-05 | Restore from Drive (Cloud Import) | `SPEC-002#S4` | `js/googleDriveService.js#L206` | `drive_sync_persistence.test.mjs` (TC-1) | `qa-e2e-report-sprint-02.md` | 🟢 Approved | 🟢 Certified |
| **REQ-013** | CN-05 | Disconnect & Session Termination | `SPEC-002#S6` | `js/googleDriveService.js#L125` | `google_drive_sync.test.mjs` (TC-6) | `qa-e2e-report-sprint-02.md` | 🟢 Approved | 🟢 Certified |

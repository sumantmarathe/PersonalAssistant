# Requirements Traceability Matrix (RTM)

> **Governance Framework**: High-Assurance V-Cycle Model  
> **Target Release**: `v1.7.0` (Web Deployed + Android Native Release)  
> **Last Updated**: 2026-10-27 | **Status**: 🟢 100% Verified & Certified  

---

## Complete Verification & Traceability Coverage

| Req ID | Need | Description | Design Spec | Implementation | Test Suite | L1 Review | L2 Audit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-001** | CN-01 | Multi-App Shell & Navigation | `SPEC-001#S2` | `index.html`, `js/app.js` | `budget_logic.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-002** | CN-02 | Add Incomes & Expenses | `SPEC-001#S3` | `js/budgetApp.js#L210` | `budget_logic.test.mjs` (TC-1,2) | 🟢 Approved | 🟢 Certified |
| **REQ-003** | CN-02 | Delete Transactions | `SPEC-001#S3` | `js/budgetApp.js#L239` | `storage_persistence.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-004** | CN-02 | Balance & Summary Metrics | `SPEC-001#S4` | `js/budgetApp.js#L125` | `budget_logic.test.mjs` (TC-1..4) | 🟢 Approved | 🟢 Certified |
| **REQ-005** | CN-02 | Ledger Filter & Search | `SPEC-001#S5` | `js/budgetApp.js#L159` | `budget_logic.test.mjs` (TC-5..8) | 🟢 Approved | 🟢 Certified |
| **REQ-006** | CN-04 | 100% Local IndexedDB Persistence | `SPEC-001#S6` | `js/storage.js#L21` | `storage_persistence.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-007** | CN-03,04 | Cross-Device JSON Backup/Restore | `SPEC-001#S7` | `js/storage.js#L152` | `budget_logic.test.mjs` (TC-9..11) | 🟢 Approved | 🟢 Certified |
| **REQ-008** | CN-03 | Mobile & Desktop Responsive Layout | `SPEC-001#S8` | `css/style.css#L427` | Browser QA Mobile Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-009** | CN-05 | Google Identity OAuth 2.0 Sign-In | `SPEC-002#S2` | `js/googleDriveService.js#L78` | `google_drive_sync.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-010** | CN-05 | Custom OAuth Client ID Config | `SPEC-002#S3` | `js/googleDriveService.js#L48` | `google_drive_sync.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-011** | CN-05 | Sync to Drive (Cloud Backup) | `SPEC-002#S4` | `js/googleDriveService.js#L143`| `drive_sync_persistence.test.mjs`| 🟢 Approved | 🟢 Certified |
| **REQ-012** | CN-05 | Restore from Drive (Cloud Import) | `SPEC-002#S4` | `js/googleDriveService.js#L206`| `drive_sync_persistence.test.mjs`| 🟢 Approved | 🟢 Certified |
| **REQ-013** | CN-05 | Disconnect & Session Termination | `SPEC-002#S6` | `js/googleDriveService.js#L125`| `google_drive_sync.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-014** | CN-06 | Standalone Android Native App Shell | `SPEC-003#S2` | `android/`, `MainActivity` | `android_packaging.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-015** | CN-06 | 100% Storage & Local Persistence Parity | `SPEC-003#S3` | `WebView` DOM Storage | `dual_target_persistence.test.mjs`| 🟢 Approved | 🟢 Certified |
| **REQ-016** | CN-06 | Android Cloud Sync & OAuth Compatibility | `SPEC-003#S4` | `MainActivity`, `googleDrive` | `google_drive_sync.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-017** | CN-06 | Dual-Target Automated Verification Suite | `SPEC-003#S5` | `scripts/build-android.mjs` | Node test runner + Android CLI | 🟢 Approved | 🟢 Certified |
| **REQ-018** | CN-06 | Dual-Target Production Build Artifacts | `SPEC-003#S6` | GitHub Pages + Gradle APK | Checksum & Package audit | 🟢 Approved | 🟢 Certified |
| **REQ-019** | CN-06 | W3C Web App Manifest Specification | `SPEC-004#S2.1` | `manifest.json`, `icons/` | `pwa_manifest_sw.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-020** | CN-06 | Service Worker & Offline Caching Engine | `SPEC-004#S2.2` | `sw.js` | `pwa_manifest_sw.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-021** | CN-06 | In-App Install Prompt User Experience | `SPEC-004#S2.3` | `index.html`, `js/app.js` | Browser QA Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-022** | CN-06 | Dual-Target Asset Synchronization Parity | `SPEC-004#S3` | `scripts/build-android.mjs` | `pwa_manifest_sw.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-023** | CN-07 | Zero-Knowledge PDF/CSV Parser | `SPEC-005#S2` | `js/statementParser.js` | `statement_parser.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-024** | CN-07 | Bank Presets & Normalization | `SPEC-005#S3` | `js/statementParser.js` | `statement_parser.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-025** | CN-07 | Smart Categorization Inference | `SPEC-005#S4` | `js/statementParser.js` | `statement_parser.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-026** | CN-07 | Interactive Statement Review Modal | `SPEC-005#S5` | `index.html`, `js/budgetApp.js` | `statement_import_flow.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-027** | CN-07 | Duplicate Transaction Detection | `SPEC-005#S6` | `js/statementParser.js` | `statement_parser.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-028** | CN-07 | Batch Ingestion Storage Transaction | `SPEC-005#S7` | `js/storage.js` | `statement_import_flow.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-029** | CN-08 | Sortable Statement Review Table | `SPEC-006#S1` | `js/budgetApp.js` | Browser QA DevTools Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-030** | CN-09 | Expense Statistics & Analytics Dashboard | `SPEC-006#S2` | `js/budgetApp.js`, `index.html`| `analytics_stats.test.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-031** | CN-10 | Multi-Account Management & Filtering | `SPEC-006#S3` | `js/budgetApp.js`, `js/storage.js`| `analytics_accounts_filter.test.mjs`| 🟢 Approved | 🟢 Certified |
| **REQ-032** | CN-11 | Bulk Deletion & Database Purge Modal | `SPEC-006#S4` | `index.html`, `js/budgetApp.js` | Browser QA Inspection | 🟢 Approved | 🟢 Certified |
| **REQ-033** | CN-12 | Responsive Mobile Segmented Controls & SW v1.7.0 | `SPEC-006#S5` | `css/style.css`, `sw.js` | `pwa_manifest_sw.test.mjs` | 🟢 Approved | 🟢 Certified |

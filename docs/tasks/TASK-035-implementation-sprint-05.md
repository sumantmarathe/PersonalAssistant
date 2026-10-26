# [TASK-035] Bank Statement Importer Implementation

**Sprint**: Sprint 05  
**Assignee**: **Software Developer**  
**Reviewer**: **Tech Lead**  
**Gate**: Gate 2 (Implementation & Build)  
**Status**: 🟢 Completed (Sprint 05 Baseline Certified)  

---

## 1. Objective
Implement the zero-knowledge client-side statement parser in `js/statementParser.js`, bundle offline `pdf.min.js` in `js/vendor/`, implement the interactive review & mapping modal in `index.html` and `css/style.css`, wire into `js/budgetApp.js`, and support `batchAddTransactions` in `js/storage.js`.

## 2. Deliverables
- [x] Bundled standalone offline `pdf.min.js` and `pdf.worker.min.js` in `js/vendor/`.
- [x] Implemented `js/statementParser.js` (CSV parsing, PDF parsing, bank presets, date/amount normalization, smart categorization, duplicate detection).
- [x] Added `batchAddTransactions` method to `StorageService` in `js/storage.js`.
- [x] Implemented Import Modal and review table UI in `index.html` and `css/style.css`.
- [x] Wired statement upload, review, selection, and batch commit in `js/budgetApp.js`.
- [x] Updated `sw.js` precache list for v1.4.0.

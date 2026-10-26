# Unit Test Execution Report

**Date**: 2026-10-26  
**Runner**: Node.js v22.16.0 Native Test Runner  
**Author**: Unit Test Engineer  
**Status**: 🟢 ALL 11 TESTS PASSED (100% Pass Rate)  

---

## Test Results Summary

| Test Suite | Tests Run | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Calculations (`REQ-002`, `REQ-004`)** | 4 | 4 | 0 | 🟢 PASS |
| **Ledger Filtering & Search (`REQ-005`)** | 4 | 4 | 0 | 🟢 PASS |
| **Backup Envelope Validation (`REQ-007`)** | 3 | 3 | 0 | 🟢 PASS |
| **Total** | **11** | **11** | **0** | 🟢 **100%** |

---

## Detail Breakdown
- ✔ Calculates balance accurately with basic income and expenses
- ✔ Handles floating-point decimal additions without precision artifacts
- ✔ Calculates negative net balance when expenses exceed income
- ✔ Returns zero metrics for empty transaction list
- ✔ Filters ledger by type "income"
- ✔ Filters ledger by type "expense"
- ✔ Searches by keyword in description or category case-insensitively
- ✔ Returns empty array when search query matches nothing
- ✔ Validates a correctly formatted backup envelope
- ✔ Rejects malformed JSON strings gracefully
- ✔ Rejects JSON with wrong application header

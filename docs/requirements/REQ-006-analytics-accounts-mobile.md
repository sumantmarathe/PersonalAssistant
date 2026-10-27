# [REQ-006] Expense Analytics, Multi-Account, Bulk Purge & Mobile Optimization

> **Category**: `Requirements Specification` | **Sprint**: `Sprint 06` | **Target**: `v1.7.0`  
> **Status**: 🟢 `Approved & Baseline Certified`  
> **Author**: `Requirements Analyst` | **Reviewer**: `Tech Lead`  
> **Traceability**: [SPEC-006](../design/SPEC-006-analytics-accounts-mobile.md) • [TASK-041](../tasks/TASK-041-requirements-sprint-06.md) • [RTM.md](../v-cycle/RTM.md)

---

## 1. User Story
As a **personal finance manager**,  
I want **deep expense statistics, multiple bank accounts, bulk transaction management, and a clean mobile layout**,  
So that **I can understand my financial health at a glance across all my accounts without layout clutter or data friction**.

---

## 2. Granular Requirements

### REQ-029: Sortable Bank Statement Review Table
- User can sort imported transactions in the review modal by Date, Narration/Description, Category, Amount, or Type (Ascending/Descending).

### REQ-030: Comprehensive Expense Analytics & Statistics Tab
- Dedicated "Analytics & Stats" view displaying:
  - Total Income, Total Expenses, Net Savings, and Savings Rate percentage.
  - Peak Spending Day with total amount.
  - Daily Average Spend calculated over the filtered time span.
  - Category Breakdown with amounts and visual percentage distribution bars.
  - Top 5 Largest Single Expense Transactions.
  - Interactive Date Range Filters: All Time, This Month, Last Month, Year-to-Date, and Custom Range.

### REQ-031: Multi-Account Management & Mapping
- Manage distinct accounts (e.g. Axis Bank, SBI Bank) with custom names, account numbers, and IFSC codes.
- Global active account filter in header and ledger.
- Statement importer automatically extracts or prompts for target account assignment.

### REQ-032: Bulk Deletion & Complete Database Purge
- Bulk checkbox selection on ledger rows with a floating action bar to delete selected entries.
- "Purge All Data" modal requiring explicit confirmation phrase `DELETE EVERYTHING` to eliminate accidental loss.

### REQ-033: Mobile Viewport Optimization & PWA Invalidation
- Eliminate horizontal navigation clipping on narrow screens (320px–412px).
- Responsive single-line segmented control tabs with concise labels on mobile.
- Service worker cache bumped to `v1.7.0` for immediate cache invalidation on mobile reloads.

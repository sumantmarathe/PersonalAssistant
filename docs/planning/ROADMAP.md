# Product Roadmap & Multi-App Portfolio

**Product**: Personal Assistant Suite  
**Customer**: Sumant Marathe  
**Architecture Model**: Privacy-First, Zero-Knowledge, Local-First with User-Owned Cloud Sync  
**Governance Framework**: V-Cycle Engineering Model (ISO 26262 / DO-178C Inspired)  
**Branching Model**: Production Release on `main`; Active Development on Side Branches (`feat/*`)  

---

## Portfolio Strategy

```
+-----------------------------------------------------------+
|              Personal Assistant Master Portal             |
|   [Dock / App Launcher: Quick Switch between Sub-Apps]    |
+-----------------------------------------------------------+
        |                                   |
        v                                   v
+-----------------------+       +-----------------------+
|  Sub-App 1: Budget    |       |  Sub-App 2: Future    |
|  & Expense Planner    |       |  Notes / Assistant    |
|  (Local + GDrive Sync)|       |  (Upcoming)           |
+-----------------------+       +-----------------------+
```

---

## Sprint Release Schedule

| Sprint | Objective | Status | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Sprint 1** | **Budget & Expense Planner MVP** | 🟢 **DELIVERED** | Multi-app portal frame, Income/Expense tracking, balance ledger, 100% local persistence (IndexedDB), encrypted JSON export/import backup for PC/Mobile, full V-Cycle test & audit sign-off. |
| **Sprint 2** | **Google Sign-In & Google Drive Sync** | 🟢 **IN PROGRESS** | OAuth 2.0 Google Identity Services, user-owned Google Drive backup/restore (`drive.appdata` / `drive.file`), cross-device automated sync without any intermediate server. |
| **Sprint 3** | **Budget Analytics & Category Visuals** | ⚪ Queued | Breakdown charts, monthly budget caps, spending alerts, CSV export. |
| **Sprint 4** | **Next Modular Sub-App** | ⚪ Queued | Customer priority selection (e.g., Secure Notes, Habit Tracker). |

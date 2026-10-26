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
| **Sprint 1** | **Budget & Expense Planner MVP** | 🟢 **DELIVERED (v1.0.0)** | Multi-app portal frame, Income/Expense tracking, balance ledger, 100% local persistence (IndexedDB), JSON export/import backup for PC/Mobile, full V-Cycle test & audit sign-off. |
| **Sprint 2** | **Google Sign-In & Google Drive Sync** | 🟢 **DELIVERED (v1.1.0)** | OAuth 2.0 Google Identity Services, user-owned Google Drive cloud backup/sync (`drive.file`), cross-device automated sync, INR currency standard, full QMS process audit certification. |
| **Sprint 3** | **Android App & Dual-Target Release Pipeline** | 🟡 **PLANNED / INITIATING (v1.2.0)** | Native Android Application container (`.apk`), full offline/IndexedDB parity, direct app launch without browser URL navigation, Dual-Target Release & Test Pipeline (simultaneous GitHub Pages & APK builds and automated tests). |
| **Sprint 4** | **Budget Analytics & Category Visuals** | ⚪ Queued | Breakdown charts, monthly budget caps, spending alerts, CSV export. |
| **Sprint 5** | **Next Modular Sub-App** | ⚪ Queued | Customer priority selection (e.g., Secure Notes, Habit Tracker). |


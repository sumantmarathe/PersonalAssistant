# Product Roadmap & Multi-App Portfolio

> **Product**: Personal Assistant Suite  
> **Customer**: Sumant Marathe  
> **Architecture Model**: Privacy-First, Zero-Knowledge, Local-First with User-Owned Cloud Sync  
> **Governance Framework**: V-Cycle Engineering Model (High-Assurance / IV&V)  
> **Branching Model**: Production Release on `main`; Active Development on Side Branches (`feat/*`)  

---

## 🏛️ Portfolio Strategy

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

## 🚀 Sprint Delivery Milestones

| Sprint | Objective | Target Version | Status | Key Deliverables |
| :--- | :--- | :--- | :--- | :--- |
| **Sprint 01** | **Budget & Expense Planner MVP** | `v1.0.0` | 🟢 **DELIVERED** | Multi-app portal frame, Income/Expense tracking, balance ledger, 100% local persistence (IndexedDB), JSON export/import backup, full V-Cycle test & audit sign-off. |
| **Sprint 02** | **Google Identity & Drive Sync** | `v1.1.0` | 🟢 **DELIVERED** | OAuth 2.0 Google Identity Services, user-owned Google Drive cloud backup/sync (`drive.file`), cross-device automated sync, INR (₹) currency standard. |
| **Sprint 03** | **Android App & Dual-Target Release** | `v1.2.0` | 🟢 **DELIVERED** | Native Android Application container (`.apk`), full offline/IndexedDB parity, Dual-Target Release & Test Pipeline (simultaneous GitHub Pages & APK builds and automated tests). |
| **Sprint 04** | **PWA Mobile Installation & Offline** | `v1.3.0` | 🟢 **DELIVERED** | Progressive Web App manifest, service worker offline asset caching, mobile "Install App" button, dual-target asset sync. |
| **Sprint 05** | **Zero-Knowledge Bank Importer** | `v1.4.0` | 🟢 **DELIVERED** | 100% client-side zero-knowledge PDF/CSV parser, presets for major banks (HDFC, SBI, ICICI, Axis) + custom column mapping, interactive review modal, duplicate detection. |
| **Sprint 06** | **Analytics, Accounts, Purge & Mobile Fix** | `v1.7.0` | 🟢 **DELIVERED** | Expense statistics dashboard, multi-account support (Axis, SBI), sortable statement review table, bulk deletion & complete database purge, mobile layout optimization, SW v1.7.0. |
| **Sprint 07** | **Future Sub-Apps (Notes / Assistant)** | `v2.0.0` | ⚪ Queued | Customer priority selection (e.g., Secure Notes, AI Conversational Financial Advisor). |

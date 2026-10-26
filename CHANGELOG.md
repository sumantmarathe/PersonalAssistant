# Changelog - Personal Assistant Suite

All notable changes to this project are documented in this file following the Keep a Changelog standard.

---

## [v1.1.0] - 2026-10-26 (Sprint 02 Delivery)

### Added
- **Google Identity Services (OAuth 2.0)**:
  - Official Google-branded "Connect Drive" integration using Google Identity Services (GIS).
  - Secure in-memory token lifecycle with session revocation on disconnect.
- **Personal Google Drive Cloud Sync**:
  - **Sync to Drive**: Directly uploads/updates `personal_assistant_budget_backup.json` to the user's private Google Drive.
  - **Restore from Drive**: Seamlessly downloads and restores the latest cloud backup into local IndexedDB across PCs and mobile phones.
  - Least-privilege scope (`https://www.googleapis.com/auth/drive.file`) ensuring zero access to other Drive files.
- **Custom OAuth Client ID Configuration**:
  - Added Settings modal (⚙️ gear icon) allowing users to configure custom Google OAuth 2.0 Web Client IDs.
- **Currency Localization**:
  - Configured Indian Rupee (`₹` / INR) as the standard default currency across metrics, ledger entries, and input forms.
- **Enhanced Cloud Error Diagnosis**:
  - Deterministic discrimination of Google Drive API error reasons (`storageQuotaExceeded` vs `accessNotConfigured`).
  - Added dedicated user alerts when Google Drive API requires project-level activation in Google Cloud Console.
- **V-Cycle Test & Governance Suite**:
  - 6 new automated unit tests (`17/17` total passing).
  - Cross-device sync integration test verifying PC-to-Mobile rehydration (`4/4` total passing).
  - Browser E2E validation recording artifact.
  - L1 Technical Review, L2 Principal Meta-Audit certifications, and Process Compliance Audit report.

---

## [v1.0.0] - 2026-10-26 (Sprint 01 Delivery)

### Added
- **Master Portal Frame**: Extensible application header with branding, module tabs, and zero-knowledge privacy status.
- **Budget & Expense Planner Sub-App**:
  - Income and expense transaction recording with amount, category, date, and notes.
  - Real-time dynamic calculation of Net Balance, Total Income, and Total Expenses.
  - Filter ledger by type (`All`, `Income`, `Expense`) and real-time text search.
  - Quick transaction deletion with automatic ledger and balance re-calculation.
- **Privacy & Storage Engine**:
  - 100% on-device persistent storage using IndexedDB (`PersonalAssistantDB`) with automatic fallback to LocalStorage.
  - Absolute zero external network calls or user data transmission.
- **Cross-Device Portability**:
  - One-click Local Backup Export (structured JSON file) for easy transfer to mobile or other PCs.
  - One-click Local Backup Restore (JSON import) with schema validation.
- **Responsive Design**: Mobile touch-optimized controls and multi-column desktop layout.

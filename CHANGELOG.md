# Changelog - Personal Assistant Suite

All notable changes to this project are documented in this file following the Keep a Changelog standard.

## [v1.3.0] - 2026-10-26 (Sprint 04 Delivery)

### Added
- **Progressive Web App (PWA) Mobile Installation**:
  - W3C Web App Manifest (`manifest.json`) enabling direct home-screen installation on mobile Chrome and iOS Safari without sideloading raw `.apk` packages (complying with enterprise MDM security policies).
  - Standalone immersive display mode without browser navigation or URL bars.
  - High-resolution adaptive PNG icons (`192x192`, `512x512`, maskable).
  - Elegant in-app "📲 Install App" prompt button in header dock listening to `beforeinstallprompt`.
- **Service Worker Offline Caching (`sw.js`)**:
  - Cache-first strategy for application shell assets (`index.html`, `style.css`, scripts, manifest, icons) under cache namespace `personal-assistant-v1.3.0`.
  - Offline fallback to application shell for offline launches.
  - Safe bypass for Google Identity Services and Google Drive cloud sync API traffic.
- **Dual-Target Asset Synchronization**:
  - `scripts/build-android.mjs` updated to automatically stage PWA manifest, service worker, and icons into native Android container assets.
  - Standalone Android APK verified and recompiled (11.39 MB).
- **Quality Assurance**:
  - 6 new automated tests (4 unit tests in `pwa_manifest_sw.test.mjs`, 2 integration tests in `pwa_offline.test.mjs`).
  - Total automated test suite expanded to 33/33 passing tests (0 failures).

---

## [v1.2.0] - 2026-10-26 (Sprint 03 Delivery)

### Added
- **Standalone Android Application (`.apk`)**:
  - Native Android application container (`com.personalassistant.app`) package compiled and verified.
  - Users can launch Personal Assistant directly from their Android device home screen without opening a web browser or typing URLs.
  - Immersive full-screen view without browser address bars, with hardware back-button navigation support.
- **100% Offline & Storage Parity**:
  - Bundled local web assets in Android app for instant offline launch (0ms network delay).
  - DOM Storage and IndexedDB persistence enabled inside Android container with zero telemetry or data leakage.
- **Dual-Target Automated Packaging Tool**:
  - `scripts/build-android.mjs` synchronizes root web assets into Android `assets/www/` and triggers APK compilation.
- **Dual-Target Verification Pipeline**:
  - 4 new automated unit tests (`tests/unit/android_packaging.test.mjs`).
  - 2 new cross-platform integration tests (`tests/integration/dual_target_persistence.test.mjs`).
  - 27/27 total automated tests passing.
  - Real Android emulator execution on `medium_phone` with screenshot evidence and Chrome DevTools Protocol testing.
  - Browser E2E validation recording on deployed web page.
  - L1 Technical Review and L2 Principal Meta-Audit certifications.

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

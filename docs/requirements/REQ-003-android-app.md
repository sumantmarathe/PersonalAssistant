# Software Requirements Specification (SRS): Android Application & Dual-Target Release

**Document ID**: REQ-003-android-app  
**Sprint**: Sprint 03  
**Status**: 🟢 Certified & Baselined  
**Author**: Requirements Analyst  
**Reviewer**: Tech Lead & Customer  

---

## 1. Executive Summary & Customer Need

### Customer Need (CN-06)
> *"For the next release, I want you to create an android app for the same. Instead of users going to this deployed page, they should just be able to open directly through this app. This also means, each time you deploy, you perform tests for both deployed page, as well as the android app. Each new release should be done for both page and android app. Means, your personas should work for both page and app."*

The application must be packaged as a standalone Android Application (`.apk`), allowing users to tap the app icon on their Android home screen and immediately launch their Personal Assistant without opening a mobile web browser or manually typing URLs. The system must maintain 100% functional, financial, and storage parity between the Web and Android editions.

---

## 2. Requirements & Gherkin Specifications

### `REQ-014`: Standalone Android Native Application Shell & Packaging
- **Description**: The Personal Assistant suite must be packaged as an installable Android APK (`com.personalassistant.app`). When launched, it displays the Personal Assistant UI in an immersive full-screen container (without browser address bars or navigation controls), complete with native app icon, custom app title, and native back-button navigation handling.
- **Gherkin**:
  ```gherkin
  Scenario: Launching Personal Assistant from Android Home Screen
    Given the Personal Assistant APK is installed on the user's Android device
    When the user taps the Personal Assistant application icon
    Then the app launches into full-screen view without browser address bars
    And the application header displays "Personal Assistant" and "Budget Planner"
    And pressing the Android physical back-button navigates within app modals before exiting
  ```

### `REQ-015`: 100% Storage & Local Persistence Parity in Android
- **Description**: The Android application must support full DOM storage and IndexedDB persistence (`PersonalAssistantDB`). Financial records added in the Android app must persist across app reboots, task kills, and device restarts completely offline, with zero data leakage.
- **Gherkin**:
  ```gherkin
  Scenario: Offline transaction persistence inside Android app
    Given the user is using the Personal Assistant Android app in offline mode
    When the user records an income of 50,000 INR and an expense of 12,500 INR
    And the user completely closes and kills the application task
    And the user reopens the Personal Assistant app
    Then the ledger immediately displays both transactions
    And the Net Balance displays "₹37,500.00" with zero data loss
  ```

### `REQ-016`: Android Cloud Sync & Google Drive Compatibility
- **Description**: The Android application must support Google Drive synchronization and authentication. When online, the user can connect their Google account, back up their budget to their private Google Drive, and restore from Drive, maintaining identical security (`drive.file` scope) and INR currency formatting.
- **Gherkin**:
  ```gherkin
  Scenario: Google Drive cloud sync from Android app
    Given the user is in the Personal Assistant Android app with network connectivity
    When the user initiates Google Drive sync
    Then the backup JSON envelope is uploaded directly to the user's Google Drive
    And the sync status badge displays "Synced to Drive"
  ```

### `REQ-017`: Dual-Target Automated Verification Suite
- **Description**: The project's automated test framework and QA procedures must execute tests for BOTH the deployed web application and the Android application on every release cycle.
- **Gherkin**:
  ```gherkin
  Scenario: Release verification gate entry
    Given a release candidate branch is prepared
    When the test automation pipeline executes
    Then Node.js unit and integration test suites pass (100%)
    And browser E2E tests pass against the live web deployment
    And Android device/emulator E2E tests pass against the installed APK
  ```

### `REQ-018`: Dual-Target Production Build & Release Artifacts
- **Description**: Every release merged to `main` must produce both:
  1. Updated live web deployment on GitHub Pages (`https://sumantmarathe.github.io/PersonalAssistant/`).
  2. Standalone compiled and signed Android APK artifact (`personal-assistant-release.apk`) ready for direct sideloading or distribution.
- **Gherkin**:
  ```gherkin
  Scenario: Publishing a release to mainline
    Given all dual-target tests have achieved Gate 5 clearance
    When the release is merged to main
    Then the GitHub Pages site is updated with the latest web build
    And the Android APK binary is built and archived in release assets
  ```

---

## 3. Definition of Ready (DoR) Checklist
- [x] Clear business intent and user story established by Customer.
- [x] 5 discrete requirement identifiers defined (`REQ-014` through `REQ-018`).
- [x] Gherkin acceptance criteria formulated with positive, negative, and edge scenarios.
- [x] Target platform specifications defined (Android 8.0+ / API 26+).
- [x] **Gate 0 Status**: **PASSED** &rarr; Ready for System Architect (`SPEC-003`).

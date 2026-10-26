# Requirements Specification: Progressive Web App (PWA) Mobile Installation (REQ-004)

**Sprint**: Sprint 04 (v1.3.0)  
**Author**: **Product Owner / Requirements Analyst**  
**Reviewer**: **Tech Lead**  
**Target Delivery**: Web PWA (GitHub Pages) & Native Android Container parity  
**Status**: 🟢 **BASELINED & CERTIFIED (Gate 0)**  

---

## 1. Context & Business Need

The customer requires direct mobile installation and offline application launch, but is prevented by corporate work policy/MDM from sideloading raw `.apk` packages via "Unknown Sources" or `adb`. 

Transforming the Personal Assistant web application into a fully certified **Progressive Web App (PWA)** provides:
1. Native-like home screen installation directly through mobile Chrome.
2. Full MDM compliance without needing device admin overrides or unknown-source permissions.
3. Offline app launch via Service Worker cache storage.
4. Seamless integration with existing local IndexedDB persistence and Google Drive cloud backup.

---

## 2. Discrete Functional & Non-Functional Requirements

### [REQ-019] Web App Manifest Specification
- **Description**: The application MUST provide a valid W3C Web App Manifest (`manifest.json`) linked from `index.html`.
- **Fields Required**:
  - `name`: `"Personal Assistant • Budget & Expense Planner"`
  - `short_name`: `"Personal Assistant"`
  - `start_url`: `"./index.html"`
  - `scope`: `"./"`
  - `display`: `"standalone"` (ensures launch without browser navigation bars or URL controls)
  - `background_color`: `"#0f172a"` (Slate 900)
  - `theme_color`: `"#0f172a"` (matches app dark theme navigation bar)
  - `orientation`: `"portrait-primary"`
  - `icons`: High-resolution PNG icons (192x192, 512x512, and maskable).
- **Gherkin Scenario**:
  ```gherkin
  Scenario: Web manifest discovery and validation
    Given a mobile browser visits the Personal Assistant web application
    When the browser parses the HTML head
    Then it finds a valid <link rel="manifest" href="manifest.json">
    And the manifest contains name, short_name, standalone display mode, and high-res icons.
  ```

---

### [REQ-020] Service Worker & Offline Caching Engine
- **Description**: The application MUST register a Service Worker (`sw.js`) that caches core application shell resources (HTML, CSS, JS, manifest, and icons) using a cache-first or network-first caching strategy with offline fallback.
- **Cache Name**: `personal-assistant-v1.3.0`
- **Scope**: Entire application root `./`.
- **Gherkin Scenario**:
  ```gherkin
  Scenario: Offline application load via Service Worker
    Given the user has previously loaded the application once
    When network connectivity is completely severed (offline mode)
    And the user opens the application from their mobile home screen
    Then the Service Worker serves cached application shell assets
    And the user interface renders with all existing transactions from IndexedDB.
  ```

---

### [REQ-021] In-App Install Prompt User Experience
- **Description**: The application MUST listen for the browser's `beforeinstallprompt` event. When triggered, it MUST display an elegant, non-intrusive "📲 Install App" action button in the top navigation header dock.
- **Behavior**:
  - Clicking "Install App" triggers the deferred native prompt (`prompt()`).
  - Upon user acceptance or dismissal, the button cleanly hides.
  - If the app is already running in `standalone` display mode, the install button remains hidden.
- **Gherkin Scenario**:
  ```gherkin
  Scenario: User triggers in-app PWA installation
    Given the browser supports beforeinstallprompt and the app is not yet installed
    When the beforeinstallprompt event fires
    Then an "Install App" button appears in the navigation dock
    When the user clicks the button
    Then the browser displays the native installation modal
    And upon confirmation, the app is added to the user's home screen.
  ```

---

### [REQ-022] Dual-Target Release & Asset Synchronization Parity
- **Description**: All PWA assets (`manifest.json`, `sw.js`, `icons/`) MUST be automatically synchronized into the Android project assets directory (`android/app/src/main/assets/www/`) by `scripts/build-android.mjs`, ensuring that the native Android APK build continues to compile and execute without regression.
- **Gherkin Scenario**:
  ```gherkin
  Scenario: Android build bundles PWA assets without regression
    Given the automated Android build script is executed
    When scripts/build-android.mjs copies the web assets
    Then manifest.json, sw.js, and icons are copied into android/app/src/main/assets/www/
    And ./gradlew assembleDebug compiles successfully producing an installable APK.
  ```

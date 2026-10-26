# Technical Design Specification: Progressive Web App (PWA) (SPEC-004)

**Sprint**: Sprint 04 (v1.3.0)  
**Author**: **Software Architect**  
**Reviewer**: **Tech Lead**  
**Gate**: Gate 1 (Architecture & Pre-Flight)  
**Status**: 🟢 **APPROVED & BASELINED**  

---

## 1. Architectural Overview

To satisfy corporate MDM compliance and deliver an app experience on mobile devices without sideloading raw `.apk` packages, the web application is augmented with W3C Progressive Web App standards:

```
+-------------------------------------------------------------+
|                      Mobile Device Screen                   |
|  +-------------------------------------------------------+  |
|  | User Home Screen Icon ("Personal Assistant")          |  |
|  +-------------------------------------------------------+  |
|                            | (Launches Standalone)          |
|                            v                                |
|  +-------------------------------------------------------+  |
|  | PWA Standalone Window (No Browser Chrome / URL bar)   |  |
|  | - index.html + style.css + app.js                     |  |
|  +-------------------------------------------------------+  |
|             |                             |                 |
|             v (Local Data)                v (Assets)        |
|    +-------------------+        +--------------------+      |
|    | Local IndexedDB   |        | Service Worker     |      |
|    | (100% Offline)    |        | (Cache-First Shell)|      |
|    +-------------------+        +--------------------+      |
+-------------------------------------------------------------+
```

---

## 2. Component Specifications

### 2.1 Manifest Configuration (`manifest.json`)
The manifest must reside at the repository root and be linked in `index.html`:
```json
{
  "name": "Personal Assistant • Budget & Expense Planner",
  "short_name": "Personal Assistant",
  "description": "Privacy-first modular personal assistant and budget planner.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### 2.2 Service Worker Strategy (`sw.js`)
- **Cache Strategy**: Cache-First for static assets; Network-First for API calls (Google Drive / GIS).
- **Cache Storage Name**: `personal-assistant-v1.3.0`
- **Cached Asset URLs**:
  - `./`
  - `./index.html`
  - `./css/style.css`
  - `./js/app.js`
  - `./js/budgetApp.js`
  - `./js/storage.js`
  - `./js/googleDriveService.js`
  - `./manifest.json`
  - `./icons/icon-192.png`
  - `./icons/icon-512.png`
- **Lifecycle Management**:
  - `install`: `waitUntil(caches.open(...).then(cache => cache.addAll(...)))` and `self.skipWaiting()`.
  - `activate`: Cleans up outdated caches and claims clients immediately (`self.clients.claim()`).
  - `fetch`: Intercepts same-origin requests, returns cached response if available, or falls back to network.

### 2.3 In-App Install Prompt Flow
1. App listens for `window.addEventListener('beforeinstallprompt', e => { ... })`.
2. Stores `deferredPrompt = e`.
3. Reveals `#installAppBtn` in header navigation dock.
4. On click:
   - Calls `deferredPrompt.prompt()`.
   - Awaits `deferredPrompt.userChoice`.
   - Hides `#installAppBtn`.
5. Listens for `appinstalled` event to log telemetry and ensure button remains hidden.

---

## 3. Pre-Flight Dependency & Verification Checklist

- [x] **HTTPS Transport**: Certified. GitHub Pages serves over HTTPS (`https://sumantmarathe.github.io/PersonalAssistant/`), satisfying browser PWA installation security requirements.
- [x] **Icon Rendering**: Icons generated in 192x192 and 512x512 with proper PNG encoding and maskable padding.
- [x] **Scope Compatibility**: Manifest `scope: "./"` works uniformly on GitHub Pages subpaths (`/PersonalAssistant/`) as well as local HTTP servers (`/`).
- [x] **Dual-Target Safe**: Android build script `scripts/build-android.mjs` updated to copy `manifest.json`, `sw.js`, and `icons/` into `android/app/src/main/assets/www/`.

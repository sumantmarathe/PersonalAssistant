# Software Requirements Specification (SRS): Google Sign-In & Google Drive Sync

**Document ID**: `REQ-SPEC-002`  
**Parent Epic**: `EPIC-02: Cloud Sync via Personal Google Drive (Zero Third-Party Storage)`  
**Author**: Requirements Analyst  
**Approved By**: Tech Lead (Gate 0 Clearance)  
**Status**: 🟢 APPROVED  

---

## 1. Executive Summary & Privacy Mandate
Enable users to sign in with their personal Google Account and synchronize their Personal Assistant budget data directly to/from their personal Google Drive. 

**Zero Third-Party Storage Mandate**:
- All network transactions occur strictly between the client's browser and Google's official Drive API (`https://www.googleapis.com/`).
- Zero data is routed through or stored on any intermediary server.
- The app requests restricted least-privilege scope (`https://www.googleapis.com/auth/drive.file` or `https://www.googleapis.com/auth/drive.appdata`), ensuring the app can never inspect or touch any other files in the user's Drive.

---

## 2. Traceable Functional Requirements

### `REQ-009`: Google Identity Authentication (OAuth 2.0)
- **Description**: The user can sign in using their Google account via Google Identity Services (GIS). Upon authentication, the UI reflects the signed-in state, showing the user's email or account badge.
- **Gherkin**:
  ```gherkin
  Scenario: Connecting Google Account
    Given the user is on the Personal Assistant portal
    When the user clicks "Connect Google Drive"
    And completes the Google OAuth authorization prompt
    Then the application receives an OAuth access token
    And the UI displays the connected Google user identity
    And the "Sync to Drive" and "Restore from Drive" actions become active
  ```

### `REQ-010`: Google OAuth Client ID Configuration
- **Description**: The app must provide an intuitive Settings modal allowing the user to configure or customize their Google OAuth Client ID, persisted in local storage.
- **Gherkin**:
  ```gherkin
  Scenario: Customizing Google Client ID
    Given the user opens the Cloud Sync Settings modal
    When the user enters their custom Google OAuth Client ID
    And clicks "Save Configuration"
    Then the Client ID is saved in local storage
    And the Google Identity client is re-initialized with the new Client ID
  ```

### `REQ-011`: Sync to Drive (Cloud Backup)
- **Description**: The user can upload their current local database to their personal Google Drive as a single JSON file named `personal_assistant_budget_backup.json`.
- **Gherkin**:
  ```gherkin
  Scenario: Syncing local budget to Google Drive
    Given the user is authenticated with Google Drive
    And local transactions exist in the ledger
    When the user clicks "Sync to Drive"
    Then the app packages the backup envelope
    And uploads/updates "personal_assistant_budget_backup.json" on Google Drive
    And displays a success toast with the timestamp of the last sync
  ```

### `REQ-012`: Restore from Drive (Cloud Import)
- **Description**: The user can fetch the latest `personal_assistant_budget_backup.json` from their Google Drive and merge/restore it into their local on-device IndexedDB database.
- **Gherkin**:
  ```gherkin
  Scenario: Restoring budget from Google Drive
    Given the user is signed in to Google Drive on a new PC or mobile device
    When the user clicks "Restore from Drive"
    Then the app queries Google Drive for "personal_assistant_budget_backup.json"
    And downloads and validates the backup envelope
    And restores transactions into local IndexedDB
    And refreshes the UI ledger and balance metrics immediately
  ```

### `REQ-013`: Disconnect & Session Termination
- **Description**: The user can disconnect their Google account at any time. Disconnecting revokes or discards the active token and returns the app to offline-only mode without affecting local data.
- **Gherkin**:
  ```gherkin
  Scenario: Disconnecting Google account
    Given the user is currently connected to Google Drive
    When the user clicks "Disconnect Google Drive"
    Then the access token is cleared from memory
    And the UI returns to the disconnected state
    And all local transactions remain intact in IndexedDB
  ```

---

## 3. Definition of Ready (DoR) Gate 0 Sign-Off
- [x] All 5 requirements uniquely identified (`REQ-009` through `REQ-013`).
- [x] Gherkin scenarios defined for each requirement.
- [x] Least-privilege OAuth scope constraint validated.
- **Gate 0 Status**: **PASSED** &rarr; Ready for System Architect (`TASK-010`).

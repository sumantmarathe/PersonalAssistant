# Google Play Store Release & Submission Guide

> **Target Application:** Personal Assistant • Budget & Expense Planner  
> **Package Identifier / Application ID:** `com.sumantmarathe.personalassistant`  
> **Target Android Version:** Android 14+ / 16 (API Level 36, Min SDK 26)  
> **Architecture:** Local-First, Zero-Knowledge PWA inside Native Android Shell  
> **Release Artifact:** Android App Bundle (`app-release.aab`)  
> **Privacy Policy URL:** `https://sumantmarathe.github.io/PersonalAssistant/privacy.html`

---

## 1. Quick Build Commands

All release commands are automated via the dual-target packaging script:

```bash
# Build Google Play App Bundle (.aab) signed with release key
node scripts/build-android.mjs --bundle

# Build Sideloadable Production APK (.apk) signed with release key
node scripts/build-android.mjs --release

# Build Both (.aab and .apk) concurrently
node scripts/build-android.mjs --all

# Standard Debug APK (for local emulators or USB debugging)
node scripts/build-android.mjs
```

### Generated Artifact Paths
- **Play Store App Bundle:** `android/app/build/outputs/bundle/release/app-release.aab`
- **Release Signed APK:** `android/app/build/outputs/apk/release/app-release.apk`
- **Debug APK:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 2. Release Keystore & Security Configuration

The release keystore is generated with standard 2048-bit RSA encryption and a 10,000-day validity:
- **Keystore File:** `android/app/release.keystore` *(git-ignored)*
- **Key Alias:** `personalassistant`
- **Signing Config:** `android/key.properties` *(git-ignored)*
- **Template:** `android/key.properties.example` *(committed for reference)*

> [!WARNING]
> Keep a secure backup of `android/app/release.keystore` and its passwords in a password manager. Once an app is published with Play App Signing, Google requires this key for subsequent bundle uploads unless Play App Signing key generation is managed by Google Cloud KMS.

---

## 3. Google Play Console Setup Steps

### Step A: Create Application
1. Log into [Google Play Console](https://play.google.com/console).
2. Click **Create app**:
   - **App name:** `Personal Assistant: Budget & Expense`
   - **Default language:** `English (United States)` or `English (India)`
   - **App or game:** `App`
   - **Free or paid:** `Free`
   - **Declarations:** Accept Developer Program Policies and US export laws.

---

### Step B: Store Listing & Graphic Assets
Under **Grow > Store presence > Main store listing**:

| Asset Field | Specification | File Location in Repo |
| :--- | :--- | :--- |
| **App Icon** | 512 × 512 px, 32-bit PNG, max 1MB | `icons/play-store-icon-512.png` |
| **Feature Graphic** | 1024 × 500 px, 24-bit PNG/JPEG | `icons/play-store-feature-graphic-1024x500.png` |
| **Phone Screenshots** | Min 2, Max 8 portrait screenshots | `docs/audits/` (or captured device screens) |

#### Store Listing Copy
- **Short Description (max 80 chars):**  
  *Private, zero-knowledge personal budget tracker and bank statement analyzer.*
- **Full Description (max 4000 chars):**
  ```markdown
  Personal Assistant is a modern, zero-knowledge personal finance and budget manager engineered from the ground up for total privacy.

  KEY FEATURES:
  • 100% Local-First & Zero-Knowledge: Your financial data never leaves your phone. We do not track, collect, or store your transactions on remote servers.
  • Smart Bank Statement Parsing: Drag and drop or browse PDF and CSV bank statements from major banks (SBI, HDFC, ICICI, Axis, and universal formats). All parsing executes client-side on your device.
  • Multi-Account Management: Seamlessly organize and filter transactions across savings accounts, credit cards, digital wallets, and cash.
  • Rich Analytics & Visual Trends: Interactive spending bar charts, category breakdowns, monthly burn rates, and savings tracking.
  • Optional Google Drive Sync: Direct client-to-Google-Drive backup using your personal Google account. No intermediary relay servers.
  • Offline by Design: Fast, responsive, and completely functional without an active internet connection.
  • Data Portability: Instant JSON backup, restore, and granular bulk-purge controls.
  ```

---

### Step C: Policy & Content Declarations

Google Play has strict requirements for Financial Apps and Data Safety:

#### 1. Privacy Policy
- Provide the public URL:  
  `https://sumantmarathe.github.io/PersonalAssistant/privacy.html`

#### 2. App Access
- Select: **All functionality is available without special access** (No user login wall is required to use the app).

#### 3. Ads Declaration
- Select: **No, my app does not contain ads**.

#### 4. Content Rating (IARC)
- Category: **Utility, Productivity, Communication, or other**
- Violence, sexual content, offensive language, controlled substances: **No**
- Does the app share user location?: **No**
- Does the app allow users to interact or exchange messages?: **No**
- Does the app share personal information with third parties?: **No**
- Expected Rating: **PEGI 3 / Everyone (All ages)**.

#### 5. Target Audience & Content
- Target age: **18 and over** (Financial / Budgeting tools).

#### 6. Financial Features Declaration
Under **Policy > Financial features**:
- Category: **Personal financial management (PFM)**
- Check: *Personal finance tracking / expense recording*
- Confirm that the app does **NOT** provide lending, banking licenses, crypto trading, or securities brokerage.
- Declare that all ledger storage is local or user-configured Google Drive.

#### 7. Data Safety Questionnaire (Crucial)
Google Play's Data Safety section must match your privacy policy:
- **Does your app collect or share any user data?**
  👉 Select: **No** (Local-only storage on device).
- **Does the app collect ephemeral device IDs?**
  👉 Select: **No**.
- **Are all data transmissions encrypted over HTTPS?**
  👉 Select: **Yes** (Google Drive API uses TLS 1.3).
- **Can users request data deletion?**
  👉 Select: **Yes** (Built-in Purge All Data tool wipes all records instantly).

---

### Step D: Testing & Rollout Strategy

> [!NOTE]
> For Google Play developer accounts created after November 2023, Google requires **Closed Testing** with a minimum of **20 testers opted-in for at least 14 days** before applying for Production release.

1. Navigate to **Release > Testing > Closed testing**.
2. Create a track (e.g. `Alpha` or `Closed Beta`).
3. Upload `app-release.aab`.
4. Invite tester emails (Google Groups or email list).
5. After 14 consecutive days of active testing, click **Apply for Production**.

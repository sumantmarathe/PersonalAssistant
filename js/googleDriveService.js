/**
 * GoogleDriveService - Seamless Google Sign-In & Automated Cloud Sync
 * Connects directly between user browser and Google Drive API via OAuth 2.0.
 * Eliminates developer jargon; provides consumer-grade "Sign in with Google".
 */
class GoogleDriveService {
  constructor() {
    // Registered Google OAuth 2.0 Web Client ID
    this.clientId = '346635727868-js7g17t1nklilet2c28b4i54o5is2eil.apps.googleusercontent.com';
    this.fileName = 'personal_assistant_budget_backup.json';
    this.scope = 'https://www.googleapis.com/auth/drive.file';

    this.tokenClient = null;
    this.accessToken = null;
    this.userInfo = null;
    this.isGsiLoaded = false;
    this.syncListeners = [];
    this.authListeners = [];
  }

  async init() {
    this._loadGsiScript();
    this._restoreCachedSession();
  }

  _loadGsiScript() {
    if (typeof window === 'undefined') return;
    if (window.google && window.google.accounts) {
      this.isGsiLoaded = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.isGsiLoaded = true;
      console.log('GoogleDriveService: Google Identity Services SDK ready.');
    };
    document.head.appendChild(script);
  }

  _restoreCachedSession() {
    try {
      const cached = localStorage.getItem('pa_google_user_session');
      if (cached) {
        this.userInfo = JSON.parse(cached);
      }
    } catch (e) {}
  }

  isConnected() {
    return !!this.accessToken;
  }

  getUser() {
    return this.userInfo || null;
  }

  onAuthChange(callback) {
    this.authListeners.push(callback);
  }

  onSyncStatusChange(callback) {
    this.syncListeners.push(callback);
  }

  _notifyAuth(isSignedIn) {
    this.authListeners.forEach((fn) => fn(isSignedIn, this.userInfo));
  }

  _notifySync(status) {
    this.syncListeners.forEach((fn) => fn(status));
  }

  /**
   * Consumer-grade Google Sign-In
   */
  async signIn() {
    // If running inside Android native wrapper, use native Google Play Services Auth bridge
    if (typeof window !== 'undefined' && window.AndroidNativeBridge && typeof window.AndroidNativeBridge.requestGoogleSignIn === 'function') {
      return new Promise((resolve, reject) => {
        this._nativeAuthResolve = resolve;
        this._nativeAuthReject = reject;
        window.AndroidNativeBridge.requestGoogleSignIn();
      });
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      throw new Error('Google Sign-In is initializing. Please verify internet connection and try again.');
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: this.scope,
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              reject(new Error(tokenResponse.error_description || tokenResponse.error));
              return;
            }

            this.accessToken = tokenResponse.access_token;

            // Fetch user identity
            try {
              const profile = await this._fetchUserProfile(this.accessToken);
              this.userInfo = {
                name: profile.name || 'Google User',
                email: profile.email || 'user@gmail.com',
                picture: profile.picture || null
              };
              localStorage.setItem('pa_google_user_session', JSON.stringify(this.userInfo));
            } catch (e) {
              this.userInfo = { name: 'Google User', email: 'Connected' };
            }

            this._notifyAuth(true);
            resolve(this.userInfo);
          }
        });

        this.tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Native Android Auth Bridge Callback: Success
   */
  handleNativeAuthSuccess(accessToken, email, name, picture) {
    this.accessToken = accessToken;
    this.userInfo = {
      name: name || 'Google User',
      email: email || 'user@gmail.com',
      picture: picture || null
    };
    try {
      localStorage.setItem('pa_google_user_session', JSON.stringify(this.userInfo));
    } catch (e) {}

    this._notifyAuth(true);

    if (this._nativeAuthResolve) {
      this._nativeAuthResolve(this.userInfo);
      this._nativeAuthResolve = null;
      this._nativeAuthReject = null;
    }
  }

  /**
   * Native Android Auth Bridge Callback: Error / Cancel
   */
  handleNativeAuthError(errorMessage) {
    this._notifyAuth(false);
    if (this._nativeAuthReject) {
      this._nativeAuthReject(new Error(errorMessage || 'Google Sign-In was cancelled.'));
      this._nativeAuthResolve = null;
      this._nativeAuthReject = null;
    }
  }

  /**
   * Consumer-grade Sign Out
   */
  async signOut() {
    if (typeof window !== 'undefined' && window.AndroidNativeBridge && typeof window.AndroidNativeBridge.requestGoogleSignOut === 'function') {
      try {
        window.AndroidNativeBridge.requestGoogleSignOut();
      } catch (e) {}
    }

    if (this.accessToken && window.google && window.google.accounts && window.google.accounts.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(this.accessToken, () => {});
      } catch (e) {}
    }

    this.accessToken = null;
    this.userInfo = null;
    localStorage.removeItem('pa_google_user_session');
    this._notifyAuth(false);
  }

  /**
   * Background Auto-Sync to Google Drive
   */
  async autoSync(contentString) {
    if (!this.accessToken) return;

    this._notifySync('syncing');
    try {
      const existingFile = await this._findExistingFile();

      if (existingFile) {
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
        const res = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: contentString
        });
        if (!res.ok) {
          await this._handleApiError(res);
          return;
        }
      } else {
        const metadata = { name: this.fileName, mimeType: 'application/json' };
        const boundary = '-------pa_boundary_' + Date.now();
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          contentString +
          closeDelimiter;

        const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        const res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });
        if (!res.ok) {
          await this._handleApiError(res);
          return;
        }
      }

      this._notifySync('synced');
    } catch (err) {
      console.warn('Auto-sync error:', err);
      this._notifySync('error', err.message);
    }
  }

  async _handleApiError(res) {
    let errBody = null;
    try {
      errBody = await res.json();
    } catch (e) {}

    const reason = errBody?.error?.errors?.[0]?.reason || '';
    const message = errBody?.error?.message || '';

    if (reason === 'storageQuotaExceeded') {
      this._notifySync('quota_exceeded', 'Your Google Drive storage is full.');
    } else if (res.status === 403 && (reason === 'accessNotConfigured' || message.toLowerCase().includes('google drive api'))) {
      this._notifySync('drive_api_disabled', 'Google Drive API is disabled in your Google Cloud project.');
    } else {
      this._notifySync('error', message || `Drive error (HTTP ${res.status})`);
    }
  }

  /**
   * Download and restore cloud data
   */
  async fetchCloudBackup() {
    if (!this.accessToken) return null;

    const file = await this._findExistingFile();
    if (!file) return null;

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    const res = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });

    if (!res.ok) throw new Error('Could not fetch cloud data');
    return await res.text();
  }

  async _findExistingFile() {
    const query = encodeURIComponent(`name = '${this.fileName}' and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`;

    const res = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.accessToken = null;
        this._notifyAuth(false);
      } else if (res.status === 403) {
        await this._handleApiError(res);
      }
      return null;
    }

    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  async _fetchUserProfile(token) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return { name: 'Google User', email: 'user@gmail.com' };
    return await res.json();
  }
}

window.googleDriveService = new GoogleDriveService();

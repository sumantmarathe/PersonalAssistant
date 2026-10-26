/**
 * GoogleDriveService - Zero-Intermediary Google Drive Backup & Sync
 * Connects directly between user browser and Google Drive API via OAuth 2.0.
 * Adheres to REQ-009 through REQ-013.
 */
class GoogleDriveService {
  constructor() {
    this.defaultClientId = '408226849318-pa-budget-planner.apps.googleusercontent.com';
    this.storageKeyClientId = 'pa_google_oauth_client_id';
    this.fileName = 'personal_assistant_budget_backup.json';
    this.scope = 'https://www.googleapis.com/auth/drive.file';

    this.tokenClient = null;
    this.accessToken = null;
    this.userEmail = null;
    this.isGsiLoaded = false;
    this.listeners = [];
  }

  /**
   * Initializes the Google Identity Services client
   */
  async init() {
    this._loadGsiScript();
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
      console.log('GoogleDriveService: Google Identity Services SDK loaded.');
    };
    script.onerror = () => {
      console.warn('GoogleDriveService: Could not load Google Identity Services SDK.');
    };
    document.head.appendChild(script);
  }

  getClientId() {
    try {
      return localStorage.getItem(this.storageKeyClientId) || this.defaultClientId;
    } catch (e) {
      return this.defaultClientId;
    }
  }

  setCustomClientId(id) {
    if (!id || !id.trim()) return;
    try {
      localStorage.setItem(this.storageKeyClientId, id.trim());
      this.tokenClient = null; // Reset client so next signIn uses new client ID
    } catch (e) {
      console.error('Failed to save Client ID to localStorage', e);
    }
  }

  isConnected() {
    return !!this.accessToken;
  }

  getUserEmail() {
    return this.userEmail || 'Google User';
  }

  onStateChange(callback) {
    this.listeners.push(callback);
  }

  _notifyStateChange() {
    this.listeners.forEach((fn) => fn(this.isConnected(), this.userEmail));
  }

  /**
   * Initiates Google Sign-In via OAuth 2.0 Token Client popup
   */
  async signIn() {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      throw new Error('Google Identity Services SDK is not yet loaded. Please check your internet connection.');
    }

    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('Please configure a valid Google OAuth Client ID in Settings first.');
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: this.scope,
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              reject(new Error(tokenResponse.error_description || tokenResponse.error));
              return;
            }

            this.accessToken = tokenResponse.access_token;

            // Fetch basic profile info to display user's email
            try {
              const userInfo = await this._fetchUserInfo(this.accessToken);
              this.userEmail = userInfo.email || 'Connected Account';
            } catch (e) {
              this.userEmail = 'Connected Account';
            }

            this._notifyStateChange();
            resolve({ token: this.accessToken, email: this.userEmail });
          }
        });

        // Request access token
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Signs out and revokes active token
   */
  async signOut() {
    if (this.accessToken && window.google && window.google.accounts && window.google.accounts.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(this.accessToken, () => {
          console.log('GoogleDriveService: Token revoked.');
        });
      } catch (e) {
        console.warn('Revocation error', e);
      }
    }

    this.accessToken = null;
    this.userEmail = null;
    this._notifyStateChange();
  }

  /**
   * Uploads or updates the backup file on Google Drive
   * @param {string} contentString 
   */
  async uploadBackup(contentString) {
    if (!this.accessToken) {
      throw new Error('Not connected to Google Drive. Please connect first.');
    }

    // 1. Search for existing file
    const existingFile = await this._findExistingFile();

    if (existingFile) {
      // 2a. Update existing file content
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
        throw new Error(`Failed to update backup file on Google Drive (HTTP ${res.status})`);
      }

      return {
        success: true,
        fileId: existingFile.id,
        timestamp: new Date().toLocaleTimeString()
      };
    } else {
      // 2b. Create new file via multipart upload
      const metadata = {
        name: this.fileName,
        mimeType: 'application/json'
      };

      const boundary = '-------pa_boundary_' + Date.now();
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
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
        body: multipartRequestBody
      });

      if (!res.ok) {
        throw new Error(`Failed to create backup file on Google Drive (HTTP ${res.status})`);
      }

      const result = await res.json();
      return {
        success: true,
        fileId: result.id,
        timestamp: new Date().toLocaleTimeString()
      };
    }
  }

  /**
   * Downloads the backup file from Google Drive
   * @returns {Promise<string>} Content JSON
   */
  async downloadBackup() {
    if (!this.accessToken) {
      throw new Error('Not connected to Google Drive. Please connect first.');
    }

    const file = await this._findExistingFile();
    if (!file) {
      throw new Error('No Personal Assistant backup file found in your Google Drive.');
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    const res = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to download backup from Google Drive (HTTP ${res.status})`);
    }

    const content = await res.text();
    return content;
  }

  // --- Internal Helpers ---

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
        this._notifyStateChange();
        throw new Error('Google session expired. Please re-connect to Google Drive.');
      }
      throw new Error(`Drive search failed (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  async _fetchUserInfo(token) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) return { email: 'Google User' };
    return await res.json();
  }
}

// Global instance
window.googleDriveService = new GoogleDriveService();

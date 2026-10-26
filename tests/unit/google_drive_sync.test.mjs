import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Logic validator for Google Drive Sync Payload & Client Configurations
class MockGoogleDriveService {
  constructor() {
    this.defaultClientId = '408226849318-pa-budget-planner.apps.googleusercontent.com';
    this.customClientId = null;
    this.accessToken = null;
    this.userEmail = null;
    this.fileName = 'personal_assistant_budget_backup.json';
    this.scope = 'https://www.googleapis.com/auth/drive.file';
  }

  getClientId() {
    return this.customClientId || this.defaultClientId;
  }

  setCustomClientId(id) {
    if (id && id.trim()) {
      this.customClientId = id.trim();
    }
  }

  setMockToken(token, email) {
    this.accessToken = token;
    this.userEmail = email;
  }

  signOut() {
    this.accessToken = null;
    this.userEmail = null;
  }

  isConnected() {
    return !!this.accessToken;
  }

  buildSearchQuery() {
    return `name = '${this.fileName}' and trashed = false`;
  }

  buildMultipartBody(contentString) {
    const boundary = '-------pa_test_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    const metadata = { name: this.fileName, mimeType: 'application/json' };

    return (
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      contentString +
      closeDelimiter
    );
  }
}

describe('Unit Test Suite: Google Drive Service Configuration & Payload (REQ-009, REQ-010)', () => {
  test('Returns default client ID when no custom ID is configured', () => {
    const gds = new MockGoogleDriveService();
    assert.match(gds.getClientId(), /apps\.googleusercontent\.com/);
  });

  test('Accepts and updates custom Google OAuth Client ID', () => {
    const gds = new MockGoogleDriveService();
    gds.setCustomClientId('my-custom-client-123.apps.googleusercontent.com');
    assert.equal(gds.getClientId(), 'my-custom-client-123.apps.googleusercontent.com');
  });

  test('Formulates the exact Drive API search query for backup file', () => {
    const gds = new MockGoogleDriveService();
    const query = gds.buildSearchQuery();
    assert.equal(query, "name = 'personal_assistant_budget_backup.json' and trashed = false");
  });

  test('Constructs valid multipart request body with JSON metadata and payload', () => {
    const gds = new MockGoogleDriveService();
    const dummyPayload = JSON.stringify({ test: 'data' });
    const body = gds.buildMultipartBody(dummyPayload);
    assert.match(body, /Content-Type: application\/json/);
    assert.match(body, /personal_assistant_budget_backup\.json/);
    assert.match(body, /"test":"data"/);
  });
});

describe('Unit Test Suite: Google Drive Authentication State (REQ-009, REQ-013)', () => {
  test('Accurately reflects connected status when token is set', () => {
    const gds = new MockGoogleDriveService();
    assert.equal(gds.isConnected(), false);
    gds.setMockToken('ya29.sample_oauth_token', 'user@example.com');
    assert.equal(gds.isConnected(), true);
    assert.equal(gds.userEmail, 'user@example.com');
  });

  test('Clears active token and email on signOut', () => {
    const gds = new MockGoogleDriveService();
    gds.setMockToken('ya29.sample_oauth_token', 'user@example.com');
    assert.equal(gds.isConnected(), true);
    gds.signOut();
    assert.equal(gds.isConnected(), false);
    assert.equal(gds.accessToken, null);
    assert.equal(gds.userEmail, null);
  });
});

/**
 * Etsy Automation - OAuth Authentication
 *
 * Implements Etsy Open API v3 OAuth 2.0 PKCE flow for
 * secure authentication without exposing client secrets.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { URL } from 'url';
import { EtsyCredentials } from '../config/types';

// ============================================================
// CONFIGURATION
// ============================================================

const ETSY_API_BASE = 'https://api.etsy.com/v3';
const ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

const CREDENTIALS_FILE = path.join(process.cwd(), 'data', 'etsy', 'credentials.json');
const DEFAULT_REDIRECT_PORT = 3030;
const DEFAULT_REDIRECT_URI = `http://localhost:${DEFAULT_REDIRECT_PORT}/callback`;

// Required scopes for listing management
const REQUIRED_SCOPES = [
  'listings_r',       // Read listings
  'listings_w',       // Write listings
  'listings_d',       // Delete listings
  'shops_r',          // Read shop info
  'shops_w',          // Write shop info
  'profile_r',        // Read profile
  'transactions_r'    // Read transactions (for order validation)
];

// ============================================================
// TYPES
// ============================================================

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in?: number;
}

interface StoredCredentials {
  apiKey: string;
  accessToken: string;
  refreshToken: string;
  shopId: string;
  expiresAt: number;
  refreshExpiresAt?: number;
}

// ============================================================
// PKCE HELPERS
// ============================================================

/**
 * Generate a cryptographically random code verifier
 */
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate code challenge from verifier (SHA256)
 */
function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

/**
 * Generate a random state parameter
 */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// ============================================================
// CREDENTIAL STORAGE
// ============================================================

/**
 * Load stored credentials from disk
 */
export function loadCredentials(): StoredCredentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return null;
    }

    const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(data) as StoredCredentials;
  } catch (error) {
    console.error('[EtsyAuth] Error loading credentials:', error);
    return null;
  }
}

/**
 * Save credentials to disk
 */
function saveCredentials(credentials: StoredCredentials): void {
  const dir = path.dirname(CREDENTIALS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
  console.log('[EtsyAuth] Credentials saved successfully');
}

/**
 * Check if credentials are valid and not expired
 */
export function areCredentialsValid(): boolean {
  const credentials = loadCredentials();
  if (!credentials) return false;

  // Check if access token is expired (with 5 minute buffer)
  const now = Date.now();
  return credentials.expiresAt > now + (5 * 60 * 1000);
}

/**
 * Check if refresh token is valid
 */
export function canRefreshToken(): boolean {
  const credentials = loadCredentials();
  if (!credentials) return false;

  // If no refresh expiry is set, assume it's valid
  if (!credentials.refreshExpiresAt) return true;

  return credentials.refreshExpiresAt > Date.now();
}

// ============================================================
// OAUTH FLOW
// ============================================================

/**
 * Start the OAuth authorization flow
 * Opens browser and starts local server to receive callback
 */
export async function startAuthFlow(apiKey: string): Promise<StoredCredentials> {
  return new Promise((resolve, reject) => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Build authorization URL
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: apiKey,
      redirect_uri: DEFAULT_REDIRECT_URI,
      scope: REQUIRED_SCOPES.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `${ETSY_AUTH_URL}?${authParams.toString()}`;

    console.log('\n[EtsyAuth] Starting OAuth flow...');
    console.log('[EtsyAuth] Please open this URL in your browser:');
    console.log(`\n${authUrl}\n`);

    // Start local server to receive callback
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '', `http://localhost:${DEFAULT_REDIRECT_PORT}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authorization Failed</h1><p>${errorDescription || error}</p>`);
        server.close();
        reject(new Error(`OAuth error: ${errorDescription || error}`));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>No authorization code received</p>');
        server.close();
        reject(new Error('No authorization code received'));
        return;
      }

      if (returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>State mismatch - possible CSRF attack</p>');
        server.close();
        reject(new Error('State mismatch'));
        return;
      }

      try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(apiKey, code, codeVerifier);

        // Get shop ID
        const shopId = await fetchShopId(apiKey, tokens.access_token);

        // Calculate expiry times
        const now = Date.now();
        const expiresAt = now + (tokens.expires_in * 1000);
        const refreshExpiresAt = tokens.refresh_expires_in
          ? now + (tokens.refresh_expires_in * 1000)
          : undefined;

        // Save credentials
        const credentials: StoredCredentials = {
          apiKey,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          shopId,
          expiresAt,
          refreshExpiresAt
        };

        saveCredentials(credentials);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>Authorization Successful!</h1>
              <p>You can close this window and return to the terminal.</p>
              <p>Shop ID: ${shopId}</p>
            </body>
          </html>
        `);

        server.close();
        resolve(credentials);

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><p>${(err as Error).message}</p>`);
        server.close();
        reject(err);
      }
    });

    server.listen(DEFAULT_REDIRECT_PORT, () => {
      console.log(`[EtsyAuth] Callback server listening on port ${DEFAULT_REDIRECT_PORT}`);
      console.log('[EtsyAuth] Waiting for authorization...\n');

      // Try to open browser automatically
      const openCommand = process.platform === 'darwin' ? 'open'
        : process.platform === 'win32' ? 'start'
        : 'xdg-open';

      require('child_process').exec(`${openCommand} "${authUrl}"`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timeout - no response received'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Exchange authorization code for access tokens
 */
async function exchangeCodeForTokens(
  apiKey: string,
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: apiKey,
    redirect_uri: DEFAULT_REDIRECT_URI,
    code,
    code_verifier: codeVerifier
  });

  const response = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<TokenResponse>;
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(): Promise<StoredCredentials> {
  const credentials = loadCredentials();

  if (!credentials) {
    throw new Error('No stored credentials found');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: credentials.apiKey,
    refresh_token: credentials.refreshToken
  });

  const response = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
  }

  const tokens = await response.json() as TokenResponse;

  // Calculate new expiry times
  const now = Date.now();
  const expiresAt = now + (tokens.expires_in * 1000);
  const refreshExpiresAt = tokens.refresh_expires_in
    ? now + (tokens.refresh_expires_in * 1000)
    : credentials.refreshExpiresAt;

  // Update credentials
  const updatedCredentials: StoredCredentials = {
    ...credentials,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    refreshExpiresAt
  };

  saveCredentials(updatedCredentials);
  console.log('[EtsyAuth] Access token refreshed successfully');

  return updatedCredentials;
}

/**
 * Fetch the shop ID for the authenticated user
 */
async function fetchShopId(apiKey: string, accessToken: string): Promise<string> {
  const response = await fetch(`${ETSY_API_BASE}/application/users/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const userData = await response.json() as { shop_id?: number };

  if (!userData.shop_id) {
    throw new Error('User does not have a shop');
  }

  return userData.shop_id.toString();
}

// ============================================================
// TOKEN MANAGEMENT
// ============================================================

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string> {
  if (areCredentialsValid()) {
    const credentials = loadCredentials();
    return credentials!.accessToken;
  }

  if (canRefreshToken()) {
    console.log('[EtsyAuth] Access token expired, refreshing...');
    const credentials = await refreshAccessToken();
    return credentials.accessToken;
  }

  throw new Error('No valid credentials - please run auth flow again');
}

/**
 * Get Etsy credentials for API calls
 */
export async function getEtsyCredentials(): Promise<EtsyCredentials> {
  const credentials = loadCredentials();

  if (!credentials) {
    throw new Error('No stored credentials - please run auth flow first');
  }

  // Ensure token is valid
  const accessToken = await getValidAccessToken();

  return {
    apiKey: credentials.apiKey,
    clientId: credentials.apiKey, // Etsy uses apiKey as clientId
    clientSecret: '', // Not needed for PKCE
    accessToken,
    refreshToken: credentials.refreshToken,
    shopId: credentials.shopId
  };
}

// ============================================================
// CLI HELPERS
// ============================================================

/**
 * Check authentication status
 */
export function getAuthStatus(): {
  authenticated: boolean;
  shopId?: string;
  tokenExpiry?: Date;
  refreshExpiry?: Date;
  needsRefresh: boolean;
  needsReauth: boolean;
} {
  const credentials = loadCredentials();

  if (!credentials) {
    return {
      authenticated: false,
      needsRefresh: false,
      needsReauth: true
    };
  }

  const now = Date.now();
  const tokenExpired = credentials.expiresAt <= now;
  const refreshExpired = credentials.refreshExpiresAt
    ? credentials.refreshExpiresAt <= now
    : false;

  return {
    authenticated: !tokenExpired || !refreshExpired,
    shopId: credentials.shopId,
    tokenExpiry: new Date(credentials.expiresAt),
    refreshExpiry: credentials.refreshExpiresAt
      ? new Date(credentials.refreshExpiresAt)
      : undefined,
    needsRefresh: tokenExpired && !refreshExpired,
    needsReauth: tokenExpired && refreshExpired
  };
}

/**
 * Clear stored credentials (logout)
 */
export function clearCredentials(): void {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
    console.log('[EtsyAuth] Credentials cleared');
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  StoredCredentials,
  ETSY_API_BASE,
  REQUIRED_SCOPES,
  CREDENTIALS_FILE
};

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
import * as readline from 'readline';
import { URL } from 'url';
import { EtsyCredentials } from '../config/types';

// ============================================================
// CONFIGURATION
// ============================================================

const ETSY_API_BASE = 'https://api.etsy.com/v3';
const ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

const TOKEN_FILE = path.join(process.cwd(), 'data', 'etsy', 'token.json');
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
  access_token: string;
  refresh_token: string;
  expires_at: number;
  shop_id: string;
  refresh_expires_at?: number;
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
    if (!fs.existsSync(TOKEN_FILE)) {
      return null;
    }

    const data = fs.readFileSync(TOKEN_FILE, 'utf-8');
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
  const dir = path.dirname(TOKEN_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(TOKEN_FILE, JSON.stringify(credentials, null, 2));
}

/**
 * Check if credentials are valid and not expired
 */
export function areCredentialsValid(): boolean {
  const credentials = loadCredentials();
  if (!credentials) return false;

  // Check if access token is expired (with 5 minute buffer)
  const now = Date.now();
  return credentials.expires_at > now + (5 * 60 * 1000);
}

/**
 * Check if refresh token is valid
 */
export function canRefreshToken(): boolean {
  const credentials = loadCredentials();
  if (!credentials) return false;

  // If no refresh expiry is set, assume it's valid
  if (!credentials.refresh_expires_at) return true;

  return credentials.refresh_expires_at > Date.now();
}

// ============================================================
// INTERACTIVE AUTH FLOW (MANUAL URL PASTE)
// ============================================================

/**
 * Create readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Interactive OAuth flow with step-by-step prompts
 */
export async function startInteractiveAuthFlow(apiKey: string): Promise<StoredCredentials> {
  const rl = createReadlineInterface();

  try {
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

    // Display instructions
    console.log('\n' + '='.repeat(70));
    console.log('                    ETSY OAUTH AUTHENTICATION');
    console.log('='.repeat(70));
    console.log('\nSTEP 1: Open this URL in your browser');
    console.log('-'.repeat(70));
    console.log('\n' + authUrl + '\n');
    console.log('-'.repeat(70));

    console.log('\nSTEP 2: What to do in the browser');
    console.log('-'.repeat(70));
    console.log('  1. Log into your Etsy seller account (if not already logged in)');
    console.log('  2. Review the permissions being requested');
    console.log('  3. Click "Allow access" to authorize the app');
    console.log('  4. You will be redirected to a URL that starts with:');
    console.log('     http://localhost:3030/callback?code=...');
    console.log('');
    console.log('  NOTE: The page may show an error like "This site can\'t be reached"');
    console.log('        That\'s OK! Just copy the FULL URL from your browser\'s address bar.');

    console.log('\nSTEP 3: Paste the redirect URL below');
    console.log('-'.repeat(70));

    const redirectUrl = await prompt(rl, '\nPaste the full URL here: ');

    if (!redirectUrl) {
      throw new Error('No URL provided');
    }

    // Parse the redirect URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(redirectUrl);
    } catch {
      throw new Error('Invalid URL format. Please copy the complete URL from your browser.');
    }

    const code = parsedUrl.searchParams.get('code');
    const returnedState = parsedUrl.searchParams.get('state');
    const error = parsedUrl.searchParams.get('error');
    const errorDescription = parsedUrl.searchParams.get('error_description');

    if (error) {
      throw new Error(`Etsy authorization failed: ${errorDescription || error}`);
    }

    if (!code) {
      throw new Error('No authorization code found in URL. Make sure you copied the complete URL.');
    }

    if (returnedState !== state) {
      throw new Error('State mismatch - the URL may be from a different auth attempt. Please try again.');
    }

    console.log('\n✓ Authorization code received!');
    console.log('\nExchanging code for access tokens...');

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(apiKey, code, codeVerifier);

    console.log('✓ Tokens received!');
    console.log('\nFetching shop information...');

    // Get shop ID
    const shopId = await fetchShopId(apiKey, tokens.access_token);

    console.log(`✓ Shop ID: ${shopId}`);

    // Calculate expiry times
    const now = Date.now();
    const expiresAt = now + (tokens.expires_in * 1000);
    const refreshExpiresAt = tokens.refresh_expires_in
      ? now + (tokens.refresh_expires_in * 1000)
      : undefined;

    // Save credentials
    const credentials: StoredCredentials = {
      apiKey,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      shop_id: shopId,
      expires_at: expiresAt,
      refresh_expires_at: refreshExpiresAt
    };

    saveCredentials(credentials);

    console.log('\n' + '='.repeat(70));
    console.log('                    AUTHENTICATION SUCCESSFUL!');
    console.log('='.repeat(70));
    console.log(`\n  Shop ID:        ${shopId}`);
    console.log(`  Token expires:  ${new Date(expiresAt).toLocaleString()}`);
    console.log(`  Stored in:      ${TOKEN_FILE}`);
    console.log('\n  You can now use the Etsy CLI commands!');
    console.log('='.repeat(70) + '\n');

    return credentials;

  } finally {
    rl.close();
  }
}

/**
 * Start the OAuth authorization flow with local server callback
 * Falls back to manual mode if server can't start
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
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          shop_id: shopId,
          expires_at: expiresAt,
          refresh_expires_at: refreshExpiresAt
        };

        saveCredentials(credentials);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #22c55e;">✓ Authorization Successful!</h1>
              <p>You can close this window and return to the terminal.</p>
              <p style="color: #666;">Shop ID: ${shopId}</p>
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

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[EtsyAuth] Port ${DEFAULT_REDIRECT_PORT} is busy. Falling back to manual mode...`);
        server.close();
        // Fall back to interactive mode
        startInteractiveAuthFlow(apiKey).then(resolve).catch(reject);
      } else {
        reject(err);
      }
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
    refresh_token: credentials.refresh_token
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
    : credentials.refresh_expires_at;

  // Update credentials
  const updatedCredentials: StoredCredentials = {
    ...credentials,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    refresh_expires_at: refreshExpiresAt
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
    return credentials!.access_token;
  }

  if (canRefreshToken()) {
    console.log('[EtsyAuth] Access token expired, refreshing...');
    const credentials = await refreshAccessToken();
    return credentials.access_token;
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
    refreshToken: credentials.refresh_token,
    shopId: credentials.shop_id
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
  const tokenExpired = credentials.expires_at <= now;
  const refreshExpired = credentials.refresh_expires_at
    ? credentials.refresh_expires_at <= now
    : false;

  return {
    authenticated: !tokenExpired || !refreshExpired,
    shopId: credentials.shop_id,
    tokenExpiry: new Date(credentials.expires_at),
    refreshExpiry: credentials.refresh_expires_at
      ? new Date(credentials.refresh_expires_at)
      : undefined,
    needsRefresh: tokenExpired && !refreshExpired,
    needsReauth: tokenExpired && refreshExpired
  };
}

/**
 * Clear stored credentials (logout)
 */
export function clearCredentials(): void {
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
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
  TOKEN_FILE as CREDENTIALS_FILE
};

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import { AUTONIA_DEFAULTS } from "./config.js";

const CONFIG_DIR = join(homedir(), ".autonia");
const TOKEN_FILE = join(CONFIG_DIR, "token.json");

// Initialize Supabase client
export function getSupabaseClient() {
  const supabaseUrl = AUTONIA_DEFAULTS.supabaseUrl;
  const supabaseAnonKey = AUTONIA_DEFAULTS.supabaseAnonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase configuration not found in defaults");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Store authentication token securely
 */
export function saveToken(token: string, refreshToken: string, user: any): void {
  try {
    // Ensure config directory exists
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const tokenData = {
      accessToken: token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
      savedAt: new Date().toISOString(),
    };

    writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2), { mode: 0o600 });
  } catch (error) {
    console.error("Failed to save token:", error);
    throw error;
  }
}

/**
 * Retrieve stored authentication token
 */
export function getToken(): string | null {
  try {
    if (!existsSync(TOKEN_FILE)) {
      return null;
    }

    const data = readFileSync(TOKEN_FILE, "utf-8");
    const tokenData = JSON.parse(data);

    return tokenData.accessToken;
  } catch (error) {
    return null;
  }
}

/**
 * Get full token data including user info
 */
export function getTokenData(): any | null {
  try {
    if (!existsSync(TOKEN_FILE)) {
      return null;
    }

    const data = readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Clear stored token
 */
export function clearToken(): void {
  try {
    if (existsSync(TOKEN_FILE)) {
      unlinkSync(TOKEN_FILE);
    }
  } catch (error) {
    console.error("Failed to clear token:", error);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Verify token is still valid
 */
export async function verifyToken(): Promise<boolean> {
  const token = getToken();

  if (!token) {
    return false;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Refresh expired token
 */
export async function refreshToken(): Promise<string | null> {
  const tokenData = getTokenData();

  if (!tokenData || !tokenData.refreshToken) {
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: tokenData.refreshToken,
    });

    if (error || !data.session) {
      return null;
    }

    // Save new tokens
    saveToken(data.session.access_token, data.session.refresh_token, data.session.user);

    return data.session.access_token;
  } catch (error) {
    return null;
  }
}

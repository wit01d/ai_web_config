// background.js - Background script for cookie management and extension coordination
// This script handles all cookie API operations since content scripts cannot access cookies directly

"use strict";

// ============================================================================
// Cookie Management Functions
// ============================================================================

/**
 * Delete a single cookie by URL and name
 * @param {string} url - The URL associated with the cookie
 * @param {string} name - The cookie name to delete
 * @returns {Promise<{success: boolean, cookie?: object, error?: string}>}
 */
async function deleteCookie(url, name) {
  try {
    const removed = await browser.cookies.remove({ url, name });
    if (removed) {
      console.log(`[CookieManager] Deleted cookie "${name}" from ${url}`);
      return { success: true, cookie: removed };
    } else {
      console.log(`[CookieManager] Cookie "${name}" not found at ${url}`);
      return { success: false, error: "Cookie not found" };
    }
  } catch (error) {
    console.error(`[CookieManager] Error deleting cookie "${name}":`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete multiple cookies by name for a specific URL
 * @param {string} url - The URL associated with the cookies
 * @param {string[]} names - Array of cookie names to delete
 * @returns {Promise<{success: boolean, deleted: number, failed: number}>}
 */
async function deleteCookiesByNames(url, names) {
  let deleted = 0;
  let failed = 0;

  for (const name of names) {
    const result = await deleteCookie(url, name);
    if (result.success) {
      deleted++;
    } else {
      failed++;
    }
  }

  return { success: failed === 0, deleted, failed };
}

/**
 * Delete all cookies for a specific domain
 * @param {string} domain - The domain (e.g., "claude.ai" or ".claude.ai")
 * @returns {Promise<{success: boolean, count: number, error?: string}>}
 */
async function deleteAllCookiesForDomain(domain) {
  try {
    // Normalize domain - remove leading dot if present for the query
    const normalizedDomain = domain.startsWith(".") ? domain.substring(1) : domain;
    
    // Get all cookies for the domain (including subdomains)
    const cookies = await browser.cookies.getAll({ domain: normalizedDomain });
    
    console.log(`[CookieManager] Found ${cookies.length} cookies for domain "${domain}"`);

    if (cookies.length === 0) {
      return { success: true, count: 0 };
    }

    let deletedCount = 0;
    for (const cookie of cookies) {
      const protocol = cookie.secure ? "https://" : "http://";
      const cookieUrl = `${protocol}${cookie.domain.replace(/^\./, "")}${cookie.path}`;
      
      try {
        await browser.cookies.remove({ url: cookieUrl, name: cookie.name });
        deletedCount++;
      } catch (err) {
        console.warn(`[CookieManager] Failed to delete cookie "${cookie.name}":`, err);
      }
    }

    console.log(`[CookieManager] Deleted ${deletedCount}/${cookies.length} cookies for "${domain}"`);
    return { success: true, count: deletedCount };
  } catch (error) {
    console.error(`[CookieManager] Error deleting cookies for "${domain}":`, error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Get all cookies for a domain
 * @param {string} domain - The domain to list cookies for
 * @returns {Promise<{success: boolean, cookies: object[], error?: string}>}
 */
async function listCookiesForDomain(domain) {
  try {
    const normalizedDomain = domain.startsWith(".") ? domain.substring(1) : domain;
    const cookies = await browser.cookies.getAll({ domain: normalizedDomain });
    
    console.log(`[CookieManager] Listed ${cookies.length} cookies for "${domain}"`);
    return { success: true, cookies };
  } catch (error) {
    console.error(`[CookieManager] Error listing cookies for "${domain}":`, error);
    return { success: false, cookies: [], error: error.message };
  }
}

/**
 * Get a specific cookie by URL and name
 * @param {string} url - The URL associated with the cookie
 * @param {string} name - The cookie name
 * @returns {Promise<{success: boolean, cookie?: object, error?: string}>}
 */
async function getCookie(url, name) {
  try {
    const cookie = await browser.cookies.get({ url, name });
    if (cookie) {
      return { success: true, cookie };
    } else {
      return { success: false, error: "Cookie not found" };
    }
  } catch (error) {
    console.error(`[CookieManager] Error getting cookie "${name}":`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Set a cookie
 * @param {object} cookieDetails - Cookie details object
 * @returns {Promise<{success: boolean, cookie?: object, error?: string}>}
 */
async function setCookie(cookieDetails) {
  try {
    const cookie = await browser.cookies.set(cookieDetails);
    if (cookie) {
      console.log(`[CookieManager] Set cookie "${cookieDetails.name}"`);
      return { success: true, cookie };
    } else {
      return { success: false, error: "Failed to set cookie" };
    }
  } catch (error) {
    console.error(`[CookieManager] Error setting cookie:`, error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Platform-Specific Cookie Configurations
// ============================================================================

const PLATFORM_COOKIES = {
  "claude.ai": {
    url: "https://claude.ai",
    domain: "claude.ai",
    // Common cookies that might need clearing for reset
    resetCookies: ["sessionKey", "__cf_bm", "cf_clearance", "activityToken"]
  },
  "grok.com": {
    url: "https://grok.com",
    domain: "grok.com",
    resetCookies: ["session", "auth_token"]
  },
  "chat.deepseek.com": {
    url: "https://chat.deepseek.com",
    domain: "deepseek.com",
    resetCookies: ["session_id", "token"]
  },
  "chatgpt.com": {
    url: "https://chatgpt.com",
    domain: "chatgpt.com",
    resetCookies: ["__Secure-next-auth.session-token", "_puid"]
  },
  "chat.openai.com": {
    url: "https://chat.openai.com",
    domain: "openai.com",
    resetCookies: ["__Secure-next-auth.session-token", "_puid"]
  },
  "gemini.google.com": {
    url: "https://gemini.google.com",
    domain: "google.com",
    resetCookies: ["SIDCC", "__Secure-1PSIDCC"]
  },
  "aistudio.google.com": {
    url: "https://aistudio.google.com",
    domain: "google.com",
    resetCookies: ["SIDCC", "__Secure-1PSIDCC"]
  }
};

/**
 * Get platform configuration from hostname
 * @param {string} hostname - The hostname (e.g., "claude.ai")
 * @returns {object|null} Platform configuration or null if not found
 */
function getPlatformConfig(hostname) {
  // Direct match
  if (PLATFORM_COOKIES[hostname]) {
    return PLATFORM_COOKIES[hostname];
  }
  
  // Try without www prefix
  const withoutWww = hostname.replace(/^www\./, "");
  if (PLATFORM_COOKIES[withoutWww]) {
    return PLATFORM_COOKIES[withoutWww];
  }
  
  return null;
}

// ============================================================================
// Message Listener - Handle requests from content scripts and popup
// ============================================================================

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Received message:", message.action);

  switch (message.action) {
    // Delete a single cookie
    case "deleteCookie":
      deleteCookie(message.url, message.name).then(sendResponse);
      return true; // Keep channel open for async response

    // Delete multiple cookies by name
    case "deleteCookiesByNames":
      deleteCookiesByNames(message.url, message.names).then(sendResponse);
      return true;

    // Delete all cookies for a domain
    case "deleteAllCookies":
      deleteAllCookiesForDomain(message.domain).then(sendResponse);
      return true;

    // List all cookies for a domain
    case "listCookies":
      listCookiesForDomain(message.domain).then(sendResponse);
      return true;

    // Get a specific cookie
    case "getCookie":
      getCookie(message.url, message.name).then(sendResponse);
      return true;

    // Set a cookie
    case "setCookie":
      setCookie(message.cookieDetails).then(sendResponse);
      return true;

    // Get platform configuration
    case "getPlatformConfig":
      const config = getPlatformConfig(message.hostname);
      sendResponse({ success: !!config, config });
      return false;

    // Reset platform cookies (delete specific cookies for a platform)
    case "resetPlatformCookies":
      const platformConfig = getPlatformConfig(message.hostname);
      if (platformConfig) {
        deleteCookiesByNames(platformConfig.url, platformConfig.resetCookies)
          .then(sendResponse);
      } else {
        sendResponse({ success: false, error: "Unknown platform" });
      }
      return true;

    // Clear all cookies for current platform
    case "clearPlatformCookies":
      const platform = getPlatformConfig(message.hostname);
      if (platform) {
        deleteAllCookiesForDomain(platform.domain).then(sendResponse);
      } else {
        // Fallback: use the hostname directly
        deleteAllCookiesForDomain(message.hostname).then(sendResponse);
      }
      return true;

    default:
      console.warn("[Background] Unknown action:", message.action);
      sendResponse({ success: false, error: "Unknown action" });
      return false;
  }
});

// ============================================================================
// Extension Lifecycle Events
// ============================================================================

// Log when extension is installed or updated
browser.runtime.onInstalled.addListener((details) => {
  console.log(`[Background] Extension ${details.reason}:`, details);
  
  if (details.reason === "install") {
    console.log("[Background] First install - setting up defaults");
  } else if (details.reason === "update") {
    console.log(`[Background] Updated from ${details.previousVersion}`);
  }
});

// Log startup
console.log("[Background] AI Thinking Mode extension background script loaded");

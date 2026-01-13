// background.js - Chrome MV3 Service Worker for cookie management and extension coordination
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
    const removed = await chrome.cookies.remove({ url, name });
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
    const cookies = await chrome.cookies.getAll({ domain: normalizedDomain });

    console.log(`[CookieManager] Found ${cookies.length} cookies for domain "${domain}"`);

    if (cookies.length === 0) {
      return { success: true, count: 0 };
    }

    let deletedCount = 0;
    for (const cookie of cookies) {
      const protocol = cookie.secure ? "https://" : "http://";
      const cookieUrl = `${protocol}${cookie.domain.replace(/^\./, "")}${cookie.path}`;

      try {
        await chrome.cookies.remove({ url: cookieUrl, name: cookie.name });
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
    const cookies = await chrome.cookies.getAll({ domain: normalizedDomain });

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
    const cookie = await chrome.cookies.get({ url, name });
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
    const cookie = await chrome.cookies.set(cookieDetails);
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Received message:", message.action);

  // Handle async responses - must return true to keep channel open
  const handleMessage = async () => {
    switch (message.action) {
      case "deleteCookie":
        return await deleteCookie(message.url, message.name);

      case "deleteCookiesByNames":
        return await deleteCookiesByNames(message.url, message.names);

      case "deleteAllCookies":
        return await deleteAllCookiesForDomain(message.domain);

      case "listCookies":
        return await listCookiesForDomain(message.domain);

      case "getCookie":
        return await getCookie(message.url, message.name);

      case "setCookie":
        return await setCookie(message.cookieDetails);

      case "getPlatformConfig":
        const config = getPlatformConfig(message.hostname);
        return { success: !!config, config };

      case "resetPlatformCookies":
        const platformConfig = getPlatformConfig(message.hostname);
        if (platformConfig) {
          return await deleteCookiesByNames(platformConfig.url, platformConfig.resetCookies);
        }
        return { success: false, error: "Unknown platform" };

      case "clearPlatformCookies":
        const platform = getPlatformConfig(message.hostname);
        if (platform) {
          return await deleteAllCookiesForDomain(platform.domain);
        }
        return await deleteAllCookiesForDomain(message.hostname);

      default:
        console.warn("[Background] Unknown action:", message.action);
        return { success: false, error: "Unknown action" };
    }
  };

  // Execute async handler and send response
  handleMessage().then(sendResponse).catch(error => {
    console.error("[Background] Error handling message:", error);
    sendResponse({ success: false, error: error.message });
  });

  return true; // Keep channel open for async response
});

// ============================================================================
// Context Menus - Chrome version (on extension action icon)
// ============================================================================

/**
 * Set up context menus for the extension action
 * Note: Chrome doesn't have Firefox's Tools menu, so we use the action context
 */
async function setupContextMenus() {
  // Remove all existing menus first
  await chrome.contextMenus.removeAll();

  // Create parent menu for tab actions
  chrome.contextMenus.create({
    id: "tab-manager",
    title: "Tab Actions",
    contexts: ["action"]
  });

  // New Tab action
  chrome.contextMenus.create({
    id: "new-tab",
    parentId: "tab-manager",
    title: "New Tab",
    contexts: ["action"]
  });

  // Close Current Tab action
  chrome.contextMenus.create({
    id: "close-tab",
    parentId: "tab-manager",
    title: "Close Current Tab",
    contexts: ["action"]
  });

  // Separator
  chrome.contextMenus.create({
    id: "separator-1",
    parentId: "tab-manager",
    type: "separator",
    contexts: ["action"]
  });

  // Reload Tab action
  chrome.contextMenus.create({
    id: "reload-tab",
    parentId: "tab-manager",
    title: "Reload Tab",
    contexts: ["action"]
  });

  // Hard Reload Tab action
  chrome.contextMenus.create({
    id: "hard-reload-tab",
    parentId: "tab-manager",
    title: "Hard Reload (Clear Cache)",
    contexts: ["action"]
  });

  console.log("[TabManager] Context menus created");
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case "new-tab":
      await chrome.tabs.create({});
      console.log("[TabManager] Created new tab");
      break;

    case "close-tab":
      if (tab && tab.id) {
        await chrome.tabs.remove(tab.id);
        console.log(`[TabManager] Closed tab ${tab.id}`);
      }
      break;

    case "reload-tab":
      if (tab && tab.id) {
        await chrome.tabs.reload(tab.id);
        console.log(`[TabManager] Reloaded tab ${tab.id}`);
      }
      break;

    case "hard-reload-tab":
      if (tab && tab.id) {
        await chrome.tabs.reload(tab.id, { bypassCache: true });
        console.log(`[TabManager] Hard reloaded tab ${tab.id}`);
      }
      break;
  }
});

// ============================================================================
// Extension Lifecycle Events
// ============================================================================

// Set up menus when extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[Background] Extension ${details.reason}:`, details);
  setupContextMenus();

  if (details.reason === "install") {
    console.log("[Background] First install - setting up defaults");
  } else if (details.reason === "update") {
    console.log(`[Background] Updated from ${details.previousVersion}`);
  }
});

// Re-setup menus on browser startup (service worker may have been terminated)
chrome.runtime.onStartup.addListener(() => {
  console.log("[Background] Browser startup - reinitializing");
  setupContextMenus();
});

console.log("[Background] Chrome MV3 service worker loaded - AI Thinking Mode extension");

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
 * Clear all site data for a specific origin
 * Uses browsingData API to remove cache, localStorage, indexedDB, service workers
 * @param {string} origin - The origin URL (e.g., "https://claude.ai")
 * @param {Object} options - Options for clearing data
 * @param {boolean} options.includeGlobalData - If true, also clears cache and pluginData globally (affects all sites)
 * @returns {Promise<{success: boolean, cleared: string[], error?: string}>}
 */
async function clearSiteData(origin, options = {}) {
  const { includeGlobalData = false } = options;
  const cleared = [];

  try {
    console.log(`[SiteDataManager] Clearing site data for ${origin}${includeGlobalData ? ' (including global data)' : ''}`);

    // Extract hostname from origin for Firefox compatibility
    const hostname = new URL(origin).hostname;

    // Firefox doesn't support 'origins' property, only 'hostnames' with limited data types
    // Try Chrome-style first, fall back to Firefox-style
    const originScopedTypes = {
      cacheStorage: true,
      localStorage: true,
      indexedDB: true,
      serviceWorkers: true,
    };

    try {
      // Try Chrome-style with 'origins' property
      await browser.browsingData.remove({ origins: [origin] }, originScopedTypes);
      cleared.push(...Object.keys(originScopedTypes));
    } catch (chromeStyleError) {
      // Firefox fallback: use 'hostnames' (only supports cookies and localStorage)
      console.log(`[SiteDataManager] Chrome-style origins not supported, using Firefox fallback`);

      // Firefox 'hostnames' only works with cookies and localStorage
      const firefoxSupportedTypes = {
        localStorage: true,
      };

      try {
        await browser.browsingData.remove({ hostnames: [hostname] }, firefoxSupportedTypes);
        cleared.push('localStorage (via hostnames)');
      } catch (firefoxError) {
        console.warn(`[SiteDataManager] Firefox hostnames also failed:`, firefoxError);
      }

      // For other data types, we need to clear globally (Firefox limitation)
      const globalFallbackTypes = {
        indexedDB: true,
        serviceWorkers: true,
        cacheStorage: true,
      };

      try {
        await browser.browsingData.remove({ since: 0 }, globalFallbackTypes);
        cleared.push(...Object.keys(globalFallbackTypes).map(t => `${t} (global - Firefox limitation)`));
      } catch (globalError) {
        console.warn(`[SiteDataManager] Global fallback failed:`, globalError);
      }
    }

    // Optionally clear global data types (cache, pluginData - affects ALL sites)
    if (includeGlobalData) {
      const globalTypes = {
        cache: true,
        pluginData: true,
      };
      await browser.browsingData.remove({ since: 0 }, globalTypes);
      cleared.push(...Object.keys(globalTypes).map(t => `${t} (global)`));
      console.log(`[SiteDataManager] Also cleared global data types: cache, pluginData`);
    }

    console.log(`[SiteDataManager] Cleared site data types:`, cleared);
    return { success: true, cleared };
  } catch (error) {
    console.error(`[SiteDataManager] Error clearing site data for "${origin}":`, error);
    return { success: false, cleared: [], error: error.message };
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

    // Clear all site data (cache, localStorage, indexedDB, service workers)
    case "clearSiteData":
      clearSiteData(message.origin, {
        includeGlobalData: message.includeGlobalData || false
      }).then(sendResponse);
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

// ============================================================================
// TAB MANAGER - Tools Menu Integration (ALT → Tools → Tabs)
// ============================================================================

/**
 * Update the Tools menu with current tabs
 * Creates a "Tabs" submenu listing all open tabs in the current window
 */
async function updateTabMenu() {
  // Remove existing tab-related menu items (preserve other menus)
  const menuIds = ['tab-manager', 'new-tab', 'close-tab', 'sep-tabs'];
  for (const id of menuIds) {
    try { await browser.menus.remove(id); } catch(e) { /* ignore if not exists */ }
  }

  // Get current window's tabs
  const tabs = await browser.tabs.query({ currentWindow: true });

  // Remove dynamic tab items from previous update
  for (const tab of tabs) {
    try { await browser.menus.remove(`tab-${tab.id}`); } catch(e) { /* ignore */ }
  }

  // Create parent "Tabs" menu
  browser.menus.create({
    id: "tab-manager",
    title: "Tabs",
    contexts: ["tools_menu"]
  });

  // Add each tab as a submenu item
  tabs.forEach((tab, index) => {
    const prefix = tab.active ? "\u25CF " : ""; // ● for active tab
    const title = tab.title || "Untitled";
    browser.menus.create({
      id: `tab-${tab.id}`,
      parentId: "tab-manager",
      title: `${prefix}${index + 1}. ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`,
      contexts: ["tools_menu"]
    });
  });

  // Separator before actions
  browser.menus.create({
    id: "sep-tabs",
    parentId: "tab-manager",
    type: "separator",
    contexts: ["tools_menu"]
  });

  // New Tab action
  browser.menus.create({
    id: "new-tab",
    parentId: "tab-manager",
    title: "+ New Tab",
    contexts: ["tools_menu"]
  });

  // Close Current Tab action
  browser.menus.create({
    id: "close-tab",
    parentId: "tab-manager",
    title: "x Close Current Tab",
    contexts: ["tools_menu"]
  });

  console.log(`[TabManager] Updated menu with ${tabs.length} tabs`);
}

// Handle menu item clicks
browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.startsWith("tab-")) {
    // Switch to clicked tab
    const tabId = parseInt(info.menuItemId.replace("tab-", ""));
    await browser.tabs.update(tabId, { active: true });
    console.log(`[TabManager] Switched to tab ${tabId}`);
  } else if (info.menuItemId === "new-tab") {
    // Create new tab
    await browser.tabs.create({});
    console.log("[TabManager] Created new tab");
  } else if (info.menuItemId === "close-tab") {
    // Close current tab
    if (tab && tab.id) {
      await browser.tabs.remove(tab.id);
      console.log(`[TabManager] Closed tab ${tab.id}`);
    }
  }
});

// Update menu when tabs change
browser.tabs.onCreated.addListener(() => updateTabMenu());
browser.tabs.onRemoved.addListener(() => updateTabMenu());
browser.tabs.onActivated.addListener(() => updateTabMenu());
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Only update on title or status changes to avoid excessive updates
  if (changeInfo.title || changeInfo.status === 'complete') {
    updateTabMenu();
  }
});

// Initialize tab menu on extension load
updateTabMenu();

console.log("[TabManager] Tab manager initialized - Access via ALT \u2192 Tools \u2192 Tabs");

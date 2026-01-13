// cookie-manager.js - Cookie management utilities for content scripts
// This module provides a simple API for content scripts to manage cookies
// All operations are proxied through the background script since content scripts
// cannot access the cookies API directly

"use strict";

const CookieManager = {
  /**
   * Delete a single cookie by name for the current page
   * @param {string} name - The cookie name to delete
   * @param {string} [url] - Optional URL (defaults to current page)
   * @returns {Promise<{success: boolean, cookie?: object, error?: string}>}
   */
  async delete(name, url = window.location.href) {
    try {
      const response = await browser.runtime.sendMessage({
        action: "deleteCookie",
        url: url,
        name: name
      });
      return response;
    } catch (error) {
      console.error(`[CookieManager] Error deleting cookie "${name}":`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete multiple cookies by name
   * @param {string[]} names - Array of cookie names to delete
   * @param {string} [url] - Optional URL (defaults to current page)
   * @returns {Promise<{success: boolean, deleted: number, failed: number}>}
   */
  async deleteMany(names, url = window.location.href) {
    try {
      const response = await browser.runtime.sendMessage({
        action: "deleteCookiesByNames",
        url: url,
        names: names
      });
      return response;
    } catch (error) {
      console.error(`[CookieManager] Error deleting cookies:`, error);
      return { success: false, deleted: 0, failed: names.length, error: error.message };
    }
  },

  /**
   * Delete all cookies for the current domain
   * @param {string} [domain] - Optional domain (defaults to current hostname)
   * @returns {Promise<{success: boolean, count: number, error?: string}>}
   */
  async deleteAll(domain = window.location.hostname) {
    try {
      const response = await browser.runtime.sendMessage({
        action: "deleteAllCookies",
        domain: domain
      });
      return response;
    } catch (error) {
      console.error(`[CookieManager] Error deleting all cookies:`, error);
      return { success: false, count: 0, error: error.message };
    }
  },

  /**
   * List all cookies for the current domain
   * @param {string} [domain] - Optional domain (defaults to current hostname)
   * @returns {Promise<{success: boolean, cookies: object[], error?: string}>}
   */
  async list(domain = window.location.hostname) {
    try {
      const response = await browser.runtime.sendMessage({
        action: "listCookies",
        domain: domain
      });
      return response;
    } catch (error) {
      console.error(`[CookieManager] Error listing cookies:`, error);
      return { success: false, cookies: [], error: error.message };
    }
  },

  /**
   * Get a specific cookie by name
   * @param {string} name - The cookie name
   * @param {string} [url] - Optional URL (defaults to current page)
   * @returns {Promise<{success: boolean, cookie?: object, error?: string}>}
   */
  async get(name, url = window.location.href) {
    try {
      const response = await browser.runtime.sendMessage({
        action: "getCookie",
        url: url,
        name: name
      });
      return response;
    } catch (error) {
      console.error(`[CookieManager] Error getting cookie "${name}":`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set a cookie
   * @param {object} options - Cookie options
   * @param {string} options.name - Cookie name
   * @param {string} options.value - Cookie value
   * @param {string} [options.url] - URL for the cookie (defaults to current page)
   * @param {string} [options.domain] - Domain for the cookie
   * @param {string} [options.path] - Path for the cookie (defaults to "/")
   * @param {boolean} [options.secure] - Secure flag
   * @param {boolean} [options.httpOnly] - HttpOnly flag
   * @param {string} [options.sameSite] - SameSite attribute ("strict", "lax", "none")
   * @param {number} [options.expirationDate] - Expiration timestamp in seconds
   * @returns {Promise<{success: boolean, cookie?: object, error?: string}>}
   */
  async set(options) {
    try {
      const cookieDetails = {
        url: options.url || window.location.href,
        name: options.name,
        value: options.value,
        path: options.path || "/",
        secure: options.secure ?? window.location.protocol === "https:",
        httpOnly: options.httpOnly ?? false,
        sameSite: options.sameSite || "lax"
      };

      if (options.domain) {
        cookieDetails.domain = options.domain;
      }

      if (options.expirationDate) {
        cookieDetails.expirationDate = options.expirationDate;
      }

      const response = await browser.runtime.sendMessage({
        action: "setCookie",
        cookieDetails: cookieDetails
      });
      return response;
    } catch (error) {
      console.error(`[CookieManager] Error setting cookie:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if a cookie exists
   * @param {string} name - The cookie name
   * @param {string} [url] - Optional URL (defaults to current page)
   * @returns {Promise<boolean>}
   */
  async exists(name, url = window.location.href) {
    const result = await this.get(name, url);
    return result.success && !!result.cookie;
  },

  /**
   * Get the value of a cookie
   * @param {string} name - The cookie name
   * @param {string} [url] - Optional URL (defaults to current page)
   * @returns {Promise<string|null>}
   */
  async getValue(name, url = window.location.href) {
    const result = await this.get(name, url);
    return result.success && result.cookie ? result.cookie.value : null;
  },

  /**
   * Reset platform-specific cookies (uses predefined list per platform)
   * @returns {Promise<{success: boolean, deleted: number, failed: number}>}
   */
  async resetPlatform() {
    try {
      const response = await browser.runtime.sendMessage({
        action: "resetPlatformCookies",
        hostname: window.location.hostname
      });
      return response;
    } catch (error) {
      console.error(`[CookieManager] Error resetting platform cookies:`, error);
      return { success: false, deleted: 0, failed: 0, error: error.message };
    }
  },

  /**
   * Clear all cookies for the current platform
   * @returns {Promise<{success: boolean, count: number, error?: string}>}
   */
  async clearPlatform() {
    try {
      const response = await browser.runtime.sendMessage({
        action: "clearPlatformCookies",
        hostname: window.location.hostname
      });
      return response;
    } catch (error) {
      console.error(`[CookieManager] Error clearing platform cookies:`, error);
      return { success: false, count: 0, error: error.message };
    }
  },

  /**
   * Print all cookies to console (for debugging)
   * @param {string} [domain] - Optional domain (defaults to current hostname)
   */
  async debug(domain = window.location.hostname) {
    const result = await this.list(domain);
    if (result.success && result.cookies.length > 0) {
      console.log(`[CookieManager] Cookies for ${domain}:`);
      console.table(result.cookies.map(c => ({
        name: c.name,
        value: c.value.length > 30 ? c.value.substring(0, 30) + "..." : c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expires: c.expirationDate 
          ? new Date(c.expirationDate * 1000).toISOString() 
          : "Session"
      })));
    } else {
      console.log(`[CookieManager] No cookies found for ${domain}`);
    }
    return result;
  }
};

// Make CookieManager available globally for other content scripts
window.CookieManager = CookieManager;

console.log("[CookieManager] Content script cookie manager loaded");

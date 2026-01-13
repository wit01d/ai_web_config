// claude.js - Claude.ai feature automation with cookie management
// This script handles feature toggling and thinking mode automation for Claude.ai

"use strict";

// ============================================================================
// Claude.ai Handler Class
// ============================================================================

class ClaudeHandler extends AIPlatformHandler {
  constructor() {
    super();
    this.platform = "claude.ai";
    this.selectors = {
      // Thinking mode toggle selectors (update as needed based on UI changes)
      thinkingModeToggle: '[data-testid="thinking-mode-toggle"]',
      thinkingModeButton: 'button[aria-label*="thinking"]',
      settingsMenu: '[data-testid="settings-menu"]',
      settingsButton: 'button[aria-label="Settings"]',
      
      // Feature toggles
      featureToggle: '[data-testid="feature-toggle"]',
      
      // Chat elements
      chatInput: '[data-testid="chat-input"]',
      sendButton: 'button[type="submit"]',
      
      // Modal/dialog elements
      modal: '[role="dialog"]',
      closeModalButton: '[aria-label="Close"]'
    };
    
    // Cookies that may need to be cleared for reset
    this.resetCookies = [
      "sessionKey",
      "__cf_bm",
      "cf_clearance", 
      "activityToken",
      "__stripe_mid",
      "__stripe_sid"
    ];
  }

  // ============================================================================
  // Cookie Management Methods
  // ============================================================================

  /**
   * Clear session-related cookies to force re-authentication
   */
  async clearSessionCookies() {
    if (typeof CookieManager === "undefined") {
      console.error("[Claude] CookieManager not available");
      return false;
    }

    console.log("[Claude] Clearing session cookies...");
    
    const result = await CookieManager.deleteMany(this.resetCookies);
    
    if (result.success) {
      console.log(`[Claude] Cleared ${result.deleted} session cookies`);
    } else {
      console.warn(`[Claude] Some cookies failed to clear: ${result.failed} failed`);
    }
    
    return result.success;
  }

  /**
   * Clear all Claude cookies (full reset)
   */
  async clearAllCookies() {
    if (typeof CookieManager === "undefined") {
      console.error("[Claude] CookieManager not available");
      return false;
    }

    console.log("[Claude] Clearing all cookies...");
    
    const result = await CookieManager.deleteAll("claude.ai");
    
    if (result.success) {
      console.log(`[Claude] Cleared ${result.count} cookies`);
    } else {
      console.error("[Claude] Failed to clear cookies:", result.error);
    }
    
    return result.success;
  }

  /**
   * Check if user is logged in by checking for session cookie
   */
  async isLoggedIn() {
    if (typeof CookieManager === "undefined") {
      return null; // Unknown
    }

    const exists = await CookieManager.exists("sessionKey");
    return exists;
  }

  /**
   * Debug: List all cookies
   */
  async debugCookies() {
    if (typeof CookieManager !== "undefined") {
      await CookieManager.debug("claude.ai");
    }
  }

  // ============================================================================
  // Feature Toggle Methods
  // ============================================================================

  /**
   * Enable thinking mode if available
   */
  async enableThinkingMode() {
    console.log("[Claude] Attempting to enable thinking mode...");

    // Try different selector strategies
    const toggleSelectors = [
      this.selectors.thinkingModeToggle,
      this.selectors.thinkingModeButton,
      '[class*="thinking"]',
      'button:has([class*="brain"])'
    ];

    for (const selector of toggleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        // Check if already enabled
        const isEnabled = element.getAttribute("aria-pressed") === "true" ||
                         element.classList.contains("active") ||
                         element.dataset.enabled === "true";
        
        if (!isEnabled) {
          console.log(`[Claude] Found thinking toggle, clicking...`);
          element.click();
          await this.wait(500);
          return true;
        } else {
          console.log("[Claude] Thinking mode already enabled");
          return true;
        }
      }
    }

    console.log("[Claude] Thinking mode toggle not found");
    return false;
  }

  /**
   * Open settings menu
   */
  async openSettings() {
    const settingsBtn = document.querySelector(this.selectors.settingsButton);
    if (settingsBtn) {
      settingsBtn.click();
      await this.wait(300);
      return true;
    }
    return false;
  }

  /**
   * Close any open modals
   */
  async closeModals() {
    const closeBtn = document.querySelector(this.selectors.closeModalButton);
    if (closeBtn) {
      closeBtn.click();
      await this.wait(200);
      return true;
    }
    return false;
  }

  // ============================================================================
  // Main Feature Automation
  // ============================================================================

  /**
   * Main method to enable all features
   */
  async enableFeatures() {
    console.log("[Claude] Starting feature automation...");

    // Wait for page to be fully loaded
    await this.waitForElement(this.selectors.chatInput, 5000);

    // Enable thinking mode
    await this.enableThinkingMode();

    // Add any other feature toggles here
    // await this.enableFeatureX();
    // await this.enableFeatureY();

    console.log("[Claude] Feature automation complete");
  }

  /**
   * Reset and re-enable features (useful after cookie clear)
   */
  async resetAndEnable() {
    console.log("[Claude] Resetting session and re-enabling features...");
    
    // Clear session cookies
    await this.clearSessionCookies();
    
    // Reload page
    window.location.reload();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Wait for specified milliseconds
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for an element to appear in the DOM
   */
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null); // Resolve with null instead of rejecting
      }, timeout);
    });
  }

  /**
   * Click an element safely
   */
  safeClick(element) {
    if (element) {
      try {
        element.click();
        return true;
      } catch (e) {
        console.warn("[Claude] Click failed:", e);
        return false;
      }
    }
    return false;
  }
}

// ============================================================================
// Handler Registration
// ============================================================================

// Create and register the Claude handler
const claudeHandler = new ClaudeHandler();

// Register with the logic.js handler system if available
if (typeof registerPlatformHandler === "function") {
  registerPlatformHandler("claude.ai", claudeHandler);
}

// Auto-run on page load if we're on Claude.ai
if (window.location.hostname.includes("claude.ai")) {
  console.log("[Claude] Claude.ai detected, initializing...");
  
  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      claudeHandler.enableFeatures();
    });
  } else {
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
      claudeHandler.enableFeatures();
    }, 1000);
  }
}

// Export for testing/debugging
window.ClaudeHandler = ClaudeHandler;
window.claudeHandler = claudeHandler;

console.log("[Claude] Handler script loaded");

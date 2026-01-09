// logic.js - Core logic and orchestration for AI Thinking Mode extension
// This script coordinates platform handlers and observes page changes

"use strict";

// ============================================================================
// Base Handler Class
// ============================================================================

/**
 * Base class for all AI platform handlers
 * Each platform handler should extend this class
 */
class AIPlatformHandler {
  constructor() {
    this.platform = "unknown";
    this.selectors = {};
    this.initialized = false;
  }

  /**
   * Enable all features for this platform
   * Must be implemented by subclass
   */
  async enableFeatures() {
    throw new Error("enableFeatures must be implemented by subclass");
  }

  /**
   * Initialize the handler
   */
  async init() {
    if (this.initialized) return;
    
    console.log(`[${this.platform}] Initializing handler...`);
    this.initialized = true;
    
    try {
      await this.enableFeatures();
    } catch (error) {
      console.error(`[${this.platform}] Error enabling features:`, error);
    }
  }

  /**
   * Cleanup when leaving the platform
   */
  cleanup() {
    this.initialized = false;
  }
}

// Make AIPlatformHandler available globally
window.AIPlatformHandler = AIPlatformHandler;

// ============================================================================
// Handler Registry
// ============================================================================

const platformHandlers = new Map();

/**
 * Register a platform handler
 * @param {string} domain - The domain this handler is for
 * @param {AIPlatformHandler} handler - The handler instance
 */
function registerPlatformHandler(domain, handler) {
  platformHandlers.set(domain, handler);
  console.log(`[Logic] Registered handler for ${domain}`);
}

/**
 * Get handler for current page
 * @returns {AIPlatformHandler|null}
 */
function getHandlerForCurrentPage() {
  const hostname = window.location.hostname;
  
  // Direct match
  if (platformHandlers.has(hostname)) {
    return platformHandlers.get(hostname);
  }
  
  // Try without www
  const withoutWww = hostname.replace(/^www\./, "");
  if (platformHandlers.has(withoutWww)) {
    return platformHandlers.get(withoutWww);
  }
  
  // Try subdomain match
  for (const [domain, handler] of platformHandlers) {
    if (hostname.endsWith("." + domain) || hostname === domain) {
      return handler;
    }
  }
  
  return null;
}

// Export registration function globally
window.registerPlatformHandler = registerPlatformHandler;
window.getHandlerForCurrentPage = getHandlerForCurrentPage;

// ============================================================================
// Platform Detection
// ============================================================================

const SUPPORTED_PLATFORMS = {
  "claude.ai": {
    name: "Claude",
    handler: "claudeHandler"
  },
  "grok.com": {
    name: "Grok",
    handler: "grokHandler"
  },
  "chat.deepseek.com": {
    name: "DeepSeek",
    handler: "deepseekHandler"
  },
  "chatgpt.com": {
    name: "ChatGPT",
    handler: "chatgptHandler"
  },
  "chat.openai.com": {
    name: "ChatGPT (Legacy)",
    handler: "chatgptHandler"
  },
  "gemini.google.com": {
    name: "Gemini",
    handler: "geminiHandler"
  },
  "aistudio.google.com": {
    name: "Google AI Studio",
    handler: "googleaistudioHandler"
  }
};

/**
 * Detect current platform
 * @returns {object|null} Platform info or null
 */
function detectPlatform() {
  const hostname = window.location.hostname.replace(/^www\./, "");
  
  for (const [domain, info] of Object.entries(SUPPORTED_PLATFORMS)) {
    if (hostname === domain || hostname.endsWith("." + domain)) {
      return { domain, ...info };
    }
  }
  
  return null;
}

// ============================================================================
// URL Change Observer
// ============================================================================

let currentUrl = window.location.href;
let currentHandler = null;

/**
 * Handle URL changes (for SPAs)
 */
function handleUrlChange() {
  const newUrl = window.location.href;
  
  if (newUrl !== currentUrl) {
    console.log("[Logic] URL changed:", newUrl);
    currentUrl = newUrl;
    
    // Re-initialize handler if needed
    const handler = getHandlerForCurrentPage();
    if (handler && handler !== currentHandler) {
      if (currentHandler) {
        currentHandler.cleanup();
      }
      currentHandler = handler;
      handler.init();
    }
  }
}

// Observe URL changes using History API
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(this, args);
  handleUrlChange();
};

history.replaceState = function(...args) {
  originalReplaceState.apply(this, args);
  handleUrlChange();
};

window.addEventListener("popstate", handleUrlChange);

// ============================================================================
// DOM Mutation Observer
// ============================================================================

let mutationObserver = null;
let debounceTimer = null;

/**
 * Start observing DOM mutations
 * Useful for detecting dynamically loaded content
 */
function startMutationObserver() {
  if (mutationObserver) return;

  mutationObserver = new MutationObserver((mutations) => {
    // Debounce to avoid excessive processing
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const handler = getHandlerForCurrentPage();
      if (handler && typeof handler.onDomChange === "function") {
        handler.onDomChange(mutations);
      }
    }, 100);
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "aria-pressed", "aria-checked", "data-state"]
  });

  console.log("[Logic] Mutation observer started");
}

/**
 * Stop observing DOM mutations
 */
function stopMutationObserver() {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
    console.log("[Logic] Mutation observer stopped");
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the extension
 */
async function initExtension() {
  const platform = detectPlatform();
  
  if (platform) {
    console.log(`[Logic] Detected platform: ${platform.name}`);
    
    // Start mutation observer
    startMutationObserver();
    
    // Wait a bit for other scripts to load and register handlers
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get and initialize the handler
    currentHandler = getHandlerForCurrentPage();
    if (currentHandler) {
      await currentHandler.init();
    } else {
      console.log("[Logic] No handler registered for this platform yet");
    }
  } else {
    console.log("[Logic] Not on a supported platform");
  }
}

// ============================================================================
// Utility Functions (Available to all handlers)
// ============================================================================

/**
 * Wait for specified milliseconds
 * @param {number} ms - Milliseconds to wait
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for an element to appear
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in ms
 */
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Click an element with optional retry
 * @param {string} selector - CSS selector
 * @param {number} retries - Number of retries
 */
async function clickElement(selector, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const element = document.querySelector(selector);
    if (element) {
      try {
        element.click();
        return true;
      } catch (e) {
        console.warn(`[Logic] Click attempt ${i + 1} failed:`, e);
      }
    }
    await wait(500);
  }
  return false;
}

/**
 * Simulate typing in an input
 * @param {Element} element - Input element
 * @param {string} text - Text to type
 */
async function simulateTyping(element, text) {
  element.focus();
  
  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, data: char }));
    await wait(50 + Math.random() * 50);
  }
  
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

// Export utilities globally
window.ExtensionUtils = {
  wait,
  waitForElement,
  clickElement,
  simulateTyping
};

// ============================================================================
// Start Extension
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initExtension);
} else {
  initExtension();
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  stopMutationObserver();
  if (currentHandler) {
    currentHandler.cleanup();
  }
});

console.log("[Logic] Core logic script loaded");

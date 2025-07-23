function simulateClick(element) {
  if (!element) return false;
  element.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      view: window,
    })
  );
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
  );
  element.dispatchEvent(
    new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window })
  );
  return true;
}
async function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getStorageItem(key, defaultValue = false) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? defaultValue : value === "true";
  } catch (error) {
    console.error(`Error getting storage item ${key}:`, error);
    return defaultValue;
  }
}
function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value ? "true" : "false");
    return true;
  } catch (error) {
    console.error(`Error setting storage item ${key}:`, error);
    return false;
  }
}
function isPageRefreshed() {
  try {
    const navEntries = performance.getEntriesByType("navigation");
    return navEntries.length > 0 && navEntries[0].type === "reload";
  } catch (error) {
    return false;
  }
}
async function tryWithDelays(action, delaysMs, validationFn = null) {
  if (validationFn && !validationFn()) {
    return false;
  }
  for (const delay of delaysMs) {
    await waitFor(delay);
    try {
      const success = await action();
      if (success) {
        return true;
      }
    } catch (error) {
      console.error(`Error during attempt (delay: ${delay}ms):`, error);
    }
  }
  return false;
}
class AIPlatformHandler {
  constructor(config) {
    this.config = {
      hostname: "",
      storageKey: "",
      urlPatterns: [],
      defaultDelays: [1000, 2000, 3000, 5000],
      ...config,
    };
  }
  isValidPage() {
    const url = window.location.href;
    return this.config.urlPatterns.some((pattern) => {
      if (typeof pattern === "string") {
        return url.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(url);
      }
      return false;
    });
  }
  isCurrentWebsite() {
    return (
      window.location.hostname.includes(this.config.hostname) &&
      this.isValidPage()
    );
  }
  async getFeatureEnabled() {
    if (isPageRefreshed()) {
      await this.setFeatureEnabled(false);
      return false;
    }
    return getStorageItem(this.config.storageKey, false);
  }
  async setFeatureEnabled(enabled) {
    return setStorageItem(this.config.storageKey, enabled);
  }
  async initialize() {
    if (!this.isCurrentWebsite()) {
      return false;
    }
    await this.setFeatureEnabled(false);
    if (document.readyState === "complete") {
      this.runWithDelays();
    } else {
      window.addEventListener("load", () => this.runWithDelays());
    }
    return true;
  }
  async runWithDelays() {
    await tryWithDelays(
      () => this.enableFeatures(),
      this.config.defaultDelays,
      () => this.isValidPage()
    );
  }
  async enableFeatures() {
    throw new Error("enableFeatures must be implemented by subclass");
  }
}
const handlers = [];
function initializeHandlers() {
  for (const handler of handlers) {
    if (handler.isCurrentWebsite()) {
      handler.initialize().catch((error) => {
        console.error(
          `Failed to initialize handler for ${handler.config.hostname}:`,
          error
        );
      });
    }
  }
}
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initializeHandlers();
  }
}).observe(document, { subtree: true, childList: true });

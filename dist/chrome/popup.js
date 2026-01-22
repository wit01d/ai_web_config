// popup.js - Popup script for AI Thinking Mode extension

"use strict";

// ============================================================================
// Supported Platforms
// ============================================================================

const SUPPORTED_PLATFORMS = [
  "claude.ai",
  "grok.com",
  "chat.deepseek.com",
  "chatgpt.com",
  "chat.openai.com",
  "gemini.google.com",
  "aistudio.google.com"
];

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
  currentDomain: document.getElementById("currentDomain"),
  platformStatus: document.getElementById("platformStatus"),
  cookieName: document.getElementById("cookieName"),
  deleteSingleBtn: document.getElementById("deleteSingleBtn"),
  listCookiesBtn: document.getElementById("listCookiesBtn"),
  deleteAllBtn: document.getElementById("deleteAllBtn"),
  clearSiteData: document.getElementById("clearSiteData"),
  includeGlobalData: document.getElementById("includeGlobalData"),
  globalDataOption: document.getElementById("globalDataOption"),
  output: document.getElementById("output"),
  cookieList: document.getElementById("cookieList"),
  reloadPageBtn: document.getElementById("reloadPageBtn"),
  hardReloadBtn: document.getElementById("hardReloadBtn")
};

// ============================================================================
// State
// ============================================================================

let currentTab = null;
let currentUrl = null;
let currentHostname = null;

// ============================================================================
// Utility Functions
// ============================================================================

function showOutput(message, type = "info") {
  elements.output.classList.add("visible");
  elements.output.innerHTML = `<span class="${type}">${escapeHtml(message)}</span>`;
}

function appendOutput(message, type = "info") {
  elements.output.classList.add("visible");
  elements.output.innerHTML += `\n<span class="${type}">${escapeHtml(message)}</span>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function isPlatformSupported(hostname) {
  return SUPPORTED_PLATFORMS.some(platform => 
    hostname === platform || hostname.endsWith("." + platform)
  );
}

function hideOutput() {
  elements.output.classList.remove("visible");
}

function hideCookieList() {
  elements.cookieList.classList.add("hidden");
  elements.cookieList.innerHTML = "";
}

// ============================================================================
// Cookie Operations
// ============================================================================

async function deleteSingleCookie() {
  const name = elements.cookieName.value.trim();
  
  if (!name) {
    showOutput("Please enter a cookie name", "error");
    return;
  }

  showOutput(`Deleting cookie "${name}"...`, "info");

  try {
    const result = await browser.runtime.sendMessage({
      action: "deleteCookie",
      url: currentUrl,
      name: name
    });

    if (result.success) {
      showOutput(`✓ Cookie "${name}" deleted successfully`, "success");
      elements.cookieName.value = "";
    } else {
      showOutput(`✗ Cookie "${name}" not found or could not be deleted`, "error");
    }
  } catch (error) {
    showOutput(`✗ Error: ${error.message}`, "error");
  }
}

async function listAllCookies() {
  showOutput("Loading cookies...", "info");
  hideCookieList();

  try {
    const result = await browser.runtime.sendMessage({
      action: "listCookies",
      domain: currentHostname
    });

    if (result.success && result.cookies.length > 0) {
      showOutput(`Found ${result.cookies.length} cookies:`, "success");
      
      elements.cookieList.classList.remove("hidden");
      elements.cookieList.innerHTML = result.cookies.map(cookie => `
        <div class="cookie-item">
          <span class="name" title="${escapeHtml(cookie.name)}: ${escapeHtml(cookie.value.substring(0, 50))}">
            ${escapeHtml(cookie.name)}
          </span>
          <button class="delete-btn" data-name="${escapeHtml(cookie.name)}">Delete</button>
        </div>
      `).join("");

      // Add click handlers for individual delete buttons
      elements.cookieList.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const cookieName = e.target.dataset.name;
          await deleteCookieByName(cookieName);
          // Refresh the list
          await listAllCookies();
        });
      });
    } else {
      showOutput("No cookies found for this domain", "info");
    }
  } catch (error) {
    showOutput(`✗ Error: ${error.message}`, "error");
  }
}

async function deleteCookieByName(name) {
  try {
    await browser.runtime.sendMessage({
      action: "deleteCookie",
      url: currentUrl,
      name: name
    });
  } catch (error) {
    console.error("Error deleting cookie:", error);
  }
}

async function deleteAllCookies() {
  const clearSiteDataChecked = elements.clearSiteData.checked;
  const includeGlobalDataChecked = elements.includeGlobalData.checked;

  let confirmMessage;
  if (clearSiteDataChecked && includeGlobalDataChecked) {
    confirmMessage = `Are you sure you want to delete ALL cookies AND site data for ${currentHostname}?\n\n` +
      `This will:\n` +
      `• Delete all cookies for this site\n` +
      `• Clear localStorage & sessionStorage\n` +
      `• Remove IndexedDB databases\n` +
      `• Unregister service workers\n` +
      `• ⚠️ Clear HTTP cache for ALL SITES\n\n` +
      `You will be logged out and the site will be fully reset.`;
  } else if (clearSiteDataChecked) {
    confirmMessage = `Are you sure you want to delete ALL cookies AND site data for ${currentHostname}?\n\n` +
      `This will:\n` +
      `• Delete all cookies for this site\n` +
      `• Clear localStorage & sessionStorage\n` +
      `• Remove IndexedDB databases\n` +
      `• Unregister service workers\n\n` +
      `You will be logged out and the site will be fully reset.`;
  } else {
    confirmMessage = `Are you sure you want to delete ALL cookies for ${currentHostname}?\n\n` +
      `This will log you out and reset your session.`;
  }

  const confirmed = confirm(confirmMessage);

  if (!confirmed) {
    return;
  }

  hideCookieList();

  // Step 1: Delete cookies
  showOutput(`Deleting all cookies for ${currentHostname}...`, "info");

  try {
    const cookieResult = await browser.runtime.sendMessage({
      action: "deleteAllCookies",
      domain: currentHostname
    });

    if (cookieResult.success) {
      showOutput(`✓ Deleted ${cookieResult.count} cookies`, "success");
    } else {
      showOutput(`✗ Error deleting cookies: ${cookieResult.error || "Unknown error"}`, "error");
      return;
    }

    // Step 2: Clear site data if checkbox is checked
    if (clearSiteDataChecked) {
      appendOutput("\nClearing site data...", "info");

      // Build origin URL from current URL
      const urlObj = new URL(currentUrl);
      const origin = urlObj.origin;

      const siteDataResult = await browser.runtime.sendMessage({
        action: "clearSiteData",
        origin: origin,
        includeGlobalData: includeGlobalDataChecked
      });

      if (siteDataResult.success) {
        appendOutput(`✓ Cleared: ${siteDataResult.cleared.join(", ")}`, "success");
      } else {
        appendOutput(`✗ Error clearing site data: ${siteDataResult.error}`, "error");
      }

      // Also clear sessionStorage via content script injection
      try {
        await browser.tabs.executeScript(currentTab.id, {
          code: 'sessionStorage.clear(); console.log("[AI Thinking Mode] Cleared sessionStorage");'
        });
        appendOutput("✓ Cleared sessionStorage", "success");
      } catch (e) {
        // sessionStorage clearing may fail on some pages, that's okay
        console.warn("Could not clear sessionStorage:", e);
      }
    }

    appendOutput("\n🔄 Reload the page to apply changes.", "info");
  } catch (error) {
    showOutput(`✗ Error: ${error.message}`, "error");
  }
}

// ============================================================================
// Page Actions
// ============================================================================

async function reloadPage() {
  if (currentTab) {
    await browser.tabs.reload(currentTab.id);
    window.close();
  }
}

async function hardReload() {
  if (currentTab) {
    await browser.tabs.reload(currentTab.id, { bypassCache: true });
    window.close();
  }
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
  try {
    // Get current tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    
    if (!currentTab || !currentTab.url) {
      elements.currentDomain.textContent = "No page loaded";
      elements.platformStatus.textContent = "N/A";
      elements.platformStatus.classList.add("unsupported");
      return;
    }

    // Parse URL
    try {
      const url = new URL(currentTab.url);
      currentUrl = currentTab.url;
      currentHostname = url.hostname;
      
      // Update UI with current site info
      elements.currentDomain.textContent = currentHostname;
      
      if (isPlatformSupported(currentHostname)) {
        elements.platformStatus.textContent = "Supported";
        elements.platformStatus.classList.remove("unsupported");
      } else {
        elements.platformStatus.textContent = "Not AI Platform";
        elements.platformStatus.classList.add("unsupported");
      }
    } catch (e) {
      elements.currentDomain.textContent = "Invalid URL";
      elements.platformStatus.textContent = "N/A";
      elements.platformStatus.classList.add("unsupported");
    }
  } catch (error) {
    console.error("Error initializing popup:", error);
    elements.currentDomain.textContent = "Error";
    elements.platformStatus.textContent = "Error";
    elements.platformStatus.classList.add("unsupported");
  }
}

// ============================================================================
// Event Listeners
// ============================================================================

elements.deleteSingleBtn.addEventListener("click", deleteSingleCookie);
elements.listCookiesBtn.addEventListener("click", listAllCookies);
elements.deleteAllBtn.addEventListener("click", deleteAllCookies);
elements.reloadPageBtn.addEventListener("click", reloadPage);
elements.hardReloadBtn.addEventListener("click", hardReload);

// Show/hide global data option when clearSiteData is toggled
elements.clearSiteData.addEventListener("change", () => {
  if (elements.clearSiteData.checked) {
    elements.globalDataOption.style.display = "flex";
  } else {
    elements.globalDataOption.style.display = "none";
    elements.includeGlobalData.checked = false;
  }
});

// Handle Enter key in cookie name input
elements.cookieName.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    deleteSingleCookie();
  }
});

// Initialize on load
document.addEventListener("DOMContentLoaded", init);

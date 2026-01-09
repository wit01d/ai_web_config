// captcha-solver.js - CAPTCHA detection and solving utilities
// This script detects and handles CAPTCHAs across supported platforms

"use strict";

// ============================================================================
// CAPTCHA Solver Class
// ============================================================================

class CaptchaSolver {
  constructor() {
    this.selectors = {
      // Common CAPTCHA selectors
      cloudflare: {
        challenge: "#challenge-running",
        turnstile: ".cf-turnstile",
        checkbox: 'input[type="checkbox"]',
        iframe: 'iframe[src*="challenges.cloudflare.com"]'
      },
      recaptcha: {
        container: ".g-recaptcha",
        iframe: 'iframe[src*="google.com/recaptcha"]',
        checkbox: ".recaptcha-checkbox-border"
      },
      hcaptcha: {
        container: ".h-captcha",
        iframe: 'iframe[src*="hcaptcha.com"]',
        checkbox: "#checkbox"
      }
    };
    
    this.observing = false;
  }

  /**
   * Detect if any CAPTCHA is present on the page
   * @returns {string|null} CAPTCHA type or null
   */
  detectCaptcha() {
    // Cloudflare Turnstile
    if (document.querySelector(this.selectors.cloudflare.turnstile) ||
        document.querySelector(this.selectors.cloudflare.iframe)) {
      return "cloudflare";
    }
    
    // reCAPTCHA
    if (document.querySelector(this.selectors.recaptcha.container) ||
        document.querySelector(this.selectors.recaptcha.iframe)) {
      return "recaptcha";
    }
    
    // hCaptcha
    if (document.querySelector(this.selectors.hcaptcha.container) ||
        document.querySelector(this.selectors.hcaptcha.iframe)) {
      return "hcaptcha";
    }
    
    return null;
  }

  /**
   * Attempt to solve the CAPTCHA
   * Note: This is a basic implementation that clicks checkboxes
   * More advanced solving would require external services
   */
  async attemptSolve() {
    const captchaType = this.detectCaptcha();
    
    if (!captchaType) {
      console.log("[CaptchaSolver] No CAPTCHA detected");
      return false;
    }
    
    console.log(`[CaptchaSolver] Detected ${captchaType} CAPTCHA`);
    
    switch (captchaType) {
      case "cloudflare":
        return await this.solveCloudflare();
      case "recaptcha":
        return await this.solveRecaptcha();
      case "hcaptcha":
        return await this.solveHcaptcha();
      default:
        return false;
    }
  }

  /**
   * Attempt to solve Cloudflare Turnstile
   */
  async solveCloudflare() {
    console.log("[CaptchaSolver] Attempting Cloudflare solution...");
    
    // Wait for challenge to load
    await this.wait(1000);
    
    // Try to find and click the checkbox
    const iframe = document.querySelector(this.selectors.cloudflare.iframe);
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const checkbox = iframeDoc.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.click();
          console.log("[CaptchaSolver] Clicked Cloudflare checkbox");
          return true;
        }
      } catch (e) {
        // Cross-origin access denied - this is expected
        console.log("[CaptchaSolver] Cannot access Cloudflare iframe (cross-origin)");
      }
    }
    
    return false;
  }

  /**
   * Attempt to solve reCAPTCHA
   */
  async solveRecaptcha() {
    console.log("[CaptchaSolver] Attempting reCAPTCHA solution...");
    
    // This is a placeholder - actual solving would require external services
    // For now, just log that we detected it
    console.log("[CaptchaSolver] reCAPTCHA detected - manual solving required");
    
    return false;
  }

  /**
   * Attempt to solve hCaptcha
   */
  async solveHcaptcha() {
    console.log("[CaptchaSolver] Attempting hCaptcha solution...");
    
    // This is a placeholder - actual solving would require external services
    console.log("[CaptchaSolver] hCaptcha detected - manual solving required");
    
    return false;
  }

  /**
   * Start observing for CAPTCHAs
   */
  startObserving() {
    if (this.observing) return;
    
    this.observer = new MutationObserver((mutations) => {
      const captcha = this.detectCaptcha();
      if (captcha) {
        console.log(`[CaptchaSolver] CAPTCHA appeared: ${captcha}`);
        this.attemptSolve();
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.observing = true;
    console.log("[CaptchaSolver] Started observing for CAPTCHAs");
  }

  /**
   * Stop observing for CAPTCHAs
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observing = false;
      console.log("[CaptchaSolver] Stopped observing");
    }
  }

  /**
   * Wait utility
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Initialize
// ============================================================================

const captchaSolver = new CaptchaSolver();

// Start observing when script loads
captchaSolver.startObserving();

// Check immediately
const initialCaptcha = captchaSolver.detectCaptcha();
if (initialCaptcha) {
  console.log(`[CaptchaSolver] Initial CAPTCHA detected: ${initialCaptcha}`);
  captchaSolver.attemptSolve();
}

// Export globally
window.CaptchaSolver = CaptchaSolver;
window.captchaSolver = captchaSolver;

console.log("[CaptchaSolver] CAPTCHA solver loaded");

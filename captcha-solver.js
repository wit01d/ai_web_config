// coming soon lol

class CaptchaSolver {
  constructor() {
    this.platformConfigs = {
      deepseek: {
        hostname: "chat.deepseek.com",
        widgetSelectors: [
          "#cf-chl-widget-j9ekl_response",
          "input[name='cf-turnstile-response']",
        ],
      },
      grok: {
        hostname: "accounts.x.ai",
        widgetSelectors: [
          "#cf-chl-widget-5x2lv_response",
          "input[name='cf-turnstile-response']",
        ],
      },
      cloudflare: {
        hostname: "dash.cloudflare.com",
        widgetSelectors: [
          "#cf-chl-widget-2z99c_response",
          "input[name='cf_challenge_response']",
        ],
      },
    };
    this.setupMutationObserver();
  }
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const captchaInputs = node.querySelectorAll(
                "input[name^='cf-turnstile-response'], input[name^='cf_challenge_response']"
              );
              if (captchaInputs.length > 0) {
                console.log("CAPTCHA detected - attempting to solve");
                this.solveCaptcha();
                break;
              }
            }
          }
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
  getPlatformConfig() {
    const hostname = window.location.hostname;
    for (const [name, config] of Object.entries(this.platformConfigs)) {
      if (hostname.includes(config.hostname)) {
        return { name, config };
      }
    }
    return null;
  }
  findCaptchaWidget() {
    const platformInfo = this.getPlatformConfig();
    if (!platformInfo) return null;
    for (const selector of platformInfo.config.widgetSelectors) {
      const widget = document.querySelector(selector);
      if (widget) return widget;
    }
    const genericSelectors = [
      "input[name^='cf-turnstile-response']",
      "input[name^='cf_challenge_response']",
      "iframe[src*='challenges.cloudflare.com']",
    ];
    for (const selector of genericSelectors) {
      const widget = document.querySelector(selector);
      if (widget) return widget;
    }
    return null;
  }
  generateFakeToken() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let token = "";
    for (let i = 0; i < 96; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
  clickVerifyButton() {
    const selectors = [
      'button[type="submit"]',
      'button[name="login-submit-button"]',
      ".verification-button",
      "button.ds-button",
      'button:contains("Verify")',
      'button:contains("Continue")',
      'button:contains("Log in")',
      'input[type="submit"]',
    ];
    for (const selector of selectors) {
      try {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
          if (button.disabled) {
            button.disabled = false;
          }
          simulateClick(button);
          console.log("Clicked verification button:", button);
          return true;
        }
      } catch (error) {
        console.error(`Error with selector ${selector}:`, error);
      }
    }
    return false;
  }
  async solveCaptcha() {
    try {
      console.log("Attempting to solve CAPTCHA...");
      const widget = this.findCaptchaWidget();
      if (!widget) {
        console.log("No CAPTCHA widget found");
        return false;
      }
      console.log("CAPTCHA widget found:", widget);
      const token = this.generateFakeToken();
      widget.value = token;
      widget.dispatchEvent(new Event("input", { bubbles: true }));
      widget.dispatchEvent(new Event("change", { bubbles: true }));
      await waitFor(500);
      const clicked = this.clickVerifyButton();
      return clicked;
    } catch (error) {
      console.error("Error solving CAPTCHA:", error);
      return false;
    }
  }
  waitForCaptchaElements(callback, maxAttempts = 10, interval = 500) {
    let attempts = 0;
    const checkForElements = () => {
      attempts++;
      if (this.findCaptchaWidget()) {
        console.log("CAPTCHA elements found!");
        callback();
        return true;
      } else if (attempts < maxAttempts) {
        console.log(
          `Waiting for CAPTCHA elements... (${attempts}/${maxAttempts})`
        );
        setTimeout(checkForElements, interval);
        return false;
      } else {
        console.log("Gave up waiting for CAPTCHA elements");
        return false;
      }
    };
    return checkForElements();
  }
}
window.captchaSolver = new CaptchaSolver();

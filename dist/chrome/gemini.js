class GeminiHandler extends AIPlatformHandler {
  constructor() {
    super({
      hostname: "gemini.google.com",
      storageKey: "gemini-options-enabled",
      urlPatterns: ["gemini.google.com/app", /gemini\.google\.com\/?$/],
      defaultDelays: [1500, 3000, 5000, 7000],
    });
  }

  isValidGeminiPage() {
    return this.isValidPage();
  }

  async enableFeatures() {
    return await this.setupGeminiFeatures();
  }

  async isGeminiMenuCollapsed() {
    try {
      if (document.readyState !== "complete") {
        return false;
      }

      const sidenav = document.querySelector("bard-sidenav");
      if (!sidenav) return true;

      const hasCollapsedClass = sidenav.classList.contains("collapsed");
      const hasOverlayClass = sidenav.classList.contains(
        "overlay-main-content"
      );

      return hasCollapsedClass || hasOverlayClass;
    } catch (error) {
      return true;
    }
  }

  async isGemini25ProEnabled() {
    try {
      const attributionElement = document.querySelector(
        '[data-test-id="attribution-text"]'
      );
      if (!attributionElement) return false;

      return attributionElement.textContent.includes("2.5 Pro");
    } catch (error) {
      return false;
    }
  }

  async isGeminiCanvasEnabled() {
    try {
      const canvasButtons = Array.from(
        document.querySelectorAll("button")
      ).filter((button) => button.textContent.trim().includes("Canvas"));

      if (canvasButtons.length === 0) return false;

      return canvasButtons.some((button) => {
        const isSelected = button.classList.contains("is-selected");
        return isSelected;
      });
    } catch (error) {
      return false;
    }
  }

  async collapseGeminiMenu() {
    try {
      const collapsed = await this.isGeminiMenuCollapsed();
      if (collapsed) return true;

      const menuButton = document.querySelector(
        '[data-test-id="side-nav-menu-button"]'
      );
      if (!menuButton) {
        const altMenuButton = document.querySelector(
          '[aria-label="Main menu"]'
        );
        if (altMenuButton) {
          simulateClick(altMenuButton);
          return true;
        }
        return false;
      }

      simulateClick(menuButton);
      return true;
    } catch (error) {
      return false;
    }
  }

  async enableGemini25Pro() {
    try {
      const enabled = await this.isGemini25ProEnabled();
      if (enabled) return true;

      const modeButton = document.querySelector(
        '[data-test-id="bard-mode-menu-button"]'
      );
      if (!modeButton) return false;

      simulateClick(modeButton);
      await waitFor(800);

      const proOptions = Array.from(document.querySelectorAll("button")).filter(
        (button) => button.textContent.includes("2.5 Pro")
      );

      if (proOptions.length === 0) {
        simulateClick(document.body);
        return false;
      }

      simulateClick(proOptions[0]);
      await waitFor(500);
      return true;
    } catch (error) {
      return false;
    }
  }

  async enableGeminiCanvas() {
    try {
      const enabled = await this.isGeminiCanvasEnabled();
      if (enabled) return true;

      const canvasButtons = Array.from(
        document.querySelectorAll("button")
      ).filter((button) => button.textContent.trim().includes("Canvas"));

      if (canvasButtons.length === 0) return false;

      for (const button of canvasButtons) {
        if (!button.classList.contains("is-selected")) {
          simulateClick(button);
          await waitFor(300);
          return true;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async setupGeminiFeatures() {
    await this.collapseGeminiMenu();
    await waitFor(1000);

    await this.enableGemini25Pro();
    await waitFor(1000);

    await this.enableGeminiCanvas();

    await this.setFeatureEnabled(true);
    return true;
  }
}

const geminiHandler = new GeminiHandler();
handlers.push(geminiHandler);

const isGeminiWebsite =
  window.location.hostname.includes("gemini.google.com") &&
  geminiHandler.isValidPage();
if (isGeminiWebsite) {
  geminiHandler.initialize();
}

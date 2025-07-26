class GoogleAIStudioHandler extends AIPlatformHandler {
  constructor() {
    super({
      hostname: "aistudio.google.com",
      storageKey: "googleaistudio-menus-enabled",
      urlPatterns: ["aistudio.google.com/"],
      defaultDelays: [1000, 2000, 3000, 5000],
    });
    this.observer = null;
    this.settingsAppliedOnPageLoad = false;
  }
  isValidGoogleAIStudioPage() {
    return this.isValidPage();
  }
  async runSetupSequence() {
    await this.applyCustomSettings();
    await this.collapseMenusAndFocus();
  }
  async applyCustomSettings() {
    try {
      const waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const runSettingsPanel = document.querySelector(
        "ms-run-settings.expanded"
      );
      if (!runSettingsPanel) {
        const openButton = document.querySelector(
          'button[aria-label="Show run settings"]'
        );
        if (openButton) {
          openButton.click();
          await waitFor(500);
        } else {
          console.error("Could not find 'Show run settings' button.");
          return;
        }
      }
      const urlContextToggle = document.querySelector(
        'ms-browse-as-a-tool button[role="switch"]'
      );
      if (
        urlContextToggle &&
        urlContextToggle.getAttribute("aria-checked") === "false"
      ) {
        console.log("Enabling URL Context...");
        urlContextToggle.click();
      }
      const topPContainer = document.querySelector(
        'div[mattooltip="Probability threshold for top-p sampling"]'
      );
      if (topPContainer) {
        const topPInput = topPContainer.querySelector('input[type="number"]');
        if (topPInput && topPInput.value !== "1") {
          topPInput.value = "1";
          topPInput.dispatchEvent(new Event("input", { bubbles: true }));
          topPInput.dispatchEvent(new Event("blur", { bubbles: true }));
        }
      }
    } catch (error) {
      console.error("Failed to apply custom AI Studio settings:", error);
    }
  }
  async collapseMenusAndFocus() {
    try {
      const waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const runSettingsPanel = document.querySelector(
        "ms-run-settings.expanded"
      );
      if (runSettingsPanel) {
        const closeButton = runSettingsPanel.querySelector(
          'button[aria-label="Close run settings panel"]'
        );
        if (closeButton) {
          closeButton.click();
          await waitFor(300);
        }
      }
      const inputField = document.querySelector(
        'textarea[aria-label="Type something or tab to choose an example prompt"]'
      );
      if (inputField) {
        inputField.focus();
      }
      await this.setFeatureEnabled(true);
    } catch (error) {
      console.error("Error during collapse or focus action:", error);
    }
  }
  async handlePageLoad() {
    this.settingsAppliedOnPageLoad = true;
    if (this.observer) this.observer.disconnect();
    await this.runSetupSequence();
    setTimeout(() => {
      if (this.observer) {
        this.observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    }, 2000);
  }
  initialize() {
    const observerCallback = (mutationsList, observer) => {
      const isNewPromptPage = window.location.href.includes("/prompts/new_");
      const welcomeHeader = document.querySelector("h1.gradient-text");
      if (isNewPromptPage && welcomeHeader && !this.settingsAppliedOnPageLoad) {
        this.handlePageLoad();
      } else if (!isNewPromptPage && this.settingsAppliedOnPageLoad) {
        this.settingsAppliedOnPageLoad = false;
      }
    };
    this.observer = new MutationObserver(observerCallback);
    this.observer.observe(document.body, { childList: true, subtree: true });
  }
}
const googleAIStudioHandler = new GoogleAIStudioHandler();
handlers.push(googleAIStudioHandler);
const isGoogleAIStudioWebsite =
  window.location.hostname.includes("aistudio.google.com") &&
  googleAIStudioHandler.isValidPage();
if (isGoogleAIStudioWebsite) {
  googleAIStudioHandler.initialize();
}

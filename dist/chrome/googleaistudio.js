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

      let runSettingsPanel = document.querySelector("ms-run-settings.expanded");
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
        await waitFor(100);
      }

      const topPContainer = document.querySelector(
        'div[mattooltip="Probability threshold for top-p sampling"]'
      );
      if (topPContainer) {
        const topPInput = topPContainer.querySelector('input[type="number"]');
        if (topPInput && topPInput.value !== "1") {
          console.log('Setting "Top P" to 1...');
          topPInput.value = "1";
          topPInput.dispatchEvent(new Event("input", { bubbles: true }));
          topPInput.dispatchEvent(new Event("blur", { bubbles: true }));
        }
      }

      const manualBudgetToggle = document.querySelector(
        'mat-slide-toggle[data-test-toggle="manual-budget"] button'
      );
      if (manualBudgetToggle) {
        if (manualBudgetToggle.getAttribute("aria-checked") === "false") {
          console.log("Enabling manual thinking budget...");
          manualBudgetToggle.click();
          await waitFor(300);
        }

        const budgetInput = document.querySelector(
          'div[data-test-id="user-setting-budget-animation-wrapper"] input[type="number"]'
        );
        if (budgetInput) {
          console.log("Setting thinking budget to 32768...");
          budgetInput.value = "32768";
          budgetInput.dispatchEvent(new Event("input", { bubbles: true }));
          budgetInput.dispatchEvent(new Event("blur", { bubbles: true }));
        }
      }

      const mediaResolutionDropdown = document.querySelector(
        'mat-select[aria-label="Media Resolution"]'
      );
      if (mediaResolutionDropdown) {
        const currentValue = mediaResolutionDropdown
          .querySelector(".mat-mdc-select-value-text")
          .textContent.trim();
        if (currentValue.includes("Default")) {
          console.log("Changing Media Resolution to 'Medium'...");
          mediaResolutionDropdown.click();
          await waitFor(300);

          const options = document.querySelectorAll(
            ".cdk-overlay-pane mat-option"
          );
          let mediumOption = null;
          for (const option of options) {
            if (option.textContent.trim() === "Medium") {
              mediumOption = option;
              break;
            }
          }

          if (mediumOption) {
            mediumOption.click();
            await waitFor(100);
          } else {
            console.error("Could not find the 'Medium' resolution option.");
            mediaResolutionDropdown.click();
          }
        }
      } else {
        console.error("Could not find the Media Resolution dropdown.");
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
    if (this.settingsAppliedOnPageLoad) return;
    this.settingsAppliedOnPageLoad = true;
    if (this.observer) {
      this.observer.disconnect();
    }

    console.log("AI Studio page loaded. Running setup sequence.");
    await this.runSetupSequence();
  }

  initialize() {
    const observerCallback = (mutationsList, observer) => {
      const promptInputField = document.querySelector(
        'textarea[aria-label="Type something or tab to choose an example prompt"]'
      );

      if (promptInputField && !this.settingsAppliedOnPageLoad) {
        this.handlePageLoad();
        if (this.observer) {
          this.observer.disconnect();
        }
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

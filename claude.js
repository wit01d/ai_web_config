class ClaudeHandler extends AIPlatformHandler {
  constructor() {
    super({
      hostname: "claude.ai",
      storageKey: "claude-thinking-enabled",
      urlPatterns: ["claude.ai/chat/", "claude.ai/new", "claude.ai/project"],
      defaultDelays: [1500, 3000, 5000, 7000],
    });
  }
  isValidClaudePage() {
    return this.isValidPage();
  }
  async enableFeatures() {
    await this.collapseClaudeSidebar();
    const thinkingActive = await this.detectThinkingActive();
    const researchActive = await this.detectResearchActive();
    let featuresEnabled = false;
    if (thinkingActive) {
      featuresEnabled = true;
    } else {
      featuresEnabled = await this.toggleClaudeThinking();
    }
    if (!researchActive) {
      await this.enableResearch();
    }
    if (featuresEnabled || !researchActive) {
      await this.setFeatureEnabled(true);
      await this.focusInputField();
    }
    return featuresEnabled;
  }
  async collapseClaudeSidebar() {
    try {
      const sidebarToggle = document.querySelector(
        '[data-testid="pin-sidebar-toggle"]'
      );
      if (sidebarToggle) {
        const sidebar = document.querySelector('nav[style*="width: 18rem"]');
        if (sidebar) {
          simulateClick(sidebarToggle);
          await waitFor(300);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error collapsing Claude sidebar:", error);
      return false;
    }
  }
  async detectThinkingActive() {
    try {
      const activeThinkingButton = document.querySelector(
        "button.bg-accent-secondary-100\\/\\[8\\%\\], " +
          "button.text-accent-secondary-100, " +
          'button[class*="bg-accent-secondary"]'
      );
      if (
        activeThinkingButton &&
        activeThinkingButton.querySelector('svg[viewBox="0 0 20 20"]')
      ) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error detecting thinking active:", error);
      return false;
    }
  }
  async detectResearchActive() {
    try {
      const researchButtons = Array.from(
        document.querySelectorAll("button")
      ).filter(
        (button) =>
          button.textContent && button.textContent.includes("Research")
      );
      for (const button of researchButtons) {
        if (
          button.getAttribute("aria-pressed") === "true" ||
          button.classList.contains("text-accent-secondary-100") ||
          button.classList.contains("bg-accent-secondary-100/[8%]")
        ) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error detecting research active:", error);
      return false;
    }
  }
  async enableResearch() {
    try {
      const researchButtons = Array.from(
        document.querySelectorAll("button")
      ).filter(
        (button) =>
          button.textContent && button.textContent.includes("Research")
      );
      for (const button of researchButtons) {
        const isPressed = button.getAttribute("aria-pressed") === "true";
        if (!isPressed) {
          simulateClick(button);
          await waitFor(300);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error enabling research:", error);
      return false;
    }
  }
  async focusInputField() {
    try {
      const inputContainer = document.querySelector(
        '[aria-label="Write your prompt to Claude"]'
      );
      if (inputContainer) {
        const editableDiv = inputContainer.querySelector(
          '[contenteditable="true"]'
        );
        if (editableDiv) {
          editableDiv.focus();
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(editableDiv);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error focusing input field:", error);
      return false;
    }
  }
  async closeAllDropdowns() {
    try {
      const openDropdowns = document.querySelectorAll(
        'button[aria-expanded="true"]'
      );
      for (const dropdown of openDropdowns) {
        simulateClick(dropdown);
        await waitFor(100);
      }
      return true;
    } catch (error) {
      console.error("Error closing dropdowns:", error);
      return false;
    }
  }
  async toggleClaudeThinking() {
    try {
      if (!this.isValidPage()) {
        return false;
      }
      await this.closeAllDropdowns();
      const toolsMenuButton = document.querySelector(
        '[data-testid="input-menu-tools"]'
      );
      if (!toolsMenuButton) {
        return false;
      }
      simulateClick(toolsMenuButton);
      await waitFor(500);
      const extendedThinkingOption = Array.from(
        document.querySelectorAll("button")
      ).find((button) => button.textContent.includes("Extended thinking"));
      if (!extendedThinkingOption) {
        simulateClick(toolsMenuButton);
        await waitFor(300);
        return false;
      }
      const checkbox = extendedThinkingOption.querySelector(
        'input[type="checkbox"]'
      );
      const isAlreadyEnabled = checkbox && checkbox.checked;
      if (!isAlreadyEnabled) {
        simulateClick(extendedThinkingOption);
        await waitFor(300);
      }
      simulateClick(toolsMenuButton);
      await waitFor(300);
      await this.setFeatureEnabled(true);
      await this.focusInputField();
      return true;
    } catch (error) {
      console.error("Error toggling Claude thinking:", error);
      await this.closeAllDropdowns();
      return false;
    }
  }
}
const claudeHandler = new ClaudeHandler();
handlers.push(claudeHandler);
const isClaudeWebsite =
  window.location.hostname.includes("claude.ai") && claudeHandler.isValidPage();
if (isClaudeWebsite) {
  claudeHandler.initialize();
}

class DeepSeekHandler extends AIPlatformHandler {
  constructor() {
    super({
      hostname: "chat.deepseek.com",
      storageKey: "deepseek-buttons-enabled",
      urlPatterns: ["chat.deepseek.com/", "chat.deepseek.com/a/chat"],
      defaultDelays: [500, 1000, 2000, 3000, 5000],
    });
  }
  isValidDeepSeekPage() {
    return this.isValidPage();
  }
  async enableFeatures() {
    await this.collapseDeepSeekSidebar();
    return await this.enableDeepSeekButtons();
  }
  async collapseDeepSeekSidebar() {
    try {
      const sidebarToggle = document.querySelector(
        '.ds-icon-button svg[viewBox="0 0 30 30"]'
      );
      if (sidebarToggle) {
        const sidebarToggleButton = sidebarToggle.closest(".ds-icon-button");
        if (sidebarToggleButton) {
          const sidebar = document.querySelector(".b8812f16");
          if (sidebar) {
            simulateClick(sidebarToggleButton);
            await waitFor(300);
            return true;
          }
        }
      }
      const alternativeSidebarToggle = document.querySelector("._7d1f5e2");
      if (alternativeSidebarToggle) {
        const sidebar = document.querySelector(".b8812f16");
        if (sidebar) {
          simulateClick(alternativeSidebarToggle);
          await waitFor(300);
          return true;
        }
      }
      const dropdownButtons = document.querySelectorAll(
        'button[aria-expanded="true"]'
      );
      let collapsed = false;
      for (const button of dropdownButtons) {
        simulateClick(button);
        await waitFor(100);
        collapsed = true;
      }
      return collapsed;
    } catch (error) {
      console.error("Error collapsing DeepSeek sidebar:", error);
      return false;
    }
  }
  isDeepThinkAndSearchEnabled(button) {
    if (!button) return false;
    const computedStyle = window.getComputedStyle(button);
    const buttonColor = computedStyle
      .getPropertyValue("--ds-button-color")
      .trim();
    return (
      buttonColor.includes("rgba(77, 107, 254") ||
      !buttonColor.includes("transparent")
    );
  }
  async findAndEnableButtons() {
    try {
      const allButtons = Array.from(document.querySelectorAll(".ds-button"));
      const targetButtons = allButtons.filter((button) => {
        const textContent = button.textContent || "";
        return (
          textContent.includes("DeepThink") || textContent.includes("Search")
        );
      });
      let buttonsEnabled = 0;
      for (const button of targetButtons) {
        if (!this.isDeepThinkAndSearchEnabled(button)) {
          simulateClick(button);
          await waitFor(300);
          buttonsEnabled++;
        }
      }
      if (buttonsEnabled > 0) {
        await this.setFeatureEnabled(true);
        return true;
      }
      if (targetButtons.length > 0) {
        await this.setFeatureEnabled(true);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  async enableDeepSeekButtons() {
    try {
      if (!this.isValidPage()) {
        return false;
      }
      if (await this.getFeatureEnabled()) {
        const allButtons = Array.from(document.querySelectorAll(".ds-button"));
        const targetButtons = allButtons.filter((button) => {
          const textContent = button.textContent || "";
          return (
            textContent.includes("DeepThink") || textContent.includes("Search")
          );
        });
        if (
          targetButtons.every((button) =>
            this.isDeepThinkAndSearchEnabled(button)
          )
        ) {
          return true;
        }
      }
      return await this.findAndEnableButtons();
    } catch (error) {
      return false;
    }
  }
}
const deepSeekHandler = new DeepSeekHandler();
handlers.push(deepSeekHandler);
const isDeepSeekWebsite =
  window.location.hostname.includes("chat.deepseek.com") &&
  deepSeekHandler.isValidPage();
if (isDeepSeekWebsite) {
  deepSeekHandler.initialize();
}

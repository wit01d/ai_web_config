class GrokHandler extends AIPlatformHandler {
  constructor() {
    super({
      hostname: "grok.com",
      storageKey: "grok-thinking-enabled",
      urlPatterns: ["grok.com/new", "grok.com/chat", /grok\.com\/?$/],
      defaultDelays: [1500, 3000, 5000, 7000],
    });
  }
  async enableFeatures() {
    return await this.toggleGrokThinking();
  }
  async toggleGrokThinking() {
    try {
      if (await this.getFeatureEnabled()) {
        return true;
      }
      const thinkButton = Array.from(document.querySelectorAll("button")).find(
        (button) =>
          button.querySelector("span") &&
          button.querySelector("span").textContent === "Think" &&
          button.hasAttribute("aria-pressed")
      );
      if (!thinkButton) {
        return false;
      }
      if (thinkButton.getAttribute("aria-pressed") === "true") {
        await this.setFeatureEnabled(true);
        return true;
      }
      simulateClick(thinkButton);
      await waitFor(500);
      if (thinkButton.getAttribute("aria-pressed") === "true") {
        await this.setFeatureEnabled(true);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }
}
const grokHandler = new GrokHandler();
handlers.push(grokHandler);
const isGrokWebsite = window.location.hostname.includes("grok.com");
if (isGrokWebsite) {
  grokHandler.initialize();
}

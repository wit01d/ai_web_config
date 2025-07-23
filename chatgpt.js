class ChatGPTHandler extends AIPlatformHandler {
  constructor() {
    super({
      hostname: "chatgpt.com",
      storageKey: "chatgpt-canvas-enabled",
      urlPatterns: [/chatgpt\.com\/?$/, "chatgpt.com/c/"],
      defaultDelays: [500, 1000, 2000, 3000, 5000],
    });
  }

  isValidChatGPTPage() {
    return this.isValidPage();
  }

  isCanvasAlreadyEnabled() {
    const mentionElements = document.querySelectorAll(
      '[data-mention-id="canvas"]'
    );
    return mentionElements.length > 0;
  }

  async enableFeatures() {
    if (this.isCanvasAlreadyEnabled()) {
      await this.setFeatureEnabled(true);
      return true;
    }

    return await this.enableChatGPTCanvas();
  }

  async enableChatGPTCanvas() {
    try {
      if (!this.isValidPage()) {
        return false;
      }

      if (await this.getFeatureEnabled()) {
        if (this.isCanvasAlreadyEnabled()) {
          return true;
        }
      }

      const proseMirrorEditor = document.querySelector(
        '.ProseMirror[id="prompt-textarea"]'
      );

      if (!proseMirrorEditor) {
        return false;
      }

      const isEditorEmpty = proseMirrorEditor.innerText.trim() === "";
      if (!isEditorEmpty) {
        return false;
      }

      const toolsButton = document.querySelector('[aria-label="Use a tool"]');
      if (!toolsButton) {
        return false;
      }

      simulateClick(toolsButton);
      await waitFor(500);

      const menuItems = Array.from(document.querySelectorAll("button"));
      const canvasButton = menuItems.find((button) => {
        const textContent = button.textContent || "";
        return textContent.includes("Canvas");
      });

      if (!canvasButton) {
        const outsideClick = document.querySelector("body");
        if (outsideClick) {
          simulateClick(outsideClick);
        }
        return false;
      }

      simulateClick(canvasButton);
      await waitFor(300);

      if (this.isCanvasAlreadyEnabled()) {
        await this.setFeatureEnabled(true);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}

const chatGPTHandler = new ChatGPTHandler();
handlers.push(chatGPTHandler);

const isChatGPTWebsite =
  window.location.hostname.includes("chatgpt.com") &&
  chatGPTHandler.isValidPage();
if (isChatGPTWebsite) {
  chatGPTHandler.initialize();
}

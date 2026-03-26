/** Highlight detected form fields on the page */
const HIGHLIGHT_CLASS = "es-autofill-highlight";

export function highlightFields(selectors: string[]): void {
  // Inject highlight style if not present
  if (!document.getElementById("es-autofill-highlight-style")) {
    const style = document.createElement("style");
    style.id = "es-autofill-highlight-style";
    style.textContent = `
      .${HIGHLIGHT_CLASS} {
        outline: 2px solid #4f46e5 !important;
        outline-offset: 2px !important;
        transition: outline 0.2s !important;
      }
    `;
    document.head.appendChild(style);
  }

  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) el.classList.add(HIGHLIGHT_CLASS);
    } catch {
      // Invalid selector
    }
  }
}

export function clearHighlights(): void {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(HIGHLIGHT_CLASS);
  });
}

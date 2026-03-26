/** Simulate user input events to trigger framework validation */
export function simulateInputEvents(element: HTMLElement): void {
  // Focus
  element.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
  element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

  // Input
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(
    new InputEvent("input", { bubbles: true, inputType: "insertText" })
  );

  // Change
  element.dispatchEvent(new Event("change", { bubbles: true }));

  // Blur (triggers validation)
  element.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
}

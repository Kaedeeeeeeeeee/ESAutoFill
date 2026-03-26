import { simulateInputEvents } from "../event-simulator";

/**
 * Fill a React-controlled input using the native value setter hack.
 * React intercepts the `value` property with its own setter;
 * using the native setter bypasses React's internal state tracking.
 */
export function fillReactInput(element: HTMLInputElement | HTMLTextAreaElement, value: string): boolean {
  element.focus();

  // Get the native setter that React hasn't intercepted
  const descriptor =
    element instanceof HTMLTextAreaElement
      ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")
      : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

  const nativeSetter = descriptor?.set;
  if (!nativeSetter) return false;

  // Set value using the native setter
  nativeSetter.call(element, value);
  simulateInputEvents(element);

  // Verify the value stuck
  if (element.value === value) return true;

  // Fallback: use execCommand (deprecated but works in Chrome for React)
  element.focus();
  element.select();
  document.execCommand("insertText", false, value);
  simulateInputEvents(element);

  return element.value === value;
}

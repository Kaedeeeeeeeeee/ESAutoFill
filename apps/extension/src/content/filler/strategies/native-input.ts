import { simulateInputEvents } from "../event-simulator";

/** Fill a standard <input> or <textarea> element */
export function fillNativeInput(element: HTMLInputElement | HTMLTextAreaElement, value: string): boolean {
  element.focus();
  element.value = value;
  simulateInputEvents(element);
  return element.value === value;
}

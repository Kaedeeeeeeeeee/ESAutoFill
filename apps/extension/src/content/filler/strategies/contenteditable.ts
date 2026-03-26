import { simulateInputEvents } from "../event-simulator";

/** Fill a contentEditable element */
export function fillContentEditable(element: HTMLElement, value: string): boolean {
  element.focus();
  element.textContent = value;
  simulateInputEvents(element);
  return (element.textContent ?? "") === value;
}

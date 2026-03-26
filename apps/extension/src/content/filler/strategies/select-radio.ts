import { simulateInputEvents } from "../event-simulator";

/** Fill a <select> element by matching option text */
export function fillSelect(element: HTMLSelectElement, value: string): boolean {
  const options = Array.from(element.options);
  const match = options.find(
    (opt) =>
      opt.text.trim() === value.trim() ||
      opt.value === value
  );

  if (!match) return false;

  element.value = match.value;
  simulateInputEvents(element);
  return true;
}

/** Check a radio button or checkbox */
export function fillCheckable(element: HTMLInputElement, checked: boolean): boolean {
  element.checked = checked;
  simulateInputEvents(element);
  return element.checked === checked;
}

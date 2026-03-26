import { fillNativeInput } from "./strategies/native-input";
import { fillReactInput } from "./strategies/react-input";
import { fillContentEditable } from "./strategies/contenteditable";
import { fillSelect } from "./strategies/select-radio";
import type { FillInstruction } from "@es-autofill/shared";

/** Execute fill instructions on the page */
export async function executeFill(instructions: FillInstruction[]): Promise<{
  filled: number;
  failed: string[];
}> {
  const failed: string[] = [];
  let filled = 0;

  for (const instruction of instructions) {
    const element = document.querySelector<HTMLElement>(instruction.selector);
    if (!element) {
      failed.push(`Element not found: ${instruction.selector}`);
      continue;
    }

    const success = fillElement(element, instruction.content);
    if (success) {
      filled++;
    } else {
      failed.push(`Failed to fill: ${instruction.selector}`);
    }

    // Small delay between fields to avoid triggering anti-bot detection
    await sleep(50);
  }

  return { filled, failed };
}

/** Fill a single element using the appropriate strategy */
function fillElement(element: HTMLElement, value: string): boolean {
  // Select element
  if (element instanceof HTMLSelectElement) {
    return fillSelect(element, value);
  }

  // ContentEditable
  if (element.contentEditable === "true") {
    return fillContentEditable(element, value);
  }

  // Input or Textarea
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    // Try native first
    const nativeSuccess = fillNativeInput(element, value);
    if (nativeSuccess) return true;

    // If native didn't stick (React controlled), try React hack
    return fillReactInput(element, value);
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

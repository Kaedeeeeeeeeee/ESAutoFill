import type { FieldContext } from "@es-autofill/shared";

/**
 * Attempt to scan form fields inside same-origin iframes.
 * Cross-origin iframes are handled by the content script running in all_frames mode.
 */
export function scanIframeFields(
  extractFn: (el: HTMLElement, index: number) => FieldContext,
  startIndex: number
): FieldContext[] {
  const fields: FieldContext[] = [];
  const iframes = document.querySelectorAll("iframe");

  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument;
      if (!doc) continue;

      const elements = doc.querySelectorAll<HTMLElement>(
        'textarea, input[type="text"], input:not([type]), [contenteditable="true"], select'
      );

      elements.forEach((el, i) => {
        fields.push(extractFn(el, startIndex + fields.length + i));
      });
    } catch {
      // Cross-origin iframe — handled by content script in all_frames mode
    }
  }

  return fields;
}

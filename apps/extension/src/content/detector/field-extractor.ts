import type { FieldContext } from "@es-autofill/shared";

/** Extract context information around a form field */
export function extractFieldContext(
  element: HTMLElement,
  index: number
): FieldContext {
  const label = getLabel(element);
  const surroundingText = getSurroundingText(element);
  const charLimit = getCharLimit(element, surroundingText);
  const inputType = getInputType(element);
  const selector = generateSelector(element);
  const currentValue = getCurrentValue(element);
  const options = getSelectOptions(element);

  return {
    selector,
    index,
    label,
    surroundingText,
    charLimit,
    inputType,
    currentValue,
    ...(options ? { options } : {}),
  };
}

/** Get the label text for an element */
function getLabel(el: HTMLElement): string {
  // 1. Explicit <label for="...">
  const id = el.id;
  if (id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.textContent?.trim() ?? "";
  }

  // 2. aria-label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  // 3. aria-labelledby
  const ariaLabelledBy = el.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const labelEl = document.getElementById(ariaLabelledBy);
    if (labelEl) return labelEl.textContent?.trim() ?? "";
  }

  // 4. Placeholder
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.placeholder) return el.placeholder;
  }

  // 5. Parent <label>
  const parentLabel = el.closest("label");
  if (parentLabel) {
    const text = getDirectTextContent(parentLabel);
    if (text) return text;
  }

  return "";
}

/** Get text from surrounding parent elements (walk up 3 levels) */
function getSurroundingText(el: HTMLElement): string {
  const texts: string[] = [];
  let node: HTMLElement | null = el;

  for (let i = 0; i < 3; i++) {
    node = node.parentElement;
    if (!node) break;

    // Collect text from direct children (not from nested inputs)
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) texts.push(text);
      } else if (child instanceof HTMLElement) {
        const tag = child.tagName.toLowerCase();
        if (["span", "p", "label", "div", "h1", "h2", "h3", "h4", "h5", "h6", "th", "td"].includes(tag)) {
          // Only get text if this element doesn't contain inputs
          if (!child.querySelector("textarea, input, select, [contenteditable]")) {
            const text = child.textContent?.trim();
            if (text) texts.push(text);
          }
        }
      }
    }
  }

  // Also check previous sibling
  const prevSibling = el.previousElementSibling;
  if (prevSibling) {
    const text = prevSibling.textContent?.trim();
    if (text && text.length < 200) texts.push(text);
  }

  return [...new Set(texts)].join(" ").slice(0, 500);
}

/** Detect character limit from element attributes or surrounding text */
function getCharLimit(el: HTMLElement, surroundingText: string): number | null {
  // 1. maxlength attribute
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.maxLength > 0 && el.maxLength < 100000) {
      return el.maxLength;
    }
  }

  // 2. Pattern in surrounding text: "400字以内", "400文字", "(400)", "最大400字"
  const patterns = [
    /(\d+)\s*字以内/,
    /(\d+)\s*文字以内/,
    /(\d+)\s*文字/,
    /最大\s*(\d+)\s*字/,
    /(\d+)\s*字まで/,
    /(\d+)\s*characters?/i,
  ];

  for (const pattern of patterns) {
    const match = surroundingText.match(pattern);
    if (match) {
      const limit = parseInt(match[1], 10);
      if (limit > 0 && limit < 10000) return limit;
    }
  }

  return null;
}

/** Determine the input type */
function getInputType(el: HTMLElement): FieldContext["inputType"] {
  if (el instanceof HTMLTextAreaElement) return "textarea";
  if (el instanceof HTMLSelectElement) return "select";
  if (el.contentEditable === "true") return "contenteditable";
  if (el instanceof HTMLInputElement) {
    if (el.type === "radio") return "radio";
    if (el.type === "checkbox") return "checkbox";
  }
  return "input";
}

/** Generate a unique CSS selector for the element */
function generateSelector(el: HTMLElement): string {
  // Try ID first
  if (el.id) return `#${CSS.escape(el.id)}`;

  // Try name attribute
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    if (el.name) {
      const selector = `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
      if (document.querySelectorAll(selector).length === 1) return selector;
    }
  }

  // Fallback: build a path-based selector
  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      parts.unshift(selector);
      break;
    }
    const parentEl: HTMLElement | null = current.parentElement;
    if (parentEl) {
      const currentTag = current.tagName;
      const siblings = Array.from(parentEl.children).filter(
        (c: Element) => c.tagName === currentTag
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(selector);
    current = parentEl;
  }

  return parts.join(" > ");
}

/** Get current value of an element */
function getCurrentValue(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  if (el instanceof HTMLSelectElement) {
    return el.options[el.selectedIndex]?.text ?? "";
  }
  if (el.contentEditable === "true") {
    return el.textContent ?? "";
  }
  return "";
}

/** Extract options from a select element or radio button group */
function getSelectOptions(
  el: HTMLElement
): Array<{ value: string; text: string }> | undefined {
  // Select element
  if (el instanceof HTMLSelectElement) {
    return Array.from(el.options)
      .filter((opt) => opt.value !== "")
      .map((opt) => ({ value: opt.value, text: opt.text.trim() }));
  }

  // Radio button group — find all radios with same name
  if (el instanceof HTMLInputElement && el.type === "radio" && el.name) {
    const radios = document.querySelectorAll<HTMLInputElement>(
      `input[type="radio"][name="${CSS.escape(el.name)}"]`
    );
    return Array.from(radios).map((r) => {
      // Get label text for this radio
      const label = r.labels?.[0]?.textContent?.trim()
        || r.parentElement?.textContent?.trim()
        || r.value;
      return { value: r.value, text: label };
    });
  }

  return undefined;
}

/** Get direct text content (not from child elements) */
function getDirectTextContent(el: HTMLElement): string {
  return Array.from(el.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent?.trim())
    .filter(Boolean)
    .join(" ");
}

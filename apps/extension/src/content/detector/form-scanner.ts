/** Scan the page for all fillable form elements */
export function scanFormFields(): HTMLElement[] {
  const selectors = [
    "textarea",
    'input[type="text"]',
    'input[type="email"]',
    'input[type="tel"]',
    'input[type="number"]',
    'input:not([type])', // Default type is text
    '[contenteditable="true"]',
    "select",
  ];

  const elements = document.querySelectorAll<HTMLElement>(selectors.join(", "));

  const results = Array.from(elements).filter((el) => {
    // Skip hidden elements
    if (el.offsetParent === null && !el.closest('[role="dialog"]')) return false;

    // Skip password fields
    if (el instanceof HTMLInputElement && el.type === "password") return false;

    // Skip search inputs
    if (el instanceof HTMLInputElement && el.type === "search") return false;
    if (el.closest('form[role="search"]') || el.closest('[class*="search"]')) return false;

    // Skip tiny inputs (likely hidden or decorative)
    const rect = el.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 10) return false;

    return true;
  });

  // Also scan for radio button GROUPS (treat each name group as one field)
  const radioGroups = new Map<string, HTMLInputElement[]>();
  document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((radio) => {
    if (radio.offsetParent === null) return; // Skip hidden
    const groupName = radio.name || radio.id;
    if (!groupName) return;
    if (!radioGroups.has(groupName)) radioGroups.set(groupName, []);
    radioGroups.get(groupName)!.push(radio);
  });

  // Add the first radio of each group as the representative element
  for (const [, radios] of radioGroups) {
    if (radios.length > 0) {
      results.push(radios[0]);
    }
  }

  return results;
}

/** Scan the page for all fillable form elements */
export function scanFormFields(): HTMLElement[] {
  const selectors = [
    "textarea",
    'input[type="text"]',
    'input[type="email"]',
    'input[type="tel"]',
    'input:not([type])', // Default type is text
    '[contenteditable="true"]',
    "select",
  ];

  const elements = document.querySelectorAll<HTMLElement>(selectors.join(", "));

  return Array.from(elements).filter((el) => {
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
}

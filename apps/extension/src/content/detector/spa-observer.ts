/** Observe SPA navigation and dynamic form rendering */
export function createSpaObserver(onFormChange: () => void): MutationObserver {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onFormChange, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also listen for SPA navigation events
  window.addEventListener("popstate", onFormChange);
  window.addEventListener("hashchange", onFormChange);

  return observer;
}

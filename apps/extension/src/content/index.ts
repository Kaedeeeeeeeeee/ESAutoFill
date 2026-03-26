import { scanFormFields } from "./detector/form-scanner";
import { extractFieldContext } from "./detector/field-extractor";
import { executeFill } from "./filler/dom-filler";
import { injectFloatingButton } from "./ui/floating-button";
import { highlightFields, clearHighlights } from "./ui/field-highlight";
import type { FieldContext, FillInstruction } from "@es-autofill/shared";

/** Content script entry point */
let detectedFields: FieldContext[] = [];

// Inject floating button when page has form fields
function init() {
  const formElements = scanFormFields();
  if (formElements.length > 0) {
    injectFloatingButton(handleAutoFillClick);
  }
}

/** Handle floating button click — open side panel and send fields */
async function handleAutoFillClick() {
  // Scan fields
  const elements = scanFormFields();
  detectedFields = elements.map((el, i) => extractFieldContext(el, i));

  if (detectedFields.length === 0) return;

  // Highlight detected fields
  highlightFields(detectedFields.map((f) => f.selector));

  // Open side panel
  chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL", payload: null });

  // Small delay to let side panel open, then send fields
  setTimeout(() => {
    chrome.runtime.sendMessage({
      type: "FIELDS_DETECTED",
      payload: {
        url: window.location.href,
        title: document.title,
        fields: detectedFields,
      },
    });
  }, 500);
}

/** Listen for messages from background / side panel */
chrome.runtime.onMessage.addListener(
  (message: { type: string; payload: unknown }, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((err) => {
        console.error("[ES AutoFill]", err);
        sendResponse({ error: err instanceof Error ? err.message : "Error" });
      });
    return true;
  }
);

async function handleMessage(message: { type: string; payload: unknown }): Promise<unknown> {
  switch (message.type) {
    case "SCAN_PAGE": {
      const elements = scanFormFields();
      detectedFields = elements.map((el, i) => extractFieldContext(el, i));
      highlightFields(detectedFields.map((f) => f.selector));

      // Send fields to side panel via background
      chrome.runtime.sendMessage({
        type: "FIELDS_DETECTED",
        payload: {
          url: window.location.href,
          title: document.title,
          fields: detectedFields,
        },
      });

      return { fieldCount: detectedFields.length };
    }

    case "EXECUTE_FILL": {
      const instructions = message.payload as FillInstruction[];
      clearHighlights();
      const result = await executeFill(instructions);
      console.log(`[ES AutoFill] Filled ${result.filled}, failed ${result.failed.length}`);
      return result;
    }

    default:
      return {};
  }
}

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

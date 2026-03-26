import { scanFormFields } from "./detector/form-scanner";
import { extractFieldContext } from "./detector/field-extractor";
import { executeFill } from "./filler/dom-filler";
import { injectFloatingButton } from "./ui/floating-button";
import { highlightFields, clearHighlights } from "./ui/field-highlight";
import {
  showPreviewOverlay,
  showLoadingOverlay,
  removePreviewOverlay,
} from "./ui/preview-overlay";
import type { FieldContext, FillInstruction, FillPreviewItem } from "@es-autofill/shared";

const API_BASE = "http://localhost:3000";
const SUPABASE_URL = "https://rudqwrfkcldxoxgnuleq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZHF3cmZrY2xkeG94Z251bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODA1MzUsImV4cCI6MjA5MDA1NjUzNX0.BRqqjRykoZOhXNrXTH9TKk1ZCRUMAubCUfoxBto3Tvs";

let detectedFields: FieldContext[] = [];
let authToken: string | null = null;

// Initialize: inject button if form fields found
function init() {
  const formElements = scanFormFields();
  if (formElements.length > 0) {
    injectFloatingButton(handleAutoFillClick);
  }
  // Auto-login (DEV ONLY)
  ensureAuth();
}

/** Ensure we have an auth token (DEV: auto-login with test account) */
async function ensureAuth(): Promise<void> {
  if (authToken) return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "testpassword123",
        }),
      }
    );
    const data = await res.json();
    if (data.access_token) {
      authToken = data.access_token;
      console.log("[ES AutoFill] Auth ready");
    }
  } catch (e) {
    console.error("[ES AutoFill] Auth failed:", e);
  }
}

/** Direct API call from content script */
async function apiCall<T>(path: string, body: unknown): Promise<T> {
  await ensureAuth();
  if (!authToken) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `API error: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

/** Handle floating button click — run full pipeline directly */
async function handleAutoFillClick() {
  showLoadingOverlay();

  try {
    // 1. Scan fields
    const elements = scanFormFields();
    detectedFields = elements.map((el, i) => extractFieldContext(el, i));

    if (detectedFields.length === 0) {
      removePreviewOverlay();
      return;
    }

    highlightFields(detectedFields.map((f) => f.selector));
    console.log(`[ES AutoFill] Detected ${detectedFields.length} fields`);

    // 2. Classify fields via API
    console.log("[ES AutoFill] Classifying fields...");
    const classifyResult = await apiCall<{
      classifications: Array<{
        index: number;
        category: string;
        confidence: number;
        char_limit: number | null;
        selector: string;
      }>;
    }>("/api/form/classify", { fields: detectedFields });

    const esFields = classifyResult.classifications.filter(
      (c) => c.category !== "non_es"
    );
    console.log(
      `[ES AutoFill] Classified: ${esFields.length} ES fields, ${
        classifyResult.classifications.length - esFields.length
      } skipped`
    );

    if (esFields.length === 0) {
      removePreviewOverlay();
      alert("ESフィールドが検出されませんでした");
      return;
    }

    // 3. Generate content via API
    console.log("[ES AutoFill] Generating content...");
    const generateResult = await apiCall<{
      fills: Array<{
        index: number;
        category: string;
        content: string;
        char_count: number;
        source_experience_id?: string;
        selector: string;
        charCount: number;
        source: string;
      }>;
    }>("/api/form/generate", {
      classifications: classifyResult.classifications,
      profileId: "",
    });

    console.log(`[ES AutoFill] Generated ${generateResult.fills.length} fills`);

    // 4. Build preview items
    const previews: FillPreviewItem[] = generateResult.fills.map((fill) => {
      const field = detectedFields.find((f) => f.index === fill.index);
      return {
        index: fill.index,
        category: fill.category as FillPreviewItem["category"],
        content: fill.content,
        charCount: [...fill.content].length,
        selector: fill.selector || field?.selector || "",
        source: "generated" as const,
        fieldLabel:
          field?.label ||
          field?.surroundingText?.slice(0, 50) ||
          `フィールド ${fill.index + 1}`,
        charLimit: field?.charLimit ?? null,
        edited: false,
      };
    });

    // 5. Show preview overlay
    showPreviewOverlay(previews, {
      onFillAll: async (items) => {
        clearHighlights();
        const result = await executeFill(items);
        console.log(
          `[ES AutoFill] Filled ${result.filled} fields, ${result.failed.length} failed`
        );
        setTimeout(() => removePreviewOverlay(), 2000);
      },
      onClose: () => {
        removePreviewOverlay();
        clearHighlights();
      },
    });
  } catch (err) {
    console.error("[ES AutoFill] Pipeline error:", err);
    removePreviewOverlay();
    clearHighlights();
  }
}

// Listen for messages (for side panel / background communication)
chrome.runtime.onMessage.addListener(
  (message: { type: string; payload: unknown }, _sender, sendResponse) => {
    if (message.type === "EXECUTE_FILL") {
      const instructions = message.payload as FillInstruction[];
      clearHighlights();
      removePreviewOverlay();
      executeFill(instructions).then(sendResponse);
      return true;
    }
    sendResponse({});
    return false;
  }
);

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

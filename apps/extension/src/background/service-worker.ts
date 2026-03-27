import { getAuthToken, setAuthToken, clearAuthToken, getApiBaseUrl } from "@/shared/storage";
import type { Message } from "@/shared/messages";
import type { FieldContext, FieldClassification, FillInstruction } from "@es-autofill/shared";

/**
 * Background service worker:
 * - Manages auth tokens
 * - Relays API calls between content script / side panel and backend
 * - Orchestrates the full detect → classify → generate pipeline
 */

// Store for current form state (shared between content script and side panel)
let currentFormState: {
  tabId: number;
  url: string;
  title: string;
  fields: FieldContext[];
  classifications?: FieldClassification[];
  fills?: FillInstruction[];
} | null = null;

// Listen for messages
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true; // Keep channel open for async
  }
);

async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    // === Auth ===
    case "AUTH_TOKEN_SET":
      await setAuthToken(message.payload as string);
      return { success: true };

    case "AUTH_TOKEN_GET":
      return { token: await getAuthToken() };

    // === Side panel ===
    case "OPEN_SIDEPANEL": {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.sidePanel.setOptions({
          tabId: tab.id,
          path: "sidepanel.html",
          enabled: true,
        });
        await chrome.sidePanel.open({ tabId: tab.id });
      }
      return { success: true };
    }

    // === Form detection flow ===
    case "FIELDS_DETECTED": {
      const payload = message.payload as {
        url: string;
        title: string;
        fields: FieldContext[];
        autoFill?: boolean;
      };

      const tabId = sender.tab?.id;
      if (!tabId) return { error: "No tab ID" };

      currentFormState = {
        tabId,
        url: payload.url,
        title: payload.title,
        fields: payload.fields,
      };

      // If autoFill flag is set, run the full classify → generate pipeline
      if (payload.autoFill) {
        runPipeline().catch((err) => {
          console.error("[ES AutoFill] Pipeline error:", err);
          broadcastToExtension({
            type: "GENERATE_RESULT",
            payload: [],
          });
        });
      }

      return { success: true, fieldCount: payload.fields.length };
    }

    // === Classify request (from side panel) ===
    case "CLASSIFY_REQUEST": {
      if (!currentFormState) {
        return { error: "No form state. Scan a page first." };
      }

      const classifications = await apiCall<{ classifications: FieldClassification[] }>(
        "/api/form/classify",
        "POST",
        { fields: currentFormState.fields }
      );

      currentFormState.classifications = classifications.classifications;

      broadcastToExtension({
        type: "CLASSIFY_RESULT",
        payload: classifications,
      });

      return classifications;
    }

    // === Generate request (from side panel) ===
    case "GENERATE_REQUEST": {
      if (!currentFormState?.classifications) {
        return { error: "No classifications. Classify fields first." };
      }

      const { profileId, companyId } = (message.payload ?? {}) as {
        profileId?: string;
        companyId?: string;
      };

      const result = await apiCall<{ fills: FillInstruction[] }>(
        "/api/form/generate",
        "POST",
        {
          classifications: currentFormState.classifications,
          profileId: profileId ?? "",
          companyId,
        }
      );

      currentFormState.fills = result.fills;

      // Build preview items with field labels
      const previews = result.fills.map((fill) => {
        const field = currentFormState!.fields.find((f) => f.index === fill.index);
        return {
          ...fill,
          fieldLabel: field?.label || field?.surroundingText?.slice(0, 50) || `フィールド ${fill.index + 1}`,
          charLimit: field?.charLimit ?? null,
          edited: false,
        };
      });

      broadcastToExtension({
        type: "GENERATE_RESULT",
        payload: previews,
      });

      return { fills: previews };
    }

    // === Full pipeline: scan → classify → generate (triggered from side panel) ===
    case "SCAN_AND_FILL": {
      const { profileId, companyId } = (message.payload ?? {}) as {
        profileId?: string;
        companyId?: string;
      };

      // 1. Tell content script to scan
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { error: "No active tab" };

      broadcastToExtension({ type: "SCAN_STARTED", payload: null });

      const scanResult = await chrome.tabs.sendMessage(tab.id, {
        type: "SCAN_PAGE",
        payload: null,
      }) as { fieldCount: number };

      if (!currentFormState || currentFormState.fields.length === 0) {
        return { error: "No form fields detected on this page." };
      }

      // 2. Classify
      broadcastToExtension({ type: "CLASSIFY_STARTED", payload: null });

      const classifications = await apiCall<{ classifications: FieldClassification[] }>(
        "/api/form/classify",
        "POST",
        { fields: currentFormState.fields }
      );
      currentFormState.classifications = classifications.classifications;

      // Filter out non_es fields
      const esFields = classifications.classifications.filter(
        (c) => c.category !== "non_es"
      );

      if (esFields.length === 0) {
        broadcastToExtension({
          type: "GENERATE_RESULT",
          payload: [],
        });
        return { fills: [], message: "No ES fields detected." };
      }

      // 3. Generate
      broadcastToExtension({ type: "GENERATE_STARTED", payload: null });

      const result = await apiCall<{ fills: FillInstruction[] }>(
        "/api/form/generate",
        "POST",
        {
          classifications: classifications.classifications,
          profileId: profileId ?? "",
          companyId,
        }
      );

      currentFormState.fills = result.fills;

      // Build preview items
      const previews = result.fills.map((fill) => {
        const field = currentFormState!.fields.find((f) => f.index === fill.index);
        return {
          ...fill,
          fieldLabel: field?.label || field?.surroundingText?.slice(0, 50) || `フィールド ${fill.index + 1}`,
          charLimit: field?.charLimit ?? null,
          edited: false,
        };
      });

      broadcastToExtension({
        type: "GENERATE_RESULT",
        payload: previews,
      });

      return { fills: previews };
    }

    // === Execute fill (from side panel, relay to content script) ===
    case "EXECUTE_FILL": {
      if (!currentFormState?.tabId) {
        return { error: "No active form state" };
      }

      const instructions = message.payload as FillInstruction[];
      const result = await chrome.tabs.sendMessage(currentFormState.tabId, {
        type: "EXECUTE_FILL",
        payload: instructions,
      });

      return result;
    }

    // === Fill complete (from content script) ===
    case "FILL_COMPLETE": {
      broadcastToExtension({
        type: "FILL_COMPLETE",
        payload: message.payload,
      });
      return { success: true };
    }

    // === Save submission history ===
    case "SAVE_SUBMISSION": {
      const submissionData = message.payload as {
        companyId?: string;
        pageUrl: string;
        pageTitle?: string;
        fieldsSnapshot: unknown[];
      };

      const result = await apiCall("/api/history", "POST", submissionData);
      return result;
    }

    // === Profile ===
    case "GET_PROFILE": {
      return await apiCall("/api/profile", "GET");
    }

    // === Get current form state (for side panel init) ===
    case "GET_FORM_STATE": {
      return currentFormState
        ? {
            url: currentFormState.url,
            title: currentFormState.title,
            fieldCount: currentFormState.fields.length,
            hasClassifications: !!currentFormState.classifications,
            hasFills: !!currentFormState.fills,
          }
        : null;
    }

    default:
      return { error: `Unknown message type: ${message.type}` };
  }
}

// === API helper ===
async function apiCall<T>(
  path: string,
  method: string,
  body?: unknown
): Promise<T> {
  const [baseUrl, token] = await Promise.all([getApiBaseUrl(), getAuthToken()]);
  if (!token) throw new Error("Not authenticated. Please log in.");

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string; message?: string }).error ||
        (err as { message?: string }).message ||
        `API error: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

// === Auto pipeline: classify → generate → broadcast results ===
async function runPipeline(): Promise<void> {
  if (!currentFormState) throw new Error("No form state");

  // 1. Classify
  const classifyResult = await apiCall<{ classifications: FieldClassification[] }>(
    "/api/form/classify",
    "POST",
    { fields: currentFormState.fields }
  );
  currentFormState.classifications = classifyResult.classifications;

  const esFields = classifyResult.classifications.filter(
    (c) => c.category !== "non_es"
  );

  if (esFields.length === 0) {
    broadcastToExtension({ type: "GENERATE_RESULT", payload: [] });
    return;
  }

  // 2. Generate
  const generateResult = await apiCall<{ fills: FillInstruction[] }>(
    "/api/form/generate",
    "POST",
    {
      classifications: classifyResult.classifications,
      profileId: "",
    }
  );

  currentFormState.fills = generateResult.fills;

  // 3. Build preview items and broadcast
  const previews = generateResult.fills.map((fill) => {
    const field = currentFormState!.fields.find((f) => f.index === fill.index);
    return {
      ...fill,
      fieldLabel:
        field?.label || field?.surroundingText?.slice(0, 50) || `フィールド ${fill.index + 1}`,
      charLimit: field?.charLimit ?? null,
      edited: false,
    };
  });

  broadcastToExtension({ type: "GENERATE_RESULT", payload: previews });
}

// === Broadcast to all contexts (side panel, popup, AND content script) ===
function broadcastToExtension(message: Message): void {
  // Send to extension pages (side panel, popup)
  chrome.runtime.sendMessage(message).catch(() => {});

  // Also send to the active tab's content script
  if (currentFormState?.tabId) {
    chrome.tabs.sendMessage(currentFormState.tabId, message).catch(() => {});
  }
}

// Handle extension icon click — open side panel only for this tab
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    // Enable side panel only for this specific tab
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: "sidepanel.html",
      enabled: true,
    });
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// By default, disable side panel for all tabs (only enable per-tab)
chrome.sidePanel.setOptions({ enabled: false });

// Auto-login with test account on install (DEV ONLY - remove in production)
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const response = await fetch(
      "https://rudqwrfkcldxoxgnuleq.supabase.co/auth/v1/token?grant_type=password",
      {
        method: "POST",
        headers: {
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZHF3cmZrY2xkeG94Z251bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODA1MzUsImV4cCI6MjA5MDA1NjUzNX0.BRqqjRykoZOhXNrXTH9TKk1ZCRUMAubCUfoxBto3Tvs",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "testpassword123",
        }),
      }
    );
    const data = await response.json();
    if (data.access_token) {
      await setAuthToken(data.access_token);
      console.log("[ES AutoFill] Dev auto-login successful");
    }
  } catch (e) {
    console.error("[ES AutoFill] Dev auto-login failed:", e);
  }
});

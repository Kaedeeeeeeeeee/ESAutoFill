/** Message types for communication between content script, background SW, and side panel */

export type MessageType =
  | "SCAN_PAGE"
  | "SCAN_AND_FILL"
  | "SCAN_STARTED"
  | "FIELDS_DETECTED"
  | "CLASSIFY_REQUEST"
  | "CLASSIFY_STARTED"
  | "CLASSIFY_RESULT"
  | "GENERATE_REQUEST"
  | "GENERATE_STARTED"
  | "GENERATE_RESULT"
  | "FILL_CONFIRMED"
  | "EXECUTE_FILL"
  | "FILL_COMPLETE"
  | "OPEN_SIDEPANEL"
  | "AUTH_TOKEN_SET"
  | "AUTH_TOKEN_GET"
  | "GET_PROFILE"
  | "GET_FORM_STATE"
  | "SAVE_SUBMISSION";

export interface Message<T = unknown> {
  type: MessageType;
  payload: T;
}

/** Send message to background service worker */
export function sendToBackground<T>(type: MessageType, payload: T): Promise<unknown> {
  return chrome.runtime.sendMessage({ type, payload });
}

/** Send message to content script in active tab */
export async function sendToContentScript<T>(
  type: MessageType,
  payload: T,
  tabId?: number
): Promise<unknown> {
  const targetTabId = tabId ?? (await getActiveTabId());
  if (!targetTabId) throw new Error("No active tab");
  return chrome.tabs.sendMessage(targetTabId, { type, payload });
}

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

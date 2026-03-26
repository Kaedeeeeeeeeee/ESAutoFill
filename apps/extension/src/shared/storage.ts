/** Chrome storage helpers */

/** Get auth token from session storage */
export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.session.get("auth_token");
  return result.auth_token ?? null;
}

/** Set auth token in session storage */
export async function setAuthToken(token: string): Promise<void> {
  await chrome.storage.session.set({ auth_token: token });
}

/** Clear auth token */
export async function clearAuthToken(): Promise<void> {
  await chrome.storage.session.remove("auth_token");
}

/** Get/set the backend API base URL */
export async function getApiBaseUrl(): Promise<string> {
  const result = await chrome.storage.local.get("api_base_url");
  return result.api_base_url ?? "http://localhost:3000";
}

export async function setApiBaseUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ api_base_url: url });
}

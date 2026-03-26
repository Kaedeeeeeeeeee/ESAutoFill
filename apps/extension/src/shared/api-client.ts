import { getAuthToken, getApiBaseUrl } from "./storage";

/** Authenticated API client for extension → backend communication */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const [baseUrl, token] = await Promise.all([
    getApiBaseUrl(),
    getAuthToken(),
  ]);

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || error.error || `API error: ${response.status}`);
  }

  return response.json();
}

/** Profile APIs */
export const profileApi = {
  get: () => apiFetch<{ profile: unknown; experiences: unknown[] }>("/api/profile"),

  update: (data: Record<string, unknown>) =>
    apiFetch("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadFile: async (file: File) => {
    const [baseUrl, token] = await Promise.all([
      getApiBaseUrl(),
      getAuthToken(),
    ]);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${baseUrl}/api/profile/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) throw new Error("Upload failed");
    return response.json();
  },

  generateVariants: (experienceId: string, targetCharCounts: number[]) =>
    apiFetch("/api/profile/variants", {
      method: "POST",
      body: JSON.stringify({ experienceId, targetCharCounts }),
    }),
};

/** Form APIs */
export const formApi = {
  classify: (fields: unknown[]) =>
    apiFetch("/api/form/classify", {
      method: "POST",
      body: JSON.stringify({ fields }),
    }),

  generate: (classifications: unknown[], profileId: string, companyId?: string) =>
    apiFetch("/api/form/generate", {
      method: "POST",
      body: JSON.stringify({ classifications, profileId, companyId }),
    }),
};

/** Company APIs */
export const companyApi = {
  list: () => apiFetch<{ companies: unknown[] }>("/api/company"),

  create: (data: Record<string, unknown>) =>
    apiFetch("/api/company", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (data: Record<string, unknown>) =>
    apiFetch("/api/company", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => apiFetch(`/api/company?id=${id}`, { method: "DELETE" }),

  research: (companyId: string) =>
    apiFetch("/api/company/research", {
      method: "POST",
      body: JSON.stringify({ companyId }),
    }),

  generateShiboudouki: (companyId: string, keywords: string[], charLimit?: number) =>
    apiFetch("/api/company/shiboudouki", {
      method: "POST",
      body: JSON.stringify({ companyId, keywords, charLimit }),
    }),
};

/** History APIs */
export const historyApi = {
  list: (companyId?: string) =>
    apiFetch(`/api/history${companyId ? `?companyId=${companyId}` : ""}`),

  save: (data: {
    companyId?: string;
    pageUrl: string;
    pageTitle?: string;
    fieldsSnapshot: unknown[];
  }) =>
    apiFetch("/api/history", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

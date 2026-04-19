import type { DayWorklog, DashboardData, SearchResult, AppConfig, SetupStatus, PendingTask } from "../types";

const BASE = "/api";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("worklog-token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: getAuthHeaders(),
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem("worklog-token");
    localStorage.removeItem("worklog-username");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getDashboard(): Promise<DashboardData> {
    return fetchJSON("/dashboard");
  },

  getEntries(date: string): Promise<DayWorklog> {
    return fetchJSON(`/entries/${date}`);
  },

  updateEntries(date: string, worklog: DayWorklog): Promise<DayWorklog> {
    return fetchJSON(`/entries/${date}`, {
      method: "PUT",
      body: JSON.stringify(worklog),
    });
  },

  async submitEntry(text: string, screenshots: File[], date?: string, highlight?: boolean): Promise<{ date: string; entry: unknown }> {
    const form = new FormData();
    if (text) form.append("text", text);
    if (date) form.append("date", date);
    if (highlight) form.append("highlight", "true");
    for (const file of screenshots) form.append("screenshots", file);
    const token = localStorage.getItem("worklog-token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE}/entries`, { method: "POST", body: form, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Submit failed");
    }
    return res.json();
  },

  getTasks(): Promise<PendingTask[]> {
    return fetchJSON("/tasks");
  },

  toggleTask(date: string, index: number): Promise<{ success: boolean }> {
    return fetchJSON("/tasks/toggle", {
      method: "PATCH",
      body: JSON.stringify({ date, index }),
    });
  },

  search(query: string, limit = 20): Promise<SearchResult[]> {
    return fetchJSON("/search", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    });
  },

  getSettings(): Promise<AppConfig> {
    return fetchJSON("/settings");
  },

  updateSettings(settings: Partial<AppConfig>): Promise<{ success: boolean }> {
    return fetchJSON("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },

  getHealth(): Promise<SetupStatus> {
    return fetchJSON("/health");
  },

  async login(username: string, password: string): Promise<{ token: string; username: string }> {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Login failed");
    }
    return res.json();
  },

  async register(username: string, password: string): Promise<{ token: string; username: string }> {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Registration failed");
    }
    return res.json();
  },

  async authStatus(): Promise<{ hasUsers: boolean }> {
    const res = await fetch(`${BASE}/auth/status`);
    return res.json();
  },
};

import type { DayWorklog, DashboardData, SearchResult, AppConfig, SetupStatus, PendingTask } from "../types";

const BASE = "/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
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
    const res = await fetch(`${BASE}/entries`, { method: "POST", body: form });
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
};

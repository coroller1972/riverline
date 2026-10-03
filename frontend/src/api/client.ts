import type { SolveConfig, SolveJob, SolveResult } from "./types";
import { ApiError, type ValidationIssue } from "./errors";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let issues: ValidationIssue[] = [];
    try {
      const { detail } = await response.json();
      if (typeof detail === "string") message = detail;
      else if (Array.isArray(detail)) {
        issues = detail;
        message = detail
          .map((d: ValidationIssue) => `${d.loc.slice(1).join(".")}: ${d.msg}`)
          .join("\n");
      } else if (detail?.message) message = detail.message;
    } catch {
      /* A proxy/network error may not return JSON. */
    }
    throw new ApiError(message, issues);
  }
  return response.json() as Promise<T>;
}
export const api = {
  create: (config: SolveConfig) =>
    request<{ id: string; status: string }>("/solves", {
      method: "POST",
      body: JSON.stringify(config),
    }),
  job: (id: string) => request<SolveJob>(`/solves/${id}`),
  list: () => request<SolveJob[]>("/solves"),
  results: (id: string) => request<SolveResult>(`/solves/${id}/results`),
  cancel: (id: string) =>
    request<SolveJob>(`/solves/${id}`, { method: "DELETE" }),
};
export const active = (status?: string) =>
  status === "queued" || status === "running";

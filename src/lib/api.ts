"use client";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "حدث خطأ ما");
  }
  return data as T;
}

export const apiGet = <T,>(url: string) => request<T>(url);
export const apiPost = <T,>(url: string, body?: unknown) =>
  request<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) });
export const apiPatch = <T,>(url: string, body?: unknown) =>
  request<T>(url, { method: "PATCH", body: JSON.stringify(body ?? {}) });
export const apiDel = <T,>(url: string, body?: unknown) =>
  request<T>(url, { method: "DELETE", body: JSON.stringify(body ?? {}) });

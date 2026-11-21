/**
 * Unified API Client for OmniClip
 * Ensures calls always respect NEXT_PUBLIC_API_URL (supporting tunnels and HTTPS)
 * and normalizes error payloads to { error: string, details?: string }.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function getApiUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // In the browser (mobile or desktop), always use relative paths to guarantee same-origin requests
  if (typeof window !== "undefined") {
    return clean;
  }

  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return `${base}${clean}`;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
  code?: string;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: ApiErrorResponse | null }> {
  const url = getApiUrl(endpoint);
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        data: null,
        error: {
          error: json?.error || `Request failed with status ${res.status}`,
          details: json?.details || res.statusText,
        },
      };
    }

    if (json && typeof json === "object" && json.success === false && json.error) {
      return {
        data: json as T,
        error: {
          error: json.error,
          details: json.details,
        },
      };
    }

    return { data: json as T, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: {
        error: "Network connection error",
        details: err?.message || String(err),
      },
    };
  }
}

const STORAGE_KEY = "yoloApiBaseUrl";

export function setApiBaseUrl(url) {
  localStorage.setItem(STORAGE_KEY, url);
}

export function getApiBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    localStorage.getItem(STORAGE_KEY) ||
    "http://localhost:8080"
  );
}

function buildUrl(path) {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = data?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
}


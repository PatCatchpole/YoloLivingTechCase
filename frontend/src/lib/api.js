const STORAGE_KEY = "yoloApiBaseUrl";

let tokenGetter = () => null;

/**
 * Registado pelo `AuthProvider` após login / restauração de sessão.
 * Não dá para usar `useAuth()` aqui — este módulo vive fora da árvore React.
 */
export function setTokenGetter(fn) {
  tokenGetter = typeof fn === "function" ? fn : () => null;
}

export function setApiBaseUrl(url) {
  localStorage.setItem(STORAGE_KEY, url);
}

export function getApiBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL || localStorage.getItem(STORAGE_KEY) || "http://localhost:8080"
  ).replace(/\/+$/, "");
}

/**
 * Fallback: amazon-cognito-identity-js guarda tokens sob chaves
 * `CognitoIdentityServiceProvider.<ClientId>.*` (ver MDN / código da SDK).
 * Preferir accessToken (cognito:groups); senão idToken.
 */
function getCognitoTokenFromLocalStorage() {
  if (typeof localStorage === "undefined") return null;

  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  if (!clientId) return null;

  const base = `CognitoIdentityServiceProvider.${clientId}`;
  const lastUser = localStorage.getItem(`${base}.LastAuthUser`);
  if (lastUser) {
    const at = localStorage.getItem(`${base}.${lastUser}.accessToken`);
    if (at) return at;
    const it = localStorage.getItem(`${base}.${lastUser}.idToken`);
    if (it) return it;
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("CognitoIdentityServiceProvider.") && key.endsWith(".accessToken")) {
      const t = localStorage.getItem(key);
      if (t) return t;
    }
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("CognitoIdentityServiceProvider.") && key.endsWith(".idToken")) {
      const t = localStorage.getItem(key);
      if (t) return t;
    }
  }

  return null;
}

function resolveToken() {
  try {
    const fromContext = tokenGetter?.();
    if (fromContext) return fromContext;
  } catch {
    /* ignore */
  }
  return getCognitoTokenFromLocalStorage();
}

function buildUrl(path) {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch(path, options = {}) {
  const token = resolveToken();
  console.log("Token enviado:", token);

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    // HTTP API + JWT authorizer pode não repassar Authorization à Lambda; duplicar JWT para o backend decodificar.
    headers["X-Yolo-Jwt"] = token;
  }

  const res = await fetch(buildUrl(path), {
    ...options,
    headers,
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
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

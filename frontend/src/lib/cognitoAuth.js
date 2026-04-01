import { CognitoUserPool, CognitoUser, AuthenticationDetails } from "amazon-cognito-identity-js";

function getPoolConfig() {
  const UserPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
  const ClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  if (!UserPoolId || !ClientId) {
    throw new Error("Defina VITE_COGNITO_USER_POOL_ID e VITE_COGNITO_CLIENT_ID no .env");
  }
  return { UserPoolId, ClientId };
}

export function createUserPool() {
  const { UserPoolId, ClientId } = getPoolConfig();
  return new CognitoUserPool({ UserPoolId, ClientId });
}

export function signIn(username, password) {
  return new Promise((resolve, reject) => {
    const userPool = createUserPool();
    const authDetails = new AuthenticationDetails({
      Username: username.trim().toLowerCase(),
      Password: password,
    });
    const user = new CognitoUser({
      Username: username.trim().toLowerCase(),
      Pool: userPool,
    });
    user.authenticateUser(authDetails, {
      onSuccess: (result) => {
        resolve({
          idToken: result.getIdToken().getJwtToken(),
          accessToken: result.getAccessToken().getJwtToken(),
          refreshToken: result.getRefreshToken().getToken(),
        });
      },
      onFailure: (err) => reject(err),
    });
  });
}

export function signOut() {
  const userPool = createUserPool();
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}

/** Normaliza nome de grupo Cognito para comparações seguras. */
export function normalizeGroup(g) {
  return String(g ?? "")
    .trim()
    .toUpperCase();
}

function decodeJwtPayload(token) {
  const part = token.split(".")[1];
  if (!part) return null;
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  return JSON.parse(atob(padded));
}

/**
 * Lê `cognito:groups` de qualquer JWT Cognito (Access ou ID).
 * O Access Token costuma incluir grupos de forma fiável; o ID Token às vezes omite.
 */
export function parseGroupsFromToken(token) {
  if (!token) return [];
  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return [];

    const raw = payload["cognito:groups"] ?? payload.cognito_groups ?? payload.groups;
    if (raw == null || raw === "") return [];

    if (Array.isArray(raw)) {
      return raw.map((g) => normalizeGroup(g)).filter(Boolean);
    }

    if (typeof raw === "string") {
      const s = raw.trim();
      if (s.startsWith("[")) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            return parsed.map((g) => normalizeGroup(g)).filter(Boolean);
          }
          return [normalizeGroup(parsed)].filter(Boolean);
        } catch {
          /* fallthrough */
        }
      }
      return s
        .split(",")
        .map((x) => normalizeGroup(x))
        .filter(Boolean);
    }

    return [normalizeGroup(raw)].filter(Boolean);
  } catch {
    return [];
  }
}

/** @deprecated use parseGroupsFromToken — o nome antigo era enganoso (também serve para access token). */
export const parseGroupsFromIdToken = parseGroupsFromToken;

export function isOperator(groups) {
  return groups.some((g) => normalizeGroup(g) === "OPERADOR");
}

/** Painel admin inclusivo: OPERADOR ou PROPRIETARIO. */
export function canUseAdminPanel(groups) {
  return groups.some((g) => {
    const x = normalizeGroup(g);
    return x === "OPERADOR" || x === "PROPRIETARIO";
  });
}

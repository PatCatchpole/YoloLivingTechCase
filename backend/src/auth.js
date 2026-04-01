const { jsonResponse } = require("./util");

/**
 * Claims do API Gateway HTTP API com JWT Cognito (SAM: requestContext.authorizer.jwt.claims).
 * O API Gateway pode normalizar chaves/valores (ex.: tudo string); por isso o parser é tolerante.
 */
function getJwtClaims(event) {
  return event.requestContext?.authorizer?.jwt?.claims ?? {};
}

function normalizeGroup(g) {
  return String(g ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toUpperCase();
}

function coerceToGroupList(raw) {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => normalizeGroup(x)).filter(Boolean);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        return coerceToGroupList(parsed);
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
}

/**
 * Extrai grupos de um objeto de claims (API Gateway ou payload JWT decodificado).
 */
function parseGroups(claims) {
  if (!claims || typeof claims !== "object") return [];

  const keys = ["cognito:groups", "cognito_groups", "groups", "Groups"];

  for (const k of keys) {
    if (claims[k] != null && claims[k] !== "") {
      const list = coerceToGroupList(claims[k]);
      if (list.length) return list;
    }
  }

  for (const key of Object.keys(claims)) {
    if (key.toLowerCase().includes("group")) {
      const list = coerceToGroupList(claims[key]);
      if (list.length) return list;
    }
  }

  return [];
}

function groupsSet(groups) {
  return new Set(groups.map(normalizeGroup));
}

function normalizeEmail(claims) {
  if (!claims || typeof claims !== "object") return "";
  const email = (
    claims.email ||
    claims.username ||
    claims["cognito:username"] ||
    claims.cognito_username ||
    claims.preferred_username ||
    ""
  ).toString();
  return email.trim().toLowerCase();
}

function getHeaderValue(headers, nameLower) {
  if (!headers || typeof headers !== "object") return null;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === nameLower);
  const v = key ? headers[key] : null;
  return typeof v === "string" ? v : null;
}

function getMultiHeaderFirst(multiValueHeaders, nameLower) {
  if (!multiValueHeaders || typeof multiValueHeaders !== "object") return null;
  const key = Object.keys(multiValueHeaders).find((k) => k.toLowerCase() === nameLower);
  const arr = key ? multiValueHeaders[key] : null;
  return Array.isArray(arr) && arr[0] ? arr[0] : null;
}

/**
 * Extrai o JWT para decodificar grupos/email.
 * O HTTP API com JWT authorizer por vezes NÃO repassa `Authorization` à Lambda — usamos também `X-Yolo-Jwt`.
 */
function extractBearerToken(event) {
  const tryParseBearer = (raw) => {
    if (!raw || typeof raw !== "string") return null;
    const m = raw.match(/^Bearer\s+(.+)$/i);
    return m ? m[1].trim() : null;
  };

  const h = event.headers;
  const fromAuth = tryParseBearer(getHeaderValue(h, "authorization"));
  if (fromAuth) return fromAuth;

  const rawJwt = getHeaderValue(h, "x-yolo-jwt");
  if (rawJwt && typeof rawJwt === "string" && rawJwt.split(".").length === 3) {
    return rawJwt.trim();
  }

  const mv = event.multiValueHeaders;
  const fromAuthMv = tryParseBearer(getMultiHeaderFirst(mv, "authorization"));
  if (fromAuthMv) return fromAuthMv;

  const rawJwtMv = getMultiHeaderFirst(mv, "x-yolo-jwt");
  if (rawJwtMv && rawJwtMv.split(".").length === 3) {
    return rawJwtMv.trim();
  }

  return null;
}

/** Decodifica payload do JWT sem verificar assinatura (API Gateway já validou o token). */
function decodeJwtPayloadUnverified(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** OPERADOR ou PROPRIETARIO: listagem global + CRUD em /people (e import, se aplicável). */
function hasFullPeopleAccess(groups) {
  const s = groupsSet(groups);
  return s.has("OPERADOR") || s.has("PROPRIETARIO");
}

function isOperator(groups) {
  return groupsSet(groups).has("OPERADOR");
}

/**
 * Perfis que só podem ver dados próprios (GET com scope self).
 * PROPRIETARIO não entra aqui — usa o mesmo scope admin que OPERADOR.
 */
function isReadOnlyRole(groups) {
  if (hasFullPeopleAccess(groups)) return false;
  const s = groupsSet(groups);
  return s.has("HOSPEDE") || s.has("FORNECEDOR");
}

function getAuthContext(event) {
  const apiClaims = getJwtClaims(event);
  let groups = parseGroups(apiClaims);
  let email = normalizeEmail(apiClaims);

  const token = extractBearerToken(event);
  const payload = token ? decodeJwtPayloadUnverified(token) : null;
  if (payload) {
    // Sempre preferir grupos do JWT decodificado se authorizer não trouxe cognito:groups
    const fromPayload = parseGroups(payload);
    if (fromPayload.length > 0) {
      groups = fromPayload;
    } else if (groups.length === 0) {
      groups = fromPayload;
    }
    if (!email) {
      email = normalizeEmail(payload);
    }
  }

  return {
    claims: apiClaims,
    groups,
    email,
    hasDecodedSub: !!payload?.sub,
  };
}

function requireAuthenticated(event) {
  const ctx = getAuthContext(event);
  const hasApiClaims = ctx.claims && Object.keys(ctx.claims).length > 0;
  const hasTokenIdentity = !!(ctx.email || ctx.groups.length > 0 || ctx.hasDecodedSub);

  if (!hasApiClaims && !hasTokenIdentity) {
    return { ok: false, response: jsonResponse(401, { message: "Não autenticado." }) };
  }
  if (!ctx.email) {
    return { ok: false, response: jsonResponse(403, { message: "Token sem e-mail identificável." }) };
  }
  return { ok: true, ...ctx };
}

/** Escrita e operações administrativas: OPERADOR ou PROPRIETARIO (case-insensitive nos grupos). */
function requirePeopleAdmin(event) {
  const auth = requireAuthenticated(event);
  if (!auth.ok) return auth;
  if (!hasFullPeopleAccess(auth.groups)) {
    return {
      ok: false,
      response: jsonResponse(403, {
        message: "Apenas OPERADOR ou PROPRIETARIO pode executar esta ação.",
      }),
    };
  }
  return { ok: true, ...auth };
}

/** @deprecated Preferir requirePeopleAdmin; mantido como alias para compatibilidade. */
function requireOperator(event) {
  return requirePeopleAdmin(event);
}

module.exports = {
  getJwtClaims,
  parseGroups,
  normalizeGroup,
  groupsSet,
  normalizeEmail,
  hasFullPeopleAccess,
  isOperator,
  isReadOnlyRole,
  getAuthContext,
  requireAuthenticated,
  requirePeopleAdmin,
  requireOperator,
};

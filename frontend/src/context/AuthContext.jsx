import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  createUserPool,
  parseGroupsFromToken,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  isOperator,
  canUseAdminPanel,
  normalizeGroup,
} from "../lib/cognitoAuth";
// Pedidos HTTP usam `src/lib/api.js`, que não é componente React — o token é injetado via setTokenGetter (não há useAuth dentro do fetch).
import { setTokenGetter } from "../lib/api";

const AuthContext = createContext(null);

const ALLOWED_ROLES = new Set(["OPERADOR", "PROPRIETARIO", "HOSPEDE", "FORNECEDOR"]);

/** Grupos: preferir Access Token (inclui cognito:groups de forma fiável no Cognito). */
function mergeGroupsFromTokens(accessToken, idToken) {
  const fromAccess = accessToken ? parseGroupsFromToken(accessToken) : [];
  if (fromAccess.length) return fromAccess;
  return idToken ? parseGroupsFromToken(idToken) : [];
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [groups, setGroups] = useState([]);

  const refreshTokenGetter = useCallback(() => {
    // API Gateway + Cognito: Access Token costuma ter cognito:groups; audience valida via aud ou client_id.
    setTokenGetter(() => accessToken);
  }, [accessToken]);

  React.useEffect(() => {
    refreshTokenGetter();
  }, [refreshTokenGetter]);

  React.useEffect(() => {
    let cancelled = false;
    try {
      const pool = createUserPool();
      const user = pool.getCurrentUser();
      if (!user) return;
      user.getSession((err, session) => {
        if (cancelled || err || !session?.isValid?.()) return;
        const at = session.getAccessToken().getJwtToken();
        const it = session.getIdToken().getJwtToken();
        setAccessToken(at);
        setIdToken(it);
        setTokenGetter(() => at);
        setGroups(mergeGroupsFromTokens(at, it));
      });
    } catch {
      /* .env ausente — ignorar */
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const tokens = await cognitoSignIn(email, password);
    setAccessToken(tokens.accessToken);
    setIdToken(tokens.idToken);
    setTokenGetter(() => tokens.accessToken);
    const parsedGroups = mergeGroupsFromTokens(tokens.accessToken, tokens.idToken);
    setGroups(parsedGroups);
    const adminPanel = canUseAdminPanel(parsedGroups);
    return {
      ...tokens,
      groups: parsedGroups,
      hasAccess: parsedGroups.some((g) => ALLOWED_ROLES.has(normalizeGroup(g))),
      canUseAdminPanel: adminPanel,
      /** @deprecated use canUseAdminPanel */
      isAdmin: adminPanel,
    };
  }, []);

  const logout = useCallback(() => {
    cognitoSignOut();
    setAccessToken(null);
    setIdToken(null);
    setGroups([]);
    setTokenGetter(() => null);
  }, []);

  const value = useMemo(() => {
    const merged = mergeGroupsFromTokens(accessToken, idToken);
    const resolvedGroups = merged.length > 0 ? merged : groups;

    const hasAccess = resolvedGroups.some((g) => ALLOWED_ROLES.has(normalizeGroup(g)));
    const canAdmin = canUseAdminPanel(resolvedGroups);

    return {
      accessToken,
      idToken,
      groups: resolvedGroups,
      hasAccess,
      canUseAdminPanel: canAdmin,
      isOperator: isOperator(resolvedGroups),
      login,
      logout,
    };
  }, [accessToken, idToken, groups, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

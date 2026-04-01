import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children, requireOperator = false }) {
  const { idToken, accessToken, hasAccess, canUseAdminPanel } = useAuth();
  const location = useLocation();

  if (!idToken && !accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasAccess) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Rota só para quem pode abrir o painel (OPERADOR ou PROPRIETARIO).
  if (requireOperator && !canUseAdminPanel) {
    return <Navigate to="/me" replace />;
  }

  return children;
}

import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import MyArea from "./pages/MyArea";

function HomeGate() {
  const { idToken, accessToken, canUseAdminPanel, hasAccess } = useAuth();
  if (!idToken && !accessToken) return <Navigate to="/login" replace />;
  if (!hasAccess) return <Navigate to="/login" replace />;
  return <Navigate to={canUseAdminPanel ? "/admin" : "/me"} replace />;
}

function AppRoutes() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4200 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        <Route path="/me" element={<ProtectedRoute><MyArea /></ProtectedRoute>} />
        <Route path="/" element={<HomeGate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

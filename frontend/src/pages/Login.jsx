import React, { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, logout, idToken, accessToken, canUseAdminPanel, hasAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (idToken || accessToken) {
    if (!hasAccess) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Sessão sem grupos válidos</h1>
            <p className="mt-2 text-sm text-slate-600">
              O token não contém grupos reconhecidos. Saia e entre novamente, ou confirme o utilizador no Cognito.
            </p>
            <button
              type="button"
              onClick={() => {
                logout();
                toast.success("Sessão encerrada.");
              }}
              className="mt-6 rounded-xl bg-yolo-rose px-4 py-2 text-sm font-semibold text-white"
            >
              Sair
            </button>
          </div>
        </div>
      );
    }
    return <Navigate to={canUseAdminPanel ? "/admin" : "/me"} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await login(email, password);
      toast.success("Autenticado.");
      const navigateTarget = result.canUseAdminPanel
        ? "/admin"
        : from && from !== "/login"
          ? from
          : "/me";
      navigate(navigateTarget, { replace: true });
    } catch (err) {
      toast.error(err?.message || "Falha no login.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-yolo-blue to-yolo-bluedark opacity-95" />
      <div className="relative mx-auto flex max-w-lg flex-col gap-8 px-6 pb-16 pt-24">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">YoloLiving</h1>
          <p className="mt-2 text-sm text-blue-100">Coliving • Acesso seguro</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
          <h2 className="text-lg font-semibold text-slate-900">Entrar</h2>
          <p className="mt-1 text-sm text-slate-500">Use o e-mail cadastrado no Cognito.</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">E-mail</label>
              <input
                type="email"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none ring-yolo-rose/30 transition focus:border-yolo-rose focus:ring-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Senha</label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none ring-yolo-rose/30 transition focus:border-yolo-rose focus:ring-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-yolo-rose px-4 py-3 text-sm font-semibold text-white shadow-md shadow-yolo-rose/30 transition hover:bg-yolo-rosedark disabled:opacity-60"
            >
              {submitting ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

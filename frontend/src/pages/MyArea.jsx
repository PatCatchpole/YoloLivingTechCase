import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { apiFetch, getApiBaseUrl, setApiBaseUrl } from "../lib/api";

export default function MyArea() {
  const { logout, groups } = useAuth();
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    setApiBaseUrl(apiBaseUrl);
  }, [apiBaseUrl]);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch(`/people?limit=50`, { method: "GET" });
      setItems(data.items ?? []);
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar os seus dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleLabel = Array.isArray(groups) && groups.length ? groups.join(", ") : "Utilizador";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-yolo-blue">Área do utilizador</p>
            <h1 className="text-xl font-bold text-slate-900">YoloLiving</h1>
            <p className="text-sm text-slate-500">Perfil: {roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              toast.success("Sessão encerrada.");
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-yolo-blue hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">API Base URL</label>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-yolo-rose focus:ring-2 focus:ring-yolo-rose/25"
            value={apiBaseUrl}
            onChange={(e) => {
              setApiBaseUrlState(e.target.value.trim());
              setApiBaseUrl(e.target.value.trim());
            }}
          />
          <p className="mt-2 text-xs text-slate-500">
            O backend devolve apenas os registos vinculados ao seu e‑mail e ao seu tipo (Hóspede, Proprietário, Fornecedor).
          </p>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="mt-4 rounded-xl bg-yolo-blue px-4 py-2 text-sm font-semibold text-white hover:bg-yolo-bluedark disabled:opacity-50"
          >
            Atualizar
          </button>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {items.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              {loading ? "Carregando…" : "Nenhum registo encontrado para o seu utilizador."}
            </div>
          ) : (
            items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                <p className="mt-1 text-sm text-yolo-blue">{item.type}</p>
                <p className="mt-3 text-sm text-slate-600">{item.email}</p>
                <p className="text-sm text-slate-500">{item.phone}</p>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

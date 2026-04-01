import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { apiFetch, getApiBaseUrl, setApiBaseUrl } from "../lib/api";

const TYPE_OPTIONS = ["Todos", "Hospede", "Proprietario", "Operador", "Fornecedor"];

function emptyForm() {
  return {
    name: "",
    phone: "",
    email: "",
    type: "Hospede",
    createdAt: "",
  };
}

function toInputDateString(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function AdminPanel() {
  const { logout, hasAccess, groups } = useAuth();
  console.log("Grupos Atuais:", groups);
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [loading, setLoading] = useState(false);

  const [filterType, setFilterType] = useState("Todos");
  const [items, setItems] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const effectiveType = useMemo(() => {
    if (filterType === "Todos") return null;
    return filterType;
  }, [filterType]);

  useEffect(() => {
    setApiBaseUrl(apiBaseUrl);
  }, [apiBaseUrl]);

  async function loadPeople() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (effectiveType) qs.set("type", effectiveType);
      qs.set("limit", "80");
      const data = await apiFetch(`/people?${qs.toString()}`, { method: "GET" });
      setItems(data.items ?? []);
    } catch (e) {
      toast.error(e?.message || "Erro ao carregar pessoas.");
    } finally {
      setLoading(false);
    }
  }

  async function importInitialData() {
    setLoading(true);
    try {
      await apiFetch(`/import`, { method: "POST", body: JSON.stringify({}) });
      toast.success("Importação concluída.");
      await loadPeople();
    } catch (e) {
      toast.error(e?.message || "Erro na importação.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveType]);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(item) {
    setModalMode("edit");
    setEditingId(item.id);
    setForm({
      name: item.name ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      type: item.type ?? "Hospede",
      createdAt: toInputDateString(item.createdAt),
    });
    setModalOpen(true);
  }

  async function submitModal(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalMode === "create") {
        const payload = {
          name: form.name,
          phone: form.phone,
          email: form.email,
          type: form.type,
          createdAt: form.createdAt || undefined,
        };
        await apiFetch(`/people`, { method: "POST", body: JSON.stringify(payload) });
        toast.success("Pessoa criada.");
      } else if (modalMode === "edit" && editingId) {
        const payload = {
          name: form.name,
          phone: form.phone,
          email: form.email,
          type: form.type,
        };
        if (form.createdAt) payload.createdAt = form.createdAt;
        await apiFetch(`/people/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Pessoa atualizada.");
      }
      setModalOpen(false);
      setForm(emptyForm());
      await loadPeople();
    } catch (e2) {
      toast.error(e2?.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(item) {
    if (!item?.id) return;
    if (!window.confirm(`Excluir ${item.name}?`)) return;
    setLoading(true);
    try {
      await apiFetch(`/people/${item.id}`, { method: "DELETE" });
      toast.success("Removido.");
      await loadPeople();
    } catch (e2) {
      toast.error(e2?.message || "Erro ao excluir.");
    } finally {
      setLoading(false);
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto flex max-w-2xl items-center justify-center px-6 py-16">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">Acesso não identificado</h1>
            <p className="mt-2 text-sm text-slate-600">
              Não encontramos um grupo válido no token atual. Faça logout e login novamente para atualizar as permissões.
            </p>
            <button
              type="button"
              onClick={() => {
                logout();
                toast("Sessão encerrada. Faça login novamente.");
              }}
              className="mt-6 rounded-xl bg-yolo-rose px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yolo-rosedark"
            >
              Fazer logout
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-yolo-blue">Painel</p>
            <h1 className="text-xl font-bold text-slate-900">YoloLiving • Administrador</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-yolo-rose px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-yolo-rose/30 hover:bg-yolo-rosedark"
            >
              Nova pessoa
            </button>
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">API Base URL</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-yolo-rose focus:ring-2 focus:ring-yolo-rose/25"
                value={apiBaseUrl}
                onChange={(e) => {
      setApiBaseUrlState(e.target.value.trim());
      setApiBaseUrl(e.target.value.trim());
                }}
                placeholder="https://________.execute-api.us-east-1.amazonaws.com"
              />
              <p className="mt-1 text-xs text-slate-500">Copie o `ApiUrl` do deploy SAM.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={importInitialData}
                disabled={loading}
                className="rounded-xl bg-yolo-blue px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-yolo-bluedark disabled:opacity-50"
              >
                Importar dados
              </button>
              <button
                type="button"
                onClick={loadPeople}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Atualizar
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full max-w-xs">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Filtrar por tipo</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yolo-rose focus:ring-2 focus:ring-yolo-rose/25"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-slate-500">{loading ? "Carregando…" : `Mostrando ${items.length} pessoa(s).`}</p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Nenhuma pessoa encontrada para este filtro.
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-yolo-rose/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                    <span className="rounded-full bg-yolo-blue/10 px-3 py-1 text-xs font-semibold text-yolo-blue">{item.type}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.email}</p>
                  <p className="text-sm text-slate-500">{item.phone}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">{modalMode === "create" ? "Nova pessoa" : "Editar pessoa"}</h2>
              <button
                type="button"
                className="text-sm font-medium text-slate-500 hover:text-slate-800"
                onClick={() => setModalOpen(false)}
              >
                Fechar
              </button>
            </div>
            <form className="space-y-4" onSubmit={submitModal}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Nome</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-yolo-rose focus:ring-2 focus:ring-yolo-rose/25"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Telefone</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-yolo-rose focus:ring-2 focus:ring-yolo-rose/25"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">E-mail</label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-yolo-rose focus:ring-2 focus:ring-yolo-rose/25"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tipo</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-yolo-rose focus:ring-2 focus:ring-yolo-rose/25"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {TYPE_OPTIONS.filter((t) => t !== "Todos").map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Data de cadastro (opcional)</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-yolo-rose focus:ring-2 focus:ring-yolo-rose/25"
                    value={form.createdAt}
                    onChange={(e) => setForm({ ...form, createdAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-yolo-rose px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yolo-rosedark disabled:opacity-50"
                >
                  {modalMode === "create" ? "Criar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

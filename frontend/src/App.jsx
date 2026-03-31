import React, { useEffect, useMemo, useState } from "react";
import { apiFetch, getApiBaseUrl, setApiBaseUrl } from "./api";

const TYPE_OPTIONS = ["Todos", "Hospede", "Proprietario", "Operador", "Fornecedor"];

function emptyForm() {
  return {
    name: "",
    phone: "",
    email: "",
    type: "Hospede",
    createdAt: "", // opcional (YYYY-MM-DD)
  };
}

function toInputDateString(iso) {
  // Converte "2026-01-19T00:00:00.000Z" => "2026-01-19"
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function App() {
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filterType, setFilterType] = useState("Todos");
  const [items, setItems] = useState([]);

  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const effectiveType = useMemo(() => {
    if (filterType === "Todos") return null;
    return filterType;
  }, [filterType]);

  async function loadPeople() {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (effectiveType) qs.set("type", effectiveType);
      qs.set("limit", "50");
      const data = await apiFetch(`/people?${qs.toString()}`, { method: "GET" });
      setItems(data.items ?? []);
    } catch (e) {
      setError(e?.message || "Erro ao carregar pessoas.");
    } finally {
      setLoading(false);
    }
  }

  async function importInitialData() {
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/import`, { method: "POST", body: JSON.stringify({}) });
      await loadPeople();
    } catch (e) {
      setError(e?.message || "Erro na importação.");
      setLoading(false);
    }
  }

  async function submitCreate(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        type: form.type,
        createdAt: form.createdAt || undefined,
      };
      await apiFetch(`/people`, { method: "POST", body: JSON.stringify(payload) });
      setForm(emptyForm());
      setMode("create");
      setEditingId(null);
      await loadPeople();
    } catch (e2) {
      setError(e2?.message || "Erro ao criar pessoa.");
    } finally {
      setLoading(false);
    }
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        type: form.type,
      };
      if (form.createdAt) payload.createdAt = form.createdAt;

      await apiFetch(`/people/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      setForm(emptyForm());
      setMode("create");
      setEditingId(null);
      await loadPeople();
    } catch (e2) {
      setError(e2?.message || "Erro ao atualizar pessoa.");
    } finally {
      setLoading(false);
    }
  }

  async function startEdit(item) {
    setError("");
    setMode("edit");
    setEditingId(item.id);
    setForm({
      name: item.name ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      type: item.type ?? "Hospede",
      createdAt: toInputDateString(item.createdAt),
    });
  }

  async function removeItem(item) {
    if (!item?.id) return;
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/people/${item.id}`, { method: "DELETE" });
      // Atualiza lista respeitando filtro atual.
      await loadPeople();
    } catch (e2) {
      setError(e2?.message || "Erro ao excluir pessoa.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Salva base URL e mantém coerência entre reloads.
    setApiBaseUrl(apiBaseUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Reload quando o filtro muda (sem travar a UI).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadPeople();
  }, [effectiveType]);

  return (
    <div className="app">
      <h1>YoloLiving - Pessoas</h1>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label>API Base URL</label>
            <input
              value={apiBaseUrl}
              onChange={(e) => {
                setApiBaseUrlState(e.target.value);
                setApiBaseUrl(e.target.value);
              }}
              placeholder="https://{api-id}.execute-api.{regiao}.amazonaws.com"
            />
            <div className="muted">Dica: após deploy, use o `ApiUrl` do SAM.</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <button onClick={importInitialData} disabled={loading}>
              {loading ? "Importando..." : "Importar Dados"}
            </button>
            <button className="secondary" onClick={loadPeople} disabled={loading}>
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="grid">
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <label>Filtrar por tipo</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                {TYPE_OPTIONS.map((t) => (
                  <option value={t} key={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : null}

          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Nenhuma pessoa encontrada.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.type}</td>
                    <td>{item.email}</td>
                    <td>{item.phone}</td>
                    <td>
                      <button
                        className="secondary"
                        onClick={() => startEdit(item)}
                        disabled={loading}
                        style={{ marginRight: 8 }}
                      >
                        Editar
                      </button>
                      <button className="danger" onClick={() => removeItem(item)} disabled={loading}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="muted" style={{ marginTop: 8 }}>
            {loading ? "Processando..." : `Mostrando ${items.length} item(ns).`}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>{mode === "create" ? "Cadastrar Pessoa" : "Editar Pessoa"}</h2>

          <form onSubmit={mode === "create" ? submitCreate : submitEdit}>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="field">
                <label>Nome</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="field">
                <label>Telefone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div className="field">
                <label>E-mail</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="field">
                <label>Tipo</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                  {TYPE_OPTIONS.filter((t) => t !== "Todos").map((t) => (
                    <option value={t} key={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ gridColumn: "span 2" }}>
                <label>Data de Cadastro (opcional)</label>
                <input
                  type="date"
                  value={form.createdAt}
                  onChange={(e) => setForm({ ...form, createdAt: e.target.value })}
                />
                <div className="muted">Se não informar, o backend usa a data/hora atual.</div>
              </div>
            </div>

            <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
              <button type="submit" disabled={loading}>
                {mode === "create" ? (loading ? "Criando..." : "Criar") : loading ? "Salvando..." : "Salvar"}
              </button>
              {mode === "edit" ? (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setEditingId(null);
                    setForm(emptyForm());
                  }}
                  disabled={loading}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>

          <div className="muted" style={{ marginTop: 12 }}>
            O `id` da pessoa é gerado automaticamente no backend (determinístico via campos).
          </div>
        </div>
      </div>
    </div>
  );
}


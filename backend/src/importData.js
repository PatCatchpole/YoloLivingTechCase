const { jsonResponse, normalizeType, toIsoDate, sha256Hex } = require("./util");
const { upsertFromYoloCliente } = require("./peopleStore");
const { requirePeopleAdmin } = require("./auth");

const YOLO_IMPORT_ENDPOINT =
  process.env.YOLO_IMPORT_ENDPOINT ||
  "https://3ji5haxzr9.execute-api.us-east-1.amazonaws.com/dev/caseYolo";

async function fetchJsonWithTimeout(url, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    // A API pode retornar JSON puro ou um wrapper em string.
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } finally {
    clearTimeout(timer);
  }
}

function extractClientes(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.clientes)) return payload.clientes;

  // Alguns setups retornam { body: "{...}" }
  if (typeof payload.body === "string") {
    try {
      const inner = JSON.parse(payload.body);
      if (Array.isArray(inner.clientes)) return inner.clientes;
    } catch {
      // ignore
    }
  }

  return [];
}

module.exports.handler = async (event) => {
  try {
    const op = requirePeopleAdmin(event);
    if (!op.ok) return op.response;

    // Sem necessidade de body, mas mantemos padrão do CRUD.
    const payload = await fetchJsonWithTimeout(YOLO_IMPORT_ENDPOINT);
    const clientes = extractClientes(payload);

    if (!clientes.length) {
      return jsonResponse(502, {
        message: "Não foi possível extrair 'clientes' do payload da API Yolo.",
      });
    }

    const conversions = { normalizeType, toIsoDate, sha256Hex };

    let imported = 0;
    for (const cliente of clientes) {
      await upsertFromYoloCliente(cliente, conversions);
      imported++;
    }

    return jsonResponse(200, {
      message: "Importação concluída.",
      imported,
    });
  } catch (err) {
    const message = err?.message || "Erro desconhecido na importação.";
    return jsonResponse(500, { message });
  }
};


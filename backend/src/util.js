const crypto = require("crypto");

function removeDiacritics(input) {
  return (input ?? "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function normalizeType(tipo) {
  const t = removeDiacritics(tipo).trim().toLowerCase();

  if (t.startsWith("hosp")) return "Hospede";
  if (t === "operador") return "Operador";
  if (t === "fornecedor") return "Fornecedor";
  if (t.startsWith("propriet")) return "Proprietario";

  // Fallback para permitir novos valores sem quebrar o CRUD.
  if (!t) return "Outros";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function toIsoDate(createdAt) {
  if (!createdAt) return new Date().toISOString();
  // Entrada comum do case: "YYYY-MM-DD"
  const iso = new Date(`${createdAt}T00:00:00.000Z`).toISOString();
  return iso;
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(data ?? null),
  };
}

function parseJsonBody(event) {
  if (!event.body) return {};
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  if (!rawBody) return {};
  return JSON.parse(rawBody);
}

function requireFields(obj, fields) {
  for (const f of fields) {
    if (obj?.[f] === undefined || obj?.[f] === null || obj?.[f] === "") {
      return f;
    }
  }
  return null;
}

function buildUpdateExpression(updates) {
  const allowed = ["name", "phone", "email", "emailLower", "type", "createdAt"];
  const entries = Object.entries(updates).filter(([k, v]) => allowed.includes(k) && v !== undefined);

  if (entries.length === 0) {
    return null;
  }

  const names = {};
  const values = {};
  const parts = [];

  for (const [key, value] of entries) {
    const nameKey = `#${key}`;
    const valueKey = `:${key}`;
    names[nameKey] = key;
    values[valueKey] = value;
    parts.push(`${nameKey} = ${valueKey}`);
  }

  return {
    UpdateExpression: `SET ${parts.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}

module.exports = {
  removeDiacritics,
  normalizeType,
  toIsoDate,
  sha256Hex,
  jsonResponse,
  parseJsonBody,
  requireFields,
  buildUpdateExpression,
};


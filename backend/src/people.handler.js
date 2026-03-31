const { jsonResponse, parseJsonBody, requireFields, normalizeType, toIsoDate, sha256Hex } = require("./util");
const { listPeople, putPerson, updatePerson, deletePerson } = require("./peopleStore");

function getMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "GET";
}

function getPathParams(event) {
  return event?.pathParameters ?? {};
}

async function handleGet(event) {
  const type = event?.queryStringParameters?.type;
  const limit = event?.queryStringParameters?.limit;
  const items = await listPeople({ type, limit });
  return jsonResponse(200, { items, type: type ?? null });
}

async function handlePost(event) {
  const body = parseJsonBody(event);
  const missing = requireFields(body, ["name", "phone", "email", "type"]);
  if (missing) return jsonResponse(400, { message: `Campo obrigatório ausente: ${missing}` });

  const createdAt = body.createdAt ? toIsoDate(body.createdAt) : new Date().toISOString();
  const normalizedType = normalizeType(body.type);
  const id = sha256Hex([body.email, body.phone, body.name, normalizedType, createdAt].join("|"));

  const item = await putPerson({
    id,
    name: body.name,
    phone: body.phone,
    email: body.email,
    type: normalizedType,
    createdAt,
  });

  return jsonResponse(201, { item });
}

async function handlePut(event) {
  const { id } = getPathParams(event);
  if (!id) return jsonResponse(400, { message: "Path parameter 'id' é obrigatório." });

  const body = parseJsonBody(event);
  // Normaliza campos que afetam index.
  const updates = { ...body };
  if (updates.type !== undefined) updates.type = normalizeType(updates.type);
  if (updates.createdAt !== undefined) updates.createdAt = toIsoDate(updates.createdAt);

  const updated = await updatePerson(id, updates);
  if (!updated) return jsonResponse(400, { message: "Nenhum campo válido para atualizar ou item não encontrado." });

  return jsonResponse(200, { item: updated });
}

async function handleDelete(event) {
  const { id } = getPathParams(event);
  if (!id) return jsonResponse(400, { message: "Path parameter 'id' é obrigatório." });

  const deleted = await deletePerson(id);
  if (!deleted) return jsonResponse(404, { message: "Pessoa não encontrada." });
  return jsonResponse(200, { deleted });
}

module.exports.handler = async (event) => {
  try {
    const method = getMethod(event);
    switch (method) {
      case "GET":
        return handleGet(event);
      case "POST":
        return handlePost(event);
      case "PUT":
        return handlePut(event);
      case "DELETE":
        return handleDelete(event);
      default:
        return jsonResponse(405, { message: `Método não suportado: ${method}` });
    }
  } catch (err) {
    return jsonResponse(500, { message: err?.message || "Erro interno." });
  }
};


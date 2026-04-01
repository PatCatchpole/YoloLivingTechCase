const { jsonResponse, parseJsonBody, requireFields, normalizeType, toIsoDate, sha256Hex } = require("./util");
const {
  listPeople,
  listPeopleByEmailLower,
  putPerson,
  updatePerson,
  deletePerson,
} = require("./peopleStore");
const {
  requirePeopleAdmin,
  requireAuthenticated,
  hasFullPeopleAccess,
  isReadOnlyRole,
  groupsSet,
} = require("./auth");

function getMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "GET";
}

function getPathParams(event) {
  return event?.pathParameters ?? {};
}

function filterByRole(groups, items) {
  const g = groupsSet(groups);
  if (g.has("FORNECEDOR")) return items.filter((i) => i.type === "Fornecedor");
  if (g.has("HOSPEDE")) return items.filter((i) => i.type === "Hospede");
  return items;
}

async function handleGet(event) {
  const type = event?.queryStringParameters?.type;
  const limit = event?.queryStringParameters?.limit;
  const auth = requireAuthenticated(event);
  if (!auth.ok) return auth.response;

  if (hasFullPeopleAccess(auth.groups)) {
    if (type) {
      const items = await listPeople({ type, limit });
      return jsonResponse(200, { items, type, scope: "admin" });
    }
    const items = await listPeople({ type: null, limit });
    return jsonResponse(200, { items, type: null, scope: "admin" });
  }

  if (!isReadOnlyRole(auth.groups)) {
    return jsonResponse(403, {
      message: "Conta sem grupo de acesso permitido (HOSPEDE ou FORNECEDOR).",
    });
  }

  // HOSPEDE / FORNECEDOR: somente leitura do que está vinculado ao e-mail Cognito
  const itemsRaw = await listPeopleByEmailLower(auth.email, { limit: limit ?? 100 });
  let items = filterByRole(auth.groups, itemsRaw);

  if (type) {
    items = items.filter((i) => i.type === type);
  }

  return jsonResponse(200, { items, type: type ?? null, scope: "self" });
}

async function handlePost(event) {
  const op = requirePeopleAdmin(event);
  if (!op.ok) return op.response;

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
  const op = requirePeopleAdmin(event);
  if (!op.ok) return op.response;

  const { id } = getPathParams(event);
  if (!id) return jsonResponse(400, { message: "Path parameter 'id' é obrigatório." });

  const body = parseJsonBody(event);
  const updates = { ...body };
  if (updates.type !== undefined) updates.type = normalizeType(updates.type);
  if (updates.createdAt !== undefined) updates.createdAt = toIsoDate(updates.createdAt);
  if (updates.email !== undefined) updates.emailLower = updates.email.toString().trim().toLowerCase();

  const updated = await updatePerson(id, updates);
  if (!updated) return jsonResponse(400, { message: "Nenhum campo válido para atualizar ou item não encontrado." });

  return jsonResponse(200, { item: updated });
}

async function handleDelete(event) {
  const op = requirePeopleAdmin(event);
  if (!op.ok) return op.response;

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

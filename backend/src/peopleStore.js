const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const { jsonResponse, buildUpdateExpression } = require("./util");

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.PEOPLE_TABLE;

if (!TABLE) {
  // Fail fast: SAM will surface configuration issue.
  throw new Error("Missing env var PEOPLE_TABLE");
}

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: REGION,
  })
);

function toPersonItem(person) {
  // Espera campos normalizados.
  return {
    id: person.id,
    name: person.name,
    phone: person.phone,
    email: person.email,
    type: person.type,
    createdAt: person.createdAt,
  };
}

async function putPerson(person) {
  const item = toPersonItem(person);
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );
  return item;
}

async function getPerson(id) {
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return res.Item ?? null;
}

async function deletePerson(id) {
  const res = await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ReturnValues: "ALL_OLD",
    })
  );
  return res.Attributes ?? null;
}

async function updatePerson(id, updates) {
  const update = buildUpdateExpression(updates);
  if (!update) return null;

  const res = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      ...update,
      ReturnValues: "ALL_NEW",
    })
  );
  return res.Attributes ?? null;
}

async function listPeople({ type, limit }) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit ?? 50)));

  if (type) {
    // Usamos GSI para filtrar por tipo.
    const res = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "ByTypeCreatedAt",
        KeyConditionExpression: "#type = :typeVal",
        ExpressionAttributeNames: { "#type": "type" },
        ExpressionAttributeValues: { ":typeVal": type },
        ScanIndexForward: false, // newest first
        Limit: safeLimit,
      })
    );
    return res.Items ?? [];
  }

  // Sem tipo: dataset pequeno do case -> scan com limite.
  const res = await docClient.send(
    new ScanCommand({
      TableName: TABLE,
      Limit: safeLimit,
    })
  );
  return res.Items ?? [];
}

async function upsertFromYoloCliente(cliente, converters) {
  const {
    normalizeType,
    toIsoDate,
    sha256Hex,
  } = converters;

  const name = cliente["Nome"];
  const phone = cliente["Telefone"];
  const email = cliente["E-mail"];
  const type = normalizeType(cliente["Tipo"]);
  const createdAt = toIsoDate(cliente["Data de Cadastro"]);

  const id = sha256Hex([email, phone, name, type, createdAt].join("|"));

  return putPerson({ id, name, phone, email, type, createdAt });
}

module.exports = {
  putPerson,
  getPerson,
  updatePerson,
  deletePerson,
  listPeople,
  upsertFromYoloCliente,
  TABLE,
  jsonResponse,
};


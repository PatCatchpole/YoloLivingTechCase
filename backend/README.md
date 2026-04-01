# Backend - AWS SAM (Lambda + DynamoDB + Cognito)

## Autenticação (HTTP API JWT)

Todas as rotas exigem `Authorization: Bearer <Access ou ID token>`. O frontend também envia `X-Yolo-Jwt: <jwt>` com o mesmo token, porque o **API Gateway HTTP API** por vezes **não repassa** o header `Authorization` à Lambda após o authorizer JWT — a Lambda usa `X-Yolo-Jwt` para decodificar `cognito:groups`.

O **API Gateway HTTP API** valida o JWT (issuer + audience). As Lambdas aplicam **RBAC** com base nos grupos Cognito (`cognito:groups`).

### Grupos (RBAC)

| Grupo          | `/import` | `GET /people` | `POST/PUT/DELETE /people` |
|----------------|-----------|-----------------|----------------------------|
| `OPERADOR`     | sim       | lista completa (`scope: admin`) | sim |
| `PROPRIETARIO` | sim       | lista completa (`scope: admin`) | sim |
| `HOSPEDE`      | não       | só registos com o seu e-mail e `type = Hospede` | não |
| `FORNECEDOR`   | não       | só registos com o seu e-mail e `type = Fornecedor` | não |

Comparação de nomes de grupo no backend é **case-insensitive** (normalizado para maiúsculas).

Utilizadores autenticados **sem** um destes grupos recebem `403`.

### Cognito: criar utilizador de teste

Após `sam deploy`, use os outputs `UserPoolId` e `UserPoolWebClientId`.

1. No **Cognito** → User pool → **Users** → Create user (e-mail como username).
2. **Groups** → adicione o utilizador ao grupo correspondente (`OPERADOR`, etc.).

### Obter token para testar a API (exemplo)

Use o fluxo Hosted UI ou o SDK; para um teste rápido com AWS CLI (InitiateAuth):

```bash
aws cognito-idp initiate-auth \
  --client-id YOUR_CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=you@example.com,PASSWORD='YourPassword'
```

Use `IdToken` da resposta no header `Authorization: Bearer ...`.

## Endpoints

Base URL: output `ApiUrl`.

- `POST ${ApiUrl}/import` — `OPERADOR` ou `PROPRIETARIO`. Importa dados da API Yolo.
- `GET ${ApiUrl}/people?type=Hospede&limit=50` — `OPERADOR` ou `PROPRIETARIO`: lista global (`scope: admin`); `HOSPEDE` / `FORNECEDOR`: apenas “meus” dados (`scope: self`).
- `POST/PUT/DELETE ${ApiUrl}/people` — `OPERADOR` ou `PROPRIETARIO`.

## Modelo de dados (DynamoDB)

- Tabela `People`: PK `id`; atributos `name`, `phone`, `email`, `emailLower`, `type`, `createdAt`.
- GSI `ByTypeCreatedAt`: `type` + `createdAt` (lista / filtro operador).
- GSI `ByEmailLower`: `emailLower` + `createdAt` (dados vinculados ao e-mail do utilizador).

## Deploy

1. `sam build`
2. `sam deploy --guided`
3. Copie `ApiUrl`, `UserPoolId`, `UserPoolWebClientId`, `AwsRegion` para o `frontend/.env`.

## Notas

- Import Yolo: `GET https://3ji5haxzr9.execute-api.us-east-1.amazonaws.com/dev/caseYolo`.
- `emailLower` é preenchido em novos upserts/criações para suportar o GSI; registos antigos podem usar fallback em memória no primeiro acesso.

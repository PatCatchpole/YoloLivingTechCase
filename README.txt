# YoloLiving - People CRUD (Case Entrevista)

Plataforma simples para cadastro/listagem/filtragem de pessoas (hóspedes, proprietários, operadores, fornecedores), com importação inicial via API REST fornecida pela Yolo Tech.

Arquitetura (AWS):
- AWS Lambda (microsserviços)
- API Gateway HTTP API + **autorizador JWT (Amazon Cognito)**
- DynamoDB (People + GSI por `type` e por `emailLower`)
- Amazon Cognito User Pools + grupos (`OPERADOR`, `HOSPEDE`, `PROPRIETARIO`, `FORNECEDOR`)

## Como usar

Documentação completa (negócio, arquitetura, API, RBAC, deploy e troubleshooting):

- **[DOCUMENTACAO.md](./DOCUMENTACAO.md)**

Documentação por pasta:

- `backend/README.md`
- `frontend/README.md`

## Endpoints

Após o deploy do `backend`, use os outputs `ApiUrl`, `UserPoolId`, `UserPoolWebClientId` e `AwsRegion` no `frontend/.env`.

Rotas da API (todas com JWT):
- `POST  /import`
- `GET   /people?type=Hospede`
- `POST  /people`
- `PUT   /people/{id}`
- `DELETE /people/{id}`

## Apresentação

1. Importação inicial (`POST /import`)
2. Listagem filtrada por tipo (`GET /people?type=...`)
3. CRUD via UI (criar, editar, excluir)
4. Diagrama/explicação rápida do DynamoDB (PK `id`, GSI `ByTypeCreatedAt`, GSI `ByEmailLower`) e RBAC Cognito


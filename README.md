# YoloLiving - People CRUD (Case Entrevista)

Plataforma simples para cadastro/listagem/filtragem de pessoas (hóspedes, proprietários, operadores, fornecedores), com importação inicial via API REST fornecida pela Yolo Tech.

Arquitetura (AWS):
- AWS Lambda (microsserviços)
- API Gateway HTTP API
- DynamoDB (People table + GSI por `type`)

## Como usar

Veja a documentação detalhada:
- `backend/README.md`
- `frontend/README.md` (se aplicável)

## Endpoints

Após o deploy do `backend`, o output `ApiUrl` do SAM vai te dar a base:
- `POST  /import`
- `GET   /people?type=Hospede`
- `POST  /people`
- `PUT   /people/{id}`
- `DELETE /people/{id}`

## Apresentação

Estruture a apresentação mostrando:
1. Importação inicial (`POST /import`)
2. Listagem filtrada por tipo (`GET /people?type=...`)
3. CRUD via UI (criar, editar, excluir)
4. Diagrama/explicação rápida do DynamoDB (PK `id`, GSI `ByTypeCreatedAt`)


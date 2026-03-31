# Backend - AWS SAM (Lambda + DynamoDB)

## Endpoints (API Gateway)

Base URL (saída do SAM): `ApiUrl`

- `POST ${ApiUrl}/import`
  - Importa os dados iniciais do endpoint da Yolo Tech para a tabela DynamoDB.
  - Body: não obrigatório (pode enviar `{}`).

- `GET ${ApiUrl}/people?type=Hospede&limit=50`
  - Se `type` existir, usa GSI `ByTypeCreatedAt` para listar.

- `POST ${ApiUrl}/people`
  - Body (JSON):
    ```json
    {
      "name": "Fiona",
      "phone": "+55 68 99544-3972",
      "email": "fiona@example.com",
      "type": "Hospede",
      "createdAt": "2026-01-19"
    }
    ```

- `PUT ${ApiUrl}/people/{id}`
  - Body (opcional, só campos para alterar):
    ```json
    {
      "name": "Nova Nome",
      "type": "Operador"
    }
    ```

- `DELETE ${ApiUrl}/people/{id}`

## Modelo de dados (DynamoDB)

- Tabela: `People`
  - PK: `id` (string)
  - Atributos: `name`, `phone`, `email`, `type`, `createdAt`
- GSI: `ByTypeCreatedAt`
  - `type` (HASH)
  - `createdAt` (RANGE)

## Deploy (AWS)

Pré-requisitos:
- AWS Account com permissões para criar recursos
- AWS SAM CLI instalado

Passos:
1. Navegue para `backend/`
2. `sam build`
3. `sam deploy --guided`
4. Copie o output `ApiUrl`
5. Configure o front-end com esse `ApiUrl` (ver `frontend/`)

## Notas de implementação

- O `POST /import` busca `GET https://3ji5haxzr9.execute-api.us-east-1.amazonaws.com/dev/caseYolo`.
- Para cada item:
  - `type` é normalizado para um conjunto interno: `Hospede`, `Operador`, `Fornecedor`, `Proprietario`
  - `id` é um `sha256` determinístico (idempotente) com base nos campos do registro.


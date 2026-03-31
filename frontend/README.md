# Frontend - React (Vite)

UI simples para:
- importar dados iniciais (chama `POST /import`)
- listar pessoas com filtro por `type`
- criar pessoas
- editar e excluir

## Rodar localmente

1. No `frontend/`, instale dependências:
   - `npm install`
2. Configure o `VITE_API_BASE_URL`:
   - Copie `frontend/.env.example` para `frontend/.env` e ajuste para o `ApiUrl` do SAM, por exemplo:
     - `https://{api-id}.execute-api.{regiao}.amazonaws.com`
3. Rode:
   - `npm run dev`

## Endpoints esperados
- `POST /import`
- `GET /people?type=...`
- `POST /people`
- `PUT /people/{id}`
- `DELETE /people/{id}`


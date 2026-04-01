# Frontend - React (Vite) + Tailwind

## Funcionalidades

- Login com **Amazon Cognito** (`amazon-cognito-identity-js`).
- Rotas protegidas: `/admin` (OPERADOR) e `/me` (hóspede / proprietário / fornecedor).
- Painel admin: cartões, modal de criação/edição, toasts (`react-hot-toast`).
- Paleta: branco/cinza, **rosa** (CTAs) e **azul** (secundário).

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha com os outputs do SAM:

- `VITE_API_BASE_URL` — `ApiUrl`
- `VITE_AWS_REGION` — `AwsRegion`
- `VITE_COGNITO_USER_POOL_ID` — `UserPoolId`
- `VITE_COGNITO_CLIENT_ID` — `UserPoolWebClientId`

## Rodar

```bash
npm install
npm run dev
```

O Vite está configurado na porta **8080** (veja `vite.config.js`).

## Chamadas à API

O `src/lib/api.js` envia `Authorization: Bearer <accessToken>` em todos os pedidos. No Cognito, o **Access Token** inclui `cognito:groups` de forma fiável; o **ID Token** pode omitir grupos, o que quebrava o RBAC no backend.

O UI continua a poder usar o ID token no estado se precisar; a autorização na API usa o access token.

Rotas esperadas no backend: `/import`, `/people`, `/people/{id}`.

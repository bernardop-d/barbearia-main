# Barbearia do B 💈

Sistema completo de gestão e agendamento para barbearia.

## Estrutura do repositório

```
barbearia-main/   → Painel admin web (React + Vite)
mobile/           → App Android (React Native + Expo)
```

---

## Painel Web (`barbearia-main/`)

Dashboard do barbeiro com gestão de agendamentos, faturamento e agenda.

**Deploy automático:** feito via GitHub Actions para o GitHub Pages a cada push no `main`.

Para rodar localmente:
```bash
cd barbearia-main
npm install
npm run dev
```

Variáveis necessárias em `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## App Android (`mobile/`)

App mobile para o barbeiro (admin) e para clientes (agendamento público).

**Build automático:** gerado via GitHub Actions + EAS Build a cada push que altere a pasta `mobile/`.

Para baixar o APK: acesse [expo.dev](https://expo.dev) → Projects → barbearia → Builds → Download.

Veja o [README completo do app](mobile/README.md) para instruções detalhadas.

---

## GitHub Actions — Configuração necessária

Adicione estes secrets em **Settings → Secrets and variables → Actions**:

| Secret | Onde obter |
|---|---|
| `VITE_SUPABASE_URL` | Painel do Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Painel do Supabase → Project Settings → API |
| `EXPO_TOKEN` | [expo.dev](https://expo.dev) → Account Settings → Access Tokens |

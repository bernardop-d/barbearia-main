# BarberPro 💈

Sistema de gestão para barbearia — PWA com React + Vite + TailwindCSS + Supabase.

## 🚀 Setup em 5 passos

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar Supabase
Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto.

Copie o arquivo de ambiente:
```bash
cp .env.example .env
```

Preencha `.env` com suas credenciais do Supabase (Settings → API).

### 3. Criar a tabela no Supabase
No **SQL Editor** do Supabase, execute:

```sql
create table agendamentos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  servico    text not null,
  preco      numeric not null,
  data       timestamptz not null,
  status     text not null default 'confirmado',
  whatsapp   text,
  created_at timestamptz default now()
);

-- Habilitar Row Level Security
alter table agendamentos enable row level security;

-- Política para acesso total (ajuste conforme necessário)
create policy "allow_all" on agendamentos
  for all using (true) with check (true);
```

### 4. Configurar autenticação (Magic Link)
No Supabase: **Authentication → Settings**:
- Em **Site URL**, coloque sua URL de produção (ou `http://localhost:5173` para dev)
- Email já está habilitado por padrão com OTP/Magic Link

### 5. Rodar o projeto
```bash
npm run dev
```

## 📦 Build para produção
```bash
npm run build
```

## 📱 PWA (Instalar no celular)
Após o build e deploy:
1. Abra o site no navegador do celular
2. Menu → "Adicionar à tela inicial"
3. O app abre em modo standalone (sem barra do navegador)

## 🗂️ Estrutura
```
src/
├── App.jsx                # Rotas principais
├── main.jsx               # Entry point
├── index.css              # Estilos globais (Tailwind)
├── pages/
│   ├── Login.jsx          # Tela de login (magic link)
│   └── Home.jsx           # Container principal
├── components/
│   ├── Navbar.jsx         # Header + Tab bar inferior
│   ├── Dashboard.jsx      # Cards financeiros + próximos
│   ├── Agenda.jsx         # Lista de agendamentos
│   └── AgendamentoForm.jsx # Criar/editar agendamento
├── hooks/
│   └── useAuth.js         # Context de autenticação
└── services/
    └── supabase.js        # Client + funções do banco
```

## ✨ Funcionalidades
- 🔐 Login por magic link (email)
- 📅 Criar, editar, remover agendamentos
- 💰 Dashboard financeiro automático
- 📊 Filtros por status
- 💬 Integração WhatsApp com mensagem automática
- 📱 PWA instalável no celular

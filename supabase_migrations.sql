-- ============================================================
-- Rode este SQL no painel do Supabase (SQL Editor)
-- ============================================================

-- Tabela de configurações (horário de almoço, etc.)
create table if not exists config (
  id    serial primary key,
  key   text unique not null,
  value jsonb not null default '{}'
);

alter table config enable row level security;

create policy "config leitura publica"    on config for select using (true);
create policy "config escrita autenticada" on config for insert with check (auth.role() = 'authenticated');
create policy "config update autenticado"  on config for update using (auth.role() = 'authenticated');
create policy "config delete autenticado"  on config for delete using (auth.role() = 'authenticated');

-- Tabela de serviços customizados
create table if not exists servicos (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  "desc"     text not null default '',
  preco      numeric(10,2) not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz default now()
);

alter table servicos enable row level security;

create policy "servicos leitura publica"    on servicos for select using (true);
create policy "servicos escrita autenticada" on servicos for all using (auth.role() = 'authenticated');

-- ============================================================
-- Produtos (estoque)
-- ============================================================
create table if not exists produtos (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  tipo           text not null default 'revenda' check (tipo in ('revenda', 'insumo')),
  preco          numeric(10,2) not null default 0,
  estoque_atual  numeric(10,2) not null default 0,
  estoque_minimo numeric(10,2) not null default 1,
  unidade        text not null default 'un',
  ativo          boolean not null default true,
  created_at     timestamptz default now()
);

alter table produtos enable row level security;
create policy "produtos autenticado" on produtos for all using (auth.role() = 'authenticated');

-- Função para ajustar estoque atomicamente
create or replace function ajustar_estoque(p_id uuid, p_delta numeric)
returns void language sql security definer as $$
  update produtos set estoque_atual = greatest(0, estoque_atual + p_delta) where id = p_id;
$$;

-- ============================================================
-- Vendas de produtos
-- ============================================================
create table if not exists vendas (
  id             uuid primary key default gen_random_uuid(),
  produto_id     uuid references produtos(id) on delete set null,
  produto_nome   text not null,
  quantidade     numeric(10,2) not null,
  preco_unitario numeric(10,2) not null,
  total          numeric(10,2) not null,
  data           timestamptz not null default now()
);

alter table vendas enable row level security;
create policy "vendas autenticado" on vendas for all using (auth.role() = 'authenticated');

-- ============================================================
-- Despesas
-- ============================================================
create table if not exists despesas (
  id         uuid primary key default gen_random_uuid(),
  descricao  text not null,
  valor      numeric(10,2) not null,
  categoria  text not null default 'geral',
  data       date not null default current_date,
  created_at timestamptz default now()
);

alter table despesas enable row level security;
create policy "despesas autenticado" on despesas for all using (auth.role() = 'authenticated');

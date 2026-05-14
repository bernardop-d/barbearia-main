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

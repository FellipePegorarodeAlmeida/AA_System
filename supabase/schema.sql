-- =====================================================================
-- Schema completo do ERP Comercial
-- Fluxo: Orçamento → Pedido → NF → Financeiro
-- Execute este arquivo no SQL Editor do Supabase (uma vez).
-- =====================================================================

-- Extensões
create extension if not exists "pgcrypto";

-- =====================================================================
-- ENUMS
-- =====================================================================
do $$ begin
  create type pessoa_tipo as enum ('PF','PJ');
exception when duplicate_object then null; end $$;

do $$ begin
  create type modelo_operacao as enum ('REPRESENTACAO','REVENDA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type orcamento_status as enum ('RASCUNHO','ENVIADO','APROVADO','RECUSADO','CANCELADO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pedido_status as enum ('ABERTO','EM_PRODUCAO','CONCLUIDO','CANCELADO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nf_tipo as enum ('SAIDA','ENTRADA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nf_status as enum ('EMITIDA','CANCELADA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type financeiro_status as enum ('PREVISTO','PAGO','RECEBIDO','CANCELADO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type endereco_tipo as enum ('COBRANCA','ENTREGA','OUTRO');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- CADASTROS BASE
-- =====================================================================

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  tipo pessoa_tipo not null default 'PJ',
  nome text not null,
  documento text unique,                 -- CPF ou CNPJ
  inscricao_estadual text,
  email text,
  telefone text,
  observacoes text,
  tem_agente boolean not null default false,
  agente_id uuid references agentes_comerciais(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_clientes_nome on clientes (nome);

create table if not exists fornecedores (
  id uuid primary key default gen_random_uuid(),
  tipo pessoa_tipo not null default 'PJ',
  nome text not null,
  documento text unique,
  email text,
  telefone text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fornecedores_nome on fornecedores (nome);

create table if not exists agentes_comerciais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text unique,
  email text,
  telefone text,
  papel text,                            -- hub, sócio, agente, parceiro...
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tipos_produto (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,             -- editorial, rótulo, embalagem...
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists solucoes (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references fornecedores(id) on delete restrict,
  tipo_produto_id uuid references tipos_produto(id) on delete set null,
  nome text not null,
  descricao text,
  preco_base numeric(14,2),
  unidade text default 'un',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_solucoes_fornecedor on solucoes (fornecedor_id);

-- =====================================================================
-- CONTATOS / ENDEREÇOS (polimórficos por owner_type + owner_id)
-- =====================================================================
create table if not exists contatos (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('cliente','fornecedor','agente')),
  owner_id uuid not null,
  nome text not null,
  cargo text,
  email text,
  telefone text,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_contatos_owner on contatos (owner_type, owner_id);

create table if not exists enderecos (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('cliente','fornecedor','agente')),
  owner_id uuid not null,
  tipo endereco_tipo not null default 'COBRANCA',
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  pais text default 'Brasil',
  principal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_enderecos_owner on enderecos (owner_type, owner_id);

-- =====================================================================
-- CONDIÇÕES DE PAGAMENTO + PARCELAS PADRÃO
-- =====================================================================
create table if not exists condicoes_pagamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,             -- "À vista", "30/60/90"
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists condicao_parcelas (
  id uuid primary key default gen_random_uuid(),
  condicao_id uuid not null references condicoes_pagamento(id) on delete cascade,
  numero int not null,                   -- 1, 2, 3...
  dias int not null,                     -- 0, 30, 60...
  percentual numeric(7,4) not null,      -- 100.0000, 33.3333...
  unique (condicao_id, numero)
);

-- =====================================================================
-- ORÇAMENTOS
-- =====================================================================
create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero serial unique,
  cliente_id uuid not null references clientes(id) on delete restrict,
  modelo_operacao text not null check (modelo_operacao in ('REPRESENTACAO', 'REVENDA')),
  titulo text not null,
  status orcamento_status not null default 'RASCUNHO',
  condicao_pagamento_id uuid references condicoes_pagamento(id),
  frete_extra numeric(14,2) not null default 0,
  imposto_percentual_estimado numeric(7,4) not null default 0,
  imposto_valor_estimado numeric(14,2) not null default 0,
  observacoes text,
  agente_id uuid references agentes_comerciais(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orcamentos_cliente on orcamentos (cliente_id);
create index if not exists idx_orcamentos_status on orcamentos (status);

create table if not exists orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  fornecedor_id uuid references fornecedores(id) on delete set null,
  descricao text not null,
  tipo_producao text not null,
  prazo_estimado text,
  formato text,
  largura_mm numeric(10,2),
  altura_mm numeric(10,2),
  substrato text,
  acabamentos text,
  observacoes_tecnicas text,
  fornecedor_valor_total numeric(14,2) not null default 0,
  fornecedor_tipo_preco text not null default 'unitario',
  fornecedor_numero_proposta text,
  quantidade numeric(14,3) not null default 1,
  quantidade_unidade text not null default 'unidade',
  preco_unitario numeric(14,2) not null default 0,
  desconto numeric(14,2) not null default 0,
  total numeric(14,2) generated always as
    ((quantidade * preco_unitario) - desconto) stored,
  ordem int not null default 0,
  incluir_na_proposta boolean not null default true,
  ordem_proposta int not null default 0
);
create index if not exists idx_orcamento_itens_orc on orcamento_itens (orcamento_id);

-- =====================================================================
-- PEDIDOS
-- =====================================================================
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  numero serial unique,
  orcamento_id uuid references orcamentos(id) on delete set null,
  cliente_id uuid not null references clientes(id) on delete restrict,
  condicao_pagamento_id uuid references condicoes_pagamento(id),
  status pedido_status not null default 'ABERTO',
  data_emissao date not null default current_date,
  previsao_entrega date,
  total numeric(14,2) not null default 0,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pedidos_cliente on pedidos (cliente_id);

create table if not exists pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  solucao_id uuid references solucoes(id) on delete restrict,
  fornecedor_id uuid references fornecedores(id) on delete set null,
  descricao text not null,
  quantidade numeric(14,3) not null default 1,
  preco_unitario numeric(14,2) not null default 0,
  custo_unitario numeric(14,2) not null default 0,
  desconto numeric(14,2) not null default 0,
  total numeric(14,2) generated always as
    ((quantidade * preco_unitario) - desconto) stored,
  ordem int not null default 0
);
create index if not exists idx_pedido_itens_ped on pedido_itens (pedido_id);

-- =====================================================================
-- NOTAS FISCAIS
-- =====================================================================
create table if not exists notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  tipo nf_tipo not null,                 -- SAIDA (cliente) | ENTRADA (fornecedor)
  numero text not null,
  serie text,
  chave text unique,
  pedido_id uuid references pedidos(id) on delete set null,
  cliente_id uuid references clientes(id),
  fornecedor_id uuid references fornecedores(id),
  condicao_pagamento_id uuid references condicoes_pagamento(id),
  data_emissao date not null default current_date,
  valor_total numeric(14,2) not null default 0,
  status nf_status not null default 'EMITIDA',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_nf_pedido on notas_fiscais (pedido_id);
create index if not exists idx_nf_tipo on notas_fiscais (tipo);

-- =====================================================================
-- FINANCEIRO
-- =====================================================================

-- Participantes do split (quem ganha % de quê)
create table if not exists participantes_financeiros (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  agente_id uuid not null references agentes_comerciais(id) on delete restrict,
  percentual numeric(7,4) not null,      -- 0–100
  papel text,                            -- "hub", "agente", "sócio"
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_part_fin_pedido on participantes_financeiros (pedido_id);

create table if not exists contas_receber (
  id uuid primary key default gen_random_uuid(),
  nota_fiscal_id uuid references notas_fiscais(id) on delete set null,
  pedido_id uuid references pedidos(id) on delete set null,
  cliente_id uuid references clientes(id),
  agente_id uuid references agentes_comerciais(id),  -- proprietário do recebível
  parcela int not null default 1,
  vencimento date not null,
  valor numeric(14,2) not null,
  valor_recebido numeric(14,2) not null default 0,
  data_recebimento date,
  status financeiro_status not null default 'PREVISTO',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cr_vencimento on contas_receber (vencimento);
create index if not exists idx_cr_status on contas_receber (status);

create table if not exists contas_pagar (
  id uuid primary key default gen_random_uuid(),
  nota_fiscal_id uuid references notas_fiscais(id) on delete set null,
  pedido_id uuid references pedidos(id) on delete set null,
  fornecedor_id uuid references fornecedores(id),
  agente_id uuid references agentes_comerciais(id),  -- p/ comissões/repasse
  categoria text,                                    -- "fornecedor","comissao","custo"
  parcela int not null default 1,
  vencimento date not null,
  valor numeric(14,2) not null,
  valor_pago numeric(14,2) not null default 0,
  data_pagamento date,
  status financeiro_status not null default 'PREVISTO',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cp_vencimento on contas_pagar (vencimento);
create index if not exists idx_cp_status on contas_pagar (status);

-- =====================================================================
-- TRIGGER: updated_at
-- =====================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'clientes','fornecedores','agentes_comerciais','solucoes',
      'orcamentos','pedidos','notas_fiscais','contas_receber','contas_pagar'
    ])
  loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- =====================================================================
-- RLS — MVP sem auth: liberado para anon/authenticated
-- (Quando habilitar login, troque por policies baseadas em auth.uid())
-- =====================================================================
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'clientes','fornecedores','agentes_comerciais','tipos_produto','solucoes',
      'contatos','enderecos','condicoes_pagamento','condicao_parcelas',
      'orcamentos','orcamento_itens','pedidos','pedido_itens',
      'notas_fiscais','participantes_financeiros','contas_receber','contas_pagar'
    ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "mvp_all_%1$s" on %1$s;', t);
    execute format(
      'create policy "mvp_all_%1$s" on %1$s
        for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;

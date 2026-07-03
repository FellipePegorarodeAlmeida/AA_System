-- ==============================================================================
-- DUMP DE ESTRUTURA (SCHEMA) - GRAPHFLOW SUITE (LFA SOLUÇÕES)
-- Este script cria todas as tabelas, tipos, funções, views e triggers.
-- Não contém dados (INSERTs).
-- ==============================================================================

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. ENUM TYPES (TIPOS CUSTOMIZADOS)
-- ==========================================
CREATE TYPE public.pessoa_tipo AS ENUM ('PF', 'PJ');
CREATE TYPE public.modelo_operacao AS ENUM ('REPRESENTACAO', 'REVENDA');
CREATE TYPE public.orcamento_status AS ENUM (
  'RASCUNHO', 'EM_NEGOCIACAO', 'ENVIADO', 'APROVADO', 
  'APROVADO_COMERCIALMENTE', 'CONVERTIDO_EM_PEDIDO', 'PERDIDO', 'CANCELADO'
);
CREATE TYPE public.pedido_status AS ENUM ('ABERTO', 'EM_PRODUCAO', 'CONCLUIDO', 'CANCELADO');
CREATE TYPE public.nf_tipo AS ENUM ('SAIDA', 'ENTRADA');
CREATE TYPE public.nf_status AS ENUM ('EMITIDA', 'CANCELADA');
CREATE TYPE public.financeiro_status AS ENUM ('PREVISTO', 'PAGO', 'RECEBIDO', 'CANCELADO');
CREATE TYPE public.endereco_tipo AS ENUM ('COBRANCA', 'ENTREGA', 'FATURAMENTO', 'OUTRO');
CREATE TYPE public.contato_owner AS ENUM ('cliente', 'fornecedor', 'agente');
CREATE TYPE public.quantidade_unidade_tipo AS ENUM ('unidade', 'cento', 'milheiro');
CREATE TYPE public.fornecedor_tipo_preco AS ENUM ('unitario', 'cento', 'mil');
CREATE TYPE public.modo_calculo_revenda AS ENUM ('VALOR_FINAL', 'MARGEM');

-- ==========================================
-- 3. TABLES
-- ==========================================

CREATE TABLE public.clientes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo public.pessoa_tipo NOT NULL,
    nome text NOT NULL,
    nome_secundario text,
    documento text,
    inscricao_estadual text,
    email text,
    telefone text,
    observacoes text,
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    uf text,
    pais text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.fornecedores (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo public.pessoa_tipo NOT NULL,
    nome text NOT NULL,
    documento text,
    inscricao_estadual text,
    email text,
    telefone text,
    observacoes text,
    nome_contato text,
    cep text,
    endereco text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    estado text,
    pais text,
    tem_agente boolean DEFAULT false,
    agente_id uuid,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.agentes_comerciais (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome text NOT NULL,
    documento text,
    email text,
    telefone text,
    papel text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Relacionamento pendente na tabela fornecedores
ALTER TABLE public.fornecedores 
ADD CONSTRAINT fk_fornecedores_agente 
FOREIGN KEY (agente_id) REFERENCES public.agentes_comerciais(id);

CREATE TABLE public.tipos_produto (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.solucoes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo_produto_id uuid NOT NULL REFERENCES public.tipos_produto(id),
    nome text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.fornecedor_solucoes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
    solucao_id uuid NOT NULL REFERENCES public.solucoes(id),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(fornecedor_id, solucao_id)
);

CREATE TABLE public.contatos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_type public.contato_owner NOT NULL,
    owner_id uuid NOT NULL,
    nome text NOT NULL,
    cargo text,
    email text,
    telefone text,
    whatsapp text,
    principal boolean DEFAULT false,
    ativo boolean DEFAULT true,
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.enderecos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_type public.contato_owner NOT NULL,
    owner_id uuid NOT NULL,
    tipo public.endereco_tipo NOT NULL,
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    uf text,
    pais text,
    principal boolean DEFAULT false,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.condicoes_pagamento (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.condicao_parcelas (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    condicao_id uuid NOT NULL REFERENCES public.condicoes_pagamento(id) ON DELETE CASCADE,
    numero integer NOT NULL,
    dias integer NOT NULL,
    percentual numeric NOT NULL
);

CREATE TABLE public.orcamentos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero serial,
    cliente_id uuid NOT NULL REFERENCES public.clientes(id),
    modelo_operacao public.modelo_operacao NOT NULL,
    titulo text NOT NULL,
    status public.orcamento_status DEFAULT 'RASCUNHO',
    condicao_pagamento_id uuid REFERENCES public.condicoes_pagamento(id),
    frete_extra numeric DEFAULT 0,
    imposto_percentual_estimado numeric DEFAULT 0,
    imposto_valor_estimado numeric DEFAULT 0,
    observacoes text,
    agente_id uuid REFERENCES public.agentes_comerciais(id),
    convertido_pedido_id uuid, -- FK pendente (pedidos)
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.orcamento_itens (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
    solucao_id uuid REFERENCES public.solucoes(id),
    fornecedor_id uuid REFERENCES public.fornecedores(id),
    descricao text NOT NULL,
    tipo_producao text,
    prazo_estimado text,
    formato text,
    largura_mm numeric,
    altura_mm numeric,
    substrato text,
    acabamentos text,
    observacoes_tecnicas text,
    fornecedor_valor_total numeric DEFAULT 0,
    fornecedor_tipo_preco public.fornecedor_tipo_preco DEFAULT 'unitario',
    fornecedor_numero_proposta text,
    quantidade integer DEFAULT 1,
    quantidade_unidade public.quantidade_unidade_tipo DEFAULT 'unidade',
    preco_unitario numeric DEFAULT 0,
    desconto numeric DEFAULT 0,
    total numeric DEFAULT 0,
    ordem integer DEFAULT 1,
    incluir_na_proposta boolean DEFAULT true,
    ordem_proposta integer DEFAULT 1
);

CREATE TABLE public.orcamento_fechamento (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE UNIQUE,
    modo_calculo_revenda public.modo_calculo_revenda DEFAULT 'VALOR_FINAL',
    valor_base_proposta numeric DEFAULT 0,
    custo_total numeric DEFAULT 0,
    valor_final_venda numeric DEFAULT 0,
    frete_extra numeric DEFAULT 0,
    taxa_financeira_percentual numeric DEFAULT 0,
    taxa_financeira_valor numeric DEFAULT 0,
    comissao_agente_percentual numeric DEFAULT 0,
    comissao_agente_valor numeric DEFAULT 0,
    imposto_percentual numeric DEFAULT 0,
    imposto_valor numeric DEFAULT 0,
    margem_lfa_valor numeric DEFAULT 0,
    margem_lfa_percentual numeric DEFAULT 0,
    receita_bruta_lfa numeric DEFAULT 0,
    receita_liquida_lfa numeric DEFAULT 0,
    comissao_total_percentual numeric DEFAULT 0,
    comissao_total_valor numeric DEFAULT 0,
    comissao_lfa_percentual numeric DEFAULT 0,
    comissao_lfa_valor numeric DEFAULT 0,
    modelo_operacao_snapshot text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.pedidos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero serial,
    orcamento_id uuid REFERENCES public.orcamentos(id),
    cliente_id uuid NOT NULL REFERENCES public.clientes(id),
    contato_id uuid,
    agente_id uuid REFERENCES public.agentes_comerciais(id),
    modelo_operacao public.modelo_operacao NOT NULL,
    condicao_pagamento_id uuid REFERENCES public.condicoes_pagamento(id),
    status public.pedido_status DEFAULT 'ABERTO',
    data_emissao timestamp with time zone DEFAULT now(),
    previsao_entrega timestamp with time zone,
    numero_nf text,
    data_emissao_nf timestamp with time zone,
    observacoes_operacionais text,
    total numeric DEFAULT 0,
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Resolve FK pendente
ALTER TABLE public.orcamentos 
ADD CONSTRAINT fk_orcamentos_convertido_pedido 
FOREIGN KEY (convertido_pedido_id) REFERENCES public.pedidos(id);

CREATE TABLE public.pedido_itens (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero serial, -- Item sequencial global #123
    pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    solucao_id uuid REFERENCES public.solucoes(id),
    fornecedor_id uuid REFERENCES public.fornecedores(id),
    descricao text NOT NULL,
    descricao_tecnica text,
    quantidade integer DEFAULT 1,
    preco_unitario numeric DEFAULT 0,
    custo_unitario numeric DEFAULT 0,
    desconto numeric DEFAULT 0,
    total numeric DEFAULT 0,
    ordem integer DEFAULT 1,
    formato text,
    substrato text,
    acabamentos text,
    observacoes_tecnicas text
);

CREATE TABLE public.pedido_fechamento (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE UNIQUE,
    valor_final_venda numeric DEFAULT 0,
    comissao_lfa_valor numeric DEFAULT 0,
    imposto_valor numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.pedido_historico (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    tipo text,
    descricao text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.notas_fiscais (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo public.nf_tipo NOT NULL,
    numero text NOT NULL,
    serie text,
    chave text,
    pedido_id uuid REFERENCES public.pedidos(id),
    cliente_id uuid REFERENCES public.clientes(id),
    fornecedor_id uuid REFERENCES public.fornecedores(id),
    condicao_pagamento_id uuid REFERENCES public.condicoes_pagamento(id),
    data_emissao timestamp with time zone NOT NULL,
    valor_total numeric NOT NULL,
    status public.nf_status DEFAULT 'EMITIDA',
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.contas_receber (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nota_fiscal_id uuid REFERENCES public.notas_fiscais(id),
    pedido_id uuid REFERENCES public.pedidos(id),
    cliente_id uuid REFERENCES public.clientes(id),
    agente_id uuid REFERENCES public.agentes_comerciais(id),
    parcela integer DEFAULT 1,
    vencimento timestamp with time zone NOT NULL,
    valor numeric NOT NULL,
    valor_recebido numeric DEFAULT 0,
    data_recebimento timestamp with time zone,
    status public.financeiro_status DEFAULT 'PREVISTO',
    categoria text,
    observacoes text
);

CREATE TABLE public.contas_pagar (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nota_fiscal_id uuid REFERENCES public.notas_fiscais(id),
    pedido_id uuid REFERENCES public.pedidos(id),
    fornecedor_id uuid REFERENCES public.fornecedores(id),
    agente_id uuid REFERENCES public.agentes_comerciais(id),
    categoria text,
    parcela integer DEFAULT 1,
    vencimento timestamp with time zone NOT NULL,
    valor numeric NOT NULL,
    valor_pago numeric DEFAULT 0,
    data_pagamento timestamp with time zone,
    status public.financeiro_status DEFAULT 'PREVISTO',
    observacoes text
);

-- ==========================================
-- 4. VIEWS
-- ==========================================

CREATE OR REPLACE VIEW public.vw_pedidos_listagem AS
SELECT 
    p.id,
    p.numero,
    p.cliente_id,
    p.modelo_operacao,
    p.status,
    p.data_emissao,
    p.total AS valor_total_pedido,
    p.orcamento_id,
    p.created_at,
    (SELECT sum(pi.quantidade) FROM public.pedido_itens pi WHERE pi.pedido_id = p.id) AS qtd_itens,
    false AS is_bonificado
FROM public.pedidos p;

CREATE OR REPLACE VIEW public.vw_orcamentos_listagem AS
SELECT 
    o.id,
    o.numero,
    o.titulo,
    o.cliente_id,
    o.modelo_operacao,
    o.status,
    o.convertido_pedido_id,
    o.created_at,
    (SELECT sum(oi.quantidade) FROM public.orcamento_itens oi WHERE oi.orcamento_id = o.id AND oi.incluir_na_proposta = true) AS qtd_itens,
    COALESCE(
      (SELECT f.valor_final_venda FROM public.orcamento_fechamento f WHERE f.orcamento_id = o.id LIMIT 1),
      (SELECT f.valor_base_proposta FROM public.orcamento_fechamento f WHERE f.orcamento_id = o.id LIMIT 1)
    ) AS valor_total
FROM public.orcamentos o;

CREATE OR REPLACE VIEW public.vw_orcamento_detalhe AS
SELECT 
    o.*
FROM public.orcamentos o;

-- ==========================================
-- 5. FUNCTIONS (RPCs)
-- ==========================================

CREATE OR REPLACE FUNCTION public.abrir_pedido_v2(p_orcamento_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido_id uuid;
    v_total numeric := 0;
    v_modelo_operacao text;
    v_fechamento RECORD;
BEGIN
    SELECT modelo_operacao INTO v_modelo_operacao FROM public.orcamentos WHERE id = p_orcamento_id;

    SELECT * INTO v_fechamento FROM public.orcamento_fechamento WHERE orcamento_id = p_orcamento_id;

    v_total := CASE 
        WHEN v_modelo_operacao = 'REVENDA' THEN v_fechamento.valor_final_venda
        ELSE v_fechamento.valor_base_proposta 
    END;

    INSERT INTO public.pedidos (
        orcamento_id, cliente_id, agente_id, modelo_operacao, condicao_pagamento_id, status, data_emissao, total
    )
    SELECT 
        id, cliente_id, agente_id, modelo_operacao, condicao_pagamento_id, 'ABERTO', now(), COALESCE(v_total, 0)
    FROM public.orcamentos
    WHERE id = p_orcamento_id
    RETURNING id INTO v_pedido_id;

    INSERT INTO public.pedido_itens (
        pedido_id, solucao_id, fornecedor_id, descricao, descricao_tecnica, quantidade, 
        preco_unitario, custo_unitario, desconto, ordem, formato, substrato, acabamentos, observacoes_tecnicas
    )
    SELECT 
        v_pedido_id, solucao_id, fornecedor_id, descricao, observacoes_tecnicas, quantidade, 
        preco_unitario, (fornecedor_valor_total / GREATEST(quantidade, 1)), desconto, ordem,
        formato, substrato, acabamentos, observacoes_tecnicas
    FROM public.orcamento_itens
    WHERE orcamento_id = p_orcamento_id AND incluir_na_proposta = true;

    INSERT INTO public.pedido_fechamento (pedido_id, valor_final_venda, comissao_lfa_valor, imposto_valor)
    VALUES (v_pedido_id, v_fechamento.valor_final_venda, v_fechamento.comissao_lfa_valor, v_fechamento.imposto_valor);

    UPDATE public.orcamentos 
    SET status = 'CONVERTIDO_EM_PEDIDO', convertido_pedido_id = v_pedido_id
    WHERE id = p_orcamento_id;

    RETURN v_pedido_id;
END;
$$;

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 6. TRIGGERS
-- ==========================================

CREATE TRIGGER set_updated_at_clientes
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_fornecedores
    BEFORE UPDATE ON public.fornecedores
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_orcamentos
    BEFORE UPDATE ON public.orcamentos
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_pedidos
    BEFORE UPDATE ON public.pedidos
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_notas_fiscais
    BEFORE UPDATE ON public.notas_fiscais
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

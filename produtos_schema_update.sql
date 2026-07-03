-- ==============================================================================
-- UPDATE DE SCHEMA: MÓDULO DE PRODUTOS/MATERIAL DE CONSUMO
-- ==============================================================================

-- 1. Cria a tabela pivô relacionando fornecedores com os novos produtos
CREATE TABLE IF NOT EXISTS public.fornecedor_produtos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
    produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(fornecedor_id, produto_id)
);

-- Habilitar RLS e criar política de acesso para a nova tabela
ALTER TABLE public.fornecedor_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a usuarios autenticados" ON public.fornecedor_produtos;
CREATE POLICY "Permitir acesso total a usuarios autenticados" 
    ON public.fornecedor_produtos 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 2. Alteração na tabela de itens do orçamento
-- Adiciona a coluna produto_id para quando o item for um consumível/material (Rótulo, Bobina, etc)
ALTER TABLE public.orcamento_itens 
ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.produtos(id);

-- 3. Alteração na tabela de itens do pedido 
-- Mantém a simetria para a transferência dos dados durante a conversão do orçamento
ALTER TABLE public.pedido_itens 
ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.produtos(id);

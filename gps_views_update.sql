-- ==============================================================================
-- RECONSTRUÇÃO DAS VIEWS DE PEDIDOS (BLUEPRINT ALINHADO COM O REACT)
-- ==============================================================================

-- 1. View de Listagem (Usada nas telas de Pedidos e Resultado LFA)
CREATE OR REPLACE VIEW public.vw_pedidos_listagem AS
SELECT 
    p.id,
    p.numero,
    p.orcamento_id,
    p.cliente_id,
    p.modelo_operacao,
    p.status,
    p.data_emissao,
    p.previsao_entrega,
    p.total AS valor_total_pedido,
    p.created_at,
    c.nome AS cliente_nome,
    c.documento AS cliente_documento
FROM public.pedidos p
LEFT JOIN public.clientes c ON c.id = p.cliente_id;

-- Habilitar acesso a VW
GRANT SELECT ON public.vw_pedidos_listagem TO authenticated;
GRANT SELECT ON public.vw_pedidos_listagem TO service_role;


-- 2. View de Detalhes (Usada na PedidoDetailPage)
CREATE OR REPLACE VIEW public.vw_pedido_detalhe AS
SELECT 
    p.id,
    p.numero,
    p.orcamento_id,
    o.numero AS orcamento_numero,
    p.cliente_id,
    c.nome AS cliente_nome,
    c.documento AS cliente_documento,
    p.contato_id,
    p.agente_id,
    p.modelo_operacao,
    p.condicao_pagamento_id,
    p.status,
    p.data_emissao,
    p.previsao_entrega,
    p.total AS valor_total_pedido,
    p.observacoes,
    p.numero_nf,
    p.data_emissao_nf,
    p.observacoes_operacionais,
    p.created_at,
    p.updated_at
FROM public.pedidos p
LEFT JOIN public.clientes c ON c.id = p.cliente_id
LEFT JOIN public.orcamentos o ON o.id = p.orcamento_id;

-- Habilitar acesso a VW
GRANT SELECT ON public.vw_pedido_detalhe TO authenticated;
GRANT SELECT ON public.vw_pedido_detalhe TO service_role;

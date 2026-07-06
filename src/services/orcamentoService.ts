import { supabase } from "@/lib/supabase";

export const orcamentoService = {
  async getOrcamentos() {
    const { data, error } = await supabase
      .from("vw_orcamentos_listagem")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Busca todos os dados necessários para a Confirmação de Compra (impressão para o cliente).
   * REGRA: Nunca expõe comissão LFA, custos de fornecedor ou dados internos de negócio.
   */
  async getOrcamentoParaImpressao(orcamentoId: string) {
    // 1. Dados do orçamento + cliente (com CNPJ e IE)
    const { data: orcData, error: orcErr } = await supabase
      .from("orcamentos")
      .select(`
        *,
        cliente:clientes(id, nome, documento, inscricao_estadual)
      `)
      .eq("id", orcamentoId)
      .single();

    if (orcErr) throw orcErr;

    // 2. Itens da proposta (apenas os marcados para incluir na proposta)
    const { data: itensData, error: itensErr } = await supabase
      .from("orcamento_itens")
      .select(
        "id, descricao, quantidade, quantidade_unidade, preco_unitario, total, " +
        "ordem_proposta, formato, largura_mm, altura_mm, substrato, acabamentos, prazo_estimado, fornecedor_id, especificacao_tecnica"
      )
      .eq("orcamento_id", orcamentoId)
      .eq("incluir_na_proposta", true)
      .order("ordem_proposta", { ascending: true });

    if (itensErr) throw itensErr;

    // 3. Contato selecionado
    let contatoData = null;
    if (orcData?.contato_id) {
      const { data } = await supabase
        .from("contatos")
        .select("id, nome, cargo, email, telefone")
        .eq("id", orcData.contato_id)
        .maybeSingle();
      contatoData = data;
    }

    // 4. Endereço de entrega selecionado
    let enderecoData = null;
    if (orcData?.endereco_entrega_id) {
      const { data } = await supabase
        .from("enderecos")
        .select("logradouro, numero, complemento, bairro, cidade, uf, cep")
        .eq("id", orcData.endereco_entrega_id)
        .maybeSingle();
      enderecoData = data;
    }

    // 5. Condição de pagamento do CLIENTE
    let condicaoPagamentoData = null;
    if (orcData?.condicao_pagamento_id) {
      const { data } = await supabase
        .from("condicoes_pagamento")
        .select("nome")
        .eq("id", orcData.condicao_pagamento_id)
        .maybeSingle();
      condicaoPagamentoData = data;
    }

    // 6. Fornecedor principal dos itens (para endosso no documento)
    let fornecedorData = null;
    const fornecedorIds = [
      ...new Set((itensData || []).map((i: any) => i.fornecedor_id).filter(Boolean))
    ];
    if (fornecedorIds.length > 0) {
      const { data } = await supabase
        .from("fornecedores")
        .select("nome, documento, cidade")
        .eq("id", fornecedorIds[0])
        .maybeSingle();
      fornecedorData = data;
    }

    // 7. Agente comercial (Consultor/Representante)
    let agenteData = null;
    if (orcData?.agente_id) {
      const { data } = await supabase
        .from("agentes_comerciais")
        .select("nome")
        .eq("id", orcData.agente_id)
        .maybeSingle();
      agenteData = data;
    }

    return {
      orcamento: orcData,
      itens: itensData || [],
      contato: contatoData,
      endereco: enderecoData,
      condicaoPagamento: condicaoPagamentoData,
      fornecedor: fornecedorData,
      agente: agenteData,
    };
  },

  async abrirPedido(orcamentoId: string) {
    const { data, error } = await supabase
      .rpc("abrir_pedidos_fracionados", { p_orcamento_id: orcamentoId });

    if (error) throw error;

    const pedidosIds = data as string[];

    if (!pedidosIds || pedidosIds.length === 0) throw new Error("Nenhum pedido foi gerado pela conversão.");

    if (pedidosIds.length > 0) {
      // Herda todos os campos operacionais do orçamento para o pedido
      const { data: orcData } = await supabase
        .from("orcamentos")
        .select("contato_id, endereco_entrega_id, modalidade_frete_id, condicao_pagamento_id")
        .eq("id", orcamentoId)
        .single();

      if (orcData) {
        const pedidoPayload: Record<string, any> = {};

        if (orcData.contato_id)         pedidoPayload.contato_id          = orcData.contato_id;
        if (orcData.endereco_entrega_id) pedidoPayload.endereco_entrega_id = orcData.endereco_entrega_id;
        if (orcData.modalidade_frete_id)    pedidoPayload.modalidade_frete_id    = orcData.modalidade_frete_id;
        if (orcData.condicao_pagamento_id) pedidoPayload.condicao_pagamento_id = orcData.condicao_pagamento_id;

        if (Object.keys(pedidoPayload).length > 0) {
          await supabase
            .from("pedidos")
            .update(pedidoPayload)
            .in("id", pedidosIds);
        }
      }
    }

    return pedidosIds; // Retorna o array de IDs dos novos pedidos criados
  },

  async duplicarOrcamento(orcamentoId: string) {
    const { data, error } = await supabase.rpc("duplicar_orcamento", { p_orcamento_id: orcamentoId });
    if (error) throw error;
    return data as string;
  }
};

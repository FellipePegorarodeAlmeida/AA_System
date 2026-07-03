import { supabase } from "@/lib/supabase";

export const pedidoService = {
  async getPedidos() {
    const { data, error } = await supabase
      .from("vw_pedidos_listagem")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Busca todos os dados necessários para o Espelho de Produção (impressão).
   * Inclui CNPJ/IE do cliente, contato selecionado, endereço de entrega e itens com dimensões.
   */
  async getPedidoParaImpressao(pedidoId: string) {
    // 1. Dados principais do pedido + cliente (com CNPJ e IE).
    //    Traz condicao_pagamento_fornecedor_id explicitamente — o join é feito
    //    em passo separado para evitar falha silenciosa com múltiplas FKs.
    const { data: pedidoData, error: pedidoErr } = await supabase
      .from("pedidos")
      .select(`
        *,
        cliente:clientes(
          id, nome, documento, inscricao_estadual
        ),
        modalidade_frete:modalidades_frete(nome)
      `)
      .eq("id", pedidoId)
      .single();

    if (pedidoErr) throw pedidoErr;

    // 2. View com campos calculados (cliente_nome, numero_nf, etc.)
    const { data: vwData } = await supabase
      .from("vw_pedido_detalhe")
      .select("*")
      .eq("id", pedidoId)
      .maybeSingle();

    // 3. Itens com fornecedor (inclui largura_mm e altura_mm via select *)
    const { data: itensData, error: itensErr } = await supabase
      .from("pedido_itens")
      .select("*, fornecedor:fornecedores(nome)")
      .eq("pedido_id", pedidoId)
      .order("ordem", { ascending: true });

    if (itensErr) throw itensErr;

    // 4. Fechamento financeiro
    const { data: fechamentoData } = await supabase
      .from("pedido_fechamento")
      .select("id, pedido_id, comissao_lfa_valor, receita_bruta_lfa, receita_liquida_lfa, imposto_valor")
      .eq("pedido_id", pedidoId)
      .maybeSingle();

    // 5. Contato selecionado (se houver)
    let contatoData = null;
    if (pedidoData?.contato_id) {
      const { data } = await supabase
        .from("contatos")
        .select("id, nome, cargo, email, telefone")
        .eq("id", pedidoData.contato_id)
        .maybeSingle();
      contatoData = data;
    }

    // 6. Endereço de entrega selecionado (se houver)
    let enderecoData = null;
    if (pedidoData?.endereco_entrega_id) {
      const { data } = await supabase
        .from("enderecos")
        .select("*")
        .eq("id", pedidoData.endereco_entrega_id)
        .maybeSingle();
      enderecoData = data;
    }

    // 7. Condição de pagamento do FORNECEDOR — query explícita e segura.
    //    REGRA: Para REVENDA, existe condicao_pagamento_fornecedor_id separado.
    //           Para REPRESENTAÇÃO, o campo fornecedor é null — usa condicao_pagamento_id
    //           (que é o único campo visível no editor para esse modelo).
    let condicaoFornecedorData: { nome: string } | null = null;
    const fornecedorCondId = (
      pedidoData?.condicao_pagamento_fornecedor_id || // REVENDA: condição específica do fornecedor
      pedidoData?.condicao_pagamento_id               // REPRESENTAÇÃO: condição geral (única existente)
    ) as string | null;

    if (fornecedorCondId) {
      const { data } = await supabase
        .from("condicoes_pagamento")
        .select("nome")
        .eq("id", fornecedorCondId)
        .maybeSingle();
      condicaoFornecedorData = data;
    }

    // DEBUG — confirma que o ID chega e o nome é resolvido. Remover após validação.
    console.log(
      "[Impressão] DEBUG CONDIÇÃO FORNECEDOR:",
      "modelo =", pedidoData?.modelo_operacao,
      "| fornecedor_id =", pedidoData?.condicao_pagamento_fornecedor_id,
      "| cliente_id =", pedidoData?.condicao_pagamento_id,
      "| id_usado =", fornecedorCondId,
      "| nome resolvido =", condicaoFornecedorData?.nome ?? "(null)"
    );

    // Mescla os dados da view (campos calculados) com os dados brutos do pedido.
    // Os campos de join (cliente, condicao_fornecedor) são explicitamente fixados
    // porque a view não os conhece e os sobrescreveria com undefined.
    const pedidoMerged = {
      ...pedidoData,
      ...(vwData || {}),
      // Campos da tabela pedidos que não devem ser sobrescritos pela view
      cliente: pedidoData.cliente,
      condicao_fornecedor: condicaoFornecedorData,
    };

    return {
      pedido: pedidoMerged,
      itens: itensData || [],
      fechamento: fechamentoData,
      contato: contatoData,
      endereco: enderecoData,
    };
  },

  async faturarPedido(pedidoId: string) {
    const { data, error } = await supabase
      .rpc("gerar_faturamento_pedido", { p_pedido_id: pedidoId });

    if (error) throw error;
    return data;
  },

  async simularFaturamento(pedidoId: string, dataBase?: string, condicaoId?: string, condicaoFornecedorId?: string) {
    const { data, error } = await supabase
      .rpc("simular_faturamento_pedido", { 
        p_pedido_id: pedidoId,
        p_data_base: dataBase || null,
        p_cond_cliente_id: condicaoId || null,
        p_cond_fornecedor_id: condicaoFornecedorId || null
      });

    if (error) throw error;
    return data;
  },

  async gerarFinanceiroNf(notaFiscalId: string) {
    const { data, error } = await supabase
      .rpc("gerar_financeiro_nf", { p_nota_fiscal_id: notaFiscalId });

    if (error) throw error;
    return data;
  },

  async updatePedidoFechamento(pedidoId: string, payload: any) {
    const { data, error } = await supabase
      .from("pedido_fechamento")
      .update(payload)
      .eq("pedido_id", pedidoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePedido(pedidoId: string, payload: any) {
    const { data, error } = await supabase
      .from("pedidos")
      .update(payload)
      .eq("id", pedidoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePedidoItem(itemId: string, payload: any) {
    const { data, error } = await supabase
      .from("pedido_itens")
      .update(payload)
      .eq("id", itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLancamentosFinanceiros(pedidoId: string) {
    const [receberRes, pagarRes] = await Promise.all([
      supabase.from("contas_receber").select("*").eq("pedido_id", pedidoId).order("data_vencimento"),
      supabase.from("contas_pagar").select("*").eq("pedido_id", pedidoId).order("data_vencimento")
    ]);
    
    if (receberRes.error) throw receberRes.error;
    if (pagarRes.error) throw pagarRes.error;

    const lancamentosReceber = (receberRes.data || []).map(l => ({ ...l, tipo_lancamento: 'RECEBER' }));
    const lancamentosPagar = (pagarRes.data || []).map(l => ({ ...l, tipo_lancamento: 'PAGAR' }));
    
    // Unifica e ordena por data de vencimento
    const unificados = [...lancamentosReceber, ...lancamentosPagar].sort(
      (a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
    );
    
    return unificados;
  }
};

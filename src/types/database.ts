// Tipos manuais (sem geração via CLI). Cobrem o necessário para o CRUD do MVP.
export type PessoaTipo = "PF" | "PJ";
export type ModeloOperacao = "REPRESENTACAO" | "REVENDA";
export type OrcamentoStatus =
  | "RASCUNHO" | "EM_NEGOCIACAO" | "ENVIADO" | "APROVADO" | "APROVADO_COMERCIALMENTE" | "CONVERTIDO_EM_PEDIDO" | "PERDIDO" | "CANCELADO";
export type PedidoStatus =
  | "ABERTO" | "EM_PRODUCAO" | "CONCLUIDO" | "CANCELADO";
export type NfTipo = "SAIDA" | "ENTRADA";
export type NfStatus = "EMITIDA" | "CANCELADA";
export type FinanceiroStatus = "PREVISTO" | "PAGO" | "RECEBIDO" | "CANCELADO";
export type EnderecoTipo = "COBRANCA" | "ENTREGA" | "FATURAMENTO" | "OUTRO";
export type ContatoOwner = "cliente" | "fornecedor" | "agente";

export interface Cliente {
  id: string;
  tipo: PessoaTipo;
  nome: string;
  nome_secundario: string | null;
  documento: string | null;
  inscricao_estadual: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  pais: string | null;
  condicao_pagamento_id?: string | null;
  modalidade_frete_id?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
export type ClienteInsert = Omit<Cliente, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

export interface Fornecedor {
  id: string;
  tipo: PessoaTipo;
  nome: string;
  documento: string | null;
  inscricao_estadual: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  nome_contato: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  tem_agente: boolean;
  agente_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgenteComercial {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  papel: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TipoProduto {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Solucao {
  id: string;
  tipo_produto_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FornecedorSolucao {
  id: string;
  fornecedor_id: string;
  solucao_id: string;
  created_at: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FornecedorProduto {
  id: string;
  fornecedor_id: string;
  created_at: string;
}

export interface Contato {
  id: string;
  owner_type: ContatoOwner;
  owner_id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  principal: boolean;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Endereco {
  id: string;
  owner_type: ContatoOwner;
  owner_id: string;
  tipo: EnderecoTipo;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  pais: string | null;
  principal: boolean;
  ativo: boolean;
  created_at: string;
}

export interface CondicaoPagamento {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

export interface CondicaoParcela {
  id: string;
  condicao_id: string;
  numero: number;
  dias: number;
  percentual: number;
}

export interface Orcamento {
  id: string;
  numero: number;
  cliente_id: string;
  modelo_operacao: "REPRESENTACAO" | "REVENDA";
  titulo: string;
  status: OrcamentoStatus;
  condicao_pagamento_id: string | null;
  modalidade_frete_id?: string | null;
  imposto_percentual_estimado: number;
  imposto_valor_estimado: number;
  observacoes: string | null;
  agente_id: string | null;
  contato_id: string | null;
  endereco_entrega_id: string | null;
  convertido_pedido_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  solucao_id: string | null;
  fornecedor_id: string | null;
  descricao: string;
  tipo_producao: string;
  prazo_estimado: string | null;
  formato: string | null;
  largura_mm: number | null;
  altura_mm: number | null;
  substrato: string | null;
  acabamentos: string | null;
  observacoes_tecnicas: string | null;
  fornecedor_valor_total: number;
  fornecedor_tipo_preco: "unitario" | "cento" | "mil";
  fornecedor_numero_proposta: string | null;
  quantidade: number;
  quantidade_unidade: "unidade" | "cento" | "milheiro";
  preco_unitario: number;
  desconto: number;
  total: number;
  ordem: number;
  incluir_na_proposta: boolean;
  ordem_proposta: number;
  cenario_id: string | null;
  nome_opcao: string | null;
  tipo_cenario: 'PRINCIPAL' | 'OPCAO_QUANTIDADE' | 'OPCAO_ESPECIFICACAO' | null;
  is_cenario_sugerido: boolean | null;
  aprovado_pelo_cliente: boolean | null;
  comissao_agente_percentual: number | null;
  comissao_lfa_percentual: number | null;
  especificacao_tecnica?: Record<string, any> | null;
}

export interface Pedido {
  id: string;
  numero: number;
  orcamento_id: string | null;
  cliente_id: string;
  contato_id: string | null;
  agente_id: string | null;
  modelo_operacao: ModeloOperacao;
  condicao_pagamento_id: string | null;
  status: PedidoStatus;
  data_emissao: string;
  previsao_entrega: string | null;
  total: number | null;
  observacoes: string | null;
  numero_nf: string | null;
  data_emissao_nf: string | null;
  observacoes_operacionais: string | null;
  tipo_prova?: string | null;
  modalidade_frete_id?: string | null;
  valor_frete?: number | null;
  endereco_entrega_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  numero?: number;
  solucao_id: string | null;
  fornecedor_id: string | null;
  descricao: string;
  descricao_tecnica: string | null;
  quantidade: number;
  preco_unitario: number;
  custo_unitario: number;
  desconto: number;
  total: number;
  ordem: number;
  formato?: string | null;
  largura?: number | null;
  altura?: number | null;
  largura_mm?: number | null;
  altura_mm?: number | null;
  unidade_medida?: string | null;
  substrato?: string | null;
  acabamentos?: string | null;
  fornecedor_numero_proposta?: string | null;
}

export interface NotaFiscal {
  id: string;
  tipo: NfTipo;
  numero: string;
  serie: string | null;
  chave: string | null;
  pedido_id: string | null;
  cliente_id: string | null;
  fornecedor_id: string | null;
  condicao_pagamento_id: string | null;
  data_emissao: string;
  valor_total: number;
  status: NfStatus;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContaReceber {
  id: string;
  nota_fiscal_id: string | null;
  pedido_id: string | null;
  cliente_id: string | null;
  agente_id: string | null;
  parcela: number;
  vencimento: string;
  valor: number;
  valor_recebido: number;
  data_recebimento: string | null;
  status: FinanceiroStatus;
  categoria: string | null;
  observacoes: string | null;
}

export interface ContaPagar {
  id: string;
  nota_fiscal_id: string | null;
  pedido_id: string | null;
  fornecedor_id: string | null;
  agente_id: string | null;
  categoria: string | null;
  parcela: number;
  vencimento: string;
  valor: number;
  valor_pago: number;
  data_pagamento: string | null;
  status: FinanceiroStatus;
  observacoes: string | null;
}

// Estrutura mínima para o client tipado.
type Row<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export interface OrcamentoFechamento {
  id: string;
  orcamento_id: string;
  modo_calculo_revenda: "VALOR_FINAL" | "MARGEM";
  valor_base_proposta: number;
  custo_total: number;
  valor_final_venda: number;
  taxa_financeira_percentual: number;
  taxa_financeira_valor: number;
  comissao_agente_percentual: number;
  comissao_agente_valor: number;
  imposto_percentual: number;
  imposto_valor: number;
  margem_lfa_valor: number;
  margem_lfa_percentual: number;
  receita_bruta_lfa: number;
  receita_liquida_lfa: number;
  comissao_total_percentual: number;
  comissao_total_valor: number;
  comissao_lfa_percentual: number;
  comissao_lfa_valor: number;
  modelo_operacao_snapshot: "REPRESENTACAO" | "REVENDA" | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      clientes: Row<Cliente>;
      fornecedores: Row<Fornecedor>;
      agentes_comerciais: Row<AgenteComercial>;
      tipos_produto: Row<TipoProduto>;
      solucoes: Row<Solucao>;
      fornecedor_solucoes: Row<FornecedorSolucao>;
      produtos: Row<Produto>;
      fornecedor_produtos: Row<FornecedorProduto>;
      contatos: Row<Contato>;
      enderecos: Row<Endereco>;
      condicoes_pagamento: Row<CondicaoPagamento>;
      condicao_parcelas: Row<CondicaoParcela>;
      orcamentos: Row<Orcamento>;
      orcamento_itens: Row<OrcamentoItem>;
      orcamento_fechamento: Row<OrcamentoFechamento>;
      pedidos: Row<Pedido>;
      pedido_itens: Row<PedidoItem>;
      notas_fiscais: Row<NotaFiscal>;
      contas_receber: Row<ContaReceber>;
      contas_pagar: Row<ContaPagar>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      pessoa_tipo: PessoaTipo;
      modelo_operacao: ModeloOperacao;
      orcamento_status: OrcamentoStatus;
      pedido_status: PedidoStatus;
      nf_tipo: NfTipo;
      nf_status: NfStatus;
      financeiro_status: FinanceiroStatus;
      endereco_tipo: EnderecoTipo;
    };
  };
}

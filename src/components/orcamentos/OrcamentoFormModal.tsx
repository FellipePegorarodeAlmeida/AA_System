import { useState, useEffect } from "react";
import { Plus, Copy, Trash2, Printer, ExternalLink, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useConvertPedido } from "@/hooks/use-orcamentos";
import { clientesService } from "@/services/clientesService";
import { EspecificacaoEditorialPanel } from "./EspecificacaoEditorialPanel";

// --- TIPAGENS BASE ---
const emptyHeader = {
  cliente_id: "",
  modelo_operacao: "REPRESENTACAO",
  titulo: "",
  condicao_pagamento_id: null,
  modalidade_frete_id: null,
  imposto_percentual_estimado: 6,
  imposto_valor_estimado: 0,
  agente_id: null,
  contato_id: null,
  endereco_entrega_id: null,
};

export function OrcamentoFormModal({ open, onOpenChange, editing, onSuccess }: any) {
  const { mutate: convertPedido, isPending: converting } = useConvertPedido();
  const navigate = useNavigate();

  // --- DICIONÁRIOS ---
  const [clientes, setClientes] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [solucoes, setSolucoes] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<any[]>([]);
  const [modalidadesFrete, setModalidadesFrete] = useState<any[]>([]);
  const [fornecedorSolucoes, setFornecedorSolucoes] = useState<any[]>([]);
  const [clienteContatos, setClienteContatos] = useState<any[]>([]);
  const [clienteEnderecos, setClienteEnderecos] = useState<any[]>([]);
  
  // --- ESTADOS DO FORMULÁRIO ---
  const [form, setForm] = useState<any>({ ...emptyHeader });
  const [savedId, setSavedId] = useState<string | null>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [fechamento, setFechamento] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("header");
  const [saving, setSaving] = useState(false);
  const [previewPedidoOpen, setPreviewPedidoOpen] = useState(false);

  const isLocked = form.status === "CONVERTIDO_EM_PEDIDO" || !!editing?.convertido_pedido_id;

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    async function loadData() {
      const [cli, forn, cond, ag, sol, modFrete, fornSol] = await Promise.all([
        supabase.from("clientes").select("id, nome, tem_agente, agente_id, modalidade_frete_id, condicao_pagamento_id").eq("ativo", true).order("nome"),
        supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("condicoes_pagamento").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("agentes_comerciais").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("solucoes").select("id, nome").eq("ativo", true).order("nome"),
        clientesService.getModalidadesFrete(),
        supabase.from("fornecedor_solucoes").select("fornecedor_id, solucao_id")
      ]);
      if (cli.data) setClientes(cli.data);
      if (forn.data) setFornecedores(forn.data);
      if (cond.data) setCondicoesPagamento(cond.data);
      if (ag.data) setAgentes(ag.data);
      if (sol.data) setSolucoes(sol.data);
      if (modFrete.data) setModalidadesFrete(modFrete.data);
      if (fornSol.data) setFornecedorSolucoes(fornSol.data);
    }
    loadData();
  }, []);

  // --- ABERTURA DO MODAL ---
  useEffect(() => {
    if (open) {
      if (editing) {
        setSavedId(editing.id);
        carregarOrcamentoCompleto(editing);
      } else {
        setSavedId(null);
        setForm({ ...emptyHeader });
        setItens([]);
        setFechamento(null);
        setActiveTab("header");
      }
    }
  }, [open, editing]);

  async function carregarOrcamentoCompleto(orc: any) {
    setForm({
      cliente_id: orc.cliente_id,
      modelo_operacao: orc.modelo_operacao,
      titulo: orc.titulo,
      status: orc.status,
      condicao_pagamento_id: orc.condicao_pagamento_id,
      modalidade_frete_id: orc.modalidade_frete_id || null,
      imposto_percentual_estimado: orc.imposto_percentual_estimado !== null ? orc.imposto_percentual_estimado : 6,
      imposto_valor_estimado: orc.imposto_valor_estimado,
      agente_id: orc.agente_id,
      contato_id: orc.contato_id,
      endereco_entrega_id: orc.endereco_entrega_id,
    });

    carregarDependenciasCliente(orc.cliente_id);

    const { data: itensData } = await supabase.from("orcamento_itens").select("*").eq("orcamento_id", orc.id).order("ordem");
    setItens(itensData || []);

    const { data: fechData } = await supabase.from("orcamento_fechamento").select("*").eq("orcamento_id", orc.id).maybeSingle();
    setFechamento(fechData);
    
    setActiveTab("header");
  }

  async function carregarDependenciasCliente(clienteId: string, setDefaults: boolean = false) {
    if (!clienteId) return;
    const [cont, end] = await Promise.all([
      supabase.from("contatos").select("*").eq("owner_type", "cliente").eq("owner_id", clienteId).eq("ativo", true),
      supabase.from("enderecos").select("*").eq("owner_type", "cliente").eq("owner_id", clienteId).eq("ativo", true)
    ]);
    
    const contatosList = cont.data || [];
    const enderecosList = end.data || [];
    
    setClienteContatos(contatosList);
    setClienteEnderecos(enderecosList);

    if (setDefaults) {
      const contatoPrincipal = contatosList.find((c: any) => c.principal);
      const enderecoPrincipal = enderecosList.find((e: any) => e.principal);
      
      setForm((prev: any) => ({
        ...prev,
        contato_id: contatoPrincipal ? contatoPrincipal.id : null,
        endereco_entrega_id: enderecoPrincipal ? enderecoPrincipal.id : null
      }));
    }
  }

  // --- AGRUPAMENTO PARA A TELA (PRODUTOS = ABAS) ---
  const produtos = itens.reduce((acc: any[], item: any) => {
    let grupo = acc.find(g => g.cenario_id === item.cenario_id);
    if (!grupo) {
      grupo = { cenario_id: item.cenario_id, nome_opcao: item.nome_opcao || "Novo Produto", specs: item, linhas: [] };
      acc.push(grupo);
    }
    grupo.linhas.push(item);
    return acc;
  }, []);

  // --- FUNÇÕES DE PRODUTO E MODELOS ---
  async function handleAddProduto() {
    if (!savedId || isLocked) return;
    const cid = crypto.randomUUID();
    
    const maxOrdemProposta = itens.reduce((max, item) => {
      const ordemProp = Number(item.ordem_proposta) || 0;
      return Math.max(max, ordemProp);
    }, 0);
    const nextOrdemProposta = maxOrdemProposta + 1;
    const nextOrdem = itens.length;

    const newItem = {
      id: crypto.randomUUID(),
      orcamento_id: savedId,
      cenario_id: cid,
      nome_opcao: `Produto ${produtos.length + 1}`,
      descricao: "Modelo Único",
      quantidade: 1000,
      quantidade_unidade: "unidade",
      fornecedor_valor_total: 0,
      total: 0,
      preco_unitario: 0,
      incluir_na_proposta: true,
      comissao_lfa_percentual: 0,
      comissao_agente_percentual: 0,
      ordem: nextOrdem,
      ordem_proposta: nextOrdemProposta,
      especificacao_tecnica: {}
    };
    const { data } = await supabase.from("orcamento_itens").insert(newItem).select().single();
    if (data) setItens([...itens, data]);
  }

  async function handleAddModelo(cenario_id: string) {
    if (!savedId || isLocked) return;
    const grupo = produtos.find(p => p.cenario_id === cenario_id);
    if (!grupo) return;
    
    // Herda tudo da última linha do grupo
    const lastItem = grupo.linhas[grupo.linhas.length - 1];
    
    const maxOrdemProposta = itens.reduce((max, item) => {
      const ordemProp = Number(item.ordem_proposta) || 0;
      return Math.max(max, ordemProp);
    }, 0);
    const nextOrdemProposta = maxOrdemProposta + 1;
    const nextOrdem = itens.length;

    const newItem = {
      ...lastItem,
      id: crypto.randomUUID(),
      descricao: lastItem.descricao + " (Cópia)",
      quantidade: lastItem.quantidade,
      total: 0, // Zera financeiro para forçar digitação
      fornecedor_valor_total: 0,
      preco_unitario: 0,
      ordem: nextOrdem,
      ordem_proposta: nextOrdemProposta,
      especificacao_tecnica: lastItem.especificacao_tecnica || {}
    };

    const { data } = await supabase.from("orcamento_itens").insert(newItem).select().single();
    if (data) setItens([...itens, data]);
  }

  async function updateItemBD(id: string, field: string, value: any) {
    if (isLocked) return;
    
    // Atualiza localmente imediato para a tela não piscar
    setItens(prev => prev.map(it => {
      if (it.id !== id) return it;
      const novo = { ...it, [field]: value };
      
      if (field === "fornecedor_valor_total") {
        const custoForn = Number(value) || 0;
        const qtd = Number(novo.quantidade) || 1;
        const precoUnit = custoForn / qtd;

        novo.fornecedor_valor_total = custoForn;
        novo.preco_unitario = precoUnit;
        novo.total = custoForn;
      } else if (field === "total" || field === "quantidade") {
        const qtd = Number(novo.quantidade) || 1;
        novo.preco_unitario = (Number(novo.total) || 0) / qtd;
      }
      return novo;
    }));

    // Envia pro banco
    const updatePayload: any = { [field]: value };
    const itemAtual = itens.find(i => i.id === id);
    
    if (field === "fornecedor_valor_total") {
      const custoForn = Number(value) || 0;
      const qtd = Number(itemAtual?.quantidade) || 1;
      const precoUnit = custoForn / qtd;

      updatePayload.fornecedor_valor_total = custoForn;
      updatePayload.preco_unitario = precoUnit;
      updatePayload.total = custoForn;
    } else if (field === "total" || field === "quantidade") {
      const qtd = field === "quantidade" ? Number(value) : (Number(itemAtual?.quantidade) || 1);
      const tot = field === "total" ? Number(value) : (Number(itemAtual?.total) || 0);
      updatePayload.preco_unitario = tot / (qtd === 0 ? 1 : qtd);
    }

    await supabase.from("orcamento_itens").update(updatePayload).eq("id", id);
  }

  async function updateSharedSpec(cenario_id: string, field: string, value: any) {
    if (isLocked) return;
    
    // Atualiza localmente todas as linhas daquela aba
    setItens(prev => prev.map(it => it.cenario_id === cenario_id ? { ...it, [field]: value } : it));
    
    // Atualiza o banco em massa para aquele cenario
    await supabase.from("orcamento_itens").update({ [field]: value }).eq("cenario_id", cenario_id);
  }

  async function handleExcluirLinha(id: string) {
    if (isLocked || !confirm("Tem certeza que deseja excluir esta linha?")) return;
    setItens(prev => prev.filter(it => it.id !== id));
    await supabase.from("orcamento_itens").delete().eq("id", id);
  }

  async function handleDuplicateProduto(cenario_id: string) {
    if (!savedId || isLocked) return;
    const itemsToDuplicate = itens.filter(it => it.cenario_id === cenario_id);
    if (itemsToDuplicate.length === 0) return;

    const newCenarioId = crypto.randomUUID();
    const baseName = itemsToDuplicate[0].nome_opcao || "Produto";

    let maxOrdemProposta = itens.reduce((max, item) => Math.max(max, Number(item.ordem_proposta) || 0), 0);
    let nextOrdem = itens.length;

    const newItems = itemsToDuplicate.map((item) => {
      maxOrdemProposta++;
      nextOrdem++;
      // Remove IDs antigos e timestamps para o banco gerar novos limpos, e também sujeiras antigas
      const { id, created_at, updated_at, grupo_kit, tipo_variacao_opcoes, ...rest } = item as any;
      return {
        ...rest,
        id: crypto.randomUUID(),
        cenario_id: newCenarioId,
        nome_opcao: `${baseName} (Cópia)`,
        ordem: nextOrdem,
        ordem_proposta: maxOrdemProposta,
        especificacao_tecnica: item.especificacao_tecnica || {},
      };
    });

    const { data, error } = await supabase.from("orcamento_itens").insert(newItems).select();
    if (error) {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      setItens(prev => [...prev, ...data]);
      toast({ title: "Produto duplicado com sucesso!" });
    }
  }

  async function handleExcluirProduto(cenario_id: string) {
    if (isLocked || !confirm("Tem certeza que deseja excluir todo este produto e suas linhas?")) return;
    setItens(prev => prev.filter(it => it.cenario_id !== cenario_id));
    await supabase.from("orcamento_itens").delete().eq("cenario_id", cenario_id);
  }

  // --- MATEMÁTICA DO FECHAMENTO ---
  function recalcularFechamentoLocal() {
    const itensAtivos = itens.filter(i => i.incluir_na_proposta);
    
    const venda = itensAtivos.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
    const custo = itensAtivos.reduce((acc, i) => acc + (Number(i.fornecedor_valor_total) || 0), 0);
    
    // Comissões brutas derivadas das linhas
    const comLFA_bruta = itensAtivos.reduce((acc, i) => acc + ((Number(i.total) || 0) * (Number(i.comissao_lfa_percentual) || 0) / 100), 0);
    const comAgente_bruta = itensAtivos.reduce((acc, i) => acc + ((Number(i.total) || 0) * (Number(i.comissao_agente_percentual) || 0) / 100), 0);
    
    // Impostos
    const imposto_pct = Number(form.imposto_percentual_estimado ?? 6);
    let imposto_valor = 0;
    let comLFA_liquida = comLFA_bruta;
    let comAgente_liquida = comAgente_bruta;
    let lucro_operacao = 0;

    if (form.modelo_operacao === "REPRESENTACAO") {
      // Imposto incide APENAS sobre as comissões, fatiando proporcionalmente
      imposto_valor = (comLFA_bruta + comAgente_bruta) * (imposto_pct / 100);
      comLFA_liquida = comLFA_bruta * (1 - (imposto_pct / 100));
      comAgente_liquida = comAgente_bruta * (1 - (imposto_pct / 100));
      lucro_operacao = comLFA_liquida; 
    } else {
      // REVENDA: Imposto incide sobre o total da venda (Markup)
      imposto_valor = venda * (imposto_pct / 100);
      // A regra de comissão do agente na revenda será mantida bruta até definição de regra de negócio
      lucro_operacao = venda - custo - imposto_valor - comAgente_bruta;
    }
    
    return {
      venda_total: venda,
      custo_fornecedor: custo,
      comissao_bruta_total: comLFA_bruta + comAgente_bruta,
      comissao_lfa_bruta: comLFA_bruta,
      comissao_agente_bruta: comAgente_bruta,
      imposto_valor: isNaN(imposto_valor) ? 0 : Number(imposto_valor.toFixed(2)),
      comissao_lfa: comLFA_liquida,
      comissao_agente: comAgente_liquida,
      lucro_operacao: lucro_operacao
    };
  }
  const calc = recalcularFechamentoLocal();

  // --- SALVAMENTO MASTER ---
  async function handleSaveGlobal() {
    if (saving || isLocked) return;
    setSaving(true);
    try {
      const payload = {
        cliente_id: form.cliente_id,
        modelo_operacao: form.modelo_operacao,
        titulo: form.titulo,
        condicao_pagamento_id: form.condicao_pagamento_id,
        modalidade_frete_id: form.modalidade_frete_id,
        status: form.status,
        agente_id: form.agente_id,
        contato_id: form.contato_id,
        endereco_entrega_id: form.endereco_entrega_id,
        imposto_percentual_estimado: Number(form.imposto_percentual_estimado || 0),
        imposto_valor_estimado: calc.imposto_valor,
      };

      let orcId = savedId;

      if (!orcId) {
        const { data, error } = await supabase.from("orcamentos").insert(payload).select().single();
        if (error) throw error;
        orcId = data.id;
        setSavedId(orcId);
        carregarOrcamentoCompleto(data);
        toast({ title: "Orçamento criado!" });
      } else {
        await supabase.from("orcamentos").update(payload).eq("id", orcId);
        
        // Salva espelho no fechamento
        const fechPayload = {
          orcamento_id: orcId,
          valor_base_proposta: calc.custo_fornecedor,
          custo_total: calc.custo_fornecedor,
          valor_final_venda: calc.venda_total,
          comissao_lfa_valor: calc.comissao_lfa,
          comissao_agente_valor: calc.comissao_agente,
          margem_lfa_valor: calc.lucro_operacao,
          imposto_valor: calc.imposto_valor,
        };
        
        if (fechamento?.id) {
          await supabase.from("orcamento_fechamento").update(fechPayload).eq("id", fechamento.id);
        } else {
          await supabase.from("orcamento_fechamento").insert(fechPayload);
        }
        
        toast({ title: "Orçamento salvo!" });
      }
      onSuccess?.();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const itensAprovados = (itens || []).filter((i: any) => i.incluir_na_proposta);

  const handleAbrirPedido = () => {
    if (itensAprovados.length === 0) {
      toast({ title: "Nenhum item selecionado", description: "Marque ao menos um item no checklist da proposta.", variant: "destructive" });
      return;
    }
    setPreviewPedidoOpen(true);
  };

  const confirmarAberturaPedido = () => {
    convertPedido(editing.id, {
      onSuccess: (data: any) => {
        navigate(`/pedidos/${data.id}`);
        setPreviewPedidoOpen(false);
        onOpenChange(false);
      }
    });
  };

  // --- FORMATAÇÃO ---
  const formatR$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const formatUnitario = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(v || 0);

  const temAgente = !!form.agente_id && form.agente_id !== "none";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
          
          <DialogHeader className="px-6 py-4 bg-card border-b flex-row items-center justify-between space-y-0 shrink-0">
            <div>
              <DialogTitle className="text-xl text-foreground">
                {editing ? `Orçamento ORC-${new Date(editing.created_at).getFullYear()}-${editing.numero}` : "Novo Orçamento"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">Gerencie os dados e a grade de produtos.</DialogDescription>
            </div>
            
                        <div className="flex items-center gap-3">

              <div className="w-48">
                <Select value={form.status || ""} onValueChange={(v) => setForm({...form, status: v})} disabled={isLocked}>
                  <SelectTrigger className="h-8 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                    <SelectItem value="EM_NEGOCIACAO">Em Negociação</SelectItem>
                    <SelectItem value="ENVIADO">Enviado</SelectItem>
                    <SelectItem value="APROVADO">Aprovado</SelectItem>
                    <SelectItem value="APROVADO_COMERCIALMENTE">Aprovado Comercialmente</SelectItem>
                    <SelectItem value="CONVERTIDO_EM_PEDIDO">Convertido em Pedido</SelectItem>
                    <SelectItem value="PERDIDO">Perdido</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editing && !isLocked && (
                 <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-900/50" onClick={() => {
                   onOpenChange(false);
                   navigate(`/orcamentos/${editing.id}/confirmacao`);
                 }}>
                   <Printer className="h-4 w-4 mr-1.5" /> Ver PDF
                 </Button>
              )}
              {editing && form.status === "APROVADO_COMERCIALMENTE" && !isLocked && (
                 <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleAbrirPedido}>
                   Abrir Pedido
                 </Button>
              )}
              {isLocked && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase">
                  Convertido em Pedido
                </span>
              )}
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-card px-6 pt-2 border-b">
              <TabsList className="grid w-[400px] grid-cols-3 bg-muted">
                <TabsTrigger value="header">Cabeçalho</TabsTrigger>
                <TabsTrigger value="items" disabled={!savedId}>Produtos</TabsTrigger>
                <TabsTrigger value="closing" disabled={!savedId || itens.length === 0}>Fechamento</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* --- ABA CABEÇALHO --- */}
              <TabsContent value="header" className="m-0 space-y-6">
                <div className="grid grid-cols-2 gap-6 bg-card p-5 rounded-lg border shadow-sm text-card-foreground">
                  <div className="grid gap-2">
                    <Label>Título do Orçamento *</Label>
                    <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} disabled={isLocked} placeholder="Ex: Campanha Inverno" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Cliente *</Label>
                    <Select value={form.cliente_id || ""} onValueChange={v => {
                        const c = clientes.find(x => x.id === v);
                        setForm({...form, cliente_id: v, agente_id: c?.agente_id || null, modalidade_frete_id: c?.modalidade_frete_id || null, condicao_pagamento_id: c?.condicao_pagamento_id || null});
                        carregarDependenciasCliente(v, true);
                      }} disabled={isLocked}>
                      <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                      <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de Operação</Label>
                    <Select value={form.modelo_operacao || ""} onValueChange={v => setForm({ ...form, modelo_operacao: v })} disabled={isLocked}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REPRESENTACAO">Representação</SelectItem>
                        <SelectItem value="REVENDA">Revenda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Agente Comercial</Label>
                    <Select value={form.agente_id || "none"} onValueChange={v => setForm({ ...form, agente_id: v === "none" ? null : v })} disabled={isLocked}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {agentes.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Contato do Cliente</Label>
                    <Select value={form.contato_id || "none"} onValueChange={v => setForm({ ...form, contato_id: v === "none" ? null : v })} disabled={isLocked || !form.cliente_id}>
                      <SelectTrigger><SelectValue placeholder="Selecione o contato" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {clienteContatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Endereço de Entrega</Label>
                    <Select value={form.endereco_entrega_id || "none"} onValueChange={v => setForm({ ...form, endereco_entrega_id: v === "none" ? null : v })} disabled={isLocked || !form.cliente_id}>
                      <SelectTrigger><SelectValue placeholder="Selecione o endereço" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {clienteEnderecos.map(e => <SelectItem key={e.id} value={e.id}>{e.logradouro}, {e.numero} - {e.cidade}/{e.uf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Condição de Pagamento</Label>
                    <Select value={form.condicao_pagamento_id || "none"} onValueChange={(val) => setForm({...form, condicao_pagamento_id: val === "none" ? null : val})} disabled={isLocked}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {condicoesPagamento.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Modalidade de Frete</Label>
                    <Select value={form.modalidade_frete_id || "none"} onValueChange={(val) => setForm({...form, modalidade_frete_id: val === "none" ? null : val})} disabled={isLocked}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione...</SelectItem>
                        {modalidadesFrete.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </TabsContent>

              {/* --- ABA PRODUTOS --- */}
              <TabsContent value="items" className="m-0 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-foreground">Grade de Produtos e Quantidades</h3>
                  {!isLocked && (
                    <Button size="sm" onClick={handleAddProduto}>
                      <Plus className="h-4 w-4 mr-2" /> Novo Produto
                    </Button>
                  )}
                </div>

                {produtos.length === 0 ? (
                  <div className="text-center py-10 bg-card border border-dashed rounded-lg text-muted-foreground">
                    Nenhum produto adicionado. Clique no botão acima para começar a orçar.
                  </div>
                ) : (
                  <Tabs defaultValue={produtos[0].cenario_id} className="w-full">
                    <TabsList className="bg-card border rounded-t-lg w-full flex justify-start overflow-x-auto h-auto p-0 rounded-b-none">
                      {produtos.map((p: any) => (
                        <TabsTrigger key={p.cenario_id} value={p.cenario_id} className="rounded-none border-r px-6 py-3 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-b-blue-600">
                          {p.nome_opcao}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {produtos.map((p: any) => {
                      const isEditorial = solucoes.find((s: any) => s.id === p.specs.solucao_id)?.nome === 'Editorial';
                      return (
                      <TabsContent key={p.cenario_id} value={p.cenario_id} className="m-0 bg-card border border-t-0 p-5 rounded-b-lg shadow-sm space-y-6">
                        
                        {/* 1. TOPO: Especificações do Produto */}
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <Input 
                              className="font-bold text-lg w-1/3 border-transparent hover:border-gray-300 focus:border-blue-500 bg-muted px-2"
                              value={p.nome_opcao} 
                              onChange={(e) => updateSharedSpec(p.cenario_id, "nome_opcao", e.target.value)}
                              disabled={isLocked}
                              title="Nome do Produto (Aba)"
                            />
                            <span className="text-xs text-muted-foreground">Altere o nome para organizar suas abas.</span>
                            
                            <div className="flex-1"></div>
                            {!isLocked && (
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleDuplicateProduto(p.cenario_id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar Produto
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleExcluirProduto(p.cenario_id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir Produto
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-5 gap-4 p-4 bg-muted border rounded-lg">
                            <div className="col-span-2 grid gap-1.5"><Label className="text-xs">Solução Gráfica</Label><Select value={p.specs.solucao_id || "none"} onValueChange={v => {
                              updateSharedSpec(p.cenario_id, "solucao_id", v === "none" ? null : v);
                              updateSharedSpec(p.cenario_id, "fornecedor_id", null);
                            }} disabled={isLocked}><SelectTrigger className="h-8 bg-card"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{solucoes.map((s:any)=><SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select></div>
                            <div className="col-span-2 grid gap-1.5">
                              <Label className="text-xs">Fornecedor Base</Label>
                              {(() => {
                                const fornecedoresFiltrados = (p.specs.solucao_id && p.specs.solucao_id !== "none") 
                                  ? fornecedores.filter(f => fornecedorSolucoes.some(fs => fs.fornecedor_id === f.id && fs.solucao_id === p.specs.solucao_id)) 
                                  : fornecedores;
                                return (
                                  <Select value={p.specs.fornecedor_id || "none"} onValueChange={v => updateSharedSpec(p.cenario_id, "fornecedor_id", v === "none" ? null : v)} disabled={isLocked}><SelectTrigger className="h-8 bg-card"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{fornecedoresFiltrados.map((f:any)=><SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent></Select>
                                );
                              })()}
                            </div>
                            <div className="col-span-1 grid gap-1.5"><Label className="text-xs">Nº Proposta Forn.</Label><Input className="h-8 bg-card" value={p.specs.fornecedor_numero_proposta || ""} onChange={e => updateSharedSpec(p.cenario_id, "fornecedor_numero_proposta", e.target.value)} disabled={isLocked} placeholder="Ex: 12345" /></div>
                            
                            {!isEditorial && (
                              <>
                                <div className="col-span-2 grid gap-1.5"><Label className="text-xs">Dimensões (mm)</Label><div className="flex gap-2"><Input className="h-8 bg-card w-full" placeholder="Largura" value={p.specs.largura_mm || ""} onChange={e => updateSharedSpec(p.cenario_id, "largura_mm", e.target.value)} disabled={isLocked} /><span className="flex items-center text-muted-foreground text-xs">x</span><Input className="h-8 bg-card w-full" placeholder="Altura" value={p.specs.altura_mm || ""} onChange={e => updateSharedSpec(p.cenario_id, "altura_mm", e.target.value)} disabled={isLocked} /></div></div>
                                <div className="col-span-2 grid gap-1.5"><Label className="text-xs">Substrato</Label><Input className="h-8 bg-card" value={p.specs.substrato || ""} onChange={e => updateSharedSpec(p.cenario_id, "substrato", e.target.value)} disabled={isLocked} /></div>
                                <div className="col-span-1 grid gap-1.5"><Label className="text-xs">Prazo Estimado</Label><Input className="h-8 bg-card" value={p.specs.prazo_estimado || ""} onChange={e => updateSharedSpec(p.cenario_id, "prazo_estimado", e.target.value)} disabled={isLocked} /></div>
                                
                                <div className="col-span-5 grid gap-1.5"><Label className="text-xs">Especificação Completa</Label><Textarea className="min-h-[60px] bg-card text-sm" value={p.specs.acabamentos || ""} onChange={e => updateSharedSpec(p.cenario_id, "acabamentos", e.target.value)} disabled={isLocked} /></div>
                              </>
                            )}
                            
                            {isEditorial && (
                              <EspecificacaoEditorialPanel
                                value={p.specs.especificacao_tecnica || {}}
                                onChange={(novoJson) => updateSharedSpec(p.cenario_id, 'especificacao_tecnica', novoJson)}
                                disabled={isLocked}
                              />
                            )}
                          </div>
                        </div>

                        {/* Controles Comerciais (Kit/Comportamento) */}
                        <div className="flex flex-wrap items-center gap-4 mt-6 mb-4 p-4 bg-muted/30 border-t border-b border-dashed">
                          <div className="flex-1 min-w-[250px]">
                            <Label className="text-muted-foreground mb-1 block">Agrupar no Kit / Coleção (Deixe vazio para item avulso)</Label>
                            <Input 
                              value={p.specs.especificacao_tecnica?.grupo_kit || ""} 
                              onChange={(e) => updateSharedSpec(p.cenario_id, 'especificacao_tecnica', { ...(p.specs.especificacao_tecnica || {}), grupo_kit: e.target.value })} 
                              placeholder="Ex: Box Saga Completa" 
                              className="w-full bg-card" 
                              disabled={isLocked} 
                            />
                          </div>
                          <div className="flex-1 min-w-[280px]">
                            <Label className="text-muted-foreground mb-1 block">Comportamento das Opções de Quantidade</Label>
                            <Select 
                              value={p.specs.especificacao_tecnica?.tipo_variacao_opcoes || "quantidade"} 
                              onValueChange={(val) => updateSharedSpec(p.cenario_id, 'especificacao_tecnica', { ...(p.specs.especificacao_tecnica || {}), tipo_variacao_opcoes: val })} 
                              disabled={isLocked}
                            >
                              <SelectTrigger className="w-full bg-card">
                                <SelectValue/>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="quantidade">Variação de Quantidade (Escala)</SelectItem>
                                <SelectItem value="sku">SKUs / Volumes Diferentes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* 2. RODAPÉ: Grade de Modelos/Quantidades */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Modelos e Quantidades (Grade)</h4>
                            {!isLocked && (
                              <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-700 hover:bg-blue-500/10" onClick={() => handleAddModelo(p.cenario_id)}>
                                <Plus className="h-3 w-3 mr-1" /> Adicionar Linha
                              </Button>
                            )}
                          </div>
                          
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-muted/60 text-xs uppercase font-semibold text-muted-foreground">
                                <tr>
                                  <th className="px-3 py-2 w-[30%]">Nome do Modelo / SKU</th>
                                  <th className="px-3 py-2">Qtd</th>
                                  <th className="px-3 py-2">Custo Forn (R$)</th>
                                  
                                  <th className="px-3 py-2">% Com. Total</th>
                                  {temAgente && <th className="px-3 py-2">% Comissão AA</th>}
                                  <th className="px-3 py-2 text-center w-10">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {p.linhas.map((linha: any) => (
                                  <tr key={linha.id} className="hover:bg-muted">
                                    <td className="p-2">
                                      <Input className="h-8 font-medium" value={linha.descricao || ""} onChange={e => updateItemBD(linha.id, "descricao", e.target.value)} disabled={isLocked} placeholder="Ex: Sabor Morango" />
                                    </td>
                                    <td className="p-2">
                                      <div className="flex items-center gap-1">
                                        <Input type="number" className="h-8 w-20" value={linha.quantidade || 0} onChange={e => updateItemBD(linha.id, "quantidade", Number(e.target.value))} disabled={isLocked} />
                                      </div>
                                    </td>
                                    <td className="p-2">
                                      <Input type="number" className="h-8" value={linha.fornecedor_valor_total || 0} onChange={e => updateItemBD(linha.id, "fornecedor_valor_total", Number(e.target.value))} disabled={isLocked} />
                                    </td>
                                    
                                    {/* Com. Total */}
                                    <td className="p-2">
                                      <Input 
                                        type="number" 
                                        className="h-8" 
                                        value={(linha.comissao_agente_percentual || 0) + (linha.comissao_lfa_percentual || 0)} 
                                        onChange={e => {
                                          const totalDigitado = Number(e.target.value);
                                          if (temAgente) {
                                            // Se tem agente, o que sobrar do total menos a comissão da LFA, vai pro Agente
                                            const lfa = linha.comissao_lfa_percentual || 0;
                                            updateItemBD(linha.id, "comissao_agente_percentual", totalDigitado - lfa);
                                          } else {
                                            // Se NÃO tem agente, 100% do total é da LFA e 0% do Agente
                                            updateItemBD(linha.id, "comissao_lfa_percentual", totalDigitado);
                                            updateItemBD(linha.id, "comissao_agente_percentual", 0);
                                          }
                                        }} 
                                        disabled={isLocked} 
                                      />
                                    </td>

                                    {/* Com. LFA (Só exibe se houver agente) */}
                                    {temAgente && (
                                      <td className="p-2">
                                        <Input 
                                          type="number" 
                                          className="h-8" 
                                          value={linha.comissao_lfa_percentual || 0} 
                                          onChange={e => {
                                            const lfaDigitado = Number(e.target.value);
                                            const comissaoTotalAtual = (linha.comissao_agente_percentual || 0) + (linha.comissao_lfa_percentual || 0);
                                            updateItemBD(linha.id, "comissao_lfa_percentual", lfaDigitado);
                                            updateItemBD(linha.id, "comissao_agente_percentual", comissaoTotalAtual - lfaDigitado);
                                          }} 
                                          disabled={isLocked} 
                                        />
                                      </td>
                                    )}
                                    <td className="p-2 text-center">
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleExcluirLinha(linha.id)} disabled={isLocked || p.linhas.length === 1}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </TabsContent>
                    )})}
                  </Tabs>
                )}
              </TabsContent>

              {/* --- ABA FECHAMENTO (CHECKLIST) --- */}
              <TabsContent value="closing" className="m-0 space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  
                  {/* Checklist Lateral */}
                  <div className="col-span-2 bg-card border rounded-lg p-5 shadow-sm">
                    <h3 className="font-bold text-foreground mb-1">Itens da Proposta (Checklist)</h3>
                    <p className="text-xs text-muted-foreground mb-4">Marque os modelos e quantidades que deseja apresentar no PDF e somar no Fechamento Financeiro.</p>
                    
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                      {produtos.map((p: any) => (
                        <div key={p.cenario_id} className="border border-gray-100 rounded-lg overflow-hidden">
                          <div className="bg-muted/60 px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
                            Produto: {p.nome_opcao}
                          </div>
                          <div className="divide-y divide-gray-100">
                            {p.linhas.map((linha: any) => (
                              <label key={linha.id} className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer transition-colors">
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={linha.incluir_na_proposta} 
                                    onCheckedChange={(v) => updateItemBD(linha.id, "incluir_na_proposta", v)}
                                    disabled={isLocked}
                                  />
                                  <div>
                                    <span className="font-medium text-sm block">{linha.descricao || "Sem Nome"}</span>
                                    <span className="text-xs text-muted-foreground">Qtd: {linha.quantidade} un</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-emerald-700 block">{formatR$(linha.total)}</span>
                                  <span className="text-[10px] text-muted-foreground">Custo: {formatR$(linha.fornecedor_valor_total)}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Painel Financeiro Lateral */}
                  <div className="col-span-1 space-y-4">
                    <div className="bg-card border rounded-lg p-5 shadow-sm space-y-4">
                      <h4 className="text-xs font-bold uppercase text-foreground tracking-wider border-b pb-2">Ajustes</h4>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Imposto Estimado (%)</Label>
                        <Input type="number" className="h-8 text-xs" value={form.imposto_percentual_estimado ?? 6} onChange={e => setForm({...form, imposto_percentual_estimado: Number(e.target.value)})} disabled={isLocked} />
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-5">
                      <h4 className="text-xs font-bold uppercase text-blue-800 tracking-wider mb-4 border-b border-blue-200 pb-2">Resumo Financeiro (Seleção)</h4>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total Venda</span>
                          <span className="font-bold text-foreground">{formatR$(calc.venda_total)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Custo Fornecedor</span>
                          <span className="font-medium text-foreground">{formatR$(calc.custo_fornecedor)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                          <span className="text-muted-foreground">Comissão Total (Bruta)</span>
                          <span className="font-bold text-foreground">{formatR$(calc.comissao_bruta_total)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-600">
                          <span className="">- Impostos Retidos</span>
                          <span className="font-medium">{formatR$(calc.imposto_valor)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                          <span className="text-muted-foreground">Comissão Agente (Líquida)</span>
                          <span className="font-medium text-blue-700">{formatR$(calc.comissao_agente)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Receita AA (Líquida)</span>
                          <span className="font-bold text-emerald-700">{formatR$(calc.comissao_lfa)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </TabsContent>
            </div>
            
            {/* --- RODAPÉ GLOBAL DO MODAL --- */}
            <div className="bg-card border-t p-4 flex justify-end gap-2 shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
              {!isLocked && (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveGlobal} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Orçamento"}
                </Button>
              )}
            </div>
          </Tabs>

        </DialogContent>
      </Dialog>

      {/* --- MODAL DE REVISÃO E ABERTURA DE PEDIDO --- */}
      <Dialog open={previewPedidoOpen} onOpenChange={setPreviewPedidoOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Revisão do Pedido</DialogTitle>
            <DialogDescription>
              Confira os itens que serão enviados para a produção. Apenas os itens marcados na proposta serão convertidos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-4">
            {itensAprovados.map((item, idx) => (
              <div key={item.id || idx} className="flex flex-col p-4 bg-muted/40 border border-gray-200 rounded-lg gap-3">
                {/* Cabeçalho do Item */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm text-foreground uppercase">{item.nome_opcao || "Item sem nome"}</p>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">{item.descricao}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">{item.quantidade} un</p>
                    <p className="text-xs font-medium text-muted-foreground">Venda: {typeof formatR$ === 'function' ? formatR$(item.total) : item.total}</p>
                  </div>
                </div>
                
                {/* Ficha Técnica (Especificações) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-background p-3 rounded border border-gray-100 shadow-sm">
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Dimensões (mm)</span> 
                    <span className="font-semibold text-foreground">
                      {item.largura_mm && item.altura_mm ? `${item.largura_mm} x ${item.altura_mm}` : "Não inf."}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Substrato</span> 
                    <span className="font-semibold text-foreground">{item.substrato || "Não inf."}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Prazo Estimado</span> 
                    <span className="font-semibold text-foreground">{item.prazo_estimado || "Não inf."}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-4 border-t pt-2 mt-1">
                    <span className="text-muted-foreground block mb-0.5">Especificação Completa (Acabamentos)</span> 
                    <span className="font-medium text-foreground whitespace-pre-wrap">
                      {item.acabamentos || "Nenhuma especificação técnica informada."}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex justify-between items-center w-full">
            <div className="text-sm font-medium">
              Total de Itens: {itensAprovados.length}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewPedidoOpen(false)}>Cancelar</Button>
              <Button onClick={() => {
                confirmarAberturaPedido();
              }} disabled={converting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {converting ? "Gerando..." : "Confirmar e Gerar Pedido"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
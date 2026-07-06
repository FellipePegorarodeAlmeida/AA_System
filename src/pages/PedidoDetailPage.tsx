import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, Save, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { PedidoFechamentoEditor } from "@/components/pedidos/PedidoFechamentoEditor";
import { FaturamentoMasterModal } from "@/components/pedidos/FaturamentoMasterModal";

export default function PedidoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [fechamento, setFechamento] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [enderecos, setEnderecos] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [modalidadesFrete, setModalidadesFrete] = useState<any[]>([]);
  
  const [novaObservacao, setNovaObservacao] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingHist, setSavingHist] = useState(false);
  const [savingResumo, setSavingResumo] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReadOnly, setPreviewReadOnly] = useState(false);
  // NOVOS ESTADOS PARA CONTROLE DE OVERRUN
  const [itensDirty, setItensDirty] = useState(false);
  const [savingItens, setSavingItens] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Resumo via view
      const { data: vwData, error: vwErr } = await supabase
        .from("vw_pedido_detalhe")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (vwErr) throw vwErr;
      
      const { data: rawPedido } = await supabase
        .from("pedidos")
        .select("contato_id, endereco_entrega_id, total, modalidade_frete_id")
        .eq("id", id)
        .maybeSingle();

      if (vwData) {
        if (rawPedido) {
          vwData.contato_id = rawPedido.contato_id;
          vwData.endereco_entrega_id = rawPedido.endereco_entrega_id;
          vwData.total = rawPedido.total;
          // vwData.valor_frete = rawPedido.valor_frete;
          vwData.modalidade_frete_id = rawPedido.modalidade_frete_id;
        }
        setPedido(vwData);
      }

      // 2. Itens
      const { data: itensData } = await supabase
        .from("pedido_itens")
        .select("*")
        .eq("pedido_id", id)
        .order("ordem", { ascending: true });
      if (itensData) setItens(itensData);

      // 3. Financeiro (fechamento)
      const { data: fechamentoData } = await supabase
        .from("pedido_fechamento")
        .select("*")
        .eq("pedido_id", id)
        .maybeSingle();
      if (fechamentoData) setFechamento(fechamentoData);

      // 4. Histórico
      const { data: histData } = await supabase
        .from("pedido_historico")
        .select("*")
        .eq("pedido_id", id)
        .order("created_at", { ascending: false });
      if (histData) setHistorico(histData);

      // 5. Enderecos do Cliente
      if (vwData?.cliente_id) {
        const { data: endData } = await supabase
          .from("enderecos")
          .select("*")
          .eq("owner_id", vwData.cliente_id)
          .eq("owner_type", "cliente")
          .order("principal", { ascending: false });
        if (endData) setEnderecos(endData);

        const { data: contData } = await supabase
          .from("contatos")
          .select("*")
          .eq("owner_id", vwData.cliente_id)
          .eq("owner_type", "cliente")
          .order("principal", { ascending: false });
        if (contData) setContatos(contData);

        // Pré-seleção de contato se estiver vazio
        if (vwData && !vwData.contato_id && contData && contData.length > 0) {
          const mainCont = contData.find(c => c.principal) || contData[0];
          setPedido(prev => ({ ...prev, contato_id: mainCont.id }));
        }
      }

      const { data: modData } = await supabase.from('modalidades_frete').select('id, nome').order('nome');
      if (modData) setModalidadesFrete(modData);

    } catch (err: any) {
      toast({ title: "Erro ao carregar pedido", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddHistorico() {
    if (!novaObservacao.trim()) return;
    setSavingHist(true);
    try {
      const { error } = await supabase
        .from("pedido_historico")
        .insert({
          pedido_id: id,
          tipo: "OBSERVACAO",
          descricao: novaObservacao.trim(),
        });

      if (error) throw error;
      toast({ title: "Observação adicionada ao histórico" });
      setNovaObservacao("");
      
      // Recarregar histórico
      const { data } = await supabase
        .from("pedido_historico")
        .select("*")
        .eq("pedido_id", id)
        .order("created_at", { ascending: false });
      if (data) setHistorico(data);

    } catch (err: any) {
      toast({ title: "Erro ao salvar histórico", description: err.message, variant: "destructive" });
    } finally {
      setSavingHist(false);
    }
  }

  async function handleSaveResumo() {
    setSavingResumo(true);
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({
          status: pedido.status,
          previsao_entrega: pedido.previsao_entrega || null,
          numero_nf: pedido.numero_nf || null,
          data_emissao_nf: pedido.data_emissao_nf || null,
          observacoes_operacionais: pedido.observacoes_operacionais || null,
          tipo_prova: pedido.tipo_prova || null,
          modalidade_frete_id: pedido.modalidade_frete_id || null,

          endereco_entrega_id: pedido.endereco_entrega_id || null,
          contato_id: pedido.contato_id || null,
        })
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: "Pedido atualizado com sucesso" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingResumo(false);
    }
  }

  function handleQuantidadeLocalChange(itemId: string, novaQtd: number) {
    if (isNaN(novaQtd) || novaQtd < 0) return;
    const novosItens = itens.map(it => {
      if (it.id === itemId) {
        return { ...it, quantidade: novaQtd, total: Number((Number(novaQtd) * Number(it.preco_unitario || 0)).toFixed(4)) };
      }
      return it;
    });
    setItens(novosItens);
    setItensDirty(true);
    const novoTotalGeral = novosItens.reduce((acc, it) => acc + Number(it.total || 0), 0);
    setPedido(prev => ({ ...prev, total: Number(novoTotalGeral.toFixed(4)) }));
  }

  async function handleSaveItensOverrun() {
    setSavingItens(true);
    try {
      const itensPromises = itens.map(it => 
        supabase.from("pedido_itens").update({ quantidade: Number(it.quantidade), total: Number(it.total) }).eq("id", it.id)
      );
      await Promise.all(itensPromises);
      setItensDirty(false);
      toast({ title: "Quantidades atualizadas! Verifique o Fechamento." });
      await loadData(); // Fundamental: Acorda o componente filho
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingItens(false);
    }
  }

  const handleGerarFaturamento = async () => {
    if (!pedido.data_emissao_nf) {
      toast({ title: "Atenção", description: "Preencha a Data de Emissão da NF antes de gerar os lançamentos.", variant: "destructive" });
      return;
    }
    setPreviewReadOnly(false);
    setPreviewOpen(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando detalhes do pedido...</div>;
  }

  if (!pedido) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Button onClick={() => navigate("/pedidos")}>Voltar para pedidos</Button>
      </div>
    );
  }

  const buildSpecsString = (item: any) => {
    const s = item.especificacao_tecnica || item.specs || {};
    if (Object.keys(s).length === 0 || !s.capa) {
      return [
        item.formato ? `Formato: ${item.formato}` : (item.largura_mm ? `Formato: ${item.largura_mm}x${item.altura_mm}mm` : null),
        item.substrato ? `Substrato: ${item.substrato}` : null,
        item.acabamentos ? `Acabamentos: ${item.acabamentos}` : null
      ].filter(Boolean).join(" | ");
    }
    const parts = [];
    if (s.tipo_obra) parts.push(`Obra: ${s.tipo_obra}`);
    if (s.regra_encadernacao) {
      let enc = `Encadernação: ${s.regra_encadernacao}`;
      if (s.regra_encadernacao === 'Espiral') enc += ` ${s.espiral_material || ''} (${s.espiral_cor || ''})`;
      if (s.regra_encadernacao === 'Wire-O' && s.wireo_cor) enc += ` (${s.wireo_cor})`;
      parts.push(enc.trim());
    }
    if (s.capa) {
      let c = `Capa: ${s.capa.papel} ${s.capa.gramatura}`;
      c += ` (${s.capa.cores || 's/ cor'}${s.capa.usa_pantone && s.capa.pantone_cor ? ' + Pantone ' + s.capa.pantone_cor : ''})`;
      if (s.capa.capa_dura) c += ` - Capa Dura (${s.capa.espessura_papelao})`;
      const acabsCapa = [s.capa.acabamento_1, s.capa.acabamento_2, s.capa.acabamento_3].filter((a: any) => a && a !== 'Nenhum');
      if (acabsCapa.length > 0) c += ` [${acabsCapa.join(', ')}]`;
      if (s.capa.tem_orelha) {
        const oEsq = s.capa.orelha_esquerda || '0';
        const oDir = s.capa.orelha_direita || '0';
        c += ` + Orelhas (Esq: ${oEsq}mm, Dir: ${oDir}mm)`;
      }
      parts.push(c);
    }
    if (s.miolos && Array.isArray(s.miolos)) {
      s.miolos.forEach((m: any, idx: number) => {
        let mStr = `Miolo ${idx + 1}: ${m.paginas || 0} pgs - ${m.papel} ${m.gramatura}`;
        mStr += ` (${m.cores || 's/ cor'}${m.usa_pantone && m.pantone_cor ? ' + Pantone ' + m.pantone_cor : ''})`;
        const acabsMiolo = [m.acabamento_1, m.acabamento_2].filter((a: any) => a && a !== 'Nenhum');
        if (acabsMiolo.length > 0) mStr += ` [${acabsMiolo.join(', ')}]`;
        parts.push(mStr);
      });
    }
    return parts.join(" | ");
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    if (dateStr.includes('T00:00:00') || !dateStr.includes('T')) {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timePart = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${datePart} ${timePart}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pedidos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Pedido #{pedido.numero}</h1>
              {pedido.numero_nf && (
                <button 
                  onClick={() => { setPreviewReadOnly(true); setPreviewOpen(true); }}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 transition-colors text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm cursor-pointer"
                  title="Visualizar faturamento"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>NF: {pedido.numero_nf}</span>
                  {pedido.data_emissao_nf && (
                    <>
                      <span className="text-emerald-600/70 mx-0.5">•</span>
                      <span className="font-medium">{formatDate(pedido.data_emissao_nf)}</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Detalhes operacionais e acompanhamento do pedido.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate(`/pedidos/${pedido.id}/imprimir`)}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <FileText className="h-4 w-4" />
              Gerar Ordem de Produção
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* Bloco 1: Cliente */}
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="p-5 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{pedido.cliente_nome || "Cliente Desconhecido"}</h2>
                <p className="text-sm text-muted-foreground">CNPJ/CPF: {pedido.cliente_documento || "Não informado"}</p>
              </div>
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                Cliente
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="grid gap-1.5">
                <Label className="text-xs uppercase text-muted-foreground font-semibold">Contato do Cliente</Label>
                <Select 
                  value={pedido.contato_id || "none"} 
                  onValueChange={(v) => setPedido({...pedido, contato_id: v === "none" ? null : v})}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o contato..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum contato</SelectItem>
                    {contatos.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} {c.cargo ? `(${c.cargo})` : ""} {c.principal ? "★" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-1.5">
                <Label className="text-xs uppercase text-muted-foreground font-semibold">Endereço de Entrega</Label>
                <Select 
                  value={pedido.endereco_entrega_id || "none"} 
                  onValueChange={(v) => setPedido({...pedido, endereco_entrega_id: v === "none" ? null : v})}
                >
                  <SelectTrigger className="h-9 text-left">
                    <div className="line-clamp-1">
                      <SelectValue placeholder="Selecione o endereço..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum endereço</SelectItem>
                    {enderecos.map(end => (
                      <SelectItem key={end.id} value={end.id}>
                        {end.logradouro}, {end.numero} - {end.cidade}/{end.uf} {end.principal ? "★" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 2: Dados do Trabalho */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Dados do Trabalho
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                <Select 
                  value={pedido.status} 
                  onValueChange={(v) => setPedido({...pedido, status: v})}
                >
                  <SelectTrigger className="h-9 text-xs font-bold uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABERTO">Aberto</SelectItem>
                    <SelectItem value="EM_PRODUCAO">Em Produção</SelectItem>
                    <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Operação</Label>
                <div className="h-9 flex items-center px-3 bg-muted/50 rounded-md capitalize font-medium text-sm border border-transparent">
                  {pedido.modelo_operacao?.toLowerCase() || "—"}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Emissão</Label>
                <div className="h-9 flex items-center px-3 bg-muted/50 rounded-md text-sm border border-transparent">
                  {formatDate(pedido.data_emissao).split(" ")[0]}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Previsão Entrega</Label>
                <Input 
                  type="date" 
                  className="h-9" 
                  value={pedido.previsao_entrega ? pedido.previsao_entrega.split('T')[0] : ""} 
                  onChange={(e) => setPedido({...pedido, previsao_entrega: e.target.value})}
                />
              </div>
              <div className="grid gap-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground">Vendedor / Orçamento</Label>
                <div className="h-9 flex items-center px-3 bg-muted/50 rounded-md text-sm justify-between border border-transparent">
                  <span>{pedido.agente_id ? "Vendedor Atribuído" : "Venda Direta"}</span>
                  {pedido.orcamento_id && (
                    <Link to={`/orcamentos?id=${pedido.orcamento_id}`} className="text-primary font-bold hover:underline">
                      Ver ORC-{pedido.orcamento_numero}
                    </Link>
                  )}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Tipo de Prova</Label>
                <Select value={pedido.tipo_prova || "Nenhuma"} onValueChange={(v) => setPedido({...pedido, tipo_prova: v})}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                    <SelectItem value="Física">Física</SelectItem>
                    <SelectItem value="Virtual">Virtual</SelectItem>
                    <SelectItem value="Envio de RT">Envio de RT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Modalidade Frete</Label>
                <Select value={pedido.modalidade_frete_id || "none"} onValueChange={(v) => setPedido({...pedido, modalidade_frete_id: v === "none" ? null : v})}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informada</SelectItem>
                    {modalidadesFrete.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 md:col-span-4 mt-2">
                <Label className="text-xs font-semibold text-muted-foreground">Observações Operacionais (Aparecem na OP)</Label>
                <Textarea 
                  className="text-sm min-h-[80px]" 
                  placeholder="Adicione notas operacionais do pedido..."
                  value={pedido.observacoes_operacionais || ""}
                  onChange={(e) => setPedido({...pedido, observacoes_operacionais: e.target.value})}
                />
              </div>
            </div>
            
            <div className="pt-4 flex justify-between items-center border-t border-border/50 mt-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Número NF</Label>
                  <Input 
                    className="h-8 text-xs w-32" 
                    placeholder="Ex: 12345"
                    value={pedido.numero_nf || ""} 
                    onChange={(e) => setPedido({...pedido, numero_nf: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Data NF</Label>
                  <Input 
                    type="date" 
                    className="h-8 text-xs w-36" 
                    value={pedido.data_emissao_nf ? pedido.data_emissao_nf.split('T')[0] : ""} 
                    onChange={(e) => setPedido({...pedido, data_emissao_nf: e.target.value})}
                  />
                </div>
                <Button 
                  onClick={handleGerarFaturamento} 
                  size="sm" 
                  variant="outline"
                  className="h-8 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                >
                  Lançar Financeiro
                </Button>
              </div>

              <Button onClick={handleSaveResumo} disabled={savingResumo}>
                <Save className="h-4 w-4 mr-2" />
                {savingResumo ? "Salvando..." : "Salvar Cabeçalho"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 3: Itens do Pedido */}
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border/50 bg-muted/20 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                Itens do Pedido ({itens.length})
              </h3>
              {itensDirty && (
                <Button 
                  size="sm" 
                  onClick={handleSaveItensOverrun} 
                  disabled={savingItens}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingItens ? "Recalculando..." : "Salvar Quantidades"}
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="p-3">Descrição</th>
                    <th className="p-3">Qtd</th>
                    <th className="p-3">Vlr Unitário</th>
                    <th className="p-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">Nenhum item encontrado.</td>
                    </tr>
                  ) : (
                    itens.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 border-b last:border-0">
                        <td className="p-3">
                          <div className="font-medium text-base flex items-center gap-2">
                            {item.numero && <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">Item #{item.numero}</span>}
                            <span>{item.descricao}</span>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground space-y-1">
                            {item.descricao_tecnica && <div><span className="font-semibold">Técnica:</span> {item.descricao_tecnica}</div>}
                            <p className="text-[11px] text-muted-foreground leading-relaxed italic bg-muted/50 p-2 rounded border border-border">
                              {buildSpecsString(item)}
                            </p>
                            {item.observacoes_tecnicas && <div><span className="font-semibold">Obs:</span> {item.observacoes_tecnicas}</div>}
                          </div>
                        </td>
                        <td className="p-3 align-top w-32">
                          <Input
                            type="number"
                            className="h-9 font-bold bg-amber-50/30 border-amber-100 focus-visible:ring-amber-500"
                            value={item.quantidade}
                            onChange={(e) => handleQuantidadeLocalChange(item.id, Number(e.target.value))}
                            min={0}
                          />
                          <span className="text-[10px] text-muted-foreground block mt-1 uppercase font-semibold">Qtd Produzida</span>
                        </td>
                        <td className="p-3 align-top">{formatMoney(item.preco_unitario)}</td>
                        <td className="p-3 font-bold align-top">{formatMoney(item.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 4: Fechamento e Financeiro */}
        <div className="pt-4 mt-2">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 px-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            Fechamento e Financeiro
          </h2>
          <PedidoFechamentoEditor 
            pedido={pedido} 
            fechamento={fechamento} 
            onUpdateSuccess={loadData} 
          />
        </div>

        {/* Bloco 5: Histórico */}
        <div className="pt-8 border-t border-dashed mt-4 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            Histórico do Pedido
          </h2>
          
          <Card>
            <CardContent className="p-4 flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-semibold text-muted-foreground">Nova Observação</label>
                <Input 
                  placeholder="Digite o que aconteceu..." 
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddHistorico(); }}
                />
              </div>
              <Button onClick={handleAddHistorico} disabled={savingHist || !novaObservacao.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Registrar
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {historico.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                Nenhum histórico registrado ainda.
              </div>
            ) : (
              historico.map((h) => (
                <Card key={h.id}>
                  <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {formatDate(h.created_at)} {h.tipo && h.tipo !== "OBSERVACAO" ? ` • ${h.tipo.replace('_', ' ')}` : ''}
                    </span>
                    <p className="text-sm">{h.descricao}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <FaturamentoMasterModal
        pedido={pedido}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onSuccess={loadData}
        isReadOnly={previewReadOnly}
      />
    </div>
  );
}

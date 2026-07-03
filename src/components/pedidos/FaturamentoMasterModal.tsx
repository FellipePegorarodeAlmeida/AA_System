import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUpdatePedido } from "@/hooks/use-pedidos";
import { AlertCircle, Info, Calculator } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface FaturamentoMasterModalProps {
  pedido: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  isReadOnly?: boolean;
}

interface ItemSaldo {
  pedido_item_id: string; 
  pedido_id: string;
  descricao: string;
  preco_unitario: number;
  quantidade_pedido: number;
  quantidade_faturada: number;
  saldo_a_faturar: number;
}

type ModoFaturamento = "COMPLEMENTAR" | "CORRIGIR";

export function FaturamentoMasterModal({ pedido, open, onOpenChange, onSuccess, isReadOnly }: FaturamentoMasterModalProps) {
  const [form, setForm] = useState({
    numero_nf: "",
    data_emissao_nf: new Date().toISOString().split("T")[0]
  });

  const [itensSaldo, setItensSaldo] = useState<ItemSaldo[]>([]);
  const [selecoes, setSelecoes] = useState<Record<string, { selecionado: boolean; qtd: number }>>({});
  
  const [fornecedorNome, setFornecedorNome] = useState<string>("Carregando fornecedor...");
  const [nfsExistentes, setNfsExistentes] = useState<any[]>([]);
  const [modo, setModo] = useState<ModoFaturamento>("COMPLEMENTAR");
  const [nfSelecionadaId, setNfSelecionadaId] = useState<string>("");
  const [itensNfSelecionada, setItensNfSelecionada] = useState<any[]>([]);
  const [bloqueioCorrecao, setBloqueioCorrecao] = useState<string | null>(null);

  const [loadingDados, setLoadingDados] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados do Preview Financeiro
  const [previewParcelas, setPreviewParcelas] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { mutateAsync: updatePedido } = useUpdatePedido();

  useEffect(() => {
    if (!open || !pedido) return;
    
    setForm({
      numero_nf: "",
      data_emissao_nf: new Date().toISOString().split("T")[0]
    });
    setModo("COMPLEMENTAR");
    setNfSelecionadaId("");
    setBloqueioCorrecao(null);
    setPreviewParcelas([]);
    
    async function loadData() {
      setLoadingDados(true);
      try {
        const modelo = pedido.modelo_negocio || pedido.modelo_operacao;
        let emissorId = null;
        if (modelo !== 'REVENDA') {
          const { data: itemData } = await supabase
            .from('pedido_itens')
            .select('fornecedor_id, fornecedor:fornecedores(nome)')
            .eq('pedido_id', pedido.id)
            .limit(1)
            .maybeSingle();
          if (itemData && itemData.fornecedor_id) {
            emissorId = itemData.fornecedor_id;
            // @ts-ignore
            setFornecedorNome(itemData.fornecedor?.nome || "Fornecedor não identificado");
          } else {
            setFornecedorNome("Não aplicável (Revenda)");
          }
        } else {
          setFornecedorNome("Próprio (Revenda)");
        }

        const { data: nfs } = await supabase
          .from("notas_fiscais")
          .select("*")
          .eq("pedido_id", pedido.id)
          .eq("status", "EMITIDA")
          .order("created_at", { ascending: false });
        
        setNfsExistentes(nfs || []);

        const { data: saldoData, error: saldoErr } = await supabase
          .from("vw_saldo_faturamento_itens")
          .select("*")
          .eq("pedido_id", pedido.id);
          
        if (saldoErr) throw saldoErr;
        
        const itens = saldoData || [];
        setItensSaldo(itens);
        
        const { data: pData } = await supabase.from('pedidos').select('data_emissao_nf').eq('id', pedido.id).single();
        if (pData?.data_emissao_nf) {
          setForm(prev => ({ ...prev, data_emissao_nf: pData.data_emissao_nf.split("T")[0] }));
        }

        inicializarSelecoes(itens);
        
      } catch (e) {
        console.error("Erro ao carregar dados do faturamento:", e);
      } finally {
        setLoadingDados(false);
      }
    }
    
    if (!isReadOnly) {
      loadData();
    }
  }, [open, pedido, isReadOnly]);

  const inicializarSelecoes = (itens: ItemSaldo[]) => {
    const sel: Record<string, { selecionado: boolean; qtd: number }> = {};
    itens.forEach((item: any) => {
      const uniqueId = item.pedido_item_id;
      if (uniqueId) {
        sel[uniqueId] = {
          selecionado: false,
          qtd: item.saldo_a_faturar || 0
        };
      }
    });
    setSelecoes(sel);
    setPreviewParcelas([]);
  };

  useEffect(() => {
    async function checkNfParaCorrecao() {
      if (modo !== "CORRIGIR" || !nfSelecionadaId) {
        setBloqueioCorrecao(null);
        setItensNfSelecionada([]);
        if (modo === "COMPLEMENTAR") {
           inicializarSelecoes(itensSaldo);
           
           const { data: pData } = await supabase.from('pedidos').select('data_emissao_nf').eq('id', pedido.id).single();
           setForm(prev => ({ 
             ...prev, 
             numero_nf: "",
             data_emissao_nf: pData?.data_emissao_nf ? pData.data_emissao_nf.split("T")[0] : new Date().toISOString().split("T")[0]
           }));
        }
        return;
      }

      setLoadingDados(true);
      setBloqueioCorrecao(null);
      setPreviewParcelas([]);
      try {
        const nf = nfsExistentes.find(n => n.id === nfSelecionadaId);
        if (nf) {
          setForm({
            numero_nf: nf.numero || "",
            data_emissao_nf: nf.data_emissao ? nf.data_emissao.split("T")[0] : new Date().toISOString().split("T")[0]
          });
        }

        const [receberRes, pagarRes] = await Promise.all([
          supabase.from("contas_receber").select("status").eq("nota_fiscal_id", nfSelecionadaId),
          supabase.from("contas_pagar").select("status").eq("nota_fiscal_id", nfSelecionadaId)
        ]);
        
        const todasParcelas = [...(receberRes.data || []), ...(pagarRes.data || [])];
        const temLiquidada = todasParcelas.some(p => p.status !== 'PREVISTO');

        if (temLiquidada) {
          setBloqueioCorrecao("Esta NF possui parcelas liquidadas (Recebidas ou Pagas). A operação de correção foi bloqueada por segurança.");
          inicializarSelecoes(itensSaldo);
          return;
        }

        const { data: itensNf } = await supabase
          .from("nota_fiscal_itens")
          .select("*")
          .eq("nota_fiscal_id", nfSelecionadaId);

        setItensNfSelecionada(itensNf || []);

        const sel: Record<string, { selecionado: boolean; qtd: number }> = {};
        itensSaldo.forEach(item => {
          const uniqueId = item.pedido_item_id;
          if (!uniqueId) return;
          
          const itemBuscado = (itensNf || []).find((i: any) => i.pedido_item_id === uniqueId);
          if (itemBuscado) {
            sel[uniqueId] = {
              selecionado: true,
              qtd: itemBuscado.quantidade
            };
          } else {
            sel[uniqueId] = {
              selecionado: false,
              qtd: item.saldo_a_faturar || 0
            };
          }
        });
        setSelecoes(sel);

      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDados(false);
      }
    }

    checkNfParaCorrecao();
  }, [modo, nfSelecionadaId, nfsExistentes, itensSaldo]);

  const getVirtualSaldo = (item: ItemSaldo) => {
    if (modo === "CORRIGIR" && nfSelecionadaId && !bloqueioCorrecao) {
      const itemNf = itensNfSelecionada.find(i => i.pedido_item_id === item.pedido_item_id);
      return item.saldo_a_faturar + (itemNf ? itemNf.quantidade : 0);
    }
    return item.saldo_a_faturar;
  };

  const handleToggleSelecionado = (itemId: string, checked: boolean) => {
    setPreviewParcelas([]);
    setSelecoes(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], selecionado: checked }
    }));
  };

  const handleQtdChange = (itemId: string, val: string, max: number) => {
    setPreviewParcelas([]);
    let num = Number(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    
    setSelecoes(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], qtd: num }
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    setPreviewParcelas([]);
    const sel = { ...selecoes };
    itensSaldo.forEach(item => {
      const uniqueId = item.pedido_item_id;
      if (!uniqueId) return;
      
      const virtualSaldo = getVirtualSaldo(item);
      if (virtualSaldo > 0) {
        sel[uniqueId] = {
          ...sel[uniqueId],
          selecionado: checked,
          qtd: checked ? (sel[uniqueId].qtd > 0 ? sel[uniqueId].qtd : virtualSaldo) : sel[uniqueId].qtd
        };
      }
    });
    setSelecoes(sel);
  };

  const isAllSelected = useMemo(() => {
    if (itensSaldo.length === 0) return false;
    const validItems = itensSaldo.filter(i => getVirtualSaldo(i) > 0);
    if (validItems.length === 0) return false;
    return validItems.every(i => selecoes[i.pedido_item_id]?.selecionado);
  }, [itensSaldo, selecoes, modo, nfSelecionadaId, itensNfSelecionada]);

  const itensSelecionadosList = itensSaldo.filter(i => selecoes[i.pedido_item_id]?.selecionado && selecoes[i.pedido_item_id]?.qtd > 0);
  const valorTotalSelecionado = itensSelecionadosList.reduce((acc, item) => {
    return acc + (item.preco_unitario * selecoes[item.pedido_item_id].qtd);
  }, 0);

  // NOVA FUNÇÃO: Resgata a inteligência do Preview Financeiro baseada na parcial selecionada
  const handleGerarPreview = async () => {
    if (itensSelecionadosList.length === 0) return;
    
    setLoadingPreview(true);
    try {
      const itensPayload = itensSelecionadosList.map(item => ({
        pedido_item_id: item.pedido_item_id,
        quantidade: selecoes[item.pedido_item_id].qtd,
        preco_unitario: item.preco_unitario
      }));

      const { data, error } = await supabase.rpc('preview_faturamento_atomico', {
        p_pedido_id: pedido.id,
        p_data_emissao: form.data_emissao_nf,
        p_itens: itensPayload
      });

      if (error) throw new Error(error.message);
      setPreviewParcelas(data || []);
      
      if (data?.length === 0) {
        toast({ title: "Sem parcelas", description: "O sistema não calculou parcelas financeiras para esta simulação.", variant: "default" });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro na Projeção", description: e.message, variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmar = async () => {
    if (itensSelecionadosList.length === 0) {
      toast({ title: "Nenhum item", description: "Selecione ao menos um item para faturar.", variant: "destructive" });
      return;
    }
    if (!form.numero_nf || !form.data_emissao_nf) {
      toast({ title: "Dados Incompletos", description: "Informe o número e a data da NF.", variant: "destructive" });
      return;
    }

    if (modo === "CORRIGIR" && (!nfSelecionadaId || bloqueioCorrecao)) {
      toast({ title: "Operação Bloqueada", description: "Verifique os alertas antes de salvar.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const itensPayload = itensSelecionadosList.map(item => ({
        pedido_item_id: item.pedido_item_id,
        quantidade: selecoes[item.pedido_item_id].qtd,
        preco_unitario: item.preco_unitario
      }));

      const { error: rpcError } = await supabase.rpc('faturar_pedido_atomico', {
        p_pedido_id: pedido.id,
        p_nota_fiscal_id: modo === 'CORRIGIR' ? nfSelecionadaId : null,
        p_numero: form.numero_nf,
        p_data_emissao: form.data_emissao_nf,
        p_itens: itensPayload
      });

      if (rpcError) throw new Error(rpcError.message);

      toast({ title: "Sucesso", description: "Faturamento processado!" });
      onSuccess?.();
      onOpenChange(false);
      
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro na transação", description: e.message || "Erro desconhecido.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  if (isReadOnly) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Faturamento</DialogTitle>
            <DialogDescription>
              Selecione os itens e a quantidade para compor a nota fiscal.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center text-muted-foreground">
            Visualização de faturamento (legado/read-only). Para faturar, use a tela em modo de edição.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Faturamento</DialogTitle>
          <DialogDescription>
            Selecione os itens e a quantidade para compor a nota fiscal.
          </DialogDescription>
        </DialogHeader>

        {loadingDados ? (
          <div className="py-12 text-center text-muted-foreground">Carregando itens e verificando NFs...</div>
        ) : (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg text-sm border">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Cliente</span>
                <span className="font-semibold">{pedido?.cliente_nome || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Fornecedor / Emissor</span>
                <span className="font-semibold text-blue-700">{fornecedorNome}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Valor Total (Pedido)</span>
                <span className="font-bold text-emerald-600">{formatMoney(pedido?.valor_total_pedido)}</span>
              </div>
            </div>

            {nfsExistentes.length > 0 && (
              <div className="space-y-4 border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                <div className="flex gap-2 items-start">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 text-sm">Este pedido já possui NFs emitidas</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Você pode complementar com uma nova nota ou corrigir o faturamento de uma nota existente.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <RadioGroup 
                    value={modo} 
                    onValueChange={(val) => setModo(val as ModoFaturamento)}
                    className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="COMPLEMENTAR" id="r-comp" />
                      <Label htmlFor="r-comp" className="cursor-pointer font-medium text-blue-900">Complementar (Nova NF)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CORRIGIR" id="r-corr" />
                      <Label htmlFor="r-corr" className="cursor-pointer font-medium text-blue-900">Corrigir NF Existente</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {modo === "CORRIGIR" && (
                  <div className="pt-3 border-t border-blue-200/50 mt-3 space-y-2">
                    <Label className="text-blue-900">Selecione a Nota Fiscal para corrigir:</Label>
                    <Select value={nfSelecionadaId} onValueChange={setNfSelecionadaId}>
                      <SelectTrigger className="bg-white text-slate-900 border-blue-200">
                        <SelectValue placeholder="Escolha uma NF..." />
                      </SelectTrigger>
                      <SelectContent>
                        {nfsExistentes.map(nf => (
                          <SelectItem key={nf.id} value={nf.id}>
                            NF: {nf.numero || 'S/N'} — {formatMoney(nf.valor_total)} — Emissão: {nf.data_emissao ? nf.data_emissao.split('T')[0] : 'N/I'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {bloqueioCorrecao && (
              <div className="bg-rose-50 text-rose-800 p-4 rounded-lg border border-rose-200 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
                <div className="text-sm font-medium">{bloqueioCorrecao}</div>
              </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border ${bloqueioCorrecao ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-1.5">
                <Label>Número da NF</Label>
                <Input
                  value={form.numero_nf}
                  onChange={e => {
                    setForm({ ...form, numero_nf: e.target.value });
                    setPreviewParcelas([]); // Limpa simulação se alterar dados
                  }}
                  placeholder="Ex: 12345"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Emissão</Label>
                <Input
                  type="date"
                  value={form.data_emissao_nf}
                  onChange={e => {
                    setForm({ ...form, data_emissao_nf: e.target.value });
                    setPreviewParcelas([]); // Limpa simulação se alterar dados
                  }}
                />
              </div>
            </div>

            <div className={`space-y-3 ${bloqueioCorrecao ? 'opacity-50 pointer-events-none' : ''}`}>
              <h4 className="font-semibold text-sm">Itens Disponíveis para Faturamento</h4>
              <div className="border rounded-md overflow-x-auto bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 w-10">
                        <Checkbox 
                          checked={isAllSelected}
                          onCheckedChange={(c) => handleSelectAll(!!c)}
                        />
                      </th>
                      <th className="px-3 py-2">Item / Descrição</th>
                      <th className="px-3 py-2 text-center">Saldo Restante</th>
                      <th className="px-3 py-2 text-right">Preço Unit.</th>
                      <th className="px-3 py-2 w-32">Qtd a Faturar</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {itensSaldo.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          Todos os itens deste pedido já foram faturados.
                        </td>
                      </tr>
                    ) : (
                      itensSaldo.map(item => {
                        const uniqueId = item.pedido_item_id;
                        const s = selecoes[uniqueId] || { selecionado: false, qtd: 0 };
                        const virtualSaldo = getVirtualSaldo(item);
                        const semSaldo = virtualSaldo <= 0;
                        const subtotal = item.preco_unitario * s.qtd;
                        
                        return (
                          <tr key={uniqueId} className={`${semSaldo ? 'opacity-50 bg-muted/20' : 'hover:bg-muted/50 transition-colors'}`}>
                            <td className="px-3 py-3">
                              <Checkbox 
                                disabled={semSaldo}
                                checked={s.selecionado}
                                onCheckedChange={(c) => handleToggleSelecionado(uniqueId, !!c)}
                              />
                            </td>
                            <td className="px-3 py-3 font-medium">{item.descricao}</td>
                            <td className="px-3 py-3 text-center">{virtualSaldo}</td>
                            <td className="px-3 py-3 text-right">{formatMoney(item.preco_unitario)}</td>
                            <td className="px-3 py-3">
                              <Input 
                                type="number" 
                                min="0" 
                                max={virtualSaldo}
                                value={s.qtd}
                                onChange={(e) => handleQtdChange(uniqueId, e.target.value, virtualSaldo)}
                                disabled={!s.selecionado || semSaldo}
                                className="h-8 text-right"
                              />
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-emerald-600">
                              {s.selecionado ? formatMoney(subtotal) : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`flex justify-between items-center bg-primary/10 border border-primary/20 p-4 rounded-lg ${bloqueioCorrecao ? 'opacity-50' : ''}`}>
              <span className="font-semibold text-primary">Total desta Nota Fiscal:</span>
              <span className="text-xl font-bold text-primary">{formatMoney(valorTotalSelecionado)}</span>
            </div>

            {/* SEÇÃO DO PREVIEW RESTAURADA E DINÂMICA */}
            {!bloqueioCorrecao && itensSelecionadosList.length > 0 && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/10">
                 <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-sm">Simulação Financeira</h4>
                      <p className="text-xs text-muted-foreground">Visualize como as parcelas e comissões ficarão no sistema antes de salvar.</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={(e) => { e.preventDefault(); handleGerarPreview(); }} disabled={loadingPreview} className="gap-2">
                      <Calculator className="h-4 w-4" />
                      {loadingPreview ? "Calculando..." : "Gerar Previsão"}
                    </Button>
                 </div>
                 
                 {previewParcelas.length > 0 && (
                   <div className="overflow-x-auto border rounded-md bg-white shadow-sm">
                     <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs uppercase text-left">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Tipo</th>
                            <th className="px-4 py-2 font-semibold">Categoria</th>
                            <th className="px-4 py-2 font-semibold text-center">Parcela</th>
                            <th className="px-4 py-2 font-semibold">Vencimento</th>
                            <th className="px-4 py-2 font-semibold text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {previewParcelas.map((p, idx) => (
                            <tr key={idx} className="hover:bg-muted/50">
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  p.tipo === 'RECEBER' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {p.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-medium capitalize">{p.categoria.replace(/_/g, ' ').toLowerCase()}</td>
                              <td className="px-4 py-2 text-center">{p.parcela}</td>
                              <td className="px-4 py-2">
                                {p.vencimento ? p.vencimento.split('-').reverse().join('/') : '—'}
                              </td>
                              <td className="px-4 py-2 text-right font-bold">{formatMoney(p.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                     </table>
                   </div>
                 )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 pt-4 border-t gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={(e) => { e.preventDefault(); handleConfirmar(); }}
            disabled={loadingDados || isProcessing || itensSelecionadosList.length === 0 || !form.numero_nf || !!bloqueioCorrecao || (modo === "CORRIGIR" && !nfSelecionadaId)}
          >
            {isProcessing ? "Processando..." : (modo === "CORRIGIR" ? "Salvar Correção" : "Emitir NF Parcial")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
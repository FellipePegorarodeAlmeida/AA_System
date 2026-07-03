import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Download, Search, Eye, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Pedido, Cliente, ContaReceber, ContaPagar, OrcamentoFechamento } from "@/types/database";

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

export default function ResultadoLfaPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Record<string, string>>({});
  const [receber, setReceber] = useState<Record<string, ContaReceber[]>>({});
  const [pagar, setPagar] = useState<Record<string, ContaPagar[]>>({});
  const [fechamentos, setFechamentos] = useState<Record<string, OrcamentoFechamento>>({});
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [pedRes, cliRes, recRes, pagRes, fechRes] = await Promise.all([
        supabase.from("pedidos").select(`
          *,
          itens:pedido_itens (
            fornecedor:fornecedores (nome)
          )
        `).order("created_at", { ascending: false }),
        supabase.from("clientes").select("id, nome"),
        supabase.from("contas_receber").select("*"),
        supabase.from("contas_pagar").select("*"),
        supabase.from("pedido_fechamento").select("*")
      ]);

      if (pedRes.error) throw pedRes.error;
      
      const pedidosNaoFaturados = (pedRes.data || []).filter((p: any) => p.status !== "FATURADO" && (!p.numero_nf || p.numero_nf.toString().trim() === ''));
      setPedidos(pedidosNaoFaturados);

      const cliMap: Record<string, string> = {};
      (cliRes.data || []).forEach((c: any) => { if (c.id) cliMap[c.id] = c.nome; });
      setClientes(cliMap);

      const recMap: Record<string, ContaReceber[]> = {};
      (recRes.data || []).forEach((r: any) => {
        if (r.pedido_id) {
          if (!recMap[r.pedido_id]) recMap[r.pedido_id] = [];
          recMap[r.pedido_id].push(r);
        }
      });
      setReceber(recMap);

      const pagMap: Record<string, ContaPagar[]> = {};
      (pagRes.data || []).forEach((p: any) => {
        if (p.pedido_id) {
          if (!pagMap[p.pedido_id]) pagMap[p.pedido_id] = [];
          pagMap[p.pedido_id].push(p);
        }
      });
      setPagar(pagMap);

      const fechMap: Record<string, OrcamentoFechamento> = {};
      (fechRes.data || []).forEach((f: any) => {
        if (f.pedido_id) fechMap[f.pedido_id] = f;
      });
      setFechamentos(fechMap);

    } catch (err: any) {
      console.error("Erro ao carregar dados Projeção Futura:", err);
      toast({ title: "Erro ao carregar dados", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // Calculation logic
  const getResultadoLiquido = (pedidoId: string) => {
    const titulosReceber = receber[pedidoId] || [];
    const titulosPagar = pagar[pedidoId] || [];

    if (titulosReceber.length === 0) {
      return {
        valor: fechamentos[pedidoId]?.comissao_lfa_valor || 0,
        isExpectativa: true
      };
    }

    // "Somar créditos de 'REAL_LFA' em contas_receber"
    const creditosLfa = titulosReceber
      .filter((r) => r.categoria === "REAL_LFA" || r.observacoes?.includes("REAL_LFA"))
      .reduce((acc, curr) => acc + (curr.valor || 0), 0);

    // "subtrair débitos de 'IMPOSTO' e 'COMISSAO_AGENTE' em contas_pagar"
    const debitosLfa = titulosPagar
      .filter((p) => 
        p.categoria === "IMPOSTO" || p.categoria === "COMISSAO_AGENTE" ||
        p.observacoes?.includes("IMPOSTO") || p.observacoes?.includes("COMISSAO_AGENTE")
      )
      .reduce((acc, curr) => acc + (curr.valor || 0), 0);

    return {
      valor: creditosLfa - debitosLfa,
      isExpectativa: false
    };
  };

  const filtered = pedidos.filter((p) => {
    const search = searchTerm.toLowerCase().replace(/#/g, '');
    const num = (p.numero || "").toString().toLowerCase();
    const cli = (clientes[p.cliente_id] || "").toLowerCase();
    const fornecedores = Array.from(new Set(p.itens?.map((i: any) => i.fornecedor?.nome).filter(Boolean))).join(" ").toLowerCase();
    const op = (p.modelo_operacao || "").toLowerCase();
    return num.includes(search) || cli.includes(search) || fornecedores.includes(search) || op.includes(search);
  });

  const totais = filtered.reduce((acc, p) => {
    const { valor: projecao } = getResultadoLiquido(p.id);
    const valorPedido = Number(p.valor_total_pedido || p.total || fechamentos[p.id]?.valor_final_venda || 0);
    return {
      valorTotalPedidos: acc.valorTotalPedidos + valorPedido,
      projecaoTotal: acc.projecaoTotal + projecao
    };
  }, { valorTotalPedidos: 0, projecaoTotal: 0 });

  const exportCSV = () => {
    const headers = ["Pedido", "Cliente", "Fornecedor", "Operacao", "Valor Total", "Resultado Liquido LFA", "Eh Expectativa"];
    const rows = filtered.map(p => {
      const result = getResultadoLiquido(p.id);
      const valorTotal = p.valor_total_pedido || p.total || fechamentos[p.id]?.valor_final_venda || 0;
      const fornecedores = Array.from(new Set(p.itens?.map((i: any) => i.fornecedor?.nome).filter(Boolean))).join(" | ") || "Sem Fornecedor";
      return [
        p.numero,
        clientes[p.cliente_id] || "Sem Nome",
        fornecedores,
        p.modelo_operacao,
        valorTotal,
        result.valor,
        result.isExpectativa ? "SIM" : "NAO"
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resultado_lfa.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projeção Futura"
        description="Projeção de comissões e receitas de pedidos em andamento (ainda não faturados)."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 border rounded-xl bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Volume de Vendas em Produção</span>
          <span className="text-2xl font-black text-slate-700 mt-2">{formatMoney(totais.valorTotalPedidos)}</span>
        </div>
        <div className="p-5 border rounded-xl bg-card text-card-foreground shadow-sm flex flex-col justify-between border-emerald-100 dark:border-emerald-900/50">
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider">Projeção LFA (Comissões/Receitas)</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{formatMoney(totais.projecaoTotal)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido, cliente, flag..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={exportCSV} variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="surface-card p-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando resultados...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="Nenhum registro encontrado"
            description="Nenhum pedido em andamento no momento."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="pb-3 font-medium">Pedido</th>
                  <th className="pb-3 font-medium">Cliente</th>
                  <th className="pb-3 font-medium">Fornecedor</th>
                  <th className="pb-3 font-medium">Flag de Operação</th>
                  <th className="pb-3 font-medium">Valor Total</th>
                  <th className="pb-3 font-medium">Projeção / Expectativa</th>
                  <th className="pb-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => {
                  const { valor: resultado, isExpectativa } = getResultadoLiquido(p.id);
                  const isRep = p.modelo_operacao === "REPRESENTACAO";
                  
                  return (
                    <tr key={p.id} className="hover:bg-muted/50 transition-colors group">
                      <td className="py-4 font-medium">#{p.numero}</td>
                      <td className="py-4 font-medium text-foreground">{clientes[p.cliente_id] || "—"}</td>
                      <td className="py-4 text-muted-foreground text-xs">
                        {Array.from(new Set(p.itens?.map((i: any) => i.fornecedor?.nome).filter(Boolean))).join(", ") || "—"}
                      </td>
                      <td className="py-4">
                        <Badge variant="outline" className={`text-[10px] font-bold tracking-wider ${isRep ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {p.modelo_operacao || "DESCONHECIDO"}
                        </Badge>
                      </td>
                      <td className="py-4 font-semibold text-slate-700">
                        {formatMoney(p.valor_total_pedido || p.total || fechamentos[p.id]?.valor_final_venda || 0)}
                      </td>
                      <td className="py-4">
                        <div className="font-bold text-emerald-600">{formatMoney(resultado)}</div>
                        {isExpectativa && <div className="text-[10px] text-muted-foreground uppercase mt-1">Expectativa de Ganho</div>}
                      </td>
                      <td className="py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedPedido(p)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={!!selectedPedido} onOpenChange={(open) => !open && setSelectedPedido(null)}>
        <SheetContent className="sm:max-w-md md:max-w-xl overflow-y-auto w-full">
          <SheetHeader className="mb-6">
            <SheetTitle>Detalhamento Financeiro</SheetTitle>
            <SheetDescription>
              Pedido #{selectedPedido?.numero} • {selectedPedido ? clientes[selectedPedido.cliente_id] : ""}
            </SheetDescription>
          </SheetHeader>

          {selectedPedido && (
            <div className="space-y-6">
              {/* RESTRIÇÃO: Utilizar a estrutura de colunas mapeada: valor_final_venda, comissao_lfa_valor, imposto_valor */}
              {fechamentos[selectedPedido.id] && (
                <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm border">
                  <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Base Fechamento (Referência)</h4>
                  <div className="flex justify-between"><span className="text-muted-foreground">Valor do Pedido:</span> <span className="font-medium">{formatMoney(selectedPedido.total || selectedPedido.valor_total_pedido || fechamentos[selectedPedido.id]?.valor_final_venda || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Comissão LFA:</span> <span className="font-medium">{formatMoney(fechamentos[selectedPedido.id].comissao_lfa_valor)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Imposto Estimado:</span> <span className="font-medium">{formatMoney(fechamentos[selectedPedido.id].imposto_valor)}</span></div>
                </div>
              )}

              <div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Contas a Receber
                </h4>
                {receber[selectedPedido.id]?.length ? (
                  <div className="space-y-3">
                    {receber[selectedPedido.id].map((r) => {
                      const isRealLfa = r.categoria === "REAL_LFA" || r.observacoes?.includes("REAL_LFA");
                      return (
                        <div key={r.id} className={`p-3 rounded border text-sm flex flex-col gap-2 ${isRealLfa ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-semibold">Parcela {r.parcela}</span>
                              <div className="text-xs text-muted-foreground mt-0.5">Venc: {r.vencimento ? new Date(r.vencimento).toLocaleDateString('pt-BR') : "—"}</div>
                            </div>
                            <span className="font-bold text-emerald-700">{formatMoney(r.valor)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {r.status}
                            </Badge>
                            <span className={`text-[10px] font-semibold uppercase ${isRealLfa ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {isRealLfa ? "Fluxo Real LFA" : "Monitoramento"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground border border-dashed rounded p-4 text-center">
                    Nenhum título a receber gerado.
                    <div className="mt-2 text-xs font-semibold uppercase text-emerald-600/70">Expectativa de Ganho: {formatMoney(fechamentos[selectedPedido.id]?.comissao_lfa_valor || 0)}</div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Contas a Pagar
                </h4>
                {pagar[selectedPedido.id]?.length ? (
                  <div className="space-y-3">
                    {pagar[selectedPedido.id].map((p) => {
                      const isDebitLfa = p.categoria === "IMPOSTO" || p.categoria === "COMISSAO_AGENTE" || p.observacoes?.includes("IMPOSTO") || p.observacoes?.includes("COMISSAO_AGENTE");
                      return (
                        <div key={p.id} className={`p-3 rounded border text-sm flex flex-col gap-2 ${isDebitLfa ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-semibold">{p.categoria || "Parcela " + p.parcela}</span>
                              <div className="text-xs text-muted-foreground mt-0.5">Venc: {p.vencimento ? new Date(p.vencimento).toLocaleDateString('pt-BR') : "—"}</div>
                            </div>
                            <span className="font-bold text-red-700">{formatMoney(p.valor)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {p.status}
                            </Badge>
                            <span className={`text-[10px] font-semibold uppercase ${isDebitLfa ? 'text-red-600' : 'text-slate-400'}`}>
                              {isDebitLfa ? "Fluxo Real LFA" : "Monitoramento"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground border border-dashed rounded p-4 text-center">Nenhum título a pagar gerado.</div>
                )}
              </div>
              
              <div className="pt-4 border-t flex justify-between items-center">
                <span className="font-bold text-muted-foreground">
                  {getResultadoLiquido(selectedPedido.id).isExpectativa ? "Expectativa de Ganho" : "Projeção Futura"}
                </span>
                <span className="font-black text-emerald-600 text-xl">{formatMoney(getResultadoLiquido(selectedPedido.id).valor)}</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

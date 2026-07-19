import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { useItensPcp, useUpdateItemPcp } from "@/hooks/use-pcp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Factory, CalendarClock, ChevronDown, ChevronRight, Printer, Download, ExternalLink } from "lucide-react";

export default function PcpPage() {
  const navigate = useNavigate();
  const { data: itens, isLoading } = useItensPcp();
  const { mutate: updateItem } = useUpdateItemPcp();

  // Agrupamento por fornecedor
  const itensAgrupados = useMemo(() => {
    if (!itens) return {};
    return itens.reduce((acc: any, item: any) => {
      const fornecedor = item.fornecedor_nome || "SEM FORNECEDOR";
      if (!acc[fornecedor]) acc[fornecedor] = [];
      acc[fornecedor].push(item);
      return acc;
    }, {});
  }, [itens]);

  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});

  const handlePrint = (target: 'ALL' | string) => {
    navigate(`/pcp/imprimir?fornecedor=${encodeURIComponent(target)}`);
  };

  const handleExportCSV = (dados: any[], nomeArquivo: string) => {
    const cabecalho = ["Item", "Material", "Pedido", "Cliente", "Fornecedor", "Qtd", "Status", "Previsao"];
    const linhas = dados.map(i => [
      i.item_numero,
      `"${i.item_descricao || ''}"`,
      i.pedido_numero,
      `"${i.cliente_nome || ''}"`,
      `"${i.fornecedor_nome || ''}"`,
      i.quantidade || 0,
      i.item_status,
      i.data_entrega_efetiva ? i.data_entrega_efetiva.split('T')[0] : ""
    ]);
    
    const csvContent = [cabecalho.join(";"), ...linhas.map(l => l.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${nomeArquivo}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSupplier = (fornecedor: string) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [fornecedor]: prev[fornecedor] === false ? true : false
    }));
  };

  const handleStatusChange = (id: string, novoStatus: string) => {
    updateItem({ id, data: { status: novoStatus } });
  };

  const handleDateChange = (id: string, novaData: string) => {
    updateItem({ id, data: { previsao_entrega: novaData || null } });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  if (isLoading) return <div className="p-8 text-center">Carregando painel de produção...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="PCP / Produção" 
          description="Controle de itens em linha de produção agrupados por fornecedor." 
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExportCSV(itens || [], "PCP_Global")} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV Geral
          </Button>
          <Button variant="default" onClick={() => handlePrint('ALL')} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Relatório Geral
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(itensAgrupados).map(([fornecedor, listaItens]: [string, any]) => (
          <div key={fornecedor} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-muted/50 p-3 border-b flex items-center justify-between group">
              <div 
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={() => toggleSupplier(fornecedor)}
              >
                {expandedSuppliers[fornecedor] !== false ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <Factory className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">{fornecedor}</h2>
                <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                  {listaItens.length} itens
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => handleExportCSV(listaItens, `PCP_${fornecedor.replace(/\s+/g, '_')}`)}
                  title={`Baixar CSV de ${fornecedor}`}
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-2"
                  onClick={() => handlePrint(fornecedor)}
                  title={`Imprimir pauta de ${fornecedor}`}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Pauta
                </Button>
              </div>
            </div>
            
            {expandedSuppliers[fornecedor] !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/20 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="p-3 w-16">Item</th>
                      <th className="p-3">Material</th>
                      <th className="p-3 w-24">Pedido</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3 w-24">Qtd</th>
                      <th className="p-3 w-48">Status</th>
                      <th className="p-3 w-40">Previsão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {listaItens.map((item: any) => (
                      <tr key={item.item_id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-black text-slate-500 align-top">
                          #{item.item_numero}
                        </td>
                        <td className="p-3 align-top font-bold text-foreground">
                          {item.item_descricao}
                        </td>
                        <td className="p-3 align-top">
                          <Link 
                            to={`/pedidos/${item.pedido_id}`} 
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline font-semibold transition-colors"
                            title="Abrir detalhes do pedido"
                          >
                            #{item.pedido_numero}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                        <td className="p-3 align-top font-semibold">
                          {item.cliente_nome}
                        </td>
                        <td className="p-3 font-semibold align-top">{item.quantidade || 0}</td>
                        <td className="p-3 align-top">
                          <Select
                            value={item.item_status || "ABERTO"}
                            onValueChange={(v) => handleStatusChange(item.item_id, v)}
                          >
                            <SelectTrigger className="h-8 text-[10px] font-bold uppercase bg-background border-input text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ABERTO">00 - Aberto</SelectItem>
                                <SelectItem value="AGUARDANDO_PROVA">01 - Ag. Prova</SelectItem>
                                <SelectItem value="EM_PROVA_FISICA">02.1 - Prova Física</SelectItem>
                                <SelectItem value="EM_PROVA_VIRTUAL">02.2 - Prova Virtual</SelectItem>
                                <SelectItem value="AGUARDANDO_TROCA_ARQUIVO">03 - Ag. Troca Arquivo</SelectItem>
                                <SelectItem value="PRODUCAO_LIBERADA">04 - Prod. Liberada</SelectItem>
                                <SelectItem value="EM_IMPRESSAO">05 - Em Impressão</SelectItem>
                                <SelectItem value="CAPA_IMPRESSA_FALTA_MIOLO">05.1 - Capa Impressa</SelectItem>
                                <SelectItem value="MIOLO_IMPRESSO_FALTA_CAPA">05.2 - Miolo Impresso</SelectItem>
                                <SelectItem value="EM_ACABAMENTO_INTERNO">06 - Em Acabamento</SelectItem>
                                <SelectItem value="EM_TERCEIRO">07 - Em Terceiro</SelectItem>
                                <SelectItem value="FINALIZADO_AG_EXPEDICAO">08 - Ag. Expedição</SelectItem>
                                <SelectItem value="EM_TRANSPORTE">09 - Em Transporte</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 align-top">
                          <div className="flex items-center gap-2">
                            <Input 
                              type="date" 
                              className="h-8 text-xs font-medium"
                              value={item.data_entrega_efetiva ? item.data_entrega_efetiva.split('T')[0] : ""}
                              onChange={(e) => handleDateChange(item.item_id, e.target.value)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {(!itens || itens.length === 0) && (
          <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
            <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum item em produção no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

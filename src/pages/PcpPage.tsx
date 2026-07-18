import { useState, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useItensPcp, useUpdateItemPcp } from "@/hooks/use-pcp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Factory, CalendarClock } from "lucide-react";

export default function PcpPage() {
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
      <PageHeader 
        title="PCP / Produção" 
        description="Controle de itens em linha de produção agrupados por fornecedor." 
      />

      <div className="space-y-8">
        {Object.entries(itensAgrupados).map(([fornecedor, listaItens]: [string, any]) => (
          <div key={fornecedor} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-muted/50 p-4 border-b flex items-center gap-3">
              <Factory className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">{fornecedor}</h2>
              <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                {listaItens.length} itens
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/20 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="p-3 w-16">Ped.</th>
                    <th className="p-3">Item / Cliente</th>
                    <th className="p-3 w-24">Qtd</th>
                    <th className="p-3 w-56">Status (PCP)</th>
                    <th className="p-3 w-48">Previsão Entrega</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {listaItens.map((item: any) => (
                    <tr key={item.item_id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-black text-slate-500 align-top">
                        #{item.pedido_numero}
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-bold text-foreground">{item.item_descricao}</div>
                        <div className="text-xs text-muted-foreground mt-1">Item #{item.item_numero} • {item.cliente_nome}</div>
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
                              {/* Não listar Entregue ou Cancelado aqui, pois a view já ignora */}
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

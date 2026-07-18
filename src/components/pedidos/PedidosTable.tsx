import { ArrowRight, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

const formatMoney = (value: number | null | undefined) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  if (dateStr.includes('T00:00:00') || !dateStr.includes('T')) {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  }
  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(dateStr));
  } catch (e) {
    return "-";
  }
};

const getStatusColor = (status: string | null | undefined) => {
  if (!status) return "bg-slate-500/20 text-slate-300 border border-slate-500/30";
  switch (status.toUpperCase()) {
    case "ABERTO": 
      return "bg-slate-500/20 text-slate-300 border border-slate-500/30";
    case "AGUARDANDO_PROVA":
    case "EM_PROVA_FISICA":
    case "EM_PROVA_VIRTUAL":
    case "AGUARDANDO_TROCA_ARQUIVO": 
      return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
    case "PRODUCAO_LIBERADA": 
      return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    case "EM_PRODUCAO": 
    case "EM_IMPRESSAO":
    case "CAPA_IMPRESSA_FALTA_MIOLO":
    case "MIOLO_IMPRESSO_FALTA_CAPA":
    case "EM_ACABAMENTO_INTERNO":
    case "EM_TERCEIRO": 
      return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    case "FINALIZADO_AG_EXPEDICAO":
    case "EM_TRANSPORTE": 
      return "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30";
    case "ENTREGUE":
    case "CONCLUIDO": 
      return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    case "CANCELADO": 
      return "bg-red-500/20 text-red-400 border border-red-500/30";
    default: 
      return "bg-slate-500/20 text-slate-300 border border-slate-500/30";
  }
};

interface PedidosTableProps {
  pedidos: any[];
  clientes: Record<string, string>;
  orcamentos: Record<string, number>;
  onRowClick: (id: string) => void;
  onFaturarClick: (pedido: any, readOnly?: boolean) => void;
}

export function PedidosTable({ pedidos, clientes, orcamentos, onRowClick, onFaturarClick }: PedidosTableProps) {
  if (!pedidos || !Array.isArray(pedidos)) {
      return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
          <tr>
            <th className="pb-3 pl-2 font-bold">Número</th>
            <th className="pb-3 font-bold">Cliente</th>
            <th className="pb-3 font-bold">Fornecedor</th>
            <th className="pb-3 font-bold">Modelo</th>
            <th className="pb-3 font-bold">Status</th>
            <th className="pb-3 font-bold">Valor Total</th>
            <th className="pb-3 font-bold">Emissão</th>
            <th className="pb-3 font-bold">Orçamento</th>
            <th className="pb-3 pr-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pedidos.map((p) => {
             // Verificação de segurança: se o pedido em si for nulo, ignora.
             if (!p) return null;

             return (
            <tr 
              key={p.id || `temp-${Math.random()}`} // Fallback de key se não houver ID 
              className="group hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => p.id && onRowClick(p.id)}
            >
              <td className="py-4 pl-2">
                <div className="font-medium text-primary">
                  <div className="flex items-center gap-2">
                    <span className="font-black">#{p.numero || "-"}</span>
                    {p.numero_nf && (
                      <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded shadow-sm font-bold uppercase tracking-wider">
                        <FileText className="h-3 w-3" /> NF: {p.numero_nf}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-4">
                <div className="flex flex-col">
                  <span className="font-semibold">{p.cliente_nome || "Cliente não encontrado"}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{p.cliente_id ? p.cliente_id.slice(0, 8) : "---"}...</span>
                </div>
              </td>
              <td className="py-4">
                <span className="font-semibold">{p.fornecedor_nome || "-"}</span>
              </td>
              <td className="py-4">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${p.modelo_operacao === "REVENDA" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700"}`}>
                  {p.modelo_operacao || "-"}
                </span>
              </td>
              <td className="py-4">
                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${getStatusColor(p.status)}`}>
                  {(p.status || "ABERTO").replace("_", " ")}
                </span>
              </td>
              <td className="py-4">
                <div className="flex flex-col">
                  <span className="font-bold">
                    {formatMoney(p.valor_total_pedido)}
                  </span>
                  {p.is_bonificado && (
                    <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 w-fit mt-0.5">
                      Bonificado
                    </span>
                  )}
                </div>
              </td>
              <td className="py-4 text-muted-foreground">
                {formatDate(p.created_at)}
              </td>
              <td className="py-4">
                {p.orcamento_id ? (
                  <span className="text-xs text-blue-600 font-bold flex items-center gap-1 w-fit bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    <FileText className="h-3 w-3" />
                    Orçamento #{orcamentos[p.orcamento_id as string] || "—"}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-4 pr-2 text-right">
                <div className="flex justify-end items-center gap-2">
                  {(p.status !== "CONCLUIDO" && p.status !== "CANCELADO") && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFaturarClick(p);
                      }}
                      title="Faturar"
                    >
                      <Receipt className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
}
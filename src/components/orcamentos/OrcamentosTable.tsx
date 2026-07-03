import { FileText, Plus, ExternalLink, Pencil, Search, ShoppingCart, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";

interface OrcamentosTableProps {
  list: any[];
  pedidos: Record<string, number>;
  loading: boolean;
  onOpenNew: () => void;
  onOpenEdit: (o: any) => void;
  onAbrirPedido?: (o: any) => void;
  onDuplicar?: (id: string) => void;
  isDuplicandoId?: string | null;
  page?: number;
  pageSize?: number | 'all';
  totalCount?: number;
  setPage?: (p: number | ((prev: number) => number)) => void;
  setPageSize?: (s: number | 'all') => void;
}

export function OrcamentosTable({ 
  list, 
  pedidos, 
  loading, 
  onOpenNew, 
  onOpenEdit, 
  onAbrirPedido,
  onDuplicar,
  isDuplicandoId,
  page = 0,
  pageSize = 10,
  totalCount = 0,
  setPage,
  setPageSize
}: OrcamentosTableProps) {
  function formatMoney(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  return (
    <div className="surface-card p-4">
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando orçamentos...</div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum orçamento"
          description="Crie o primeiro orçamento para iniciar o fluxo comercial."
          action={<Button onClick={onOpenNew}><Plus className="h-4 w-4" /> Novo Orçamento</Button>}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2 pr-3">Nº</th>
                <th className="py-2 pr-3">Título</th>
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Operação</th>
                <th className="py-2 pr-3">Valor da Proposta</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o: any) => {
                const isConverted = !!o.convertido_pedido_id;
                const isAprovado = o.status === "APROVADO_COMERCIALMENTE";
                const canAbrirPedido = isAprovado && !isConverted;

                return (
                  <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
                    <td className="py-3 pr-3 font-mono font-bold text-primary">
                      ORC-{new Date(o.created_at).getFullYear()}-{o.numero}
                    </td>
                    <td className="py-3 pr-3 font-medium">{o.titulo}</td>
                    <td className="py-3 pr-3">{o.cliente_nome || "—"}</td>
                    <td className="py-3 pr-3 lowercase first-letter:uppercase">{o.modelo_operacao}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-700">
                          {formatMoney(o.valor_total || 0)}
                        </span>
                        {o.valor_total === 0 && o.is_bonificado && (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 w-fit">
                            Bonificado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase">
                          {o.status === "CONVERTIDO_EM_PEDIDO" ? "Pedido aberto" : o.status}
                        </span>
                        {o.convertido_pedido_id && (
                          <span
                            className="text-[10px] font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Pedido #{pedidos[o.convertido_pedido_id] || ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Botão Duplicar */}
                        {onDuplicar && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => onDuplicar(o.id)} 
                            title="Duplicar"
                            disabled={isDuplicandoId === o.id}
                          >
                            <Copy className={`h-4 w-4 ${isDuplicandoId === o.id ? 'animate-pulse text-muted-foreground' : ''}`} />
                          </Button>
                        )}

                        {/* Botão Editar / Visualizar */}
                        {!isConverted ? (
                          <Button size="sm" variant="ghost" onClick={() => onOpenEdit(o)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => onOpenEdit(o)} title="Visualizar">
                            <Search className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Botão rápido: Abrir Pedido (só para aprovados não convertidos) */}
                        {canAbrirPedido && onAbrirPedido && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-blue-400 text-blue-700 hover:bg-blue-50"
                            onClick={() => onAbrirPedido(o)}
                            title="Abrir Pedido"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Pedido
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {!loading && list.length > 0 && setPage && setPageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-4 border-t gap-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {list.length > 0 ? page * (pageSize === 'all' ? totalCount : pageSize as number) + 1 : 0} a {pageSize === 'all' ? totalCount : Math.min((page + 1) * (pageSize as number), totalCount)} de {totalCount} registros
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Linhas por página:</span>
              <select
                className="border rounded p-1 text-sm bg-background"
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSize(val === 'all' ? 'all' : Number(val));
                  setPage(0);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="all">Todos</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => p + 1)}
                disabled={pageSize === 'all' || (page + 1) * (pageSize as number) >= totalCount}
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

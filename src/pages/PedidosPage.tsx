import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  ShoppingCart, Search, FileText, Calendar, User, 
  ArrowRight, Filter, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { PedidosTable } from "@/components/pedidos/PedidosTable";
import { FaturamentoMasterModal } from "@/components/pedidos/FaturamentoMasterModal";
import type { Pedido, Cliente, Orcamento } from "@/types/database";

export default function PedidosPage() {
  const [faturamentoModalOpen, setFaturamentoModalOpen] = useState(false);
  const [faturamentoModalReadOnly, setFaturamentoModalReadOnly] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);
  const [clientes, setClientes] = useState<Record<string, string>>({});
  const [orcamentos, setOrcamentos] = useState<Record<string, number>>({});
  const [loadingData, setLoadingData] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchItemTerm, setSearchItemTerm] = useState("");
  const [pedidoItensMap, setPedidoItensMap] = useState<Record<string, number[]>>({});
  
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const { data: result, isLoading: loadingPedidos, refetch: refetchPedidos, isRefetching } = useQuery({
    queryKey: ['pedidos_listagem_server', page, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('vw_pedidos_listagem')
        .select('*', { count: 'exact' });

      if (statusFilter && statusFilter !== "TODOS") {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        const isNumber = /^\d+$/.test(searchTerm);
        if (isNumber) {
          query = query.eq('numero', parseInt(searchTerm));
        } else {
          // Omni-search: Busca no nome do cliente OU no nome do fornecedor
          query = query.or(`cliente_nome.ilike.%${searchTerm}%,fornecedor_nome.ilike.%${searchTerm}%`);
        }
      }

      query = query.order('created_at', { ascending: false });

      if (pageSize !== 'all') {
        const from = page * (pageSize as number);
        const to = from + (pageSize as number) - 1;
        query = query.range(from, to);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { data, count: count || 0 };
    }
  });

  const pedidos = result?.data || [];
  const totalCount = result?.count || 0;

  const loading = loadingPedidos || loadingData || isRefetching;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoadingData(true);
    try {
      const [clientesRes, orcamentosRes, itensRes] = await Promise.all([
        supabase.from("clientes").select("id, nome"),
        supabase.from("orcamentos").select("id, numero"),
        supabase.from("pedido_itens").select("pedido_id, numero")
      ]);

      const clienteMap: Record<string, string> = {};
      (clientesRes.data || []).forEach((c: any) => { 
        if (c?.id) clienteMap[c.id] = c?.nome || "Sem nome";
      });
      setClientes(clienteMap);

      const orcamentoMap: Record<string, number> = {};
      (orcamentosRes.data || []).forEach((o: any) => { 
        if (o?.id) orcamentoMap[o.id] = o?.numero;
      });
      setOrcamentos(orcamentoMap);

      const itemsMap: Record<string, number[]> = {};
      (itensRes.data || []).forEach((item: any) => {
        if (item?.pedido_id) {
          if (!itemsMap[item.pedido_id]) itemsMap[item.pedido_id] = [];
          if (item?.numero) itemsMap[item.pedido_id].push(item.numero);
        }
      });
      setPedidoItensMap(itemsMap);

    } catch (error: unknown) {
      console.error("Erro ao carregar pedidos:", error);
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro ao carregar dados", description: msg, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }

  const navigate = useNavigate();

  const handleRowClick = (pedidoId: string) => {
    navigate(`/pedidos/${pedidoId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Pedidos gerados a partir de orçamentos aprovados."
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4 w-full sm:max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pedido ou cliente..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nº Item..."
              className="pl-9"
              type="number"
              value={searchItemTerm}
              onChange={(e) => setSearchItemTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background w-full sm:w-auto"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ABERTO">Aberto</option>
            <option value="EM_PRODUCAO">Em Produção</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="surface-card p-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando pedidos...</div>
        ) : pedidos.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Nenhum pedido encontrado"
            description="Pedidos serão gerados automaticamente a partir de orçamentos aprovados."
          />
        ) : (
          <>
            <PedidosTable 
              pedidos={pedidos}
              clientes={clientes}
              orcamentos={orcamentos}
              onRowClick={handleRowClick}
              onFaturarClick={(pedido, readOnly = false) => {
                setPedidoSelecionado(pedido);
                setFaturamentoModalReadOnly(readOnly);
                setFaturamentoModalOpen(true);
              }}
            />
            
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-4 border-t gap-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {pedidos.length > 0 ? page * (pageSize === 'all' ? totalCount : pageSize as number) + 1 : 0} a {pageSize === 'all' ? totalCount : Math.min((page + 1) * (pageSize as number), totalCount)} de {totalCount} registros
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
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={pageSize === 'all' || (page + 1) * (pageSize as number) >= totalCount}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <FaturamentoMasterModal
        pedido={pedidoSelecionado}
        open={faturamentoModalOpen}
        onOpenChange={setFaturamentoModalOpen}
        onSuccess={() => refetchPedidos()}
        isReadOnly={faturamentoModalReadOnly}
      />
    </div>
  );
}
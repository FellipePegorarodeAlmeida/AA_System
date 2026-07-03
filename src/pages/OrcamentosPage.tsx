import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { OrcamentosTable } from "@/components/orcamentos/OrcamentosTable";
import { OrcamentoFormModal } from "@/components/orcamentos/OrcamentoFormModal";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDuplicarOrcamento } from "@/hooks/use-orcamentos";

export default function OrcamentosPage() {
  const { mutate: duplicar, isPending: isDuplicando, variables: idSendoDuplicado } = useDuplicarOrcamento();
  const [pedidosMap, setPedidosMap] = useState<Record<string, number>>({});
  const [loadingData, setLoadingData] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const { data: result, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orcamentos_listagem_server', page, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('vw_orcamentos_listagem')
        .select('*', { count: 'exact' });

      if (statusFilter && statusFilter !== "TODOS") {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        const isNumber = /^\d+$/.test(searchTerm);
        if (isNumber) {
          query = query.eq('numero', parseInt(searchTerm));
        } else {
          const term = `%${searchTerm}%`;
          query = query.ilike('cliente_nome', term);
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

  const list = result?.data || [];
  const totalCount = result?.count || 0;

  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const idToOpen = searchParams.get("id");
    if (idToOpen && list.length > 0 && !open) {
      const toOpen = list.find((o: any) => o.id === idToOpen);
      if (toOpen) {
        setTimeout(() => handleOpenEdit(toOpen), 100);
      }
    }
  }, [list, searchParams]);

  async function loadData() {
    setLoadingData(true);
    try {
      const { data: pedidosRes } = await supabase.from("pedidos").select("id, numero");
      const pMap: Record<string, number> = {};
      (pedidosRes || []).forEach(p => { pMap[p.id] = p.numero; });
      setPedidosMap(pMap);
    } catch (e) {
      console.error("Erro ao carregar dicionários da página de orçamentos:", e);
    } finally {
      setLoadingData(false);
    }
  }

  const handleOpenNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleOpenEdit = (orcamento: any) => {
    setEditing(orcamento);
    setOpen(true);
  };

  const handleDuplicar = (id: string) => {
    if (window.confirm("Deseja realmente criar uma cópia exata deste orçamento?")) {
      duplicar(id);
    }
  };

  const loading = isLoading || loadingData || isRefetching;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        description="Gestão de cabeçalhos de orçamentos para representação ou revenda."
        actions={
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Orçamento
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número do orçamento ou cliente..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
          />
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
            <option value="RASCUNHO">Rascunho</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="ENVIADO_AO_CLIENTE">Enviado ao Cliente</option>
            <option value="APROVADO_COMERCIALMENTE">Aprovado</option>
            <option value="REPROVADO">Reprovado</option>
            <option value="CONVERTIDO_EM_PEDIDO">Convertido em Pedido</option>
          </select>
        </div>
      </div>
      
      <div className="mt-6">
        <OrcamentosTable 
          list={list}
          pedidos={pedidosMap}
          loading={loading}
          onOpenNew={handleOpenNew}
          onOpenEdit={handleOpenEdit}
          onDuplicar={handleDuplicar}
          isDuplicandoId={isDuplicando ? (idSendoDuplicado as string) : null}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>

      <OrcamentoFormModal 
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

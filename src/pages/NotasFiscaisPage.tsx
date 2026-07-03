import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Sub-componente que busca EXATAMENTE os itens que foram salvos nesta NF parcial
function ExpandedRow({ nfId }: { nfId: string }) {
  const { data: itens, isLoading } = useQuery({
    queryKey: ['nf_detalhes_reais', nfId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nota_fiscal_itens')
        .select(`
          id,
          quantidade,
          preco_unitario,
          pedido_item_id,
          pedido_itens (
            descricao,
            numero
          )
        `)
        .eq('nota_fiscal_id', nfId);

      if (error) {
        console.error("🕵️ ERRO NOS ITENS DA NF:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!nfId
  });

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2" />
          Carregando itens faturados nesta nota...
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="bg-muted/10">
      <TableCell colSpan={7} className="p-0 border-b">
        <div className="p-4 space-y-4">
          <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Itens Faturados nesta Nota Fiscal
          </h4>
          <div className="overflow-hidden border rounded-md bg-background shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-32 text-center">Nº Identificador</TableHead>
                  <TableHead>Descrição do Produto</TableHead>
                  <TableHead className="w-24 text-right">Qtd</TableHead>
                  <TableHead className="w-32 text-right">Preço Unit.</TableHead>
                  <TableHead className="w-32 text-right">Total da Linha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!itens || itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                      Nenhum detalhe localizado nesta Nota Fiscal.
                    </TableCell>
                  </TableRow>
                ) : (
                  itens.map((item: any) => {
                    const totalLinha = Number(item.quantidade) * Number(item.preco_unitario);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        {/* CRÍTICA ATENDIDA: Exibe o número sequencial real/global vindo direto da tabela pedido_itens */}
                        <TableCell className="text-xs text-center font-mono font-bold text-blue-700 bg-blue-50/50">
                          {item.pedido_itens?.numero ? `#${item.pedido_itens.numero}` : '-'}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {item.pedido_itens?.descricao || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {item.quantidade}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_unitario || 0)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLinha)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Página Principal
export default function NotasFiscaisPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const { data: result, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notas_fiscais_diretas', page, pageSize, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('notas_fiscais')
        .select(`
          id,
          numero,
          data_emissao,
          valor_total,
          pedidos!notas_fiscais_pedido_id_fkey ( numero ),
          fornecedores ( nome ),
          clientes ( nome )
        `, { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('numero', `%${searchTerm}%`);
      }

      query = query.order('created_at', { ascending: false });

      if (pageSize !== 'all') {
        const from = page * (pageSize as number);
        const to = from + (pageSize as number) - 1;
        query = query.range(from, to);
      }

      const { data, count, error } = await query;
      
      if (error) {
        console.error("🕵️ ALARME DO SUPABASE:", error);
        alert("Erro na busca: " + error.message + " \n\nDetalhes: " + (error.details || "Sem detalhes adicionais"));
        throw error;
      }
      
      return { data: data || [], count: count || 0 };
    }
  });

  const notas = result?.data || [];
  const totalCount = result?.count || 0;

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "—";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de Notas Fiscais"
        description="Relação de faturamentos e auditoria de itens."
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número da NF..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()} 
          disabled={isLoading || isRefetching}
          className="w-full sm:w-auto gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="surface-card p-0 overflow-hidden border rounded-lg bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nº NF</TableHead>
                <TableHead>Fornecedor (Emissor)</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data Emissão</TableHead>
                <TableHead>Pedido Vinculado</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Carregando notas fiscais...
                  </TableCell>
                </TableRow>
              ) : notas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhuma nota fiscal encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                notas.map((nf: any) => {
                  return (
                    <Fragment key={nf.id}>
                      <TableRow 
                        className={`hover:bg-muted/30 cursor-pointer transition-colors ${expandedRows[nf.id] ? 'bg-muted/10' : ''}`}
                        onClick={() => toggleRow(nf.id)}
                      >
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {expandedRows[nf.id] ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">{nf.numero || 'S/N'}</TableCell>
                        <TableCell>{nf.fornecedores?.nome || "—"}</TableCell>
                        <TableCell>{nf.clientes?.nome || "—"}</TableCell>
                        <TableCell>{formatDate(nf.data_emissao)}</TableCell>
                        <TableCell>
                          {nf.pedidos?.numero ? (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full font-medium">
                              #{nf.pedidos.numero}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          {formatMoney(nf.valor_total)}
                        </TableCell>
                      </TableRow>
                      
                      {expandedRows[nf.id] && (
                        <ExpandedRow nfId={nf.id} />
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {notas.length > 0 ? page * (pageSize === 'all' ? totalCount : pageSize as number) + 1 : 0} a {pageSize === 'all' ? totalCount : Math.min((page + 1) * (pageSize as number), totalCount)} de {totalCount} registros
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
      </div>
    </div>
  );
}
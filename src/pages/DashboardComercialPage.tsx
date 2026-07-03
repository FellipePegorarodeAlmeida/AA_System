import { useState, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  ShoppingCart, 
  Receipt, 
  Calendar,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Filter
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardComercialPage() {
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });

  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [tipoProdutoSelecionado, setTipoProdutoSelecionado] = useState<string>("TODOS");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Queries for options
  const { data: clientesOptions = [] } = useQuery({
    queryKey: ['clientes_options_dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('id, nome').order('nome');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: tiposProdutoOptions = [] } = useQuery({
    queryKey: ['tipos_produto_options_dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_produto').select('nome').order('nome');
      if (error) throw error;
      return data || [];
    }
  });

  const toggleRow = (cliente_nome: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(cliente_nome)) {
      newSet.delete(cliente_nome);
    } else {
      newSet.add(cliente_nome);
    }
    setExpandedRows(newSet);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['analise_comercial', dataInicio, dataFim, clientesSelecionados, tipoProdutoSelecionado],
    queryFn: async () => {
      let query = supabase
        .from('vw_analise_comercial_itens')
        .select('*');

      if (dataInicio) {
        query = query.gte('data_emissao', dataInicio);
      }
      if (dataFim) {
        query = query.lte('data_emissao', dataFim);
      }

      if (clientesSelecionados.length > 0) {
        query = query.in('cliente_id', clientesSelecionados);
      }

      if (tipoProdutoSelecionado && tipoProdutoSelecionado !== "TODOS") {
        query = query.eq('tipo_producao', tipoProdutoSelecionado);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const { faturamentoTotal, totalPedidos, ticketMedio, topClientes } = useMemo(() => {
    if (!data || data.length === 0) {
      return { faturamentoTotal: 0, totalPedidos: 0, ticketMedio: 0, topClientes: [] };
    }

    let faturamentoTotal = 0;
    const pedidosSet = new Set<string>();
    const clientesMap = new Map<string, {
      cliente_nome: string,
      pedidos: Set<string>,
      qtdLinhas: number,
      volumeTotal: number,
      valorTotal: number,
      produtos: Map<string, { volumeTotal: number, valorTotal: number }>
    }>();

    data.forEach(item => {
      const valor = Number(item.valor_total_item) || 0;
      const cliente = item.cliente_nome || "Cliente Não Informado";
      const pedidoId = item.pedido_id;
      const quantidade = Number(item.quantidade) || 1;
      const tipoProduto = item.tipo_producao || "Não Classificado (Histórico)";

      faturamentoTotal += valor;
      if (pedidoId) pedidosSet.add(pedidoId);

      if (!clientesMap.has(cliente)) {
        clientesMap.set(cliente, {
          cliente_nome: cliente,
          pedidos: new Set(),
          qtdLinhas: 0,
          volumeTotal: 0,
          valorTotal: 0,
          produtos: new Map()
        });
      }

      const cData = clientesMap.get(cliente)!;
      if (pedidoId) cData.pedidos.add(pedidoId);
      cData.qtdLinhas += 1;
      cData.volumeTotal += quantidade;
      cData.valorTotal += valor;

      if (!cData.produtos.has(tipoProduto)) {
        cData.produtos.set(tipoProduto, { volumeTotal: 0, valorTotal: 0 });
      }
      const pData = cData.produtos.get(tipoProduto)!;
      pData.volumeTotal += quantidade;
      pData.valorTotal += valor;
    });

    const totalPedidos = pedidosSet.size;
    const ticketMedio = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0;

    const topClientes = Array.from(clientesMap.values())
      .map(c => ({
        cliente_nome: c.cliente_nome,
        qtdPedidos: c.pedidos.size,
        qtdLinhas: c.qtdLinhas,
        volumeTotal: c.volumeTotal,
        valorTotal: c.valorTotal,
        produtos: Array.from(c.produtos.entries()).map(([tipo, data]) => ({
          tipo,
          volumeTotal: data.volumeTotal,
          valorTotal: data.valorTotal
        })).sort((a, b) => b.valorTotal - a.valorTotal)
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal);

    return { faturamentoTotal, totalPedidos, ticketMedio, topClientes };
  }, [data]);

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const toggleCliente = (clienteId: string) => {
    setClientesSelecionados(prev => 
      prev.includes(clienteId) 
        ? prev.filter(id => id !== clienteId)
        : [...prev, clienteId]
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard BI Comercial"
        description="Análises comerciais e indicadores de vendas baseados nos itens dos pedidos."
      />

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-card p-4 rounded-xl border border-border shadow-sm items-end">
        {/* Período */}
        <div className="md:col-span-4 lg:col-span-3 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Período de Emissão</label>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-full text-sm"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <span className="text-muted-foreground text-sm">até</span>
            <Input
              type="date"
              className="w-full text-sm"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        {/* Clientes Multi-select */}
        <div className="md:col-span-5 lg:col-span-6 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Clientes</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-normal text-left h-10 px-3">
                <span className="truncate">
                  {clientesSelecionados.length === 0 
                    ? "Todos os Clientes" 
                    : `${clientesSelecionados.length} cliente(s) selecionado(s)`}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandList>
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup>
                    {clientesOptions.map((cliente) => (
                      <CommandItem
                        key={cliente.id}
                        value={cliente.nome}
                        onSelect={() => toggleCliente(cliente.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            clientesSelecionados.includes(cliente.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {cliente.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {clientesSelecionados.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {clientesSelecionados.map(id => {
                const c = clientesOptions.find(x => x.id === id);
                return (
                  <Badge key={id} variant="secondary" className="text-[10px] py-0">
                    {c?.nome || id}
                  </Badge>
                );
              })}
              <button 
                className="text-[10px] text-muted-foreground hover:text-primary ml-1 underline"
                onClick={() => setClientesSelecionados([])}
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        {/* Tipo de Produto */}
        <div className="md:col-span-3 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Família de Produto</label>
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={tipoProdutoSelecionado}
            onChange={(e) => setTipoProdutoSelecionado(e.target.value)}
          >
            <option value="TODOS">Todos os Tipos</option>
            {tiposProdutoOptions.map(tipo => (
              <option key={tipo.nome} value={tipo.nome}>{tipo.nome}</option>
            ))}
            <option value="Não Classificado (Histórico)">Não Classificado (Histórico)</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Carregando dados...
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-destructive">
          Erro ao carregar os dados. Verifique a conexão ou os filtros.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="surface-card p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faturamento Total</p>
                <h3 className="text-2xl font-bold">{formatMoney(faturamentoTotal)}</h3>
              </div>
            </div>
            
            <div className="surface-card p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Pedidos</p>
                <h3 className="text-2xl font-bold">{totalPedidos}</h3>
              </div>
            </div>

            <div className="surface-card p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                <h3 className="text-2xl font-bold">{formatMoney(ticketMedio)}</h3>
              </div>
            </div>
          </div>

          {/* Tabela Top Clientes */}
          <div className="surface-card">
            <div className="p-4 border-b flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Top Clientes</h2>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4 w-10"></th>
                    <th className="py-3 px-4 font-bold">Cliente</th>
                    <th className="py-3 px-4 font-bold text-center">Qtd de Pedidos</th>
                    <th className="py-3 px-4 font-bold text-center">Qtd Itens (Variedade)</th>
                    <th className="py-3 px-4 font-bold text-right">Total Comprado (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topClientes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum dado encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    topClientes.map((cliente, index) => {
                      const isExpanded = expandedRows.has(cliente.cliente_nome);
                      return (
                        <Fragment key={index}>
                          <tr 
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => toggleRow(cliente.cliente_nome)}
                          >
                            <td className="py-3 px-4 text-muted-foreground">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </td>
                            <td className="py-3 px-4 font-semibold text-primary">
                              {cliente.cliente_nome}
                            </td>
                            <td className="py-3 px-4 text-center font-medium">
                              {cliente.qtdPedidos}
                            </td>
                            <td className="py-3 px-4 text-center font-medium">
                              <span title={`Volume Total: ${cliente.volumeTotal}`}>{cliente.qtdLinhas}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-600">
                              {formatMoney(cliente.valorTotal)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={5} className="py-3 px-12 border-t border-muted shadow-inner">
                                <div className="space-y-2 py-1">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Composição por Produto</h4>
                                  <ul className="space-y-1.5">
                                    {cliente.produtos.map((prod, pIndex) => (
                                      <li key={pIndex} className="text-sm flex items-center justify-between p-2.5 rounded bg-background border border-border shadow-sm">
                                        <span className="font-medium text-slate-700">{prod.tipo}</span>
                                        <div className="flex items-center gap-4 text-muted-foreground">
                                          <span className="text-xs border-r pr-4 border-border">Volume: <strong className="text-slate-900">{prod.volumeTotal} un</strong></span>
                                          <span className="text-xs font-semibold text-emerald-600 w-24 text-right">{formatMoney(prod.valorTotal)}</span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

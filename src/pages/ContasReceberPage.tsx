import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeiroService } from "@/services/financeiroService";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowDownCircle, Search, Filter, MoreVertical, CheckCircle, XCircle,
  AlertTriangle, ChevronUp, ChevronDown, Edit, DollarSign, Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function ContasReceberPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados de Busca e Filtros
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "vencimento", direction: "asc" });

  // Estados de Ação e Modais
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [baixaModalOpen, setBaixaModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [baixaLoteOpen, setBaixaLoteOpen] = useState(false);
  const [editLoteOpen, setEditLoteOpen] = useState(false);
  
  const [contaSelecionada, setContaSelecionada] = useState<any>(null);
  const [formBaixa, setFormBaixa] = useState({ data_recebimento: "", valor_recebido: 0, observacoes: "" });
  const [formEdit, setFormEdit] = useState({ vencimento: "", valor: 0, observacoes: "" });
  const [formLote, setFormLote] = useState({ data: new Date().toISOString().split('T')[0], observacoes: "" });

  const { data: contas = [], isLoading } = useQuery({ queryKey: ["contas_receber"], queryFn: financeiroService.getContasReceber });

  const { mutateAsync: atualizarContaAsync, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => financeiroService.updateContaReceber(id, payload),
  });

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const contasFiltradas = useMemo(() => {
    return contas.filter((c: any) => {
      const termo = busca.toLowerCase();
      const vencimento = c.vencimento ? c.vencimento.split('T')[0] : "";
      const fornecedores = c.pedido?.itens?.map((i:any) => i.fornecedor?.nome).filter(Boolean) || [];
      
      const matchBusca = !termo || 
                         (c.cliente?.nome?.toLowerCase()?.includes(termo) ?? false) || 
                         (c.pedido?.numero?.toString()?.includes(termo) ?? false) || 
                         fornecedores.some((f:string) => f.toLowerCase().includes(termo));
      
      const matchData = (!dataInicio || vencimento >= dataInicio) && (!dataFim || vencimento <= dataFim);
      const matchStatus = filtroStatus === "TODOS" || c.status === filtroStatus;
      const matchCategoria = filtroCategoria === "TODAS" || c.categoria === filtroCategoria;
      
      return matchBusca && matchData && matchStatus && matchCategoria;
    }).sort((a: any, b: any) => {
      let vA = sortConfig.key === 'vencimento' ? new Date(a.vencimento || 0).getTime() : Number(a.valor || 0);
      let vB = sortConfig.key === 'vencimento' ? new Date(b.vencimento || 0).getTime() : Number(b.valor || 0);
      return sortConfig.direction === "asc" ? vA - vB : vB - vA;
    });
  }, [contas, busca, filtroStatus, filtroCategoria, dataInicio, dataFim, sortConfig]);

  const totais = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    let prev = 0, rec = 0, atr = 0;
    contasFiltradas.forEach(c => {
      const vencimentoBase = c.vencimento ? c.vencimento.split('T')[0] : "";
      if (c.status === "PREVISTO") {
        prev += Number(c.valor);
        if (vencimentoBase < hoje) atr += Number(c.valor);
      } else if (c.status === "RECEBIDO") {
        rec += Number(c.valor_recebido || c.valor);
      }
    });
    return { prev, rec, atr };
  }, [contasFiltradas]);

  const renderCategoriaBadge = (cat: string) => {
    if (cat === 'RECEITA_REVENDA') return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-blue-200">Revenda</span>;
    if (cat === 'COMISSAO_LFA') return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-purple-200">Comissão AA</span>;
    if (cat === 'CONTROLE_CLIENTE_FORNECEDOR') return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-amber-200">Ctrl Fornecedor</span>;
    return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-gray-200">{cat?.replace(/_/g, ' ') || 'Outros'}</span>;
  };

  const handleAcaoIndividual = async (tipo: 'BAIXA' | 'EDITAR') => {
    if (!contaSelecionada) return;
    try {
      const payload = tipo === 'BAIXA' 
        ? { status: "RECEBIDO", data_recebimento: formBaixa.data_recebimento, valor_recebido: formBaixa.valor_recebido, observacoes: formBaixa.observacoes }
        : { vencimento: formEdit.vencimento, observacoes: formEdit.observacoes };
        
      await atualizarContaAsync({ id: contaSelecionada.id, payload });
      
      queryClient.invalidateQueries({ queryKey: ["contas_receber"] });
      setBaixaModalOpen(false); setEditModalOpen(false);
      toast({ title: "Sucesso", description: "Lançamento atualizado." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar lançamento." });
    }
  };

  const handleAcaoLote = async (tipo: 'BAIXA' | 'EDITAR') => {
    try {
      const promises = Array.from(selecionados).map(id => {
        const payload = tipo === 'BAIXA' 
          ? { status: "RECEBIDO", data_recebimento: formLote.data, observacoes: formLote.observacoes }
          : { vencimento: formLote.data, observacoes: formLote.observacoes };
        return atualizarContaAsync({ id, payload });
      });
      
      await Promise.all(promises);
      
      queryClient.invalidateQueries({ queryKey: ["contas_receber"] });
      setSelecionados(new Set());
      setBaixaLoteOpen(false); setEditLoteOpen(false);
      toast({ title: "Sucesso", description: `${promises.length} lançamentos processados em lote.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar lote." });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-3xl font-bold flex items-center gap-2"><ArrowDownCircle className="text-emerald-600" /> Contas a Receber</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 border rounded-xl bg-card shadow-sm"><span className="text-xs text-muted-foreground uppercase font-bold">Total Previsto</span><div className="text-2xl font-black text-blue-600">{formatMoney(totais.prev)}</div></div>
        <div className="p-5 border rounded-xl bg-card shadow-sm"><span className="text-xs text-emerald-700 uppercase font-bold">Total Recebido</span><div className="text-2xl font-black text-emerald-600">{formatMoney(totais.rec)}</div></div>
        <div className="p-5 border rounded-xl bg-card shadow-sm"><span className="text-xs text-rose-700 uppercase font-bold">Atrasados</span><div className="text-2xl font-black text-rose-600">{formatMoney(totais.atr)}</div></div>
      </div>

      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg border items-end">
        <div className="flex-1 min-w-[200px]"><Label>Buscar</Label><Input placeholder="Cliente, pedido ou fornecedor..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <div className="w-[140px]"><Label>De</Label><Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
        <div className="w-[140px]"><Label>Até</Label><Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="TODOS">Todos Status</SelectItem><SelectItem value="PREVISTO">Previsto</SelectItem><SelectItem value="RECEBIDO">Recebido</SelectItem></SelectContent></Select>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}><SelectTrigger className="w-[170px]"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent><SelectItem value="TODAS">Todas Categ.</SelectItem><SelectItem value="RECEITA_REVENDA">Receita Revenda</SelectItem><SelectItem value="COMISSAO_LFA">Comissão AA</SelectItem><SelectItem value="CONTROLE_CLIENTE_FORNECEDOR">Ctrl Fornecedor</SelectItem></SelectContent></Select>
      </div>

      {selecionados.size > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
          <span className="font-bold text-blue-800">{selecionados.size} itens selecionados</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFormLote({...formLote, data: new Date().toISOString().split('T')[0]}); setEditLoteOpen(true); }} disabled={isUpdating}><Calendar className="mr-2 h-4 w-4"/> Renegociar Datas</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setFormLote({...formLote, data: new Date().toISOString().split('T')[0]}); setBaixaLoteOpen(true); }} disabled={isUpdating}><CheckCircle className="mr-2 h-4 w-4"/> Baixar Lote</Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase">
            <tr>
              <th className="px-4 py-3"><Checkbox checked={selecionados.size === contasFiltradas.length && contasFiltradas.length > 0} onCheckedChange={(c) => setSelecionados(c ? new Set(contasFiltradas.map(c => c.id)) : new Set())} /></th>
              <th className="px-4 py-3 cursor-pointer select-none" onClick={() => setSortConfig({key: 'vencimento', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>
                <div className="flex items-center gap-1">Vencimento {sortConfig.key === 'vencimento' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</div>
              </th>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente / Fornecedor</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
            ) : contasFiltradas.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum lançamento encontrado.</td></tr>
            ) : contasFiltradas.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3"><Checkbox checked={selecionados.has(c.id)} onCheckedChange={() => { const n = new Set(selecionados); n.has(c.id) ? n.delete(c.id) : n.add(c.id); setSelecionados(n); }} /></td>
                <td className="px-4 py-3 font-medium">{c.vencimento ? c.vencimento.split('T')[0].split('-').reverse().join('/') : "—"}</td>
                <td className="px-4 py-3 font-bold text-primary">#{c.pedido?.numero}</td>
                <td className="px-4 py-3">{c.cliente?.nome}<div className="text-[10px] text-muted-foreground">{c.pedido?.itens?.map((i:any) => i.fornecedor?.nome).join(", ")}</div></td>
                <td className="px-4 py-3">{renderCategoriaBadge(c.categoria)}</td>
                <td className="px-4 py-3 text-right font-bold">
                    <div>{formatMoney(c.valor)}</div>
                    {c.status === "RECEBIDO" && <div className="text-[10px] text-emerald-600 font-bold">Pago: {formatMoney(c.valor_recebido || c.valor)}</div>}
                </td>
                <td className="px-4 py-3 text-center">
                    {c.status === "RECEBIDO" ? (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 rounded uppercase">Pago</span>
                            <span className="text-[9px] text-muted-foreground">{c.data_recebimento ? c.data_recebimento.split('T')[0].split('-').reverse().join('/') : "—"}</span>
                        </div>
                    ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger><Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setContaSelecionada(c); setFormBaixa({data_recebimento: new Date().toISOString().split('T')[0], valor_recebido: Number(c.valor), observacoes: c.observacoes || ""}); setBaixaModalOpen(true); }} className="text-emerald-600 cursor-pointer"><CheckCircle className="mr-2 h-4 w-4"/> Dar Baixa</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setContaSelecionada(c); setFormEdit({vencimento: c.vencimento ? c.vencimento.split('T')[0] : "", valor: Number(c.valor), observacoes: c.observacoes || ""}); setEditModalOpen(true); }} className="text-blue-600 cursor-pointer"><Edit className="mr-2 h-4 w-4"/> Renegociar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL BAIXA INDIVIDUAL */}
      <Dialog open={baixaModalOpen} onOpenChange={setBaixaModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Baixa de Título</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Data do Recebimento</Label>
            <Input type="date" value={formBaixa.data_recebimento} onChange={e => setFormBaixa({...formBaixa, data_recebimento: e.target.value})} />
            
            <Label>Valor Efetivo Recebido</Label>
            <Input type="number" value={formBaixa.valor_recebido} onChange={e => setFormBaixa({...formBaixa, valor_recebido: Number(e.target.value)})} />
            
            <Label>Observação</Label>
            <Input value={formBaixa.observacoes} onChange={e => setFormBaixa({...formBaixa, observacoes: e.target.value})} />
            
            {Math.abs(formBaixa.valor_recebido - Number(contaSelecionada?.valor)) > 0.01 && <div className="text-xs font-bold text-rose-600">Diferença: {formatMoney(Math.abs(formBaixa.valor_recebido - Number(contaSelecionada?.valor)))} (Juros/Desconto)</div>}
            
            <Button disabled={isUpdating} onClick={() => handleAcaoIndividual('BAIXA')}>{isUpdating ? "Processando..." : "Confirmar Baixa"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EDIÇÃO INDIVIDUAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Renegociar Título</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Novo Vencimento</Label><Input type="date" value={formEdit.vencimento} onChange={e => setFormEdit({...formEdit, vencimento: e.target.value})} />
            <Label>Motivo</Label><Input value={formEdit.observacoes} onChange={e => setFormEdit({...formEdit, observacoes: e.target.value})} />
            <Button disabled={isUpdating} onClick={() => handleAcaoIndividual('EDITAR')}>{isUpdating ? "Salvando..." : "Salvar Alterações"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL LOTE */}
      <Dialog open={baixaLoteOpen || editLoteOpen} onOpenChange={() => { setBaixaLoteOpen(false); setEditLoteOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{baixaLoteOpen ? "Baixar Lote" : "Renegociar Datas em Massa"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>{baixaLoteOpen ? "Data do Recebimento" : "Nova Data"}</Label>
            <Input type="date" value={formLote.data} onChange={e => setFormLote({...formLote, data: e.target.value})} />
            <Label>Observação para todos</Label><Input value={formLote.observacoes} onChange={e => setFormLote({...formLote, observacoes: e.target.value})} />
          </div>
          <DialogFooter><Button disabled={isUpdating} onClick={() => handleAcaoLote(baixaLoteOpen ? 'BAIXA' : 'EDITAR')}>{isUpdating ? "Processando..." : "Confirmar Processamento"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useUpdatePedido, useUpdatePedidoFechamento } from "@/hooks/use-pedidos";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pencil, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PedidoFechamentoEditorProps {
  pedido: any;
  fechamento: any;
  onUpdateSuccess?: () => void;
}

export function PedidoFechamentoEditor({ pedido, fechamento, onUpdateSuccess }: PedidoFechamentoEditorProps) {
  const isFaturado = pedido?.status === "FATURADO";
  
  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const [localFechamento, setLocalFechamento] = useState<any>(null);
  const [localCondicao, setLocalCondicao] = useState<string | null>(null);
  const [localCondicaoFornecedor, setLocalCondicaoFornecedor] = useState<string | null>(null);
  const [condicoes, setCondicoes] = useState<any[]>([]);

  const { mutateAsync: updatePedido, isPending: updatingPedido } = useUpdatePedido();
  const { mutateAsync: updateFechamento, isPending: updatingFechamento } = useUpdatePedidoFechamento();

  useEffect(() => {
    if (fechamento) {
      setLocalFechamento({ ...fechamento });
    }
    if (pedido) {
      setLocalCondicao(pedido.condicao_pagamento_id);
      setLocalCondicaoFornecedor(pedido.condicao_pagamento_fornecedor_id);
    }
  }, [fechamento, pedido]);

  // Função de Engenharia Reversa: Extrai as taxas do orçamento original e aplica ao novo total
  function handleCalcularAutomatico() {
    if (!pedido || !fechamento || !localFechamento) return;

    // Isola o valor dos produtos sem frete
    const totalProdutosNovo = Number(pedido.total || 0);
    const custoTotalAntigo = Number(fechamento.custo_total || 1); // Evita divisão por zero
    
    // 1. Descoberta das Taxas (Percentuais) Negociadas Originais
    const taxaComissaoLfa = Number(fechamento.comissao_lfa_valor || 0) / custoTotalAntigo;
    const taxaComissaoAgente = Number(fechamento.comissao_agente_valor || 0) / custoTotalAntigo;
    const taxaImposto = Number(fechamento.imposto_valor || 0) / custoTotalAntigo;

    // 2. Aplicação das taxas no Novo Total
    setLocalFechamento(prev => ({
      ...prev,
      custo_total: Number(totalProdutosNovo.toFixed(4)),
      comissao_lfa_valor: Number((totalProdutosNovo * taxaComissaoLfa).toFixed(4)),
      comissao_agente_valor: Number((totalProdutosNovo * taxaComissaoAgente).toFixed(4)),
      imposto_valor: Number((totalProdutosNovo * taxaImposto).toFixed(4)),
      // Em representação, a receita da gráfica LFA é a própria comissão
      receita_bruta_lfa: Number((totalProdutosNovo * taxaComissaoLfa).toFixed(4)),
      receita_liquida_lfa: Number(((totalProdutosNovo * taxaComissaoLfa) - (totalProdutosNovo * taxaImposto)).toFixed(4)),
      valor_final_venda: pedido.modelo_operacao === 'REPRESENTACAO' ? 0 : Number((totalProdutosNovo * 1.5).toFixed(4)) // Fallback para revenda
    }));
  }

  // Sensor de presença: reage quando o Pai muda o total (Overrun)
  useEffect(() => {
    if (pedido && fechamento && localFechamento?.custo_total) {
      const totalProdutosNovo = Number(pedido.total || 0);
      
      // Só recalcula se o total de produtos realmente mudou (Overrun ocorreu)
      if (Math.abs(totalProdutosNovo - Number(localFechamento.custo_total)) > 0.01) {
        handleCalcularAutomatico();
      }
    }
  }, [pedido?.total]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("condicoes_pagamento").select("id, nome").eq("ativo", true).order("nome");
      if (data) setCondicoes(data);
    }
    load();
  }, []);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const handleStartEdit = () => {
    setConfirmOpen(true);
  };

  const confirmEdit = () => {
    setConfirmOpen(false);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setLocalFechamento({ ...fechamento });
    setLocalCondicao(pedido.condicao_pagamento_id);
    setLocalCondicaoFornecedor(pedido.condicao_pagamento_fornecedor_id);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      if (localCondicao !== pedido.condicao_pagamento_id || localCondicaoFornecedor !== pedido.condicao_pagamento_fornecedor_id) {
        await updatePedido({ 
          id: pedido.id, 
          data: { 
            condicao_pagamento_id: localCondicao,
            condicao_pagamento_fornecedor_id: localCondicaoFornecedor 
          } 
        });
      }
      if (localFechamento) {
        const { orcamento_id, pedido_id, id, created_at, updated_at, ...updateData } = localFechamento;
        await updateFechamento({ id: pedido.id, data: updateData });
      }
      setIsEditing(false);
      onUpdateSuccess?.();
    } catch (e: any) {
      console.error(e);
    }
  };

  const saving = updatingPedido || updatingFechamento;

  if (!fechamento) {
    return (
      <div className="text-center text-muted-foreground py-8 border rounded-lg bg-card mt-6">
        Nenhum dado financeiro (fechamento) encontrado para este pedido.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-sm uppercase text-muted-foreground">Financeiro do Pedido</h3>
            
            {!isEditing ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleStartEdit} 
                disabled={isFaturado}
                title={isFaturado ? "Não é possível editar pedido faturado" : ""}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar Fechamento
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </div>

          {isFaturado && !isEditing && (
             <div className="mb-4 text-xs font-medium bg-amber-50 text-amber-800 p-2 border border-amber-200 rounded">
               Este pedido já está faturado. As condições financeiras estão congeladas.
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase text-muted-foreground border-b pb-1">Custos e Parâmetros</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Condição Pagto:</span>
                  {isEditing ? (
                    <Select value={localCondicao || ""} onValueChange={setLocalCondicao}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {condicoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="font-medium text-right max-w-[200px] truncate">
                      {condicoes.find(c => c.id === localCondicao)?.nome || "—"}
                    </span>
                  )}
                </div>

                {pedido?.modelo_operacao === 'REVENDA' && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Condição Fornec.:</span>
                    {isEditing ? (
                      <Select value={localCondicaoFornecedor || ""} onValueChange={setLocalCondicaoFornecedor}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {condicoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="font-medium text-right max-w-[200px] truncate">
                        {condicoes.find(c => c.id === localCondicaoFornecedor)?.nome || "—"}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Custo Total:</span>
                  {isEditing ? (
                    <Input 
                      type="number"
                      className="w-[120px] h-8 text-xs text-right"
                      value={localFechamento?.custo_total || 0}
                      onChange={e => setLocalFechamento({...localFechamento, custo_total: Number(e.target.value)})}
                    />
                  ) : (
                    <span>{formatMoney(localFechamento?.custo_total)}</span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Impostos:</span>
                  {isEditing ? (
                    <Input 
                      type="number"
                      className="w-[120px] h-8 text-xs text-right"
                      value={localFechamento?.imposto_valor || 0}
                      onChange={e => setLocalFechamento({...localFechamento, imposto_valor: Number(e.target.value)})}
                    />
                  ) : (
                    <span>{formatMoney(localFechamento?.imposto_valor)}</span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Comissão Agente:</span>
                  {isEditing ? (
                    <Input 
                      type="number"
                      className="w-[120px] h-8 text-xs text-right"
                      value={localFechamento?.comissao_agente_valor || 0}
                      onChange={e => setLocalFechamento({...localFechamento, comissao_agente_valor: Number(e.target.value)})}
                    />
                  ) : (
                    <span>{formatMoney(localFechamento?.comissao_agente_valor)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase text-muted-foreground border-b pb-1">Resultado (Receitas)</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  {pedido?.modelo_operacao === 'REPRESENTACAO' ? (
                    <>
                      <span className="text-muted-foreground">Valor Total da Operação (Itens):</span>
                      <span className="font-bold text-blue-600">
                        {formatMoney(Number(pedido?.total || 0))}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Valor Final Venda:</span>
                      {isEditing ? (
                        <Input 
                          type="number"
                          className="w-[120px] h-8 text-xs text-right text-blue-600 font-bold"
                          value={localFechamento?.valor_final_venda || 0}
                          onChange={e => setLocalFechamento({...localFechamento, valor_final_venda: Number(e.target.value)})}
                        />
                      ) : (
                        <span className="font-bold text-blue-600">{formatMoney(localFechamento?.valor_final_venda)}</span>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Receita Bruta AA:</span>
                  {isEditing ? (
                    <Input 
                      type="number"
                      className="w-[120px] h-8 text-xs text-right"
                      value={localFechamento?.receita_bruta_lfa || 0}
                      onChange={e => setLocalFechamento({...localFechamento, receita_bruta_lfa: Number(e.target.value)})}
                    />
                  ) : (
                    <span>{formatMoney(localFechamento?.receita_bruta_lfa)}</span>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-emerald-600">Receita Líquida:</span>
                  {isEditing ? (
                    <Input 
                      type="number"
                      className="w-[120px] h-8 text-xs text-right font-black text-emerald-600"
                      value={localFechamento?.receita_liquida_lfa || 0}
                      onChange={e => setLocalFechamento({...localFechamento, receita_liquida_lfa: Number(e.target.value)})}
                    />
                  ) : (
                    <span className="font-black text-emerald-600 text-lg">{formatMoney(localFechamento?.receita_liquida_lfa)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atenção ao alterar fechamento</DialogTitle>
            <DialogDescription>
              Você está prestes a habilitar a edição manual do fechamento do pedido. 
              Alterar esses valores pode gerar divergências entre a proposta comercial aprovada e o faturamento real.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 p-4 rounded text-sm text-amber-800 border border-amber-200">
            Deseja realmente habilitar a edição manual?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmEdit}>Sim, habilitar edição</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

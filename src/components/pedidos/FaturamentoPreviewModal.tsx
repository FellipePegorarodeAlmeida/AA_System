// @deprecated - Utilize FaturamentoMasterModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { pedidoService } from "@/services/pedidoService";
import { useFaturarPedido } from "@/hooks/use-pedidos";
import { AlertCircle } from "lucide-react";

interface ParcelaSimulada {
  tipo: string;
  categoria: string;
  data_vencimento: string;
  valor: number;
}

interface FaturamentoPreviewModalProps {
  pedidoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function FaturamentoPreviewModal({ pedidoId, open, onOpenChange, onSuccess }: FaturamentoPreviewModalProps) {
  const [parcelas, setParcelas] = useState<ParcelaSimulada[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate: faturar, isPending: faturando } = useFaturarPedido();

  useEffect(() => {
    if (open && pedidoId) {
      loadSimulacao();
    }
  }, [open, pedidoId]);

  async function loadSimulacao() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await pedidoService.simularFaturamento(pedidoId);
      setParcelas(data || []);
    } catch (e: any) {
      setErrorMsg(e.message || "Erro ao simular faturamento.");
    } finally {
      setLoading(false);
    }
  }

  const handleConfirm = () => {
    faturar(pedidoId, {
      onSuccess: () => {
        onSuccess?.();
        onOpenChange(false);
      }
    });
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    // Using string manipulation to prevent timezone shifting
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview de Faturamento</DialogTitle>
          <DialogDescription>
            Abaixo estão os lançamentos financeiros que serão gerados automaticamente para este pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Calculando simulação...</div>
          ) : errorMsg ? (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          ) : parcelas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
              Nenhuma parcela encontrada para faturamento. Verifique as condições de pagamento e valores do pedido.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase text-left">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Tipo</th>
                    <th className="px-4 py-2 font-semibold">Categoria</th>
                    <th className="px-4 py-2 font-semibold">Vencimento</th>
                    <th className="px-4 py-2 font-semibold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parcelas.map((p, idx) => (
                    <tr key={idx} className="hover:bg-muted/50">
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.tipo === 'RECEBER' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {p.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-medium capitalize">{p.categoria.replace(/_/g, ' ').toLowerCase()}</td>
                      <td className="px-4 py-2">{formatDate(p.data_vencimento)}</td>
                      <td className="px-4 py-2 text-right font-bold">{formatMoney(p.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={faturando}>
            Cancelar
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={handleConfirm}
            disabled={loading || !!errorMsg || parcelas.length === 0 || faturando}
          >
            {faturando ? "Faturando..." : "Confirmar Lançamentos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

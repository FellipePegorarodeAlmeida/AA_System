// @deprecated - Utilize FaturamentoMasterModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFaturarPedido } from "@/hooks/use-pedidos";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface FaturamentoModalProps {
  pedido: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function FaturamentoModal({ pedido, open, onOpenChange, onSuccess }: FaturamentoModalProps) {
  const [numeroNf, setNumeroNf] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [saving, setSaving] = useState(false);
  const { mutate: faturar, isPending: faturando } = useFaturarPedido();

  useEffect(() => {
    if (pedido) {
      setNumeroNf(pedido.numero_nf || "");
      setDataEmissao(pedido.data_emissao_nf ? pedido.data_emissao_nf.split('T')[0] : "");
    }
  }, [pedido]);

  const handleFaturar = async () => {
    if (!pedido) return;
    if (!dataEmissao) {
      toast({ title: "Atenção", description: "Preencha a Data de Emissão da NF.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({
          numero_nf: numeroNf || null,
          data_emissao_nf: dataEmissao || null,
        })
        .eq("id", pedido.id);

      if (error) throw error;

      faturar(pedido.id, {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
        }
      });
    } catch (err: any) {
      toast({ title: "Erro ao atualizar dados da NF", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Faturar Pedido #{pedido?.numero}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Número da NF</Label>
            <Input 
              placeholder="Ex: 12345" 
              value={numeroNf} 
              onChange={(e) => setNumeroNf(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Data de Emissão</Label>
            <Input 
              type="date" 
              value={dataEmissao} 
              onChange={(e) => setDataEmissao(e.target.value)} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || faturando}>
            Cancelar
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={handleFaturar}
            disabled={saving || faturando}
          >
            {saving || faturando ? "Faturando..." : "Gerar Lançamentos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

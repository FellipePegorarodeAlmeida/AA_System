import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pcpService } from "@/services/pcpService";
import { useToast } from "@/hooks/use-toast";

export function useItensPcp() {
  return useQuery({
    queryKey: ["pcp_itens"],
    queryFn: pcpService.getItensProducao,
  });
}

export function useUpdateItemPcp() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => pcpService.updateItemPcp(id, data),
    onSuccess: () => {
      // Invalida tanto a lista do PCP quanto a de pedidos comerciais para manter sincronia
      queryClient.invalidateQueries({ queryKey: ["pcp_itens"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["pedido"] });
      
      toast({
        title: "Atualizado",
        description: "Informação de produção atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao atualizar o item.",
      });
    },
  });
}

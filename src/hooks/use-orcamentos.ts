import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orcamentoService } from "@/services/orcamentoService";
import { useToast } from "@/hooks/use-toast";

export function useOrcamentos() {
  return useQuery({
    queryKey: ["orcamentos"],
    queryFn: orcamentoService.getOrcamentos,
  });
}

export function useConvertPedido() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => orcamentoService.abrirPedido(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      toast({
        title: "Sucesso!",
        description: "Orçamento convertido em pedido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao converter",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });
}

export function useDuplicarOrcamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => orcamentoService.duplicarOrcamento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos_listagem_server"] });
      toast({
        title: "Sucesso!",
        description: "Orçamento duplicado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao duplicar",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });
}

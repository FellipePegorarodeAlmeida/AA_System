import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pedidoService } from "@/services/pedidoService";
import { useToast } from "@/hooks/use-toast";

export function usePedidos() {
  return useQuery({
    queryKey: ["pedidos"],
    queryFn: pedidoService.getPedidos,
  });
}

export function useFaturarPedido() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => pedidoService.faturarPedido(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      toast({
        title: "Sucesso!",
        description: "Pedido faturado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao faturar",
        description: error.message || "Ocorreu um erro inesperado ao faturar o pedido.",
      });
    },
  });
}

export function useUpdatePedidoFechamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => pedidoService.updatePedidoFechamento(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["pedido", variables.id] });
      
      toast({
        title: "Sucesso!",
        description: "Fechamento do pedido atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message || "Ocorreu um erro ao atualizar o fechamento do pedido.",
      });
    },
  });
}

export function useUpdatePedido() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => pedidoService.updatePedido(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["pedido", variables.id] });
      
      toast({
        title: "Sucesso!",
        description: "Pedido atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message || "Ocorreu um erro ao atualizar o pedido.",
      });
    },
  });
}export function useUpdatePedidoItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => pedidoService.updatePedidoItem(id, data),
    onSuccess: (data, variables) => {
      // Invalida cache se necessário, mas para pedidos detalhe talvez não precise se o estado for local
      // queryClient.invalidateQueries({ queryKey: ["pedido"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar item",
        description: error.message || "Ocorreu um erro ao atualizar o item do pedido.",
      });
    },
  });
}

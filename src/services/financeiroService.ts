import { supabase } from "@/lib/supabase";

export const financeiroService = {
  async getContasReceber() {
    const { data, error } = await supabase
      .from("contas_receber")
      .select(`
        *,
        pedido:pedidos (
          numero,
          itens:pedido_itens (
            fornecedor:fornecedores(nome)
          )
        ),
        cliente:clientes(nome)
      `)
      .order("vencimento", { ascending: true });

    if (error) throw error;
    return data;
  },

  async updateContaReceber(id: string, payload: any) {
    const { data, error } = await supabase
      .from("contas_receber")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

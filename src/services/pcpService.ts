import { supabase } from "@/lib/supabase";

export const pcpService = {
  async getItensProducao() {
    const { data, error } = await supabase
      .from("vw_pcp_itens")
      .select("*")
      .order("data_entrega_efetiva", { ascending: true, nullsFirst: false });

    if (error) throw error;
    return data;
  },

  async updateItemPcp(itemId: string, payload: { status?: string; previsao_entrega?: string | null }) {
    const { data, error } = await supabase
      .from("pedido_itens")
      .update(payload)
      .eq("id", itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

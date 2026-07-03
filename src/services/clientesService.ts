import { supabase } from "@/lib/supabase";

export const clientesService = {
  // Clientes
  async getClientes() {
    return supabase.from("clientes").select("*").order("created_at", { ascending: false });
  },
  
  async createCliente(payload: any) {
    return supabase.from("clientes").insert(payload).select().single();
  },
  
  async updateCliente(id: string, payload: any) {
    return supabase.from("clientes").update(payload).eq("id", id).select().single();
  },
  
  async deleteCliente(id: string) {
    return supabase.from("clientes").delete().eq("id", id);
  },

  // Agentes
  async getAgentes() {
    return supabase.from("agentes_comerciais").select("id, nome").eq("ativo", true).order("nome");
  },

  // Condições de Pagamento (Busca para o formulário do cliente)
  async getCondicoesPagamento() {
    return supabase.from("condicoes_pagamento").select("id, nome").eq("ativo", true).order("nome");
  },

  // Modalidades de Frete (Busca para o formulário do cliente)
  async getModalidadesFrete() {
    return supabase.from("modalidades_frete").select("id, nome").eq("ativo", true).order("nome");
  },

  // Endereços
  async getEnderecosEntrega(clienteId: string) {
    return supabase
      .from("enderecos")
      .select("*")
      .eq("owner_type", "cliente")
      .eq("owner_id", clienteId)
      .eq("tipo", "ENTREGA")
      .order("created_at", { ascending: false });
  },

  async clearEnderecoPrincipal(clienteId: string) {
    return supabase
      .from("enderecos")
      .update({ principal: false })
      .eq("owner_type", "cliente")
      .eq("owner_id", clienteId)
      .eq("tipo", "ENTREGA");
  },

  async createEndereco(payload: any) {
    return supabase.from("enderecos").insert(payload);
  },

  async updateEndereco(id: string, payload: any) {
    return supabase.from("enderecos").update(payload).eq("id", id);
  },

  async deleteEndereco(id: string) {
    return supabase.from("enderecos").delete().eq("id", id);
  },

  // Contatos
  async getContatos(clienteId: string) {
    return supabase
      .from("contatos")
      .select("*")
      .eq("owner_type", "cliente")
      .eq("owner_id", clienteId)
      .order("created_at", { ascending: false });
  },

  async clearContatoPrincipal(clienteId: string) {
    return supabase
      .from("contatos")
      .update({ principal: false })
      .eq("owner_type", "cliente")
      .eq("owner_id", clienteId);
  },

  async createContato(payload: any) {
    return supabase.from("contatos").insert(payload);
  },

  async updateContato(id: string, payload: any) {
    return supabase.from("contatos").update(payload).eq("id", id);
  },

  async deleteContato(id: string) {
    return supabase.from("contatos").delete().eq("id", id);
  }
};
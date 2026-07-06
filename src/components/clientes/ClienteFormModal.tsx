import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { clientesService } from "@/services/clientesService";
import type { Cliente, PessoaTipo, Contato, Endereco } from "@/types/database";

function maskDocumento(value: string, tipo: PessoaTipo) {
  const clean = value.replace(/\D/g, "");
  if (tipo === "PF") {
    return clean
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2");
  } else {
    return clean
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})/, "$1-$2");
  }
}

function validateCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(cpf.charAt(i)) * (10 - i);
  let r = 11 - (s % 11);
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(cpf.charAt(9))) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(cpf.charAt(i)) * (11 - i);
  r = 11 - (s % 11);
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(cpf.charAt(10))) return false;
  return true;
}

function validateCNPJ(cnpj: string) {
  cnpj = cnpj.replace(/[^\d]+/g, "");
  if (cnpj.length !== 14 || !!cnpj.match(/(\d)\1{13}/)) return false;
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  return true;
}

function maskPhone(value: string) {
  const clean = value.replace(/\D/g, "");
  if (clean.length <= 10) {
    return clean
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 14);
  }
  return clean
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
}

const emptyEndereco = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  pais: "Brasil",
  principal: false,
  ativo: true,
};

const emptyContato = {
  nome: "",
  cargo: "",
  email: "",
  telefone: "",
  whatsapp: "",
  principal: false,
  ativo: true,
  observacoes: "",
};

const empty = {
  tipo: "PJ" as PessoaTipo,
  nome: "",
  nome_secundario: "",
  documento: "",
  inscricao_estadual: "",
  observacoes: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  pais: "Brasil",
  tem_agente: false,
  agente_id: "" as string | null,
  condicao_pagamento_id: "" as string | null,
  modalidade_frete_id: "" as string | null,
  ativo: true,
};

interface ClienteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
  onSuccess: () => void;
}

export function ClienteFormModal({
  open,
  onOpenChange,
  cliente,
  onSuccess,
}: ClienteFormModalProps) {
  const queryClient = useQueryClient();

  const [agentes, setAgentes] = useState<Record<string, unknown>[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<Record<string, unknown>[]>([]);
  const [modalidadesFrete, setModalidadesFrete] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState({ ...empty });

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loadingContatos, setLoadingContatos] = useState(false);
  const [openContato, setOpenContato] = useState(false);
  const [editingContato, setEditingContato] = useState<Contato | null>(null);
  const [formContato, setFormContato] = useState({ ...emptyContato });

  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [loadingEnderecos, setLoadingEnderecos] = useState(false);
  const [openEndereco, setOpenEndereco] = useState(false);
  const [editingEndereco, setEditingEndereco] = useState<Endereco | null>(null);
  const [formEndereco, setFormEndereco] = useState({ ...emptyEndereco });

  const [savedClienteId, setSavedClienteId] = useState<string | null>(null);

  const currentClienteId = cliente?.id || savedClienteId;
  const isEditing = !!currentClienteId;

  const saveClienteMutation = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Record<string, unknown> }) => {
      const { data, error } = id
        ? await clientesService.updateCliente(id, payload)
        : await clientesService.createCliente(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      onSuccess();
    }
  });

  const saveEnderecoMutation = useMutation({
    mutationFn: async ({ id, clienteId, principal, payload }: { id?: string; clienteId: string; principal: boolean; payload: Record<string, unknown> }) => {
      if (principal) {
        await clientesService.clearEnderecoPrincipal(clienteId);
      }
      const { error } = id
        ? await clientesService.updateEndereco(id, payload)
        : await clientesService.createEndereco(payload);
      if (error) throw error;
    }
  });

  const deleteEnderecoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await clientesService.deleteEndereco(id);
      if (error) throw error;
    }
  });

  const saveContatoMutation = useMutation({
    mutationFn: async ({ id, clienteId, principal, payload }: { id?: string; clienteId: string; principal: boolean; payload: Record<string, unknown> }) => {
      if (principal) {
        await clientesService.clearContatoPrincipal(clienteId);
      }
      const { error } = id
        ? await clientesService.updateContato(id, payload)
        : await clientesService.createContato(payload);
      if (error) throw error;
    }
  });

  const deleteContatoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await clientesService.deleteContato(id);
      if (error) throw error;
    }
  });

  async function fetchCep(cep: string) {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setForm((f) => ({
        ...f,
        logradouro: data.logradouro || f.logradouro,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        uf: data.uf || f.uf,
      }));
    } catch (e) {
      console.error("Erro ao buscar CEP", e);
    }
  }

  async function fetchCepEndereco(cep: string) {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setFormEndereco((f) => ({
        ...f,
        logradouro: data.logradouro || f.logradouro,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        uf: data.uf || f.uf,
      }));
    } catch (e) {
      console.error("Erro ao buscar CEP", e);
    }
  }

  async function loadEnderecos(clienteId: string) {
    setLoadingEnderecos(true);
    const { data } = await clientesService.getEnderecosEntrega(clienteId);
    if (data) setEnderecos(data as Endereco[]);
    setLoadingEnderecos(false);
  }

  async function loadContatos(clienteId: string) {
    setLoadingContatos(true);
    const { data } = await clientesService.getContatos(clienteId);
    if (data) setContatos(data as Contato[]);
    setLoadingContatos(false);
  }

  async function loadDropdowns() {
    const [agentesRes, condicoesRes, fretesRes] = await Promise.all([
      clientesService.getAgentes(),
      clientesService.getCondicoesPagamento(),
      clientesService.getModalidadesFrete()
    ]);
    if (agentesRes.data) setAgentes(agentesRes.data);
    if (condicoesRes.data) setCondicoesPagamento(condicoesRes.data);
    if (fretesRes.data) setModalidadesFrete(fretesRes.data);
  }

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    if (open) {
      setSavedClienteId(null);
      if (cliente) {
        setForm({
          tipo: cliente.tipo,
          nome: cliente.nome,
          nome_secundario: cliente.nome_secundario ?? "",
          documento: cliente.documento ?? "",
          inscricao_estadual: cliente.inscricao_estadual ?? "",
          observacoes: cliente.observacoes ?? "",
          cep: cliente.cep ?? "",
          logradouro: cliente.logradouro ?? "",
          numero: cliente.numero ?? "",
          complemento: cliente.complemento ?? "",
          bairro: cliente.bairro ?? "",
          cidade: cliente.cidade ?? "",
          uf: cliente.uf ?? "",
          pais: cliente.pais ?? "Brasil",
          tem_agente: (cliente as Cliente & { tem_agente?: boolean }).tem_agente || false,
          agente_id: (cliente as Cliente & { agente_id?: string | null }).agente_id || "",
          condicao_pagamento_id: (cliente as any).condicao_pagamento_id || "",
          modalidade_frete_id: (cliente as any).modalidade_frete_id || "",
          ativo: cliente.ativo,
        });
        loadContatos(cliente.id);
        loadEnderecos(cliente.id);
      } else {
        setForm({ ...empty });
        setContatos([]);
        setEnderecos([]);
      }
    }
  }, [open, cliente]);

  async function handleSave(closeOnSuccess = true) {
    if (!form.nome.trim()) {
      toast({ title: `${form.tipo === "PJ" ? "Razão social" : "Nome"} é obrigatório`, variant: "destructive" });
      return;
    }

    const docClean = form.documento.replace(/\D/g, "");
    if (docClean) {
      if (form.tipo === "PF" && !validateCPF(docClean)) {
        toast({ title: "CPF inválido", variant: "destructive" });
        return;
      }
      if (form.tipo === "PJ" && !validateCNPJ(docClean)) {
        toast({ title: "CNPJ inválido", variant: "destructive" });
        return;
      }
    }

    const payload = {
      tipo: form.tipo,
      nome: form.nome.trim(),
      nome_secundario: form.nome_secundario.trim() || null,
      documento: form.documento.trim() || null,
      inscricao_estadual: form.inscricao_estadual.trim() || null,
      observacoes: form.observacoes.trim() || null,
      cep: form.cep.trim() || null,
      logradouro: form.logradouro.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      cidade: form.cidade.trim() || null,
      uf: form.uf.trim() || null,
      pais: form.pais.trim() || null,
      tem_agente: form.tem_agente,
      agente_id: form.tem_agente ? (form.agente_id || null) : null,
      condicao_pagamento_id: form.condicao_pagamento_id || null,
      modalidade_frete_id: form.modalidade_frete_id || null,
      ativo: form.ativo,
    };

    saveClienteMutation.mutate(
      { id: currentClienteId || undefined, payload },
      {
        onSuccess: (data) => {
          toast({ title: currentClienteId ? "Cliente updated" : "Cliente criado" });
          if (closeOnSuccess) {
            onOpenChange(false);
          } else if (data) {
            setSavedClienteId((data as Cliente).id);
            setContatos([]);
            setEnderecos([]);
          }
        },
        onError: (error: Error) => {
          toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        }
      }
    );
  }

  function openNewEndereco() {
    setEditingEndereco(null);
    setFormEndereco({ ...emptyEndereco });
    setOpenEndereco(true);
  }

  function openEditEndereco(e: Endereco) {
    setEditingEndereco(e);
    setFormEndereco({
      cep: e.cep ?? "",
      logradouro: e.logradouro ?? "",
      numero: e.numero ?? "",
      complemento: e.complemento ?? "",
      bairro: e.bairro ?? "",
      cidade: e.cidade ?? "",
      uf: e.uf ?? "",
      pais: e.pais ?? "Brasil",
      principal: e.principal,
      ativo: e.ativo ?? true,
    });
    setOpenEndereco(true);
  }

  function handleCopyFaturamento() {
    setFormEndereco((prev) => ({
      ...prev,
      cep: form.cep,
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf,
      pais: form.pais,
    }));
    toast({ title: "Endereço copiado do faturamento" });
  }

  async function handleSaveEndereco() {
    if (!currentClienteId) return;
    const payload = {
      owner_type: "cliente" as const,
      owner_id: currentClienteId,
      tipo: "ENTREGA" as const,
      cep: formEndereco.cep.trim() || null,
      logradouro: formEndereco.logradouro.trim() || null,
      numero: formEndereco.numero.trim() || null,
      complemento: formEndereco.complemento.trim() || null,
      bairro: formEndereco.bairro.trim() || null,
      cidade: formEndereco.cidade.trim() || null,
      uf: formEndereco.uf.trim() || null,
      pais: formEndereco.pais.trim() || null,
      principal: formEndereco.principal,
      ativo: formEndereco.ativo,
    };

    saveEnderecoMutation.mutate(
      { 
        id: editingEndereco?.id, 
        clienteId: currentClienteId, 
        principal: formEndereco.principal, 
        payload 
      },
      {
        onSuccess: () => {
          toast({ title: editingEndereco ? "Endereço atualizado" : "Endereço adicionado" });
          setOpenEndereco(false);
          loadEnderecos(currentClienteId);
        },
        onError: (error: Error) => {
          toast({ title: "Erro ao salvar endereço", description: error.message, variant: "destructive" });
        }
      }
    );
  }

  async function handleDeleteEndereco(e: Endereco) {
    if (!confirm("Excluir este endereço de entrega?")) return;
    deleteEnderecoMutation.mutate(e.id, {
      onSuccess: () => {
        toast({ title: "Endereço excluído" });
        if (currentClienteId) loadEnderecos(currentClienteId);
      },
      onError: (error: Error) => {
        toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      }
    });
  }

  function openNewContato() {
    setEditingContato(null);
    setFormContato({ ...emptyContato });
    setOpenContato(true);
  }

  function openEditContato(c: Contato) {
    setEditingContato(c);
    setFormContato({
      nome: c.nome,
      cargo: c.cargo ?? "",
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      whatsapp: c.whatsapp ?? "",
      principal: c.principal,
      ativo: c.ativo ?? true,
      observacoes: c.observacoes ?? "",
    });
    setOpenContato(true);
  }

  async function handleSaveContato() {
    if (!currentClienteId) return;
    if (!formContato.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    const payload = {
      owner_type: "cliente" as const,
      owner_id: currentClienteId,
      nome: formContato.nome.trim(),
      cargo: formContato.cargo.trim() || null,
      email: formContato.email.trim() || null,
      telefone: formContato.telefone.trim() || null,
      whatsapp: formContato.whatsapp.trim() || null,
      principal: formContato.principal,
      ativo: formContato.ativo,
      observacoes: formContato.observacoes.trim() || null,
    };

    saveContatoMutation.mutate(
      {
        id: editingContato?.id,
        clienteId: currentClienteId,
        principal: formContato.principal,
        payload
      },
      {
        onSuccess: () => {
          toast({ title: editingContato ? "Contato atualizado" : "Contato adicionado" });
          setOpenContato(false);
          loadContatos(currentClienteId);
        },
        onError: (error: Error) => {
          toast({ title: "Erro ao salvar contato", description: error.message, variant: "destructive" });
        }
      }
    );
  }

  async function handleDeleteContato(c: Contato) {
    if (!confirm(`Excluir o contato "${c.nome}"?`)) return;
    deleteContatoMutation.mutate(c.id, {
      onSuccess: () => {
        toast({ title: "Contato excluído" });
        if (currentClienteId) loadContatos(currentClienteId);
      },
      onError: (error: Error) => {
        toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] w-full max-w-[95vw] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados do cliente</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1.5 w-[100px]">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => {
                    const newTipo = v as PessoaTipo;
                    setForm((f) => ({ 
                      ...f, 
                      tipo: newTipo,
                      documento: maskDocumento(f.documento, newTipo)
                    }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="PF">PF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 w-full sm:w-[200px]">
                <Label>{form.tipo === "PJ" ? "CNPJ" : "CPF"}</Label>
                <Input
                  value={form.documento}
                  onChange={(e) => setForm((f) => ({ ...f, documento: maskDocumento(e.target.value, f.tipo) }))}
                  onBlur={() => {
                    const clean = form.documento.replace(/\D/g, "");
                    if (clean) {
                      if (form.tipo === "PF" && !validateCPF(clean)) {
                        toast({ title: "CPF inválido", variant: "destructive" });
                      } else if (form.tipo === "PJ" && !validateCNPJ(clean)) {
                        toast({ title: "CNPJ inválido", variant: "destructive" });
                      }
                    }
                  }}
                  placeholder={form.tipo === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                />
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[250px]">
                <Label>{form.tipo === "PJ" ? "Nome fantasia" : "Nome social"}</Label>
                <Input
                  value={form.nome_secundario}
                  onChange={(e) => setForm((f) => ({ ...f, nome_secundario: e.target.value }))}
                  placeholder={form.tipo === "PJ" ? "Ex: Minha Empresa LTDA" : "Ex: Nome Social"}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{form.tipo === "PJ" ? "Razão social *" : "Nome *"}</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            
            <div className="flex flex-wrap items-end gap-4 border-t pt-4">
              <div className="grid gap-1.5 w-full sm:w-[200px]">
                <Label>Inscrição estadual</Label>
                <Input
                  value={form.inscricao_estadual}
                  onChange={(e) => setForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  id="tem_agente"
                  checked={form.tem_agente}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, tem_agente: v, agente_id: v ? f.agente_id : "" }))}
                />
                <Label htmlFor="tem_agente" className="whitespace-nowrap">Cliente possui agente?</Label>
              </div>
              {form.tem_agente && (
                <div className="grid gap-1.5 flex-1 min-w-[200px]">
                  <Label>Agente comercial</Label>
                  <Select
                    value={form.agente_id || ""}
                    onValueChange={(v) => setForm((f) => ({ ...f, agente_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um agente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agentes.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Nova Seção: Condições Comerciais Padrão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
              <div className="grid gap-1.5">
                <Label>Condição de Pagamento Padrão</Label>
                <Select
                  value={form.condicao_pagamento_id || ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, condicao_pagamento_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma condição..." />
                  </SelectTrigger>
                  <SelectContent>
                    {condicoesPagamento.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Modalidade de Frete Padrão</Label>
                <Select
                  value={form.modalidade_frete_id || ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, modalidade_frete_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma modalidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modalidadesFrete.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>

          {/* Seção Endereço de Faturamento */}
          <div className="mt-4 border-t pt-4">
            <h3 className="mb-4 font-semibold text-sm">Endereço de Faturamento</h3>
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-3">
                <div className="grid gap-1.5 w-full sm:w-[150px]">
                  <Label>CEP</Label>
                  <Input
                    value={form.cep}
                    onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                    onBlur={(e) => fetchCep(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div className="grid gap-1.5 flex-1 min-w-[200px]">
                  <Label>Logradouro</Label>
                  <Input
                    value={form.logradouro}
                    onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label>Número</Label>
                  <Input
                    value={form.numero}
                    onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Complemento</Label>
                  <Input
                    value={form.complemento}
                    onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                    placeholder="Apto, Sala, Bloco"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Bairro</Label>
                  <Input
                    value={form.bairro}
                    onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label>UF</Label>
                  <Input
                    value={form.uf}
                    maxLength={2}
                    onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
                    placeholder="Ex: SP"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>País</Label>
                  <Input
                    value={form.pais}
                    onChange={(e) => setForm((f) => ({ ...f, pais: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Contatos */}
          <div className="mt-4 border-t pt-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Contatos</h3>
              {!isEditing ? (
                <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); handleSave(false); }} disabled={saveClienteMutation.isPending}>
                  Salvar cliente para adicionar contatos
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); openNewContato(); }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              )}
            </div>
            
            {!isEditing ? (
              <div className="rounded-md border p-4 text-center text-sm text-muted-foreground bg-muted/20">
                Salve o cliente antes de adicionar contatos.
              </div>
            ) : loadingContatos ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : contatos.length === 0 ? (
              <div className="rounded-md border p-4 text-center text-sm text-muted-foreground bg-muted/20">
                Nenhum contato cadastrado.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="p-2 font-medium">Nome</th>
                      <th className="p-2 font-medium">Cargo</th>
                      <th className="p-2 font-medium">Email</th>
                      <th className="p-2 font-medium">Telefone</th>
                      <th className="p-2 font-medium">WhatsApp</th>
                      <th className="p-2 font-medium text-center">Status</th>
                      <th className="p-2 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contatos.map(c => (
                      <tr key={c.id}>
                        <td className="p-2 font-medium">
                          {c.nome} {c.principal && <Badge variant="secondary" className="ml-1 text-[10px]">Principal</Badge>}
                        </td>
                        <td className="p-2">{c.cargo ?? "—"}</td>
                        <td className="p-2">{c.email ?? "—"}</td>
                        <td className="p-2">{c.telefone ?? "—"}</td>
                        <td className="p-2">{c.whatsapp ?? "—"}</td>
                        <td className="p-2 text-center">
                          {c.ativo ? (
                            <span className="text-success font-medium">Ativo</span>
                          ) : (
                            <span className="text-muted-foreground">Inativo</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <div className="inline-flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.preventDefault(); openEditContato(c); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.preventDefault(); handleDeleteContato(c); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Seção Endereços de Entrega */}
          <div className="mt-4 border-t pt-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Endereços de Entrega</h3>
              {!isEditing ? (
                <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); handleSave(false); }} disabled={saveClienteMutation.isPending}>
                  Salvar cliente para adicionar endereços
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); openNewEndereco(); }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              )}
            </div>
            
            {!isEditing ? (
              <div className="rounded-md border p-4 text-center text-sm text-muted-foreground bg-muted/20">
                Salve o cliente antes de adicionar endereços de entrega.
              </div>
            ) : loadingEnderecos ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : enderecos.length === 0 ? (
              <div className="rounded-md border p-4 text-center text-sm text-muted-foreground bg-muted/20">
                Nenhum endereço de entrega cadastrado.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="p-2 font-medium">CEP</th>
                      <th className="p-2 font-medium">Logradouro</th>
                      <th className="p-2 font-medium">Número</th>
                      <th className="p-2 font-medium">Bairro</th>
                      <th className="p-2 font-medium">Cidade/UF</th>
                      <th className="p-2 font-medium text-center">Status</th>
                      <th className="p-2 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {enderecos.map(e => (
                      <tr key={e.id}>
                        <td className="p-2 font-medium">
                          {e.cep ?? "—"} {e.principal && <Badge variant="secondary" className="ml-1 text-[10px]">Principal</Badge>}
                        </td>
                        <td className="p-2">{e.logradouro ?? "—"}</td>
                        <td className="p-2">{e.numero ?? "—"}</td>
                        <td className="p-2">{e.bairro ?? "—"}</td>
                        <td className="p-2">{e.cidade ? `${e.cidade}/${e.uf}` : "—"}</td>
                        <td className="p-2 text-center">
                          {e.ativo ? (
                            <span className="text-success font-medium">Ativo</span>
                          ) : (
                            <span className="text-muted-foreground">Inativo</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <div className="inline-flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(ev) => { ev.preventDefault(); openEditEndereco(e); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(ev) => { ev.preventDefault(); handleDeleteEndereco(e); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => handleSave(true)} disabled={saveClienteMutation.isPending}>
              {saveClienteMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Endereço de Entrega */}
      <Dialog open={openEndereco} onOpenChange={setOpenEndereco}>
        <DialogContent className="max-h-[90vh] w-full max-w-[95vw] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEndereco ? "Editar endereço de entrega" : "Novo endereço de entrega"}</DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados do endereço</DialogDescription>
          </DialogHeader>
          <div className="mb-2">
            <Button variant="secondary" size="sm" onClick={handleCopyFaturamento} className="w-full sm:w-auto">
              Copiar endereço de faturamento
            </Button>
          </div>
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-3">
              <div className="grid gap-1.5 w-full sm:w-[150px]">
                <Label>CEP</Label>
                <Input
                  value={formEndereco.cep}
                  onChange={(e) => setFormEndereco((f) => ({ ...f, cep: e.target.value }))}
                  onBlur={(e) => fetchCepEndereco(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[200px]">
                <Label>Logradouro</Label>
                <Input
                  value={formEndereco.logradouro}
                  onChange={(e) => setFormEndereco((f) => ({ ...f, logradouro: e.target.value }))}
                  placeholder="Rua, Avenida, etc."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Número</Label>
                <Input
                  value={formEndereco.numero}
                  onChange={(e) => setFormEndereco((f) => ({ ...f, numero: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Complemento</Label>
                <Input
                  value={formEndereco.complemento}
                  onChange={(e) => setFormEndereco((f) => ({ ...f, complemento: e.target.value }))}
                  placeholder="Apto, Sala, Bloco"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Bairro</Label>
                <Input
                  value={formEndereco.bairro}
                  onChange={(e) => setFormEndereco((f) => ({ ...f, bairro: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>UF</Label>
                <Input
                  value={formEndereco.uf}
                  maxLength={2}
                  onChange={(e) => setFormEndereco((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
                  placeholder="Ex: SP"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Cidade</Label>
                <Input
                  value={formEndereco.cidade}
                  onChange={(e) => setFormEndereco((f) => ({ ...f, cidade: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>País</Label>
                <Input
                  value={formEndereco.pais}
                  onChange={(e) => setFormEndereco((f) => ({ ...f, pais: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label className="cursor-pointer text-sm">Principal</Label>
                <Switch
                  checked={formEndereco.principal}
                  onCheckedChange={(c) => setFormEndereco((f) => ({ ...f, principal: c }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label className="cursor-pointer text-sm">Ativo</Label>
                <Switch
                  checked={formEndereco.ativo}
                  onCheckedChange={(c) => setFormEndereco((f) => ({ ...f, ativo: c }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEndereco(false)}>Cancelar</Button>
            <Button onClick={handleSaveEndereco} disabled={saveEnderecoMutation.isPending}>
              {saveEnderecoMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Contato */}
      <Dialog open={openContato} onOpenChange={setOpenContato}>
        <DialogContent className="max-h-[90vh] w-full max-w-[95vw] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingContato ? "Editar contato" : "Novo contato"}</DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados do contato</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.8fr_1fr]">
              <div className="grid gap-1.5">
                <Label>Nome *</Label>
                <Input
                  value={formContato.nome}
                  onChange={(e) => setFormContato((f) => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Cargo</Label>
                <Input
                  value={formContato.cargo}
                  onChange={(e) => setFormContato((f) => ({ ...f, cargo: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formContato.email}
                  onChange={(e) => setFormContato((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input
                  value={formContato.telefone}
                  onChange={(e) => setFormContato((f) => ({ ...f, telefone: maskPhone(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>WhatsApp</Label>
                <Input
                  value={formContato.whatsapp}
                  onChange={(e) => setFormContato((f) => ({ ...f, whatsapp: maskPhone(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label className="cursor-pointer text-sm">Principal</Label>
                <Switch
                  checked={formContato.principal}
                  onCheckedChange={(c) => setFormContato((f) => ({ ...f, principal: c }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label className="cursor-pointer text-sm">Ativo</Label>
                <Switch
                  checked={formContato.ativo}
                  onCheckedChange={(c) => setFormContato((f) => ({ ...f, ativo: c }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={formContato.observacoes}
                onChange={(e) => setFormContato((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenContato(false)}>Cancelar</Button>
            <Button onClick={handleSaveContato} disabled={saveContatoMutation.isPending}>
              {saveContatoMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
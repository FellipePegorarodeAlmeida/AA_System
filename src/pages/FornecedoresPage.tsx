import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Fornecedor, PessoaTipo } from "@/types/database";

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
  let digits = cnpj.substring(length);
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

const empty = {
  tipo: "PJ" as PessoaTipo,
  nome: "",
  documento: "",
  inscricao_estadual: "",
  email: "",
  telefone: "",
  nome_contato: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  pais: "Brasil",
  observacoes: "",
  ativo: true,
};

export default function FornecedoresPage() {
  const [list, setList] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [solucoesDisponiveis, setSolucoesDisponiveis] = useState<any[]>([]);
  const [solucoesSelecionadas, setSolucoesSelecionadas] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    const [forn, sol] = await Promise.all([
      supabase.from("fornecedores").select("*").order("created_at", { ascending: false }),
      supabase.from("solucoes").select("id, nome").eq("ativo", true).order("nome")
    ]);
    if (forn.error) {
      toast({ title: "Erro ao carregar fornecedores", description: forn.error.message, variant: "destructive" });
    } else {
      setList((forn.data ?? []) as Fornecedor[]);
    }
    if (sol.data) {
      setSolucoesDisponiveis(sol.data);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.nome, c.documento, c.email].some((f) => (f ?? "").toLowerCase().includes(q))
    );
  }, [list, query]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setSolucoesSelecionadas([]);
    setOpen(true);
  }
  async function openEdit(c: Fornecedor) {
    setEditing(c);
    setForm({
      tipo: c.tipo,
      nome: c.nome,
      documento: c.documento ?? "",
      inscricao_estadual: c.inscricao_estadual ?? "",
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      nome_contato: c.nome_contato ?? "",
      cep: c.cep ?? "",
      endereco: c.endereco ?? "",
      numero: c.numero ?? "",
      complemento: c.complemento ?? "",
      bairro: c.bairro ?? "",
      cidade: c.cidade ?? "",
      estado: c.estado ?? "",
      pais: c.pais || "Brasil",
      observacoes: c.observacoes ?? "",
      ativo: c.ativo,
    });
    const { data } = await supabase.from("fornecedor_solucoes").select("solucao_id").eq("fornecedor_id", c.id);
    setSolucoesSelecionadas(data ? data.map(d => d.solucao_id) : []);
    setOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
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

    setSaving(true);
    const payload = {
      tipo: form.tipo,
      nome: form.nome.trim(),
      documento: form.documento.trim() || null,
      inscricao_estadual: form.inscricao_estadual.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      nome_contato: form.nome_contato.trim() || null,
      cep: form.cep.replace(/\D/g, "").trim() || null,
      endereco: form.endereco.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.toUpperCase().trim() || null,
      pais: form.pais.trim() || null,
      observacoes: form.observacoes.trim() || null,
      ativo: form.ativo,
    };
    const { data: savedFornecedor, error } = editing
      ? await supabase.from("fornecedores").update(payload).eq("id", editing.id).select("id").single()
      : await supabase.from("fornecedores").insert(payload).select("id").single();
    
    if (error || !savedFornecedor) {
      setSaving(false);
      toast({ title: "Erro ao salvar", description: error?.message, variant: "destructive" });
      return;
    }

    const fornecedorId = savedFornecedor.id;

    await supabase.from("fornecedor_solucoes").delete().eq("fornecedor_id", fornecedorId);
    if (solucoesSelecionadas.length > 0) {
      const vinculos = solucoesSelecionadas.map(sid => ({ fornecedor_id: fornecedorId, solucao_id: sid }));
      await supabase.from("fornecedor_solucoes").insert(vinculos);
    }

    setSaving(false);
    toast({ title: editing ? "Fornecedor atualizado" : "Fornecedor criado" });
    setOpen(false);
    load();
  }

  async function handleDelete(c: Fornecedor) {
    if (!confirm(`Excluir o fornecedor "${c.nome}"?`)) return;
    const { error } = await supabase.from("fornecedores").delete().eq("id", c.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fornecedor excluído" });
      load();
    }
  }

  async function buscarCep(cepValue: string) {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      
      if (data.erro) {
        toast({ title: "CEP não encontrado", variant: "destructive" });
        return;
      }

      setForm((f) => ({
        ...f,
        endereco: data.logradouro || f.endereco,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        estado: data.uf || f.estado,
      }));
    } catch (error) {
      toast({ title: "Erro ao consultar CEP", variant: "destructive" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        description="Gráficas e fornecedores de soluções (editorial, rótulo, embalagem...)."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Novo fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] w-full max-w-[95vw] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                {/* Linha 1: Tipo + Documento + Nome */}
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
                  <div className="grid gap-1.5 w-full sm:w-[180px]">
                    <Label>{form.tipo === "PJ" ? "CNPJ" : "CPF"}</Label>
                    <Input
                      value={form.documento}
                      onChange={(e) => setForm((f) => ({ ...f, documento: maskDocumento(e.target.value, f.tipo) }))}
                      placeholder={form.tipo === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                    />
                  </div>
                  <div className="grid gap-1.5 flex-1 min-w-[200px]">
                    <Label>Nome / Razão social *</Label>
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Linha 2: Nome do contato principal + Inscrição estadual */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.5fr_1fr]">
                  <div className="grid gap-1.5">
                    <Label>Nome do contato principal</Label>
                    <Input
                      value={form.nome_contato}
                      onChange={(e) => setForm((f) => ({ ...f, nome_contato: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Inscrição estadual</Label>
                    <Input
                      value={form.inscricao_estadual}
                      onChange={(e) => setForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Linha 3: Email + Telefone */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Telefone</Label>
                    <Input
                      value={form.telefone}
                      onChange={(e) => setForm((f) => ({ ...f, telefone: maskPhone(e.target.value) }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="mt-2 border-t pt-2">
                  <h4 className="text-sm font-semibold">Endereço</h4>
                </div>

                <div className="grid gap-3">
                  {/* Linha 1 Endereço: CEP + Logradouro */}
                  <div className="flex flex-wrap gap-3">
                    <div className="grid gap-1.5 w-full sm:w-[130px]">
                      <Label>CEP</Label>
                      <Input
                        value={form.cep}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                          const masked = val.replace(/^(\d{5})(\d)/, "$1-$2");
                          setForm((f) => ({ ...f, cep: masked }));
                        }}
                        onBlur={(e) => buscarCep(e.target.value)}
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="grid gap-1.5 flex-1 min-w-[200px]">
                      <Label>Logradouro / Endereço</Label>
                      <Input
                        value={form.endereco}
                        onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Linha 2 Endereço: Número + Complemento + Bairro */}
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

                  {/* Linha 3 Endereço: Estado + Cidade + País */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="grid gap-1.5">
                      <Label>Estado</Label>
                      <Input
                        value={form.estado}
                        onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                        maxLength={2}
                        placeholder="UF"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Cidade</Label>
                      <Input
                        value={form.cidade}
                        onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
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

                <div className="grid gap-1.5">
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <Checkbox 
                    checked={form.ativo} 
                    onCheckedChange={(c) => setForm((f) => ({ ...f, ativo: !!c }))} 
                  />
                  <Label className="cursor-pointer">Fornecedor Ativo</Label>
                </div>

                <div className="mt-2 border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Soluções Homologadas</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {solucoesDisponiveis.map(sol => (
                      <div key={sol.id} className="flex items-center gap-2">
                        <Checkbox 
                          checked={solucoesSelecionadas.includes(sol.id)}
                          onCheckedChange={(checked) => {
                            setSolucoesSelecionadas(prev => 
                              checked 
                                ? [...prev, sol.id] 
                                : prev.filter(id => id !== sol.id)
                            );
                          }}
                        />
                        <Label className="text-sm font-normal cursor-pointer leading-tight">{sol.nome}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="surface-card p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, documento ou email"
              className="pl-8"
            />
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} de {list.length}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={list.length === 0 ? "Nenhum fornecedor ainda" : "Nada encontrado"}
            description={
              list.length === 0
                ? "Cadastre o primeiro fornecedor para vincular soluções."
                : "Ajuste a busca ou limpe o filtro."
            }
            action={
              list.length === 0 ? (
                <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo fornecedor</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Documento</th>
                  <th className="py-2 pr-3">Contato</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{c.nome}</td>
                    <td className="py-2.5 pr-3"><Badge variant="outline">{c.tipo}</Badge></td>
                    <td className="py-2.5 pr-3 tabular-nums">{c.documento ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {c.email ?? c.telefone ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      {c.ativo ? (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">Ativo</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Inativo</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}>
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}

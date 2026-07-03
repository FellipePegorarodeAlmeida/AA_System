import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { ContatosPanel } from "@/components/common/ContatosPanel";
import { EnderecosPanel } from "@/components/common/EnderecosPanel";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { clientesService } from "@/services/clientesService";
import type { Cliente, PessoaTipo } from "@/types/database";

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [condicoesPagamento, setCondicoesPagamento] = useState<any[]>([]);
  const [modalidadesFrete, setModalidadesFrete] = useState<any[]>([]);
  const [form, setForm] = useState({
    tipo: "PJ" as PessoaTipo,
    nome: "",
    documento: "",
    inscricao_estadual: "",
    email: "",
    telefone: "",
    observacoes: "",
    condicao_pagamento_id: "",
    modalidade_frete_id: "",
    ativo: true,
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    const [clienteRes, condicoesRes, fretesRes] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", id).maybeSingle(),
      clientesService.getCondicoesPagamento(),
      clientesService.getModalidadesFrete()
    ]);
    
    if (condicoesRes.data) setCondicoesPagamento(condicoesRes.data);
    if (fretesRes.data) setModalidadesFrete(fretesRes.data);

    const { data, error } = clienteRes;
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    if (data) {
      const c = data as Cliente;
      setCliente(c);
      setForm({
        tipo: c.tipo,
        nome: c.nome,
        documento: c.documento ?? "",
        inscricao_estadual: c.inscricao_estadual ?? "",
        email: c.email ?? "",
        telefone: c.telefone ?? "",
        observacoes: c.observacoes ?? "",
        condicao_pagamento_id: c.condicao_pagamento_id ?? "",
        modalidade_frete_id: c.modalidade_frete_id ?? "",
        ativo: c.ativo,
      });
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function handleSave() {
    if (!id) return;
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("clientes")
      .update({
        tipo: form.tipo,
        nome: form.nome.trim(),
        documento: form.documento.trim() || null,
        inscricao_estadual: form.inscricao_estadual.trim() || null,
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        condicao_pagamento_id: form.condicao_pagamento_id || null,
        modalidade_frete_id: form.modalidade_frete_id || null,
        observacoes: form.observacoes.trim() || null,
        ativo: form.ativo,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cliente atualizado" });
    setEditing(false);
    load();
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Carregando…</div>;
  }
  if (!cliente) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <Link
          to="/clientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para clientes
        </Link>
      </div>

      <PageHeader
        title={cliente.nome}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge variant="outline">{cliente.tipo}</Badge>
            {cliente.documento && (
              <span className="tabular-nums">{cliente.documento}</span>
            )}
            {cliente.ativo ? (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                Ativo
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Inativo
              </span>
            )}
          </span>
        }
        actions={
          editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Editar dados
            </Button>
          )
        }
      />

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
          <TabsTrigger value="enderecos">Endereços</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <div className="surface-card p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  disabled={!editing}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as PessoaTipo }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="PF">PF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{form.tipo === "PJ" ? "CNPJ" : "CPF"}</Label>
                <Input
                  disabled={!editing}
                  value={form.documento}
                  onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Nome / Razão social *</Label>
                <Input
                  disabled={!editing}
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  disabled={!editing}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input
                  disabled={!editing}
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Inscrição estadual</Label>
                <Input
                  disabled={!editing}
                  value={form.inscricao_estadual}
                  onChange={(e) => setForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
                <div className="grid gap-1.5">
                  <Label>Condição de Pagamento Padrão</Label>
                  <Select
                    disabled={!editing}
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
                    disabled={!editing}
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
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  disabled={!editing}
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contatos">
          <div className="surface-card p-4 sm:p-6">
            <ContatosPanel ownerType="cliente" ownerId={cliente.id} />
          </div>
        </TabsContent>

        <TabsContent value="enderecos">
          <div className="surface-card p-4 sm:p-6">
            <EnderecosPanel ownerType="cliente" ownerId={cliente.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

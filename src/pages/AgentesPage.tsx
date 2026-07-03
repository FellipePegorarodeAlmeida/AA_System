import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { AgenteComercial } from "@/types/database";

const PAPEIS = ["hub", "socio", "agente", "parceiro"] as const;

const empty = {
  nome: "",
  documento: "",
  email: "",
  telefone: "",
  papel: "agente",
  ativo: true,
};

export default function AgentesPage() {
  const [list, setList] = useState<AgenteComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AgenteComercial | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("agentes_comerciais")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar agentes", description: error.message, variant: "destructive" });
    } else {
      setList((data ?? []) as AgenteComercial[]);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.nome, c.documento, c.email, c.papel].some((f) => (f ?? "").toLowerCase().includes(q))
    );
  }, [list, query]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }
  function openEdit(c: AgenteComercial) {
    setEditing(c);
    setForm({
      nome: c.nome,
      documento: c.documento ?? "",
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      papel: c.papel ?? "agente",
      ativo: c.ativo,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      documento: form.documento.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      papel: form.papel || null,
      ativo: form.ativo,
    };
    const { error } = editing
      ? await supabase.from("agentes_comerciais").update(payload).eq("id", editing.id)
      : await supabase.from("agentes_comerciais").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Agente atualizado" : "Agente criado" });
    setOpen(false);
    load();
  }

  async function handleDelete(c: AgenteComercial) {
    if (!confirm(`Excluir o agente "${c.nome}"?`)) return;
    const { error } = await supabase.from("agentes_comerciais").delete().eq("id", c.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agente excluído" });
      load();
    }
  }

  return (
    <div>
      <PageHeader
        title="Agentes comerciais"
        description="Hubs, sócios, agentes e parceiros que participam do split financeiro."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Novo agente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar agente" : "Novo agente"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Nome *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Papel</Label>
                    <Select
                      value={form.papel}
                      onValueChange={(v) => setForm((f) => ({ ...f, papel: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAPEIS.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>CPF / CNPJ</Label>
                    <Input
                      value={form.documento}
                      onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                      onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                    />
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
              placeholder="Buscar por nome, papel ou email"
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
            icon={UserCog}
            title={list.length === 0 ? "Nenhum agente ainda" : "Nada encontrado"}
            description={
              list.length === 0
                ? "Cadastre agentes para configurar o split por pedido."
                : "Ajuste a busca ou limpe o filtro."
            }
            action={
              list.length === 0 ? (
                <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo agente</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Papel</th>
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
                    <td className="py-2.5 pr-3">
                      <Badge variant="outline">{c.papel ?? "—"}</Badge>
                    </td>
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

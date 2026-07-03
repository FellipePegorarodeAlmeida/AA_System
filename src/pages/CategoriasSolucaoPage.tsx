import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { TipoProduto } from "@/types/database";

const empty = { nome: "", descricao: "", ativo: true };

export default function CategoriasSolucaoPage() {
  const [list, setList] = useState<TipoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TipoProduto | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tipos_produto")
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar tipos", description: error.message, variant: "destructive" });
    } else {
      setList((data ?? []) as TipoProduto[]);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) =>
      [t.nome, t.descricao].some((f) => (f ?? "").toLowerCase().includes(q))
    );
  }, [list, query]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }
  function openEdit(t: TipoProduto) {
    setEditing(t);
    setForm({ nome: t.nome, descricao: t.descricao ?? "", ativo: t.ativo });
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
      descricao: form.descricao.trim() || null,
      ativo: form.ativo,
    };
    const { error } = editing
      ? await supabase.from("tipos_produto").update(payload).eq("id", editing.id)
      : await supabase.from("tipos_produto").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Tipo atualizado" : "Tipo criado" });
    setOpen(false);
    load();
  }

  async function handleDelete(t: TipoProduto) {
    if (!confirm(`Excluir o tipo "${t.nome}"?`)) return;
    const { error } = await supabase.from("tipos_produto").delete().eq("id", t.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tipo excluído" });
      load();
    }
  }

  return (
    <div>
      <PageHeader
        title="Tipos de Produto"
        description="Gerencie os tipos de materiais produzidos."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Nova categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Nome *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Descrição</Label>
                  <Textarea
                    rows={3}
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  />
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
              placeholder="Buscar por nome ou descrição"
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
            icon={Tags}
            title={list.length === 0 ? "Nenhuma categoria ainda" : "Nada encontrado"}
            description={
              list.length === 0
                ? "Cadastre sua primeira categoria de solução."
                : "Ajuste a busca ou limpe o filtro."
            }
            action={
              list.length === 0 ? (
                <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo tipo</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Descrição</th>
                  <th className="py-2 pr-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{t.nome}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{t.descricao ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(t)}>
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

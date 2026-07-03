import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Contato, ContatoOwner } from "@/types/database";

const empty = {
  nome: "",
  cargo: "",
  email: "",
  telefone: "",
  principal: false,
};

export function ContatosPanel({
  ownerType,
  ownerId,
}: {
  ownerType: ContatoOwner;
  ownerId: string;
}) {
  const [list, setList] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contato | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contatos")
      .select("*")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId)
      .order("principal", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setList((data ?? []) as Contato[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [ownerType, ownerId]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }
  function openEdit(c: Contato) {
    setEditing(c);
    setForm({
      nome: c.nome,
      cargo: c.cargo ?? "",
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      principal: c.principal,
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
      owner_type: ownerType,
      owner_id: ownerId,
      nome: form.nome.trim(),
      cargo: form.cargo.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      principal: form.principal,
    };

    // Se marcado como principal, desmarca os demais
    if (form.principal) {
      await supabase
        .from("contatos")
        .update({ principal: false })
        .eq("owner_type", ownerType)
        .eq("owner_id", ownerId);
    }

    const { error } = editing
      ? await supabase.from("contatos").update(payload).eq("id", editing.id)
      : await supabase.from("contatos").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Contato atualizado" : "Contato criado" });
    setOpen(false);
    load();
  }

  async function handleDelete(c: Contato) {
    if (!confirm(`Excluir contato "${c.nome}"?`)) return;
    const { error } = await supabase.from("contatos").delete().eq("id", c.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contato excluído" });
      load();
    }
  }

  const ordered = useMemo(() => list, [list]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {ordered.length} contato(s)
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo contato
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : ordered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Nenhum contato cadastrado.
        </div>
      ) : (
        <div className="space-y-2">
          {ordered.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.nome}</span>
                  {c.principal && <Badge variant="secondary">Principal</Badge>}
                </div>
                {c.cargo && (
                  <div className="text-xs text-muted-foreground">{c.cargo}</div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  {[c.email, c.telefone].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar contato" : "Novo contato"}</DialogTitle>
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
              <Label>Cargo</Label>
              <Input
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              />
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
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.principal}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, principal: Boolean(v) }))
                }
              />
              <span>Marcar como contato principal</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

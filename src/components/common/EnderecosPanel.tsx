import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Endereco, ContatoOwner, EnderecoTipo } from "@/types/database";

const TIPOS: EnderecoTipo[] = ["COBRANCA", "ENTREGA", "FATURAMENTO", "OUTRO"];

const empty = {
  tipo: "COBRANCA" as EnderecoTipo,
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  pais: "Brasil",
  principal: false,
};

function formatCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function EnderecosPanel({
  ownerType,
  ownerId,
}: {
  ownerType: ContatoOwner;
  ownerId: string;
}) {
  const [list, setList] = useState<Endereco[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Endereco | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("enderecos")
      .select("*")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId)
      .order("principal", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setList((data ?? []) as Endereco[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [ownerType, ownerId]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }
  function openEdit(e: Endereco) {
    setEditing(e);
    setForm({
      tipo: e.tipo,
      cep: e.cep ?? "",
      logradouro: e.logradouro ?? "",
      numero: e.numero ?? "",
      complemento: e.complemento ?? "",
      bairro: e.bairro ?? "",
      cidade: e.cidade ?? "",
      uf: e.uf ?? "",
      pais: e.pais ?? "Brasil",
      principal: e.principal,
    });
    setOpen(true);
  }

  async function buscarCep(cepRaw: string) {
    const cep = cepRaw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await r.json();
      if (data.erro) {
        toast({ title: "CEP não encontrado", variant: "destructive" });
      } else {
        setForm((f) => ({
          ...f,
          logradouro: data.logradouro ?? f.logradouro,
          bairro: data.bairro ?? f.bairro,
          cidade: data.localidade ?? f.cidade,
          uf: data.uf ?? f.uf,
        }));
      }
    } catch (e) {
      toast({ title: "Falha ao consultar CEP", variant: "destructive" });
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      owner_type: ownerType,
      owner_id: ownerId,
      tipo: form.tipo,
      cep: form.cep.trim() || null,
      logradouro: form.logradouro.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      cidade: form.cidade.trim() || null,
      uf: form.uf.trim().toUpperCase() || null,
      pais: form.pais.trim() || "Brasil",
      principal: form.principal,
    };

    if (form.principal) {
      await supabase
        .from("enderecos")
        .update({ principal: false })
        .eq("owner_type", ownerType)
        .eq("owner_id", ownerId);
    }

    const { error } = editing
      ? await supabase.from("enderecos").update(payload).eq("id", editing.id)
      : await supabase.from("enderecos").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Endereço atualizado" : "Endereço criado" });
    setOpen(false);
    load();
  }

  async function handleDelete(e: Endereco) {
    if (!confirm("Excluir este endereço?")) return;
    const { error } = await supabase.from("enderecos").delete().eq("id", e.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Endereço excluído" });
      load();
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{list.length} endereço(s)</div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo endereço
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Nenhum endereço cadastrado.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((e) => (
            <div
              key={e.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{e.tipo}</Badge>
                  {e.principal && <Badge variant="secondary">Principal</Badge>}
                </div>
                <div className="mt-1 text-sm">
                  {[e.logradouro, e.numero].filter(Boolean).join(", ")}
                  {e.complemento ? ` — ${e.complemento}` : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[e.bairro, e.cidade && `${e.cidade}/${e.uf ?? ""}`, e.cep]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(e)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {editing ? "Editar endereço" : "Novo endereço"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, tipo: v as EnderecoTipo }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>CEP</Label>
                <Input
                  value={form.cep}
                  placeholder="00000-000"
                  onChange={(e) => {
                    const v = formatCep(e.target.value);
                    setForm((f) => ({ ...f, cep: v }));
                    if (v.replace(/\D/g, "").length === 8) buscarCep(v);
                  }}
                />
                {cepLoading && (
                  <span className="text-[11px] text-muted-foreground">Buscando…</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="grid gap-1.5">
                <Label>Logradouro</Label>
                <Input
                  value={form.logradouro}
                  onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Número</Label>
                <Input
                  value={form.numero}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Complemento</Label>
              <Input
                value={form.complemento}
                onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>Bairro</Label>
                <Input
                  value={form.bairro}
                  onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
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
                <Label>UF</Label>
                <Input
                  maxLength={2}
                  value={form.uf}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))
                  }
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
              <span>Marcar como endereço principal</span>
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

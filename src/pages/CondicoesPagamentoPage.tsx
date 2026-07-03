import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { CondicaoPagamento, CondicaoParcela } from "@/types/database";

type ParcelaForm = { dias: string; percentual: string };

const empty = {
  nome: "",
  descricao: "",
  ativo: true,
  parcelas: [{ dias: "0", percentual: "100" }] as ParcelaForm[],
};

export default function CondicoesPagamentoPage() {
  const [list, setList] = useState<CondicaoPagamento[]>([]);
  const [parcelas, setParcelas] = useState<CondicaoParcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CondicaoPagamento | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase.from("condicoes_pagamento").select("*").order("nome"),
      supabase.from("condicao_parcelas").select("*").order("numero"),
    ]);
    if (c.error) toast({ title: "Erro ao carregar", description: c.error.message, variant: "destructive" });
    else setList((c.data ?? []) as CondicaoPagamento[]);
    if (p.data) setParcelas(p.data as CondicaoParcela[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const parcelasPorCondicao = useMemo(() => {
    const map: Record<string, CondicaoParcela[]> = {};
    for (const p of parcelas) {
      (map[p.condicao_id] ??= []).push(p);
    }
    return map;
  }, [parcelas]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.nome, c.descricao].some((f) => (f ?? "").toLowerCase().includes(q))
    );
  }, [list, query]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty, parcelas: [{ dias: "0", percentual: "100" }] });
    setOpen(true);
  }

  function openEdit(c: CondicaoPagamento) {
    setEditing(c);
    const ps = (parcelasPorCondicao[c.id] ?? []).sort((a, b) => a.numero - b.numero);
    setForm({
      nome: c.nome,
      descricao: c.descricao ?? "",
      ativo: c.ativo,
      parcelas: ps.length
        ? ps.map((p) => ({ dias: String(p.dias), percentual: String(p.percentual) }))
        : [{ dias: "0", percentual: "100" }],
    });
    setOpen(true);
  }

  function addParcela() {
    setForm((f) => ({
      ...f,
      parcelas: [...f.parcelas, { dias: "30", percentual: "0" }],
    }));
  }
  function removeParcela(i: number) {
    setForm((f) => ({
      ...f,
      parcelas: f.parcelas.filter((_, idx) => idx !== i),
    }));
  }
  function updateParcela(i: number, field: keyof ParcelaForm, value: string) {
    setForm((f) => ({
      ...f,
      parcelas: f.parcelas.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)),
    }));
  }

  const totalPercentual = useMemo(
    () => form.parcelas.reduce((s, p) => s + (Number(p.percentual.replace(",", ".")) || 0), 0),
    [form.parcelas]
  );

  async function handleSave() {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (form.parcelas.length === 0) {
      toast({ title: "Adicione ao menos uma parcela", variant: "destructive" });
      return;
    }
    if (Math.abs(totalPercentual - 100) > 0.01) {
      toast({
        title: "Soma das parcelas deve ser 100%",
        description: `Total atual: ${totalPercentual.toFixed(2)}%`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      ativo: form.ativo,
    };
    let condicaoId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("condicoes_pagamento").update(payload).eq("id", editing.id);
      if (error) {
        setSaving(false);
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("condicoes_pagamento")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        toast({ title: "Erro", description: error?.message, variant: "destructive" });
        return;
      }
      condicaoId = data.id as string;
    }

    // Substitui parcelas
    if (condicaoId) {
      await supabase.from("condicao_parcelas").delete().eq("condicao_id", condicaoId);
      const rows = form.parcelas.map((p, i) => ({
        condicao_id: condicaoId!,
        numero: i + 1,
        dias: Number(p.dias) || 0,
        percentual: Number(p.percentual.replace(",", ".")) || 0,
      }));
      const { error } = await supabase.from("condicao_parcelas").insert(rows);
      if (error) {
        setSaving(false);
        toast({ title: "Erro nas parcelas", description: error.message, variant: "destructive" });
        return;
      }
    }

    setSaving(false);
    toast({ title: editing ? "Condição atualizada" : "Condição criada" });
    setOpen(false);
    load();
  }

  async function handleDelete(c: CondicaoPagamento) {
    if (!confirm(`Excluir a condição "${c.nome}"?`)) return;
    const { error } = await supabase.from("condicoes_pagamento").delete().eq("id", c.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Condição excluída" });
      load();
    }
  }

  return (
    <div>
      <PageHeader
        title="Condições de pagamento"
        description="Defina parcelas com prazos e percentuais (ex: 30/60/90)."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Nova condição
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar condição" : "Nova condição"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Ex: 30/60/90"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Descrição</Label>
                  <Input
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>Parcelas</Label>
                    <Button size="sm" variant="outline" onClick={addParcela}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.parcelas.map((p, i) => (
                      <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">#{i + 1}</span>
                        <Input
                          inputMode="numeric"
                          placeholder="Dias"
                          value={p.dias}
                          onChange={(e) => updateParcela(i, "dias", e.target.value)}
                        />
                        <Input
                          inputMode="decimal"
                          placeholder="% da parcela"
                          value={p.percentual}
                          onChange={(e) => updateParcela(i, "percentual", e.target.value)}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeParcela(i)}
                          disabled={form.parcelas.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div
                    className={`mt-2 text-xs ${
                      Math.abs(totalPercentual - 100) > 0.01
                        ? "text-destructive"
                        : "text-success"
                    }`}
                  >
                    Total: {totalPercentual.toFixed(2)}% (deve somar 100%)
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
              placeholder="Buscar"
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
            icon={CreditCard}
            title={list.length === 0 ? "Nenhuma condição" : "Nada encontrado"}
            description={
              list.length === 0
                ? "Crie condições para usar em orçamentos e NFs."
                : "Ajuste a busca."
            }
            action={
              list.length === 0 ? (
                <Button onClick={openNew}><Plus className="h-4 w-4" /> Nova condição</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Parcelas</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const ps = (parcelasPorCondicao[c.id] ?? [])
                    .sort((a, b) => a.numero - b.numero);
                  return (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{c.nome}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {ps.length === 0
                          ? "—"
                          : ps
                              .map((p) => `${p.dias}d/${Number(p.percentual).toFixed(0)}%`)
                              .join(" · ")}
                      </td>
                      <td className="py-2.5 pr-3">
                        {c.ativo ? (
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                            Ativa
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Inativa
                          </span>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

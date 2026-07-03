import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, Package } from "lucide-react";
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
import type { Solucao, Fornecedor, TipoProduto, FornecedorSolucao } from "@/types/database";

const empty = {
  tipo_produto_id: "",
  nome: "",
  descricao: "",
  ativo: true,
  fornecedor_ids: [] as string[],
};

export default function SolucoesPage() {
  const [list, setList] = useState<Solucao[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [tipos, setTipos] = useState<TipoProduto[]>([]);
  const [vinculos, setVinculos] = useState<FornecedorSolucao[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Solucao | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [s, f, t, v] = await Promise.all([
      supabase.from("solucoes").select("*").order("created_at", { ascending: false }),
      supabase.from("fornecedores").select("*").order("nome", { ascending: true }),
      supabase.from("tipos_produto").select("*").order("nome", { ascending: true }),
      supabase.from("fornecedor_solucoes").select("*"),
    ]);
    if (s.error) toast({ title: "Erro ao carregar soluções", description: s.error.message, variant: "destructive" });
    else setList((s.data ?? []) as Solucao[]);
    if (f.data) setFornecedores(f.data as Fornecedor[]);
    if (t.data) setTipos(t.data as TipoProduto[]);
    if (v.data) setVinculos(v.data as FornecedorSolucao[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const fornecedorMap = useMemo(
    () => Object.fromEntries(fornecedores.map((f) => [f.id, f.nome])),
    [fornecedores]
  );
  const tipoMap = useMemo(
    () => Object.fromEntries(tipos.map((t) => [t.id, t.nome])),
    [tipos]
  );
  const vinculosPorSolucao = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const v of vinculos) {
      if (!map[v.solucao_id]) map[v.solucao_id] = [];
      map[v.solucao_id].push(v.fornecedor_id);
    }
    return map;
  }, [vinculos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => {
      const fornNomes = (vinculosPorSolucao[s.id] ?? [])
        .map((id) => fornecedorMap[id] ?? "")
        .join(" ");
      return [
        s.nome,
        s.descricao,
        s.tipo_produto_id ? tipoMap[s.tipo_produto_id] : null,
        fornNomes,
      ].some((f) => (f ?? "").toLowerCase().includes(q));
    });
  }, [list, query, fornecedorMap, tipoMap, vinculosPorSolucao]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty, fornecedor_ids: [] });
    setOpen(true);
  }
  function openEdit(s: Solucao) {
    setEditing(s);
    setForm({
      tipo_produto_id: s.tipo_produto_id ?? "",
      nome: s.nome,
      descricao: s.descricao ?? "",
      ativo: s.ativo,
      fornecedor_ids: vinculosPorSolucao[s.id] ?? [],
    });
    setOpen(true);
  }

  function toggleFornecedor(id: string) {
    setForm((f) => ({
      ...f,
      fornecedor_ids: f.fornecedor_ids.includes(id)
        ? f.fornecedor_ids.filter((x) => x !== id)
        : [...f.fornecedor_ids, id],
    }));
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!form.tipo_produto_id) {
      toast({ title: "Tipo de produto é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      tipo_produto_id: form.tipo_produto_id,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      ativo: form.ativo,
    };
    let solucaoId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("solucoes").update(payload).eq("id", editing.id);
      if (error) {
        setSaving(false);
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { data, error } = await supabase.from("solucoes").insert(payload).select("id").single();
      if (error || !data) {
        setSaving(false);
        toast({ title: "Erro ao salvar", description: error?.message, variant: "destructive" });
        return;
      }
      solucaoId = data.id as string;
    }

    // Sincroniza vínculos N:N
    if (solucaoId) {
      const atuais = vinculosPorSolucao[solucaoId] ?? [];
      const adicionar = form.fornecedor_ids.filter((id) => !atuais.includes(id));
      const remover = atuais.filter((id) => !form.fornecedor_ids.includes(id));

      if (adicionar.length > 0) {
        const { error } = await supabase
          .from("fornecedor_solucoes")
          .insert(adicionar.map((fid) => ({ solucao_id: solucaoId!, fornecedor_id: fid })));
        if (error) {
          setSaving(false);
          toast({ title: "Erro ao vincular fornecedores", description: error.message, variant: "destructive" });
          return;
        }
      }
      if (remover.length > 0) {
        const { error } = await supabase
          .from("fornecedor_solucoes")
          .delete()
          .eq("solucao_id", solucaoId)
          .in("fornecedor_id", remover);
        if (error) {
          setSaving(false);
          toast({ title: "Erro ao desvincular fornecedores", description: error.message, variant: "destructive" });
          return;
        }
      }
    }

    setSaving(false);
    toast({ title: editing ? "Solução atualizada" : "Solução criada" });
    setOpen(false);
    load();
  }

  async function handleDelete(s: Solucao) {
    if (!confirm(`Excluir a solução "${s.nome}"?`)) return;
    const { error } = await supabase.from("solucoes").delete().eq("id", s.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solução excluída" });
      load();
    }
  }

  return (
    <div>
      <PageHeader
        title="Soluções Gráficas"
        description="Gerencie as especialidades e infraestruturas gráficas."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} disabled={tipos.length === 0}>
                <Plus className="h-4 w-4" /> Nova solução
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar solução" : "Nova solução"}</DialogTitle>
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
                  <Label>Tipo de produto *</Label>
                  <Select
                    value={form.tipo_produto_id}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, tipo_produto_id: v }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {tipos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Descrição</Label>
                  <Textarea
                    rows={3}
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Fornecedores que entregam esta solução</Label>
                  {fornecedores.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      Cadastre fornecedores para vincular.
                    </div>
                  ) : (
                    <div className="max-h-44 overflow-y-auto rounded-md border border-border p-2 space-y-1.5">
                      {fornecedores.map((f) => (
                        <label key={f.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={form.fornecedor_ids.includes(f.id)}
                            onCheckedChange={() => toggleFornecedor(f.id)}
                          />
                          <span>{f.nome}</span>
                        </label>
                      ))}
                    </div>
                  )}
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

      {tipos.length === 0 && !loading && (
        <div className="surface-card mb-4 border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground">
          Cadastre ao menos um <strong>tipo de produto</strong> antes de criar soluções.
        </div>
      )}

      <div className="surface-card p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, fornecedor ou tipo"
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
            icon={Package}
            title={list.length === 0 ? "Nenhuma solução ainda" : "Nada encontrado"}
            description={
              list.length === 0
                ? "Cadastre soluções para usar nos orçamentos."
                : "Ajuste a busca ou limpe o filtro."
            }
            action={
              list.length === 0 && tipos.length > 0 ? (
                <Button onClick={openNew}><Plus className="h-4 w-4" /> Nova solução</Button>
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
                  <th className="py-2 pr-3">Fornecedores</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const fornIds = vinculosPorSolucao[s.id] ?? [];
                  return (
                    <tr key={s.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{s.nome}</td>
                      <td className="py-2.5 pr-3">
                        {s.tipo_produto_id ? (
                          <Badge variant="outline">
                            {tipoMap[s.tipo_produto_id] ?? "—"}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {fornIds.length === 0 ? (
                          <span className="text-xs italic">sem fornecedores</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {fornIds.slice(0, 3).map((fid) => (
                              <Badge key={fid} variant="secondary" className="font-normal">
                                {fornecedorMap[fid] ?? "—"}
                              </Badge>
                            ))}
                            {fornIds.length > 3 && (
                              <Badge variant="outline">+{fornIds.length - 3}</Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        {s.ativo ? (
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                            Ativo
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(s)}>
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

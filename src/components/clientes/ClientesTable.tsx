import { Link } from "react-router-dom";
import { Search, Plus, ExternalLink, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import type { Cliente } from "@/types/database";

interface ClientesTableProps {
  data: Cliente[];
  totalCount: number;
  loading: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onEdit: (c: Cliente) => void;
  onDelete: (c: Cliente) => void;
  onNew: () => void;
}

export function ClientesTable({
  data,
  totalCount,
  loading,
  query,
  onQueryChange,
  onEdit,
  onDelete,
  onNew,
}: ClientesTableProps) {
  return (
    <div className="surface-card p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar por nome, documento ou email"
            className="pl-8"
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {data.length} de {totalCount}
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Users}
          title={totalCount === 0 ? "Nenhum cliente ainda" : "Nada encontrado"}
          description={
            totalCount === 0
              ? "Cadastre o primeiro cliente para começar."
              : "Ajuste a busca ou limpe o filtro."
          }
          action={
            totalCount === 0 ? (
              <Button onClick={onNew}><Plus className="h-4 w-4" /> Novo cliente</Button>
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
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">
                    <Link
                      to={`/clientes/${c.id}`}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {c.nome_secundario || c.nome}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant="outline">{c.tipo}</Badge>
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{c.documento ?? "—"}</td>
                  <td className="py-2.5 pr-3">
                    {c.ativo ? (
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
                      <Button size="sm" variant="ghost" onClick={() => onEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(c)}>
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
  );
}

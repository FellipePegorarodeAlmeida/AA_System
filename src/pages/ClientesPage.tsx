import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { toast } from "@/hooks/use-toast";
import { clientesService } from "@/services/clientesService";
import type { Cliente } from "@/types/database";

import { ClientesTable } from "@/components/clientes/ClientesTable";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";

export default function ClientesPage() {
  const queryClient = useQueryClient();

  const { data: list = [], isLoading: loading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await clientesService.getClientes();
      if (error) {
        toast({ title: "Erro ao carregar clientes", description: error.message, variant: "destructive" });
        throw error;
      }
      return (data ?? []) as Cliente[];
    }
  });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const deleteClienteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await clientesService.deleteCliente(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    }
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.nome, c.documento, c.nome_secundario].some((f) => (f ?? "").toLowerCase().includes(q))
    );
  }, [list, query]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(c: Cliente) {
    setEditing(c);
    setOpen(true);
  }

  async function handleDelete(c: Cliente) {
    if (!confirm(`Excluir o cliente "${c.nome}"?`)) return;
    deleteClienteMutation.mutate(c.id, {
      onSuccess: () => {
        toast({ title: "Cliente excluído" });
      },
      onError: (error: Error) => {
        toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes PF/PJ."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo cliente
          </Button>
        }
      />

      <ClientesTable
        data={filtered}
        totalCount={list.length}
        loading={loading}
        query={query}
        onQueryChange={setQuery}
        onEdit={openEdit}
        onDelete={handleDelete}
        onNew={openNew}
      />

      <ClienteFormModal
        open={open}
        onOpenChange={setOpen}
        cliente={editing}
        onSuccess={() => {}}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import {
  Users, Truck, ShoppingCart, FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Counts = {
  clientes: number;
  fornecedores: number;
  orcamentos: number;
  pedidos: number;
};

export default function Dashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const tables = ["clientes", "fornecedores", "orcamentos", "pedidos"] as const;
      try {
        const results = await Promise.all(
          tables.map((t) => supabase.from(t).select("*", { count: "exact", head: true }))
        );
        const firstError = results.find((r) => r.error)?.error;
        if (firstError) {
          setError(firstError.message);
          return;
        }
        setCounts({
          clientes: results[0].count ?? 0,
          fornecedores: results[1].count ?? 0,
          orcamentos: results[2].count ?? 0,
          pedidos: results[3].count ?? 0,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      }
    }
    load();
  }, []);

  const kpis = [
    { label: "Clientes", value: counts?.clientes, icon: Users },
    { label: "Fornecedores", value: counts?.fornecedores, icon: Truck },
    { label: "Orçamentos", value: counts?.orcamentos, icon: FileText },
    { label: "Pedidos", value: counts?.pedidos, icon: ShoppingCart },
  ];

  return (
    <div>
      <PageHeader
        title="ERP LFA"
        description="Indicadores do fluxo Orçamento → Pedido → NF → Financeiro."
      />

      {error && (
        <div className="surface-card mb-4 border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível ler do Supabase: {error}.{" "}
          <span className="opacity-80">
            Verifique se você executou <code>supabase/schema.sql</code> no SQL Editor.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="surface-card p-5">
            <div className="flex items-start justify-between">
              <div className="kpi-label">{k.label}</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <k.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="mt-3 kpi-value tabular-nums">
              {k.value ?? (counts || error ? "—" : "…")}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Total cadastrado</div>
          </div>
        ))}
      </div>

      <div className="surface-card mt-6 p-5">
        <h3 className="font-semibold">Fila de desenvolvimento</h3>
        <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
          <li>26/05/2026</li>
          <li>cadastro de cliente dar um nome para cada endereço de entrega escritório, indústria X, filial Y. </li>
          <li> criar botão para duplicar orçamento</li>
          <li>
            Contas a receber:
            <ul className="ml-6 mt-1 list-disc space-y-1">
              <li>começar a passar os fios para o módulo de caixa. No momento que a gente da a baixa do recebimento de comissão, sai do contas a receber, e vai para movimentação de caixa;</li>
              <li>
                controles de vendedor que eu tinha:
                <ul className="ml-6 mt-1 list-disc space-y-1">
                  <li>valor por mês - aqui, diferente entre pedidos abertos, faturamento e recebimento (3 visões);</li>
                </ul>
              </li>
            </ul>
          </li>
          <li>Proposta Revenda</li>
        </ol>
      </div>
    </div>
  );
};

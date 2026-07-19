import { useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useItensPcp } from "@/hooks/use-pcp";
import { ArrowLeft } from "lucide-react";

export default function PcpPrintPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fornecedorAlvo = searchParams.get("fornecedor");

  const { data: itens, isLoading } = useItensPcp();

  // Filtra e ordena os itens pela data de entrega (garantia extra no frontend)
  const itensProcessados = useMemo(() => {
    if (!itens) return [];
    
    let filtrados = itens;
    if (fornecedorAlvo !== "ALL") {
      filtrados = itens.filter((i: any) => i.fornecedor_nome === fornecedorAlvo);
    }

    // Ordenação cronológica (Data mais antiga primeiro, sem data vai para o final)
    return filtrados.sort((a: any, b: any) => {
      const dataA = a.data_entrega_efetiva ? new Date(a.data_entrega_efetiva).getTime() : Infinity;
      const dataB = b.data_entrega_efetiva ? new Date(b.data_entrega_efetiva).getTime() : Infinity;
      return dataA - dataB;
    });
  }, [itens, fornecedorAlvo]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  // Dispara a impressão automaticamente após renderizar
  useEffect(() => {
    if (!isLoading && itensProcessados.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, itensProcessados]);

  if (isLoading) {
    return <div className="p-8 text-center print:hidden">Carregando dados para impressão...</div>;
  }

  const isGlobal = fornecedorAlvo === "ALL";

  return (
    <div className="bg-white text-black min-h-screen font-sans p-8 print:p-0 print:m-0 w-full max-w-5xl mx-auto relative">
      {/* Botão Voltar - Oculto na Impressão */}
      <button
        onClick={() => navigate(-1)}
        className="print:hidden absolute top-4 left-4 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao PCP
      </button>

      {/* Cabeçalho do Relatório */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tighter">
          {isGlobal ? "Pauta Geral de Produção (PCP)" : `Pauta de Produção - ${fornecedorAlvo}`}
        </h1>
        <p className="text-sm font-medium mt-1 text-gray-600">
          Gerado em: {new Date().toLocaleString("pt-BR")}
        </p>
      </div>

      {/* Tabela de Itens (Plana e Ordenada) */}
      <div className="break-inside-avoid">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-2 font-bold w-12">Item</th>
              <th className="py-2 font-bold">Descrição do Material</th>
              <th className="py-2 font-bold w-16">Ped.</th>
              <th className="py-2 font-bold">Cliente</th>
              {isGlobal && <th className="py-2 font-bold">Fornecedor</th>}
              <th className="py-2 font-bold text-center w-16">Qtd</th>
              <th className="py-2 font-bold w-40">Status</th>
              <th className="py-2 font-bold w-24 text-right">Previsão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {itensProcessados.map((item: any) => (
              <tr key={item.item_id} className="border-b border-gray-300 last:border-black">
                <td className="py-2 font-bold align-top text-gray-600">#{item.item_numero}</td>
                <td className="py-2 font-bold align-top">{item.item_descricao || "—"}</td>
                <td className="py-2 font-semibold align-top text-gray-600">#{item.pedido_numero}</td>
                <td className="py-2 align-top">{item.cliente_nome || "—"}</td>
                {isGlobal && (
                  <td className="py-2 font-bold text-indigo-800 align-top uppercase text-[10px]">
                    {item.fornecedor_nome || "—"}
                  </td>
                )}
                <td className="py-2 font-bold text-center align-top">{item.quantidade || 0}</td>
                <td className="py-2 align-top uppercase text-[10px] font-bold">
                  {item.item_status?.replace(/_/g, " ") || "ABERTO"}
                </td>
                <td className="py-2 align-top font-bold text-right text-[11px]">
                  {formatDate(item.data_entrega_efetiva)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

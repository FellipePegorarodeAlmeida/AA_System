import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { orcamentoService } from "@/services/orcamentoService";
import { supabase } from "@/lib/supabase";

export default function SolicitacaoPrintPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fornecedorId = searchParams.get("fornecedor");
  const showClient = searchParams.get("showClient") === "true";

  const [orcamento, setOrcamento] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [fornecedorDestino, setFornecedorDestino] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id || !fornecedorId) return;
      try {
        // 1. Busca os dados do Orçamento (Aproveitamos o service existente)
        const dados = await orcamentoService.getOrcamentoParaImpressao(id);
        setOrcamento(dados.orcamento);
        setItens(dados.itens);

        // 2. Busca os dados específicos da Gráfica Destino
        const { data: fornData } = await supabase
          .from('fornecedores')
          .select('*')
          .eq('id', fornecedorId)
          .single();
        setFornecedorDestino(fornData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, fornecedorId]);

  if (loading) return <div className="p-10 text-center">Carregando solicitação...</div>;
  if (!orcamento || !fornecedorDestino) return <div className="p-10 text-center">Dados inválidos.</div>;

  return (
    <div className="bg-white text-black min-h-screen font-sans p-8 print:p-0 print:m-0 w-full max-w-4xl mx-auto relative">
      {/* Botões de Ação (Escondidos na Impressão) */}
      <div className="print:hidden absolute top-4 left-4 flex gap-2">
        <button 
          onClick={() => navigate(`/orcamentos?id=${id}`)} 
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md shadow-sm">
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </button>
      </div>

      {/* CABEÇALHO */}
      <div className="border-b-2 border-black pb-4 mb-6 pt-12 print:pt-0">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Solicitação de Orçamento</h1>
            <p className="text-sm font-medium mt-1">Ref: ORC-{new Date(orcamento.created_at).getFullYear()}-{orcamento.numero}</p>
          </div>
          <div className="text-right text-sm">
            <p><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>Solicitante:</strong> AA Representação</p>
          </div>
        </div>
      </div>

      {/* DESTINATÁRIO */}
      <div className="p-4 border border-black rounded-lg bg-gray-50/50 print:bg-transparent mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">À Gráfica / Fornecedor</h2>
        <p className="font-bold text-lg leading-tight uppercase">{fornecedorDestino.nome}</p>
        {fornecedorDestino.nome_contato && <p className="text-sm mt-1">A/C: {fornecedorDestino.nome_contato}</p>}
        
        {showClient && orcamento.cliente && (
          <div className="mt-4 pt-3 border-t border-gray-300">
            <h3 className="text-[10px] font-bold uppercase text-gray-500 mb-1">Cliente Final (Referência)</h3>
            <p className="text-sm font-bold uppercase">{orcamento.cliente.nome}</p>
          </div>
        )}
      </div>

      {/* INSTRUÇÕES */}
      <p className="text-sm font-medium mb-4 italic">
        Favor enviar proposta comercial com os melhores custos para a produção dos itens detalhados abaixo:
      </p>

      {/* ITENS - ESPECIFICAÇÕES TÉCNICAS (SEM FINANCEIRO) */}
      <div className="space-y-6">
        {itens.map((item, index) => {
          const largura = Number(item.largura_mm) || 0;
          const altura = Number(item.altura_mm) || 0;
          const temDimensoes = largura > 0 && altura > 0;

          return (
            <div key={item.id} className="border border-gray-400 rounded p-4 break-inside-avoid">
              <div className="flex justify-between items-start border-b border-gray-200 pb-2 mb-3">
                <h3 className="font-black text-lg uppercase text-blue-900 print:text-black">
                  Item {index + 1}: {item.descricao}
                </h3>
                <div className="text-right">
                  <span className="block text-[10px] uppercase font-bold text-gray-500">Tiragem Requisitada</span>
                  <span className="font-black text-lg bg-gray-100 px-2 rounded">{item.quantidade} un</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {temDimensoes ? (
                  <div className="col-span-2"><span className="font-bold text-gray-500 uppercase text-[10px] block">Formato / Dimensões</span>{largura} x {altura} mm</div>
                ) : item.formato ? (
                  <div className="col-span-2"><span className="font-bold text-gray-500 uppercase text-[10px] block">Formato</span>{item.formato}</div>
                ) : null}
                
                {item.substrato && (
                  <div><span className="font-bold text-gray-500 uppercase text-[10px] block">Substrato</span>{item.substrato}</div>
                )}
                {item.prazo_estimado && (
                  <div><span className="font-bold text-gray-500 uppercase text-[10px] block">Prazo Estimado</span>{item.prazo_estimado}</div>
                )}
                {item.acabamentos && (
                  <div className="col-span-2 mt-2 pt-2 border-t border-dashed border-gray-200"><span className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Acabamentos Especiais</span><p className="whitespace-pre-wrap">{item.acabamentos}</p></div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 pt-4 border-t border-black text-center text-xs text-gray-500">
        Documento gerado automaticamente. Qualquer dúvida nas especificações, favor retornar o contato antes da cotação.
      </div>
    </div>
  );
}

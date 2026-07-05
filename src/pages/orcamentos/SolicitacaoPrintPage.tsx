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
  const [produtosGrouped, setProdutosGrouped] = useState<any[]>([]);
  const [fornecedorDestino, setFornecedorDestino] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id || !fornecedorId) return;
      try {
        const dados = await orcamentoService.getOrcamentoParaImpressao(id);
        setOrcamento(dados.orcamento);
        
        // Agrupa os itens pela lógica de Cenario (Kits / Opções / SKUs)
        const produtos = (dados.itens || []).reduce((acc: any[], item: any) => {
          let grupo = acc.find(g => g.cenario_id === item.cenario_id);
          if (!grupo) {
            grupo = { cenario_id: item.cenario_id, nome_opcao: item.nome_opcao || "Produto", specs: item, linhas: [] };
            acc.push(grupo);
          }
          grupo.linhas.push(item);
          return acc;
        }, []);
        setProdutosGrouped(produtos);

        const { data: fornData } = await supabase.from('fornecedores').select('*').eq('id', fornecedorId).single();
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
      <div className="print:hidden absolute top-4 left-4 flex gap-2">
        <button onClick={() => navigate(`/orcamentos?id=${id}`)} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md shadow-sm">
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </button>
      </div>

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

      <div className="p-4 border border-black rounded-lg bg-gray-50/50 print:bg-transparent mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">À Gráfica / Fornecedor</h2>
        <p className="font-bold text-lg leading-tight uppercase">{fornecedorDestino.nome}</p>
        {showClient && orcamento.cliente && (
          <div className="mt-4 pt-3 border-t border-gray-300">
            <h3 className="text-[10px] font-bold uppercase text-gray-500 mb-1">Cliente Final (Referência)</h3>
            <p className="text-sm font-bold uppercase">{orcamento.cliente.nome}</p>
          </div>
        )}
      </div>

      <p className="text-sm font-medium mb-6 italic">Favor enviar proposta comercial com os melhores custos para a produção das opções abaixo:</p>

      <div className="space-y-8">
        {produtosGrouped.map((grupo, index) => {
          const itemBase = grupo.specs;
          const jsonb = itemBase.especificacao_tecnica || {};
          const isKit = !!jsonb.grupo_kit;
          const largura = Number(itemBase.largura_mm) || 0;
          const altura = Number(itemBase.altura_mm) || 0;

          return (
            <div key={grupo.cenario_id} className="border-2 border-gray-400 rounded-lg overflow-hidden break-inside-avoid">
              {/* HEADER DO PRODUTO */}
              <div className="bg-gray-100 border-b border-gray-400 p-3">
                {isKit && <span className="bg-black text-white px-2 py-0.5 text-[10px] font-bold uppercase rounded mr-2">Kit: {jsonb.grupo_kit}</span>}
                <span className="font-black text-lg uppercase">{grupo.nome_opcao}</span>
              </div>

              {/* ESPECIFICAÇÕES TÉCNICAS (Com extração rica) */}
              <div className="p-4 text-sm space-y-3">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {(largura > 0 && altura > 0) ? (
                    <div className="col-span-2"><span className="font-bold text-gray-500 uppercase text-[10px] block">Formato / Dimensões</span>{largura} x {altura} mm</div>
                  ) : itemBase.formato && (
                    <div className="col-span-2"><span className="font-bold text-gray-500 uppercase text-[10px] block">Formato</span>{itemBase.formato}</div>
                  )}
                  
                  {itemBase.substrato && <div><span className="font-bold text-gray-500 uppercase text-[10px] block">Substrato Base</span>{itemBase.substrato}</div>}
                  {itemBase.prazo_estimado && <div><span className="font-bold text-gray-500 uppercase text-[10px] block">Prazo Estimado</span>{itemBase.prazo_estimado}</div>}
                  
                  {jsonb.capa?.tipo && <div><span className="font-bold text-gray-500 uppercase text-[10px] block">Capa</span>{jsonb.capa.tipo} - {jsonb.capa.papel}</div>}
                  {jsonb.miolo?.papel && <div><span className="font-bold text-gray-500 uppercase text-[10px] block">Miolo</span>{jsonb.miolo.papel} {jsonb.miolo.gramatura}g ({jsonb.miolo.paginas} páginas)</div>}
                </div>

                {itemBase.acabamentos && (
                  <div className="pt-2 border-t border-dashed border-gray-300">
                    <span className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Acabamentos Especiais / Observações</span>
                    <p className="whitespace-pre-wrap">{itemBase.acabamentos}</p>
                  </div>
                )}
              </div>

              {/* GRADE DE QUANTIDADES PARA A GRÁFICA PREENCHER */}
              <table className="w-full text-sm border-t border-gray-400">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left font-bold text-xs uppercase text-gray-600 border-b border-gray-300">Variação / SKU</th>
                    <th className="py-2 px-4 text-center font-bold text-xs uppercase text-gray-600 border-b border-gray-300 border-l">Quantidade</th>
                    <th className="py-2 px-4 text-right font-bold text-xs uppercase text-gray-600 border-b border-gray-300 border-l w-32">Custo Unitário</th>
                    <th className="py-2 px-4 text-right font-bold text-xs uppercase text-gray-600 border-b border-gray-300 border-l w-32">Custo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.linhas.map((linha: any) => (
                    <tr key={linha.id} className="border-b border-gray-200 last:border-0">
                      <td className="py-2 px-4 font-medium">{linha.descricao}</td>
                      <td className="py-2 px-4 text-center font-bold border-l border-gray-200 bg-gray-50/50">{linha.quantidade} {linha.quantidade_unidade}</td>
                      <td className="py-2 px-4 border-l border-gray-200 text-right"></td>
                      <td className="py-2 px-4 border-l border-gray-200 text-right"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

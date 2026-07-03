import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { orcamentoService } from "@/services/orcamentoService";

const formatMoney = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

const formatMoneyUnitario = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(val || 0);

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
};

export default function OrcamentoPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [orcamento, setOrcamento] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [contato, setContato] = useState<any>(null);
  const [endereco, setEndereco] = useState<any>(null);
  const [condicaoPagamento, setCondicaoPagamento] = useState<any>(null);
  const [agente, setAgente] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const result = await orcamentoService.getOrcamentoParaImpressao(id);
        setOrcamento(result.orcamento);
        setItens(result.itens);
        setContato(result.contato);
        setEndereco(result.endereco);
        setCondicaoPagamento(result.condicaoPagamento);
        setAgente(result.agente);

        // A impressão automática foi removida para melhorar a usabilidade
        // setTimeout(() => window.print(), 1000);
      } catch (err) {
        console.error("Erro ao carregar dados para proposta:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    if (!orcamento) return;
    const originalTitle = document.title;
    const ano = new Date(orcamento.created_at).getFullYear();
    document.title = `ORC-${ano}-${orcamento.numero}`;
    
    return () => {
      document.title = originalTitle;
    };
  }, [orcamento]);

  if (loading || !orcamento) {
    return (
      <div className="p-8 text-center text-muted-foreground print:hidden">
        Gerando Proposta Comercial...
      </div>
    );
  }

  // Agrupamento de Itens por Cenário
  const cenariosGroup = itens.reduce((acc: any, item: any) => {
    const cid = item.cenario_id || "default";
    if (!acc[cid]) {
      acc[cid] = {
        cenario_id: cid,
        nome_opcao: item.nome_opcao || "Opção " + (Object.keys(acc).length + 1),
        itens: [],
        subtotal: 0
      };
    }
    acc[cid].itens.push(item);
    acc[cid].subtotal += (Number(item.total) || 0);
    return acc;
  }, {});

  const cenarios = Object.values(cenariosGroup) as any[];
  
  const orcNumero = `ORC-${new Date(orcamento.created_at).getFullYear()}-${orcamento.numero}`;
  const modalidadeFrete = orcamento.modalidade_frete as string | null;
  const isFretesFOB = modalidadeFrete === "Frete FOB";
  const isHub = agente?.nome?.toLowerCase().includes("hub");

  // Matriz Grouping Intelligence
  let isMatrix = false;
  if (cenarios.length > 1) {
    const baseItens = cenarios[0].itens;
    isMatrix = cenarios.every(c => {
      if (c.itens.length !== baseItens.length) return false;
      return c.itens.every((it: any, idx: number) => {
        const b = baseItens[idx];
        return it.descricao === b.descricao &&
               it.formato === b.formato &&
               it.largura_mm === b.largura_mm &&
               it.altura_mm === b.altura_mm &&
               it.substrato === b.substrato &&
               it.acabamentos === b.acabamentos;
      });
    });
  }

  const renderItemSpecs = (item: any) => (
    <>
      <p className="font-bold text-sm uppercase text-gray-900">{item.descricao}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-1.5 text-[11px] text-gray-600">
        {item.formato && (
          <div>
            <span className="font-semibold text-gray-500 uppercase">Formato: </span>
            {item.formato}
          </div>
        )}
        {!item.formato && Number(item.largura_mm) > 0 && Number(item.altura_mm) > 0 && (
          <div>
            <span className="font-semibold text-gray-500 uppercase">Formato: </span>
            {item.largura_mm} x {item.altura_mm} mm
          </div>
        )}
        {item.substrato && (
          <div>
            <span className="font-semibold text-gray-500 uppercase">Substrato: </span>
            {item.substrato}
          </div>
        )}
        {item.acabamentos && (
          <div className="w-full mt-1">
            <span className="font-semibold text-gray-500 uppercase block">Especificação: </span>
            {item.acabamentos}
          </div>
        )}
        {item.prazo_estimado && (
          <div className="w-full mt-1">
            <span className="font-semibold text-rose-700 uppercase">Prazo de Produção: </span>
            <span className="text-gray-800 font-medium">{item.prazo_estimado}</span>
          </div>
        )}
      </div>
    </>
  );

  const renderTabelaItens = (listaItens: any[], title: string, subtotal: number) => (
    <div className="mb-4">
      <h2 className="text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
        {title}
      </h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-black text-gray-600">
            <th className="py-2 text-left font-bold w-8">#</th>
            <th className="py-2 text-left font-bold">Especificações Técnicas</th>
            <th className="py-2 text-center font-bold w-12">Qtd</th>
            <th className="py-2 text-right font-bold w-32">Val. Unit.</th>
            <th className="py-2 text-right font-bold w-32">Total</th>
          </tr>
        </thead>
        <tbody>
          {listaItens.map((item, index) => (
            <tr
              key={item.id}
              className="border-b border-gray-200 last:border-black print:break-inside-avoid"
            >
              <td className="py-3 align-top text-gray-400 font-medium">
                {item.ordem_proposta ?? index + 1}
              </td>
              <td className="py-3 pr-4 align-top">
                {renderItemSpecs(item)}
              </td>
              <td className="py-3 text-center font-semibold align-top text-gray-800">
                {item.quantidade}
                {item.quantidade_unidade && item.quantidade_unidade !== "unidade" && (
                  <span className="text-[10px] text-gray-400 ml-0.5">
                    ({item.quantidade_unidade})
                  </span>
                )}
              </td>
              <td className="py-3 text-right align-top text-gray-600">
                {formatMoneyUnitario(item.preco_unitario)}
              </td>
              <td className="py-3 text-right font-bold align-top text-gray-900">
                {formatMoney(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="bg-gray-50 border-t-2 border-black py-4 pr-4 flex justify-end items-center gap-6">
        <span className="font-bold uppercase text-[11px] tracking-widest text-gray-600">Total desta Opção</span>
        <span className="font-black text-lg text-gray-900 w-32 text-right">{formatMoney(subtotal)}</span>
      </div>
    </div>
  );

  const renderMatriz = () => {
    const baseItens = cenarios[0].itens;
    return (
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
          Comparativo de Opções
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black text-gray-600">
              <th className="py-2 text-left font-bold w-8">#</th>
              <th className="py-2 text-left font-bold">Especificações Técnicas</th>
              <th className="py-2 text-left font-bold">Opções de Investimento</th>
            </tr>
          </thead>
          <tbody>
            {baseItens.map((baseItem: any, index: number) => (
              <tr
                key={baseItem.id}
                className="border-b border-gray-200 last:border-black print:break-inside-avoid"
              >
                <td className="py-3 align-top text-gray-400 font-medium">
                  {baseItem.ordem_proposta ?? index + 1}
                </td>
                <td className="py-3 pr-4 align-top w-1/2 border-r border-gray-200">
                  {renderItemSpecs(baseItem)}
                </td>
                <td className="py-3 pl-4 align-top">
                  <div className="space-y-3">
                    {cenarios.map((c: any) => {
                      const itemData = c.itens[index];
                      return (
                        <div key={c.cenario_id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100">
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-gray-500">{c.nome_opcao}</span>
                            <span className="font-semibold">
                              {itemData.quantidade} {itemData.quantidade_unidade !== "unidade" ? itemData.quantidade_unidade : ""}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">({formatMoneyUnitario(itemData.preco_unitario)}/un)</span>
                          </div>
                          <div className="text-right font-bold text-gray-900">
                            {formatMoney(itemData.total)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bg-gray-50 border-t-2 border-black py-4 pr-4 flex justify-end gap-12">
          <span className="font-bold uppercase text-[11px] tracking-widest text-gray-600 mt-1">Resumo de Totais</span>
          <div className="space-y-2 min-w-[250px]">
            {cenarios.map((c: any) => (
              <div key={c.cenario_id} className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600">{c.nome_opcao}</span>
                <span className="font-black text-gray-900">{formatMoney(c.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white text-black min-h-screen font-sans p-10 print:p-0 print:m-0 w-full max-w-4xl mx-auto relative">
      <button
        onClick={() => navigate(-1)}
        className="print:hidden absolute top-4 left-4 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      {/* ── Cabeçalho Dinâmico da Proposta ─────────────────────── */}
      <div className="border-b-2 border-black pb-2 mb-3">
        <div className="flex justify-between items-end">
          
          {/* Espaço para o Logotipo */}
          <div className="flex items-end h-16">
            {isHub ? (
              <img 
                src="/logo-hub.png" 
                alt="Hub Logo" 
                className="max-h-16 object-contain" 
              />
            ) : (
              <div className="flex items-center gap-2 text-gray-800">
                <Building2 className="h-8 w-8 text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tighter uppercase leading-none">
                    {agente?.nome}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="text-right">
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none text-gray-800">
              Proposta Comercial
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-semibold">Ref: {orcNumero}</p>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-200 flex items-start justify-between">
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Data de Emissão
              </p>
              <p className="font-semibold text-sm mt-0.5">{formatDate(orcamento.created_at)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Validade da Proposta
              </p>
              <p className="font-semibold text-sm mt-0.5 text-rose-700">
                15 dias
              </p>
            </div>
          </div>

          {agente && !isHub && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Apresentado por
              </p>
              <p className="font-bold text-sm mt-0.5">{agente.nome}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Dados do Cliente ───────────────────────────────────── */}
      <div className="p-4 border border-black rounded-lg mb-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Apresentado para (Cliente)</h2>
            <p className="font-bold text-base leading-tight">
              {orcamento.cliente?.nome || orcamento.cliente_nome || "—"}
              {orcamento.cliente?.documento && <span className="text-sm font-normal text-gray-500 ml-2">CNPJ/CPF: {orcamento.cliente.documento}</span>}
              {orcamento.cliente?.inscricao_estadual && <span className="text-sm font-normal text-gray-500 ml-2">IE: {orcamento.cliente.inscricao_estadual}</span>}
            </p>
            {contato && (
              <p className="text-sm mt-1 font-medium text-gray-700">
                A/C: <span className="font-bold">{contato.nome}</span>
                {contato.cargo && <span className="text-gray-500 font-normal"> ({contato.cargo})</span>}
              </p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Local de Entrega Estimado</h2>
            {endereco ? (
              <p className="text-sm leading-tight text-gray-700">
                {endereco.logradouro}, {endereco.numero} {endereco.complemento && `- ${endereco.complemento}`} | {endereco.bairro} — {endereco.cidade}/{endereco.uf} | CEP: {endereco.cep}
              </p>
            ) : (
              <p className="text-sm italic text-gray-400">Endereço de entrega a confirmar.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Título do Trabalho ─────────────────────────────────── */}
      {orcamento.titulo && (
        <div className="mb-3 px-4 py-3 bg-gray-100 rounded-lg">
          <span className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">
            Referência do Trabalho
          </span>
          <p className="font-bold text-lg mt-0.5 text-gray-900">{orcamento.titulo}</p>
        </div>
      )}

      {/* ── Tabela de Investimento (Itens) ─────────────────────── */}
      {isMatrix ? renderMatriz() : cenarios.map((opcao) => 
        renderTabelaItens(opcao.itens, opcao.nome_opcao, opcao.subtotal)
      )}

      {/* ── Observações + Financeiro ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="col-span-2 space-y-3">
          {orcamento.observacoes && (
            <div className="p-4 border border-gray-300 bg-gray-50 rounded-lg">
              <h3 className="text-[10px] font-bold uppercase text-gray-500 mb-1.5">
                Observações Comerciais
              </h3>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
                {orcamento.observacoes}
              </p>
            </div>
          )}

          {isFretesFOB && (
            <div className="p-3 border border-amber-300 bg-amber-50 rounded-lg text-xs text-amber-800">
              <span className="font-bold uppercase">⚠ Frete FOB: </span>
              Os custos logísticos de envio (Frete FOB) não estão inclusos nesta proposta e serão cotados no momento da expedição.
            </div>
          )}
        </div>

        {/* Bloco financeiro de fechamento */}
        <div className="col-span-1 border-l-2 border-black pl-5 flex flex-col justify-end">
          <div className="text-sm mb-3 space-y-3">
            {condicaoPagamento?.nome && (
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-bold">
                  Condição de Pagamento
                </span>
                <span className="font-semibold text-sm">{condicaoPagamento.nome}</span>
              </div>
            )}
            {modalidadeFrete && (
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-bold">
                  Modalidade de Frete
                </span>
                <span className="font-semibold text-sm">{modalidadeFrete}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bloco de De Acordo ─────────────────────────────────── */}
      <div className="border-t-2 border-black pt-8 mt-4 page-break-inside-avoid">
        <p className="text-xs font-bold uppercase text-gray-500 tracking-widest mb-6 text-center">
          Aceite e Aprovação da Proposta
        </p>
        <div className="grid grid-cols-2 gap-12 max-w-2xl mx-auto">
          <div>
            <div className="border-b border-black h-10 mb-2" />
            <p className="text-xs text-gray-500 text-center">Assinatura do Cliente</p>
          </div>
          <div>
            <div className="border-b border-black h-10 mb-2" />
            <p className="text-xs text-gray-500 text-center">
              Local e Data
            </p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-6 leading-relaxed text-center max-w-2xl mx-auto">
          Ao assinar este documento, o cliente confirma a aprovação desta proposta comercial, 
          concordando com as especificações técnicas, prazos, valores e condições estabelecidas.
        </p>
      </div>
    </div>
  );
}
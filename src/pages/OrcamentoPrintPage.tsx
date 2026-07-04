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

  const orcNumero = `ORC-${new Date(orcamento.created_at).getFullYear()}-${orcamento.numero}`;
  const modalidadeFrete = orcamento.modalidade_frete as string | null;
  const isFretesFOB = modalidadeFrete === "Frete FOB";
  const isHub = agente?.nome?.toLowerCase().includes("hub");

  // 1. Tradutor Atualizado (Com Pantone, Acabamentos da Capa e Detalhes)
  const buildSpecsString = (item: any) => {
    const s = item.especificacao_tecnica || item.specs || {};
    if (Object.keys(s).length === 0 || !s.capa) {
      return [
        item.formato ? `Formato: ${item.formato}` : (item.largura_mm ? `Formato: ${item.largura_mm}x${item.altura_mm}mm` : null),
        item.substrato ? `Substrato: ${item.substrato}` : null,
        item.acabamentos ? `Acabamentos: ${item.acabamentos}` : null
      ].filter(Boolean).join(" | ");
    }

    const parts = [];
    if (s.tipo_obra) parts.push(`Obra: ${s.tipo_obra}`);
    if (s.regra_encadernacao) {
      let enc = `Encadernação: ${s.regra_encadernacao}`;
      if (s.regra_encadernacao === 'Espiral') enc += ` ${s.espiral_material || ''} (${s.espiral_cor || ''})`;
      if (s.regra_encadernacao === 'Wire-O' && s.wireo_cor) enc += ` (${s.wireo_cor})`;
      parts.push(enc.trim());
    }
    
    if (s.capa) {
      let c = `Capa: ${s.capa.papel} ${s.capa.gramatura}`;
      const coresCapa = s.capa.cores || 's/ cor';
      const pantoneCapa = s.capa.usa_pantone && s.capa.pantone_cor ? ` + Pantone ${s.capa.pantone_cor}` : '';
      c += ` (${coresCapa}${pantoneCapa})`;
      if (s.capa.capa_dura) c += ` - Capa Dura (${s.capa.espessura_papelao})`;
      
      const acabsCapa = [s.capa.acabamento_1, s.capa.acabamento_2, s.capa.acabamento_3].filter((a: any) => a && a !== 'Nenhum');
      if (s.capa.acabamento_2 === 'Hotstamping' && s.capa.acab_2_cor) {
        const idx = acabsCapa.indexOf('Hotstamping');
        if (idx !== -1) acabsCapa[idx] = `Hotstamping ${s.capa.acab_2_cor} ${s.capa.acab_2_medida ? '('+s.capa.acab_2_medida+')' : ''}`.trim();
      }
      if (acabsCapa.length > 0) c += ` [${acabsCapa.join(', ')}]`;
      parts.push(c);
    }

    if (s.miolos && Array.isArray(s.miolos)) {
      s.miolos.forEach((m: any, idx: number) => {
        const papelNome = m.papel === 'Papel especial' && m.papel_especial_nome ? m.papel_especial_nome : m.papel;
        let mStr = `Miolo ${idx + 1}: ${m.paginas || 0} pgs - ${papelNome} ${m.gramatura}`;
        
        const coresMiolo = m.cores || 's/ cor';
        const pantoneMiolo = m.usa_pantone && m.pantone_cor ? ` + Pantone ${m.pantone_cor}` : '';
        mStr += ` (${coresMiolo}${pantoneMiolo})`;

        const acabsMiolo = [m.acabamento_1, m.acabamento_2].filter((a: any) => a && a !== 'Nenhum');
        if (m.acabamento_2 === 'Hotstamping' && m.acab_2_cor) {
          const idx = acabsMiolo.indexOf('Hotstamping');
          if (idx !== -1) acabsMiolo[idx] = `Hotstamping ${m.acab_2_cor} ${m.acab_2_medida ? '('+m.acab_2_medida+')' : ''}`.trim();
        }
        if (acabsMiolo.length > 0) mStr += ` [${acabsMiolo.join(', ')}]`;
        parts.push(mStr);
      });
    }
    return parts.join(" | ");
  };

  // 2. Block Engine (Agrupador Inteligente)
  const groupedBlocks: any[] = [];
  itens.forEach(it => {
    const s = it.especificacao_tecnica || it.specs || {};
    const isKit = !!s.grupo_kit;
    const isSku = s.tipo_variacao_opcoes === 'sku';
    const blockName = isKit ? s.grupo_kit : it.descricao;
    const specsStr = buildSpecsString(it);
    
    // Se for SKU diferente, nunca agrupa por quantidade. Se for Kit ou Quantidade, agrupa.
    const blockId = isKit ? `KIT_${s.grupo_kit}` : (isSku ? `SKU_${it.id}` : `AVULSO_${it.descricao}_${specsStr}`);

    let block = groupedBlocks.find(b => b.blockId === blockId);
    if (!block) {
      block = { blockId, isKit, name: blockName, components: [], quantities: {} };
      groupedBlocks.push(block);
    }

    // Adiciona a especificação apenas se não for repetida no bloco
    if (!block.components.find((c: any) => c.specsStr === specsStr)) {
      block.components.push({ descricao: it.descricao, specsStr, prazo: it.prazo_estimado });
    }

    // Soma os valores nas opções de quantidade
    const qKey = it.quantidade;
    if (!block.quantities[qKey]) {
      block.quantities[qKey] = { quantidade: it.quantidade, quantidade_unidade: it.quantidade_unidade, total: 0 };
    }
    block.quantities[qKey].total += (Number(it.total) || 0);
  });

  // 3. Renderizador de Blocos
  const renderBlocks = () => {
    return groupedBlocks.map((block, index) => (
      <div key={block.blockId} className="mb-6 page-break-inside-avoid border-2 border-black rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b-2 border-black flex items-center justify-between">
          <h2 className="text-sm font-black uppercase text-gray-900 tracking-widest">
            {block.isKit ? `📦 KIT: ${block.name}` : `${index + 1}. ${block.name}`}
          </h2>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Especificações Técnicas</h3>
            <ul className="space-y-3">
              {block.components.map((comp: any, i: number) => (
                <li key={i} className="text-xs text-gray-700">
                  {block.isKit && <span className="font-bold block text-gray-900 uppercase mb-0.5">{comp.descricao}</span>}
                  <span className="leading-relaxed block">{comp.specsStr}</span>
                  {comp.prazo && <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">Prazo: {comp.prazo}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Opções de Investimento</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600 text-[11px] uppercase">
                  <th className="py-2 text-left font-bold">Quantidade</th>
                  <th className="py-2 text-right font-bold w-32">Val. Unit.</th>
                  <th className="py-2 text-right font-bold w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(block.quantities).sort((a:any, b:any) => a.quantidade - b.quantidade).map((q: any, i) => {
                  const unitPrice = q.total / q.quantidade;
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 font-bold text-gray-800">
                        {q.quantidade} <span className="text-[10px] font-medium text-gray-500 ml-1">{q.quantidade_unidade !== 'unidade' ? q.quantidade_unidade : ''}</span>
                      </td>
                      <td className="py-2.5 text-right text-gray-600 font-medium">{formatMoneyUnitario(unitPrice)}</td>
                      <td className="py-2.5 text-right font-black text-gray-900">{formatMoney(q.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ));
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

      {/* Debug Block Temporário */}
      <div className="print:hidden mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-xs overflow-auto max-h-40">
        <p className="font-bold text-red-800 mb-2">RAIO-X DE DADOS (Invisível na impressão):</p>
        {itens.map((it: any) => {
          const s = it.especificacao_tecnica || it.specs || {};
          return (
            <div key={it.id} className="mb-2">
              <span className="font-semibold">{it.descricao}:</span> 
              {Object.keys(s).length > 0 
                ? <span className="text-green-600 ml-2">✅ JSONB Recebido (Kit: {s.grupo_kit || 'N/A'})</span>
                : <span className="text-red-500 ml-2">❌ JSONB Vazio ou não buscado do banco</span>}
            </div>
          );
        })}
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

      {/* ── Tabela de Investimento (Blocos Consolidados) ─────────────────────── */}
      {renderBlocks()}

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
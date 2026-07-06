import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { orcamentoService } from "@/services/orcamentoService";
import { supabase } from "@/lib/supabase";

export default function SolicitacaoPrintPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const proveedorId = searchParams.get("fornecedor");
  const showClient = searchParams.get("showClient") === "true";

  const [orcamento, setOrcamento] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [fornecedorDestino, setFornecedorDestino] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const buildSpecsString = (item: any) => {
    const s = item.especificacao_tecnica || item.specs || {};
    if (Object.keys(s).length === 0 || !s.capa) {
      return [
        item.formato ? `Formato: ${item.formato}` : (item.largura_mm ? `Formato: ${item.largura_mm}x${item.altura_mm}mm` : null),
        item.substrato ? `Substrato: ${item.substrato}` : null,
        item.acabamentos ? `Acabamentos: ${item.acabamentos}` : null
      ].filter(Boolean).join(" | ");
    }
    const lines = [];
    
    // --- Bloco Capa ---
    if (s.capa) {
      const capaParts = [];
      const capaLargura = s.formato_largura || item.largura_mm || '';
      const capaAltura = s.formato_altura || item.altura_mm || '';
      
      let formatoStr = '';
      if (capaLargura && capaAltura) {
        formatoStr = `Formato Fechado: ${capaLargura} x ${capaAltura} mm`;
      }
      if (s.capa.tem_orelha) {
        const oEsq = s.capa.orelha_esquerda || '0';
        const oDir = s.capa.orelha_direita || '0';
        formatoStr += ` + Orelhas (Esq: ${oEsq}mm / Dir: ${oDir}mm)`;
      }
      if (formatoStr) capaParts.push(formatoStr);
      
      let c = `Papel: ${s.capa.papel} ${s.capa.gramatura}`;
      capaParts.push(c);
      
      const coresCapa = s.capa.cores || 's/ cor';
      const pantoneCapa = s.capa.usa_pantone && s.capa.pantone_cor ? ` + Pantone ${s.capa.pantone_cor}` : '';
      capaParts.push(`${coresCapa}${pantoneCapa}`);
      
      if (s.capa.capa_dura) {
        capaParts.push(`Capa Dura (${s.capa.espessura_papelao})`);
      }
      
      const acabsCapa = [s.capa.acabamento_1, s.capa.acabamento_2, s.capa.acabamento_3].filter((a: any) => a && a !== 'Nenhum');
      if (s.capa.acabamento_2 === 'Hotstamping' && s.capa.acab_2_cor) {
        const idx = acabsCapa.indexOf('Hotstamping');
        if (idx !== -1) acabsCapa[idx] = `Hotstamping ${s.capa.acab_2_cor} ${s.capa.acab_2_medida ? '('+s.capa.acab_2_medida+')' : ''}`.trim();
      }
      if (acabsCapa.length > 0) {
        capaParts.push(`[${acabsCapa.join(', ')}]`);
      }
      
      lines.push(`▶ CAPA: ${capaParts.join(' | ')}`);
    }

    // --- Bloco Miolos ---
    if (s.miolos && Array.isArray(s.miolos)) {
      s.miolos.forEach((m: any, idx: number) => {
        const mioloParts = [];
        
        const mLargura = m.formato_largura || '';
        const mAltura = m.formato_altura || '';
        if (mLargura && mAltura) {
          mioloParts.push(`Formato Fechado: ${mLargura} x ${mAltura} mm`);
        } else if (s.formato_largura && s.formato_altura) {
          mioloParts.push(`Formato Fechado: ${s.formato_largura} x ${s.formato_altura} mm`);
        } else if (item.largura_mm && item.altura_mm) {
          mioloParts.push(`Formato Fechado: ${item.largura_mm} x ${item.altura_mm} mm`);
        }
        
        const papelNome = m.papel === 'Papel especial' && m.papel_especial_nome ? m.papel_especial_nome : m.papel;
        mioloParts.push(`Papel: ${papelNome} ${m.gramatura}`);
        
        const coresMiolo = m.cores || 's/ cor';
        const pantoneMiolo = m.usa_pantone && m.pantone_cor ? ` + Pantone ${m.pantone_cor}` : '';
        mioloParts.push(`${coresMiolo}${pantoneMiolo}`);
        
        const acabsMiolo = [m.acabamento_1, m.acabamento_2].filter((a: any) => a && a !== 'Nenhum');
        if (m.acabamento_2 === 'Hotstamping' && m.acab_2_cor) {
          const idx = acabsMiolo.indexOf('Hotstamping');
          if (idx !== -1) acabsMiolo[idx] = `Hotstamping ${m.acab_2_cor} ${m.acab_2_medida ? '('+m.acab_2_medida+')' : ''}`.trim();
        }
        if (acabsMiolo.length > 0) {
          mioloParts.push(`[${acabsMiolo.join(', ')}]`);
        }
        
        lines.push(`▶ MIOLO ${idx + 1}: ${m.paginas || 0} pgs | ${mioloParts.join(' | ')}`);
      });
    }

    // --- Bloco Finalização ---
    const finalizacaoParts = [];
    if (s.regra_encadernacao) {
      let enc = `Encadernação: ${s.regra_encadernacao}`;
      if (s.regra_encadernacao === 'Espiral') enc += ` ${s.espiral_material || ''} (${s.espiral_cor || ''})`;
      if (s.regra_encadernacao === 'Wire-O' && s.wireo_cor) enc += ` (${s.wireo_cor})`;
      finalizacaoParts.push(enc.trim());
    }
    
    if (s.grupo_kit) {
      finalizacaoParts.push(`Grupo Kit: ${s.grupo_kit}`);
    }

    const embalagem = [];
    if (s.shrink_individual) embalagem.push('Shrink Individual');
    if (s.shrink_pacote) embalagem.push('Shrink Pacote');
    if (s.caixa_papelao) embalagem.push('Caixa de Papelão');
    if (s.entrega_pallet) embalagem.push('Pallet');
    
    if (embalagem.length > 0) {
      finalizacaoParts.push(`Embalagem: ${embalagem.join(', ')}`);
    }

    if (finalizacaoParts.length > 0) {
      lines.push(`▶ FINALIZAÇÃO: ${finalizacaoParts.join(' | ')}`);
    }

    return lines.join('\n');
  };

  useEffect(() => {
    async function load() {
      if (!id || !proveedorId) return;
      try {
        const result = await orcamentoService.getOrcamentoParaImpressao(id);
        setOrcamento(result.orcamento);
        setItens(result.itens);

        const { data: fornData } = await supabase.from('fornecedores').select('*').eq('id', proveedorId).single();
        setFornecedorDestino(fornData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, proveedorId]);

  if (loading) return <div className="p-8 text-center text-muted-foreground print:hidden">Gerando Solicitação de Cotação...</div>;
  if (!orcamento || !fornecedorDestino) return <div className="p-8 text-center">Erro ao processar dados.</div>;

  // MOTOR DE BLOCOS IGUAL À PROPOSTA (KITS / SKUS / ESPECIFICAÇÕES)
  const groupedBlocks: any[] = [];
  itens.forEach(it => {
    const s = it.especificacao_tecnica || it.specs || {};
    const isKit = !!s.grupo_kit;
    const isSku = s.tipo_variacao_opcoes === 'sku';
    const blockName = isKit ? s.grupo_kit : it.descricao;
    const specsStr = buildSpecsString(it);
    const blockId = isKit ? `KIT_${s.grupo_kit}` : (isSku ? `SKU_${it.id}` : `AVULSO_${it.descricao}_${specsStr}`);

    let block = groupedBlocks.find(b => b.blockId === blockId);
    if (!block) {
      block = { blockId, isKit, name: blockName, components: [], quantities: [] };
      groupedBlocks.push(block);
    }
    if (!block.components.find((c: any) => c.specsStr === specsStr)) {
      block.components.push({ descricao: it.descricao, specsStr, prazo: it.prazo_estimado });
    }
    if (!block.quantities.includes(it.quantidade)) {
      block.quantities.push(it.quantidade);
    }
  });

  return (
    <div className="bg-white text-black min-h-screen font-sans p-10 print:p-0 print:m-0 w-full max-w-4xl mx-auto relative">
      <div className="print:hidden absolute top-4 left-4 flex gap-2">
        <button onClick={() => navigate(`/orcamentos?id=${id}`)} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md shadow-sm">
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </button>
      </div>

      <div className="border-b-2 border-black pb-4 mb-6 pt-12 print:pt-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Solicitação de Orçamento</h1>
          <p className="text-sm font-medium mt-1 text-gray-600">Ref: ORC-{new Date(orcamento.created_at).getFullYear()}-{orcamento.numero}</p>
        </div>
        <div className="text-right text-sm">
          <p><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
          <p><strong>Remetente:</strong> AA Representação</p>
        </div>
      </div>

      <div className="p-4 border border-black rounded-lg mb-6 bg-gray-50">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Destinatário (Fornecedor)</h2>
        <p className="font-bold text-base uppercase">{fornecedorDestino.nome}</p>
        {showClient && orcamento.cliente?.nome && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <h3 className="text-[10px] font-bold uppercase text-gray-500 mb-0.5">Referência de Projeto</h3>
            <p className="text-xs font-bold uppercase text-gray-700">{orcamento.cliente.nome} {orcamento.titulo ? `| ${orcamento.titulo}` : ''}</p>
          </div>
        )}
      </div>

      <p className="text-sm font-medium mb-6 italic text-gray-700">Favor enviar proposta comercial com os melhores custos industriais para as seguintes especificações:</p>

      <div className="space-y-6">
        {groupedBlocks.map((block, index) => (
          <div key={block.blockId} className="border-2 border-black rounded-lg overflow-hidden page-break-inside-avoid">
            <div className="bg-gray-100 px-4 py-2 border-b-2 border-black">
              <h2 className="text-sm font-black uppercase text-gray-900 tracking-widest">
                {block.isKit ? `📦 COMPOSIÇÃO DE KIT: ${block.name}` : `${index + 1}. PRODUTO: ${block.name}`}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 border-b border-gray-200 pb-1">Ficha Técnica Requisitada</h3>
                <ul className="space-y-3">
                  {block.components.map((comp: any, i: number) => (
                    <li key={i} className="text-xs text-gray-800 leading-relaxed">
                      {block.isKit && <span className="font-bold block text-gray-900 uppercase mb-0.5">{comp.descricao}</span>}
                      <span className="whitespace-pre-line">{comp.specsStr}</span>
                      {comp.prazo && <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">Prazo Estimado: {comp.prazo}</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Grade de Tiragens para Cotação</h3>
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-300 text-gray-600 text-[11px] uppercase text-left">
                      <th className="py-2 px-4 font-bold">Quantidade Solicitada</th>
                      <th className="py-2 px-4 font-bold border-l border-gray-300 w-40 text-right">Custo Unitário (R$)</th>
                      <th className="py-2 px-4 font-bold border-l border-gray-300 w-40 text-right">Custo Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.quantities.sort((a: any, b: any) => a - b).map((q: any, i: number) => (
                      <tr key={i} className="border-b border-gray-200 last:border-0 h-10">
                        <td className="py-2 px-4 font-bold text-gray-800">{q.toLocaleString('pt-BR')} unidades</td>
                        <td className="py-2 px-4 border-l border-gray-200 bg-gray-50/20"></td>
                        <td className="py-2 px-4 border-l border-gray-200 bg-gray-50/20"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12 pt-4 border-t-2 border-black text-center text-xs text-gray-400">AA Representação • Gerado em {new Date().toLocaleDateString('pt-BR')}</div>
    </div>
  );
}

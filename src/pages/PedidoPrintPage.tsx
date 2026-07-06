import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { pedidoService } from "@/services/pedidoService";

const formatMoney = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  if (dateStr.includes('T00:00:00') || !dateStr.includes('T')) {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  }
  return new Date(dateStr).toLocaleDateString("pt-BR");
};

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
  if (s.formato_largura && s.formato_altura) {
    parts.push(`Formato Fechado: ${s.formato_largura} x ${s.formato_altura} mm`);
  }
  if (s.tipo_obra) parts.push(`Obra: ${s.tipo_obra}`);
  if (s.regra_encadernacao) {
    let enc = `Encadernação: ${s.regra_encadernacao}`;
    if (s.regra_encadernacao === 'Espiral') enc += ` ${s.espiral_material || ''} (${s.espiral_cor || ''})`;
    if (s.regra_encadernacao === 'Wire-O' && s.wireo_cor) enc += ` (${s.wireo_cor})`;
    parts.push(enc.trim());
  }
  if (s.capa) {
    let c = `Capa: ${s.capa.papel} ${s.capa.gramatura}`;
    c += ` (${s.capa.cores || 's/ cor'}${s.capa.usa_pantone && s.capa.pantone_cor ? ' + Pantone ' + s.capa.pantone_cor : ''})`;
    if (s.capa.capa_dura) c += ` - Capa Dura (${s.capa.espessura_papelao})`;
    const acabsCapa = [s.capa.acabamento_1, s.capa.acabamento_2, s.capa.acabamento_3].filter((a: any) => a && a !== 'Nenhum');
    if (acabsCapa.length > 0) c += ` [${acabsCapa.join(', ')}]`;
    if (s.capa.tem_orelha) {
      const oEsq = s.capa.orelha_esquerda || '0';
      const oDir = s.capa.orelha_direita || '0';
      c += ` + Orelhas (Esq: ${oEsq}mm / Dir: ${oDir}mm)`;
    }
    parts.push(c);
  }
  if (s.miolos && Array.isArray(s.miolos)) {
    s.miolos.forEach((m: any, idx: number) => {
      let mStr = `Miolo ${idx + 1}: ${m.paginas || 0} pgs - ${m.papel} ${m.gramatura}`;
      mStr += ` (${m.cores || 's/ cor'}${m.usa_pantone && m.pantone_cor ? ' + Pantone ' + m.pantone_cor : ''})`;
      const acabsMiolo = [m.acabamento_1, m.acabamento_2].filter((a: any) => a && a !== 'Nenhum');
      if (acabsMiolo.length > 0) mStr += ` [${acabsMiolo.join(', ')}]`;
      parts.push(mStr);
    });
  }
  return parts.join(" | ");
};

export default function PedidoPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [contato, setContato] = useState<any>(null);
  const [endereco, setEndereco] = useState<any>(null);
  const [fechamento, setFechamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const result = await pedidoService.getPedidoParaImpressao(id);
        setPedido(result.pedido);
        setItens(result.itens);
        setFechamento(result.fechamento);
        setContato(result.contato);
        setEndereco(result.endereco);

        // Dispara a impressão assim que tudo renderizar
        // setTimeout(() => {
        //   window.print();
        // }, 800);
      } catch (err) {
        console.error("Erro ao carregar dados para impressão", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    if (pedido?.numero) {
      const originalTitle = document.title;
      document.title = `Pedido ${pedido.numero}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [pedido?.numero]);

  if (loading || !pedido) {
    return (
      <div className="p-8 text-center text-muted-foreground print:hidden">
        Carregando documento...
      </div>
    );
  }

  const fornecedorNome =
    Array.from(new Set(itens.map((i) => i.fornecedor?.nome).filter(Boolean))).join(", ") ||
    "Não definido";

  // Fonte de verdade do frete: modalidade de frete.
  const totalItens = itens.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  const comissaoLfa = Number(fechamento?.receita_bruta_lfa) || 0;
  // Total = Itens. A Comissão LFA está embutida no preço dos itens e
  // é exibida apenas como linha informativa, sem ser somada novamente.
  const totalOrdem = totalItens;

  return (
    <div className="bg-white text-black min-h-screen font-sans p-8 print:p-0 print:m-0 w-full max-w-4xl mx-auto relative">
      {/* Botão Voltar — Escondido na impressão */}
      <button
        onClick={() => navigate(-1)}
        className="print:hidden absolute top-4 left-4 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Pedido
      </button>

      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Espelho de Produção
          </h1>
          <p className="text-sm font-medium mt-1">Pedido Nº {pedido.numero}</p>
        </div>
        <div className="text-right text-sm">
          <p>
            <strong>Emissão:</strong> {formatDate(pedido.data_emissao)}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span className="uppercase">{pedido.status}</span>
          </p>
        </div>
      </div>

      {/* ── Blocos de Info ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Bloco Cliente */}
        <div className="p-4 border border-black rounded-lg bg-gray-50/50 print:bg-transparent">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
            Dados do Cliente
          </h2>

          {/* Razão Social */}
          <p className="font-bold text-lg leading-tight">
            {pedido.cliente?.nome || pedido.cliente_nome || "—"}
          </p>

          {/* CNPJ e Inscrição Estadual */}
          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            {pedido.cliente?.documento && (
              <p>
                <span className="font-semibold">CNPJ/CPF:</span>{" "}
                {pedido.cliente.documento}
              </p>
            )}
            {pedido.cliente?.inscricao_estadual && (
              <p>
                <span className="font-semibold">Insc. Estadual:</span>{" "}
                {pedido.cliente.inscricao_estadual}
              </p>
            )}
          </div>

          {/* Contato responsável */}
          {contato && (
            <p className="text-sm mt-2 text-gray-700 font-medium">
              A/C:{" "}
              <span className="font-bold">{contato.nome}</span>
              {contato.cargo && (
                <span className="text-gray-500 font-normal"> ({contato.cargo})</span>
              )}
            </p>
          )}

          {/* Endereço de Entrega */}
          <div className="mt-4 pt-3 border-t border-gray-300">
            <h3 className="text-[10px] font-bold uppercase text-gray-500 mb-1">
              Endereço de Entrega
            </h3>
            {endereco ? (
              <p className="text-sm leading-snug">
                {endereco.logradouro}, {endereco.numero}
                {endereco.complemento && ` - ${endereco.complemento}`}
                <br />
                {endereco.bairro} — {endereco.cidade}/{endereco.uf}
                <br />
                CEP: {endereco.cep}
              </p>
            ) : (
              <p className="text-sm italic text-gray-400">
                Nenhum endereço de entrega selecionado.
              </p>
            )}
          </div>
        </div>

        {/* Bloco Fornecedor / Logística */}
        <div className="p-4 border border-black rounded-lg bg-gray-50/50 print:bg-transparent space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
              Fornecedor / Produção
            </h2>
            <p className="font-bold text-base">{fornecedorNome}</p>
          </div>

          <div className="pt-3 border-t border-gray-300">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Logística e Especificações
            </h2>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-600">Tipo de Prova:</span>
              <span className="font-semibold">
                {!pedido.tipo_prova || pedido.tipo_prova === "Nenhuma"
                  ? "Produção Direta - sem prova"
                  : pedido.tipo_prova}
              </span>

              <span className="text-gray-600">Modalidade Frete:</span>
              <span className="font-semibold">
                {pedido?.modalidade_frete?.nome || "Não informada"}
              </span>

              <span className="text-gray-600">Previsão Entrega:</span>
              <span className="font-semibold text-red-700 print:text-black">
                {formatDate(pedido.previsao_entrega)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabela de Itens ───────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
          Itens da Ordem
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2 text-left font-bold w-12">Item</th>
              <th className="py-2 text-left font-bold">Especificações Técnicas</th>
              <th className="py-2 text-center font-bold w-20">Qtd</th>
              <th className="py-2 text-right font-bold w-32">Val. Unitário</th>
              <th className="py-2 text-right font-bold w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              // Usa o identificador real do banco (numero serial), com fallback para ordem
              const itemId = item.numero ?? item.ordem;

              return (
                <tr
                  key={item.id}
                  className="border-b border-gray-300 last:border-black"
                >
                  <td className="py-3 text-left font-medium align-top">
                    #{itemId}
                  </td>
                  <td className="py-3 text-left pr-4 align-top">
                    <p className="font-bold text-base uppercase">
                      {item.descricao}
                    </p>

                    <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                      {buildSpecsString(item)}
                    </p>

                    {item.descricao_tecnica && (
                      <p className="text-[11px] text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-100 whitespace-pre-wrap italic">
                        {item.descricao_tecnica}
                      </p>
                    )}
                  </td>
                  <td className="py-3 text-center font-semibold align-top">
                    {item.quantidade}
                  </td>
                  <td className="py-3 text-right align-top">
                    {formatMoney(item.preco_unitario)}
                  </td>
                  <td className="py-3 text-right font-bold align-top">
                    {formatMoney(item.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Observações e Financeiro ─────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {pedido.observacoes_operacionais && (
            <div className="p-4 border border-dashed border-gray-400 bg-yellow-50/30 print:bg-transparent">
              <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">
                Observações Operacionais
              </h3>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {pedido.observacoes_operacionais}
              </p>
            </div>
          )}
        </div>

        {/* Fechamento — SEM impostos, apenas custos de produção */}
        <div className="col-span-1 border-l-2 border-black pl-6 flex flex-col justify-end">
          <div className="text-sm mb-4 space-y-3">
            {/* Condição de pagamento do fornecedor — vem da tabela pedidos */}
            <div>
              <span className="block text-[10px] text-gray-500 uppercase font-bold">
                Condição de Pagamento
              </span>
              <span className="font-semibold text-xs">
                {pedido?.condicao_fornecedor?.nome || "A Combinar"}
              </span>
            </div>

            <div>
              <span className="block text-[10px] text-gray-500 uppercase font-bold">Modalidade de Frete</span>
              <span className="font-semibold text-xs">{pedido?.modalidade_frete?.nome || "Não informada"}</span>
            </div>

            {/* Subtotal de itens (custo de produção) */}
            <div>
              <span className="block text-[10px] text-gray-500 uppercase font-bold">
                Custo de Produção
              </span>
              <span className="font-semibold text-xs">
                {formatMoney(totalItens)}
              </span>
            </div>

            {/* Comissão LFA */}
            <div>
              <span className="block text-[10px] text-gray-500 uppercase font-bold">
                Comissão AA (Bruta)
              </span>
              <span className="font-semibold text-xs">
                {formatMoney(comissaoLfa)}
              </span>
            </div>
          </div>

          {/* Total final: Itens. LFA informativa, não entra na conta. */}
          <div className="border-t-2 border-black pt-2 mt-2">
            <span className="block text-[10px] text-gray-500 uppercase font-bold">
              Total da NF (Itens)
            </span>
            <span className="text-2xl font-black">{formatMoney(totalOrdem)}</span>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-gray-400 print:block">
        Gerado pelo sistema AA Representação em{" "}
        {new Date().toLocaleString("pt-BR")}
      </div>
    </div>
  );
}

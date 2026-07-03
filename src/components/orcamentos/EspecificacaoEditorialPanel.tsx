import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EspecificacaoEditorialPanelProps {
  value: Record<string, any>;
  onChange: (newValue: Record<string, any>) => void;
  disabled?: boolean;
}

export function EspecificacaoEditorialPanel({ value, onChange, disabled }: EspecificacaoEditorialPanelProps) {
  const capa = value?.capa || {};
  const miolos = Array.isArray(value.miolos) && value.miolos.length > 0 ? value.miolos : [{}];

  const updateGeral = (field: string, val: any) => {
    onChange({ ...value, [field]: val });
  };

  const updateCapa = (field: string, val: any) => {
    onChange({ ...value, capa: { ...(value.capa || {}), [field]: val } });
  };

  const updateMiolo = (index: number, field: string, val: any) => {
    const newMiolos = [...miolos];
    newMiolos[index] = { ...newMiolos[index], [field]: val };
    onChange({ ...value, miolos: newMiolos });
  };

  const addMiolo = () => {
    if (miolos.length < 3) onChange({ ...value, miolos: [...miolos, {}] });
  };

  const removeMiolo = (index: number) => {
    const newMiolos = miolos.filter((_, i) => i !== index);
    onChange({ ...value, miolos: newMiolos });
  };

  const acabamentosDisponiveis3 = [
    "Nenhum",
    "Verniz UV Reserva (High gloss)",
    "Hotstamping",
    "Relevo",
    "High Print"
  ].filter(opt => opt === "Nenhum" || opt !== capa.acabamento2);

  return (
    <div className="mt-4 p-4 border rounded-md bg-muted/20 col-span-5">
      <div className="flex items-center gap-4 mb-4">
        <h3 className="text-sm font-bold text-foreground">Especificações Editoriais</h3>
        <Input 
          className="w-[200px] h-8" 
          placeholder="Tipo de Obra (Ex: Livro, Revista)" 
          value={value.tipo_obra || ""} 
          onChange={(e) => updateGeral("tipo_obra", e.target.value)} 
          disabled={disabled} 
        />
      </div>

      <Tabs defaultValue="capa" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none px-0 h-auto bg-transparent">
          <TabsTrigger
            value="capa"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none bg-transparent"
          >
            Capa
          </TabsTrigger>
          <TabsTrigger
            value="miolo"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none bg-transparent"
          >
            Miolos
          </TabsTrigger>
          <TabsTrigger
            value="logistica"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none bg-transparent"
          >
            Finalização e Logística
          </TabsTrigger>
        </TabsList>

        <TabsContent value="capa" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Papel e Capa Dura */}
            <div className="space-y-1.5 flex flex-col col-span-full md:col-span-1">
              <Label className="text-xs">Papel</Label>
              <div className="flex flex-wrap items-center gap-4">
                <Select disabled={disabled} value={capa.papel || "none"} onValueChange={(val) => updateCapa("papel", val === "none" ? "" : val)}>
                  <SelectTrigger className="h-8 bg-card text-sm w-[200px]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    <SelectItem value="Cartão Triplex C1S">Cartão Triplex C1S</SelectItem>
                    <SelectItem value="Cartão Triplex C2S">Cartão Triplex C2S</SelectItem>
                    <SelectItem value="Cartão SUPREMO">Cartão SUPREMO</SelectItem>
                    <SelectItem value="Couche Brilho">Couche Brilho</SelectItem>
                    <SelectItem value="Couche Fosco">Couche Fosco</SelectItem>
                    <SelectItem value="Offset">Offset</SelectItem>
                    <SelectItem value="Papel Especial">Papel Especial</SelectItem>
                  </SelectContent>
                </Select>
                {capa.papel === "Papel Especial" && (
                  <Input
                    disabled={disabled}
                    className="h-8 bg-card text-sm w-[200px]"
                    placeholder="Qual papel?"
                    value={capa.papel_especial || ""}
                    onChange={(e) => updateCapa("papel_especial", e.target.value)}
                  />
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="capa_dura"
                    disabled={disabled}
                    checked={!!capa.capa_dura}
                    onCheckedChange={(checked) => updateCapa("capa_dura", checked)}
                  />
                  <Label htmlFor="capa_dura" className="text-xs font-medium leading-none cursor-pointer">
                    Capa Dura?
                  </Label>
                </div>
                {capa.capa_dura && (
                  <Input
                    disabled={disabled}
                    className="h-8 bg-card text-sm w-[120px]"
                    placeholder="Espessura Papelão"
                    value={capa.espessura_papelao || ""}
                    onChange={(e) => updateCapa("espessura_papelao", e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Gramatura */}
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-xs">Gramatura</Label>
              <Select disabled={disabled} value={capa.gramatura || "none"} onValueChange={(val) => updateCapa("gramatura", val === "none" ? "" : val)}>
                <SelectTrigger className="h-8 bg-card text-sm w-[120px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  <SelectItem value="150g/m²">150g/m²</SelectItem>
                  <SelectItem value="170g/m²">170g/m²</SelectItem>
                  <SelectItem value="180g/m²">180g/m²</SelectItem>
                  <SelectItem value="240g/m²">240g/m²</SelectItem>
                  <SelectItem value="250g/m²">250g/m²</SelectItem>
                  <SelectItem value="300g/m²">300g/m²</SelectItem>
                  <SelectItem value="320g/m²">320g/m²</SelectItem>
                  <SelectItem value="350g/m²">350g/m²</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cores e Pantone */}
            <div className="space-y-1.5 flex flex-col col-span-full md:col-span-1">
              <Label className="text-xs">Cores e Pantone</Label>
              <div className="flex flex-wrap items-center gap-4">
                <Input
                  disabled={disabled}
                  className="h-8 bg-card text-sm w-16"
                  placeholder="Ex: 4x0"
                  value={capa.cores || ""}
                  onChange={(e) => updateCapa("cores", e.target.value)}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usa_pantone"
                    disabled={disabled}
                    checked={!!capa.usa_pantone}
                    onCheckedChange={(checked) => updateCapa("usa_pantone", checked)}
                  />
                  <Label htmlFor="usa_pantone" className="text-xs font-medium leading-none cursor-pointer">
                    Usa Pantone?
                  </Label>
                </div>
                {capa.usa_pantone && (
                  <Input
                    disabled={disabled}
                    className="h-8 bg-card text-sm w-[120px]"
                    placeholder="Ex: 185 C"
                    value={capa.pantone_cor || ""}
                    onChange={(e) => updateCapa("pantone_cor", e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Acabamentos 1 e 2 (Mesma linha) */}
            <div className="col-span-full flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Acabamento 1</Label>
                <Select disabled={disabled} value={capa.acabamento1 || "Nenhum"} onValueChange={(val) => updateCapa("acabamento1", val)}>
                  <SelectTrigger className="h-8 bg-card text-sm w-[250px]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nenhum">Nenhum</SelectItem>
                    <SelectItem value="Laminação BOPP Fosca">Laminação BOPP Fosca</SelectItem>
                    <SelectItem value="Laminação BOPP Brilho">Laminação BOPP Brilho</SelectItem>
                    <SelectItem value="Laminação BOPP Soft Touch">Laminação BOPP Soft Touch</SelectItem>
                    <SelectItem value="Laminação Holográfica">Laminação Holográfica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Acabamento 2</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Select disabled={disabled} value={capa.acabamento2 || "Nenhum"} onValueChange={(val) => updateCapa("acabamento2", val)}>
                    <SelectTrigger className="h-8 bg-card text-sm w-[250px]">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nenhum">Nenhum</SelectItem>
                      <SelectItem value="Verniz UV Reserva (High gloss)">Verniz UV Reserva (High gloss)</SelectItem>
                      <SelectItem value="Hotstamping">Hotstamping</SelectItem>
                      <SelectItem value="Relevo">Relevo</SelectItem>
                      <SelectItem value="High Print">High Print</SelectItem>
                    </SelectContent>
                  </Select>
                  {capa.acabamento2 === "Hotstamping" && (
                    <>
                      <Input
                        disabled={disabled}
                        className="h-8 bg-card text-sm w-[120px]"
                        placeholder="Cor"
                        value={capa.hotstamping2_cor || ""}
                        onChange={(e) => updateCapa("hotstamping2_cor", e.target.value)}
                      />
                      <Input
                        disabled={disabled}
                        className="h-8 bg-card text-sm w-[120px]"
                        placeholder="Medida (ex: 5x5cm)"
                        value={capa.hotstamping2_medida || ""}
                        onChange={(e) => updateCapa("hotstamping2_medida", e.target.value)}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Acabamento 3 */}
            <div className="space-y-1.5 col-span-full">
              <Label className="text-xs">Acabamento 3</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Select disabled={disabled} value={capa.acabamento3 || "Nenhum"} onValueChange={(val) => updateCapa("acabamento3", val)}>
                  <SelectTrigger className="h-8 bg-card text-sm w-[250px]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {acabamentosDisponiveis3.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {capa.acabamento3 === "Hotstamping" && (
                  <>
                    <Input
                      disabled={disabled}
                      className="h-8 bg-card text-sm w-[120px]"
                      placeholder="Cor"
                      value={capa.hotstamping3_cor || ""}
                      onChange={(e) => updateCapa("hotstamping3_cor", e.target.value)}
                    />
                    <Input
                      disabled={disabled}
                      className="h-8 bg-card text-sm w-[120px]"
                      placeholder="Medida (ex: 5x5cm)"
                      value={capa.hotstamping3_medida || ""}
                      onChange={(e) => updateCapa("hotstamping3_medida", e.target.value)}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Observações / Campo Extra */}
            <div className="space-y-1.5 col-span-full mt-2">
              <Label className="text-xs">Observações / Campo Extra</Label>
              <Textarea
                disabled={disabled}
                className="bg-card text-sm min-h-[60px]"
                value={capa.observacoes || ""}
                onChange={(e) => updateCapa("observacoes", e.target.value)}
              />
            </div>

          </div>
        </TabsContent>

        <TabsContent value="miolo" className="pt-4">
          <div className="space-y-4">
            {miolos.map((miolo: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 bg-muted/20">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-foreground">Caderno de Miolo {index + 1}</h4>
                  {miolos.length > 1 && !disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8"
                      onClick={() => removeMiolo(index)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Remover
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {/* Linha 1: Especificações Base */}
                  <div className="flex flex-wrap items-end gap-3">
                    {/* Páginas */}
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs">Páginas</Label>
                      <Input
                        type="number"
                        disabled={disabled}
                        className="h-8 bg-card text-sm w-[100px]"
                        value={miolo.paginas || ""}
                        onChange={(e) => updateMiolo(index, "paginas", e.target.value)}
                      />
                    </div>

                    {/* Papel */}
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs">Papel</Label>
                      <Select disabled={disabled} value={miolo.papel || "none"} onValueChange={(val) => updateMiolo(index, "papel", val === "none" ? "" : val)}>
                        <SelectTrigger className="h-8 bg-card text-sm w-[180px]">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione...</SelectItem>
                          <SelectItem value="Offset">Offset</SelectItem>
                          <SelectItem value="Offwhite">Offwhite</SelectItem>
                          <SelectItem value="Avory">Avory</SelectItem>
                          <SelectItem value="Avena">Avena</SelectItem>
                          <SelectItem value="Lux Cream">Lux Cream</SelectItem>
                          <SelectItem value="Polen Soft">Polen Soft</SelectItem>
                          <SelectItem value="Polen Natural">Polen Natural</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Gramatura */}
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs">Gramatura</Label>
                      <Select disabled={disabled} value={miolo.gramatura || "none"} onValueChange={(val) => updateMiolo(index, "gramatura", val === "none" ? "" : val)}>
                        <SelectTrigger className="h-8 bg-card text-sm w-[120px]">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione...</SelectItem>
                          <SelectItem value="56g/m²">56g/m²</SelectItem>
                          <SelectItem value="58g/m²">58g/m²</SelectItem>
                          <SelectItem value="63g/m²">63g/m²</SelectItem>
                          <SelectItem value="65g/m²">65g/m²</SelectItem>
                          <SelectItem value="70g/m²">70g/m²</SelectItem>
                          <SelectItem value="80g/m²">80g/m²</SelectItem>
                          <SelectItem value="90g/m²">90g/m²</SelectItem>
                          <SelectItem value="115g/m²">115g/m²</SelectItem>
                          <SelectItem value="150g/m²">150g/m²</SelectItem>
                          <SelectItem value="170g/m²">170g/m²</SelectItem>
                          <SelectItem value="180g/m²">180g/m²</SelectItem>
                          <SelectItem value="210g/m²">210g/m²</SelectItem>
                          <SelectItem value="240g/m²">240g/m²</SelectItem>
                          <SelectItem value="250g/m²">250g/m²</SelectItem>
                          <SelectItem value="300g/m²">300g/m²</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cores e Pantone */}
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs">Cores e Pantone</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          disabled={disabled}
                          className="h-8 bg-card text-sm w-16"
                          placeholder="Ex: 1x1"
                          value={miolo.cores || ""}
                          onChange={(e) => updateMiolo(index, "cores", e.target.value)}
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`usa_pantone_miolo_${index}`}
                            disabled={disabled}
                            checked={!!miolo.usa_pantone}
                            onCheckedChange={(checked) => updateMiolo(index, "usa_pantone", checked)}
                          />
                          <Label htmlFor={`usa_pantone_miolo_${index}`} className="text-xs font-medium leading-none cursor-pointer">
                            Pantone?
                          </Label>
                        </div>
                        {miolo.usa_pantone && (
                          <Input
                            disabled={disabled}
                            className="h-8 bg-card text-sm w-[120px]"
                            placeholder="Ex: 185 C"
                            value={miolo.pantone_cor || ""}
                            onChange={(e) => updateMiolo(index, "pantone_cor", e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linha 2: Acabamentos */}
                  <div className="flex flex-wrap items-end gap-3">
                    {/* Acabamento 1 */}
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs">Acabamento 1</Label>
                      <Select disabled={disabled} value={miolo.acabamento1 || "Nenhum"} onValueChange={(val) => updateMiolo(index, "acabamento1", val)}>
                        <SelectTrigger className="h-8 bg-card text-sm w-[200px]">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nenhum">Nenhum</SelectItem>
                          <SelectItem value="Verniz de máquina">Verniz de máquina</SelectItem>
                          <SelectItem value="Laminação BOPP Fosca">Laminação BOPP Fosca</SelectItem>
                          <SelectItem value="Laminação BOPP Brilho">Laminação BOPP Brilho</SelectItem>
                          <SelectItem value="Laminação BOPP Soft Touch">Laminação BOPP Soft Touch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Acabamento 2 */}
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs">Acabamento 2</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select disabled={disabled} value={miolo.acabamento2 || "Nenhum"} onValueChange={(val) => updateMiolo(index, "acabamento2", val)}>
                          <SelectTrigger className="h-8 bg-card text-sm w-[200px]">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Nenhum">Nenhum</SelectItem>
                            <SelectItem value="Verniz UV Reserva (High gloss)">Verniz UV Reserva (High gloss)</SelectItem>
                            <SelectItem value="Hotstamping">Hotstamping</SelectItem>
                            <SelectItem value="Relevo">Relevo</SelectItem>
                            <SelectItem value="High Print">High Print</SelectItem>
                          </SelectContent>
                        </Select>
                        {miolo.acabamento2 === "Hotstamping" && (
                          <>
                            <Input
                              disabled={disabled}
                              className="h-8 bg-card text-sm w-[120px]"
                              placeholder="Cor"
                              value={miolo.hotstamping_cor || ""}
                              onChange={(e) => updateMiolo(index, "hotstamping_cor", e.target.value)}
                            />
                            <Input
                              disabled={disabled}
                              className="h-8 bg-card text-sm w-[120px]"
                              placeholder="Medida (ex: 5x5cm)"
                              value={miolo.hotstamping_medida || ""}
                              onChange={(e) => updateMiolo(index, "hotstamping_medida", e.target.value)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linha 3: Observações */}
                  <div className="space-y-1.5 w-full">
                    <Label className="text-xs">Observações</Label>
                    <Textarea
                      disabled={disabled}
                      className="bg-card text-sm min-h-[40px]"
                      value={miolo.observacoes || ""}
                      onChange={(e) => updateMiolo(index, "observacoes", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {miolos.length < 3 && !disabled && (
              <Button onClick={addMiolo} variant="outline" className="w-full border-dashed text-muted-foreground hover:text-foreground">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Caderno de Miolo
              </Button>
            )}
          </div>
        </TabsContent>
        <TabsContent value="logistica" className="pt-4">
          <div className="flex flex-col gap-4">
            
            {/* Nova linha: Regra de Encadernação */}
            <div className="flex flex-wrap items-end gap-3 mb-2 pb-4 border-b">
              <div className="space-y-1.5 flex flex-col">
                <Label className="text-xs">Regra de Encadernação</Label>
                <Select disabled={disabled} value={value.regra_encadernacao || "none"} onValueChange={(val) => updateGeral("regra_encadernacao", val === "none" ? "" : val)}>
                  <SelectTrigger className="h-8 bg-card text-sm w-[250px]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    <SelectItem value="Encadernação Colada PUR">Encadernação Colada PUR</SelectItem>
                    <SelectItem value="Encadernação Costurada + colada">Encadernação Costurada + colada</SelectItem>
                    <SelectItem value="Espiral">Espiral</SelectItem>
                    <SelectItem value="Wire-O">Wire-O</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {value.regra_encadernacao === "Espiral" && (
                <>
                  <div className="space-y-1.5 flex flex-col">
                    <Label className="text-xs">Material</Label>
                    <Select disabled={disabled} value={value.espiral_material || "none"} onValueChange={(val) => updateGeral("espiral_material", val === "none" ? "" : val)}>
                      <SelectTrigger className="h-8 bg-card text-sm w-[120px]">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione...</SelectItem>
                        <SelectItem value="Plástico">Plástico</SelectItem>
                        <SelectItem value="Metalizado">Metalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 flex flex-col">
                    <Label className="text-xs">Cor da Garra</Label>
                    <Input
                      disabled={disabled}
                      className="h-8 bg-card text-sm w-[150px]"
                      placeholder="Cor da Garra"
                      value={value.espiral_cor || ""}
                      onChange={(e) => updateGeral("espiral_cor", e.target.value)}
                    />
                  </div>
                </>
              )}

              {value.regra_encadernacao === "Wire-O" && (
                <div className="space-y-1.5 flex flex-col">
                  <Label className="text-xs">Cor do Arame</Label>
                  <Input
                    disabled={disabled}
                    className="h-8 bg-card text-sm w-[150px]"
                    placeholder="Cor do Arame"
                    value={value.wireo_cor || ""}
                    onChange={(e) => updateGeral("wireo_cor", e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Bloco Manuseio */}
            <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
              <h4 className="text-sm font-bold text-foreground">Manuseio</h4>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="montagem_kit"
                  disabled={disabled}
                  checked={!!value.montagem_kit}
                  onCheckedChange={(checked) => updateGeral("montagem_kit", checked)}
                />
                <Label htmlFor="montagem_kit" className="text-xs font-medium leading-none cursor-pointer">
                  Montagem de kit com outros itens/elementos
                </Label>
              </div>
              <div className="space-y-1.5 w-full">
                <Label className="text-xs">Instruções de Manuseio</Label>
                <Textarea
                  disabled={disabled}
                  className="bg-card text-sm min-h-[60px]"
                  value={value.instrucoes_manuseio || ""}
                  onChange={(e) => updateGeral("instrucoes_manuseio", e.target.value)}
                />
              </div>
            </div>

            {/* Bloco Acondicionamento */}
            <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
              <h4 className="text-sm font-bold text-foreground">Acondicionamento e Logística</h4>
              
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shrink_individual"
                    disabled={disabled}
                    checked={!!value.shrink_individual}
                    onCheckedChange={(checked) => updateGeral("shrink_individual", checked)}
                  />
                  <Label htmlFor="shrink_individual" className="text-xs font-medium leading-none cursor-pointer">
                    Shrink individual
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="entrega_pallet"
                    disabled={disabled}
                    checked={!!value.entrega_pallet}
                    onCheckedChange={(checked) => updateGeral("entrega_pallet", checked)}
                  />
                  <Label htmlFor="entrega_pallet" className="text-xs font-medium leading-none cursor-pointer">
                    Entrega em pallet PBR
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="entrega_agendamento"
                    disabled={disabled}
                    checked={!!value.entrega_agendamento}
                    onCheckedChange={(checked) => updateGeral("entrega_agendamento", checked)}
                  />
                  <Label htmlFor="entrega_agendamento" className="text-xs font-medium leading-none cursor-pointer">
                    Entrega com agendamento
                  </Label>
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col">
                <Label className="text-xs">Regramento específico de encaixotamento</Label>
                <Input
                  disabled={disabled}
                  className="h-8 bg-card text-sm w-full md:w-[400px]"
                  placeholder="Ex: Caixas com 20 un"
                  value={value.regramento_encaixotamento || ""}
                  onChange={(e) => updateGeral("regramento_encaixotamento", e.target.value)}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

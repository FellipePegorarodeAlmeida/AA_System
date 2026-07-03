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

interface EspecificacaoEditorialPanelProps {
  value: Record<string, any>;
  onChange: (newValue: Record<string, any>) => void;
  disabled?: boolean;
}

export function EspecificacaoEditorialPanel({ value, onChange, disabled }: EspecificacaoEditorialPanelProps) {
  const capa = value?.capa || {};

  const updateCapa = (field: string, val: any) => {
    onChange({ ...value, capa: { ...(value.capa || {}), [field]: val } });
  };

  return (
    <div className="mt-4 p-4 border rounded-md bg-muted/20 col-span-5">
      <h3 className="text-sm font-semibold mb-3">Especificações Editoriais</h3>
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
            value="final"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none bg-transparent"
          >
            Acabamento Final e Logística
          </TabsTrigger>
        </TabsList>

        <TabsContent value="capa" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Papel */}
            <div className="space-y-1.5">
              <Label className="text-xs">Papel</Label>
              <Select disabled={disabled} value={capa.papel || "none"} onValueChange={(val) => updateCapa("papel", val === "none" ? "" : val)}>
                <SelectTrigger className="h-8 bg-card text-sm">
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
            </div>

            {/* Gramatura */}
            <div className="space-y-1.5">
              <Label className="text-xs">Gramatura</Label>
              <Select disabled={disabled} value={capa.gramatura || "none"} onValueChange={(val) => updateCapa("gramatura", val === "none" ? "" : val)}>
                <SelectTrigger className="h-8 bg-card text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  <SelectItem value="250g/m²">250g/m²</SelectItem>
                  <SelectItem value="300g/m²">300g/m²</SelectItem>
                  <SelectItem value="320g/m²">320g/m²</SelectItem>
                  <SelectItem value="350g/m²">350g/m²</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cores */}
            <div className="space-y-1.5">
              <Label className="text-xs">Cores</Label>
              <Input
                disabled={disabled}
                className="h-8 bg-card text-sm"
                placeholder="Ex: 4x0"
                value={capa.cores || ""}
                onChange={(e) => updateCapa("cores", e.target.value)}
              />
            </div>

            {/* Pantone (Checkbox + Input) */}
            <div className="space-y-1.5 flex flex-col justify-center">
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="usa_pantone"
                  disabled={disabled}
                  checked={!!capa.usa_pantone}
                  onCheckedChange={(checked) => updateCapa("usa_pantone", checked)}
                />
                <Label htmlFor="usa_pantone" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Usa Pantone?
                </Label>
              </div>
            </div>

            {capa.usa_pantone && (
              <div className="space-y-1.5">
                <Label className="text-xs">Cor Pantone</Label>
                <Input
                  disabled={disabled}
                  className="h-8 bg-card text-sm"
                  placeholder="Ex: 185 C"
                  value={capa.pantone_cor || ""}
                  onChange={(e) => updateCapa("pantone_cor", e.target.value)}
                />
              </div>
            )}
            {!capa.usa_pantone && <div className="hidden md:block"></div>}

            {/* Acabamento 1 */}
            <div className="space-y-1.5">
              <Label className="text-xs">Acabamento 1</Label>
              <Select disabled={disabled} value={capa.acabamento1 || "Nenhum"} onValueChange={(val) => updateCapa("acabamento1", val)}>
                <SelectTrigger className="h-8 bg-card text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nenhum">Nenhum</SelectItem>
                  <SelectItem value="Laminação BOPP Fosca">Laminação BOPP Fosca</SelectItem>
                  <SelectItem value="Laminação BOPP Brilho">Laminação BOPP Brilho</SelectItem>
                  <SelectItem value="Laminação BOPP Soft Touch">Laminação BOPP Soft Touch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Acabamento 2 */}
            <div className="space-y-1.5">
              <Label className="text-xs">Acabamento 2</Label>
              <Select disabled={disabled} value={capa.acabamento2 || "Nenhum"} onValueChange={(val) => updateCapa("acabamento2", val)}>
                <SelectTrigger className="h-8 bg-card text-sm">
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
            </div>
            
            {/* Acabamento 3 */}
            <div className="space-y-1.5">
              <Label className="text-xs">Acabamento 3</Label>
              <Select disabled={disabled} value={capa.acabamento3 || "Nenhum"} onValueChange={(val) => updateCapa("acabamento3", val)}>
                <SelectTrigger className="h-8 bg-card text-sm">
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
            </div>

            {/* Condicionais Hotstamping 2 */}
            {capa.acabamento2 === "Hotstamping" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cor (Hotstamping 2)</Label>
                  <Input
                    disabled={disabled}
                    className="h-8 bg-card text-sm"
                    value={capa.hotstamping2_cor || ""}
                    onChange={(e) => updateCapa("hotstamping2_cor", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Medida (ex: 5x5cm) (Hotstamping 2)</Label>
                  <Input
                    disabled={disabled}
                    className="h-8 bg-card text-sm"
                    value={capa.hotstamping2_medida || ""}
                    onChange={(e) => updateCapa("hotstamping2_medida", e.target.value)}
                  />
                </div>
                <div className="hidden md:block"></div>
              </>
            )}

            {/* Condicionais Hotstamping 3 */}
            {capa.acabamento3 === "Hotstamping" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cor (Hotstamping 3)</Label>
                  <Input
                    disabled={disabled}
                    className="h-8 bg-card text-sm"
                    value={capa.hotstamping3_cor || ""}
                    onChange={(e) => updateCapa("hotstamping3_cor", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Medida (ex: 5x5cm) (Hotstamping 3)</Label>
                  <Input
                    disabled={disabled}
                    className="h-8 bg-card text-sm"
                    value={capa.hotstamping3_medida || ""}
                    onChange={(e) => updateCapa("hotstamping3_medida", e.target.value)}
                  />
                </div>
                <div className="hidden md:block"></div>
              </>
            )}

            {/* Observações / Campo Extra */}
            <div className="space-y-1.5 col-span-1 md:col-span-3 mt-2">
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
          <p className="text-sm text-muted-foreground">Campos dos Miolos aqui</p>
        </TabsContent>
        <TabsContent value="final" className="pt-4">
          <p className="text-sm text-muted-foreground">Campos do Acabamento Final e Logística aqui</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

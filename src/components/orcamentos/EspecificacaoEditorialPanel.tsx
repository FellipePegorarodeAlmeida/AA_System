import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EspecificacaoEditorialPanelProps {
  value: Record<string, any>;
  onChange: (newValue: Record<string, any>) => void;
  disabled?: boolean;
}

export function EspecificacaoEditorialPanel({ value, onChange, disabled }: EspecificacaoEditorialPanelProps) {
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
          <p className="text-sm text-muted-foreground">Campos da Capa aqui</p>
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

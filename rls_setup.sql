-- 1. CORREÇÃO DA TABELA CLIENTES (Adicionar agente_id)
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS agente_id uuid REFERENCES public.agentes_comerciais(id);

-- 2. APLICAR RLS (Row Level Security) EM TODAS AS TABELAS
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- Habilita o RLS na tabela
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        
        -- Remove política antiga caso o script seja rodado mais de uma vez
        EXECUTE format('DROP POLICY IF EXISTS "Permitir acesso total a usuarios autenticados" ON public.%I;', t);
        
        -- Cria a política permitindo SELECT, INSERT, UPDATE, DELETE apenas para quem está logado (role: authenticated)
        EXECUTE format('
            CREATE POLICY "Permitir acesso total a usuarios autenticados" 
            ON public.%I 
            FOR ALL 
            TO authenticated 
            USING (true) 
            WITH CHECK (true);', t);
    END LOOP;
END;
$$;

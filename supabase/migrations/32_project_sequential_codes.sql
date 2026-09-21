-- ==============================================================================
-- ORGARQ: MIGRATION 32 - CÓDIGO INCREMENTAL ANUAL DE PROJETOS POR ESCRITÓRIO
-- Formato: {incremental}/{ano} por organização (ex: 1/2026, 2/2026)
-- Reset anual automático por escritório
-- Preservação do número incremental em caso de exclusão de projetos
-- ==============================================================================

-- 1. Tabela de contadores sequenciais de projetos por escritório e ano
CREATE TABLE IF NOT EXISTS public.organization_project_counters (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year INT NOT NULL,
  last_val INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (organization_id, year)
);

-- Habilitar RLS
ALTER TABLE public.organization_project_counters ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para contadores de projetos da organização
DROP POLICY IF EXISTS "Permitir acesso completo a contadores de projetos para membros da organizacao" ON public.organization_project_counters;
CREATE POLICY "Permitir acesso completo a contadores de projetos para membros da organizacao"
  ON public.organization_project_counters FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

GRANT ALL ON TABLE public.organization_project_counters TO authenticated, service_role;

-- 2. Garantir que a coluna code possa ser atribuída via trigger caso omitida no insert
ALTER TABLE public.projects ALTER COLUMN code DROP NOT NULL;

-- 3. Função e Trigger para atribuição automática do código incremental do projeto
CREATE OR REPLACE FUNCTION public.assign_project_code()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  proj_year INT;
  next_val INT;
BEGIN
  -- Se o código for nulo, vazio ou no formato legado (AAAA-MM-DD-...), gera o próximo incremental
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-' THEN
    IF NEW.organization_id IS NOT NULL THEN
      proj_year := EXTRACT(YEAR FROM COALESCE(NEW.created_at, timezone('utc'::text, now())))::INT;

      INSERT INTO public.organization_project_counters (organization_id, year, last_val, updated_at)
      VALUES (NEW.organization_id, proj_year, 1, timezone('utc'::text, now()))
      ON CONFLICT (organization_id, year)
      DO UPDATE SET 
        last_val = organization_project_counters.last_val + 1,
        updated_at = timezone('utc'::text, now())
      RETURNING last_val INTO next_val;

      NEW.code := next_val || '/' || proj_year;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_project_code ON public.projects;
CREATE TRIGGER trigger_assign_project_code
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_project_code();

-- 4. Backfill para projetos já criados no sistema (substitui códigos legados pela ordem de criação)
DO $$
DECLARE
  r RECORD;
  c INT;
BEGIN
  -- 4.1. Limpa contadores prévios
  DELETE FROM public.organization_project_counters;

  -- 4.2. Previne colisões temporárias na restrição UNIQUE(organization_id, code)
  UPDATE public.projects
  SET code = 'TMP_' || id::text;

  -- 4.3. Itera sobre os projetos existentes ordenados por escritório e data de criação
  FOR r IN (
    SELECT id, organization_id, created_at,
           EXTRACT(YEAR FROM COALESCE(created_at, timezone('utc'::text, now())))::INT AS proj_year
    FROM public.projects
    ORDER BY organization_id,
             EXTRACT(YEAR FROM COALESCE(created_at, timezone('utc'::text, now())))::INT ASC,
             created_at ASC,
             id ASC
  ) LOOP
    INSERT INTO public.organization_project_counters (organization_id, year, last_val, updated_at)
    VALUES (r.organization_id, r.proj_year, 1, timezone('utc'::text, now()))
    ON CONFLICT (organization_id, year)
    DO UPDATE SET 
      last_val = organization_project_counters.last_val + 1,
      updated_at = timezone('utc'::text, now())
    RETURNING last_val INTO c;

    UPDATE public.projects
    SET code = c || '/' || r.proj_year
    WHERE id = r.id;
  END LOOP;
END $$;

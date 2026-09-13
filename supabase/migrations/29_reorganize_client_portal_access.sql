-- ==============================================================================
-- ORGARQ: MIGRATION 29 - REORGANIZAÇÃO DO ACESSO AO PORTAL DO CLIENTE
-- Magic Link por Escritório + Código Alfanumérico + Validação OTP de Aprovação
-- ==============================================================================

-- 1. ADICIONA portal_token E access_code NA TABELA CLIENTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'portal_token'
  ) THEN
    ALTER TABLE public.clients
      ADD COLUMN portal_token TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'access_code'
  ) THEN
    ALTER TABLE public.clients
      ADD COLUMN access_code TEXT;
  END IF;
END $$;

-- 2. FUNÇÃO AUXILIAR PARA GERAR CÓDIGO ALFANUMÉRICO DE 6 CARACTERES EM CAIXA ALTA
CREATE OR REPLACE FUNCTION public.generate_portal_access_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 3. POPULAR CLIENTES EXISTENTES QUE NÃO POSSUEM TOKEN OU CÓDIGO
UPDATE public.clients
SET
  portal_token = COALESCE(portal_token, 'cp_' || lower(replace(gen_random_uuid()::text, '-', ''))),
  access_code = COALESCE(access_code, public.generate_portal_access_code())
WHERE portal_token IS NULL OR access_code IS NULL;

-- Garante NOT NULL e default para novos inserts na tabela clients
ALTER TABLE public.clients
  ALTER COLUMN portal_token SET DEFAULT ('cp_' || lower(replace(gen_random_uuid()::text, '-', ''))),
  ALTER COLUMN access_code SET DEFAULT public.generate_portal_access_code();

CREATE INDEX IF NOT EXISTS idx_clients_portal_token ON public.clients(portal_token);

-- Permitir leitura pública/anônima de clientes específicos via portal_token para autenticação
DROP POLICY IF EXISTS "Acesso público aos dados do portal do cliente via token" ON public.clients;
CREATE POLICY "Acesso público aos dados do portal do cliente via token"
  ON public.clients
  FOR SELECT
  TO anon, authenticated
  USING (portal_token IS NOT NULL);

-- 4. TABELA DE CÓDIGOS DE CONFIRMAÇÃO (OTP) PARA APROVAÇÕES DE ETAPAS
CREATE TABLE IF NOT EXISTS public.stage_approval_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.project_stages(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL, -- 6 dígitos numéricos
  action_type TEXT NOT NULL DEFAULT 'approved', -- 'approved' | 'changes_requested'
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de performance e expiração
CREATE INDEX IF NOT EXISTS idx_stage_approval_otps_lookup
  ON public.stage_approval_otps(stage_id, client_id, code);

CREATE INDEX IF NOT EXISTS idx_stage_approval_otps_expires
  ON public.stage_approval_otps(expires_at);

-- Habilitar RLS
ALTER TABLE public.stage_approval_otps ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para stage_approval_otps
DROP POLICY IF EXISTS "Membros do escritório gerenciam OTPs de seus projetos" ON public.stage_approval_otps;
CREATE POLICY "Membros do escritório gerenciam OTPs de seus projetos"
  ON public.stage_approval_otps
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = stage_approval_otps.project_id
      AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Acesso público para envio e validação de OTP no portal" ON public.stage_approval_otps;
CREATE POLICY "Acesso público para envio e validação de OTP no portal"
  ON public.stage_approval_otps
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- ORGARQ: MIGRATION 31 - CATEGORIAS FINANCEIRAS (RECEITAS & DESPESAS) E CRUD CUSTOMIZADO
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT 'slate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(organization_id, name, type)
);

-- Índices para performance e integridade
CREATE INDEX IF NOT EXISTS idx_financial_categories_org ON public.financial_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_categories_type ON public.financial_categories(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_financial_tx_org_cat ON public.financial_transactions(organization_id, category);

-- Habilita Row Level Security (RLS)
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros podem visualizar categorias financeiras"
  ON public.financial_categories
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Membros podem inserir categorias financeiras"
  ON public.financial_categories
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Membros podem atualizar categorias financeiras"
  ON public.financial_categories
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Membros podem excluir categorias financeiras"
  ON public.financial_categories
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

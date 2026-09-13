-- ==============================================================================
-- MIGRATION 27: PERFIS DE ACESSO, PERMISSÕES CUSTOMIZADAS E CONVITES
-- ==============================================================================

-- 1. TABELA DE PERFIS DE ACESSO
CREATE TABLE IF NOT EXISTS public.access_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#2563EB',
  is_owner_profile BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(organization_id, name)
);

CREATE TRIGGER set_access_profiles_updated_at
  BEFORE UPDATE ON public.access_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. ADICIONA profile_id NA TABELA organization_members
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.access_profiles(id) ON DELETE SET NULL;

-- 3. TABELA DE CONVITES DA ORGANIZAÇÃO
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  profile_id UUID REFERENCES public.access_profiles(id) ON DELETE SET NULL,
  invite_code TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'revoked', 'expired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invites(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_org_invites_code ON public.organization_invites(invite_code);

-- 4. FUNÇÃO PARA INICIALIZAR PERFIS PADRÃO DE UMA ORGANIZAÇÃO
CREATE OR REPLACE FUNCTION public.initialize_default_organization_profiles(target_org_id UUID)
RETURNS UUID AS $$
DECLARE
  owner_profile_id UUID;
  admin_profile_id UUID;
  collab_profile_id UUID;
  intern_profile_id UUID;
  all_permissions JSONB := '{
    "module_dashboard": true,
    "module_clients": true,
    "clients_create_edit": true,
    "clients_delete": true,
    "clients_portal": true,
    "module_projects": true,
    "projects_create": true,
    "projects_edit": true,
    "projects_delete": true,
    "tasks_manage": true,
    "module_companies": true,
    "companies_manage": true,
    "module_financial": true,
    "financial_view_sensitive": true,
    "financial_create_edit": true,
    "financial_delete": true,
    "settings_stages": true,
    "settings_office": true,
    "settings_team": true,
    "settings_profiles": true
  }'::jsonb;
  admin_permissions JSONB := '{
    "module_dashboard": true,
    "module_clients": true,
    "clients_create_edit": true,
    "clients_delete": true,
    "clients_portal": true,
    "module_projects": true,
    "projects_create": true,
    "projects_edit": true,
    "projects_delete": true,
    "tasks_manage": true,
    "module_companies": true,
    "companies_manage": true,
    "module_financial": true,
    "financial_view_sensitive": true,
    "financial_create_edit": true,
    "financial_delete": true,
    "settings_stages": true,
    "settings_office": true,
    "settings_team": true,
    "settings_profiles": true
  }'::jsonb;
  collab_permissions JSONB := '{
    "module_dashboard": true,
    "module_clients": true,
    "clients_create_edit": true,
    "clients_delete": false,
    "clients_portal": false,
    "module_projects": true,
    "projects_create": true,
    "projects_edit": true,
    "projects_delete": false,
    "tasks_manage": true,
    "module_companies": true,
    "companies_manage": false,
    "module_financial": false,
    "financial_view_sensitive": false,
    "financial_create_edit": false,
    "financial_delete": false,
    "settings_stages": false,
    "settings_office": false,
    "settings_team": false,
    "settings_profiles": false
  }'::jsonb;
  intern_permissions JSONB := '{
    "module_dashboard": true,
    "module_clients": true,
    "clients_create_edit": false,
    "clients_delete": false,
    "clients_portal": false,
    "module_projects": true,
    "projects_create": false,
    "projects_edit": false,
    "projects_delete": false,
    "tasks_manage": true,
    "module_companies": true,
    "companies_manage": false,
    "module_financial": false,
    "financial_view_sensitive": false,
    "financial_create_edit": false,
    "financial_delete": false,
    "settings_stages": false,
    "settings_office": false,
    "settings_team": false,
    "settings_profiles": false
  }'::jsonb;
BEGIN
  -- 1. Perfil Proprietário (Sempre Total e Imutável)
  INSERT INTO public.access_profiles (
    organization_id, name, description, color, is_owner_profile, is_system, permissions
  ) VALUES (
    target_org_id,
    'Proprietário',
    'Acesso total e irrestrito a todas as funcionalidades do escritório.',
    '#4F46E5', -- Indigo
    true,
    true,
    all_permissions
  )
  ON CONFLICT (organization_id, name) DO UPDATE
  SET is_owner_profile = true, is_system = true, permissions = all_permissions
  RETURNING id INTO owner_profile_id;

  -- 2. Perfil Administrador
  INSERT INTO public.access_profiles (
    organization_id, name, description, color, is_owner_profile, is_system, permissions
  ) VALUES (
    target_org_id,
    'Administrador',
    'Gestão completa de projetos, clientes, financeiro e equipe.',
    '#0284C7', -- Sky
    false,
    true,
    admin_permissions
  )
  ON CONFLICT (organization_id, name) DO NOTHING
  RETURNING id INTO admin_profile_id;

  -- 3. Perfil Colaborador
  INSERT INTO public.access_profiles (
    organization_id, name, description, color, is_owner_profile, is_system, permissions
  ) VALUES (
    target_org_id,
    'Colaborador',
    'Acesso à produção de projetos, tarefas e consulta de clientes e fornecedores.',
    '#10B981', -- Emerald
    false,
    true,
    collab_permissions
  )
  ON CONFLICT (organization_id, name) DO NOTHING
  RETURNING id INTO collab_profile_id;

  -- 4. Perfil Estagiário
  INSERT INTO public.access_profiles (
    organization_id, name, description, color, is_owner_profile, is_system, permissions
  ) VALUES (
    target_org_id,
    'Estagiário',
    'Acesso focado em execução de tarefas atribuídas e visualização de projetos.',
    '#F59E0B', -- Amber
    false,
    true,
    intern_permissions
  )
  ON CONFLICT (organization_id, name) DO NOTHING
  RETURNING id INTO intern_profile_id;

  RETURN owner_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER PARA INICIALIZAR PERFIS QUANDO UMA ORGANIZAÇÃO FOR CRIADA
CREATE OR REPLACE FUNCTION public.handle_new_organization_profiles()
RETURNS TRIGGER AS $$
DECLARE
  owner_prof_id UUID;
BEGIN
  owner_prof_id := public.initialize_default_organization_profiles(NEW.id);
  
  -- Garante que o criador (owner_id) esteja registrado como membro com o perfil Proprietário
  INSERT INTO public.organization_members (
    organization_id, user_id, role, profile_id
  ) VALUES (
    NEW.id, NEW.owner_id, 'owner', owner_prof_id
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = 'owner', profile_id = owner_prof_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_new_organization_profiles ON public.organizations;
CREATE TRIGGER trigger_new_organization_profiles
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization_profiles();

-- 6. HABILITA RLS
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para access_profiles
DROP POLICY IF EXISTS "Perfis visíveis para membros da organização" ON public.access_profiles;
CREATE POLICY "Perfis visíveis para membros da organização"
  ON public.access_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = (SELECT auth.uid())
      UNION
      SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Gerenciamento de perfis por membros autorizados" ON public.access_profiles;
CREATE POLICY "Gerenciamento de perfis por membros autorizados"
  ON public.access_profiles FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = (SELECT auth.uid())
      UNION
      SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = (SELECT auth.uid())
      UNION
      SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Políticas de RLS para organization_invites
DROP POLICY IF EXISTS "Convites visíveis para membros ou convidado" ON public.organization_invites;
CREATE POLICY "Convites visíveis para membros ou convidado"
  ON public.organization_invites FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = (SELECT auth.uid())
      UNION
      SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid())
    )
    OR LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = (SELECT auth.uid())))
  );

DROP POLICY IF EXISTS "Gerenciamento de convites por membros" ON public.organization_invites;
CREATE POLICY "Gerenciamento de convites por membros"
  ON public.organization_invites FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = (SELECT auth.uid())
      UNION
      SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = (SELECT auth.uid())
      UNION
      SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid())
    )
  );

-- 7. MIGRAÇÃO E BACKFILL DE DADOS EXISTENTES
DO $$
DECLARE
  org RECORD;
  owner_prof_id UUID;
BEGIN
  FOR org IN SELECT id, owner_id FROM public.organizations LOOP
    owner_prof_id := public.initialize_default_organization_profiles(org.id);

    -- Atualiza o owner na tabela de membros com o profile_id de Proprietário
    INSERT INTO public.organization_members (organization_id, user_id, role, profile_id)
    VALUES (org.id, org.owner_id, 'owner', owner_prof_id)
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET profile_id = owner_prof_id;

    -- Associa membros existentes com base no role legado
    UPDATE public.organization_members m
    SET profile_id = p.id
    FROM public.access_profiles p
    WHERE m.organization_id = org.id
      AND p.organization_id = org.id
      AND m.profile_id IS NULL
      AND (
        (m.role = 'owner' AND p.name = 'Proprietário') OR
        (m.role = 'admin' AND p.name = 'Administrador') OR
        (m.role = 'architect' AND p.name = 'Colaborador') OR
        (m.role = 'intern' AND p.name = 'Estagiário')
      );
  END LOOP;
END $$;

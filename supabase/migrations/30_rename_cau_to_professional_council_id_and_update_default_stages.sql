-- Migration 30: Rename cau_caubr and cau to professional_council_id & Update Default Stages
-- 1. Renomeia cau_caubr para professional_council_id na tabela organizations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'cau_caubr'
  ) THEN
    ALTER TABLE public.organizations RENAME COLUMN cau_caubr TO professional_council_id;
  END IF;
END $$;

-- 2. Renomeia cau para professional_council_id na tabela user_profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_profiles' 
      AND column_name = 'cau'
  ) THEN
    ALTER TABLE public.user_profiles RENAME COLUMN cau TO professional_council_id;
  END IF;
END $$;

-- 3. Atualiza a função que cria as etapas padrão do sistema para novas organizações
CREATE OR REPLACE FUNCTION public.handle_new_organization_template()
RETURNS TRIGGER AS $$
DECLARE
  new_template_id UUID;
BEGIN
  -- Cria o template padrão
  INSERT INTO public.stage_templates (organization_id, name, description, is_default)
  VALUES (NEW.id, 'Padrão do Sistema', 'Template padrão com as 7 etapas oficiais de projeto', true)
  RETURNING id INTO new_template_id;

  -- Insere as 7 etapas padrão com prazos e aprovações solicitados
  INSERT INTO public.stage_template_items (stage_template_id, name, description, stage_order, default_duration_days, is_client_approval_required)
  VALUES
    (new_template_id, 'Contrato', 'Formalização da proposta e assinatura de contrato', 1, NULL, true),
    (new_template_id, 'Briefing', 'Levantamento de necessidades, requisitos e alinhamento inicial', 2, NULL, false),
    (new_template_id, 'Estudo Preliminar', 'Concepção inicial, layout e alinhamento conceitual', 3, 10, true),
    (new_template_id, 'Projeto 3D', 'Modelagem visual e apresentações para aprovação', 4, 10, true),
    (new_template_id, 'Projeto Executivo', 'Desenvolvimento técnico e detalhamento executivo', 5, 15, true),
    (new_template_id, 'Entrega Final', 'Entrega do pacote consolidado e documentação final', 6, NULL, true),
    (new_template_id, 'Suporte', 'Acompanhamento pós-entrega e atendimento a dúvidas', 7, NULL, false);

  -- Adiciona o owner como membro 'owner' da organização
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

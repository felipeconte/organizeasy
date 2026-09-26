-- Migration 34: Adiciona suporte a contagem de dias úteis e dias corridos para tarefas e templates
-- Padrão obrigatório: 'corridos'

-- 1. Coluna duration_type na tabela project_stages (tarefas ativas nos projetos)
ALTER TABLE public.project_stages 
ADD COLUMN IF NOT EXISTS duration_type VARCHAR(20) NOT NULL DEFAULT 'corridos';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_stages_duration_type_check'
  ) THEN
    ALTER TABLE public.project_stages
    ADD CONSTRAINT project_stages_duration_type_check 
    CHECK (duration_type IN ('corridos', 'uteis'));
  END IF;
END $$;

-- 2. Coluna default_duration_type na tabela stage_template_items (modelos de etapas do escritório)
ALTER TABLE public.stage_template_items 
ADD COLUMN IF NOT EXISTS default_duration_type VARCHAR(20) NOT NULL DEFAULT 'corridos';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stage_template_items_default_duration_type_check'
  ) THEN
    ALTER TABLE public.stage_template_items
    ADD CONSTRAINT stage_template_items_default_duration_type_check 
    CHECK (default_duration_type IN ('corridos', 'uteis'));
  END IF;
END $$;

-- 3. Coluna default_duration_type na tabela organizations (preferência padrão global do escritório)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS default_duration_type VARCHAR(20) NOT NULL DEFAULT 'corridos';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_default_duration_type_check'
  ) THEN
    ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_default_duration_type_check 
    CHECK (default_duration_type IN ('corridos', 'uteis'));
  END IF;
END $$;

COMMENT ON COLUMN public.project_stages.duration_type IS 'Define se a duração é calculada em dias corridos ou dias úteis (descontando fins de semana e feriados nacionais)';
COMMENT ON COLUMN public.stage_template_items.default_duration_type IS 'Tipo de duração sugerida padrão no modelo: corridos ou uteis';
COMMENT ON COLUMN public.organizations.default_duration_type IS 'Padrão da organização para novas tarefas e modelos: corridos ou uteis';

-- 4. Atualiza a função trigger que gera etapas padrão para incluir o duration_type
CREATE OR REPLACE FUNCTION public.generate_default_project_stages()
RETURNS TRIGGER AS $$
DECLARE
  tpl_id UUID;
  item RECORD;
  calc_due_date DATE;
  current_date_cursor DATE;
BEGIN
  -- Cria a ficha de briefing inicial vazia
  INSERT INTO public.project_briefings (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;

  -- Gera o primeiro token do portal do cliente
  INSERT INTO public.client_access_tokens (project_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  -- Se o projeto foi configurado para NÃO usar template (em branco), encerra sem criar etapas
  IF NEW.skip_default_stages = true THEN
    RETURN NEW;
  END IF;

  -- Se foi especificado um template específico, usa ele
  IF NEW.stage_template_id IS NOT NULL THEN
    tpl_id := NEW.stage_template_id;
  ELSE
    -- Busca o template padrão da organização
    SELECT id INTO tpl_id
    FROM public.stage_templates
    WHERE organization_id = NEW.organization_id AND is_default = true
    LIMIT 1;

    -- Se não achar default, pega o primeiro template disponível da organização
    IF tpl_id IS NULL THEN
      SELECT id INTO tpl_id
      FROM public.stage_templates
      WHERE organization_id = NEW.organization_id
      LIMIT 1;
    END IF;
  END IF;

  current_date_cursor := COALESCE(NEW.start_date, CURRENT_DATE);

  -- Clona os itens do template para as tarefas/etapas do projeto
  IF tpl_id IS NOT NULL THEN
    FOR item IN
      SELECT * FROM public.stage_template_items
      WHERE stage_template_id = tpl_id
      ORDER BY stage_order ASC
    LOOP
      IF item.default_duration_days IS NOT NULL AND item.default_duration_days > 0 THEN
        calc_due_date := current_date_cursor + (item.default_duration_days || ' days')::INTERVAL;
      ELSE
        calc_due_date := NULL;
      END IF;

      INSERT INTO public.project_stages (
        project_id,
        name,
        description,
        stage_order,
        is_client_approval_required,
        start_date,
        due_date,
        duration_type,
        status,
        progress_percent,
        is_locked_for_client,
        checklist,
        comments,
        attachments
      )
      VALUES (
        NEW.id,
        item.name,
        item.description,
        item.stage_order,
        item.is_client_approval_required,
        current_date_cursor,
        calc_due_date,
        COALESCE(item.default_duration_type, 'corridos'),
        'a_iniciar',
        0,
        false,
        COALESCE(item.checklist, '[]'::jsonb),
        '[]'::jsonb,
        '[]'::jsonb
      );

      IF item.default_duration_days IS NOT NULL AND item.default_duration_days > 0 THEN
        current_date_cursor := calc_due_date + interval '1 day';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


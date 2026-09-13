-- Migration 28: Renomeia o valor 'architect' do enum user_role para 'collaborator'
-- Garantindo que os 4 roles padrões do sistema sejam: Proprietário, Administrador, Colaborador, Estagiário

DO $$
BEGIN
  -- 1. Remove temporariamente o valor default
  ALTER TABLE organization_members ALTER COLUMN role DROP DEFAULT;

  -- 2. Renomeia o valor do enum
  ALTER TYPE user_role RENAME VALUE 'architect' TO 'collaborator';

  -- 3. Restaura o default como 'collaborator'
  ALTER TABLE organization_members ALTER COLUMN role SET DEFAULT 'collaborator'::user_role;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback caso o enum já tenha sido renomeado
    NULL;
END $$;

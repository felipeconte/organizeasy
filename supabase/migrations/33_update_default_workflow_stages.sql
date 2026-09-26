-- ==============================================================================
-- ORGANIZEASY: MIGRATION 33 - ATUALIZAÇÃO DAS ETAPAS PADRÃO DO WORKFLOW KANBAN
-- 8 Etapas Padrão:
-- 1. A Iniciar (slate)
-- 2. Em Andamento (blue)
-- 3. Em Revisão (indigo)
-- 4. Em Aprovação (amber) [Validação do Cliente: true]
-- 5. Pendência (rose) [Revisão / Ajustes: true]
-- 6. Aprovado (emerald) [Etapa Aprovada: true]
-- 7. Finalizado (cyan) [Etapa Conclusiva / Final: true]
-- 8. Cancelado (slate)
-- ==============================================================================

-- 1. Comentário descritivo na coluna workflow_stages
COMMENT ON COLUMN public.organizations.workflow_stages IS 'Lista JSONB das etapas do fluxo Kanban do escritório. Quando nulo, o sistema adota as 8 etapas oficiais padrão.';

-- 2. Atualiza organizações que utilizavam o template legado de 4 etapas exatas para o novo padrão de 8 etapas
UPDATE public.organizations
SET workflow_stages = '[
  {"id": "a_iniciar", "name": "A Iniciar", "color": "slate", "order_index": 0, "is_system": true, "is_client_approval_stage": false, "is_revision_stage": false, "is_approved_stage": false, "is_final_stage": false},
  {"id": "em_andamento", "name": "Em Andamento", "color": "blue", "order_index": 1, "is_system": true, "is_client_approval_stage": false, "is_revision_stage": false, "is_approved_stage": false, "is_final_stage": false},
  {"id": "em_revisao", "name": "Em Revisão", "color": "indigo", "order_index": 2, "is_system": true, "is_client_approval_stage": false, "is_revision_stage": false, "is_approved_stage": false, "is_final_stage": false},
  {"id": "em_aprovacao", "name": "Em Aprovação", "color": "amber", "order_index": 3, "is_system": true, "is_client_approval_stage": true, "is_revision_stage": false, "is_approved_stage": false, "is_final_stage": false},
  {"id": "pendencia", "name": "Pendência", "color": "rose", "order_index": 4, "is_system": true, "is_client_approval_stage": false, "is_revision_stage": true, "is_approved_stage": false, "is_final_stage": false},
  {"id": "aprovado", "name": "Aprovado", "color": "emerald", "order_index": 5, "is_system": true, "is_client_approval_stage": false, "is_revision_stage": false, "is_approved_stage": true, "is_final_stage": false},
  {"id": "finalizado", "name": "Finalizado", "color": "cyan", "order_index": 6, "is_system": true, "is_client_approval_stage": false, "is_revision_stage": false, "is_approved_stage": false, "is_final_stage": true},
  {"id": "cancelado", "name": "Cancelado", "color": "slate", "order_index": 7, "is_system": true, "is_client_approval_stage": false, "is_revision_stage": false, "is_approved_stage": false, "is_final_stage": false}
]'::jsonb
WHERE workflow_stages IS NOT NULL
  AND jsonb_array_length(workflow_stages) = 4
  AND workflow_stages->0->>'id' = 'a_iniciar'
  AND workflow_stages->1->>'id' = 'em_producao'
  AND workflow_stages->2->>'id' = 'em_aprovacao'
  AND workflow_stages->3->>'id' = 'concluido';

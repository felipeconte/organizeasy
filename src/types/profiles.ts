export type PermissionKey =
  // Visão Geral
  | 'module_dashboard'
  // Clientes
  | 'module_clients'
  | 'clients_create_edit'
  | 'clients_delete'
  | 'clients_portal'
  // Projetos
  | 'module_projects'
  | 'projects_create'
  | 'projects_edit'
  | 'projects_delete'
  | 'tasks_manage'
  // Empresas e Fornecedores
  | 'module_companies'
  | 'companies_manage'
  // Financeiro
  | 'module_financial'
  | 'financial_view_sensitive'
  | 'financial_create_edit'
  | 'financial_delete'
  // Configurações
  | 'settings_stages'
  | 'settings_office'
  | 'settings_team'
  | 'settings_profiles'

export type ProfilePermissions = Record<PermissionKey, boolean>

export interface PermissionDefinition {
  key: PermissionKey
  label: string
  description: string
  isModuleAccess?: boolean // Se é o toggle mestre do módulo
}

export interface PermissionCategory {
  id: string
  name: string
  description: string
  iconName: string
  permissions: PermissionDefinition[]
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'dashboard',
    name: 'Visão Geral',
    description: 'Dashboard principal do escritório e métricas consolidadas',
    iconName: 'LayoutDashboard',
    permissions: [
      {
        key: 'module_dashboard',
        label: 'Acesso à Visão Geral',
        description: 'Permite acessar a página inicial com métricas e resumos do escritório.',
        isModuleAccess: true,
      },
    ],
  },
  {
    id: 'projects',
    name: 'Projetos e Tarefas',
    description: 'Acompanhamento de projetos, fluxo operacional, Kanban e cronograma',
    iconName: 'FolderGit2',
    permissions: [
      {
        key: 'module_projects',
        label: 'Visualizar Projetos',
        description: 'Permite visualizar a listagem e os detalhes dos projetos do escritório.',
        isModuleAccess: true,
      },
      {
        key: 'projects_create',
        label: 'Criar Novos Projetos',
        description: 'Permite cadastrar novos projetos no sistema.',
      },
      {
        key: 'projects_edit',
        label: 'Editar Projetos',
        description: 'Permite alterar briefing, informações gerais e etapas dos projetos.',
      },
      {
        key: 'projects_delete',
        label: 'Excluir / Arquivar Projetos',
        description: 'Permite excluir permanentemente ou arquivar projetos.',
      },
      {
        key: 'tasks_manage',
        label: 'Gerenciar Tarefas',
        description: 'Permite criar, mover, atribuir e concluir tarefas dentro das etapas.',
      },
    ],
  },
  {
    id: 'clients',
    name: 'Clientes e Portal',
    description: 'Gestão de contatos de clientes e aprovações do portal',
    iconName: 'Users',
    permissions: [
      {
        key: 'module_clients',
        label: 'Visualizar Clientes',
        description: 'Permite acessar a lista de clientes e dados de contato.',
        isModuleAccess: true,
      },
      {
        key: 'clients_create_edit',
        label: 'Cadastrar e Editar Clientes',
        description: 'Permite adicionar novos clientes e alterar dados cadastrais.',
      },
      {
        key: 'clients_delete',
        label: 'Excluir Clientes',
        description: 'Permite excluir clientes da base de dados.',
      },
      {
        key: 'clients_portal',
        label: 'Aprovações & Portal do Cliente',
        description: 'Gerenciar solicitações de atualização cadastral e acessos ao portal.',
      },
    ],
  },
  {
    id: 'companies',
    name: 'Empresas e Serviços',
    description: 'Catálogo de fornecedores, prestadores e parceiros',
    iconName: 'Briefcase',
    permissions: [
      {
        key: 'module_companies',
        label: 'Visualizar Empresas e Serviços',
        description: 'Permite visualizar fornecedores e prestadores cadastrados.',
        isModuleAccess: true,
      },
      {
        key: 'companies_manage',
        label: 'Gerenciar Parceiros e Serviços',
        description: 'Permite cadastrar, editar e remover empresas e serviços associados.',
      },
    ],
  },
  {
    id: 'financial',
    name: 'Gestão Financeira',
    description: 'Controle de receitas, despesas, fluxo de caixa e relatórios',
    iconName: 'CircleDollarSign',
    permissions: [
      {
        key: 'module_financial',
        label: 'Acesso ao Financeiro',
        description: 'Permite visualizar o módulo financeiro e lançamentos.',
        isModuleAccess: true,
      },
      {
        key: 'financial_view_sensitive',
        label: 'Visualizar Saldos e Totais Sensíveis',
        description: 'Exibe faturamento bruto, saldo acumulado e resumos confidenciais.',
      },
      {
        key: 'financial_create_edit',
        label: 'Lançar Receitas e Despesas',
        description: 'Permite cadastrar e alterar transações, parcelas e recorrências.',
      },
      {
        key: 'financial_delete',
        label: 'Excluir Lançamentos Financeiros',
        description: 'Permite excluir receitas e despesas registradas.',
      },
    ],
  },
  {
    id: 'settings',
    name: 'Configurações do Escritório',
    description: 'Parâmetros estruturais, equipe e governança',
    iconName: 'Settings',
    permissions: [
      {
        key: 'settings_stages',
        label: 'Configurar Etapas e Templates',
        description: 'Permite editar etapas padrão de projetos e templates de tarefas.',
      },
      {
        key: 'settings_office',
        label: 'Editar Dados do Escritório',
        description: 'Permite alterar logotipo, CNPJ, telefone e dados institucionais.',
      },
      {
        key: 'settings_team',
        label: 'Gerenciar Equipe e Membros',
        description: 'Permite convidar novos colaboradores e alterar cargos da equipe.',
      },
      {
        key: 'settings_profiles',
        label: 'Gerenciar Perfis de Acesso',
        description: 'Permite criar novos perfis e configurar a matriz de permissões.',
      },
    ],
  },
]

export const ALL_PERMISSIONS_KEYS: PermissionKey[] = PERMISSION_CATEGORIES.flatMap((c) =>
  c.permissions.map((p) => p.key)
)

export const FULL_PERMISSIONS: ProfilePermissions = ALL_PERMISSIONS_KEYS.reduce((acc, key) => {
  acc[key] = true
  return acc
}, {} as ProfilePermissions)

export function hasPermission(
  isOwner: boolean,
  permissions: ProfilePermissions | undefined | null,
  requiredKey: PermissionKey | PermissionKey[]
): boolean {
  if (isOwner) return true
  if (!permissions) return false
  if (Array.isArray(requiredKey)) {
    return requiredKey.some((key) => permissions[key] === true)
  }
  return permissions[requiredKey] === true
}

export interface AccessProfile {
  id: string
  organization_id: string
  name: string
  description: string | null
  color: string
  is_owner_profile: boolean
  is_system: boolean
  permissions: ProfilePermissions
  created_at: string
  updated_at: string
  members_count?: number
}

export interface CreateProfileInput {
  name: string
  description?: string
  color?: string
  permissions: Partial<ProfilePermissions>
}

export interface UpdateProfileInput {
  name: string
  description?: string
  color?: string
  permissions: Partial<ProfilePermissions>
}

export interface OrganizationInvite {
  id: string
  organization_id: string
  email: string
  profile_id: string | null
  invite_code: string
  invited_by: string | null
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  created_at: string
  expires_at: string | null
  profile?: AccessProfile | null
  organization?: {
    id: string
    name: string
    logo_url: string | null
  } | null
}

'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireOrgAccess } from '@/lib/server/guard'
import { sanitizeText } from '@/lib/server/sanitize'
import {
  FINANCIAL_CATEGORIES,
  FinancialCategoryItem,
  TransactionType,
} from '@/types/financial'

/**
 * Encontra possíveis IDs legados para uma categoria padrão pelo rótulo amigável
 */
function findLegacyIdsForLabel(label: string): string[] {
  const clean = label.trim().toLowerCase()
  return FINANCIAL_CATEGORIES.filter(
    (c) => c.label.toLowerCase() === clean || c.id.toLowerCase() === clean
  ).map((c) => c.id)
}

/**
 * 1. LISTAR TODAS AS CATEGORIAS FINANCEIRAS DA ORGANIZAÇÃO (COM CONTAGEM DE LANÇAMENTOS)
 */
export async function getFinancialCategoriesAction(
  organizationId: string,
  type?: TransactionType
): Promise<{
  success: boolean
  categories: FinancialCategoryItem[]
  error?: string
}> {
  try {
    if (!organizationId) {
      const filtered = type
        ? FINANCIAL_CATEGORIES.filter((c) => c.type === type)
        : FINANCIAL_CATEGORIES

      return {
        success: true,
        categories: filtered.map((c) => ({
          id: c.id,
          name: c.label,
          type: c.type,
          group: c.group,
          color: c.color,
          is_custom: false,
          transaction_count: 0,
        })),
      }
    }

    const { supabase } = await requireAuth()
    await requireOrgAccess(organizationId)

    // 1. Busca categorias salvas na tabela financial_categories
    let dbCategories: {
      id: string
      name: string
      type: TransactionType
      color?: string | null
    }[] = []

    try {
      let query = supabase
        .from('financial_categories')
        .select('id, name, type, color')
        .eq('organization_id', organizationId)

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query.order('name', { ascending: true })

      if (!error && data) {
        dbCategories = data as any
      }
    } catch (dbErr) {
      console.warn('Erro ao consultar financial_categories:', dbErr)
    }

    // 2. Se a organização ainda não possui nenhuma categoria cadastrada no banco, semeia as padrões
    if (dbCategories.length === 0) {
      try {
        const defaultsToSeed = type
          ? FINANCIAL_CATEGORIES.filter((c) => c.type === type)
          : FINANCIAL_CATEGORIES

        const seedPayload = defaultsToSeed.map((c) => ({
          organization_id: organizationId,
          name: c.label,
          type: c.type,
          color: c.color || (c.type === 'income' ? 'emerald' : 'rose'),
        }))

        const { data: seeded, error: seedError } = await supabase
          .from('financial_categories')
          .insert(seedPayload)
          .select('id, name, type, color')

        if (!seedError && seeded) {
          dbCategories = seeded as any
        }
      } catch (seedErr) {
        console.warn('Erro ao semear categorias financeiras:', seedErr)
      }
    }

    // 3. Contagem de lançamentos existentes agrupados por categoria
    const categoryCounts = new Map<string, { count: number; originalName: string }>()

    try {
      // Contagem em financial_transactions
      let txQuery = supabase
        .from('financial_transactions')
        .select('category, type')
        .eq('organization_id', organizationId)

      if (type) {
        txQuery = txQuery.eq('type', type)
      }

      const { data: txs } = await txQuery

      if (txs) {
        txs.forEach((t: { category: string | null; type: string }) => {
          if (t.category && typeof t.category === 'string') {
            const raw = t.category.trim()
            if (raw) {
              // Mapeia legacy id para rótulo amigável se aplicável
              const def = FINANCIAL_CATEGORIES.find(
                (c) => c.id.toLowerCase() === raw.toLowerCase()
              )
              const canonicalName = def ? def.label : raw
              const key = canonicalName.toLowerCase()

              const existing = categoryCounts.get(key)
              if (existing) {
                existing.count += 1
              } else {
                categoryCounts.set(key, { count: 1, originalName: canonicalName })
              }
            }
          }
        })
      }

      // Contagem em recurring_expenses
      let recQuery = supabase
        .from('recurring_expenses')
        .select('category')
        .eq('organization_id', organizationId)

      const { data: recs } = await recQuery

      if (recs) {
        recs.forEach((r: { category: string | null }) => {
          if (r.category && typeof r.category === 'string') {
            const raw = r.category.trim()
            if (raw) {
              const def = FINANCIAL_CATEGORIES.find(
                (c) => c.id.toLowerCase() === raw.toLowerCase()
              )
              const canonicalName = def ? def.label : raw
              const key = canonicalName.toLowerCase()

              const existing = categoryCounts.get(key)
              if (existing) {
                existing.count += 1
              } else {
                categoryCounts.set(key, { count: 1, originalName: canonicalName })
              }
            }
          }
        })
      }
    } catch (countErr) {
      console.warn('Erro ao contar transações por categoria:', countErr)
    }

    // 4. Consolida mapa de categorias
    const categoryMap = new Map<string, FinancialCategoryItem>()

    if (dbCategories.length === 0) {
      // Fallback em memória caso o banco não tenha retornado itens
      const defaults = type
        ? FINANCIAL_CATEGORIES.filter((c) => c.type === type)
        : FINANCIAL_CATEGORIES

      defaults.forEach((c) => {
        const lower = c.label.toLowerCase()
        categoryMap.set(lower, {
          id: c.id,
          name: c.label,
          type: c.type,
          group: c.group,
          color: c.color,
          is_custom: false,
          transaction_count: categoryCounts.get(lower)?.count || 0,
        })
      })
    } else {
      dbCategories.forEach((c) => {
        const lower = c.name.toLowerCase()
        const defaultDef = FINANCIAL_CATEGORIES.find(
          (dc) => dc.label.toLowerCase() === lower
        )

        categoryMap.set(lower, {
          id: c.id,
          name: c.name,
          type: c.type,
          group: defaultDef?.group || 'geral',
          color: c.color || defaultDef?.color || (c.type === 'income' ? 'emerald' : 'rose'),
          is_custom: !defaultDef,
          transaction_count: categoryCounts.get(lower)?.count || 0,
        })
      })
    }

    // Adiciona quaisquer categorias legadas encontradas em lançamentos existentes preservando grafia
    categoryCounts.forEach((item, lower) => {
      if (!categoryMap.has(lower)) {
        categoryMap.set(lower, {
          name: item.originalName,
          type: type || 'expense',
          is_custom: true,
          transaction_count: item.count,
        })
      }
    })

    const categories = Array.from(categoryMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    )

    return {
      success: true,
      categories,
    }
  } catch (err: any) {
    console.error('Erro em getFinancialCategoriesAction:', err)
    const defaults = type
      ? FINANCIAL_CATEGORIES.filter((c) => c.type === type)
      : FINANCIAL_CATEGORIES

    return {
      success: false,
      categories: defaults.map((c) => ({
        id: c.id,
        name: c.label,
        type: c.type,
        group: c.group,
        color: c.color,
        is_custom: false,
        transaction_count: 0,
      })),
      error: err?.message || 'Erro ao carregar categorias financeiras.',
    }
  }
}

/**
 * 2. CRIAR NOVA CATEGORIA FINANCEIRA
 */
export async function createFinancialCategoryAction(
  organizationId: string,
  name: string,
  type: TransactionType
): Promise<{
  success: boolean
  category?: FinancialCategoryItem
  error?: string
}> {
  try {
    const { supabase } = await requireAuth()
    await requireOrgAccess(organizationId)

    const cleanName = sanitizeText(name)
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'O nome da categoria deve ter pelo menos 2 caracteres.' }
    }

    // 1. Verifica se já existe na organização para este tipo
    const { data: existing } = await supabase
      .from('financial_categories')
      .select('id, name, type, color')
      .eq('organization_id', organizationId)
      .eq('type', type)
      .ilike('name', cleanName)
      .maybeSingle()

    if (existing) {
      return {
        success: true,
        category: {
          id: existing.id,
          name: existing.name,
          type: existing.type as TransactionType,
          color: existing.color || (type === 'income' ? 'emerald' : 'rose'),
          is_custom: true,
          transaction_count: 0,
        },
      }
    }

    // 2. Insere na tabela
    const defaultColor = type === 'income' ? 'emerald' : 'rose'
    const { data, error } = await supabase
      .from('financial_categories')
      .insert({
        organization_id: organizationId,
        name: cleanName,
        type,
        color: defaultColor,
      })
      .select('id, name, type, color')
      .single()

    if (error) {
      return { success: false, error: 'Erro ao cadastrar categoria: ' + error.message }
    }

    revalidatePath('/app/financeiro')
    revalidatePath('/app/projetos')
    revalidatePath('/app')

    return {
      success: true,
      category: {
        id: data.id,
        name: data.name,
        type: data.type as TransactionType,
        color: data.color || defaultColor,
        is_custom: true,
        transaction_count: 0,
      },
    }
  } catch (err: any) {
    console.error('Erro em createFinancialCategoryAction:', err)
    return { success: false, error: err?.message || 'Erro inesperado ao cadastrar categoria.' }
  }
}

/**
 * 3. ATUALIZAR / RENOMEAR CATEGORIA FINANCEIRA (PROPAGA EM CASCATA PARA OS LANÇAMENTOS EXISTENTES)
 */
export async function updateFinancialCategoryAction(
  organizationId: string,
  oldName: string,
  newName: string,
  type: TransactionType,
  id?: string
): Promise<{
  success: boolean
  countUpdated?: number
  error?: string
}> {
  try {
    const { supabase } = await requireAuth()
    await requireOrgAccess(organizationId)

    const cleanNew = sanitizeText(newName)
    const cleanOld = sanitizeText(oldName)

    if (!cleanNew || cleanNew.length < 2) {
      return { success: false, error: 'O novo nome da categoria deve ter pelo menos 2 caracteres.' }
    }

    // 1. Atualiza na tabela financial_categories
    if (id) {
      await supabase
        .from('financial_categories')
        .update({ name: cleanNew, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId)
    } else {
      const { data: existing } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('type', type)
        .ilike('name', cleanOld)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('financial_categories')
          .update({ name: cleanNew, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await supabase.from('financial_categories').insert({
          organization_id: organizationId,
          name: cleanNew,
          type,
          color: type === 'income' ? 'emerald' : 'rose',
        })
      }
    }

    // 2. Obtém códigos legados correspondentes à categoria antiga (se houver)
    const legacyCodes = findLegacyIdsForLabel(cleanOld)
    const matchTargets = [cleanOld, ...legacyCodes]

    let totalUpdated = 0

    // 3. Atualiza em cascata nos lançamentos de financial_transactions
    for (const target of matchTargets) {
      const { data: updatedTxs, error: updateErr } = await supabase
        .from('financial_transactions')
        .update({ category: cleanNew })
        .eq('organization_id', organizationId)
        .ilike('category', target)
        .select('id')

      if (!updateErr && updatedTxs) {
        totalUpdated += updatedTxs.length
      }
    }

    // 4. Atualiza em cascata em recurring_expenses
    for (const target of matchTargets) {
      await supabase
        .from('recurring_expenses')
        .update({ category: cleanNew })
        .eq('organization_id', organizationId)
        .ilike('category', target)
    }

    revalidatePath('/app/financeiro')
    revalidatePath('/app/projetos')
    revalidatePath('/app')

    return {
      success: true,
      countUpdated: totalUpdated,
    }
  } catch (err: any) {
    console.error('Erro em updateFinancialCategoryAction:', err)
    return { success: false, error: err?.message || 'Erro inesperado ao renomear categoria.' }
  }
}

/**
 * 4. EXCLUIR CATEGORIA COM REATRIBUIÇÃO OBRIGATÓRIA DOS LANÇAMENTOS VINCULADOS
 */
export async function deleteFinancialCategoryAction(
  organizationId: string,
  name: string,
  replacementCategory: string,
  type: TransactionType,
  id?: string
): Promise<{
  success: boolean
  countMigrated?: number
  error?: string
}> {
  try {
    const { supabase } = await requireAuth()
    await requireOrgAccess(organizationId)

    const cleanTarget = sanitizeText(name)
    const cleanReplacement = sanitizeText(replacementCategory)

    if (!cleanReplacement) {
      return {
        success: false,
        error: 'É necessário selecionar para qual outra categoria os lançamentos vinculados devem ser transferidos.',
      }
    }

    if (cleanTarget.toLowerCase() === cleanReplacement.toLowerCase()) {
      return {
        success: false,
        error: 'A categoria de destino deve ser diferente da categoria sendo excluída.',
      }
    }

    // 1. Obtém códigos legados correspondentes à categoria sendo excluída (se houver)
    const legacyCodes = findLegacyIdsForLabel(cleanTarget)
    const matchTargets = [cleanTarget, ...legacyCodes]

    let totalMigrated = 0

    // 2. Migra todos os lançamentos vinculados em financial_transactions
    for (const target of matchTargets) {
      const { data: migratedTxs, error: migrateErr } = await supabase
        .from('financial_transactions')
        .update({ category: cleanReplacement })
        .eq('organization_id', organizationId)
        .ilike('category', target)
        .select('id')

      if (!migrateErr && migratedTxs) {
        totalMigrated += migratedTxs.length
      }
    }

    // 3. Migra eventuais despesas recorrentes vinculadas em recurring_expenses
    for (const target of matchTargets) {
      await supabase
        .from('recurring_expenses')
        .update({ category: cleanReplacement })
        .eq('organization_id', organizationId)
        .ilike('category', target)
    }

    // 4. Exclui da tabela financial_categories por ID e por Nome
    if (id) {
      await supabase
        .from('financial_categories')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)
    }

    await supabase
      .from('financial_categories')
      .delete()
      .eq('organization_id', organizationId)
      .eq('type', type)
      .ilike('name', cleanTarget)

    revalidatePath('/app/financeiro')
    revalidatePath('/app/projetos')
    revalidatePath('/app')

    return {
      success: true,
      countMigrated: totalMigrated,
    }
  } catch (err: any) {
    console.error('Erro em deleteFinancialCategoryAction:', err)
    return { success: false, error: err?.message || 'Erro inesperado ao excluir categoria.' }
  }
}

'use server'

import { prisma } from '@/lib/prisma'

export async function getTransactions(
  year: number,
  month: number,
  filters?: { source?: string; categoryId?: string; search?: string }
) {
  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  })

  if (!monthRecord) return []

  const where: Record<string, unknown> = {
    monthId: monthRecord.id,
    isPayParent: false,
  }
  if (filters?.source) where.source = filters.source
  if (filters?.categoryId) where.categoryId = filters.categoryId
  if (filters?.search) where.description = { contains: filters.search, mode: 'insensitive' }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: 'desc' },
  })

  return transactions.map(t => ({
    id: t.id,
    date: t.date.toISOString(),
    description: t.description,
    originalDescription: t.originalDescription,
    amount: t.amount,
    type: t.type,
    source: t.source,
    categoryName: t.category?.name || null,
    categoryColor: t.category?.color || null,
    categoryIcon: t.category?.icon || null,
    categoryStatus: t.categoryStatus,
    isPayParent: t.isPayParent,
    linkedPayTransactionId: t.linkedPayTransactionId,
  }))
}

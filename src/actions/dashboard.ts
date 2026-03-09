'use server'

import { prisma } from '@/lib/prisma'

export async function getDashboardData(year: number, month: number) {
  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  })

  if (!monthRecord) {
    return { income: 0, expense: 0, transactions: [], categoryBreakdown: [], pendingCount: 0 }
  }

  const transactions = await prisma.transaction.findMany({
    where: { monthId: monthRecord.id, isPayParent: false },
    include: { category: true },
    orderBy: { date: 'desc' },
  })

  const income = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)

  const expense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)

  const categoryBreakdown = transactions
    .filter((t) => t.type === 'EXPENSE' && t.category)
    .reduce((acc, t) => {
      const name = t.category!.name
      const existing = acc.find((c) => c.name === name)
      if (existing) {
        existing.amount += t.amount
        existing.count++
      } else {
        acc.push({ name, amount: t.amount, count: 1, color: t.category!.color || '#888' })
      }
      return acc
    }, [] as Array<{ name: string; amount: number; count: number; color: string }>)
    .sort((a, b) => b.amount - a.amount)

  const pendingCount = transactions.filter((t) => t.categoryStatus === 'PENDING').length

  return {
    income,
    expense,
    transactions: transactions.slice(0, 10).map(t => ({
      id: t.id,
      date: t.date.toISOString(),
      description: t.description,
      amount: t.amount,
      type: t.type,
      categoryName: t.category?.name || null,
      categoryColor: t.category?.color || null,
    })),
    categoryBreakdown,
    pendingCount,
  }
}

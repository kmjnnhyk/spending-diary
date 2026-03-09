'use server'

import { prisma } from '@/lib/prisma'

export async function getReportData(year: number, month: number) {
  const current = await getMonthSummary(year, month)
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const previous = await getMonthSummary(prevYear, prevMonth)
  return { current, previous }
}

async function getMonthSummary(year: number, month: number) {
  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  })
  if (!monthRecord) return null

  const transactions = await prisma.transaction.findMany({
    where: { monthId: monthRecord.id, isPayParent: false },
    include: { category: true },
  })

  const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)

  const byCategory = transactions
    .filter((t) => t.type === 'EXPENSE' && t.category)
    .reduce((acc, t) => {
      const name = t.category!.name
      acc[name] = (acc[name] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)

  return { year, month, income, expense, byCategory, transactionCount: transactions.length }
}

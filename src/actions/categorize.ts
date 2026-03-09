'use server'

import { prisma } from '@/lib/prisma'
import { classifyTransactions } from '@/lib/categorize'
import { CategoryStatus } from '@/generated/prisma'

export async function autoCategorize(monthId: string) {
  const pendingTransactions = await prisma.transaction.findMany({
    where: { monthId, categoryStatus: 'PENDING' },
    select: { id: true, description: true, amount: true, type: true },
  })

  if (pendingTransactions.length === 0) {
    return { categorized: 0, pending: 0 }
  }

  const categories = await prisma.category.findMany()
  const categoryNames = categories.map((c: { name: string }) => c.name)
  const categoryMap = new Map(categories.map((c: { name: string; id: string }) => [c.name, c.id]))

  const batchSize = 30
  let categorized = 0
  let pending = 0

  for (let i = 0; i < pendingTransactions.length; i += batchSize) {
    const batch = pendingTransactions.slice(i, i + batchSize)
    const results = await classifyTransactions(batch, categoryNames)

    for (const result of results) {
      const categoryId = categoryMap.get(result.category)
      if (!categoryId) continue

      if (result.confidence === 'high') {
        await prisma.transaction.update({
          where: { id: result.transactionId },
          data: {
            categoryId,
            categoryStatus: CategoryStatus.AUTO,
          },
        })
        categorized++
      } else {
        await prisma.transaction.update({
          where: { id: result.transactionId },
          data: {
            categoryId,
            categoryStatus: CategoryStatus.PENDING,
          },
        })
        pending++
      }
    }
  }

  return { categorized, pending }
}

export async function manualCategorize(transactionId: string, categoryId: string) {
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      categoryId,
      categoryStatus: CategoryStatus.MANUAL,
    },
  })
  return { success: true }
}

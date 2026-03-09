'use server'

import { prisma } from '@/lib/prisma'
import { detectPaySource, isAmountMatch, isDateMatch } from '@/lib/pay-matcher'
import { Source } from '@/generated/prisma'

export async function matchPayTransactions(monthId: string) {
  const bankTransactions = await prisma.transaction.findMany({
    where: {
      monthId,
      source: { in: ['TOSS', 'KB'] },
      isPayParent: false,
      linkedPayTransactionId: null,
    },
  })

  const matches: Array<{ bankId: string; payId: string; paySource: string }> = []
  const unmatched: Array<{ bankId: string; paySource: string; description: string }> = []

  for (const bt of bankTransactions) {
    const paySource = detectPaySource(bt.description) || detectPaySource(bt.originalDescription || '')
    if (!paySource) continue

    const payTransactions = await prisma.transaction.findMany({
      where: {
        monthId,
        source: paySource as Source,
        linkedFromTransactions: { none: {} },
      },
    })

    const match = payTransactions.find(
      (pt: { date: Date; amount: number }) => isDateMatch(bt.date, pt.date) && isAmountMatch(bt.amount, pt.amount)
    )

    if (match) {
      matches.push({ bankId: bt.id, payId: match.id, paySource })
    } else {
      unmatched.push({ bankId: bt.id, paySource, description: bt.description })
    }
  }

  for (const m of matches) {
    await prisma.transaction.update({
      where: { id: m.bankId },
      data: { isPayParent: true },
    })
    await prisma.transaction.update({
      where: { id: m.payId },
      data: { linkedPayTransactionId: m.bankId },
    })
  }

  return { matched: matches.length, unmatched }
}

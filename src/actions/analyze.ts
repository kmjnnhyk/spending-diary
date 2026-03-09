'use server'

import { prisma } from '@/lib/prisma'
import { parseTransactionImage } from '@/lib/claude'
import { detectPaySource, isAmountMatch, isDateMatch } from '@/lib/pay-matcher'
import { classifyTransactions } from '@/lib/categorize'
import { CategoryStatus, Source } from '@/generated/prisma'

interface AnalyzeInput {
  monthId: string
  images: Array<{ imageId: string; source: string; filePath: string }>
}

export async function analyzeAll(input: AnalyzeInput) {
  const { monthId, images } = input

  // Step 1: Parse all images
  const allTransactions: Array<{
    source: string
    date: Date
    description: string
    originalDescription: string
    amount: number
    type: 'INCOME' | 'EXPENSE'
  }> = []

  const parseResults: Array<{ source: string; count: number; error?: string }> = []

  for (const img of images) {
    try {
      const parsed = await parseTransactionImage(img.filePath, img.source)
      for (const t of parsed) {
        allTransactions.push({
          source: img.source,
          date: new Date(t.date),
          description: t.description,
          originalDescription: t.originalDescription,
          amount: t.amount,
          type: t.type,
        })
      }
      parseResults.push({ source: img.source, count: parsed.length })

      // Mark image as parsed
      await prisma.uploadedImage.update({
        where: { id: img.imageId },
        data: { parsed: true, parsedAt: new Date() },
      })
    } catch (e) {
      parseResults.push({ source: img.source, count: 0, error: String(e) })
    }
  }

  // Step 2: Cross-reference - identify pay parent transactions in bank records
  const bankTransactions = allTransactions.filter(t => t.source === 'TOSS' || t.source === 'KB')
  const payTransactions = allTransactions.filter(t => t.source !== 'TOSS' && t.source !== 'KB')

  const linkedPairs: Array<{ bankIdx: number; payIdx: number }> = []
  const bankPayParentFlags = new Set<number>()

  for (let bi = 0; bi < bankTransactions.length; bi++) {
    const bt = bankTransactions[bi]
    const paySource = detectPaySource(bt.description) || detectPaySource(bt.originalDescription)
    if (!paySource) continue

    // Find matching pay transaction
    for (let pi = 0; pi < payTransactions.length; pi++) {
      const pt = payTransactions[pi]
      if (pt.source !== paySource) continue
      if (!isDateMatch(bt.date, pt.date)) continue
      if (!isAmountMatch(bt.amount, pt.amount)) continue

      // Found match - don't add the bank's pay transaction, it will be represented by pay details
      linkedPairs.push({ bankIdx: bi, payIdx: pi })
      bankPayParentFlags.add(bi)
      break
    }
  }

  // Step 3: Deduplicate - remove exact duplicates (same date + amount + description)
  const seen = new Set<string>()
  const deduped: typeof allTransactions = []
  let duplicateCount = 0

  // Process pay transactions first (they have more accurate descriptions), then bank
  const ordered = [
    ...payTransactions.map((t, i) => ({ ...t, _originalIdx: i, _isBank: false })),
    ...bankTransactions.map((t, i) => ({ ...t, _originalIdx: i, _isBank: true })),
  ]

  for (const t of ordered) {
    // Skip bank transactions that are pay parents (they'll be represented by pay details)
    if (t._isBank && bankPayParentFlags.has(t._originalIdx)) {
      continue
    }

    const key = `${t.date.toISOString().slice(0, 10)}_${t.amount}_${t.description}`
    if (seen.has(key)) {
      duplicateCount++
      continue
    }
    seen.add(key)
    deduped.push(t)
  }

  // Step 4: Save all transactions to DB
  for (const t of deduped) {
    await prisma.transaction.create({
      data: {
        monthId,
        date: t.date,
        description: t.description,
        originalDescription: t.originalDescription,
        amount: t.amount,
        type: t.type as 'INCOME' | 'EXPENSE',
        source: t.source as Source,
        categoryStatus: CategoryStatus.PENDING,
      },
    })
  }

  // Step 5: Auto-categorize
  const pendingTxs = await prisma.transaction.findMany({
    where: { monthId, categoryStatus: 'PENDING' },
    select: { id: true, description: true, amount: true, type: true },
  })

  const categories = await prisma.category.findMany()
  const categoryNames = categories.map(c => c.name)
  const categoryMap = new Map(categories.map(c => [c.name, c.id]))

  let categorizedCount = 0
  let pendingCount = 0
  const batchSize = 30

  for (let i = 0; i < pendingTxs.length; i += batchSize) {
    const batch = pendingTxs.slice(i, i + batchSize)
    try {
      const results = await classifyTransactions(batch, categoryNames)
      for (const result of results) {
        const categoryId = categoryMap.get(result.category)
        if (!categoryId) continue
        if (result.confidence === 'high') {
          await prisma.transaction.update({
            where: { id: result.transactionId },
            data: { categoryId, categoryStatus: CategoryStatus.AUTO },
          })
          categorizedCount++
        } else {
          await prisma.transaction.update({
            where: { id: result.transactionId },
            data: { categoryId, categoryStatus: CategoryStatus.PENDING },
          })
          pendingCount++
        }
      }
    } catch {
      pendingCount += batch.length
    }
  }

  return {
    parseResults,
    totalParsed: allTransactions.length,
    duplicatesRemoved: duplicateCount,
    payMatched: linkedPairs.length,
    saved: deduped.length,
    categorized: categorizedCount,
    pendingClassification: pendingCount,
  }
}

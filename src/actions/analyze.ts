'use server'

import { prisma } from '@/lib/prisma'
import { parseTransactionImage, type ParsedTransaction } from '@/lib/claude'
import { detectPaySource, isAmountMatch, isDateMatch, isRefundTransaction, isInternalTransfer } from '@/lib/pay-matcher'
import { classifyTransactions } from '@/lib/categorize'
import { CategoryStatus, Source, TransactionFlag } from '@/generated/prisma'

interface AnalyzeInput {
  monthId: string
  images: Array<{ imageId: string; source: string; filePath: string }>
}

interface ParsedWithMeta extends ParsedTransaction {
  source: string
  dateObj: Date
}

export async function analyzeAll(input: AnalyzeInput) {
  const { monthId, images } = input

  // Step 1: Parse all images
  const allTransactions: ParsedWithMeta[] = []
  const parseResults: Array<{ source: string; count: number; error?: string }> = []

  for (const img of images) {
    try {
      const parsed = await parseTransactionImage(img.filePath, img.source)
      for (const t of parsed) {
        allTransactions.push({
          ...t,
          source: img.source,
          dateObj: new Date(t.date),
        })
      }
      parseResults.push({ source: img.source, count: parsed.length })

      await prisma.uploadedImage.update({
        where: { id: img.imageId },
        data: { parsed: true, parsedAt: new Date() },
      })
    } catch (e) {
      parseResults.push({ source: img.source, count: 0, error: String(e) })
    }
  }

  // Step 2: Filter out internal transfers (본인 이체: 국민→토스, 토스→국민)
  const filtered: ParsedWithMeta[] = []
  let internalTransferCount = 0

  for (const t of allTransactions) {
    const hasInternalFlag = t.flags?.includes('INTERNAL_TRANSFER')
    const detectedInternal = isInternalTransfer(t.description, t.source) || isInternalTransfer(t.originalDescription, t.source)

    if (hasInternalFlag || detectedInternal) {
      internalTransferCount++
      continue
    }
    filtered.push(t)
  }

  // Step 3: Identify pay charge transactions (bank→pay)
  // These should be replaced by actual pay service details
  const bankTransactions = filtered.filter(t => t.source === 'TOSS' || t.source === 'KB')
  const payTransactions = filtered.filter(t => t.source !== 'TOSS' && t.source !== 'KB')

  const linkedPairs: Array<{ bankIdx: number; payIdx: number }> = []
  const bankPayParentFlags = new Set<number>()
  const tosspayUnverified: ParsedWithMeta[] = []

  for (let bi = 0; bi < bankTransactions.length; bi++) {
    const bt = bankTransactions[bi]
    const hasPayChargeFlag = bt.flags?.includes('PAY_CHARGE')
    const paySource = detectPaySource(bt.description) || detectPaySource(bt.originalDescription)

    if (!paySource && !hasPayChargeFlag) continue

    // 토스페이: no detailed records available → send to unverified
    if (paySource === 'TOSSPAY') {
      bankPayParentFlags.add(bi)
      tosspayUnverified.push(bt)
      continue
    }

    const targetSource = paySource || ''
    if (!targetSource || targetSource === 'TOSSPAY') continue

    // Find matching pay transaction by date + amount
    for (let pi = 0; pi < payTransactions.length; pi++) {
      const pt = payTransactions[pi]
      if (pt.source !== targetSource) continue
      if (!isDateMatch(bt.dateObj, pt.dateObj)) continue
      if (!isAmountMatch(bt.amount, pt.amount)) continue

      linkedPairs.push({ bankIdx: bi, payIdx: pi })
      bankPayParentFlags.add(bi)
      break
    }
  }

  // Step 4: Deduplicate
  const seen = new Set<string>()
  const deduped: ParsedWithMeta[] = []
  let duplicateCount = 0

  // Pay transactions first (more accurate descriptions), then bank
  const ordered = [
    ...payTransactions.map((t, i) => ({ ...t, _originalIdx: i, _isBank: false })),
    ...bankTransactions.map((t, i) => ({ ...t, _originalIdx: i, _isBank: true })),
  ]

  for (const t of ordered) {
    // Skip bank transactions that are pay parents
    if (t._isBank && bankPayParentFlags.has(t._originalIdx)) {
      continue
    }

    const key = `${t.dateObj.toISOString().slice(0, 10)}_${t.amount}_${t.description}`
    if (seen.has(key)) {
      duplicateCount++
      continue
    }
    seen.add(key)
    deduped.push(t)
  }

  // Step 5: Determine flags and save transactions
  // Resolve month record from each transaction's actual date (not upload month)
  const monthCache = new Map<string, string>()

  async function getMonthId(date: Date): Promise<string> {
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    const key = `${y}-${m}`
    if (monthCache.has(key)) return monthCache.get(key)!

    const record = await prisma.month.upsert({
      where: { year_month: { year: y, month: m } },
      update: {},
      create: { year: y, month: m },
    })
    monthCache.set(key, record.id)
    return record.id
  }

  const savedTxIds: string[] = []
  let unverifiedCount = 0

  for (const t of deduped) {
    const hasRefundFlag = t.flags?.includes('REFUND')
    const detectedRefund = isRefundTransaction(t.description) || isRefundTransaction(t.originalDescription)
    const hasPersonalFlag = t.flags?.includes('PERSONAL_TRANSFER')

    let flag: typeof TransactionFlag[keyof typeof TransactionFlag] = TransactionFlag.NONE
    let categoryStatus: typeof CategoryStatus[keyof typeof CategoryStatus] = CategoryStatus.PENDING

    if (hasRefundFlag || detectedRefund) {
      flag = TransactionFlag.REFUND
    } else if (hasPersonalFlag) {
      // Personal transfers (정산) → unverified
      categoryStatus = CategoryStatus.UNVERIFIED
      unverifiedCount++
    }

    const resolvedMonthId = await getMonthId(t.dateObj)

    const tx = await prisma.transaction.create({
      data: {
        monthId: resolvedMonthId,
        date: t.dateObj,
        description: t.description,
        originalDescription: t.originalDescription,
        amount: t.amount,
        type: t.type as 'INCOME' | 'EXPENSE',
        source: t.source as Source,
        categoryStatus,
        flag,
      },
    })
    savedTxIds.push(tx.id)
  }

  // Save 토스페이 unverified transactions
  for (const t of tosspayUnverified) {
    const resolvedMonthId = await getMonthId(t.dateObj)
    const tx = await prisma.transaction.create({
      data: {
        monthId: resolvedMonthId,
        date: t.dateObj,
        description: t.description,
        originalDescription: t.originalDescription,
        amount: t.amount,
        type: t.type as 'INCOME' | 'EXPENSE',
        source: 'TOSS' as Source,
        categoryStatus: CategoryStatus.UNVERIFIED,
        flag: TransactionFlag.PAY_CHARGE,
      },
    })
    savedTxIds.push(tx.id)
    unverifiedCount++
  }

  // Step 6: Match refund transactions to original transactions
  let refundMatchedCount = 0
  const refundTxs = await prisma.transaction.findMany({
    where: { id: { in: savedTxIds }, flag: TransactionFlag.REFUND },
  })

  for (const refundTx of refundTxs) {
    // Search same month for matching original transaction
    const candidates = await prisma.transaction.findMany({
      where: {
        monthId: refundTx.monthId,
        amount: refundTx.amount,
        type: 'EXPENSE',
        flag: TransactionFlag.NONE,
        id: { not: refundTx.id },
      },
      orderBy: { date: 'desc' },
    })

    let matched = false
    for (const candidate of candidates) {
      if (candidate.description.includes(refundTx.description) ||
          refundTx.description.includes(candidate.description) ||
          (refundTx.originalDescription && candidate.originalDescription &&
           candidate.originalDescription.includes(refundTx.originalDescription))) {
        await prisma.transaction.update({
          where: { id: refundTx.id },
          data: { refundOfId: candidate.id, flag: TransactionFlag.CANCELLED },
        })
        await prisma.transaction.update({
          where: { id: candidate.id },
          data: { flag: TransactionFlag.CANCELLED },
        })
        refundMatchedCount++
        matched = true
        break
      }
    }

    // If not found in same month, check previous month
    if (!matched) {
      const txMonth = await prisma.month.findUnique({ where: { id: refundTx.monthId } })
      if (txMonth) {
        let prevYear = txMonth.year
        let prevMonth = txMonth.month - 1
        if (prevMonth === 0) { prevMonth = 12; prevYear-- }

        const prevMonthRecord = await prisma.month.findUnique({
          where: { year_month: { year: prevYear, month: prevMonth } },
        })

        if (prevMonthRecord) {
          const prevCandidates = await prisma.transaction.findMany({
            where: {
              monthId: prevMonthRecord.id,
              amount: refundTx.amount,
              type: 'EXPENSE',
              flag: TransactionFlag.NONE,
            },
            orderBy: { date: 'desc' },
          })

          for (const candidate of prevCandidates) {
            if (candidate.description.includes(refundTx.description) ||
                refundTx.description.includes(candidate.description)) {
              await prisma.transaction.update({
                where: { id: refundTx.id },
                data: { refundOfId: candidate.id, flag: TransactionFlag.CANCELLED },
              })
              await prisma.transaction.update({
                where: { id: candidate.id },
                data: { flag: TransactionFlag.CANCELLED },
              })
              refundMatchedCount++
              matched = true
              break
            }
          }
        }
      }

      // Still not matched → mark as unverified
      if (!matched) {
        await prisma.transaction.update({
          where: { id: refundTx.id },
          data: { categoryStatus: CategoryStatus.UNVERIFIED },
        })
        unverifiedCount++
      }
    }
  }

  // Step 7: Auto-categorize (only PENDING transactions, not UNVERIFIED)
  const pendingTxs = await prisma.transaction.findMany({
    where: {
      id: { in: savedTxIds },
      categoryStatus: 'PENDING',
      flag: { in: [TransactionFlag.NONE] },
    },
    select: { id: true, description: true, amount: true, type: true, source: true },
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
    internalTransfers: internalTransferCount,
    duplicatesRemoved: duplicateCount,
    payMatched: linkedPairs.length,
    saved: deduped.length + tosspayUnverified.length,
    categorized: categorizedCount,
    pendingClassification: pendingCount,
    unverified: unverifiedCount,
    refundMatched: refundMatchedCount,
  }
}

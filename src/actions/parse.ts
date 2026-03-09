'use server'

import { prisma } from '@/lib/prisma'
import { parseTransactionImage, ParsedTransaction } from '@/lib/claude'
import { CategoryStatus, TransactionType } from '@/generated/prisma'

export async function parseImage(imageId: string) {
  const image = await prisma.uploadedImage.findUnique({
    where: { id: imageId },
    include: { month: true },
  })

  if (!image) return { error: 'Image not found' }

  const parsed = await parseTransactionImage(image.filePath, image.source)

  return {
    success: true,
    imageId: image.id,
    source: image.source,
    transactions: parsed,
  }
}

export async function saveTransactions(
  imageId: string,
  transactions: ParsedTransaction[]
) {
  const image = await prisma.uploadedImage.findUnique({
    where: { id: imageId },
    include: { month: true },
  })

  if (!image) return { error: 'Image not found' }

  const created = await prisma.$transaction(
    transactions.map((t) =>
      prisma.transaction.create({
        data: {
          monthId: image.monthId,
          date: new Date(t.date),
          description: t.description,
          originalDescription: t.originalDescription,
          amount: t.amount,
          type: t.type as TransactionType,
          source: image.source,
          categoryStatus: CategoryStatus.PENDING,
        },
      })
    )
  )

  await prisma.uploadedImage.update({
    where: { id: imageId },
    data: { parsed: true, parsedAt: new Date() },
  })

  return { success: true, count: created.length }
}

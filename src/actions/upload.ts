'use server'

import { prisma } from '@/lib/prisma'
import { Source } from '@/generated/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function uploadImage(formData: FormData) {
  const file = formData.get('file') as File
  const source = formData.get('source') as Source
  const year = parseInt(formData.get('year') as string)
  const month = parseInt(formData.get('month') as string)

  if (!file || !source || !year || !month) {
    return { error: 'Missing required fields' }
  }

  const MAX_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_SIZE) return { error: 'File too large (max 10MB)' }
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) return { error: 'Invalid file type' }

  const monthRecord = await prisma.month.upsert({
    where: { year_month: { year, month } },
    update: {},
    create: { year, month },
  })

  const uploadsDir = path.join(process.cwd(), 'uploads', `${year}-${String(month).padStart(2, '0')}`)
  await mkdir(uploadsDir, { recursive: true })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const fileName = `${source}_${Date.now()}_${file.name}`
  const filePath = path.join(uploadsDir, fileName)

  await writeFile(filePath, buffer)

  const image = await prisma.uploadedImage.create({
    data: {
      monthId: monthRecord.id,
      source,
      filePath: `uploads/${year}-${String(month).padStart(2, '0')}/${fileName}`,
    },
  })

  return { success: true, imageId: image.id, monthId: monthRecord.id, filePath: image.filePath }
}

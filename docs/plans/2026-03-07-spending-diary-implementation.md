# Spending Diary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 월별 가계부 웹 앱 — 은행/페이 내역 이미지를 Claude API로 파싱하고, 페이 매칭 및 자동 카테고리 분류를 수행한다.

**Architecture:** Next.js App Router + Server Actions로 프론트/백엔드 통합. Prisma ORM으로 Docker PostgreSQL 접근. Claude API로 이미지 파싱 및 카테고리 분류.

**Tech Stack:** Next.js 14 (App Router), Prisma, PostgreSQL, Docker Compose, Anthropic SDK, Tailwind CSS

---

### Task 1: Project Scaffolding

**Files:**
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `.env`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

**Step 2: Create Docker Compose for PostgreSQL**

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: spending
      POSTGRES_PASSWORD: spending_dev
      POSTGRES_DB: spending_diary
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    restart: always
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://spending:spending_dev@db:5432/spending_diary
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      - db
    volumes:
      - .:/app
      - /app/node_modules
      - ./uploads:/app/uploads

volumes:
  pgdata:
```

**Step 3: Create Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "dev"]
```

**Step 4: Create environment files**

```bash
# .env
DATABASE_URL="postgresql://spending:spending_dev@localhost:5432/spending_diary"
ANTHROPIC_API_KEY="your-key-here"
```

```bash
# .env.example
DATABASE_URL="postgresql://spending:spending_dev@localhost:5432/spending_diary"
ANTHROPIC_API_KEY=""
```

**Step 5: Update .gitignore**

Add:
```
uploads/
.env
```

**Step 6: Verify Docker PostgreSQL starts**

```bash
docker compose up db -d
```

Expected: PostgreSQL running on port 5432

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding with Next.js, Docker, PostgreSQL"
```

---

### Task 2: Prisma Schema & Database Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`

**Step 1: Install Prisma**

```bash
npm install prisma @prisma/client
npx prisma init
```

**Step 2: Write Prisma schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TransactionType {
  INCOME
  EXPENSE
}

enum Source {
  TOSS
  KB
  KAKAOPAY
  DANGGEUN
  NAVERPAY
}

enum CategoryStatus {
  AUTO
  MANUAL
  PENDING
}

model Month {
  id           String        @id @default(cuid())
  year         Int
  month        Int
  createdAt    DateTime      @default(now())
  transactions Transaction[]
  images       UploadedImage[]

  @@unique([year, month])
}

model Category {
  id           String        @id @default(cuid())
  name         String        @unique
  icon         String?
  color        String?
  createdAt    DateTime      @default(now())
  transactions Transaction[]
}

model Transaction {
  id                      String         @id @default(cuid())
  monthId                 String
  month                   Month          @relation(fields: [monthId], references: [id])
  date                    DateTime
  description             String
  originalDescription     String?
  amount                  Int
  type                    TransactionType
  source                  Source
  categoryId              String?
  category                Category?      @relation(fields: [categoryId], references: [id])
  categoryStatus          CategoryStatus @default(PENDING)
  linkedPayTransactionId  String?
  linkedPayTransaction    Transaction?   @relation("PayLink", fields: [linkedPayTransactionId], references: [id])
  linkedFromTransactions  Transaction[]  @relation("PayLink")
  isPayParent             Boolean        @default(false)
  createdAt               DateTime       @default(now())

  @@index([monthId])
  @@index([date])
  @@index([source])
  @@index([categoryStatus])
}

model UploadedImage {
  id        String   @id @default(cuid())
  monthId   String
  month     Month    @relation(fields: [monthId], references: [id])
  source    Source
  filePath  String
  parsed    Boolean  @default(false)
  parsedAt  DateTime?
  createdAt DateTime @default(now())

  @@index([monthId])
}
```

**Step 3: Create Prisma client singleton**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration applied, tables created

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: Prisma schema with Month, Transaction, Category, UploadedImage models"
```

---

### Task 3: Seed Default Categories

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma seed config)

**Step 1: Write seed script**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { name: '식비', icon: '🍚', color: '#FF6B6B' },
  { name: '카페/간식', icon: '☕', color: '#FFA94D' },
  { name: '교통', icon: '🚌', color: '#FFD43B' },
  { name: '쇼핑', icon: '🛍️', color: '#69DB7C' },
  { name: '생활/마트', icon: '🏠', color: '#4ECDC4' },
  { name: '통신', icon: '📱', color: '#74C0FC' },
  { name: '구독/멤버십', icon: '📺', color: '#748FFC' },
  { name: '의료', icon: '🏥', color: '#B197FC' },
  { name: '교육', icon: '📚', color: '#E599F7' },
  { name: '여가/문화', icon: '🎬', color: '#FCC2D7' },
  { name: '경조사', icon: '💐', color: '#F06595' },
  { name: '이체/송금', icon: '💸', color: '#ADB5BD' },
  { name: '기타', icon: '📌', color: '#868E96' },
]

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log('Categories seeded')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Step 2: Add seed config to package.json**

Add to `package.json`:
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

**Step 3: Install tsx and run seed**

```bash
npm install -D tsx
npx prisma db seed
```

Expected: "Categories seeded"

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: seed default spending categories"
```

---

### Task 4: Image Upload Server Action & UI

**Files:**
- Create: `src/app/upload/page.tsx`
- Create: `src/actions/upload.ts`
- Create: `src/components/ImageUploader.tsx`
- Create: `uploads/` directory

**Step 1: Create upload server action**

```typescript
// src/actions/upload.ts
'use server'

import { prisma } from '@/lib/prisma'
import { Source } from '@prisma/client'
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

  // Ensure month exists
  const monthRecord = await prisma.month.upsert({
    where: { year_month: { year, month } },
    update: {},
    create: { year, month },
  })

  // Save file
  const uploadsDir = path.join(process.cwd(), 'uploads', `${year}-${String(month).padStart(2, '0')}`)
  await mkdir(uploadsDir, { recursive: true })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const fileName = `${source}_${Date.now()}_${file.name}`
  const filePath = path.join(uploadsDir, fileName)

  await writeFile(filePath, buffer)

  // Save to DB
  const image = await prisma.uploadedImage.create({
    data: {
      monthId: monthRecord.id,
      source,
      filePath: `uploads/${year}-${String(month).padStart(2, '0')}/${fileName}`,
    },
  })

  return { success: true, imageId: image.id, filePath: image.filePath }
}
```

**Step 2: Create ImageUploader component**

```tsx
// src/components/ImageUploader.tsx
'use client'

import { useState } from 'react'
import { uploadImage } from '@/actions/upload'
import { Source } from '@prisma/client'

const sourceLabels: Record<Source, string> = {
  TOSS: '토스',
  KB: '국민은행',
  KAKAOPAY: '카카오페이',
  DANGGEUN: '당근페이',
  NAVERPAY: '네이버페이',
}

interface Props {
  year: number
  month: number
  onUploaded?: (imageId: string) => void
}

export default function ImageUploader({ year, month, onUploaded }: Props) {
  const [source, setSource] = useState<Source>('TOSS')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('year', String(year))
    formData.set('month', String(month))

    const result = await uploadImage(formData)
    setUploading(false)

    if (result.success && result.imageId) {
      onUploaded?.(result.imageId)
      setPreview(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">소스</label>
        <select
          name="source"
          value={source}
          onChange={(e) => setSource(e.target.value as Source)}
          className="w-full border rounded-lg px-3 py-2"
        >
          {Object.entries(sourceLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">이미지</label>
        <input
          type="file"
          name="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full"
          required
        />
      </div>
      {preview && (
        <img src={preview} alt="preview" className="max-h-64 rounded-lg border" />
      )}
      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? '업로드 중...' : '업로드'}
      </button>
    </form>
  )
}
```

**Step 3: Create upload page**

```tsx
// src/app/upload/page.tsx
import ImageUploader from '@/components/ImageUploader'

export default function UploadPage() {
  const now = new Date()

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">내역 이미지 업로드</h1>
      <ImageUploader year={now.getFullYear()} month={now.getMonth() + 1} />
    </div>
  )
}
```

**Step 4: Verify upload page renders**

```bash
npm run dev
```

Visit `http://localhost:3000/upload` — should show upload form

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: image upload with source selection and file storage"
```

---

### Task 5: Claude API Image Parsing

**Files:**
- Create: `src/lib/claude.ts`
- Create: `src/actions/parse.ts`
- Create: `src/components/ParsedTransactions.tsx`

**Step 1: Install Anthropic SDK**

```bash
npm install @anthropic-ai/sdk
```

**Step 2: Create Claude API client and parsing logic**

```typescript
// src/lib/claude.ts
import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import path from 'path'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ParsedTransaction {
  date: string       // YYYY-MM-DD
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  originalDescription: string
}

export async function parseTransactionImage(filePath: string, source: string): Promise<ParsedTransaction[]> {
  const absolutePath = path.join(process.cwd(), filePath)
  const imageBuffer = await readFile(absolutePath)
  const base64Image = imageBuffer.toString('base64')
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const mediaType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp'

  const sourceNames: Record<string, string> = {
    TOSS: '토스 은행',
    KB: '국민은행',
    KAKAOPAY: '카카오페이',
    DANGGEUN: '당근페이',
    NAVERPAY: '네이버페이',
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `이 이미지는 ${sourceNames[source] || source}의 거래 내역 스크린샷입니다.
이미지에서 모든 거래 내역을 추출하여 JSON 배열로 반환해주세요.

각 거래는 다음 형식으로:
{
  "date": "YYYY-MM-DD",
  "description": "거래처/설명 (간결하게)",
  "amount": 금액(숫자만, 원 단위),
  "type": "INCOME" 또는 "EXPENSE",
  "originalDescription": "이미지에 표시된 원본 텍스트 그대로"
}

JSON 배열만 반환하세요. 다른 텍스트 없이.`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  return JSON.parse(jsonMatch[0])
}
```

**Step 3: Create parse server action**

```typescript
// src/actions/parse.ts
'use server'

import { prisma } from '@/lib/prisma'
import { parseTransactionImage, ParsedTransaction } from '@/lib/claude'
import { Source, TransactionType, CategoryStatus } from '@prisma/client'

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

  // Mark image as parsed
  await prisma.uploadedImage.update({
    where: { id: imageId },
    data: { parsed: true, parsedAt: new Date() },
  })

  return { success: true, count: created.length }
}
```

**Step 4: Create parsed transactions preview component**

```tsx
// src/components/ParsedTransactions.tsx
'use client'

import { useState } from 'react'
import { ParsedTransaction } from '@/lib/claude'
import { saveTransactions } from '@/actions/parse'

interface Props {
  imageId: string
  transactions: ParsedTransaction[]
  source: string
  onSaved?: () => void
}

export default function ParsedTransactions({ imageId, transactions, source, onSaved }: Props) {
  const [items, setItems] = useState(transactions)
  const [saving, setSaving] = useState(false)

  const handleRemove = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveTransactions(imageId, items)
    setSaving(false)
    if (result.success) {
      onSaved?.()
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">파싱 결과 ({items.length}건)</h2>
      <div className="space-y-2">
        {items.map((t, i) => (
          <div key={i} className="flex items-center justify-between border rounded-lg p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{t.date}</span>
                <span className="font-medium">{t.description}</span>
              </div>
              <div className="text-xs text-gray-400">{t.originalDescription}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={t.type === 'INCOME' ? 'text-blue-600' : 'text-red-600'}>
                {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()}원
              </span>
              <button onClick={() => handleRemove(i)} className="text-gray-400 hover:text-red-500">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving || items.length === 0}
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? '저장 중...' : `${items.length}건 저장`}
      </button>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: Claude API image parsing with transaction preview and save"
```

---

### Task 6: Pay Matching Logic

**Files:**
- Create: `src/lib/pay-matcher.ts`
- Create: `src/actions/match-pay.ts`

**Step 1: Write pay matching utility**

```typescript
// src/lib/pay-matcher.ts
const PAY_KEYWORDS: Record<string, string> = {
  '카카오페이': 'KAKAOPAY',
  'KAKAOPAY': 'KAKAOPAY',
  '네이버페이': 'NAVERPAY',
  'NV페이': 'NAVERPAY',
  'NAVERPAY': 'NAVERPAY',
  '당근페이': 'DANGGEUN',
  '당근마켓': 'DANGGEUN',
}

export function detectPaySource(description: string): string | null {
  for (const [keyword, source] of Object.entries(PAY_KEYWORDS)) {
    if (description.includes(keyword)) {
      return source
    }
  }
  return null
}

export function isAmountMatch(bankAmount: number, payAmount: number, tolerance = 0): boolean {
  return Math.abs(bankAmount - payAmount) <= tolerance
}

export function isDateMatch(bankDate: Date, payDate: Date): boolean {
  return (
    bankDate.getFullYear() === payDate.getFullYear() &&
    bankDate.getMonth() === payDate.getMonth() &&
    bankDate.getDate() === payDate.getDate()
  )
}
```

**Step 2: Write pay matching server action**

```typescript
// src/actions/match-pay.ts
'use server'

import { prisma } from '@/lib/prisma'
import { detectPaySource, isAmountMatch, isDateMatch } from '@/lib/pay-matcher'
import { Source } from '@prisma/client'

export async function matchPayTransactions(monthId: string) {
  // Get all bank transactions (TOSS, KB) that might be pay transactions
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

    // Find matching pay transactions
    const payTransactions = await prisma.transaction.findMany({
      where: {
        monthId,
        source: paySource as Source,
        linkedFromTransactions: { none: {} },
      },
    })

    // Try to find exact match by date + amount
    const match = payTransactions.find(
      (pt) => isDateMatch(bt.date, pt.date) && isAmountMatch(bt.amount, pt.amount)
    )

    if (match) {
      matches.push({ bankId: bt.id, payId: match.id, paySource })
    } else {
      unmatched.push({ bankId: bt.id, paySource, description: bt.description })
    }
  }

  // Apply matches
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

  return {
    matched: matches.length,
    unmatched,
  }
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: pay matching logic for bank-to-pay transaction linking"
```

---

### Task 7: Category Auto-Classification

**Files:**
- Create: `src/lib/categorize.ts`
- Create: `src/actions/categorize.ts`

**Step 1: Create categorization logic with Claude API**

```typescript
// src/lib/categorize.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface TransactionForCategorization {
  id: string
  description: string
  amount: number
  type: string
}

interface CategoryResult {
  transactionId: string
  category: string
  confidence: 'high' | 'low'
}

export async function classifyTransactions(
  transactions: TransactionForCategorization[],
  categoryNames: string[]
): Promise<CategoryResult[]> {
  if (transactions.length === 0) return []

  const transactionList = transactions
    .map((t) => `- ID: ${t.id} | ${t.description} | ${t.amount.toLocaleString()}원 | ${t.type}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `다음 거래 내역들을 카테고리로 분류해주세요.

사용 가능한 카테고리: ${categoryNames.join(', ')}

거래 내역:
${transactionList}

각 거래에 대해 JSON 배열로 반환:
[
  { "transactionId": "ID값", "category": "카테고리명", "confidence": "high" 또는 "low" }
]

- 확실한 분류: confidence "high"
- 애매하거나 판단 어려운 경우: confidence "low"
- JSON 배열만 반환, 다른 텍스트 없이.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  return JSON.parse(jsonMatch[0])
}
```

**Step 2: Create categorize server action**

```typescript
// src/actions/categorize.ts
'use server'

import { prisma } from '@/lib/prisma'
import { classifyTransactions } from '@/lib/categorize'
import { CategoryStatus } from '@prisma/client'

export async function autoCategorize(monthId: string) {
  const pendingTransactions = await prisma.transaction.findMany({
    where: { monthId, categoryStatus: 'PENDING' },
    select: { id: true, description: true, amount: true, type: true },
  })

  if (pendingTransactions.length === 0) {
    return { categorized: 0, pending: 0 }
  }

  const categories = await prisma.category.findMany()
  const categoryNames = categories.map((c) => c.name)
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]))

  // Process in batches of 30
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
        // Low confidence: set suggested category but keep PENDING
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
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: auto-categorization with Claude API and manual override"
```

---

### Task 8: Layout & Navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/Navigation.tsx`
- Create: `src/components/MonthSelector.tsx`

**Step 1: Create navigation component**

```tsx
// src/components/Navigation.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: '대시보드' },
  { href: '/upload', label: '업로드' },
  { href: '/transactions', label: '거래 내역' },
  { href: '/classify', label: '분류' },
  { href: '/report', label: '리포트' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-lg font-bold">
            가계부
          </Link>
          <div className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
```

**Step 2: Create month selector component**

```tsx
// src/components/MonthSelector.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  currentYear: number
  currentMonth: number
}

export default function MonthSelector({ currentYear, currentMonth }: Props) {
  const router = useRouter()

  const navigate = (year: number, month: number) => {
    router.push(`?year=${year}&month=${month}`)
  }

  const prev = () => {
    if (currentMonth === 1) navigate(currentYear - 1, 12)
    else navigate(currentYear, currentMonth - 1)
  }

  const next = () => {
    if (currentMonth === 12) navigate(currentYear + 1, 1)
    else navigate(currentYear, currentMonth + 1)
  }

  return (
    <div className="flex items-center gap-4">
      <button onClick={prev} className="p-2 hover:bg-gray-100 rounded-lg">&lt;</button>
      <span className="text-lg font-semibold">
        {currentYear}년 {currentMonth}월
      </span>
      <button onClick={next} className="p-2 hover:bg-gray-100 rounded-lg">&gt;</button>
    </div>
  )
}
```

**Step 3: Update layout**

Modify `src/app/layout.tsx` to include Navigation component.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: navigation and month selector components"
```

---

### Task 9: Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/actions/dashboard.ts`
- Create: `src/components/CategoryChart.tsx`
- Create: `src/components/SummaryCards.tsx`

**Step 1: Create dashboard data action**

```typescript
// src/actions/dashboard.ts
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
    transactions: transactions.slice(0, 10),
    categoryBreakdown,
    pendingCount,
  }
}
```

**Step 2: Build dashboard page with summary cards and category breakdown**

Create `SummaryCards.tsx` and `CategoryChart.tsx` components, then compose in `page.tsx`.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: dashboard page with income/expense summary and category breakdown"
```

---

### Task 10: Transactions List Page

**Files:**
- Create: `src/app/transactions/page.tsx`
- Create: `src/actions/transactions.ts`

**Step 1: Create transactions query action**

```typescript
// src/actions/transactions.ts
'use server'

import { prisma } from '@/lib/prisma'
import { Source } from '@prisma/client'

export async function getTransactions(
  year: number,
  month: number,
  filters?: { source?: Source; categoryId?: string; search?: string }
) {
  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  })

  if (!monthRecord) return []

  return prisma.transaction.findMany({
    where: {
      monthId: monthRecord.id,
      isPayParent: false,
      ...(filters?.source && { source: filters.source }),
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.search && {
        description: { contains: filters.search, mode: 'insensitive' },
      }),
    },
    include: {
      category: true,
      linkedPayTransaction: true,
    },
    orderBy: { date: 'desc' },
  })
}
```

**Step 2: Build transactions page with filter UI and list**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: transactions list page with filtering and search"
```

---

### Task 11: Category Classification Page

**Files:**
- Create: `src/app/classify/page.tsx`
- Create: `src/components/ClassifyCard.tsx`

**Step 1: Create classification page showing PENDING transactions**

Page that lists all PENDING transactions with category selection dropdown. Each card shows transaction details and a category picker. On selection, calls `manualCategorize` server action.

**Step 2: Include suggested category (from AI low-confidence) as default selection**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: manual category classification page for pending transactions"
```

---

### Task 12: Monthly Report Page

**Files:**
- Create: `src/app/report/page.tsx`
- Create: `src/actions/report.ts`

**Step 1: Create report data action with monthly comparison**

```typescript
// src/actions/report.ts
'use server'

import { prisma } from '@/lib/prisma'

export async function getReportData(year: number, month: number) {
  // Current month
  const current = await getMonthSummary(year, month)

  // Previous month
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
```

**Step 2: Build report page with comparison charts**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: monthly report page with previous month comparison"
```

---

### Task 13: Upload Page Integration (Full Flow)

**Files:**
- Modify: `src/app/upload/page.tsx`
- Integrate parse + pay matching + categorization into upload flow

**Step 1: Update upload page to support full workflow**

Upload → Parse (Claude API) → Preview → Save → Pay Matching → Auto Categorize

**Step 2: Add progress indicators and error handling**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: integrated upload flow with parsing, pay matching, and categorization"
```

---

### Task 14: Docker Compose Full Setup & Testing

**Files:**
- Modify: `docker-compose.yml`
- Modify: `Dockerfile`
- Create: `scripts/setup.sh`

**Step 1: Finalize Docker configuration**

Ensure `docker compose up` starts both PostgreSQL and Next.js app with hot reload.

**Step 2: Create setup script**

```bash
#!/bin/bash
# scripts/setup.sh
docker compose up db -d
sleep 2
npx prisma migrate dev
npx prisma db seed
echo "Setup complete. Run 'npm run dev' to start the app."
```

**Step 3: Test full flow end-to-end**

1. `docker compose up`
2. Upload image → parse → preview → save
3. Check pay matching
4. Check auto-categorization
5. Manual classify pending items
6. View dashboard and report

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: Docker setup finalized with setup script"
```

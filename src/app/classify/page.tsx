import { prisma } from '@/lib/prisma'
import MonthSelector from '@/components/MonthSelector'
import ClassifyCard from '@/components/ClassifyCard'

export default async function ClassifyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1

  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  })

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })

  let transactions: Array<{
    id: string
    date: string
    description: string
    amount: number
    type: string
    source: string
    categoryId: string | null
    categoryName: string | null
    categoryColor: string | null
  }> = []

  if (monthRecord) {
    const raw = await prisma.transaction.findMany({
      where: { monthId: monthRecord.id, categoryStatus: 'PENDING', isPayParent: false },
      include: { category: true },
      orderBy: { date: 'desc' },
    })
    transactions = raw.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      description: t.description,
      amount: t.amount,
      type: t.type,
      source: t.source,
      categoryId: t.categoryId,
      categoryName: t.category?.name || null,
      categoryColor: t.category?.color || null,
    }))
  }

  const serializedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">분류</h1>
        <MonthSelector currentYear={year} currentMonth={month} />
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">분류 대기 중인 거래가 없습니다.</p>
          <p className="text-gray-300 text-sm mt-2">모든 거래가 분류되었습니다!</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {transactions.length}건의 거래가 분류를 기다리고 있습니다.
          </p>
          <div className="space-y-3">
            {transactions.map((t) => (
              <ClassifyCard key={t.id} transaction={t} categories={serializedCategories} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

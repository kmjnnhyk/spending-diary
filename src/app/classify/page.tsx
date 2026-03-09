import { prisma } from '@/lib/prisma'
import MonthSelector from '@/components/MonthSelector'
import ClassifyCard from '@/components/ClassifyCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">분류</h1>
          {transactions.length > 0 && (
            <Badge variant="secondary">{transactions.length}건 대기</Badge>
          )}
        </div>
        <MonthSelector currentYear={year} currentMonth={month} />
      </div>

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-green-500 mb-4"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p className="text-muted-foreground text-lg">분류 대기 중인 거래가 없습니다.</p>
            <p className="text-muted-foreground/60 text-sm mt-2">모든 거래가 분류되었습니다!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Alert className="mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <AlertTitle>분류 안내</AlertTitle>
            <AlertDescription>
              {transactions.length}건의 거래가 분류를 기다리고 있습니다. AI 추천이 있는 경우 참고하세요.
            </AlertDescription>
          </Alert>
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

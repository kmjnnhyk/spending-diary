import Link from 'next/link'
import { getTransactions } from '@/actions/transactions'
import MonthSelector from '@/components/MonthSelector'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

const sourceLabels: Record<string, string> = {
  TOSS: '토스',
  KB: 'KB',
  KAKAOPAY: '카카오페이',
  DANGGEUN: '당근',
  NAVERPAY: '네이버페이',
}

const sourceVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  TOSS: 'default',
  KB: 'secondary',
  KAKAOPAY: 'outline',
  DANGGEUN: 'outline',
  NAVERPAY: 'secondary',
}

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; source?: string; search?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1

  const filters: { source?: string; search?: string } = {}
  if (params.source) filters.source = params.source
  if (params.search) filters.search = params.search

  const transactions = await getTransactions(year, month, filters)

  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)

  const baseQuery = `year=${year}&month=${month}`

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">거래 내역</h1>
        <MonthSelector currentYear={year} currentMonth={month} />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href={`/transactions?${baseQuery}`}
          className={cn(buttonVariants({ variant: !params.source ? 'default' : 'outline', size: 'sm' }))}
        >
          전체
        </Link>
        {Object.entries(sourceLabels).map(([key, label]) => (
          <Link
            key={key}
            href={`/transactions?${baseQuery}&source=${key}${params.search ? `&search=${params.search}` : ''}`}
            className={cn(buttonVariants({ variant: params.source === key ? 'default' : 'outline', size: 'sm' }))}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form className="mb-6">
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        {params.source && <input type="hidden" name="source" value={params.source} />}
        <input
          type="text"
          name="search"
          defaultValue={params.search || ''}
          placeholder="거래 내역 검색..."
          className="w-full border border-input rounded-lg px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      {/* Transactions Table */}
      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">거래 내역이 없습니다.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>내역</TableHead>
                  <TableHead>소스</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(t.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {t.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sourceVariants[t.source] || 'secondary'}>
                        {sourceLabels[t.source] || t.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {t.categoryName && (
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: (t.categoryColor || '#888') + '20',
                            color: t.categoryColor || '#888',
                          }}
                        >
                          {t.categoryName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${t.type === 'INCOME' ? 'text-blue-600' : 'text-red-600'}`}>
                      {t.type === 'INCOME' ? '+' : '-'}{formatWon(t.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Totals */}
      <Separator className="my-4" />
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">총 {transactions.length}건</span>
        <div className="flex gap-6">
          <span className="text-blue-600 font-medium">수입: {formatWon(totalIncome)}</span>
          <span className="text-red-600 font-medium">지출: {formatWon(totalExpense)}</span>
        </div>
      </div>
    </div>
  )
}

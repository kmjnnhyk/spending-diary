import { getReportData } from '@/actions/report'
import MonthSelector from '@/components/MonthSelector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

function DiffBadge({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous
  if (diff === 0) return <span className="text-muted-foreground">-</span>
  if (diff > 0) return <Badge variant="destructive">+{formatWon(diff)}</Badge>
  return <Badge variant="secondary" className="bg-green-100 text-green-700">{formatWon(diff)}</Badge>
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1

  const { current, previous } = await getReportData(year, month)

  const allCategories = new Set<string>()
  if (current?.byCategory) Object.keys(current.byCategory).forEach((k) => allCategories.add(k))
  if (previous?.byCategory) Object.keys(previous.byCategory).forEach((k) => allCategories.add(k))

  const sortedCategories = [...allCategories].sort((a, b) => {
    const aAmount = current?.byCategory[a] || 0
    const bAmount = current?.byCategory[b] || 0
    return bAmount - aAmount
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">리포트</h1>
        <MonthSelector currentYear={year} currentMonth={month} />
      </div>

      {!current ? (
        <Card>
          <CardContent className="text-center py-16">
            <p className="text-muted-foreground">해당 월의 데이터가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-1">
                <p className="text-sm text-muted-foreground mb-1">수입</p>
                <p className="text-xl font-bold text-blue-600">{formatWon(current.income)}</p>
                {previous && (
                  <p className="text-xs mt-2 text-muted-foreground">
                    전월 대비:{' '}
                    {current.income - previous.income >= 0
                      ? <span className="text-blue-500">+{formatWon(current.income - previous.income)}</span>
                      : <span className="text-muted-foreground">{formatWon(current.income - previous.income)}</span>
                    }
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-1">
                <p className="text-sm text-muted-foreground mb-1">지출</p>
                <p className="text-xl font-bold text-red-600">{formatWon(current.expense)}</p>
                {previous && (
                  <p className="text-xs mt-2">
                    전월 대비: <DiffBadge current={current.expense} previous={previous.expense} />
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-gray-400">
              <CardContent className="pt-1">
                <p className="text-sm text-muted-foreground mb-1">잔액</p>
                <p className="text-xl font-bold">{formatWon(current.income - current.expense)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  총 {current.transactionCount}건
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Previous month comparison */}
          {previous && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-sm">
                  전월 ({previous.year}년 {previous.month}월) 비교
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">전월 수입</span>
                    <span className="font-medium">{formatWon(previous.income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">전월 지출</span>
                    <span className="font-medium">{formatWon(previous.expense)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category comparison table */}
          {sortedCategories.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">카테고리별 지출 비교</h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>카테고리</TableHead>
                        <TableHead className="text-right">이번 달</TableHead>
                        <TableHead className="text-right">전월</TableHead>
                        <TableHead className="text-right">차이</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCategories.map((cat) => {
                        const cur = current.byCategory[cat] || 0
                        const prev = previous?.byCategory[cat] || 0
                        return (
                          <TableRow key={cat}>
                            <TableCell className="font-medium">{cat}</TableCell>
                            <TableCell className="text-right">{formatWon(cur)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatWon(prev)}</TableCell>
                            <TableCell className="text-right">
                              <DiffBadge current={cur} previous={prev} />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-semibold">합계</TableCell>
                        <TableCell className="text-right font-semibold">{formatWon(current.expense)}</TableCell>
                        <TableCell className="text-right font-semibold text-muted-foreground">
                          {previous ? formatWon(previous.expense) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {previous && <DiffBadge current={current.expense} previous={previous.expense} />}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

import Link from 'next/link'
import { getDashboardData } from '@/actions/dashboard'
import MonthSelector from '@/components/MonthSelector'
import SummaryCards from '@/components/SummaryCards'
import CategoryChart from '@/components/CategoryChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1

  const data = await getDashboardData(year, month)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <MonthSelector currentYear={year} currentMonth={month} />
      </div>

      <SummaryCards income={data.income} expense={data.expense} />

      {data.pendingCount > 0 && (
        <Link href="/classify" className="block mt-4">
          <Alert className="border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <AlertTitle className="text-amber-800">분류 대기</AlertTitle>
            <AlertDescription className="text-amber-700">
              분류 대기 중인 거래가 {data.pendingCount}건 있습니다. 클릭하여 분류하기
            </AlertDescription>
          </Alert>
        </Link>
      )}

      <Separator className="my-8" />

      <div>
        <h2 className="text-lg font-semibold mb-4">카테고리별 지출</h2>
        <CategoryChart data={data.categoryBreakdown} />
      </div>

      <Separator className="my-8" />

      <div>
        <h2 className="text-lg font-semibold mb-4">최근 거래</h2>
        {data.transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">거래 내역이 없습니다.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>내역</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(t.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell>
                        {t.categoryName && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
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
      </div>
    </div>
  )
}

import Link from 'next/link'
import { getDashboardData } from '@/actions/dashboard'
import MonthSelector from '@/components/MonthSelector'
import SummaryCards from '@/components/SummaryCards'
import CategoryChart from '@/components/CategoryChart'

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
        <h1 className="text-2xl font-bold">대시보드</h1>
        <MonthSelector currentYear={year} currentMonth={month} />
      </div>

      <SummaryCards income={data.income} expense={data.expense} />

      {data.pendingCount > 0 && (
        <Link
          href="/classify"
          className="mt-4 block bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 hover:bg-yellow-100 transition"
        >
          분류 대기 중인 거래가 {data.pendingCount}건 있습니다. 분류하러 가기 &rarr;
        </Link>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">카테고리별 지출</h2>
        <CategoryChart data={data.categoryBreakdown} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">최근 거래</h2>
        {data.transactions.length === 0 ? (
          <p className="text-gray-400 text-sm">거래 내역이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {data.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-white border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {new Date(t.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-sm">{t.description}</span>
                  {t.categoryName && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: (t.categoryColor || '#888') + '20',
                        color: t.categoryColor || '#888',
                      }}
                    >
                      {t.categoryName}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-medium ${t.type === 'INCOME' ? 'text-blue-600' : 'text-red-600'}`}>
                  {t.type === 'INCOME' ? '+' : '-'}{formatWon(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

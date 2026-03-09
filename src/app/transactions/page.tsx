import Link from 'next/link'
import { getTransactions } from '@/actions/transactions'
import MonthSelector from '@/components/MonthSelector'

const sourceLabels: Record<string, string> = {
  TOSS: '토스',
  KB: 'KB',
  KAKAOPAY: '카카오페이',
  DANGGEUN: '당근',
  NAVERPAY: '네이버페이',
}

const sourceColors: Record<string, string> = {
  TOSS: 'bg-blue-100 text-blue-700',
  KB: 'bg-yellow-100 text-yellow-700',
  KAKAOPAY: 'bg-amber-100 text-amber-700',
  DANGGEUN: 'bg-orange-100 text-orange-700',
  NAVERPAY: 'bg-green-100 text-green-700',
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
        <h1 className="text-2xl font-bold">거래 내역</h1>
        <MonthSelector currentYear={year} currentMonth={month} />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href={`/transactions?${baseQuery}`}
          className={`px-3 py-1.5 rounded-lg text-sm border ${!params.source ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          전체
        </Link>
        {Object.entries(sourceLabels).map(([key, label]) => (
          <Link
            key={key}
            href={`/transactions?${baseQuery}&source=${key}${params.search ? `&search=${params.search}` : ''}`}
            className={`px-3 py-1.5 rounded-lg text-sm border ${params.source === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
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
          className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {/* Transactions */}
      {transactions.length === 0 ? (
        <p className="text-gray-400 text-center py-12">거래 내역이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-white border rounded-lg p-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(t.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-sm truncate">{t.description}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${sourceColors[t.source] || 'bg-gray-100 text-gray-600'}`}>
                  {sourceLabels[t.source] || t.source}
                </span>
                {t.categoryName && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: (t.categoryColor || '#888') + '20',
                      color: t.categoryColor || '#888',
                    }}
                  >
                    {t.categoryName}
                  </span>
                )}
              </div>
              <span className={`text-sm font-medium shrink-0 ml-2 ${t.type === 'INCOME' ? 'text-blue-600' : 'text-red-600'}`}>
                {t.type === 'INCOME' ? '+' : '-'}{formatWon(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="mt-6 border-t pt-4 flex justify-between text-sm">
        <div>
          <span className="text-gray-500">총 {transactions.length}건</span>
        </div>
        <div className="flex gap-6">
          <span className="text-blue-600">수입: {formatWon(totalIncome)}</span>
          <span className="text-red-600">지출: {formatWon(totalExpense)}</span>
        </div>
      </div>
    </div>
  )
}

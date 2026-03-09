import { getReportData } from '@/actions/report'
import MonthSelector from '@/components/MonthSelector'

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

function diffIndicator(current: number, previous: number) {
  const diff = current - previous
  if (diff === 0) return <span className="text-gray-400">-</span>
  if (diff > 0) return <span className="text-red-500">+{formatWon(diff)}</span>
  return <span className="text-green-500">{formatWon(diff)}</span>
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
        <h1 className="text-2xl font-bold">리포트</h1>
        <MonthSelector currentYear={year} currentMonth={month} />
      </div>

      {!current ? (
        <p className="text-gray-400 text-center py-16">해당 월의 데이터가 없습니다.</p>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-600 mb-1">수입</p>
              <p className="text-xl font-bold text-blue-700">{formatWon(current.income)}</p>
              {previous && (
                <p className="text-xs mt-1">
                  전월 대비: {current.income - previous.income >= 0
                    ? <span className="text-blue-500">+{formatWon(current.income - previous.income)}</span>
                    : <span className="text-gray-500">{formatWon(current.income - previous.income)}</span>
                  }
                </p>
              )}
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600 mb-1">지출</p>
              <p className="text-xl font-bold text-red-700">{formatWon(current.expense)}</p>
              {previous && (
                <p className="text-xs mt-1">
                  전월 대비: {diffIndicator(current.expense, previous.expense)}
                </p>
              )}
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">잔액</p>
              <p className="text-xl font-bold">{formatWon(current.income - current.expense)}</p>
              <p className="text-xs text-gray-400 mt-1">
                총 {current.transactionCount}건
              </p>
            </div>
          </div>

          {/* Previous month comparison */}
          {previous && (
            <div className="mb-8 p-4 bg-gray-50 rounded-xl border">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                전월 ({previous.year}년 {previous.month}월) 비교
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">전월 수입:</span>{' '}
                  <span className="font-medium">{formatWon(previous.income)}</span>
                </div>
                <div>
                  <span className="text-gray-500">전월 지출:</span>{' '}
                  <span className="font-medium">{formatWon(previous.expense)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Category comparison table */}
          {sortedCategories.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">카테고리별 지출 비교</h2>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">카테고리</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">이번 달</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">전월</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">차이</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedCategories.map((cat) => {
                      const cur = current.byCategory[cat] || 0
                      const prev = previous?.byCategory[cat] || 0
                      return (
                        <tr key={cat}>
                          <td className="px-4 py-3">{cat}</td>
                          <td className="px-4 py-3 text-right">{formatWon(cur)}</td>
                          <td className="px-4 py-3 text-right text-gray-400">{formatWon(prev)}</td>
                          <td className="px-4 py-3 text-right">{diffIndicator(cur, prev)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

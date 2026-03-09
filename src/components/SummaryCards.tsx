'use client'

interface Props {
  income: number
  expense: number
}

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

export default function SummaryCards({ income, expense }: Props) {
  const balance = income - expense

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-600 mb-1">수입</p>
        <p className="text-xl font-bold text-blue-700">{formatWon(income)}</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-600 mb-1">지출</p>
        <p className="text-xl font-bold text-red-700">{formatWon(expense)}</p>
      </div>
      <div className={`border rounded-xl p-4 ${balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
        <p className={`text-sm mb-1 ${balance >= 0 ? 'text-green-600' : 'text-orange-600'}`}>잔액</p>
        <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>{formatWon(balance)}</p>
      </div>
    </div>
  )
}

'use client'

interface CategoryItem {
  name: string
  amount: number
  count: number
  color: string
}

interface Props {
  data: CategoryItem[]
}

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

export default function CategoryChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">카테고리별 데이터가 없습니다.</p>
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const percentage = total > 0 ? (item.amount / total) * 100 : 0
        return (
          <div key={item.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-sm text-gray-500">
                {formatWon(item.amount)} ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="h-3 rounded-full"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

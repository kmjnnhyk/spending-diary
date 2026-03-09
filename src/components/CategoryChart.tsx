'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

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
    return <p className="text-muted-foreground text-sm">카테고리별 데이터가 없습니다.</p>
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const percentage = total > 0 ? (item.amount / total) * 100 : 0
        return (
          <Card key={item.name} size="sm" className="border-l-4" style={{ borderLeftColor: item.color }}>
            <CardContent className="py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-sm text-muted-foreground">
                  {formatWon(item.amount)} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

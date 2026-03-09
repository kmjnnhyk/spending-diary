'use client'

import { Card, CardContent } from '@/components/ui/card'

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
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-1">
          <p className="text-sm text-muted-foreground mb-1">수입</p>
          <p className="text-xl font-bold text-blue-600">{formatWon(income)}</p>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="pt-1">
          <p className="text-sm text-muted-foreground mb-1">지출</p>
          <p className="text-xl font-bold text-red-600">{formatWon(expense)}</p>
        </CardContent>
      </Card>
      <Card className={`border-l-4 ${balance >= 0 ? 'border-l-green-500' : 'border-l-orange-500'}`}>
        <CardContent className="pt-1">
          <p className="text-sm text-muted-foreground mb-1">잔액</p>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
            {formatWon(balance)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

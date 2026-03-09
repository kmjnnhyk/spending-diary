'use client'

import { useState } from 'react'
import { manualCategorize } from '@/actions/categorize'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: string
  source: string
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
}

interface Category {
  id: string
  name: string
  color: string | null
  icon: string | null
}

interface Props {
  transaction: Transaction
  categories: Category[]
}

const sourceLabels: Record<string, string> = {
  TOSS: '토스',
  KB: 'KB',
  KAKAOPAY: '카카오페이',
  DANGGEUN: '당근',
  NAVERPAY: '네이버페이',
}

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

export default function ClassifyCard({ transaction, categories }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(transaction.categoryId || '')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClassify = async () => {
    if (!selectedCategoryId) return
    setLoading(true)
    try {
      await manualCategorize(transaction.id, selectedCategoryId)
      setDone(true)
    } catch {
      alert('분류에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    const cat = categories.find((c) => c.id === selectedCategoryId)
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700">
              {transaction.description} &rarr; {cat?.name || '분류됨'}
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-700">완료</Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-muted-foreground shrink-0">
              {new Date(transaction.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
            <span className="text-sm font-medium truncate">{transaction.description}</span>
            <Badge variant="outline" className="shrink-0">
              {sourceLabels[transaction.source] || transaction.source}
            </Badge>
          </div>
          <span className={`text-sm font-medium shrink-0 ml-2 ${transaction.type === 'INCOME' ? 'text-blue-600' : 'text-red-600'}`}>
            {transaction.type === 'INCOME' ? '+' : '-'}{formatWon(transaction.amount)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCategoryId} onValueChange={(v) => setSelectedCategoryId(v ?? '')}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="카테고리 선택...">
                {selectedCategoryId
                  ? (() => {
                      const cat = categories.find(c => c.id === selectedCategoryId)
                      return cat ? `${cat.icon ? cat.icon + ' ' : ''}${cat.name}` : '카테고리 선택...'
                    })()
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleClassify}
            disabled={!selectedCategoryId || loading}
            size="default"
          >
            {loading ? '...' : '분류'}
          </Button>
        </div>
        {transaction.categoryName && (
          <p className="text-xs text-muted-foreground">
            AI 추천:{' '}
            <Badge
              variant="secondary"
              className="text-xs"
              style={{
                backgroundColor: (transaction.categoryColor || '#888') + '20',
                color: transaction.categoryColor || '#888',
              }}
            >
              {transaction.categoryName}
            </Badge>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

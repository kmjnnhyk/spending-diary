'use client'

import { useState } from 'react'
import { manualCategorize } from '@/actions/categorize'

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
      <div className="border rounded-xl p-4 bg-green-50 border-green-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-green-700">
            {transaction.description} &rarr; {cat?.name || '분류됨'}
          </span>
          <span className="text-xs text-green-600">완료</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {new Date(transaction.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </span>
          <span className="text-sm font-medium">{transaction.description}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {sourceLabels[transaction.source] || transaction.source}
          </span>
        </div>
        <span className={`text-sm font-medium ${transaction.type === 'INCOME' ? 'text-blue-600' : 'text-red-600'}`}>
          {transaction.type === 'INCOME' ? '+' : '-'}{formatWon(transaction.amount)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">카테고리 선택...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleClassify}
          disabled={!selectedCategoryId || loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '...' : '분류'}
        </button>
      </div>
      {transaction.categoryName && (
        <p className="mt-2 text-xs text-gray-400">
          AI 추천: <span
            className="px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: (transaction.categoryColor || '#888') + '20',
              color: transaction.categoryColor || '#888',
            }}
          >{transaction.categoryName}</span>
        </p>
      )}
    </div>
  )
}

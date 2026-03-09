'use client'

import { useState } from 'react'
import { saveTransactions } from '@/actions/parse'

interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  originalDescription: string
}

interface Props {
  imageId: string
  transactions: ParsedTransaction[]
  source: string
  onSaved?: () => void
}

export default function ParsedTransactions({ imageId, transactions, source, onSaved }: Props) {
  const [items, setItems] = useState(transactions)
  const [saving, setSaving] = useState(false)

  const handleRemove = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveTransactions(imageId, items)
    setSaving(false)
    if (result.success) {
      onSaved?.()
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{'\ud30c\uc2f1 \uacb0\uacfc'} ({items.length}{'\uac74'})</h2>
      <div className="space-y-2">
        {items.map((t, i) => (
          <div key={i} className="flex items-center justify-between border rounded-lg p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{t.date}</span>
                <span className="font-medium">{t.description}</span>
              </div>
              <div className="text-xs text-gray-400">{t.originalDescription}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={t.type === 'INCOME' ? 'text-blue-600' : 'text-red-600'}>
                {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()}{'\uc6d0'}
              </span>
              <button onClick={() => handleRemove(i)} className="text-gray-400 hover:text-red-500">
                {'\u2715'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving || items.length === 0}
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? '\uc800\uc7a5 \uc911...' : `${items.length}\uac74 \uc800\uc7a5`}
      </button>
    </div>
  )
}

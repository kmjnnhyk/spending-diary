'use client'

import { useState } from 'react'
import { uploadImage } from '@/actions/upload'

const sourceLabels = {
  TOSS: '\ud1a0\uc2a4',
  KB: '\uad6d\ubbfc\uc740\ud589',
  KAKAOPAY: '\uce74\uce74\uc624\ud398\uc774',
  DANGGEUN: '\ub2f9\uadfc\ud398\uc774',
  NAVERPAY: '\ub124\uc774\ubc84\ud398\uc774',
} as const

type SourceKey = keyof typeof sourceLabels

interface Props {
  year: number
  month: number
  onUploaded?: (imageId: string) => void
}

export default function ImageUploader({ year, month, onUploaded }: Props) {
  const [source, setSource] = useState<SourceKey>('TOSS')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('year', String(year))
    formData.set('month', String(month))

    const result = await uploadImage(formData)
    setUploading(false)

    if (result.success && result.imageId) {
      onUploaded?.(result.imageId)
      setPreview(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">{'\uc18c\uc2a4'}</label>
        <select
          name="source"
          value={source}
          onChange={(e) => setSource(e.target.value as SourceKey)}
          className="w-full border rounded-lg px-3 py-2"
        >
          {Object.entries(sourceLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{'\uc774\ubbf8\uc9c0'}</label>
        <input
          type="file"
          name="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full"
          required
        />
      </div>
      {preview && (
        <img src={preview} alt="preview" className="max-h-64 rounded-lg border" />
      )}
      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? '\uc5c5\ub85c\ub4dc \uc911...' : '\uc5c5\ub85c\ub4dc'}
      </button>
    </form>
  )
}

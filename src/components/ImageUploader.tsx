'use client'

import { useState } from 'react'
import { uploadImage } from '@/actions/upload'

const sourceLabels = {
  TOSS: '토스',
  KB: '국민은행',
  KAKAOPAY: '카카오페이',
  DANGGEUN: '당근페이',
  NAVERPAY: '네이버페이',
} as const

type SourceKey = keyof typeof sourceLabels

interface UploadResult {
  imageId: string
  monthId: string
  fileName: string
}

interface Props {
  year: number
  month: number
  onUploaded?: (results: UploadResult[]) => void
}

export default function ImageUploader({ year, month, onUploaded }: Props) {
  const [source, setSource] = useState<SourceKey>('TOSS')
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles(selected)
    setPreviews(selected.map((f) => URL.createObjectURL(f)))
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setFiles(files.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (files.length === 0) return

    setUploading(true)
    setProgress({ current: 0, total: files.length })

    const results: UploadResult[] = []

    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length })

      const formData = new FormData()
      formData.set('file', files[i])
      formData.set('source', source)
      formData.set('year', String(year))
      formData.set('month', String(month))

      const result = await uploadImage(formData)
      if (result.success && result.imageId && result.monthId) {
        results.push({
          imageId: result.imageId,
          monthId: result.monthId,
          fileName: files[i].name,
        })
      }
    }

    setUploading(false)
    setProgress(null)

    if (results.length > 0) {
      onUploaded?.(results)
      previews.forEach((p) => URL.revokeObjectURL(p))
      setFiles([])
      setPreviews([])
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">소스</label>
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
        <label className="block text-sm font-medium mb-1">이미지 (여러 장 선택 가능)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="w-full"
          required
        />
      </div>
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group">
              <img src={src} alt={`preview-${i}`} className="h-32 w-full object-cover rounded-lg border" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                {files[i].name.length > 15 ? files[i].name.slice(0, 12) + '...' : files[i].name}
              </span>
            </div>
          ))}
        </div>
      )}
      {progress && (
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 text-center">
            {progress.current}/{progress.total} 업로드 중...
          </p>
        </div>
      )}
      <button
        type="submit"
        disabled={uploading || files.length === 0}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? '업로드 중...' : `${files.length}장 업로드`}
      </button>
    </form>
  )
}

'use client'

import { useCallback, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Props {
  sourceKey: string
  label: string
  icon: string
  files: File[]
  onFilesChange: (files: File[]) => void
}

export default function SourceUploadCard({ sourceKey, label, icon, files, onFilesChange }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previews = files.map((f) => URL.createObjectURL(f))

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const dropped = Array.from(e.dataTransfer.files).filter((f) =>
        ['image/png', 'image/jpeg', 'image/webp'].includes(f.type)
      )
      if (dropped.length > 0) {
        onFilesChange([...files, ...dropped])
      }
    },
    [files, onFilesChange]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length > 0) {
      onFilesChange([...files, ...selected])
    }
    // Reset input so selecting same file again works
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span>{label}</span>
        </CardTitle>
        {files.length > 0 && (
          <Badge variant="secondary">{files.length}장</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-sm text-muted-foreground">
            {isDragging ? '여기에 놓으세요' : '클릭하거나 이미지를 드래그하세요'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WebP</p>
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {files.map((file, i) => (
              <div key={`${sourceKey}-${i}`} className="relative group">
                <img
                  src={previews[i]}
                  alt={file.name}
                  className="h-20 w-full object-cover rounded-md border"
                />
                <Button
                  variant="destructive"
                  size="icon-xs"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(i)
                  }}
                >
                  <span className="text-xs">X</span>
                </Button>
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded-b-md truncate">
                  {file.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

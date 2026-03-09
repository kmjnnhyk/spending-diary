'use client'

import { useState, useCallback } from 'react'
import { uploadImage } from '@/actions/upload'
import { analyzeAll } from '@/actions/analyze'
import SourceUploadCard from './SourceUploadCard'
import AnalysisProgress from './AnalysisProgress'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

const SOURCES = [
  { key: 'TOSS', label: '토스', icon: '💙' },
  { key: 'KB', label: '국민은행', icon: '⭐' },
  { key: 'KAKAOPAY', label: '카카오페이', icon: '💛' },
  { key: 'DANGGEUN', label: '당근페이', icon: '🥕' },
  { key: 'NAVERPAY', label: '네이버페이', icon: '💚' },
] as const

type SourceKey = typeof SOURCES[number]['key']

interface AnalysisResult {
  parseResults: Array<{ source: string; count: number; error?: string }>
  totalParsed: number
  duplicatesRemoved: number
  payMatched: number
  saved: number
  categorized: number
  pendingClassification: number
}

interface Props {
  year: number
  month: number
}

export default function UploadFlow({ year, month }: Props) {
  const [selectedYear, setSelectedYear] = useState(year)
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [filesBySource, setFilesBySource] = useState<Record<string, File[]>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState<'uploading' | 'parsing' | 'matching' | 'categorizing' | 'done'>('uploading')
  const [sourceProgress, setSourceProgress] = useState<Array<{
    source: string
    label: string
    status: 'pending' | 'parsing' | 'done' | 'error'
    count?: number
    error?: string
  }>>([])
  const [overallProgress, setOverallProgress] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalFiles = Object.values(filesBySource).reduce((sum, files) => sum + files.length, 0)

  const updateFilesForSource = useCallback((sourceKey: string, files: File[]) => {
    setFilesBySource((prev) => ({
      ...prev,
      [sourceKey]: files,
    }))
  }, [])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    // Initialize source progress
    const activeSources = SOURCES.filter((s) => (filesBySource[s.key]?.length || 0) > 0)
    setSourceProgress(
      activeSources.map((s) => ({
        source: s.key,
        label: s.label,
        status: 'pending' as const,
      }))
    )

    try {
      // Step 1: Upload all files
      setAnalysisStep('uploading')
      const uploadedImages: Array<{ imageId: string; source: string; filePath: string }> = []
      let monthId = ''
      let uploadCount = 0
      const totalFileCount = activeSources.reduce((sum, s) => sum + (filesBySource[s.key]?.length || 0), 0)

      for (const source of activeSources) {
        const files = filesBySource[source.key] || []
        setSourceProgress((prev) =>
          prev.map((sp) =>
            sp.source === source.key ? { ...sp, status: 'parsing' as const } : sp
          )
        )

        for (const file of files) {
          const formData = new FormData()
          formData.set('file', file)
          formData.set('source', source.key)
          formData.set('year', String(selectedYear))
          formData.set('month', String(selectedMonth))

          const uploadResult = await uploadImage(formData)
          if (uploadResult.success && uploadResult.imageId && uploadResult.monthId && uploadResult.filePath) {
            monthId = uploadResult.monthId
            uploadedImages.push({
              imageId: uploadResult.imageId,
              source: source.key,
              filePath: uploadResult.filePath,
            })
          }

          uploadCount++
          setOverallProgress(Math.round((uploadCount / totalFileCount) * 30))
        }

        setSourceProgress((prev) =>
          prev.map((sp) =>
            sp.source === source.key
              ? { ...sp, status: 'done' as const, count: files.length }
              : sp
          )
        )
      }

      if (!monthId || uploadedImages.length === 0) {
        setError('업로드에 실패했습니다.')
        setIsAnalyzing(false)
        return
      }

      // Step 2: Run full analysis
      setAnalysisStep('parsing')
      setOverallProgress(40)

      // Reset source progress for parsing phase
      setSourceProgress(
        activeSources.map((s) => ({
          source: s.key,
          label: s.label,
          status: 'pending' as const,
        }))
      )

      setOverallProgress(50)
      setAnalysisStep('matching')
      setOverallProgress(60)
      setAnalysisStep('categorizing')
      setOverallProgress(80)

      const analysisResult = await analyzeAll({
        monthId,
        images: uploadedImages,
      })

      // Update source progress with parse results
      setSourceProgress(
        activeSources.map((s) => {
          const pr = analysisResult.parseResults.find((r) => r.source === s.key)
          return {
            source: s.key,
            label: s.label,
            status: pr?.error ? ('error' as const) : ('done' as const),
            count: pr?.count,
            error: pr?.error,
          }
        })
      )

      setOverallProgress(100)
      setAnalysisStep('done')
      setResult(analysisResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setFilesBySource({})
    setIsAnalyzing(false)
    setResult(null)
    setError(null)
    setOverallProgress(0)
    setSourceProgress([])
  }

  const navigateMonth = (direction: -1 | 1) => {
    let newMonth = selectedMonth + direction
    let newYear = selectedYear
    if (newMonth === 0) {
      newMonth = 12
      newYear--
    } else if (newMonth === 13) {
      newMonth = 1
      newYear++
    }
    setSelectedYear(newYear)
    setSelectedMonth(newMonth)
  }

  // Show results if analysis is done
  if (result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">내역 업로드</h1>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              분석 완료
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">파싱된 거래</span>
                <span className="font-medium">{result.totalParsed}건</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">중복 제거</span>
                <span className="font-medium">{result.duplicatesRemoved}건</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">페이 매칭</span>
                <Badge variant="secondary">{result.payMatched}건</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">저장된 거래</span>
                <span className="font-medium">{result.saved}건</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">자동 분류</span>
                <Badge variant="secondary">{result.categorized}건</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">수동 분류 필요</span>
                <Badge variant="outline">{result.pendingClassification}건</Badge>
              </div>
            </div>

            {result.parseResults.some((r) => r.error) && (
              <>
                <Separator />
                <div className="space-y-1">
                  {result.parseResults
                    .filter((r) => r.error)
                    .map((r, i) => (
                      <p key={i} className="text-sm text-red-600">
                        {r.source}: {r.error}
                      </p>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          {result.pendingClassification > 0 && (
            <Button
              size="lg"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              render={<a href="/classify" />}
            >
              분류 페이지로 이동 ({result.pendingClassification}건 대기)
            </Button>
          )}
          <Button size="lg" className="w-full" render={<a href="/transactions" />}>
            거래 내역 보기
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={handleReset}>
            추가 업로드
          </Button>
        </div>
      </div>
    )
  }

  // Show analysis progress
  if (isAnalyzing) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">내역 업로드</h1>
        <AnalysisProgress
          step={analysisStep}
          sourceProgress={sourceProgress}
          overallProgress={overallProgress}
        />
      </div>
    )
  }

  // Show upload form
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">내역 업로드</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => navigateMonth(-1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Button>
          <span className="text-sm font-semibold min-w-[100px] text-center">
            {selectedYear}년 {selectedMonth}월
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => navigateMonth(1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SOURCES.map((source) => (
          <SourceUploadCard
            key={source.key}
            sourceKey={source.key}
            label={source.label}
            icon={source.icon}
            files={filesBySource[source.key] || []}
            onFilesChange={(files) => updateFilesForSource(source.key, files)}
          />
        ))}
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={totalFiles === 0}
        onClick={handleAnalyze}
      >
        {totalFiles > 0
          ? `전체 분석 시작 (${totalFiles}장)`
          : '소스별로 이미지를 선택하세요'}
      </Button>
    </div>
  )
}

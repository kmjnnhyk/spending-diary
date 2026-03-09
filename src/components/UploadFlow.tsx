'use client'

import { useState, useCallback, useEffect } from 'react'
import ImageUploader from './ImageUploader'
import ParsedTransactions from './ParsedTransactions'
import { parseImage } from '@/actions/parse'
import { matchPayTransactions } from '@/actions/match-pay'
import { autoCategorize } from '@/actions/categorize'

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7

const STEPS: Record<Step, { label: string; description: string }> = {
  1: { label: '업로드', description: '이미지를 선택하고 업로드하세요 (여러 장 가능)' },
  2: { label: '파싱 중', description: 'Claude AI가 거래 내역을 분석하고 있습니다...' },
  3: { label: '확인', description: '파싱된 거래 내역을 확인하세요' },
  4: { label: '저장 중', description: '거래 내역을 저장하고 있습니다...' },
  5: { label: '페이 매칭', description: '페이 거래를 매칭하고 있습니다...' },
  6: { label: '자동 분류', description: '카테고리를 자동 분류하고 있습니다...' },
  7: { label: '완료', description: '모든 처리가 완료되었습니다' },
}

interface ParsedTx {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  originalDescription: string
}

interface ImageParsed {
  imageId: string
  source: string
  fileName: string
  transactions: ParsedTx[]
}

interface MatchResult {
  matched: number
  unmatched: Array<{ bankId: string; paySource: string; description: string }>
}

interface CategorizeResult {
  categorized: number
  pending: number
}

interface Props {
  year: number
  month: number
}

export default function UploadFlow({ year, month }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)
  const [monthId, setMonthId] = useState<string | null>(null)

  // Step 2: parsing progress
  const [parseProgress, setParseProgress] = useState<{ current: number; total: number } | null>(null)

  // Step 3: all parsed results grouped by image
  const [parsedImages, setParsedImages] = useState<ImageParsed[]>([])

  // Step 5-6 results
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [categorizeResult, setCategorizeResult] = useState<CategorizeResult | null>(null)

  // total transaction count after save
  const [savedCount, setSavedCount] = useState(0)

  const handleUploaded = useCallback(async (results: Array<{ imageId: string; monthId: string; fileName: string }>) => {
    if (results.length === 0) return

    setMonthId(results[0].monthId)
    setError(null)

    // Step 2: Parse all images
    setStep(2)
    setParseProgress({ current: 0, total: results.length })

    const allParsed: ImageParsed[] = []

    for (let i = 0; i < results.length; i++) {
      setParseProgress({ current: i + 1, total: results.length })

      try {
        const result = await parseImage(results[i].imageId)
        if (result.error) {
          setError(`${results[i].fileName}: ${result.error}`)
          continue
        }
        allParsed.push({
          imageId: results[i].imageId,
          source: result.source || '',
          fileName: results[i].fileName,
          transactions: result.transactions || [],
        })
      } catch (e) {
        setError(`${results[i].fileName}: ${e instanceof Error ? e.message : '파싱 오류'}`)
      }
    }

    setParseProgress(null)

    if (allParsed.length === 0) {
      setError('모든 이미지 파싱에 실패했습니다')
      setStep(1)
      return
    }

    setParsedImages(allParsed)
    setStep(3)
  }, [])

  const handleAllSaved = useCallback(async () => {
    if (!monthId) {
      setError('월 정보가 없습니다')
      return
    }

    // Step 5: Pay Matching
    setStep(5)
    try {
      const result = await matchPayTransactions(monthId)
      setMatchResult(result)
    } catch {
      setMatchResult({ matched: 0, unmatched: [] })
    }

    // Step 6: Auto Categorize
    setStep(6)
    try {
      const result = await autoCategorize(monthId)
      setCategorizeResult(result)
    } catch {
      setCategorizeResult({ categorized: 0, pending: 0 })
    }

    setStep(7)
  }, [monthId])

  // Track how many images have been saved
  const [savedImageCount, setSavedImageCount] = useState(0)

  const handleImageSaved = useCallback((_imageIndex: number, count: number) => {
    setSavedCount((prev) => prev + count)
    setSavedImageCount((prev) => prev + 1)
  }, [])

  // When all images are saved, proceed to pay matching
  useEffect(() => {
    if (savedImageCount > 0 && savedImageCount >= parsedImages.length) {
      setStep(4)
      handleAllSaved()
    }
  }, [savedImageCount, parsedImages.length, handleAllSaved])

  const handleReset = () => {
    setStep(1)
    setError(null)
    setMonthId(null)
    setParsedImages([])
    setMatchResult(null)
    setCategorizeResult(null)
    setParseProgress(null)
    setSavedCount(0)
    setSavedImageCount(0)
  }

  const totalParsedCount = parsedImages.reduce((sum, img) => sum + img.transactions.length, 0)

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5, 6, 7] as Step[]).map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? 'bg-blue-600 text-white'
                  : s < step
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 7 && (
              <div className={`w-6 h-0.5 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Label */}
      <div>
        <h2 className="text-lg font-semibold">
          {step}/7: {STEPS[step].label}
        </h2>
        <p className="text-sm text-gray-500">{STEPS[step].description}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">오류</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <ImageUploader year={year} month={month} onUploaded={handleUploaded} />
      )}

      {/* Step 2: Parsing */}
      {step === 2 && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          {parseProgress && (
            <>
              <p className="text-gray-600">
                AI가 이미지를 분석하고 있습니다... ({parseProgress.current}/{parseProgress.total})
              </p>
              <div className="w-64 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(parseProgress.current / parseProgress.total) * 100}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Preview all parsed results */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-sm text-gray-500">
            총 {parsedImages.length}개 이미지에서 {totalParsedCount}건의 거래 내역이 파싱되었습니다.
          </div>
          {parsedImages.map((img, idx) => (
            <div key={img.imageId} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{img.source}</span>
                <span className="text-sm font-medium">{img.fileName}</span>
                <span className="text-xs text-gray-400">{img.transactions.length}건</span>
              </div>
              <ParsedTransactions
                imageId={img.imageId}
                transactions={img.transactions}
                source={img.source}
                onSaved={() => handleImageSaved(idx, img.transactions.length)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Step 4: Saving */}
      {step === 4 && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">거래 내역을 처리하고 있습니다...</p>
        </div>
      )}

      {/* Step 5: Pay Matching */}
      {step === 5 && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">페이 거래를 매칭하고 있습니다...</p>
        </div>
      )}

      {/* Step 6: Auto Categorize */}
      {step === 6 && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">카테고리를 자동 분류하고 있습니다...</p>
        </div>
      )}

      {/* Step 7: Done */}
      {step === 7 && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">처리 완료</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">업로드 이미지</span>
                <span className="font-medium">{parsedImages.length}장</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">저장된 거래</span>
                <span className="font-medium">{savedCount}건</span>
              </div>
              {matchResult && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">페이 매칭 성공</span>
                    <span className="font-medium text-green-600">{matchResult.matched}건</span>
                  </div>
                  {matchResult.unmatched.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">페이 매칭 실패</span>
                      <span className="font-medium text-orange-600">{matchResult.unmatched.length}건</span>
                    </div>
                  )}
                </>
              )}
              {categorizeResult && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">자동 분류 완료</span>
                    <span className="font-medium text-green-600">{categorizeResult.categorized}건</span>
                  </div>
                  {categorizeResult.pending > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">수동 분류 필요</span>
                      <span className="font-medium text-orange-600">{categorizeResult.pending}건</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {categorizeResult && categorizeResult.pending > 0 && (
              <a
                href="/classify"
                className="block w-full text-center bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700"
              >
                분류 페이지로 이동 ({categorizeResult.pending}건 대기)
              </a>
            )}
            <a
              href="/transactions"
              className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              거래 내역 보기
            </a>
            <button
              onClick={handleReset}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
            >
              추가 업로드
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

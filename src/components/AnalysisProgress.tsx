'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface SourceProgress {
  source: string
  label: string
  status: 'pending' | 'parsing' | 'done' | 'error'
  count?: number
  error?: string
}

interface Props {
  step: 'uploading' | 'parsing' | 'matching' | 'categorizing' | 'done'
  sourceProgress: SourceProgress[]
  overallProgress: number
}

const stepLabels: Record<string, string> = {
  uploading: '이미지 업로드 중...',
  parsing: 'AI가 거래 내역을 분석하고 있습니다...',
  matching: '페이 거래를 교차 검증하고 있습니다...',
  categorizing: '카테고리를 자동 분류하고 있습니다...',
  done: '분석 완료',
}

export default function AnalysisProgress({ step, sourceProgress, overallProgress }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {step !== 'done' && (
            <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          <span>{stepLabels[step]}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={overallProgress} />

        <div className="space-y-2">
          {sourceProgress.map((sp) => (
            <div key={sp.source} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{sp.label}</span>
              <div className="flex items-center gap-2">
                {sp.status === 'parsing' && (
                  <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
                {sp.status === 'done' && sp.count !== undefined && (
                  <Badge variant="secondary">{sp.count}건</Badge>
                )}
                {sp.status === 'error' && (
                  <Badge variant="destructive">오류</Badge>
                )}
                {sp.status === 'pending' && (
                  <span className="text-xs text-muted-foreground">대기 중</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

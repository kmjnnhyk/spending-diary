'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  currentYear: number
  currentMonth: number
}

export default function MonthSelector({ currentYear, currentMonth }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const navigate = (year: number, month: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(year))
    params.set('month', String(month))
    router.push(`?${params.toString()}`)
  }

  const prev = () => {
    if (currentMonth === 1) navigate(currentYear - 1, 12)
    else navigate(currentYear, currentMonth - 1)
  }

  const next = () => {
    if (currentMonth === 12) navigate(currentYear + 1, 1)
    else navigate(currentYear, currentMonth + 1)
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={prev}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </Button>
      <span className="text-sm font-semibold min-w-[100px] text-center">
        {currentYear}년 {currentMonth}월
      </span>
      <Button variant="outline" size="icon-sm" onClick={next}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </Button>
    </div>
  )
}

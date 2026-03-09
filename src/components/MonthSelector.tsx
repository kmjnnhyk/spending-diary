'use client'

import { useRouter } from 'next/navigation'

interface Props {
  currentYear: number
  currentMonth: number
}

export default function MonthSelector({ currentYear, currentMonth }: Props) {
  const router = useRouter()

  const navigate = (year: number, month: number) => {
    router.push(`?year=${year}&month=${month}`)
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
    <div className="flex items-center gap-4">
      <button onClick={prev} className="p-2 hover:bg-gray-100 rounded-lg">&lt;</button>
      <span className="text-lg font-semibold">
        {currentYear}년 {currentMonth}월
      </span>
      <button onClick={next} className="p-2 hover:bg-gray-100 rounded-lg">&gt;</button>
    </div>
  )
}

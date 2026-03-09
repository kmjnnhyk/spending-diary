'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

const sourceLabels: Record<string, string> = {
  TOSS: '토스',
  KB: 'KB',
  KAKAOPAY: '카카오페이',
  DANGGEUN: '당근',
  NAVERPAY: '네이버페이',
}

interface Props {
  baseQuery: string
  currentSource?: string
  currentSearch?: string
}

export default function TransactionFilters({ baseQuery, currentSource, currentSearch }: Props) {
  return (
    <>
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href={`/transactions?${baseQuery}`}
          className={cn(buttonVariants({ variant: !currentSource ? 'default' : 'outline', size: 'sm' }))}
        >
          전체
        </Link>
        {Object.entries(sourceLabels).map(([key, label]) => (
          <Link
            key={key}
            href={`/transactions?${baseQuery}&source=${key}${currentSearch ? `&search=${currentSearch}` : ''}`}
            className={cn(buttonVariants({ variant: currentSource === key ? 'default' : 'outline', size: 'sm' }))}
          >
            {label}
          </Link>
        ))}
      </div>

      <form className="mb-6">
        <input type="hidden" name="year" value={baseQuery.split('&')[0]?.split('=')[1]} />
        <input type="hidden" name="month" value={baseQuery.split('&')[1]?.split('=')[1]} />
        {currentSource && <input type="hidden" name="source" value={currentSource} />}
        <input
          type="text"
          name="search"
          defaultValue={currentSearch || ''}
          placeholder="거래 내역 검색..."
          className="w-full border border-input rounded-lg px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>
    </>
  )
}

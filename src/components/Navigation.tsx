'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { href: '/', label: '대시보드' },
  { href: '/upload', label: '업로드' },
  { href: '/transactions', label: '거래 내역' },
  { href: '/classify', label: '분류' },
  { href: '/report', label: '리포트' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2.5"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
            가계부
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                size="sm"
                render={<Link href={item.href} />}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

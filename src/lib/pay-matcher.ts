const PAY_KEYWORDS: Record<string, string> = {
  '카카오페이': 'KAKAOPAY',
  'KAKAOPAY': 'KAKAOPAY',
  '네이버페이': 'NAVERPAY',
  'NV페이': 'NAVERPAY',
  'NAVERPAY': 'NAVERPAY',
  '당근페이': 'DANGGEUN',
  '당근마켓': 'DANGGEUN',
  '토스페이': 'TOSSPAY',
}

export function detectPaySource(description: string): string | null {
  for (const [keyword, source] of Object.entries(PAY_KEYWORDS)) {
    if (description.includes(keyword)) {
      return source
    }
  }
  return null
}

export function isAmountMatch(bankAmount: number, payAmount: number, tolerance = 0): boolean {
  return Math.abs(bankAmount - payAmount) <= tolerance
}

export function isDateMatch(bankDate: Date, payDate: Date): boolean {
  return (
    bankDate.getFullYear() === payDate.getFullYear() &&
    bankDate.getMonth() === payDate.getMonth() &&
    bankDate.getDate() === payDate.getDate()
  )
}

const REFUND_KEYWORDS = ['환불', '취소', '결제취소', '반품', '캔슬']

export function isRefundTransaction(description: string): boolean {
  return REFUND_KEYWORDS.some(keyword => description.includes(keyword))
}

const INTERNAL_TRANSFER_PATTERNS = [
  '토뱅 김진혁',
  '김진혁',
]

export function isInternalTransfer(description: string, source: string): boolean {
  // KB → 토스 이체 (급여통장 → 생활통장)
  if (source === 'KB' && description.includes('토스') && !description.includes('페이')) {
    return true
  }
  // 본인 이름으로 이체
  return INTERNAL_TRANSFER_PATTERNS.some(pattern => description.includes(pattern))
}

export function isPersonalTransfer(description: string): boolean {
  // Detect patterns like personal names (2-4 Korean chars) without business indicators
  // This is a heuristic - Claude API flags are more reliable
  const hasBusinessKeyword = /주식회사|㈜|\(주\)|서비스|마트|편의점|카페|식당/.test(description)
  if (hasBusinessKeyword) return false

  // Pure Korean name pattern (2-4 chars, no other text)
  const pureNamePattern = /^[가-힣]{2,4}$/
  return pureNamePattern.test(description.trim())
}

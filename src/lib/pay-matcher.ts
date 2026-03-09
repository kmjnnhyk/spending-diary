const PAY_KEYWORDS: Record<string, string> = {
  '\uce74\uce74\uc624\ud398\uc774': 'KAKAOPAY',
  'KAKAOPAY': 'KAKAOPAY',
  '\ub124\uc774\ubc84\ud398\uc774': 'NAVERPAY',
  'NV\ud398\uc774': 'NAVERPAY',
  'NAVERPAY': 'NAVERPAY',
  '\ub2f9\uadfc\ud398\uc774': 'DANGGEUN',
  '\ub2f9\uadfc\ub9c8\ucf13': 'DANGGEUN',
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

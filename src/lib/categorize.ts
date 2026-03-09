import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface TransactionForCategorization {
  id: string
  description: string
  amount: number
  type: string
  source?: string
}

interface CategoryResult {
  transactionId: string
  category: string
  confidence: 'high' | 'low'
}

export async function classifyTransactions(
  transactions: TransactionForCategorization[],
  categoryNames: string[]
): Promise<CategoryResult[]> {
  if (transactions.length === 0) return []

  const transactionList = transactions
    .map((t) => `- ID: ${t.id} | ${t.description} | ${t.amount.toLocaleString()}원 | ${t.type}${t.source ? ` | ${t.source}` : ''}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `다음 거래 내역들을 카테고리로 분류해주세요.

사용 가능한 카테고리: ${categoryNames.join(', ')}

분류 가이드:
- 쿠팡, FBS출금 쿠팡: "쿠팡" 카테고리
- 세븐일레븐, CU, GS25, 이마트24 등: "편의점" 카테고리
- 코원에너지서비스, 가스, 전기, 수도: "공과금" 카테고리
- Apple Services, 네이버플러스 멤버십: "구독/멤버십" 카테고리
- 카카오모빌리티, 택시, 버스, 지하철: "교통" 카테고리
- KREAM, 영화, 공연: "여가/문화" 카테고리
- 당근마켓 판매 수입: "중고판매" 카테고리 (없으면 "기타")
- 개인에게 송금한 내역 (정산 등): confidence를 반드시 "low"로 설정
- 판단이 어려운 내역: confidence를 반드시 "low"로 설정

거래 내역:
${transactionList}

각 거래에 대해 JSON 배열로 반환:
[
  { "transactionId": "ID값", "category": "카테고리명", "confidence": "high" 또는 "low" }
]

- 확실한 분류: confidence "high"
- 애매하거나 판단 어려운 경우: confidence "low" (방어적으로 판단하세요)
- JSON 배열만 반환, 다른 텍스트 없이.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
}

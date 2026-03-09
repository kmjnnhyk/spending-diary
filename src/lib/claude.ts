import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import path from 'path'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  originalDescription: string
  flags?: string[]
}

const SOURCE_PROMPTS: Record<string, string> = {
  TOSS: `이 이미지는 토스 은행의 거래 내역 스크린샷입니다.

파싱 규칙:
- 다섯 번째 열(거래내용)을 description으로 사용하세요. 두 번째 열(구분)은 사용하지 마세요.
- "토뱅 김진혁" 또는 본인 이름으로의 이체는 내부 이체이므로 flags에 "INTERNAL_TRANSFER"를 추가하세요.
- "카카오페이", "네이버페이", "NV페이", "토스페이" 등 페이 서비스 충전/결제 내역은 flags에 "PAY_CHARGE"를 추가하세요.
- "환불", "취소", "결제취소" 키워드가 있으면 flags에 "REFUND"를 추가하세요.
- 개인 이름으로의 송금(정산 성격)은 flags에 "PERSONAL_TRANSFER"를 추가하세요.
- FBS출금, CMS출금 등은 자동이체 출금입니다.`,

  KB: `이 이미지는 국민은행의 거래 내역 스크린샷입니다.

파싱 규칙:
- 국민은행은 사용자의 급여 통장입니다. 토스로 이체하는 내역은 내부 이체(급여통장→생활통장)이므로 flags에 "INTERNAL_TRANSFER"를 추가하세요.
- "김진혁" 본인 이름으로의 이체도 내부 이체입니다.
- "카카오페이", "네이버페이", "NV페이" 충전 내역은 flags에 "PAY_CHARGE"를 추가하세요. 해당 페이 서비스의 상세 내역에서 실제 지출을 확인해야 합니다.
- "환불", "취소", "결제취소" 키워드가 있으면 flags에 "REFUND"를 추가하세요.
- 개인 이름으로의 송금은 flags에 "PERSONAL_TRANSFER"를 추가하세요.`,

  KAKAOPAY: `이 이미지는 카카오페이의 거래 내역 스크린샷입니다.

파싱 규칙:
- 카카오페이의 실제 결제 상세 내역을 추출하세요.
- "카카오모빌리티"는 택시/교통 서비스입니다.
- "환불", "취소", "결제취소" 키워드가 있으면 flags에 "REFUND"를 추가하세요.
- 충전 내역은 제외하세요 (은행에서 이미 기록됨).`,

  NAVERPAY: `이 이미지는 네이버페이의 거래 내역 스크린샷입니다.

파싱 규칙:
- 네이버페이의 실제 결제 상세 내역을 추출하세요.
- "네이버플러스 멤버십" 등 구독 서비스는 구독 카테고리입니다.
- "환불", "취소", "결제취소" 키워드가 있으면 flags에 "REFUND"를 추가하세요.
- 충전 내역은 제외하세요 (은행에서 이미 기록됨).`,

  DANGGEUN: `이 이미지는 당근페이의 거래 내역 스크린샷입니다.

파싱 규칙:
- 당근마켓에서의 판매 수입과 구매 지출을 구분하세요.
- 판매 수입(중고 판매)은 type을 "INCOME"으로 설정하세요.
- "환불", "취소" 키워드가 있으면 flags에 "REFUND"를 추가하세요.`,
}

export async function parseTransactionImage(filePath: string, source: string): Promise<ParsedTransaction[]> {
  const absolutePath = path.join(process.cwd(), filePath)
  const imageBuffer = await readFile(absolutePath)
  const base64Image = imageBuffer.toString('base64')
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const mediaType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp'

  const sourcePrompt = SOURCE_PROMPTS[source] || `이 이미지는 ${source}의 거래 내역 스크린샷입니다.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `${sourcePrompt}

이미지에서 모든 거래 내역을 추출하여 JSON 배열로 반환해주세요.

각 거래는 다음 형식으로:
{
  "date": "YYYY-MM-DD",
  "description": "거래처/설명 (간결하게)",
  "amount": 금액(숫자만, 원 단위),
  "type": "INCOME" 또는 "EXPENSE",
  "originalDescription": "이미지에 표시된 원본 텍스트 그대로",
  "flags": ["해당하는 플래그들"]
}

flags 가능한 값: "INTERNAL_TRANSFER", "PAY_CHARGE", "REFUND", "PERSONAL_TRANSFER"
- 해당 없으면 빈 배열 []

중요:
- 모든 거래를 빠짐없이 추출하세요.
- 금액은 반드시 숫자만 (콤마, 원 제거).
- 날짜가 연도 없이 월/일만 있으면 이미지 컨텍스트에서 연도를 추론하세요.
- 판단이 어려운 거래는 flags를 비워두고 그대로 추출하세요.

JSON 배열만 반환하세요. 다른 텍스트 없이.`,
          },
        ],
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

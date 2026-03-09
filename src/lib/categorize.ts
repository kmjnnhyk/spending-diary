import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface TransactionForCategorization {
  id: string
  description: string
  amount: number
  type: string
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
    .map((t) => `- ID: ${t.id} | ${t.description} | ${t.amount.toLocaleString()}\uc6d0 | ${t.type}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `\ub2e4\uc74c \uac70\ub798 \ub0b4\uc5ed\ub4e4\uc744 \uce74\ud14c\uace0\ub9ac\ub85c \ubd84\ub958\ud574\uc8fc\uc138\uc694.

\uc0ac\uc6a9 \uac00\ub2a5\ud55c \uce74\ud14c\uace0\ub9ac: ${categoryNames.join(', ')}

\uac70\ub798 \ub0b4\uc5ed:
${transactionList}

\uac01 \uac70\ub798\uc5d0 \ub300\ud574 JSON \ubc30\uc5f4\ub85c \ubc18\ud658:
[
  { "transactionId": "ID\uac12", "category": "\uce74\ud14c\uace0\ub9ac\uba85", "confidence": "high" \ub610\ub294 "low" }
]

- \ud655\uc2e4\ud55c \ubd84\ub958: confidence "high"
- \uc560\ub9e4\ud558\uac70\ub098 \ud310\ub2e8 \uc5b4\ub824\uc6b4 \uacbd\uc6b0: confidence "low"
- JSON \ubc30\uc5f4\ub9cc \ubc18\ud658, \ub2e4\ub978 \ud14d\uc2a4\ud2b8 \uc5c6\uc774.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  return JSON.parse(jsonMatch[0])
}

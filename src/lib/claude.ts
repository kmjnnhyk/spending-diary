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
}

export async function parseTransactionImage(filePath: string, source: string): Promise<ParsedTransaction[]> {
  const absolutePath = path.join(process.cwd(), filePath)
  const imageBuffer = await readFile(absolutePath)
  const base64Image = imageBuffer.toString('base64')
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const mediaType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp'

  const sourceNames: Record<string, string> = {
    TOSS: '\ud1a0\uc2a4 \uc740\ud589',
    KB: '\uad6d\ubbfc\uc740\ud589',
    KAKAOPAY: '\uce74\uce74\uc624\ud398\uc774',
    DANGGEUN: '\ub2f9\uadfc\ud398\uc774',
    NAVERPAY: '\ub124\uc774\ubc84\ud398\uc774',
  }

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
            text: `\uc774 \uc774\ubbf8\uc9c0\ub294 ${sourceNames[source] || source}\uc758 \uac70\ub798 \ub0b4\uc5ed \uc2a4\ud06c\ub9b0\uc0f7\uc785\ub2c8\ub2e4.
\uc774\ubbf8\uc9c0\uc5d0\uc11c \ubaa8\ub4e0 \uac70\ub798 \ub0b4\uc5ed\uc744 \ucd94\ucd9c\ud558\uc5ec JSON \ubc30\uc5f4\ub85c \ubc18\ud658\ud574\uc8fc\uc138\uc694.

\uac01 \uac70\ub798\ub294 \ub2e4\uc74c \ud615\uc2dd\uc73c\ub85c:
{
  "date": "YYYY-MM-DD",
  "description": "\uac70\ub798\ucc98/\uc124\uba85 (\uac04\uacb0\ud558\uac8c)",
  "amount": \uae08\uc561(\uc22b\uc790\ub9cc, \uc6d0 \ub2e8\uc704),
  "type": "INCOME" \ub610\ub294 "EXPENSE",
  "originalDescription": "\uc774\ubbf8\uc9c0\uc5d0 \ud45c\uc2dc\ub41c \uc6d0\ubcf8 \ud14d\uc2a4\ud2b8 \uadf8\ub300\ub85c"
}

JSON \ubc30\uc5f4\ub9cc \ubc18\ud658\ud558\uc138\uc694. \ub2e4\ub978 \ud14d\uc2a4\ud2b8 \uc5c6\uc774.`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  return JSON.parse(jsonMatch[0])
}

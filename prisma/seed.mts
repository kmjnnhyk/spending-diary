import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })

const mod = await import('../src/generated/prisma/client.js')
const PrismaClient = mod.PrismaClient
const prisma = new PrismaClient({ adapter })

const categories = [
  { name: '식비', icon: '🍚', color: '#FF6B6B' },
  { name: '카페/간식', icon: '☕', color: '#FFA94D' },
  { name: '교통', icon: '🚌', color: '#FFD43B' },
  { name: '쇼핑', icon: '🛍️', color: '#69DB7C' },
  { name: '생활/마트', icon: '🏠', color: '#4ECDC4' },
  { name: '통신', icon: '📱', color: '#74C0FC' },
  { name: '구독/멤버십', icon: '📺', color: '#748FFC' },
  { name: '의료', icon: '🏥', color: '#B197FC' },
  { name: '교육', icon: '📚', color: '#E599F7' },
  { name: '여가/문화', icon: '🎬', color: '#FCC2D7' },
  { name: '경조사', icon: '💐', color: '#F06595' },
  { name: '이체/송금', icon: '💸', color: '#ADB5BD' },
  { name: '기타', icon: '📌', color: '#868E96' },
]

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log('Categories seeded')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

import { writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexPath = join(__dirname, '..', 'src', 'generated', 'prisma', 'index.ts')

if (!existsSync(indexPath)) {
  writeFileSync(indexPath, 'export * from "./client"\n')
  console.log('Created src/generated/prisma/index.ts')
}

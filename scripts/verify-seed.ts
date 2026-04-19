// scripts/verify-seed.ts
// Verifies that Night 5 seed singletons are in place.
// Run: pnpm tsx scripts/verify-seed.ts
import { PrismaClient, AiFunctionKey } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  let ok = true
  const fail = (msg: string) => { console.error(`FAIL: ${msg}`); ok = false }

  // 1. UserSettings singleton
  const settings = await prisma.userSettings.findUnique({ where: { id: 'singleton' } })
  if (!settings) { fail('UserSettings singleton missing — run pnpm db:seed') }
  else {
    console.log(`UserSettings: theme=${settings.theme} accentHue=${settings.accentHue} density=${settings.density} serif="${settings.serifFamily}"`)
  }

  // 2. Budget singleton
  const budget = await prisma.budget.findFirst()
  if (!budget) { fail('Budget row missing — run pnpm db:seed') }
  else {
    console.log(`Budget: cap=$${budget.monthlyCapUsd.toFixed(2)} spent=$${budget.currentUsageUsd.toFixed(2)} autoDegrade=${budget.autoDegrade}`)
  }

  // 3. ModelConfig — one per AiFunctionKey (11 total)
  const configs = await prisma.modelConfig.findMany({ orderBy: { functionKey: 'asc' } })
  const allKeys = Object.values(AiFunctionKey)
  const missingKeys = allKeys.filter(k => !configs.find(c => c.functionKey === k))
  if (missingKeys.length > 0) { fail(`ModelConfig missing for: ${missingKeys.join(', ')}`) }
  else {
    console.log(`ModelConfig: ${configs.length}/11 functions configured`)
    for (const c of configs) {
      console.log(`  ${c.functionKey.padEnd(24)} model=${c.model} batch=${c.batchEnabled} cache=${c.cacheEnabled} oauth=${c.useOAuthFallback}`)
    }
  }

  // 4. IndexingConfig singleton
  const indexing = await prisma.indexingConfig.findUnique({ where: { id: 'singleton' } })
  if (!indexing) { fail('IndexingConfig singleton missing — run pnpm db:seed') }
  else { console.log(`IndexingConfig: chunkSize=${indexing.chunkSize} model=${indexing.indexModel}`) }

  await prisma.$disconnect()

  if (!ok) {
    console.error('\nSeed verification FAILED. Run: pnpm db:seed')
    process.exit(1)
  }
  console.log('\nSeed verification OK \u2713')
}

main().catch(e => { console.error(e); process.exit(1) })

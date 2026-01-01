import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Helper to ensure SQLite busy_timeout is set
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || 'file:./dev.db'
  if (url.startsWith('file:') && !url.includes('?')) {
    // Add busy_timeout to SQLite connection string for better lock handling
    return `${url}?busy_timeout=5000&journal_mode=WAL`
  }
  return url
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Force reconnect to ensure latest schema is loaded
if (process.env.NODE_ENV === 'development') {
  prisma.$connect().catch(() => {})
  
  // Log available models for debugging
  if (typeof window === 'undefined') {
    const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'))
    console.log('Prisma models available:', models.join(', '))
  }
}


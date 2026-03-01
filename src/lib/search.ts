import { prisma } from './prisma'

export async function searchChunks(repoId: string, query: string, limit = 8) {
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2)

  const chunks = await prisma.chunk.findMany({
    where: {
      repoId,
      OR: keywords.map(keyword => ({
        content: { contains: keyword, mode: 'insensitive' }
      }))
    },
    take: limit
  })

  return chunks
}
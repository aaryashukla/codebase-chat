import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ingestRepo } from '@/lib/ingest'

export async function POST(req: NextRequest) {
  const { url, userId } = await req.json()

  if (!url || !userId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const name = url.split('/').slice(-2).join('/')

  const repo = await prisma.repo.create({
    data: { url, name, userId, status: 'pending' }
  })

  ingestRepo(repo.id, url).catch(console.error)

  return NextResponse.json({ repo })
}
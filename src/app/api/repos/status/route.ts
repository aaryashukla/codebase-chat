import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const repoId = req.nextUrl.searchParams.get('repoId')
  const repo = await prisma.repo.findUnique({ where: { id: repoId! } })
  return NextResponse.json({ status: repo?.status })
}
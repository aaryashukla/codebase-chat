import simpleGit from 'simple-git'
import { readdir, readFile, stat, rm } from 'fs/promises'
import { join, extname } from 'path'
import { prisma } from './prisma'

const ALLOWED_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go',
  '.rs', '.java', '.md', '.json', '.yaml', '.yml'
]

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__']

function chunkText(text: string, filePath: string, maxChars = 1500): string[] {
  const chunks: string[] = []
  const lines = text.split('\n')
  let current = `// File: ${filePath}\n`

  for (const line of lines) {
    if ((current + line).length > maxChars) {
      if (current.trim()) chunks.push(current.trim())
      current = `// File: ${filePath}\n${line}\n`
    } else {
      current += line + '\n'
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}

async function readAllFiles(dir: string): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = []
  const entries = await readdir(dir)

  for (const entry of entries) {
    if (IGNORED_DIRS.includes(entry)) continue

    const fullPath = join(dir, entry)
    const stats = await stat(fullPath)

    if (stats.isDirectory()) {
      const nested = await readAllFiles(fullPath)
      results.push(...nested)
    } else {
      const ext = extname(entry)
      if (!ALLOWED_EXTENSIONS.includes(ext)) continue
      if (stats.size > 100000) continue

      try {
        const content = await readFile(fullPath, 'utf-8')
        results.push({ path: fullPath.replace(dir, ''), content })
      } catch {
        // skip unreadable files
      }
    }
  }

  return results
}

export async function ingestRepo(repoId: string, repoUrl: string) {
  const tmpDir = `./tmp/${repoId}`

  try {
    await prisma.repo.update({
      where: { id: repoId },
      data: { status: 'processing' }
    })

    console.log(`Cloning ${repoUrl}...`)
    await simpleGit().clone(repoUrl, tmpDir, ['--depth', '1'])

    console.log('Reading files...')
    const files = await readAllFiles(tmpDir)
    console.log(`Found ${files.length} files`)

    const allChunks: { filePath: string; content: string }[] = []
    for (const file of files) {
      const chunks = chunkText(file.content, file.path)
      chunks.forEach(content => allChunks.push({ filePath: file.path, content }))
    }

    console.log(`Created ${allChunks.length} chunks, saving...`)

    await prisma.chunk.createMany({
      data: allChunks.map(c => ({
        repoId,
        filePath: c.filePath,
        content: c.content
      }))
    })

    await prisma.repo.update({
      where: { id: repoId },
      data: { status: 'ready' }
    })

    console.log('Ingestion complete!')
  } catch (err) {
    console.error('Ingestion failed:', err)
    await prisma.repo.update({
      where: { id: repoId },
      data: { status: 'failed' }
    })
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}
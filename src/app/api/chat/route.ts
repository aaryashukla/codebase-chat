import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { searchChunks } from '@/lib/search'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { repoId, question, history } = await req.json()

    const chunks = await searchChunks(repoId, question, 8)

    const context = chunks
      .map(c => `### ${c.filePath}\n\`\`\`\n${c.content}\n\`\`\``)
      .join('\n\n')

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are an expert software engineer helping a developer understand a codebase.
You have been given relevant code snippets to answer the user's question.
Always reference specific file paths. Be concise and clear.
If the answer is not in the provided context, say so honestly.`
        },
        ...history,
        {
          role: 'user',
          content: `Relevant code:\n\n${context}\n\n---\n\nQuestion: ${question}`
        }
      ]
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) controller.enqueue(encoder.encode(text))
        }
        controller.close()
      }
    })

    return new NextResponse(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })

  } catch (err: unknown) {
    const error = err as any
    console.error('CHAT ERROR:', error?.message)
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
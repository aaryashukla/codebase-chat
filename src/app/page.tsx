'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('')
  const [repoId, setRepoId] = useState('')
  const [repoName, setRepoName] = useState('')
  const [status, setStatus] = useState('')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!repoId || status === 'ready' || status === 'failed') return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/repos/status?repoId=${repoId}`)
      const data = await res.json()
      setStatus(data.status)
      if (data.status === 'ready' || data.status === 'failed') {
        setIngesting(false)
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [repoId, status])

  async function handleIngest() {
    if (!repoUrl) return
    setIngesting(true)
    setStatus('pending')
    setMessages([])

    const res = await fetch('/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: repoUrl, userId: 'demo-user' })
    })
    const data = await res.json()
    setRepoId(data.repo.id)
    setRepoName(data.repo.name)
    setStatus(data.repo.status)
  }

  async function handleChat() {
    if (!question || !repoId || loading) return

    const newMessages = [...messages, { role: 'user', content: question }]
    setMessages(newMessages)
    setQuestion('')
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId, question, history: messages })
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let answer = ''

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      answer += decoder.decode(value)
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: answer }
      ])
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="border-b border-gray-800 p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-sm font-bold">C</div>
        <h1 className="font-semibold">Codebase Chat</h1>
        {repoName && (
          <span className="ml-auto text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
            {repoName} — {status}
          </span>
        )}
      </div>

      {!repoId && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-lg">
            <h2 className="text-3xl font-bold mb-2 text-center">Chat with any codebase</h2>
            <p className="text-gray-400 text-center mb-8">Paste a public GitHub URL to get started</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleIngest}
                disabled={ingesting}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-5 py-3 rounded-lg text-sm font-medium transition"
              >
                {ingesting ? 'Loading...' : 'Analyze'}
              </button>
            </div>
          </div>
        </div>
      )}

      {repoId && status !== 'ready' && status !== 'failed' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-300 font-medium">Analyzing codebase...</p>
            <p className="text-gray-500 text-sm mt-1">Cloning, reading, and indexing files</p>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 font-medium">Failed to analyze repo</p>
            <button
              onClick={() => { setRepoId(''); setStatus('') }}
              className="mt-4 text-sm text-gray-400 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-16">
                <p className="text-lg mb-4">Codebase is ready. Ask anything.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    'How is authentication handled?',
                    'Explain the folder structure',
                    'Where are API routes defined?',
                    'What database is used?'
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => setQuestion(q)}
                      className="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl rounded-2xl px-5 py-3 text-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-900 border border-gray-800 text-gray-200'
                }`}>
                  {m.role === 'assistant' ? (
                    m.content ? (
                      <div className="prose prose-invert prose-sm max-w-none
                        prose-code:bg-gray-800 prose-code:text-indigo-300 prose-code:px-1 prose-code:rounded
                        prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700
                        prose-headings:text-white prose-strong:text-white
                        prose-li:text-gray-300">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="animate-pulse">▍</span>
                    )
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-800 p-4">
            <div className="max-w-4xl mx-auto flex gap-3">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChat()}
                placeholder="Ask anything about the codebase..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleChat}
                disabled={loading || !question}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-5 rounded-xl text-sm font-medium transition"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
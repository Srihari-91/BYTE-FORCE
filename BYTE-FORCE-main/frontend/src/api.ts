const JSON_HDR = { 'Content-Type': 'application/json' }

export async function fetchModels(): Promise<Record<string, { input: number; output: number }>> {
  const r = await fetch('/api/models')
  if (!r.ok) return {}
  const d = await r.json()
  return d.models ?? {}
}

export async function createSession(): Promise<string | null> {
  const r = await fetch('/api/session', { method: 'POST' })
  if (!r.ok) return null
  const d = await r.json()
  return d.session_id ?? null
}

export async function getSession(id: string): Promise<boolean> {
  const r = await fetch(`/api/session/${encodeURIComponent(id)}`)
  return r.ok
}

export async function analyze(body: {
  prompt: string
  model: string
  session_id?: string
}) {
  const r = await fetch('/api/analyze', {
    method: 'POST',
    headers: JSON_HDR,
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `HTTP ${r.status}`)
  }
  return r.json()
}

export async function compare(body: { prompt_a: string; prompt_b: string; model: string }) {
  const r = await fetch('/api/compare', {
    method: 'POST',
    headers: JSON_HDR,
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error('Compare failed')
  return r.json()
}

export async function history(sessionId: string) {
  const r = await fetch(`/api/history/${encodeURIComponent(sessionId)}`)
  if (!r.ok) throw new Error('History failed')
  return r.json()
}

export async function conversationView(sessionId: string, model: string) {
  const r = await fetch(
    `/api/session/${encodeURIComponent(sessionId)}/conversation?model=${encodeURIComponent(model)}`,
  )
  if (!r.ok) throw new Error('Conversation failed')
  return r.json()
}

export async function addConversationMessage(body: {
  session_id: string
  role: string
  content: string
  model: string
}) {
  const r = await fetch('/api/conversation/message', {
    method: 'POST',
    headers: JSON_HDR,
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error('Failed to add message')
  return r.json()
}

export async function clearConversation(sessionId: string) {
  const r = await fetch('/api/conversation/clear', {
    method: 'POST',
    headers: JSON_HDR,
    body: JSON.stringify({ session_id: sessionId }),
  })
  if (!r.ok) throw new Error('Clear failed')
  return r.json()
}

export async function exportPdf(payload: Record<string, unknown>) {
  const r = await fetch('/api/export', {
    method: 'POST',
    headers: JSON_HDR,
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error('PDF failed')
  return r.blob()
}

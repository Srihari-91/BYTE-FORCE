import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { addConversationMessage, clearConversation, conversationView } from '../api'

function formatUSD(v: number) {
  if (v === 0) return '$0.000000'
  if (Math.abs(v) < 0.0001) return `$${v.toExponential(2)}`
  return `$${v.toFixed(6)}`
}

export function ConversationPanel({
  sessionId,
  model,
}: {
  sessionId: string | null
  model: string
}) {
  const [role, setRole] = useState('user')
  const [content, setContent] = useState('')
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    try {
      const d = await conversationView(sessionId, model)
      setData(d)
    } catch {
      setData(null)
    }
  }, [sessionId, model])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function add() {
    const t = content.trim()
    if (!t || !sessionId) return
    try {
      await addConversationMessage({ session_id: sessionId, role, content: t, model })
      setContent('')
      await refresh()
    } catch {
      // parent toast optional
    }
  }

  async function clear() {
    if (!sessionId) return
    try {
      await clearConversation(sessionId)
      await refresh()
    } catch {
      // ignore
    }
  }

  const msgs = (data?.messages as { role: string; content: string; tokens: number }[]) || []

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="stat-grid glass" style={{ padding: '1rem' }}>
        <div className="stat-tile">
          <span className="stat-k">Messages</span>
          <span className="stat-v">{String(data?.message_count ?? 0)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-k">User tokens</span>
          <span className="stat-v">{Number(data?.user_tokens ?? 0).toLocaleString()}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-k">Assistant tokens</span>
          <span className="stat-v">{Number(data?.assistant_tokens ?? 0).toLocaleString()}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-k">Total tokens</span>
          <span className="stat-v">{Number(data?.total_tokens ?? 0).toLocaleString()}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-k">Est. cost</span>
          <span className="stat-v">{formatUSD(Number(data?.estimated_cost_usd ?? 0))}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-k">Saved (analyzer)</span>
          <span className="stat-v">{Number(data?.tokens_saved ?? 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="panel glass">
        <div className="panel-head">
          <h2 className="panel-h2">Add turn</h2>
          <button type="button" className="btn btn-ghost" onClick={() => void clear()}>
            Clear thread
          </button>
        </div>
        <div className="conv-form" style={{ display: 'grid', gap: '0.65rem' }}>
          <label className="sr-only" htmlFor="conv-role">
            Role
          </label>
          <select id="conv-role" className="dash-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="assistant">Assistant</option>
          </select>
          <textarea
            id="conv-input"
            className="dash-textarea"
            rows={4}
            placeholder="Message…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button type="button" className="btn" onClick={() => void add()}>
            Add
          </button>
        </div>
        <div className="conv-thread" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`conv-msg ${m.role}`}
              style={{
                padding: '0.75rem',
                borderRadius: 12,
                border: '1px solid rgba(0,240,255,0.12)',
                background: m.role === 'user' ? 'rgba(0,240,255,0.06)' : 'rgba(139,92,246,0.08)',
              }}
            >
              <div>{m.content}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>
                {m.role} · {m.tokens} tok
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

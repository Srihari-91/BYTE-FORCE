import { useCallback, useEffect, useState } from 'react'
import { Starfield } from './components/Starfield'
import { AnalyzerPanel } from './panels/AnalyzerPanel'
import { ComparePanel } from './panels/ComparePanel'
import { ConversationPanel } from './panels/ConversationPanel'
import { HistoryPanel } from './panels/HistoryPanel'
import { createSession, getSession, fetchModels } from './api'
import { MODEL_GROUPS, providerForModel } from './models'

const STORAGE_KEY = 'tokenscope_session_id'
const MODEL_KEY = 'tokenscope_model'

type Tab = 'analyzer' | 'compare' | 'conversation' | 'history'

export default function App() {
  const [tab, setTab] = useState<Tab>('analyzer')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [model, setModel] = useState(() => localStorage.getItem(MODEL_KEY) || 'gpt-4o-mini')
  const [toast, setToast] = useState('')
  const [, setPricing] = useState<Record<string, { input: number; output: number }>>({})

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 5000)
  }, [])

  const ensureSession = useCallback(async () => {
    let sid = localStorage.getItem(STORAGE_KEY)
    if (sid && (await getSession(sid))) {
      setSessionId(sid)
      return sid
    }
    const created = await createSession()
    if (created) {
      localStorage.setItem(STORAGE_KEY, created)
      setSessionId(created)
      return created
    }
    setSessionId(null)
    localStorage.removeItem(STORAGE_KEY)
    return null
  }, [])

  useEffect(() => {
    void ensureSession()
  }, [ensureSession])

  useEffect(() => {
    void (async () => {
      try {
        const m = await fetchModels()
        setPricing(m)
      } catch {
        /* ignore */
      }
    })()
  }, [])

  useEffect(() => {
    localStorage.setItem(MODEL_KEY, model)
  }, [model])

  const prov = providerForModel(model)
  const accent = prov?.color ?? '#00f0ff'

  return (
    <div className="app-root">
      <div className="deep-space" aria-hidden />
      <Starfield />
      <div className="grid-scan" aria-hidden />
      <div className="scanlines" aria-hidden />

      <div className="shell">
        <header className="hud-header glass">
          <div className="brand">
            <div className="brand-mark" />
            <div className="brand-type">
              Token<span>Scope</span>
            </div>
          </div>
          <nav className="tabs" role="tablist" aria-label="Main">
            {(
              [
                ['analyzer', 'Analyzer'],
                ['compare', 'Compare'],
                ['conversation', 'Conversation'],
                ['history', 'History'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                className={`tab-btn ${tab === id ? 'active' : ''}`}
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="model-select-wrap">
            <label className="sr-only" htmlFor="global-model">
              Model
            </label>
            <select
              id="global-model"
              className="dash-select model-select"
              value={model}
              style={{
                borderColor: `${accent}55`,
                boxShadow: `0 0 20px ${accent}22`,
              }}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODEL_GROUPS.map((g) => (
                <optgroup key={g.label} label={`${g.label}`}>
                  {g.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {`● ${m.label}`}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </header>

        <p className="tagline">
          Prompt intelligence · TF-IDF · local FastAPI — no API keys in the UI.
        </p>

        {tab === 'analyzer' && (
          <AnalyzerPanel
            model={model}
            sessionId={sessionId}
            onResult={() => {
              void ensureSession()
            }}
            onToast={showToast}
          />
        )}
        {tab === 'compare' && <ComparePanel model={model} onToast={showToast} />}
        {tab === 'conversation' && <ConversationPanel sessionId={sessionId} model={model} />}
        {tab === 'history' && <HistoryPanel sessionId={sessionId} />}

        <footer className="dash-footer" style={{ marginTop: '2rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
          TokenScope · HUD console
        </footer>
      </div>

      {toast && <div className="error-toast">{toast}</div>}
    </div>
  )
}

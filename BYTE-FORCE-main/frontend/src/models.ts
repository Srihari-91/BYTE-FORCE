export type ProviderId = 'openai' | 'anthropic' | 'google' | 'meta'

export interface ModelInfo {
  id: string
  label: string
  provider: ProviderId
}

export const MODEL_GROUPS: {
  label: string
  provider: ProviderId
  color: string
  models: ModelInfo[]
}[] = [
  {
    label: 'OpenAI',
    provider: 'openai',
    color: '#22c55e',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai' },
    ],
  },
  {
    label: 'Anthropic',
    provider: 'anthropic',
    color: '#f59e0b',
    models: [
      { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'anthropic' },
      { id: 'claude-3-haiku', label: 'Claude 3 Haiku', provider: 'anthropic' },
      { id: 'claude-3-opus', label: 'Claude 3 Opus', provider: 'anthropic' },
    ],
  },
  {
    label: 'Google',
    provider: 'google',
    color: '#3b82f6',
    models: [
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'google' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'google' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'google' },
    ],
  },
  {
    label: 'Meta',
    provider: 'meta',
    color: '#a855f7',
    models: [{ id: 'llama-3-70b', label: 'Llama 3 70B', provider: 'meta' }],
  },
]

export const ALL_MODELS: ModelInfo[] = MODEL_GROUPS.flatMap((g) => g.models)

export function providerForModel(modelId: string): (typeof MODEL_GROUPS)[0] | undefined {
  return MODEL_GROUPS.find((g) => g.models.some((m) => m.id === modelId))
}

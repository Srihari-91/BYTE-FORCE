# ─────────────────────────────────────────────
# Model pricing (per 1M tokens, USD) — input / output
# Approximate public list prices for planning; no keys in client.
# ─────────────────────────────────────────────
MODEL_PRICING = {
    # OpenAI
    "gpt-4o": {"input": 5.00, "output": 15.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    # Anthropic
    "claude-3-5-sonnet": {"input": 3.00, "output": 15.00},
    "claude-3-haiku": {"input": 0.25, "output": 1.25},
    "claude-3-opus": {"input": 15.00, "output": 75.00},
    # Google
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    # Meta (hosted / API style)
    "llama-3-70b": {"input": 0.90, "output": 0.90},
}

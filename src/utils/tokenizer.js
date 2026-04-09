/**
 * TokenScope - Token Analysis Utilities
 * Client-side tokenization and TF-IDF scoring
 */

// Common English stop words
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just',
  'don', 'now', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you',
  'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its',
  'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'this', 'that',
  'these', 'those', 'am', 'and', 'but', 'if', 'or', 'because', 'until',
  'while', 'about', 'against'
]);

// Filler phrases that can be removed
const FILLER_PHRASES = [
  /\b(please|kindly|could you|would you|can you|if you could|if you would)\b/gi,
  /\b(basically|essentially|actually|literally|really|very|just|quite|rather|somewhat)\b/gi,
  /\b(i was wondering|i would like|i think|i believe|i guess)\b/gi,
  /\b(kind of|sort of|type of|in terms of)\b/gi,
  /\b(you know|of course|as a matter of fact|in fact)\b/gi,
  /\b(for sure|absolutely|definitely|certainly)\b/gi,
  /\b(at the end of the day|when it comes to|as far as)\b/gi,
  /\b(go ahead and|try and|come and)\b/gi,
  /\b(the thing is|the point is|what i mean is)\b/gi,
];

// Phrase shortening rules
const PHRASE_SHORTENINGS = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bin the event that\b/gi, 'if'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\bin spite of the fact that\b/gi, 'although'],
  [/\buntil such time as\b/gi, 'until'],
  [/\bin the near future\b/gi, 'soon'],
  [/\ba large number of\b/gi, 'many'],
  [/\ba small number of\b/gi, 'few'],
  [/\bon a daily basis\b/gi, 'daily'],
  [/\bmake a decision\b/gi, 'decide'],
  [/\bgive consideration to\b/gi, 'consider'],
  [/\bis able to\b/gi, 'can'],
  [/\bhas the ability to\b/gi, 'can'],
];

/**
 * Simple tokenizer - splits text into tokens
 */
export function tokenize(text) {
  // Split on whitespace and punctuation, keeping punctuation attached to words
  const tokens = text.match(/[\w']+|[^\s\w]/g) || [];
  return tokens;
}

/**
 * Compute TF-IDF-like importance scores for tokens
 */
export function computeTokenScores(text) {
  const tokens = tokenize(text);
  const totalTokens = tokens.length;

  // Count term frequencies
  const tf = {};
  tokens.forEach(token => {
    const lower = token.toLowerCase();
    tf[lower] = (tf[lower] || 0) + 1;
  });

  // Normalize TF
  const maxTf = Math.max(...Object.values(tf), 1);

  // Compute scores for each token
  const tokenData = tokens.map((token, index) => {
    const lower = token.toLowerCase();
    const isStopWord = STOP_WORDS.has(lower);
    const isPunctuation = /^[^\w]+$/.test(token);
    const isNumber = /^\d+$/.test(token);
    const isShortWord = token.length <= 2;

    // Base score from normalized TF
    let score = (tf[lower] || 0) / maxTf;

    // Boost for important tokens
    if (!isStopWord && !isPunctuation && token.length > 3) {
      score = Math.min(1, score + 0.3);
    }

    // Reduce score for stop words
    if (isStopWord) {
      score *= 0.15;
    }

    // Reduce score for punctuation
    if (isPunctuation) {
      score *= 0.1;
    }

    // Boost for first and last tokens (context is important)
    if (index < 3 || index >= totalTokens - 3) {
      score = Math.min(1, score + 0.15);
    }

    // Boost for verbs and action words (heuristic)
    if (/ing$|ed$|ize$|ise$|ate$|ify$/.test(lower)) {
      score = Math.min(1, score + 0.2);
    }

    // Boost for technical terms (heuristic)
    if (token.length > 6 && !isStopWord) {
      score = Math.min(1, score + 0.1);
    }

    return {
      text: token,
      score: Math.round(Math.max(0.05, Math.min(1, score)) * 1000) / 1000,
      isStopWord,
      isPunctuation,
    };
  });

  return tokenData;
}

/**
 * Get token importance category
 */
export function getTokenCategory(score) {
  if (score < 0.2) return { label: 'Noise', color: 'gray' };
  if (score < 0.4) return { label: 'Context', color: 'yellow' };
  if (score < 0.7) return { label: 'Important', color: 'orange' };
  return { label: 'Critical', color: 'red' };
}

/**
 * Get distribution of token categories
 */
export function getTokenDistribution(tokenData) {
  const distribution = { critical: 0, important: 0, context: 0, noise: 0 };

  tokenData.forEach(token => {
    const category = getTokenCategory(token.score);
    switch (category.label) {
      case 'Critical': distribution.critical++; break;
      case 'Important': distribution.important++; break;
      case 'Context': distribution.context++; break;
      default: distribution.noise++;
    }
  });

  return distribution;
}

/**
 * Trim prompt by removing low-importance tokens
 */
export function trimPrompt(text, threshold = 0.25) {
  const tokenData = computeTokenScores(text);

  // Keep tokens above threshold or important short words
  const importantShortWords = new Set(['to', 'for', 'and', 'or', 'not', 'if', 'in', 'on', 'at']);

  const keptTokens = tokenData
    .filter(token => {
      if (token.score >= threshold) return true;
      if (importantShortWords.has(token.text.toLowerCase())) return true;
      return false;
    })
    .map(token => token.text);

  // Reconstruct text
  let trimmed = '';

  for (let i = 0; i < keptTokens.length; i++) {
    const token = keptTokens[i];
    const nextToken = keptTokens[i + 1];

    trimmed += token;

    // Add space between words (not before punctuation)
    if (nextToken && /^\w/.test(nextToken) && /^\w/.test(token)) {
      trimmed += ' ';
    }
  }

  // Clean up extra spaces
  trimmed = trimmed.replace(/\s+/g, ' ').trim();

  return trimmed || text;
}

/**
 * Count tokens (approximate - word-based)
 */
export function countTokens(text) {
  return tokenize(text).length;
}

/**
 * Calculate cost in USD
 */
export function calculateCost(tokenCount, pricePerMillion) {
  return (tokenCount / 1_000_000) * pricePerMillion;
}

/**
 * Format USD value
 */
export function formatUSD(value) {
  if (value === 0) return '$0.000000';
  if (value < 0.0001) return `$${value.toExponential(3)}`;
  if (value < 1) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}

/**
 * Model pricing data
 */
export const MODEL_PRICING = {
  'gpt-4o-mini': { name: 'GPT-4o Mini', input: 0.15, output: 0.60 },
  'gpt-4o': { name: 'GPT-4o', input: 2.50, output: 10.00 },
  'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', input: 0.50, output: 1.50 },
  'claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', input: 3.00, output: 15.00 },
  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', input: 0.35, output: 1.05 },
};

/**
 * Example prompts
 */
export const EXAMPLE_PROMPTS = [
  {
    label: 'Image Classifier',
    text: 'Could you please kindly help me write a very detailed Python script that basically does image classification using a neural network? I was wondering if you could also just add some comments throughout.',
  },
  {
    label: 'Summarize Article',
    text: 'I would like you to please summarize the following article in a very concise manner, if possible keeping it under 100 words, and kindly highlight the main points.',
  },
  {
    label: 'Translate Text',
    text: 'Can you please go ahead and translate the following text from English to French? Feel free to be quite literal with the translation if that would be better.',
  },
  {
    label: 'Code Review',
    text: 'I would really appreciate it if you could please take a look at my code and basically tell me what you think about it. I am particularly interested in knowing if there are any obvious bugs or performance issues.',
  },
];

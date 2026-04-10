"""
Token counting, TF-IDF, POS-aware trimming, compare, and full dashboard analysis.
"""
from __future__ import annotations

import difflib
import re
import string
from collections import Counter
from typing import Any, Callable

import tiktoken
from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS

from services.nlp_helpers import (
    detect_noise_words_in_text,
    efficiency_score,
    noise_level_from_text,
    noise_word_set_from_tfidf,
    pos_counts_from_doc,
    repetition_rate,
    repetition_top,
    stopword_percentage,
    trim_with_pos_and_noise,
    useful_vs_noise_from_tfidf,
    word_frequencies,
    word_pos_map,
    word_tokens,
)
from utils.constants import MODEL_PRICING


def calculate_cost(token_count: int, model: str) -> float:
    if model not in MODEL_PRICING:
        raise ValueError(f"Unknown model: {model}")
    price_per_million = MODEL_PRICING[model]["input"]
    return (token_count / 1_000_000) * price_per_million


def cost_per_1k_tokens(token_count: int, model: str) -> float:
    if token_count <= 0:
        return 0.0
    return (calculate_cost(token_count, model) / token_count) * 1000


def get_encoding(model: str):
    try:
        return tiktoken.encoding_for_model(model)
    except Exception:
        return tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str, model: str) -> int:
    return len(get_encoding(model).encode(text))


def _word_tfidf_map(prompt_text: str) -> dict[str, float]:
    try:
        vec = TfidfVectorizer(stop_words="english", token_pattern=r"(?u)\b\w+\b")
        tfidf_matrix = vec.fit_transform([prompt_text])
        feature_names = vec.get_feature_names_out()
        scores_arr = tfidf_matrix.toarray()[0]
        return {str(a): float(b) for a, b in zip(feature_names, scores_arr)}
    except ValueError:
        return {}


def compute_scores(prompt_text: str, encoding) -> list[dict]:
    word_scores = _word_tfidf_map(prompt_text)
    token_ids = encoding.encode(prompt_text)
    token_data = []

    for tid in token_ids:
        token_str = encoding.decode([tid])
        token_clean = token_str.strip().lower()

        if not token_clean or all(c in string.punctuation + " \t\n" for c in token_clean):
            score = 0.0
        elif token_clean in ENGLISH_STOP_WORDS:
            score = 0.08
        else:
            matched_score = None
            for word, s in word_scores.items():
                if word == token_clean or word in token_clean or token_clean in word:
                    matched_score = s
                    break
            if matched_score is not None:
                score = min(1.0, 0.40 + matched_score * 1.2)
            else:
                score = 0.75

        token_data.append({"id": tid, "text": token_str, "score": round(score, 4)})

    return token_data


def enrich_token_data(
    prompt_text: str,
    encoding,
    word_scores: dict[str, float],
    wf: Counter[str],
    pos_map: dict[str, str],
) -> list[dict]:
    """tiktoken spans with tfidf, frequency, coarse POS for tooltips."""
    token_ids = encoding.encode(prompt_text)
    out: list[dict] = []

    for tid in token_ids:
        token_str = encoding.decode([tid])
        token_clean = token_str.strip().lower()
        kw = ""
        if token_clean:
            m = re.search(r"(\w+)", token_clean)
            if m:
                kw = m.group(1).lower()

        tfidf_v = round(float(word_scores.get(kw, 0.0)), 6) if kw else 0.0
        freq = int(wf[kw]) if kw else 0
        pos = pos_map.get(kw) if kw else None

        if not token_clean or all(c in string.punctuation + " \t\n" for c in token_clean):
            score = 0.0
        elif token_clean in ENGLISH_STOP_WORDS:
            score = 0.08
        else:
            matched = None
            for word, s in word_scores.items():
                if word == token_clean or word in token_clean or token_clean in word:
                    matched = s
                    break
            if matched is not None:
                score = min(1.0, 0.35 + matched * 1.25)
            else:
                score = 0.72

        out.append(
            {
                "id": tid,
                "text": token_str,
                "score": round(score, 4),
                "tfidf": tfidf_v,
                "freq": freq,
                "pos": pos,
            }
        )
    return out


def trim_prompt_smart(text: str, encoding) -> str:
    try:
        token_data = compute_scores(text, encoding)
    except Exception as e:
        print("ERROR in compute_scores:", e)
        return text

    kept_tokens = []
    for token in token_data:
        try:
            score = token.get("score", 0)
            word = token.get("text", "")
            if not word:
                continue
            if score >= 0.25:
                kept_tokens.append(word)
            else:
                if word.lower() in {"to", "for", "and", "or", "if", "in", "on"}:
                    kept_tokens.append(word)
        except Exception as e:
            print("Token error:", e)
            continue

    trimmed = "".join(kept_tokens)
    trimmed = re.sub(r"\s{2,}", " ", trimmed)
    trimmed = re.sub(r"\s([?.!,])", r"\1", trimmed)
    trimmed = trimmed.strip()

    if not trimmed or len(trimmed) < 5:
        return text
    return trimmed


def top_tfidf_terms(prompt_text: str, max_terms: int = 20) -> list[dict[str, Any]]:
    ws = _word_tfidf_map(prompt_text)
    pairs = sorted(ws.items(), key=lambda x: x[1], reverse=True)
    return [{"term": t, "score": round(float(s), 6)} for t, s in pairs[:max_terms] if s > 0]


def unique_bpe_count(text: str, encoding) -> int:
    ids = encoding.encode(text)
    return len(set(ids))


def run_analyze(prompt: str, model: str) -> dict[str, Any]:
    if model not in MODEL_PRICING:
        raise ValueError(f"Unknown model: {model}")

    encoding = get_encoding(model)
    original_tokens = len(encoding.encode(prompt))
    words = word_tokens(prompt)
    wf = word_frequencies(prompt)
    word_scores = _word_tfidf_map(prompt)
    pos_map = word_pos_map(prompt)
    pos_tags = pos_counts_from_doc(prompt)

    trim_fallback: Callable[[str, Any], str] = lambda t, enc: trim_prompt_smart(t, enc)
    candidate_a = trim_prompt_smart(prompt, encoding)
    candidate_b = trim_with_pos_and_noise(prompt, encoding, trim_prompt_smart)
    ta, tb = len(encoding.encode(candidate_a)), len(encoding.encode(candidate_b))
    optimized_prompt = candidate_a if ta <= tb else candidate_b

    trimmed_tokens = len(encoding.encode(optimized_prompt))
    cost_original = calculate_cost(original_tokens, model)
    cost_trimmed = calculate_cost(trimmed_tokens, model)
    saved_tokens = original_tokens - trimmed_tokens
    savings_pct = (saved_tokens / original_tokens * 100) if original_tokens > 0 else 0.0

    token_data = enrich_token_data(prompt, encoding, word_scores, wf, pos_map)
    tfidf_top = top_tfidf_terms(prompt)
    tfidf_scores = {k: round(v, 6) for k, v in word_scores.items() if v > 0}
    rep_top = repetition_top(words)
    noise_words = detect_noise_words_in_text(prompt)
    n_level = noise_level_from_text(prompt)
    rep_r = repetition_rate(words)
    useful_n, noise_n = useful_vs_noise_from_tfidf(words, word_scores)
    eff = efficiency_score(savings_pct, n_level, rep_r)

    return {
        "prompt": prompt,
        "total_tokens": original_tokens,
        "original_tokens": original_tokens,
        "unique_tokens": unique_bpe_count(prompt, encoding),
        "unique_words": len(set(words)),
        "repetition": rep_top,
        "repetition_rate": rep_r,
        "stopword_pct": stopword_percentage(words),
        "tfidf_scores": tfidf_scores,
        "tfidf_top_terms": tfidf_top,
        "pos_tags": pos_tags,
        "noise_words": noise_words,
        "noise_level": n_level,
        "noise_suggested_removals": noise_words[:15],
        "optimized_prompt": optimized_prompt,
        "trimmed_prompt": optimized_prompt,
        "trimmed_tokens": trimmed_tokens,
        "saved_tokens": saved_tokens,
        "tokens_saved": saved_tokens,
        "savings_percentage": round(savings_pct, 2),
        "cost_before": cost_original,
        "cost_after": cost_trimmed,
        "cost_original_usd": cost_original,
        "cost_trimmed_usd": cost_trimmed,
        "model": model,
        "token_data": token_data,
        "useful_token_words": useful_n,
        "noise_token_words": noise_n,
        "efficiency_score": eff,
    }


def _radar_bundle(prompt: str, model: str) -> dict[str, Any]:
    words = word_tokens(prompt)
    n_words = len(words)
    ws = _word_tfidf_map(prompt)
    tokens = count_tokens(prompt, model)
    cost = calculate_cost(tokens, model)
    _, noise_n = useful_vs_noise_from_tfidf(words, ws)
    noise_pct = 100.0 * noise_n / max(n_words, 1)
    red = repetition_rate(words)
    lex = len(set(words)) / max(n_words, 1)

    token_eff = max(0.0, min(100.0, 100.0 - min(92.0, tokens / 7.5)))
    noise_metric = max(0.0, min(100.0, 100.0 - noise_pct * 2.2))
    clarity = max(0.0, min(100.0, lex * 88.0 + (1.0 - red) * 12.0))
    cost_metric = max(0.0, min(100.0, 100.0 - min(98.0, cost * 400_000.0)))
    brevity = max(0.0, min(100.0, 100.0 - min(88.0, (tokens / max(n_words, 1)) * 5.5)))

    return {
        "token_efficiency": round(token_eff, 1),
        "noise_ratio": round(noise_metric, 1),
        "clarity_score": round(clarity, 1),
        "cost": round(cost_metric, 1),
        "brevity": round(brevity, 1),
        "noise_pct": round(noise_pct, 2),
        "tokens": tokens,
        "cost_usd": cost,
    }


def _word_diff_rows(
    prompt_a: str,
    prompt_b: str,
    noise_union: set[str],
    limit: int = 4000,
) -> tuple[list[dict[str, Any]], int]:
    wa = word_tokens(prompt_a)
    wb = word_tokens(prompt_b)
    sm = difflib.SequenceMatcher(a=wa, b=wb, autojunk=False)
    rows: list[dict[str, Any]] = []
    idx = 0

    def push(
        word: str,
        in_a: bool,
        in_b: bool,
        status: str,
    ) -> None:
        nonlocal idx
        rows.append(
            {
                "index": idx,
                "word": word,
                "in_a": in_a,
                "in_b": in_b,
                "status": status,
            }
        )
        idx += 1

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if len(rows) >= limit:
            break
        if tag == "equal":
            for k in range(i1, i2):
                if len(rows) >= limit:
                    return rows, len(wa) + len(wb)
                w = wa[k]
                st = "noise" if w in noise_union else "common"
                push(w, True, True, st)
        elif tag == "delete":
            for k in range(i1, i2):
                if len(rows) >= limit:
                    return rows, len(wa) + len(wb)
                w = wa[k]
                st = "noise" if w in noise_union else "a_only"
                push(w, True, False, st)
        elif tag == "insert":
            for k in range(j1, j2):
                if len(rows) >= limit:
                    return rows, len(wa) + len(wb)
                w = wb[k]
                st = "noise" if w in noise_union else "b_only"
                push(w, False, True, st)
        elif tag == "replace":
            for k in range(i1, i2):
                if len(rows) >= limit:
                    return rows, len(wa) + len(wb)
                w = wa[k]
                st = "noise" if w in noise_union else "a_only"
                push(w, True, False, st)
            for k in range(j1, j2):
                if len(rows) >= limit:
                    return rows, len(wa) + len(wb)
                w = wb[k]
                st = "noise" if w in noise_union else "b_only"
                push(w, False, True, st)

    total_words = len(wa) + len(wb)
    return rows, total_words


def run_compare(prompt_a: str, prompt_b: str, model: str) -> dict[str, Any]:
    if model not in MODEL_PRICING:
        raise ValueError(f"Unknown model: {model}")

    t_a = count_tokens(prompt_a, model)
    t_b = count_tokens(prompt_b, model)
    cost_a = calculate_cost(t_a, model)
    cost_b = calculate_cost(t_b, model)
    per_1k_a = cost_per_1k_tokens(t_a, model)
    per_1k_b = cost_per_1k_tokens(t_b, model)

    wa, wb = word_tokens(prompt_a), word_tokens(prompt_b)
    red_a = repetition_rate(wa)
    red_b = repetition_rate(wb)
    uniq_a = len(set(wa)) / max(len(wa), 1)
    uniq_b = len(set(wb)) / max(len(wb), 1)

    if t_a < t_b:
        more_efficient = "A"
        token_diff = t_b - t_a
        cost_diff = cost_b - cost_a
    elif t_b < t_a:
        more_efficient = "B"
        token_diff = t_a - t_b
        cost_diff = cost_a - cost_b
    else:
        more_efficient = "tie"
        token_diff = 0
        cost_diff = 0.0

    wsa = _word_tfidf_map(prompt_a)
    wsb = _word_tfidf_map(prompt_b)
    noise_a = noise_word_set_from_tfidf(wa, wsa)
    noise_b = noise_word_set_from_tfidf(wb, wsb)
    noise_union = noise_a | noise_b

    diff_rows, diff_total_est = _word_diff_rows(prompt_a, prompt_b, noise_union)

    ra = _radar_bundle(prompt_a, model)
    rb = _radar_bundle(prompt_b, model)
    keys = ("token_efficiency", "noise_ratio", "clarity_score", "cost", "brevity")
    radar_a = {k: ra[k] for k in keys}
    radar_b = {k: rb[k] for k in keys}
    score_a = sum(radar_a.values()) / 5.0
    score_b = sum(radar_b.values()) / 5.0

    if score_a > score_b + 0.5:
        quality_winner = "A"
    elif score_b > score_a + 0.5:
        quality_winner = "B"
    else:
        quality_winner = "tie"

    n_noise_a = sum(1 for _ in wa if _ in noise_a)
    n_noise_b = sum(1 for _ in wb if _ in noise_b)
    noise_delta = n_noise_a - n_noise_b
    cost_pct = (
        ((cost_a - cost_b) / cost_a * 100.0) if cost_a > 0 else 0.0
    )
    tok_save_vs_a = t_a - t_b

    if quality_winner == "B" or (quality_winner == "tie" and more_efficient == "B"):
        win_label = "B"
        rec = (
            f"Prompt B trims noise by {max(0, noise_delta)} filler word(s) vs A"
            if noise_delta > 0
            else f"Prompt B matches or beats A on composite metrics"
        )
        if cost_pct > 0:
            rec += f" — reduces input cost by {abs(cost_pct):.1f}% vs Prompt A."
        elif cost_pct < 0:
            rec += f" — note: input cost is {abs(cost_pct):.1f}% higher; weigh clarity vs spend."
        else:
            rec += " — similar cost; prefer for clarity and token shape."
    elif quality_winner == "A" or (quality_winner == "tie" and more_efficient == "A"):
        win_label = "A"
        cost_pct_b = ((cost_b - cost_a) / cost_b * 100.0) if cost_b > 0 else 0.0
        rec = (
            f"Prompt A leads on composite score"
            + (
                f" — saves ~{tok_save_vs_a} tokens vs B at this model."
                if tok_save_vs_a > 0
                else " — comparable length."
            )
        )
        if cost_pct_b > 0:
            rec += f" B costs {abs(((cost_b - cost_a) / max(cost_a, 1e-12)) * 100):.1f}% more to run."
    else:
        win_label = "tie"
        rec = "Both prompts trade off evenly — pick based on tone and constraints."

    return {
        "model": model,
        "prompt_a": {
            "tokens": t_a,
            "cost_usd": cost_a,
            "cost_per_1k_tokens_usd": round(per_1k_a, 8),
            "repetition_rate": red_a,
            "lexical_diversity": round(uniq_a, 4),
        },
        "prompt_b": {
            "tokens": t_b,
            "cost_usd": cost_b,
            "cost_per_1k_tokens_usd": round(per_1k_b, 8),
            "repetition_rate": red_b,
            "lexical_diversity": round(uniq_b, 4),
        },
        "more_cost_efficient": more_efficient,
        "token_difference": token_diff,
        "cost_difference_usd": round(cost_diff, 10),
        "summary": (
            f"Prompt {more_efficient} uses fewer input tokens for the same model pricing "
            f"(difference: {token_diff} tokens, ${cost_diff:.8f} USD at input rates)."
            if more_efficient != "tie"
            else "Both prompts have the same token count and input cost."
        ),
        "radar_a": radar_a,
        "radar_b": radar_b,
        "scoreboard_a": round(score_a, 1),
        "scoreboard_b": round(score_b, 1),
        "quality_winner": quality_winner,
        "verdict_winner": win_label,
        "verdict_text": rec,
        "metrics_detail_a": ra,
        "metrics_detail_b": rb,
        "noise_words_a": n_noise_a,
        "noise_words_b": n_noise_b,
        "token_savings_prompt_a_vs_b": tok_save_vs_a,
        "cost_pct_a_vs_b": round(cost_pct, 2),
        "word_diff": {
            "rows": diff_rows,
            "total_estimated": diff_total_est,
            "returned": len(diff_rows),
        },
    }

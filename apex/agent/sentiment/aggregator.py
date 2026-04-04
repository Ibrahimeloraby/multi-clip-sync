"""
APEX.AI — Sentiment aggregator.

Pipeline:
  1. Fetch raw text from Twitter, Reddit, NewsAPI, StockTwits
  2. Bundle texts per symbol
  3. Score with Claude Opus 4.6 (adaptive thinking + streaming)
  4. Return a structured SentimentScore

The Claude prompt asks for:
  - score  : float  -1.0 (very bearish) → +1.0 (very bullish)
  - confidence : float  0.0 → 1.0
  - summary : str   one-sentence rationale
  - signals : list[str]  key phrases driving the score
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import aiohttp
import anthropic
from loguru import logger

from agent.config import settings

# ── Data classes ──────────────────────────────────────────────────────


@dataclass
class RawPost:
    source: str          # "twitter" | "reddit" | "news" | "stocktwits"
    text: str
    url: str = ""
    published_at: str = ""


@dataclass
class SentimentScore:
    symbol: str
    score: float          # -1.0 … +1.0
    confidence: float     # 0.0 … 1.0
    summary: str
    signals: List[str] = field(default_factory=list)
    source_count: int = 0
    timestamp: datetime = field(default_factory=datetime.utcnow)

    @property
    def label(self) -> str:
        if self.score >= 0.4:
            return "BULLISH"
        if self.score <= -0.4:
            return "BEARISH"
        return "NEUTRAL"


# ── Aggregator ────────────────────────────────────────────────────────


class SentimentAggregator:
    """
    Fetches and scores social sentiment for a list of symbols.
    Uses Claude Opus 4.6 with adaptive thinking for nuanced scoring.
    """

    _CLAUDE_SYSTEM = (
        "You are a professional quantitative trading analyst specialising in "
        "sentiment analysis. You are given a collection of social media posts, "
        "news headlines, and forum discussions about a stock. "
        "Analyse the collective sentiment and respond ONLY with a valid JSON "
        "object (no markdown fences) matching this schema:\n"
        "{\n"
        '  "score": <float -1.0 to 1.0>,\n'
        '  "confidence": <float 0.0 to 1.0>,\n'
        '  "summary": "<one sentence rationale>",\n'
        '  "signals": ["<key phrase>", ...]\n'
        "}\n\n"
        "score legend: -1=extremely bearish, 0=neutral, +1=extremely bullish\n"
        "confidence: how clearly the texts point in one direction\n"
        "signals: up to 5 key phrases or events driving the score"
    )

    def __init__(self) -> None:
        self._anthropic = anthropic.AsyncAnthropic(
            api_key=settings.anthropic_api_key
        )
        self._session: Optional[aiohttp.ClientSession] = None

    async def _session_get(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    # ── Source fetchers ───────────────────────────────────────────────

    async def _fetch_twitter(self, symbol: str) -> List[RawPost]:
        """Fetch recent tweets mentioning the ticker via Twitter API v2."""
        if not settings.twitter_bearer_token:
            return []
        try:
            session = await self._session_get()
            query = f"${symbol} lang:en -is:retweet"
            url = "https://api.twitter.com/2/tweets/search/recent"
            params = {
                "query": query,
                "max_results": 20,
                "tweet.fields": "created_at,text",
            }
            headers = {"Authorization": f"Bearer {settings.twitter_bearer_token}"}
            async with session.get(url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
                return [
                    RawPost(source="twitter", text=t["text"], published_at=t.get("created_at", ""))
                    for t in data.get("data", [])
                ]
        except Exception as exc:
            logger.warning("Twitter fetch for {} failed: {}", symbol, exc)
            return []

    async def _fetch_reddit(self, symbol: str) -> List[RawPost]:
        """Fetch top posts from r/wallstreetbets, r/stocks, r/investing."""
        if not settings.reddit_client_id:
            return []
        try:
            session = await self._session_get()
            # Get OAuth token
            auth = aiohttp.BasicAuth(settings.reddit_client_id, settings.reddit_client_secret)
            token_url = "https://www.reddit.com/api/v1/access_token"
            async with session.post(
                token_url,
                data={"grant_type": "client_credentials"},
                auth=auth,
                headers={"User-Agent": settings.reddit_user_agent},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status != 200:
                    return []
                token_data = await resp.json()
                token = token_data.get("access_token", "")

            if not token:
                return []

            posts: List[RawPost] = []
            subreddits = ["wallstreetbets", "stocks", "investing"]
            for sub in subreddits:
                search_url = f"https://oauth.reddit.com/r/{sub}/search"
                params = {"q": symbol, "sort": "new", "limit": 10, "t": "day", "restrict_sr": "1"}
                headers = {
                    "Authorization": f"bearer {token}",
                    "User-Agent": settings.reddit_user_agent,
                }
                async with session.get(search_url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status != 200:
                        continue
                    data = await resp.json()
                    for child in data.get("data", {}).get("children", []):
                        d = child.get("data", {})
                        text = f"{d.get('title', '')} {d.get('selftext', '')}".strip()
                        if text:
                            posts.append(RawPost(source="reddit", text=text[:500], url=d.get("url", "")))
            return posts

        except Exception as exc:
            logger.warning("Reddit fetch for {} failed: {}", symbol, exc)
            return []

    async def _fetch_news(self, symbol: str) -> List[RawPost]:
        """Fetch headlines from NewsAPI."""
        if not settings.news_api_key:
            return []
        try:
            session = await self._session_get()
            url = "https://newsapi.org/v2/everything"
            # Map ticker → company name for better results
            params = {
                "q": symbol,
                "sortBy": "publishedAt",
                "pageSize": 15,
                "language": "en",
                "apiKey": settings.news_api_key,
            }
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
                return [
                    RawPost(
                        source="news",
                        text=f"{a.get('title', '')}. {a.get('description', '')}".strip(),
                        url=a.get("url", ""),
                        published_at=a.get("publishedAt", ""),
                    )
                    for a in data.get("articles", [])
                    if a.get("title")
                ]
        except Exception as exc:
            logger.warning("NewsAPI fetch for {} failed: {}", symbol, exc)
            return []

    async def _fetch_stocktwits(self, symbol: str) -> List[RawPost]:
        """Fetch StockTwits stream (public, no auth required)."""
        try:
            session = await self._session_get()
            url = f"https://api.stocktwits.com/api/2/streams/symbol/{symbol}.json"
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
                return [
                    RawPost(
                        source="stocktwits",
                        text=m.get("body", ""),
                        published_at=m.get("created_at", ""),
                    )
                    for m in data.get("messages", [])
                    if m.get("body")
                ]
        except Exception as exc:
            logger.warning("StockTwits fetch for {} failed: {}", symbol, exc)
            return []

    # ── Claude scoring ────────────────────────────────────────────────

    async def _score_with_claude(self, symbol: str, posts: List[RawPost]) -> SentimentScore:
        """
        Send collected posts to Claude Opus 4.6 and parse the JSON response.
        Uses adaptive thinking + streaming to handle variable length inputs.
        """
        if not posts:
            return SentimentScore(
                symbol=symbol, score=0.0, confidence=0.0,
                summary="No data available", source_count=0,
            )

        # Build the user message — truncate to avoid context overflow
        lines = []
        for p in posts[:60]:
            lines.append(f"[{p.source.upper()}] {p.text[:300]}")

        user_msg = (
            f"Analyse the following {len(lines)} posts about the stock ${symbol}:\n\n"
            + "\n".join(f"{i+1}. {l}" for i, l in enumerate(lines))
        )

        try:
            # Stream with adaptive thinking to handle complex, conflicting signals
            collected_text = ""
            async with self._anthropic.messages.stream(
                model="claude-opus-4-6",
                max_tokens=2048,
                thinking={"type": "adaptive"},
                system=self._CLAUDE_SYSTEM,
                messages=[{"role": "user", "content": user_msg}],
            ) as stream:
                async for event in stream:
                    if (
                        hasattr(event, "type")
                        and event.type == "content_block_delta"
                        and hasattr(event.delta, "type")
                        and event.delta.type == "text_delta"
                    ):
                        collected_text += event.delta.text

            # Parse JSON response
            data: Dict[str, Any] = json.loads(collected_text.strip())
            return SentimentScore(
                symbol=symbol,
                score=float(data.get("score", 0.0)),
                confidence=float(data.get("confidence", 0.5)),
                summary=str(data.get("summary", "")),
                signals=list(data.get("signals", [])),
                source_count=len(posts),
            )

        except json.JSONDecodeError as exc:
            logger.error("Claude returned non-JSON for {}: {} | raw: {}", symbol, exc, collected_text[:200])
            return SentimentScore(symbol=symbol, score=0.0, confidence=0.0, summary="Parse error", source_count=len(posts))
        except anthropic.RateLimitError:
            logger.warning("Anthropic rate-limited — using neutral score for {}", symbol)
            return SentimentScore(symbol=symbol, score=0.0, confidence=0.0, summary="Rate limited", source_count=0)
        except anthropic.APIError as exc:
            logger.error("Anthropic API error for {}: {}", symbol, exc)
            return SentimentScore(symbol=symbol, score=0.0, confidence=0.0, summary=f"API error: {exc}", source_count=0)

    # ── Public API ────────────────────────────────────────────────────

    async def aggregate(self, symbol: str) -> SentimentScore:
        """Fetch all sources concurrently then score with Claude."""
        twitter, reddit, news, stocktwits = await asyncio.gather(
            self._fetch_twitter(symbol),
            self._fetch_reddit(symbol),
            self._fetch_news(symbol),
            self._fetch_stocktwits(symbol),
        )
        all_posts = twitter + reddit + news + stocktwits
        logger.info(
            "Sentiment for {}: {} posts (tw={} rd={} nw={} st={})",
            symbol, len(all_posts), len(twitter), len(reddit), len(news), len(stocktwits),
        )
        return await self._score_with_claude(symbol, all_posts)

    async def aggregate_all(self, symbols: List[str]) -> Dict[str, SentimentScore]:
        """Aggregate sentiment for all symbols (rate-limited sequentially)."""
        results: Dict[str, SentimentScore] = {}
        for sym in symbols:
            results[sym] = await self.aggregate(sym)
            await asyncio.sleep(1)  # respect API rate limits
        return results

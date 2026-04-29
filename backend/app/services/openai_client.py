"""OpenAI client — gpt-4o-mini for both lite (bulk) and flash (deep reasoning) tasks.

The public API is identical to the old gemini_client so all callers only need
to change their import path.
"""
import logging
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

# Single shared async client (thread-safe, connection-pooled)
_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def _chat(prompt: str, model: str, temperature: float = 0.3) -> str:
    """Low-level wrapper: single user message → assistant reply text."""
    try:
        client = _get_client()
        response = await client.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful expert assistant. Return exactly what is asked — no extra text.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"OpenAI API error (model={model}): {e}")
        raise


async def generate_lite(prompt: str) -> str:
    """Cheap/bulk tasks (extraction, tagging, ranking) — gpt-4o-mini."""
    return await _chat(prompt, model=settings.OPENAI_MODEL, temperature=0.2)


async def generate_flash(prompt: str) -> str:
    """Deeper-reasoning tasks (scoring, resume tailoring, reports) — gpt-4o-mini."""
    return await _chat(prompt, model=settings.OPENAI_MODEL, temperature=0.3)

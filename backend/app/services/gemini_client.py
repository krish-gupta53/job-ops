"""Gemini client with dual-model routing: Flash-Lite for bulk, Flash for deep reasoning."""
import google.generativeai as genai
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)

_lite_model = None
_flash_model = None


def get_lite_model():
    """Gemini Flash-Lite - cheap bulk processing (extraction, ranking, tagging)"""
    global _lite_model
    if _lite_model is None:
        _lite_model = genai.GenerativeModel(settings.GEMINI_LITE_MODEL)
    return _lite_model


def get_flash_model():
    """Gemini Flash - stronger reasoning (scoring, resume tailoring, reports)"""
    global _flash_model
    if _flash_model is None:
        _flash_model = genai.GenerativeModel(settings.GEMINI_FLASH_MODEL)
    return _flash_model


async def generate_lite(prompt: str) -> str:
    """Use Flash-Lite for cheap tasks."""
    try:
        model = get_lite_model()
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini Lite error: {e}")
        raise


async def generate_flash(prompt: str) -> str:
    """Use Flash for deeper reasoning tasks."""
    try:
        model = get_flash_model()
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini Flash error: {e}")
        raise

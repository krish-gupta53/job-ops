# This file is intentionally replaced. All AI calls now use openai_client.py.
# Re-exporting from openai_client so any remaining stale imports don't crash.
from app.services.openai_client import generate_lite, generate_flash

__all__ = ["generate_lite", "generate_flash"]

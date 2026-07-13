"""Клиент для работы с Grok API (console.x.ai) и генерации постов для Threads."""
from __future__ import annotations

import os

import requests

XAI_API_URL = "https://api.x.ai/v1/chat/completions"

# Три тематики аккаунта. key -> (название, описание/стиль для промпта)
TOPICS: dict[str, dict[str, str]] = {
    "management": {
        "title": "Менеджмент",
        "persona": (
            "Ты — практикующий эксперт по менеджменту и управлению командами. "
            "Пишешь для блогерского экспертного аккаунта. Даёшь прикладные советы, "
            "разбираешь управленческие ситуации, лидерство, продуктивность, найм, "
            "делегирование и рост команд."
        ),
    },
    "psychology": {
        "title": "Психология",
        "persona": (
            "Ты — эксперт по практической психологии. Пишешь для блогерского "
            "экспертного аккаунта. Объясняешь поведение людей, эмоции, отношения, "
            "мотивацию и ментальное здоровье простым и поддерживающим языком, "
            "без псевдонаучных обещаний."
        ),
    },
    "philosophy": {
        "title": "Философия",
        "persona": (
            "Ты — эксперт по философии, который умеет объяснять сложные идеи просто. "
            "Пишешь для блогерского экспертного аккаунта. Рассуждаешь о смысле, этике, "
            "сознании, свободе, счастье и мышлении, опираясь на идеи философов, "
            "но говоришь живым современным языком."
        ),
    },
}

DEFAULT_MODEL = os.getenv("XAI_MODEL", "grok-4.5")


class GrokError(Exception):
    """Ошибка обращения к Grok API."""


def _build_prompt(topic_key: str, extra_instruction: str | None = None) -> tuple[str, str]:
    topic = TOPICS[topic_key]
    system_prompt = (
        f"{topic['persona']}\n\n"
        "Твоя задача — написать ОДИН готовый к публикации пост для соцсети Threads.\n"
        "Требования к посту:\n"
        "- на русском языке;\n"
        "- не длиннее 480 символов (лимит Threads — 500);\n"
        "- цепляющее первое предложение (хук);\n"
        "- конкретная мысль или полезный вывод, а не вода;\n"
        "- живой, экспертный, но человечный тон;\n"
        "- 1–3 уместных хэштега в конце;\n"
        "- без markdown-разметки и без кавычек вокруг всего поста.\n"
        "Верни ТОЛЬКО текст поста, без пояснений."
    )
    user_prompt = f"Сгенерируй пост на тему «{topic['title']}»."
    if extra_instruction:
        user_prompt += f" Дополнительное пожелание: {extra_instruction.strip()}"
    return system_prompt, user_prompt


def generate_post(
    topic_key: str,
    extra_instruction: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
    timeout: int = 60,
) -> str:
    """Сгенерировать текст поста для Threads по выбранной теме."""
    if topic_key not in TOPICS:
        raise GrokError(f"Неизвестная тема: {topic_key}")

    api_key = api_key or os.getenv("XAI_API_KEY")
    if not api_key:
        raise GrokError(
            "Не задан XAI_API_KEY. Добавьте ключ в файл .env "
            "(см. .env.example). Ключ можно получить на https://console.x.ai"
        )

    model = model or DEFAULT_MODEL
    system_prompt, user_prompt = _build_prompt(topic_key, extra_instruction)

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.9,
        "max_tokens": 800,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(XAI_API_URL, json=payload, headers=headers, timeout=timeout)
    except requests.RequestException as exc:
        raise GrokError(f"Ошибка сети при обращении к Grok API: {exc}") from exc

    if resp.status_code != 200:
        raise GrokError(
            f"Grok API вернул ошибку {resp.status_code}: {resp.text[:500]}"
        )

    try:
        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()
    except (ValueError, KeyError, IndexError) as exc:
        raise GrokError(f"Неожиданный ответ от Grok API: {exc}") from exc

    return content

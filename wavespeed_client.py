"""Клиент WaveSpeed (Google Nano Banana Pro): text-to-image и image-to-image edit."""
from __future__ import annotations

import os
import time

import requests

API_BASE = "https://api.wavespeed.ai/api/v3"
T2I_ENDPOINT = f"{API_BASE}/google/nano-banana-pro/text-to-image"
EDIT_ENDPOINT = f"{API_BASE}/google/nano-banana-pro/edit"

ASPECT_RATIOS = ["1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]
RESOLUTIONS = ["1k", "2k", "4k"]
OUTPUT_FORMATS = ["png", "jpeg"]

DEFAULT_ASPECT_RATIO = "1:1"
DEFAULT_RESOLUTION = "1k"
DEFAULT_OUTPUT_FORMAT = "png"


class WaveSpeedError(Exception):
    """Ошибка обращения к WaveSpeed API."""


def _resolve_api_key(api_key: str | None) -> str:
    api_key = api_key or os.getenv("WAVESPEED_API_KEY")
    if not api_key:
        raise WaveSpeedError(
            "Не задан WAVESPEED_API_KEY. Добавьте ключ в файл .env "
            "(см. .env.example). Ключ можно получить на https://wavespeed.ai"
        )
    return api_key


def _validate_params(aspect_ratio: str, resolution: str, output_format: str) -> None:
    if aspect_ratio not in ASPECT_RATIOS:
        raise WaveSpeedError(f"Недопустимое соотношение сторон: {aspect_ratio}")
    if resolution not in RESOLUTIONS:
        raise WaveSpeedError(f"Недопустимое разрешение: {resolution}")
    if output_format not in OUTPUT_FORMATS:
        raise WaveSpeedError(f"Недопустимый формат: {output_format}")


def _submit(endpoint: str, payload: dict, api_key: str, timeout: int) -> str:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        resp = requests.post(endpoint, json=payload, headers=headers, timeout=timeout)
    except requests.RequestException as exc:
        raise WaveSpeedError(f"Ошибка сети при обращении к WaveSpeed API: {exc}") from exc

    if resp.status_code != 200:
        raise WaveSpeedError(
            f"WaveSpeed API вернул ошибку {resp.status_code}: {resp.text[:500]}"
        )

    try:
        data = resp.json()["data"]
        return data["urls"]["get"]
    except (ValueError, KeyError) as exc:
        raise WaveSpeedError(f"Неожиданный ответ от WaveSpeed API: {exc}") from exc


def _poll(get_url: str, api_key: str, timeout: int, poll_interval: float) -> str:
    headers = {"Authorization": f"Bearer {api_key}"}
    deadline = time.monotonic() + timeout
    while True:
        try:
            resp = requests.get(get_url, headers=headers, timeout=30)
        except requests.RequestException as exc:
            raise WaveSpeedError(f"Ошибка сети при получении результата: {exc}") from exc

        if resp.status_code != 200:
            raise WaveSpeedError(
                f"WaveSpeed API вернул ошибку {resp.status_code}: {resp.text[:500]}"
            )

        try:
            data = resp.json()["data"]
            status = data["status"]
        except (ValueError, KeyError) as exc:
            raise WaveSpeedError(f"Неожиданный ответ от WaveSpeed API: {exc}") from exc

        if status == "completed":
            outputs = data.get("outputs") or []
            if not outputs:
                raise WaveSpeedError("WaveSpeed вернул пустой результат.")
            return outputs[0]
        if status == "failed":
            raise WaveSpeedError(data.get("error") or "Генерация не удалась.")

        if time.monotonic() >= deadline:
            raise WaveSpeedError("Превышено время ожидания генерации изображения.")
        time.sleep(poll_interval)


def generate_image(
    prompt: str,
    aspect_ratio: str = DEFAULT_ASPECT_RATIO,
    resolution: str = DEFAULT_RESOLUTION,
    output_format: str = DEFAULT_OUTPUT_FORMAT,
    api_key: str | None = None,
    timeout: int = 180,
    poll_interval: float = 3.0,
) -> str:
    """Сгенерировать изображение по текстовому описанию. Возвращает URL результата."""
    prompt = (prompt or "").strip()
    if not prompt:
        raise WaveSpeedError("Опишите, какое изображение сгенерировать.")
    _validate_params(aspect_ratio, resolution, output_format)

    api_key = _resolve_api_key(api_key)
    payload = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "resolution": resolution,
        "output_format": output_format,
        "enable_sync_mode": False,
        "enable_base64_output": False,
    }
    get_url = _submit(T2I_ENDPOINT, payload, api_key, timeout=30)
    return _poll(get_url, api_key, timeout=timeout, poll_interval=poll_interval)


def edit_image(
    prompt: str,
    images: list[str],
    aspect_ratio: str = DEFAULT_ASPECT_RATIO,
    resolution: str = DEFAULT_RESOLUTION,
    output_format: str = DEFAULT_OUTPUT_FORMAT,
    api_key: str | None = None,
    timeout: int = 180,
    poll_interval: float = 3.0,
) -> str:
    """Отредактировать изображение по описанию (image-to-image). Возвращает URL результата.

    images — список URL или data URI (data:image/...;base64,...) исходных изображений.
    """
    prompt = (prompt or "").strip()
    if not prompt:
        raise WaveSpeedError("Опишите, что изменить в изображении.")
    images = [i for i in (images or []) if i and i.strip()]
    if not images:
        raise WaveSpeedError("Загрузите хотя бы одно исходное изображение.")
    if len(images) > 14:
        raise WaveSpeedError("Максимум 14 исходных изображений.")
    _validate_params(aspect_ratio, resolution, output_format)

    api_key = _resolve_api_key(api_key)
    payload = {
        "prompt": prompt,
        "images": images,
        "aspect_ratio": aspect_ratio,
        "resolution": resolution,
        "output_format": output_format,
        "enable_sync_mode": False,
        "enable_base64_output": False,
    }
    get_url = _submit(EDIT_ENDPOINT, payload, api_key, timeout=60)
    return _poll(get_url, api_key, timeout=timeout, poll_interval=poll_interval)

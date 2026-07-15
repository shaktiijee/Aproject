"""Локальный веб-сервер для генерации постов в Threads с помощью Grok."""
from __future__ import annotations

import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

from grok_client import ROLES, TOPICS, GrokError, edit_post, generate_post
from wavespeed_client import (
    ASPECT_RATIOS,
    DEFAULT_ASPECT_RATIO,
    DEFAULT_OUTPUT_FORMAT,
    DEFAULT_RESOLUTION,
    OUTPUT_FORMATS,
    RESOLUTIONS,
    WaveSpeedError,
    edit_image,
    generate_image,
)

load_dotenv()

app = Flask(__name__)


@app.route("/")
def index():
    return render_template(
        "index.html",
        topics=TOPICS,
        roles=ROLES,
        aspect_ratios=ASPECT_RATIOS,
        resolutions=RESOLUTIONS,
        output_formats=OUTPUT_FORMATS,
        default_aspect_ratio=DEFAULT_ASPECT_RATIO,
        default_resolution=DEFAULT_RESOLUTION,
        default_output_format=DEFAULT_OUTPUT_FORMAT,
    )


@app.route("/api/topics")
def api_topics():
    return jsonify(
        {"topics": [{"key": k, "title": v["title"]} for k, v in TOPICS.items()]}
    )


@app.route("/api/generate", methods=["POST"])
def api_generate():
    data = request.get_json(silent=True) or {}
    topic = data.get("topic")
    extra = data.get("extra")
    role = data.get("role")

    if topic not in TOPICS:
        return jsonify({"error": "Выберите одну из доступных тем."}), 400
    if role and role not in ROLES:
        return jsonify({"error": "Выбрана недоступная роль."}), 400

    try:
        post = generate_post(topic, extra_instruction=extra, role_key=role)
    except GrokError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify(
        {
            "post": post,
            "length": len(post),
            "topic": TOPICS[topic]["title"],
            "role": ROLES[role]["title"] if role in ROLES else None,
        }
    )


@app.route("/api/edit", methods=["POST"])
def api_edit():
    data = request.get_json(silent=True) or {}
    base_post = data.get("post")
    instruction = data.get("instruction")

    try:
        post = edit_post(base_post, instruction)
    except GrokError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify({"post": post, "length": len(post)})


@app.route("/api/image/generate", methods=["POST"])
def api_image_generate():
    data = request.get_json(silent=True) or {}
    try:
        url = generate_image(
            data.get("prompt"),
            aspect_ratio=data.get("aspect_ratio", DEFAULT_ASPECT_RATIO),
            resolution=data.get("resolution", DEFAULT_RESOLUTION),
            output_format=data.get("output_format", DEFAULT_OUTPUT_FORMAT),
        )
    except WaveSpeedError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify({"url": url})


@app.route("/api/image/edit", methods=["POST"])
def api_image_edit():
    data = request.get_json(silent=True) or {}
    image = data.get("image")
    try:
        url = edit_image(
            data.get("prompt"),
            images=[image] if image else [],
            aspect_ratio=data.get("aspect_ratio", DEFAULT_ASPECT_RATIO),
            resolution=data.get("resolution", DEFAULT_RESOLUTION),
            output_format=data.get("output_format", DEFAULT_OUTPUT_FORMAT),
        )
    except WaveSpeedError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify({"url": url})


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    print(f"\n  Threads Post Generator запущен: http://{host}:{port}\n")
    app.run(host=host, port=port, debug=True)

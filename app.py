"""Локальный веб-сервер для генерации постов в Threads с помощью Grok."""
from __future__ import annotations

import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

from grok_client import TOPICS, GrokError, edit_post, generate_post

load_dotenv()

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html", topics=TOPICS)


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

    if topic not in TOPICS:
        return jsonify({"error": "Выберите одну из доступных тем."}), 400

    try:
        post = generate_post(topic, extra_instruction=extra)
    except GrokError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify({"post": post, "length": len(post), "topic": TOPICS[topic]["title"]})


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


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    print(f"\n  Threads Post Generator запущен: http://{host}:{port}\n")
    app.run(host=host, port=port, debug=True)

let selectedTopic = null;

const topicsEl = document.getElementById("topics");
const generateBtn = document.getElementById("generate");
const regenerateBtn = document.getElementById("regenerate");
const copyBtn = document.getElementById("copy");
const extraEl = document.getElementById("extra");
const resultCard = document.getElementById("result-card");
const postEl = document.getElementById("post");
const resultTopicEl = document.getElementById("result-topic");
const charCountEl = document.getElementById("char-count");
const errorEl = document.getElementById("error");
const loaderEl = document.getElementById("loader");
const editBtn = document.getElementById("edit");
const editorOverlay = document.getElementById("editor-overlay");
const editorClose = document.getElementById("editor-close");
const editorText = document.getElementById("editor-text");
const editorTopic = document.getElementById("editor-topic");
const editorCount = document.getElementById("editor-count");
const editorCopy = document.getElementById("editor-copy");
const editorSave = document.getElementById("editor-save");
const editorInstruction = document.getElementById("editor-instruction");
const editorAiBtn = document.getElementById("editor-ai");
const editorLoader = document.getElementById("editor-loader");
const editorError = document.getElementById("editor-error");

function setCount(el, value) {
  el.textContent = `${value.length} / 500`;
  el.classList.toggle("over", value.length > 500);
}

topicsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".topic");
  if (!btn) return;
  document.querySelectorAll(".topic").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  selectedTopic = btn.dataset.topic;
  generateBtn.disabled = false;
});

async function generate() {
  if (!selectedTopic) return;

  errorEl.hidden = true;
  resultCard.hidden = true;
  loaderEl.hidden = false;
  generateBtn.disabled = true;
  regenerateBtn.disabled = true;

  try {
    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: selectedTopic, extra: extraEl.value }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || "Неизвестная ошибка");
    }

    postEl.textContent = data.post;
    resultTopicEl.textContent = data.topic;
    setCount(charCountEl, data.post);
    resultCard.hidden = false;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    loaderEl.hidden = true;
    generateBtn.disabled = false;
    regenerateBtn.disabled = false;
  }
}

generateBtn.addEventListener("click", generate);
regenerateBtn.addEventListener("click", generate);

async function copyText(btn, text) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Скопировано!";
  } catch (_) {
    btn.textContent = "Не удалось";
  }
  setTimeout(() => (btn.textContent = "Скопировать"), 1500);
}

copyBtn.addEventListener("click", () => copyText(copyBtn, postEl.textContent));
editorCopy.addEventListener("click", () => copyText(editorCopy, editorText.value));

function openEditor() {
  editorText.value = postEl.textContent;
  editorTopic.textContent = resultTopicEl.textContent;
  editorInstruction.value = "";
  editorError.hidden = true;
  setCount(editorCount, editorText.value);
  editorOverlay.hidden = false;
  editorText.focus();
}

async function aiEdit() {
  const instruction = editorInstruction.value.trim();
  if (!instruction) {
    editorError.textContent = "Опишите, что изменить в посте.";
    editorError.hidden = false;
    return;
  }

  editorError.hidden = true;
  editorLoader.hidden = false;
  editorAiBtn.disabled = true;

  try {
    const resp = await fetch("/api/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post: editorText.value, instruction }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Неизвестная ошибка");

    editorText.value = data.post;
    setCount(editorCount, editorText.value);
    editorInstruction.value = "";
  } catch (err) {
    editorError.textContent = err.message;
    editorError.hidden = false;
  } finally {
    editorLoader.hidden = true;
    editorAiBtn.disabled = false;
  }
}

function closeEditor() {
  editorOverlay.hidden = true;
}

editBtn.addEventListener("click", openEditor);
editorClose.addEventListener("click", closeEditor);
editorText.addEventListener("input", () => setCount(editorCount, editorText.value));
editorAiBtn.addEventListener("click", aiEdit);
editorInstruction.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    aiEdit();
  }
});

editorSave.addEventListener("click", () => {
  postEl.textContent = editorText.value;
  setCount(charCountEl, editorText.value);
  closeEditor();
});

editorOverlay.addEventListener("click", (e) => {
  if (e.target === editorOverlay) closeEditor();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !editorOverlay.hidden) closeEditor();
});

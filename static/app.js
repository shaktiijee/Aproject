let selectedTopic = null;
let selectedRole = null;

const topicsEl = document.getElementById("topics");
const rolesEl = document.getElementById("roles");
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
  topicsEl.querySelectorAll(".topic").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  selectedTopic = btn.dataset.topic;
  generateBtn.disabled = false;
});

rolesEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".role");
  if (!btn) return;
  // Повторный клик по активной роли снимает выбор (роль необязательна).
  if (btn.dataset.role === selectedRole) {
    btn.classList.remove("active");
    selectedRole = null;
    return;
  }
  rolesEl.querySelectorAll(".role").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  selectedRole = btn.dataset.role;
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
      body: JSON.stringify({
        topic: selectedTopic,
        role: selectedRole,
        extra: extraEl.value,
      }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || "Неизвестная ошибка");
    }

    postEl.textContent = data.post;
    resultTopicEl.textContent = data.role ? `${data.topic} · ${data.role}` : data.topic;
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

/* ---------- Tabs ---------- */
const tabsEl = document.getElementById("tabs");
const tabPanels = {
  posts: document.getElementById("tab-posts"),
  images: document.getElementById("tab-images"),
};

tabsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const tab = btn.dataset.tab;
  Object.entries(tabPanels).forEach(([name, panel]) => {
    panel.hidden = name !== tab;
  });
});

/* ---------- Image generation (WaveSpeed / Nano Banana Pro) ---------- */
let imgMode = "generate";
let uploadedImage = null; // data URI of source image for edit

const imgModesEl = document.getElementById("img-modes");
const imgUploadBlock = document.getElementById("img-upload-block");
const imgFile = document.getElementById("img-file");
const imgPreview = document.getElementById("img-preview");
const imgPromptLabel = document.getElementById("img-prompt-label");
const imgPrompt = document.getElementById("img-prompt");
const imgAspect = document.getElementById("img-aspect");
const imgResolution = document.getElementById("img-resolution");
const imgFormat = document.getElementById("img-format");
const imgGenerateBtn = document.getElementById("img-generate");
const imgResultCard = document.getElementById("img-result-card");
const imgResult = document.getElementById("img-result");
const imgResultBadge = document.getElementById("img-result-badge");
const imgDownload = document.getElementById("img-download");
const imgUseAsInput = document.getElementById("img-use-as-input");
const imgError = document.getElementById("img-error");
const imgLoader = document.getElementById("img-loader");

function setImgMode(mode) {
  imgMode = mode;
  document.querySelectorAll("#img-modes .topic").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  imgUploadBlock.hidden = mode !== "edit";
  if (mode === "edit") {
    imgPromptLabel.textContent = "2. Что изменить";
    imgPrompt.placeholder = "Напр.: сделай фон синим, добавь текст сверху...";
    imgGenerateBtn.textContent = "Изменить изображение";
  } else {
    imgPromptLabel.textContent = "2. Описание";
    imgPrompt.placeholder =
      "Напр.: минималистичная иллюстрация лампочки, плоский дизайн, светлый фон";
    imgGenerateBtn.textContent = "Сгенерировать изображение";
  }
}

imgModesEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".topic");
  if (!btn) return;
  setImgMode(btn.dataset.mode);
});

imgFile.addEventListener("change", () => {
  const file = imgFile.files[0];
  if (!file) {
    uploadedImage = null;
    imgPreview.hidden = true;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    uploadedImage = reader.result; // data:image/...;base64,...
    imgPreview.src = uploadedImage;
    imgPreview.hidden = false;
  };
  reader.readAsDataURL(file);
});

async function generateImage() {
  const prompt = imgPrompt.value.trim();
  if (!prompt) {
    imgError.textContent =
      imgMode === "edit"
        ? "Опишите, что изменить в изображении."
        : "Опишите, какое изображение сгенерировать.";
    imgError.hidden = false;
    return;
  }
  if (imgMode === "edit" && !uploadedImage) {
    imgError.textContent = "Загрузите исходное изображение.";
    imgError.hidden = false;
    return;
  }

  imgError.hidden = true;
  imgResultCard.hidden = true;
  imgLoader.hidden = false;
  imgGenerateBtn.disabled = true;

  const params = {
    prompt,
    aspect_ratio: imgAspect.value,
    resolution: imgResolution.value,
    output_format: imgFormat.value,
  };
  const url = imgMode === "edit" ? "/api/image/edit" : "/api/image/generate";
  if (imgMode === "edit") params.image = uploadedImage;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Неизвестная ошибка");

    imgResult.src = data.url;
    imgDownload.href = data.url;
    imgDownload.download = `threads-image.${imgFormat.value}`;
    imgResultBadge.textContent = `${imgAspect.value} · ${imgResolution.value}`;
    imgResultCard.hidden = false;
  } catch (err) {
    imgError.textContent = err.message;
    imgError.hidden = false;
  } finally {
    imgLoader.hidden = true;
    imgGenerateBtn.disabled = false;
  }
}

imgGenerateBtn.addEventListener("click", generateImage);

imgUseAsInput.addEventListener("click", async () => {
  try {
    const resp = await fetch(imgResult.src);
    const blob = await resp.blob();
    const reader = new FileReader();
    reader.onload = () => {
      uploadedImage = reader.result;
      imgPreview.src = uploadedImage;
      imgPreview.hidden = false;
      setImgMode("edit");
      imgPrompt.value = "";
      imgPrompt.focus();
    };
    reader.readAsDataURL(blob);
  } catch (_) {
    imgError.textContent = "Не удалось загрузить изображение для редактирования.";
    imgError.hidden = false;
  }
});

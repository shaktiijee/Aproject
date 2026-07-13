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
    charCountEl.textContent = `${data.length} / 500`;
    charCountEl.classList.toggle("over", data.length > 500);
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

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(postEl.textContent);
    copyBtn.textContent = "Скопировано!";
    setTimeout(() => (copyBtn.textContent = "Скопировать"), 1500);
  } catch (_) {
    copyBtn.textContent = "Не удалось";
    setTimeout(() => (copyBtn.textContent = "Скопировать"), 1500);
  }
});

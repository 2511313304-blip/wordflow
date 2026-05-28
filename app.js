const STORAGE_KEY = "wordflow.words.v1";

const state = {
  words: [],
  mode: "learn",
  size: 20,
  queue: [],
  index: 0,
  flipped: false,
};

const $ = (selector) => document.querySelector(selector);

const els = {
  totalCount: $("#totalCount"),
  learnedCount: $("#learnedCount"),
  reviewCount: $("#reviewCount"),
  wordInput: $("#wordInput"),
  addWordsBtn: $("#addWordsBtn"),
  sampleBtn: $("#sampleBtn"),
  startBtn: $("#startBtn"),
  shuffleBtn: $("#shuffleBtn"),
  clearBtn: $("#clearBtn"),
  libraryBtn: $("#libraryBtn"),
  libraryOverlay: $("#libraryOverlay"),
  closeLibraryBtn: $("#closeLibraryBtn"),
  librarySummary: $("#librarySummary"),
  wordList: $("#wordList"),
  resetSessionBtn: $("#resetSessionBtn"),
  card: $("#card"),
  cardKicker: $("#cardKicker"),
  cardWord: $("#cardWord"),
  cardHint: $("#cardHint"),
  cardMeaning: $("#cardMeaning"),
  cardNote: $("#cardNote"),
  againBtn: $("#againBtn"),
  knowBtn: $("#knowBtn"),
  sessionLabel: $("#sessionLabel"),
  progressText: $("#progressText"),
  progressBar: $("#progressBar"),
  toast: $("#toast"),
};

function loadWords() {
  try {
    state.words = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    state.words = [];
  }
}

function saveWords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.words));
}

function parseLine(line) {
  const clean = line.trim();
  if (!clean) return null;

  const parts = clean
    .split(/\s*[/｜|,，:：-]\s*|\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return { word: parts[0], meaning: parts.slice(1).join(" · ") };
  }

  const firstSpace = clean.search(/\s/);
  if (firstSpace > 0) {
    return {
      word: clean.slice(0, firstSpace).trim(),
      meaning: clean.slice(firstSpace).trim(),
    };
  }

  return { word: clean, meaning: "先熟悉拼写，再补充释义" };
}

function addWords() {
  const entries = els.wordInput.value
    .split("\n")
    .map(parseLine)
    .filter(Boolean);

  if (!entries.length) {
    showToast("先输入几个单词吧");
    return;
  }

  const existing = new Set(state.words.map((item) => item.word.toLowerCase()));
  const nextWords = entries
    .filter((item) => !existing.has(item.word.toLowerCase()))
    .map((item) => ({
      id: crypto.randomUUID(),
      word: item.word,
      meaning: item.meaning,
      status: "new",
      correct: 0,
      wrong: 0,
      lastSeen: null,
      createdAt: Date.now(),
    }));

  state.words = [...nextWords, ...state.words];
  saveWords();
  els.wordInput.value = "";
  render();
  showToast(`已加入 ${nextWords.length} 个新单词`);
}

function makeQueue() {
  const pool =
    state.mode === "review"
      ? state.words.filter((item) => item.status !== "mastered" || item.wrong > 0)
      : state.words;

  state.queue = pool.slice(0, state.size);
  state.index = 0;
  setFlipped(false);
  renderCard();
}

function shuffleQueue() {
  const items = state.queue.length ? state.queue : state.words.slice(0, state.size);
  state.queue = [...items].sort(() => Math.random() - 0.5);
  state.index = 0;
  setFlipped(false);
  renderCard();
  showToast("顺序已打乱");
}

function answer(known) {
  const current = state.queue[state.index];
  if (!current) {
    showToast("先开始一组学习");
    return;
  }

  const target = state.words.find((item) => item.id === current.id);
  if (target) {
    target.lastSeen = Date.now();
    if (known) {
      target.correct += 1;
      target.status = target.correct >= 2 ? "mastered" : "learning";
    } else {
      target.wrong += 1;
      target.status = "review";
    }
    saveWords();
  }

  state.index += 1;
  setFlipped(false);
  render();
  renderCard();
}

function resetSession() {
  state.index = 0;
  setFlipped(false);
  renderCard();
  showToast("当前进度已重置");
}

function clearAll() {
  const confirmed = confirm("确定清空所有单词和学习记录吗？");
  if (!confirmed) return;
  state.words = [];
  state.queue = [];
  state.index = 0;
  saveWords();
  setFlipped(false);
  render();
  renderCard();
  showToast("词库已清空");
}

function openLibrary() {
  renderWordLibrary();
  els.libraryOverlay.hidden = false;
  document.body.classList.add("is-library-open");
}

function closeLibrary() {
  els.libraryOverlay.hidden = true;
  document.body.classList.remove("is-library-open");
}

function getStatusLabel(status) {
  if (status === "mastered") return "已掌握";
  if (status === "review") return "待复习";
  if (status === "learning") return "学习中";
  return "新词";
}

function renderWordLibrary() {
  els.librarySummary.textContent = `共 ${state.words.length} 个单词`;
  els.wordList.replaceChildren();

  if (!state.words.length) {
    const empty = document.createElement("p");
    empty.className = "empty-library";
    empty.textContent = "还没有添加单词。";
    els.wordList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  state.words.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "word-row";

    const number = document.createElement("span");
    number.className = "word-index";
    number.textContent = String(index + 1).padStart(2, "0");

    const text = document.createElement("div");
    text.className = "word-text";

    const word = document.createElement("strong");
    word.textContent = item.word;

    const meaning = document.createElement("p");
    meaning.textContent = item.meaning;

    const status = document.createElement("span");
    status.className = `status-pill status-${item.status}`;
    status.textContent = getStatusLabel(item.status);

    text.append(word, meaning);
    row.append(number, text, status);
    fragment.append(row);
  });

  els.wordList.append(fragment);
}

function setFlipped(value) {
  state.flipped = value;
  els.card.classList.toggle("is-flipped", value);
}

function renderCard() {
  const current = state.queue[state.index];
  const done = state.queue.length > 0 && state.index >= state.queue.length;

  if (done) {
    els.cardKicker.textContent = "完成";
    els.cardWord.textContent = "这组结束了";
    els.cardHint.textContent = "可以换复习模式，或者再开始一组";
    els.cardMeaning.textContent = "漂亮";
    els.cardNote.textContent = "短频快地重复，比一次背很久更稳";
    renderProgress();
    return;
  }

  if (!current) {
    els.cardKicker.textContent = "准备开始";
    els.cardWord.textContent = state.words.length ? "点击开始" : "添加单词";
    els.cardHint.textContent = state.words.length ? "生成今天的学习队列" : "每行输入一个单词和释义";
    els.cardMeaning.textContent = "等待词表";
    els.cardNote.textContent = "点击卡片可翻面";
    renderProgress();
    return;
  }

  els.cardKicker.textContent = state.mode === "learn" ? "先看单词" : "复习回想";
  els.cardWord.textContent = current.word;
  els.cardHint.textContent = state.mode === "learn" ? "点击卡片查看释义" : "先在心里说出意思，再翻面";
  els.cardMeaning.textContent = current.meaning;
  els.cardNote.textContent = current.status === "mastered" ? "已掌握，偶尔回看" : "根据熟悉程度选择按钮";
  renderProgress();
}

function renderProgress() {
  const total = state.queue.length;
  const current = total ? Math.min(state.index + 1, total) : 0;
  const finished = total ? Math.min(state.index, total) : 0;
  els.sessionLabel.textContent = `${state.mode === "learn" ? "学习" : "复习"} · ${state.size}`;
  els.progressText.textContent = `${current} / ${total}`;
  els.progressBar.style.width = total ? `${(finished / total) * 100}%` : "0%";
}

function render() {
  const learned = state.words.filter((item) => item.status === "mastered").length;
  const review = state.words.filter((item) => item.status === "review" || item.wrong > 0).length;

  els.totalCount.textContent = state.words.length;
  els.learnedCount.textContent = learned;
  els.reviewCount.textContent = review;
  renderWordLibrary();

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });

  document.querySelectorAll("[data-size]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.size) === state.size);
  });

  renderProgress();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 1800);
}

function bindEvents() {
  els.addWordsBtn.addEventListener("click", addWords);
  els.startBtn.addEventListener("click", () => {
    makeQueue();
    showToast(state.queue.length ? "开始这一组" : "还没有可学习的单词");
  });
  els.shuffleBtn.addEventListener("click", shuffleQueue);
  els.libraryBtn.addEventListener("click", openLibrary);
  els.closeLibraryBtn.addEventListener("click", closeLibrary);
  els.libraryOverlay.addEventListener("click", (event) => {
    if (event.target === els.libraryOverlay) closeLibrary();
  });
  els.clearBtn.addEventListener("click", clearAll);
  els.resetSessionBtn.addEventListener("click", resetSession);
  els.card.addEventListener("click", () => setFlipped(!state.flipped));
  els.knowBtn.addEventListener("click", () => answer(true));
  els.againBtn.addEventListener("click", () => answer(false));
  els.sampleBtn.addEventListener("click", () => {
    els.wordInput.value = "abandon 放弃\nbrief 简短的\ncapture 捕获、拍摄\nsteady 稳定的\nrenew 更新、恢复";
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      makeQueue();
      render();
    });
  });

  document.querySelectorAll("[data-size]").forEach((button) => {
    button.addEventListener("click", () => {
      state.size = Number(button.dataset.size);
      makeQueue();
      render();
    });
  });
}

loadWords();
bindEvents();
render();
renderCard();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

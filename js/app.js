'use strict';

// ===== State =====
let courses = null;
let state = {
  chapterIndex: 0,
  currentPage: 'home',
  flashcardIndex: 0,
  // Quiz
  quizMode: 'setup',       // 'setup' | 'running' | 'results'
  quizSelectedChapters: [], // [] = tous
  quizSearchTerm: '',
  quizQueue: [],            // questions actives pour la session
  quizIndex: 0,
  quizAnswered: false,
  quizScore: 0,
};

// ===== Init =====
async function init() {
  const saved = localStorage.getItem('revisionState');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.chapterIndex = parsed.chapterIndex ?? 0;
      state.currentPage  = parsed.currentPage  ?? 'home';
    } catch(e) {}
  }
  const res = await fetch('data/courses.json');
  courses = await res.json();
  buildSommaire();
  renderAll();
  setupSwipe();
  setupNav();
}

function saveState() {
  localStorage.setItem('revisionState', JSON.stringify({
    chapterIndex: state.chapterIndex,
    currentPage:  state.currentPage,
  }));
}

// ===== Navigation =====
function setupNav() {
  document.querySelectorAll('.nav-btn, .sidebar-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });
}

function switchPage(page) {
  state.currentPage = page;
  saveState();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-btn, .sidebar-nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  if (page === 'home')       renderHome();
  if (page === 'flashcards') renderFlashcards();
  if (page === 'quiz')       renderQuizSetup();
}

// ===== Chapter navigation =====
function goToChapter(index, sectionId = null) {
  if (!courses || index < 0 || index >= courses.chapters.length) return;
  state.chapterIndex = index;
  state.flashcardIndex = 0;
  saveState();
  renderAll();
  closeDrawer();
  if (sectionId) {
    setTimeout(() => {
      const el = document.getElementById('section-' + sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

function renderAll() {
  renderHome();
  renderFlashcards();
  renderQuizSetup();
  updateHeader();
  switchPage(state.currentPage);
}

// ===== Header =====
function updateHeader() {
  if (!courses) return;
  const ch = courses.chapters[state.chapterIndex];
  document.getElementById('header-title').textContent = ch.title;
  document.getElementById('chapter-counter').textContent =
    `${state.chapterIndex + 1} / ${courses.chapters.length}`;
  const pct = ((state.chapterIndex + 1) / courses.chapters.length) * 100;
  document.getElementById('chapter-progress').style.width = pct + '%';
}

// ===== Home / Cours =====
function renderHome() {
  if (!courses) return;
  const ch = courses.chapters[state.chapterIndex];
  const container = document.getElementById('home-content');

  const sectionsHTML = ch.sections.map(s => `
    <div id="section-${s.id}" class="lesson-card">
      <p class="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">${s.title}</p>
      <p class="text-sm text-gray-700 leading-relaxed">${s.content}</p>
    </div>
  `).join('');

  const prevDisabled = state.chapterIndex === 0 ? 'disabled' : '';
  const nextDisabled = state.chapterIndex === courses.chapters.length - 1 ? 'disabled' : '';

  container.innerHTML = `
    <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">
      Chapitre ${state.chapterIndex + 1}
    </p>
    ${sectionsHTML}
    <div class="chapter-nav mt-4">
      <button onclick="goToChapter(${state.chapterIndex - 1})" ${prevDisabled}>← Précédent</button>
      <button onclick="goToChapter(${state.chapterIndex + 1})" ${nextDisabled}>Suivant →</button>
    </div>
    <p class="swipe-hint">← glisser pour changer de chapitre →</p>
  `;
}

// ===== Flashcards =====
function renderFlashcards() {
  if (!courses) return;
  const ch = courses.chapters[state.chapterIndex];
  const cards = ch.flashcards;
  const container = document.getElementById('flashcards-content');

  if (!cards || cards.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 mt-8">Aucune flashcard pour ce chapitre.</p>';
    return;
  }

  const card = cards[state.flashcardIndex];
  container.innerHTML = `
    <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">
      Flashcards — Ch. ${state.chapterIndex + 1}
    </p>
    <p class="text-center text-xs text-gray-400 mb-3">Appuie sur la carte pour voir la réponse</p>
    <div class="flashcard-scene" id="flashcard" onclick="flipCard()">
      <div class="flashcard-inner">
        <div class="flashcard-face flashcard-front">
          <p class="font-semibold text-base leading-snug">${card.question}</p>
        </div>
        <div class="flashcard-face flashcard-back">
          <p class="text-sm leading-relaxed">${card.answer}</p>
        </div>
      </div>
    </div>
    <p class="text-center text-xs text-gray-400 mb-4">${state.flashcardIndex + 1} / ${cards.length}</p>
    <div class="chapter-nav">
      <button onclick="prevCard()" ${state.flashcardIndex === 0 ? 'disabled' : ''}>← Préc.</button>
      <button onclick="nextCard()" ${state.flashcardIndex === cards.length - 1 ? 'disabled' : ''}>Suiv. →</button>
    </div>
    <div class="chapter-nav mt-3">
      <button onclick="goToChapter(${state.chapterIndex - 1})" ${state.chapterIndex === 0 ? 'disabled' : ''} style="font-size:0.7rem">← Chapitre préc.</button>
      <button onclick="goToChapter(${state.chapterIndex + 1})" ${state.chapterIndex === courses.chapters.length - 1 ? 'disabled' : ''} style="font-size:0.7rem">Chapitre suiv. →</button>
    </div>
  `;
}

function flipCard() {
  document.getElementById('flashcard').classList.toggle('flipped');
}
function nextCard() {
  const cards = courses.chapters[state.chapterIndex].flashcards;
  if (state.flashcardIndex < cards.length - 1) { state.flashcardIndex++; renderFlashcards(); }
}
function prevCard() {
  if (state.flashcardIndex > 0) { state.flashcardIndex--; renderFlashcards(); }
}

// ===== QUIZ — Setup screen =====
function renderQuizSetup() {
  if (!courses) return;
  const container = document.getElementById('quiz-content');

  const chipsHTML = courses.chapters.map((ch, i) => {
    const active = state.quizSelectedChapters.includes(i);
    return `<button
      class="quiz-chip ${active ? 'active' : ''}"
      onclick="toggleChapterChip(${i})"
      data-chip="${i}">
      <span class="chip-num">${i + 1}</span>${ch.title}
    </button>`;
  }).join('');

  container.innerHTML = `
    <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Quiz — Sélection</p>

    <!-- Recherche par notion -->
    <div class="quiz-search-wrap mb-4">
      <svg class="quiz-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
      </svg>
      <input
        id="quiz-search"
        type="text"
        placeholder="Rechercher une notion… (ex: usufruit, bail)"
        class="quiz-search-input"
        value="${state.quizSearchTerm}"
        oninput="onQuizSearch(this.value)"
      />
      ${state.quizSearchTerm ? `<button class="quiz-search-clear" onclick="clearQuizSearch()">✕</button>` : ''}
    </div>

    <!-- Chips chapitres -->
    <div class="mb-2">
      <p class="text-xs text-gray-400 mb-2">Ou sélectionner un chapitre :</p>
      <div class="quiz-chips-wrap">${chipsHTML}</div>
      ${state.quizSelectedChapters.length > 0
        ? `<button class="text-xs text-indigo-400 mt-2 underline" onclick="clearChapterSelection()">Tout désélectionner</button>`
        : ''}
    </div>

    <!-- Preview count -->
    <div id="quiz-preview" class="quiz-preview"></div>

    <!-- Start button -->
    <button id="quiz-start-btn" class="quiz-start-btn" onclick="startQuiz()">
      Démarrer le quiz
    </button>
  `;

  updateQuizPreview();
}

function toggleChapterChip(index) {
  // Clear search when selecting a chapter chip
  state.quizSearchTerm = '';
  const i = state.quizSelectedChapters.indexOf(index);
  if (i === -1) state.quizSelectedChapters.push(index);
  else state.quizSelectedChapters.splice(i, 1);
  renderQuizSetup();
}

function clearChapterSelection() {
  state.quizSelectedChapters = [];
  renderQuizSetup();
}

function onQuizSearch(value) {
  state.quizSearchTerm = value.trim().toLowerCase();
  // Clear chapter selection when typing
  state.quizSelectedChapters = [];
  updateQuizPreview();
  // Update chips display
  document.querySelectorAll('.quiz-chip').forEach(c => c.classList.remove('active'));
  // Update clear button visibility
  const wrap = document.querySelector('.quiz-search-wrap');
  const existing = wrap.querySelector('.quiz-search-clear');
  if (state.quizSearchTerm && !existing) {
    const btn = document.createElement('button');
    btn.className = 'quiz-search-clear';
    btn.textContent = '✕';
    btn.onclick = clearQuizSearch;
    wrap.appendChild(btn);
  } else if (!state.quizSearchTerm && existing) {
    existing.remove();
  }
}

function clearQuizSearch() {
  state.quizSearchTerm = '';
  document.getElementById('quiz-search').value = '';
  updateQuizPreview();
  const btn = document.querySelector('.quiz-search-clear');
  if (btn) btn.remove();
}

function buildQuizQueue() {
  if (!courses) return [];
  const term = state.quizSearchTerm;
  const selected = state.quizSelectedChapters;

  let questions = [];

  courses.chapters.forEach((ch, ci) => {
    if (!ch.quiz || ch.quiz.length === 0) return;

    if (term) {
      // Search mode: match chapter title, section titles, or question text
      const chapterMatch = ch.title.toLowerCase().includes(term);
      const sectionMatch = ch.sections.some(s => s.title.toLowerCase().includes(term));
      const questionMatch = ch.quiz.filter(q =>
        q.question.toLowerCase().includes(term) ||
        q.options.some(o => o.toLowerCase().includes(term))
      );

      if (chapterMatch || sectionMatch) {
        // Include all questions from matching chapter/section
        ch.quiz.forEach(q => questions.push({ ...q, chapterTitle: ch.title }));
      } else if (questionMatch.length > 0) {
        questionMatch.forEach(q => questions.push({ ...q, chapterTitle: ch.title }));
      }
    } else if (selected.length > 0) {
      if (selected.includes(ci)) {
        ch.quiz.forEach(q => questions.push({ ...q, chapterTitle: ch.title }));
      }
    } else {
      // No filter: all questions
      ch.quiz.forEach(q => questions.push({ ...q, chapterTitle: ch.title }));
    }
  });

  // Shuffle
  return questions.sort(() => Math.random() - 0.5);
}

function updateQuizPreview() {
  const preview = document.getElementById('quiz-preview');
  if (!preview) return;
  const queue = buildQuizQueue();
  if (queue.length === 0) {
    preview.innerHTML = `<p class="text-xs text-orange-400">Aucune question trouvée pour cette sélection.</p>`;
    document.getElementById('quiz-start-btn').disabled = true;
  } else {
    preview.innerHTML = `<p class="text-xs text-indigo-500 font-medium">${queue.length} question${queue.length > 1 ? 's' : ''} sélectionnée${queue.length > 1 ? 's' : ''}</p>`;
    document.getElementById('quiz-start-btn').disabled = false;
  }
}

function startQuiz() {
  const queue = buildQuizQueue();
  if (queue.length === 0) return;
  state.quizQueue    = queue;
  state.quizIndex    = 0;
  state.quizScore    = 0;
  state.quizAnswered = false;
  state.quizMode     = 'running';
  renderQuizQuestion();
}

// ===== QUIZ — Running =====
function renderQuizQuestion() {
  const container = document.getElementById('quiz-content');
  const questions  = state.quizQueue;

  if (state.quizIndex >= questions.length) {
    renderQuizResults();
    return;
  }

  const q = questions[state.quizIndex];
  const optionsHTML = q.options.map((opt, i) => `
    <button class="quiz-option" onclick="answerQuiz(${i}, ${q.answer})">${opt}</button>
  `).join('');

  container.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest">Quiz</p>
      <button class="text-xs text-gray-400 underline" onclick="renderQuizSetup()">← Changer la sélection</button>
    </div>
    <div class="w-full bg-gray-100 rounded-full h-1.5 mb-4">
      <div class="bg-indigo-500 h-1.5 rounded-full transition-all" style="width:${(state.quizIndex / questions.length) * 100}%"></div>
    </div>
    <div class="lesson-card mb-4">
      <p class="text-xs text-gray-400 mb-1">${q.chapterTitle}</p>
      <p class="text-xs text-gray-300 mb-2">${state.quizIndex + 1} / ${questions.length}</p>
      <p class="font-semibold text-sm leading-snug">${q.question}</p>
    </div>
    <div id="quiz-options">${optionsHTML}</div>
    <div id="quiz-feedback" class="hidden mt-3 p-3 rounded-xl text-sm font-medium"></div>
    <button id="quiz-next-btn" class="hidden w-full mt-3 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm" onclick="nextQuestion()">
      ${state.quizIndex + 1 < questions.length ? 'Question suivante →' : 'Voir les résultats →'}
    </button>
  `;
}

function answerQuiz(selected, correct) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;

  document.querySelectorAll('.quiz-option').forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct) btn.classList.add('correct');
    if (i === selected && selected !== correct) btn.classList.add('wrong');
  });

  const fb = document.getElementById('quiz-feedback');
  fb.classList.remove('hidden');
  if (selected === correct) {
    state.quizScore++;
    fb.textContent = '✓ Bonne réponse !';
    fb.className = 'mt-3 p-3 rounded-xl text-sm font-medium bg-green-50 text-green-700 border border-green-200';
  } else {
    fb.textContent = '✗ Incorrect. La bonne réponse est surlignée en vert.';
    fb.className = 'mt-3 p-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200';
  }
  document.getElementById('quiz-next-btn').classList.remove('hidden');
}

function nextQuestion() {
  state.quizIndex++;
  state.quizAnswered = false;
  renderQuizQuestion();
}

// ===== QUIZ — Results =====
function renderQuizResults() {
  const container = document.getElementById('quiz-content');
  const total = state.quizQueue.length;
  const pct   = Math.round((state.quizScore / total) * 100);
  const color  = pct >= 75 ? 'text-green-500' : pct >= 50 ? 'text-orange-400' : 'text-red-500';

  container.innerHTML = `
    <div class="lesson-card text-center mt-4 mb-4">
      <p class="text-5xl font-bold ${color} mb-2">${pct}%</p>
      <p class="text-sm text-gray-500 mb-1">${state.quizScore} / ${total} correctes</p>
    </div>
    <button onclick="startQuiz()" class="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm mb-3">
      Recommencer cette sélection
    </button>
    <button onclick="renderQuizSetup()" class="w-full py-3 border-2 border-indigo-200 text-indigo-600 rounded-xl font-semibold text-sm">
      Changer la sélection
    </button>
  `;
}

// ===== Sommaire Drawer =====
function buildSommaire() {
  if (!courses) return;
  const list = document.getElementById('sommaire-list');
  list.innerHTML = courses.chapters.map((ch, ci) => `
    <div class="sommaire-chapter">
      <button class="sommaire-chapter-btn ${ci === state.chapterIndex ? 'current' : ''}"
              onclick="goToChapter(${ci})">
        <span class="text-indigo-400 font-mono text-xs">${String(ci + 1).padStart(2,'0')}</span>
        ${ch.title}
      </button>
      <div>
        ${ch.sections.map(s => `
          <button class="sommaire-section-btn" onclick="goToChapter(${ci}, '${s.id}')">
            ${s.title}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function openDrawer() {
  buildSommaire();
  document.getElementById('sommaire-drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}

function closeDrawer() {
  document.getElementById('sommaire-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

// ===== Swipe gesture =====
function setupSwipe() {
  let startX = 0, startY = 0;
  const el = document.getElementById('page-container');

  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0) goToChapter(state.chapterIndex + 1);
      else         goToChapter(state.chapterIndex - 1);
    }
  }, { passive: true });
}

// ===== Start =====
init();

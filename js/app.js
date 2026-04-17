'use strict';

// ===== State =====
let courses = null;
let state = {
  chapterIndex: 0,
  currentPage: 'home',
  flashcardIndex: 0,
  quizIndex: 0,
  quizAnswered: false,
  quizScore: 0,
};

// ===== Init =====
async function init() {
  const saved = localStorage.getItem('revisionState');
  if (saved) {
    try { Object.assign(state, JSON.parse(saved)); } catch(e) {}
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
    currentPage: state.currentPage,
  }));
}

// ===== Navigation =====
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchPage(btn.dataset.page);
    });
  });
}

function switchPage(page) {
  state.currentPage = page;
  saveState();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  if (page === 'home') renderHome();
  if (page === 'flashcards') renderFlashcards();
  if (page === 'quiz') renderQuiz();
}

// ===== Chapter navigation =====
function goToChapter(index, sectionId = null) {
  if (!courses || index < 0 || index >= courses.chapters.length) return;
  state.chapterIndex = index;
  state.flashcardIndex = 0;
  state.quizIndex = 0;
  state.quizAnswered = false;
  state.quizScore = 0;
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
  renderQuiz();
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
      <button onclick="goToChapter(${state.chapterIndex - 1})" ${prevDisabled}>
        ← Précédent
      </button>
      <button onclick="goToChapter(${state.chapterIndex + 1})" ${nextDisabled}>
        Suivant →
      </button>
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
      <button onclick="goToChapter(${state.chapterIndex - 1})" ${state.chapterIndex === 0 ? 'disabled' : ''} style="font-size:0.7rem">
        ← Chapitre préc.
      </button>
      <button onclick="goToChapter(${state.chapterIndex + 1})" ${state.chapterIndex === courses.chapters.length - 1 ? 'disabled' : ''} style="font-size:0.7rem">
        Chapitre suiv. →
      </button>
    </div>
  `;
}

function flipCard() {
  document.getElementById('flashcard').classList.toggle('flipped');
}

function nextCard() {
  const cards = courses.chapters[state.chapterIndex].flashcards;
  if (state.flashcardIndex < cards.length - 1) {
    state.flashcardIndex++;
    renderFlashcards();
  }
}

function prevCard() {
  if (state.flashcardIndex > 0) {
    state.flashcardIndex--;
    renderFlashcards();
  }
}

// ===== Quiz =====
function renderQuiz() {
  if (!courses) return;
  const ch = courses.chapters[state.chapterIndex];
  const questions = ch.quiz;
  const container = document.getElementById('quiz-content');

  if (!questions || questions.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 mt-8">Aucune question pour ce chapitre.</p>';
    return;
  }

  if (state.quizIndex >= questions.length) {
    const pct = Math.round((state.quizScore / questions.length) * 100);
    container.innerHTML = `
      <div class="lesson-card text-center mt-6">
        <p class="text-4xl font-bold text-indigo-600 mb-2">${pct}%</p>
        <p class="text-sm text-gray-500 mb-1">${state.quizScore} / ${questions.length} correctes</p>
        <p class="text-xs text-gray-400 mb-4">Chapitre ${state.chapterIndex + 1}</p>
        <button onclick="restartQuiz()" class="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm">
          Recommencer
        </button>
      </div>
      <div class="chapter-nav mt-4">
        <button onclick="goToChapter(${state.chapterIndex - 1})" ${state.chapterIndex === 0 ? 'disabled' : ''}>← Chapitre préc.</button>
        <button onclick="goToChapter(${state.chapterIndex + 1})" ${state.chapterIndex === courses.chapters.length - 1 ? 'disabled' : ''}>Chapitre suiv. →</button>
      </div>
    `;
    return;
  }

  const q = questions[state.quizIndex];
  const optionsHTML = q.options.map((opt, i) => `
    <button class="quiz-option" onclick="answerQuiz(${i}, ${q.answer})">${opt}</button>
  `).join('');

  container.innerHTML = `
    <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">
      Quiz — Ch. ${state.chapterIndex + 1}
    </p>
    <div class="lesson-card mb-4">
      <p class="text-xs text-gray-400 mb-2">${state.quizIndex + 1} / ${questions.length}</p>
      <p class="font-semibold text-sm leading-snug">${q.question}</p>
    </div>
    <div id="quiz-options">${optionsHTML}</div>
    <div id="quiz-feedback" class="hidden mt-3 p-3 rounded-xl text-sm font-medium"></div>
    <button id="quiz-next-btn" class="hidden w-full mt-3 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm" onclick="nextQuestion()">
      Suivant →
    </button>
  `;
}

function answerQuiz(selected, correct) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;

  const btns = document.querySelectorAll('.quiz-option');
  btns.forEach((btn, i) => {
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
  renderQuiz();
}

function restartQuiz() {
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswered = false;
  renderQuiz();
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
          <button class="sommaire-section-btn"
                  onclick="goToChapter(${ci}, '${s.id}')">
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

// ===== Swipe gesture (horizontal) =====
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
      if (dx < 0) goToChapter(state.chapterIndex + 1); // swipe left → next
      else         goToChapter(state.chapterIndex - 1); // swipe right → prev
    }
  }, { passive: true });
}

// ===== Start =====
init();

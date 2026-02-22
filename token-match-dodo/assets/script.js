const TOKEN_PAIRS = [
  { emoji: '💳', label: 'Visa' },
  { emoji: '🔵', label: 'Mastercard' },
  { emoji: '💚', label: 'Amex' },
  { emoji: '₿', label: 'Bitcoin' },
  { emoji: '⟠', label: 'Ethereum' },
  { emoji: '🅿️', label: 'PayPal' },
  { emoji: '🍎', label: 'Apple Pay' },
  { emoji: '🔍', label: 'Google Pay' },
];

let gameState = 'START';
let flipState = 'IDLE';
let firstCard = null;
let secondCard = null;
let matchedPairs = 0;
let totalFlips = 0;

let startTime = null;
let timerInterval = null;

let bestScore = parseInt(localStorage.getItem('dodo_token_match_highscore') || '0', 10);

const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

const timerEl = document.getElementById('timer');
const flipsEl = document.getElementById('flips');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');

const finalTimeEl = document.getElementById('finalTime');
const finalFlipsEl = document.getElementById('finalFlips');
const finalScoreEl = document.getElementById('finalScore');
const overBestScoreEl = document.getElementById('overBestScore');
const gridEl = document.getElementById('grid');

function setScreen(state) {
  startScreen.classList.toggle('hidden', state !== 'start');
  gameScreen.classList.toggle('hidden', state !== 'game');
  gameOverScreen.classList.toggle('hidden', state !== 'over');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getElapsedSeconds() {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

function calculateScore() {
  const elapsed = getElapsedSeconds();
  const base = 1000;
  return Math.max(0, base - (elapsed * 2) - (totalFlips * 5));
}

function updateHud() {
  timerEl.textContent = formatTime(getElapsedSeconds());
  flipsEl.textContent = String(totalFlips);
  scoreEl.textContent = String(calculateScore());
  bestScoreEl.textContent = String(bestScore);
}

function startTimer() {
  startTime = Date.now();
  timerEl.textContent = '00:00';
  clearInterval(timerInterval);
  timerInterval = window.setInterval(() => {
    timerEl.textContent = formatTime(getElapsedSeconds());
    scoreEl.textContent = String(calculateScore());
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clearFlipSelection() {
  firstCard = null;
  secondCard = null;
  flipState = 'IDLE';
}

function endGame() {
  if (gameState !== 'PLAYING') return;
  gameState = 'GAME_OVER';
  stopTimer();

  const finalScore = calculateScore();
  const previousBest = bestScore;

  if (finalScore > bestScore) {
    bestScore = finalScore;
    localStorage.setItem('dodo_token_match_highscore', String(finalScore));
  }

  if (typeof DodoAnalytics !== 'undefined') {
    DodoAnalytics.gameOver('Token Match Dodo', finalScore);
    if (finalScore > previousBest) DodoAnalytics.newHighScore('Token Match Dodo', finalScore);
  }

  finalTimeEl.textContent = formatTime(getElapsedSeconds());
  finalFlipsEl.textContent = String(totalFlips);
  finalScoreEl.textContent = String(finalScore);
  overBestScoreEl.textContent = String(bestScore);
  updateHud();
  setScreen('over');
}

function checkMatch() {
  if (!firstCard || !secondCard) return;

  if (firstCard.dataset.token === secondCard.dataset.token) {
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    matchedPairs += 1;
    clearFlipSelection();

    if (matchedPairs === 8) {
      endGame();
    }
    return;
  }

  window.setTimeout(() => {
    if (firstCard) firstCard.classList.remove('flipped');
    if (secondCard) secondCard.classList.remove('flipped');
    clearFlipSelection();
  }, 800);
}

function flipCard(card) {
  if (gameState !== 'PLAYING') return;
  if (flipState === 'CHECKING') return;
  if (card.classList.contains('matched')) return;
  if (card === firstCard) return;
  if (card.classList.contains('flipped')) return;

  card.classList.add('flipped');
  totalFlips += 1;
  updateHud();

  if (flipState === 'IDLE') {
    firstCard = card;
    flipState = 'ONE_FLIPPED';
    return;
  }

  if (flipState === 'ONE_FLIPPED') {
    secondCard = card;
    flipState = 'CHECKING';
    checkMatch();
  }
}

function buildGrid() {
  gridEl.innerHTML = '';

  const deck = shuffle([...TOKEN_PAIRS, ...TOKEN_PAIRS].map((token, index) => ({
    id: `${token.label}-${index}`,
    token: token.label,
    emoji: token.emoji,
    label: token.label,
  })));

  deck.forEach((item) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card-game';
    card.dataset.token = item.token;
    card.setAttribute('aria-label', `Memory card for ${item.label}`);
    card.innerHTML = `
      <span class="card-inner">
        <span class="card-front" aria-hidden="true">Dodo</span>
        <span class="card-back" aria-hidden="true">
          <span class="token-emoji">${item.emoji}</span>
          <span class="token-label">${item.label}</span>
        </span>
      </span>
    `;

    card.addEventListener('touchstart', (e) => {
      e.preventDefault();
      flipCard(card);
    }, { passive: false });
    card.addEventListener('click', () => flipCard(card));

    gridEl.appendChild(card);
  });
}

function startGame() {
  gameState = 'PLAYING';
  flipState = 'IDLE';
  firstCard = null;
  secondCard = null;
  matchedPairs = 0;
  totalFlips = 0;

  buildGrid();
  setScreen('game');
  startTimer();
  updateHud();

  if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart('Token Match Dodo');
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

updateHud();

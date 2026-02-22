const CONFIG = {
  GRID_SIZE: 3,
  INITIAL_POPUP_DURATION: 1500,
  MIN_POPUP_DURATION: 500,
  INITIAL_SPAWN_INTERVAL: 1200,
  MIN_SPAWN_INTERVAL: 400,
  MAX_ACTIVE_FRAUDS: 3,
  LIVES: 5,
  SCORE_HIT: 10,
  SCORE_MISS: -20,
  DIFFICULTY_STEP: 10,
};

let gameState = 'START';
let score = 0;
let bestScore = parseInt(localStorage.getItem('dodo_fraud_whacker_highscore') || '0', 10);
let lives = CONFIG.LIVES;
let consecutiveBlocks = 0;
let totalBlocks = 0;
let popupDuration = CONFIG.INITIAL_POPUP_DURATION;
let spawnInterval = CONFIG.INITIAL_SPAWN_INTERVAL;
let spawnTimer = null;

const activeFrauds = new Map();

const fraudTypes = [
  { label: 'Stolen Card 💳', className: 'stolen-card' },
  { label: 'Fake ID 🪪', className: 'fake-id' },
  { label: 'Chargeback 💸', className: 'chargeback' },
  { label: 'Bot Attack 🤖', className: 'bot-attack' },
];

const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const livesEl = document.getElementById('lives');
const comboEl = document.getElementById('combo');
const finalScoreEl = document.getElementById('finalScore');
const overBestScoreEl = document.getElementById('overBestScore');
const gridEl = document.getElementById('grid');

const slots = [];

function getComboMultiplier() {
  if (consecutiveBlocks >= 10) return 5;
  if (consecutiveBlocks >= 5) return 3;
  if (consecutiveBlocks >= 3) return 2;
  return 1;
}

function updateDifficulty() {
  const levels = Math.floor(totalBlocks / CONFIG.DIFFICULTY_STEP);
  popupDuration = Math.max(CONFIG.MIN_POPUP_DURATION, CONFIG.INITIAL_POPUP_DURATION - levels * 100);
  spawnInterval = Math.max(CONFIG.MIN_SPAWN_INTERVAL, CONFIG.INITIAL_SPAWN_INTERVAL - levels * 80);
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestScoreEl.textContent = String(bestScore);
  livesEl.textContent = String(lives);
  comboEl.textContent = `x${getComboMultiplier()}`;
}

function clearSlotState(slotIndex) {
  const slot = slots[slotIndex];
  slot.classList.remove('active');
  slot.classList.remove('hit');
  slot.classList.remove('missed');
  slot.innerHTML = `<span class="slot-number">${slotIndex + 1}</span>`;
}

function removeFraud(slotIndex) {
  if (!activeFrauds.has(slotIndex)) return;
  const fraud = activeFrauds.get(slotIndex);
  clearTimeout(fraud.timeoutId);
  activeFrauds.delete(slotIndex);
  clearSlotState(slotIndex);
}

function handleFraudMiss(slotIndex) {
  if (!activeFrauds.has(slotIndex) || gameState !== 'PLAYING') return;
  activeFrauds.delete(slotIndex);
  const slot = slots[slotIndex];
  slot.classList.remove('active');
  slot.classList.add('missed');
  slot.innerHTML = `<span class="slot-number">${slotIndex + 1}</span>`;

  score += CONFIG.SCORE_MISS;
  lives -= 1;
  consecutiveBlocks = 0;
  updateHud();

  setTimeout(() => {
    if (slots[slotIndex]) {
      slots[slotIndex].classList.remove('missed');
    }
  }, 180);

  if (lives <= 0) {
    endGame();
  }
}

function spawnFraud() {
  if (gameState !== 'PLAYING') return;
  if (activeFrauds.size >= CONFIG.MAX_ACTIVE_FRAUDS) return;

  const available = [];
  for (let i = 0; i < slots.length; i += 1) {
    if (!activeFrauds.has(i)) available.push(i);
  }
  if (!available.length) return;

  const slotIndex = available[Math.floor(Math.random() * available.length)];
  const fraudType = fraudTypes[Math.floor(Math.random() * fraudTypes.length)];
  const slot = slots[slotIndex];
  const timeoutId = window.setTimeout(() => handleFraudMiss(slotIndex), popupDuration);

  activeFrauds.set(slotIndex, { timeoutId });
  slot.classList.add('active');
  slot.innerHTML = `<span class="slot-number">${slotIndex + 1}</span><div class="fraud ${fraudType.className}">${fraudType.label}</div>`;
}

function scheduleSpawn() {
  if (gameState !== 'PLAYING') return;
  spawnFraud();
  spawnTimer = window.setTimeout(scheduleSpawn, spawnInterval);
}

function whackSlot(index) {
  if (gameState !== 'PLAYING') return;
  if (!activeFrauds.has(index)) {
    consecutiveBlocks = 0;
    updateHud();
    return;
  }

  removeFraud(index);
  consecutiveBlocks += 1;
  totalBlocks += 1;

  const multiplier = getComboMultiplier();
  score += CONFIG.SCORE_HIT * multiplier;
  updateDifficulty();
  updateHud();

  const slot = slots[index];
  slot.classList.add('hit');
  setTimeout(() => {
    if (slots[index]) {
      slots[index].classList.remove('hit');
    }
  }, 140);
}

function clearBoard() {
  activeFrauds.forEach((fraud) => clearTimeout(fraud.timeoutId));
  activeFrauds.clear();
  for (let i = 0; i < slots.length; i += 1) {
    clearSlotState(i);
  }
}

function setScreen(state) {
  startScreen.classList.toggle('hidden', state !== 'start');
  gameScreen.classList.toggle('hidden', state !== 'game');
  gameOverScreen.classList.toggle('hidden', state !== 'over');
}

function startGame() {
  gameState = 'PLAYING';
  score = 0;
  lives = CONFIG.LIVES;
  consecutiveBlocks = 0;
  totalBlocks = 0;
  popupDuration = CONFIG.INITIAL_POPUP_DURATION;
  spawnInterval = CONFIG.INITIAL_SPAWN_INTERVAL;
  clearTimeout(spawnTimer);
  clearBoard();
  setScreen('game');
  updateHud();

  if (typeof DodoAnalytics !== 'undefined') {
    DodoAnalytics.gameStart('Fraud Whacker Dodo');
  }

  scheduleSpawn();
}

function endGame() {
  if (gameState !== 'PLAYING') return;
  gameState = 'GAME_OVER';
  clearTimeout(spawnTimer);
  clearBoard();

  const previousBest = bestScore;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('dodo_fraud_whacker_highscore', score);
  }

  if (typeof DodoAnalytics !== 'undefined') {
    DodoAnalytics.gameOver('Fraud Whacker Dodo', score);
    if (score > previousBest) DodoAnalytics.newHighScore('Fraud Whacker Dodo', score);
  }

  finalScoreEl.textContent = String(score);
  overBestScoreEl.textContent = String(bestScore);
  updateHud();
  setScreen('over');
}

function buildGrid() {
  const totalSlots = CONFIG.GRID_SIZE * CONFIG.GRID_SIZE;
  for (let index = 0; index < totalSlots; index += 1) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot';
    slot.setAttribute('aria-label', `Terminal slot ${index + 1}`);
    slot.innerHTML = `<span class="slot-number">${index + 1}</span>`;
    slot.addEventListener('touchstart', (e) => {
      e.preventDefault();
      whackSlot(index);
    }, { passive: false });
    slot.addEventListener('click', () => whackSlot(index));

    gridEl.appendChild(slot);
    slots.push(slot);
  }
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
  const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8 };
  if (keyMap[e.key] !== undefined && gameState === 'PLAYING') {
    whackSlot(keyMap[e.key]);
  }
});

buildGrid();
updateHud();

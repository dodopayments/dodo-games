const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f0f0', label: 'Wire Transfer' },
  O: { shape: [[1, 1], [1, 1]], color: '#f0f000', label: 'Subscription' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0', label: 'Card Payment' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#C1FF00', label: 'Crypto' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000', label: 'Refund' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0', label: 'Invoice' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000', label: 'ACH' },
};

const PIECE_KEYS = Object.keys(TETROMINOES);

const CONFIG = {
  COLS: 10,
  ROWS: 20,
  CELL_SIZE: 28,
  INITIAL_INTERVAL: 800,
  MIN_INTERVAL: 100,
  LEVEL_ROWS: 10,
  FLASH_DURATION: 140,
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

canvas.width = CONFIG.COLS * CONFIG.CELL_SIZE;
canvas.height = CONFIG.ROWS * CONFIG.CELL_SIZE;

const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const levelEl = document.getElementById('level');
const finalScoreEl = document.getElementById('finalScore');
const overBestScoreEl = document.getElementById('overBestScore');

let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let linesCleared = 0;
let gameState = 'START';
let dropInterval = CONFIG.INITIAL_INTERVAL;
let lastDropTime = 0;
let animationId = null;
let bestScore = parseInt(localStorage.getItem('dodo_ledger_blocks_highscore') || '0', 10);
let clearRowsPending = [];
let clearFlashUntil = 0;

function initBoard() {
  board = Array.from({ length: CONFIG.ROWS }, () => Array(CONFIG.COLS).fill(null));
}

function rotatePiece(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      rotated[c][rows - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

function isValid(shape, offsetX, offsetY) {
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[r].length; c += 1) {
      if (!shape[r][c]) continue;
      const newRow = offsetY + r;
      const newCol = offsetX + c;
      if (newRow < 0 || newRow >= CONFIG.ROWS) return false;
      if (newCol < 0 || newCol >= CONFIG.COLS) return false;
      if (board[newRow][newCol]) return false;
    }
  }
  return true;
}

function createPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  const def = TETROMINOES[key];
  return {
    shape: def.shape.map((row) => [...row]),
    color: def.color,
    label: def.label,
    x: 0,
    y: 0,
  };
}

function spawnPiece() {
  currentPiece = nextPiece || createPiece();
  nextPiece = createPiece();
  currentPiece.x = Math.floor(CONFIG.COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
  currentPiece.y = 0;

  if (!isValid(currentPiece.shape, currentPiece.x, currentPiece.y)) {
    endGame();
    return;
  }

  drawNextPiece();
}

function movePiece(dx, dy) {
  if (!currentPiece || clearRowsPending.length) return false;
  if (isValid(currentPiece.shape, currentPiece.x + dx, currentPiece.y + dy)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    return true;
  }
  return false;
}

function rotateCurrent() {
  if (!currentPiece || clearRowsPending.length) return;
  const rotated = rotatePiece(currentPiece.shape);
  if (isValid(rotated, currentPiece.x, currentPiece.y)) {
    currentPiece.shape = rotated;
  }
}

function hardDrop() {
  if (!currentPiece || clearRowsPending.length) return;
  while (movePiece(0, 1)) {}
  lockPiece();
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestScoreEl.textContent = String(bestScore);
  levelEl.textContent = String(level);
}

function markRowsForClear(rows, now) {
  clearRowsPending = rows;
  clearFlashUntil = now + CONFIG.FLASH_DURATION;
}

function settleClearedRows() {
  if (!clearRowsPending.length) return;
  clearRowsPending
    .sort((a, b) => b - a)
    .forEach((row) => board.splice(row, 1));

  while (board.length < CONFIG.ROWS) {
    board.unshift(Array(CONFIG.COLS).fill(null));
  }

  clearRowsPending = [];
}

function clearRows(now) {
  const fullRows = [];
  for (let r = CONFIG.ROWS - 1; r >= 0; r -= 1) {
    if (board[r].every((cell) => cell !== null)) fullRows.push(r);
  }
  if (fullRows.length === 0) return false;

  const points = [0, 100, 300, 500, 800][fullRows.length] || 800;
  score += points * level;
  linesCleared += fullRows.length;
  level = Math.floor(linesCleared / CONFIG.LEVEL_ROWS) + 1;
  dropInterval = Math.max(CONFIG.MIN_INTERVAL, CONFIG.INITIAL_INTERVAL - (level - 1) * 70);
  updateHud();
  markRowsForClear(fullRows, now);
  return true;
}

function lockPiece() {
  if (!currentPiece) return;
  for (let r = 0; r < currentPiece.shape.length; r += 1) {
    for (let c = 0; c < currentPiece.shape[r].length; c += 1) {
      if (!currentPiece.shape[r][c]) continue;
      const boardRow = currentPiece.y + r;
      if (boardRow < 0) {
        endGame();
        return;
      }
      board[boardRow][currentPiece.x + c] = currentPiece.color;
    }
  }

  if (!clearRows(performance.now())) {
    spawnPiece();
  }
}

function drawCell(context, col, row, color, alpha) {
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(col * CONFIG.CELL_SIZE + 1, row * CONFIG.CELL_SIZE + 1, CONFIG.CELL_SIZE - 2, CONFIG.CELL_SIZE - 2);
  context.globalAlpha = 1;
  context.shadowColor = color;
  context.shadowBlur = 4;
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.strokeRect(col * CONFIG.CELL_SIZE + 1, row * CONFIG.CELL_SIZE + 1, CONFIG.CELL_SIZE - 2, CONFIG.CELL_SIZE - 2);
  context.shadowBlur = 0;
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;

  const shape = nextPiece.shape;
  const previewCell = 18;
  const width = shape[0].length * previewCell;
  const height = shape.length * previewCell;
  const startX = Math.floor((nextCanvas.width - width) / 2);
  const startY = Math.floor((nextCanvas.height - height) / 2);

  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[r].length; c += 1) {
      if (!shape[r][c]) continue;
      const x = startX + c * previewCell;
      const y = startY + r * previewCell;
      nextCtx.fillStyle = nextPiece.color;
      nextCtx.fillRect(x + 1, y + 1, previewCell - 2, previewCell - 2);
      nextCtx.strokeStyle = nextPiece.color;
      nextCtx.strokeRect(x + 1, y + 1, previewCell - 2, previewCell - 2);
    }
  }
}

function draw(timestamp = performance.now()) {
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= CONFIG.ROWS; r += 1) {
    ctx.beginPath();
    ctx.moveTo(0, r * CONFIG.CELL_SIZE);
    ctx.lineTo(canvas.width, r * CONFIG.CELL_SIZE);
    ctx.stroke();
  }
  for (let c = 0; c <= CONFIG.COLS; c += 1) {
    ctx.beginPath();
    ctx.moveTo(c * CONFIG.CELL_SIZE, 0);
    ctx.lineTo(c * CONFIG.CELL_SIZE, canvas.height);
    ctx.stroke();
  }

  for (let r = 0; r < CONFIG.ROWS; r += 1) {
    for (let c = 0; c < CONFIG.COLS; c += 1) {
      if (board[r][c]) {
        drawCell(ctx, c, r, board[r][c], 0.85);
      }
    }
  }

  if (clearRowsPending.length && timestamp < clearFlashUntil) {
    ctx.fillStyle = 'rgba(193, 255, 0, 0.35)';
    clearRowsPending.forEach((row) => {
      ctx.fillRect(0, row * CONFIG.CELL_SIZE, canvas.width, CONFIG.CELL_SIZE);
    });
  }

  if (currentPiece) {
    for (let r = 0; r < currentPiece.shape.length; r += 1) {
      for (let c = 0; c < currentPiece.shape[r].length; c += 1) {
        if (currentPiece.shape[r][c]) {
          drawCell(ctx, currentPiece.x + c, currentPiece.y + r, currentPiece.color, 1);
        }
      }
    }
  }
}

function setScreen(state) {
  startScreen.classList.toggle('hidden', state !== 'start');
  gameScreen.classList.toggle('hidden', state !== 'game');
  gameOverScreen.classList.toggle('hidden', state !== 'over');
}

function startGame() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  initBoard();
  currentPiece = null;
  nextPiece = null;
  score = 0;
  level = 1;
  linesCleared = 0;
  dropInterval = CONFIG.INITIAL_INTERVAL;
  lastDropTime = 0;
  clearRowsPending = [];
  clearFlashUntil = 0;
  gameState = 'PLAYING';
  updateHud();
  setScreen('game');
  spawnPiece();

  if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart('Ledger Blocks Dodo');

  draw();
  animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
  if (gameState !== 'PLAYING') return;
  gameState = 'GAME_OVER';
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  const previousBest = bestScore;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('dodo_ledger_blocks_highscore', String(score));
  }

  if (typeof DodoAnalytics !== 'undefined') {
    DodoAnalytics.gameOver('Ledger Blocks Dodo', score);
    if (score > previousBest) DodoAnalytics.newHighScore('Ledger Blocks Dodo', score);
  }

  finalScoreEl.textContent = String(score);
  overBestScoreEl.textContent = String(bestScore);
  updateHud();
  setScreen('over');
}

function gameLoop(timestamp) {
  if (gameState !== 'PLAYING') return;

  if (clearRowsPending.length) {
    if (timestamp >= clearFlashUntil) {
      settleClearedRows();
      spawnPiece();
      lastDropTime = timestamp;
    }
  } else if (timestamp - lastDropTime >= dropInterval) {
    if (!movePiece(0, 1)) {
      lockPiece();
    }
    lastDropTime = timestamp;
  }

  draw(timestamp);
  animationId = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
  if (gameState !== 'PLAYING') return;
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      movePiece(-1, 0);
      break;
    case 'ArrowRight':
      e.preventDefault();
      movePiece(1, 0);
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (!movePiece(0, 1)) lockPiece();
      break;
    case 'ArrowUp':
      e.preventDefault();
      rotateCurrent();
      break;
    case ' ':
      e.preventDefault();
      hardDrop();
      break;
    default:
      break;
  }
  draw();
});

document.getElementById('btnLeft').addEventListener('click', () => {
  if (gameState === 'PLAYING') {
    movePiece(-1, 0);
    draw();
  }
});

document.getElementById('btnRight').addEventListener('click', () => {
  if (gameState === 'PLAYING') {
    movePiece(1, 0);
    draw();
  }
});

document.getElementById('btnRotate').addEventListener('click', () => {
  if (gameState === 'PLAYING') {
    rotateCurrent();
    draw();
  }
});

document.getElementById('btnSoftDrop').addEventListener('click', () => {
  if (gameState === 'PLAYING') {
    if (!movePiece(0, 1)) lockPiece();
    draw();
  }
});

document.getElementById('btnHardDrop').addEventListener('click', () => {
  if (gameState === 'PLAYING') {
    hardDrop();
    draw();
  }
});

['btnLeft', 'btnRight', 'btnRotate', 'btnSoftDrop', 'btnHardDrop'].forEach((id) => {
  document.getElementById(id).addEventListener('touchstart', (e) => {
    e.preventDefault();
    document.getElementById(id).click();
  }, { passive: false });
});

initBoard();
setScreen('start');
updateHud();
drawNextPiece();

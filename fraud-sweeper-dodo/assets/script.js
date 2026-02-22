const CONFIG = {
  ROWS: 9,
  COLS: 9,
  MINES: 10,
};

let grid = [];
let cellElements = [];
let flagMode = false;
let firstClick = true;
let gameState = 'START';
let startTime = null;
let timerInterval = null;
let revealedCount = 0;
let bestTime = parseInt(localStorage.getItem('dodo_fraud_sweeper_best_time') || '0', 10);

const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const winScreen = document.getElementById('winScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const playAgainFromWin = document.getElementById('playAgainFromWin');
const gridEl = document.getElementById('grid');
const timerEl = document.getElementById('timer');
const bestTimeEl = document.getElementById('bestTime');
const winTimeEl = document.getElementById('winTime');
const winBestTimeEl = document.getElementById('winBestTime');
const flagModeBtn = document.getElementById('flagModeBtn');

function setScreen(state) {
  startScreen.classList.toggle('hidden', state !== 'start');
  gameScreen.classList.toggle('hidden', state !== 'game');
  winScreen.classList.toggle('hidden', state !== 'win');
  gameOverScreen.classList.toggle('hidden', state !== 'over');
}

function updateHud() {
  const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  timerEl.textContent = `${elapsed}s`;
  bestTimeEl.textContent = `${bestTime}s`;
}

function startTimer() {
  startTime = Date.now();
  clearInterval(timerInterval);
  timerInterval = window.setInterval(updateHud, 250);
  updateHud();
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function initGrid() {
  grid = [];
  for (let r = 0; r < CONFIG.ROWS; r += 1) {
    grid[r] = [];
    for (let c = 0; c < CONFIG.COLS; c += 1) {
      grid[r][c] = { isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0 };
    }
  }
}

function calculateAdjacency() {
  for (let r = 0; r < CONFIG.ROWS; r += 1) {
    for (let c = 0; c < CONFIG.COLS; c += 1) {
      if (grid[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < CONFIG.ROWS && nc >= 0 && nc < CONFIG.COLS && grid[nr][nc].isMine) {
            count += 1;
          }
        }
      }
      grid[r][c].adjacentMines = count;
    }
  }
}

function placeMines(safeRow, safeCol) {
  let placed = 0;
  while (placed < CONFIG.MINES) {
    const r = Math.floor(Math.random() * CONFIG.ROWS);
    const c = Math.floor(Math.random() * CONFIG.COLS);
    if ((r === safeRow && c === safeCol) || grid[r][c].isMine) continue;
    grid[r][c].isMine = true;
    placed += 1;
  }
  calculateAdjacency();
}

function renderCell(row, col) {
  const cell = grid[row][col];
  const el = cellElements[row][col];

  el.className = 'cell';
  if (cell.isRevealed) {
    el.classList.add('revealed');
    if (cell.isMine) {
      el.textContent = '🚨';
      el.classList.add('mine');
    } else if (cell.adjacentMines > 0) {
      el.textContent = String(cell.adjacentMines);
      el.classList.add(`num-${cell.adjacentMines}`);
    } else {
      el.textContent = '';
    }
  } else if (cell.isFlagged) {
    el.textContent = '🚩';
    el.classList.add('flagged');
  } else {
    el.textContent = '';
  }
}

function renderGrid() {
  for (let r = 0; r < CONFIG.ROWS; r += 1) {
    for (let c = 0; c < CONFIG.COLS; c += 1) {
      renderCell(r, c);
    }
  }
}

function toggleFlag(row, col) {
  const cell = grid[row][col];
  if (cell.isRevealed) return;
  cell.isFlagged = !cell.isFlagged;
  renderCell(row, col);
}

function gameOver() {
  gameState = 'GAME_OVER';
  stopTimer();
  for (let r = 0; r < CONFIG.ROWS; r += 1) {
    for (let c = 0; c < CONFIG.COLS; c += 1) {
      if (grid[r][c].isMine) {
        grid[r][c].isRevealed = true;
        renderCell(r, c);
      }
    }
  }
  if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameOver('Fraud Sweeper Dodo', 0);
  setScreen('over');
}

function winGame() {
  gameState = 'WIN';
  stopTimer();
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const prevBest = bestTime;
  if (bestTime === 0 || elapsed < bestTime) {
    bestTime = elapsed;
    localStorage.setItem('dodo_fraud_sweeper_best_time', String(bestTime));
  }
  if (typeof DodoAnalytics !== 'undefined') {
    DodoAnalytics.gameOver('Fraud Sweeper Dodo', elapsed);
    if (elapsed < prevBest || prevBest === 0) DodoAnalytics.newHighScore('Fraud Sweeper Dodo', elapsed);
  }
  winTimeEl.textContent = String(elapsed);
  winBestTimeEl.textContent = String(bestTime);
  updateHud();
  setScreen('win');
}

function revealCell(row, col) {
  const cell = grid[row][col];
  if (cell.isRevealed || cell.isFlagged) return;

  if (firstClick) {
    firstClick = false;
    placeMines(row, col);
    startTimer();
  }

  if (cell.isMine) {
    gameOver();
    return;
  }

  const queue = [[row, col]];
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const curr = grid[r][c];
    if (curr.isRevealed || curr.isFlagged || curr.isMine) continue;
    curr.isRevealed = true;
    revealedCount += 1;
    renderCell(r, c);

    if (curr.adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < CONFIG.ROWS && nc >= 0 && nc < CONFIG.COLS && !grid[nr][nc].isRevealed) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  if (revealedCount === CONFIG.ROWS * CONFIG.COLS - CONFIG.MINES) {
    winGame();
  }
}

function handleCellClick(row, col) {
  if (gameState !== 'PLAYING' && gameState !== 'START') return;
  if (gameState === 'START') gameState = 'PLAYING';

  if (flagMode) {
    toggleFlag(row, col);
  } else {
    revealCell(row, col);
  }
}

function buildGrid() {
  gridEl.innerHTML = '';
  cellElements = [];
  for (let r = 0; r < CONFIG.ROWS; r += 1) {
    cellElements[r] = [];
    for (let c = 0; c < CONFIG.COLS; c += 1) {
      const cellEl = document.createElement('button');
      cellEl.type = 'button';
      cellEl.className = 'cell';
      cellEl.setAttribute('aria-label', `Cell ${r + 1}-${c + 1}`);
      cellEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleCellClick(r, c);
      }, { passive: false });
      cellEl.addEventListener('click', () => handleCellClick(r, c));
      cellEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (gameState === 'START' || gameState === 'PLAYING') {
          toggleFlag(r, c);
        }
      });
      gridEl.appendChild(cellEl);
      cellElements[r][c] = cellEl;
    }
  }
}

function startGame() {
  gameState = 'START';
  firstClick = true;
  flagMode = false;
  revealedCount = 0;
  startTime = null;
  stopTimer();
  flagModeBtn.textContent = '🚩 FLAG MODE: OFF';
  flagModeBtn.classList.remove('active');

  initGrid();
  renderGrid();
  updateHud();
  setScreen('game');

  if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart('Fraud Sweeper Dodo');
}

flagModeBtn.addEventListener('click', () => {
  flagMode = !flagMode;
  flagModeBtn.textContent = `🚩 FLAG MODE: ${flagMode ? 'ON' : 'OFF'}`;
  flagModeBtn.classList.toggle('active', flagMode);
});

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
playAgainFromWin.addEventListener('click', startGame);

buildGrid();
updateHud();

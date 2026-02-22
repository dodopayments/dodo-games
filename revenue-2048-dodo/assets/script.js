const GRID_SIZE = 4;
const STORAGE_KEY = 'dodo_revenue_2048_highscore';
const WIN_VALUE = 1073741824;

let gameState = 'START';
let score = 0;
let bestScore = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
let board = createEmptyBoard();
let hasWon = false;

let touchStartX = 0;
let touchStartY = 0;

const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const winOverlay = document.getElementById('winOverlay');

const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const newGameButton = document.getElementById('newGameButton');
const keepPlayingButton = document.getElementById('keepPlayingButton');
const newGameFromWinButton = document.getElementById('newGameFromWinButton');

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const finalScoreEl = document.getElementById('finalScore');
const overBestScoreEl = document.getElementById('overBestScore');
const gridEl = document.getElementById('grid');

const cells = [];

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function cloneBoard(source) {
  return source.map((row) => row.slice());
}

function flattenBoard(source) {
  return source.flat();
}

function sameBoard(a, b) {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (a[row][col] !== b[row][col]) return false;
    }
  }
  return true;
}

function setScreen(state) {
  startScreen.classList.toggle('hidden', state !== 'start');
  gameScreen.classList.toggle('hidden', state !== 'game');
  gameOverScreen.classList.toggle('hidden', state !== 'over');
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestScoreEl.textContent = String(bestScore);
}

function formatTileValue(value) {
  if (value >= WIN_VALUE) return '$1B';
  if (value >= 1000000) return `$${Math.floor(value / 1000000)}M`;
  if (value >= 1000) return `$${Math.floor(value / 1000)}K`;
  return `$${value}`;
}

function getTileClassByRange(value) {
  if (value >= WIN_VALUE) return 'tile-unicorn';
  if (value >= 131072) return value <= 524288 ? 'tile-orange-1' : 'tile-orange-2';
  if (value >= 4096) return value <= 16384 ? 'tile-purple-1' : 'tile-purple-2';
  if (value >= 256) return value <= 512 ? 'tile-gold-1' : 'tile-gold-2';
  if (value >= 16) return value <= 32 ? 'tile-green-1' : 'tile-green-2';
  return 'tile-dark';
}

function renderBoard(options = {}) {
  const newTiles = options.newTiles || [];
  const mergedTiles = options.mergedTiles || [];
  const direction = options.direction || '';
  const animateSlide = options.animateSlide || false;
  const newSet = new Set(newTiles);
  const mergedSet = new Set(mergedTiles);

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const index = row * GRID_SIZE + col;
      const cell = cells[index];
      cell.innerHTML = '';

      const value = board[row][col];
      if (value === 0) continue;

      const tile = document.createElement('div');
      tile.className = `tile ${getTileClassByRange(value)}`;
      tile.textContent = formatTileValue(value);

      if (newSet.has(index)) tile.classList.add('new');
      if (mergedSet.has(index)) tile.classList.add('merge');
      if (animateSlide && direction) {
        tile.classList.add(`slide-${direction}`);
        requestAnimationFrame(() => {
          tile.classList.remove(`slide-${direction}`);
        });
      }

      cell.appendChild(tile);
    }
  }
}

function buildGrid() {
  for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    gridEl.appendChild(cell);
    cells.push(cell);
  }
}

function getEmptyPositions() {
  const empty = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] === 0) empty.push([row, col]);
    }
  }
  return empty;
}

function addRandomTile() {
  const empty = getEmptyPositions();
  if (!empty.length) return null;
  const [row, col] = empty[Math.floor(Math.random() * empty.length)];
  board[row][col] = 1;
  return row * GRID_SIZE + col;
}

function transpose(source) {
  const result = createEmptyBoard();
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      result[col][row] = source[row][col];
    }
  }
  return result;
}

function reverseRows(source) {
  return source.map((row) => row.slice().reverse());
}

function slide(row, mergeCollector, rowIndex) {
  let tiles = row.filter((value) => value !== 0);
  const mergeIndices = [];
  for (let i = 0; i < tiles.length - 1; i += 1) {
    if (tiles[i] === tiles[i + 1]) {
      tiles[i] *= 2;
      score += tiles[i];
      tiles.splice(i + 1, 1);
      mergeIndices.push(i);
      i += 1;
    }
  }
  while (tiles.length < GRID_SIZE) tiles.push(0);
  if (mergeCollector && mergeIndices.length) {
    mergeCollector.push({ rowIndex, mergeIndices });
  }
  return tiles;
}

function mergeToCellIndices(mergeMeta, direction) {
  const indices = [];
  for (let i = 0; i < mergeMeta.length; i += 1) {
    const item = mergeMeta[i];
    for (let j = 0; j < item.mergeIndices.length; j += 1) {
      const col = item.mergeIndices[j];
      let row = item.rowIndex;
      let mappedCol = col;

      if (direction === 'right') mappedCol = GRID_SIZE - 1 - col;
      if (direction === 'up') {
        row = col;
        mappedCol = item.rowIndex;
      }
      if (direction === 'down') {
        row = GRID_SIZE - 1 - col;
        mappedCol = item.rowIndex;
      }
      indices.push(row * GRID_SIZE + mappedCol);
    }
  }
  return indices;
}

function moveBoard(direction) {
  let working = cloneBoard(board);
  const mergeMeta = [];

  if (direction === 'right') working = reverseRows(working);
  if (direction === 'up' || direction === 'down') working = transpose(working);
  if (direction === 'down') working = reverseRows(working);

  const slided = working.map((row, rowIndex) => slide(row, mergeMeta, rowIndex));

  let restored = cloneBoard(slided);
  if (direction === 'down') restored = reverseRows(restored);
  if (direction === 'up' || direction === 'down') restored = transpose(restored);
  if (direction === 'right') restored = reverseRows(restored);

  const mergedTiles = mergeToCellIndices(mergeMeta, direction);
  return { nextBoard: restored, mergedTiles };
}

function canMove() {
  if (getEmptyPositions().length) return true;
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const value = board[row][col];
      if (row + 1 < GRID_SIZE && board[row + 1][col] === value) return true;
      if (col + 1 < GRID_SIZE && board[row][col + 1] === value) return true;
    }
  }
  return false;
}

function handleWinState() {
  const all = flattenBoard(board);
  if (!hasWon && all.some((value) => value >= WIN_VALUE)) {
    hasWon = true;
    gameState = 'WIN';
    winOverlay.classList.remove('hidden');
  }
}

function endGame() {
  if (gameState === 'GAME_OVER') return;
  const previousBest = bestScore;
  gameState = 'GAME_OVER';

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(STORAGE_KEY, String(score));
  }

  if (typeof DodoAnalytics !== 'undefined') {
    DodoAnalytics.gameOver('Revenue 2048 Dodo', score);
    if (score > previousBest) DodoAnalytics.newHighScore('Revenue 2048 Dodo', score);
  }

  finalScoreEl.textContent = String(score);
  overBestScoreEl.textContent = String(bestScore);
  updateHud();
  setScreen('over');
}

function move(direction) {
  if (gameState !== 'PLAYING') return;

  const previous = cloneBoard(board);
  const previousScore = score;
  const result = moveBoard(direction);
  const changed = !sameBoard(previous, result.nextBoard);

  if (!changed) {
    score = previousScore;
    return;
  }

  board = result.nextBoard;
  const newIndex = addRandomTile();
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(STORAGE_KEY, String(bestScore));
  }

  const newTiles = newIndex === null ? [] : [newIndex];
  renderBoard({ newTiles, mergedTiles: result.mergedTiles, direction, animateSlide: true });
  updateHud();
  handleWinState();

  if (gameState === 'PLAYING' && !canMove()) {
    endGame();
  }
}

function startGame() {
  gameState = 'PLAYING';
  score = 0;
  hasWon = false;
  board = createEmptyBoard();
  winOverlay.classList.add('hidden');
  addRandomTile();
  addRandomTile();

  setScreen('game');
  updateHud();
  renderBoard();

  if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart('Revenue 2048 Dodo');
}

function keepPlaying() {
  if (gameState !== 'WIN') return;
  gameState = 'PLAYING';
  winOverlay.classList.add('hidden');
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
newGameButton.addEventListener('click', startGame);
newGameFromWinButton.addEventListener('click', startGame);
keepPlayingButton.addEventListener('click', keepPlaying);

document.addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const dirMap = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
  };
  move(dirMap[e.key]);
});

gridEl.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

gridEl.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? 'right' : 'left');
  } else {
    move(dy > 0 ? 'down' : 'up');
  }
}, { passive: true });

buildGrid();
updateHud();
renderBoard();

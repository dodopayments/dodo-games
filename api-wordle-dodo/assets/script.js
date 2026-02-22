const WORDS = [
  'DEBIT', 'TOKEN', 'FRAUD', 'VAULT', 'SWIFT',
  'BLOCK', 'CHAIN', 'BUYER', 'MONEY', 'PRICE',
  'LEDGE', 'BATCH', 'FUNDS', 'QUOTA', 'YIELD',
  'STAKE', 'ASSET', 'BONDS', 'TRADE', 'AUDIT',
  'DRAFT', 'FLOAT', 'GROSS', 'INDEX', 'LIMIT',
  'MERGE', 'ORDER', 'PAYER', 'QUERY', 'RATES',
  'SPLIT', 'TAXES', 'UNION', 'VALUE', 'WIRES',
  'XFERS', 'ZEROS', 'AGENT', 'BILLS', 'CARDS',
  'DEALS', 'ESCRO', 'FOREX', 'GRANT', 'HEDGE',
  'ISSUE', 'JOINT', 'KIOSK', 'LOANS', 'MICRO',
];

const KB_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DELETE'],
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

let targetWord = '';
let currentGuess = '';
let guesses = [];
let gameState = 'PLAYING';
let letterStates = {};

let stats = JSON.parse(localStorage.getItem('dodo_wordle_stats') || '{"games":0,"wins":0}');

const boardEl = document.getElementById('gameBoard');
const gamesPlayedEl = document.getElementById('gamesPlayed');
const winRateEl = document.getElementById('winRate');
const overlayEl = document.getElementById('resultOverlay');
const resultTitleEl = document.getElementById('resultTitle');
const resultTextEl = document.getElementById('resultText');
const shareBtn = document.getElementById('shareBtn');
const newGameBtn = document.getElementById('newGameBtn');

function pickRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function updateStatsUi() {
  const winRate = stats.games ? Math.round((stats.wins / stats.games) * 100) : 0;
  gamesPlayedEl.textContent = String(stats.games);
  winRateEl.textContent = String(winRate);
}

function buildBoard() {
  boardEl.innerHTML = '';
  for (let row = 0; row < MAX_GUESSES; row += 1) {
    const rowEl = document.createElement('div');
    rowEl.className = `guess-row row-${row}`;
    for (let col = 0; col < WORD_LENGTH; col += 1) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      rowEl.appendChild(tile);
    }
    boardEl.appendChild(rowEl);
  }
}

function buildKeyboard() {
  KB_ROWS.forEach((row, rowIdx) => {
    const rowEl = document.getElementById(`kb-row-${rowIdx}`);
    rowEl.innerHTML = '';
    row.forEach((key) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = key === 'DELETE' ? '⌫' : key;
      btn.dataset.key = key;
      btn.className = 'kb-key';
      if (key === 'ENTER' || key === 'DELETE') btn.classList.add('kb-wide');
      btn.addEventListener('click', () => handleKey(key));
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleKey(key);
      }, { passive: false });
      rowEl.appendChild(btn);
    });
  });
}

function updateCurrentRow() {
  const row = guesses.length;
  const tiles = document.querySelectorAll(`.row-${row} .tile`);
  tiles.forEach((tile, i) => {
    tile.textContent = currentGuess[i] || '';
    tile.classList.toggle('filled', Boolean(currentGuess[i]));
  });
}

function shakeRow(row) {
  const rowEl = document.querySelector(`.row-${row}`);
  if (!rowEl) return;
  rowEl.classList.add('shake');
  setTimeout(() => rowEl.classList.remove('shake'), 300);
}

function evaluateGuess(guess, target) {
  const result = Array(WORD_LENGTH).fill('absent');
  const targetArr = target.split('');
  const guessArr = guess.split('');

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      targetArr[i] = null;
      guessArr[i] = null;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guessArr[i] === null) continue;
    const idx = targetArr.indexOf(guessArr[i]);
    if (idx !== -1) {
      result[i] = 'present';
      targetArr[idx] = null;
    }
  }

  return result;
}

function updateKeyState(letter, state) {
  const btn = document.querySelector(`[data-key="${letter}"]`);
  if (!btn) return;
  const priority = { correct: 3, present: 2, absent: 1 };
  const current = btn.dataset.state || '';
  if (!current || priority[state] > priority[current]) {
    btn.dataset.state = state;
    const isWide = btn.dataset.key === 'ENTER' || btn.dataset.key === 'DELETE';
    btn.className = 'kb-key';
    if (isWide) btn.classList.add('kb-wide');
    btn.classList.add(state);
    letterStates[letter] = state;
  }
}

function revealGuess(guess, results) {
  const row = guesses.length - 1;
  const tiles = document.querySelectorAll(`.row-${row} .tile`);

  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add('reveal');
      setTimeout(() => {
        tile.classList.add(results[i]);
        tile.classList.remove('reveal');
        updateKeyState(guess[i], results[i]);
      }, 250);
    }, i * 100);
  });
}

function getShareText() {
  const lines = [`API Wordle Dodo ${guesses.length}/${MAX_GUESSES}`, ''];
  guesses.forEach((guess) => {
    const results = evaluateGuess(guess, targetWord);
    const emojis = results.map((r) => (r === 'correct' ? '🟩' : r === 'present' ? '🟨' : '⬛'));
    lines.push(emojis.join(''));
  });
  return lines.join('\n');
}

function endGame(won) {
  gameState = won ? 'WIN' : 'LOSE';

  stats.games += 1;
  if (won) stats.wins += 1;
  localStorage.setItem('dodo_wordle_stats', JSON.stringify(stats));
  updateStatsUi();

  if (typeof DodoAnalytics !== 'undefined') {
    DodoAnalytics.gameOver('API Wordle Dodo', guesses.length);
    if (won) DodoAnalytics.newHighScore('API Wordle Dodo', MAX_GUESSES - guesses.length + 1);
  }

  resultTitleEl.textContent = won ? 'Payment API solved!' : 'Request failed!';
  resultTextEl.textContent = won
    ? `You cracked it in ${guesses.length} ${guesses.length === 1 ? 'try' : 'tries'}.`
    : `The term was ${targetWord}.`;
  overlayEl.classList.remove('hidden');
}

function submitGuess() {
  const guess = currentGuess;
  guesses.push(guess);
  currentGuess = '';

  const results = evaluateGuess(guess, targetWord);
  revealGuess(guess, results);

  const revealDuration = WORD_LENGTH * 100 + 300;
  setTimeout(() => {
    if (guess === targetWord) {
      endGame(true);
      return;
    }
    if (guesses.length >= MAX_GUESSES) {
      endGame(false);
    }
  }, revealDuration);
}

function handleKey(key) {
  if (gameState !== 'PLAYING') return;

  if (key === 'DELETE') {
    currentGuess = currentGuess.slice(0, -1);
    updateCurrentRow();
  } else if (key === 'ENTER') {
    if (currentGuess.length < WORD_LENGTH) {
      shakeRow(guesses.length);
      return;
    }
    submitGuess();
  } else if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
    currentGuess += key;
    updateCurrentRow();
  }
}

function resetKeyboardStates() {
  document.querySelectorAll('.kb-key').forEach((btn) => {
    const isWide = btn.dataset.key === 'ENTER' || btn.dataset.key === 'DELETE';
    btn.className = 'kb-key';
    if (isWide) btn.classList.add('kb-wide');
    delete btn.dataset.state;
  });
}

function startGame() {
  targetWord = pickRandomWord();
  currentGuess = '';
  guesses = [];
  gameState = 'PLAYING';
  letterStates = {};
  overlayEl.classList.add('hidden');
  shareBtn.textContent = 'Share Results';

  buildBoard();
  resetKeyboardStates();

  if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart('API Wordle Dodo');
}

shareBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(getShareText()).then(() => {
    shareBtn.textContent = 'Copied! ✓';
    setTimeout(() => {
      shareBtn.textContent = 'Share Results';
    }, 2000);
  }).catch(() => {
    alert(getShareText());
  });
});

newGameBtn.addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
  if (gameState !== 'PLAYING') return;
  if (e.key === 'Enter') handleKey('ENTER');
  else if (e.key === 'Backspace') handleKey('DELETE');
  else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
});

buildKeyboard();
updateStatsUi();
startGame();

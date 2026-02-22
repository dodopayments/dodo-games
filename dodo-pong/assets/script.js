const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CONFIG = {
  PADDLE_WIDTH: 80,
  PADDLE_HEIGHT: 12,
  BALL_RADIUS: 8,
  BALL_SPEED_INITIAL: 4,
  BALL_SPEED_INCREASE: 0.05,
  AI_SPEED: 3.2,
  WIN_SCORE: 11,
  WIN_BY: 2,
};

const STATUS_MESSAGES = [
  'Transaction Approved! ✅',
  'Processing... ⏳',
  'Payment Declined! ❌',
];

const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const playerScoreEl = document.getElementById('playerScore');
const aiScoreEl = document.getElementById('aiScore');
const bestScoreEl = document.getElementById('bestScore');
const overBestScoreEl = document.getElementById('overBestScore');
const finalPlayerScoreEl = document.getElementById('finalPlayerScore');
const finalAiScoreEl = document.getElementById('finalAiScore');
const resultTitle = document.getElementById('resultTitle');
const statusOverlay = document.getElementById('statusOverlay');

const keys = {};

let gameState = 'START';
let ball = { x: 0, y: 0, vx: 0, vy: 0, speed: CONFIG.BALL_SPEED_INITIAL };
let playerPaddle = { x: 0, y: 0, width: CONFIG.PADDLE_WIDTH, height: CONFIG.PADDLE_HEIGHT };
let aiPaddle = { x: 0, y: 0, width: CONFIG.PADDLE_WIDTH, height: CONFIG.PADDLE_HEIGHT };
let playerScore = 0;
let aiScore = 0;
let bestScore = parseInt(localStorage.getItem('dodo_pong_highscore') || '0', 10);

let aiAimX = 0;
let overlayTimer = null;

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth, 480);
  canvas.height = Math.min(window.innerHeight - 80, 640);

  playerPaddle.y = canvas.height - 24;
  aiPaddle.y = 12;
  playerPaddle.x = Math.max(0, Math.min(canvas.width - playerPaddle.width, playerPaddle.x));
  aiPaddle.x = Math.max(0, Math.min(canvas.width - aiPaddle.width, aiPaddle.x));

  if (gameState !== 'PLAYING') {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
  }
}

window.addEventListener('resize', resizeCanvas);

function setScreen(state) {
  startScreen.classList.toggle('hidden', state !== 'start');
  gameScreen.classList.toggle('hidden', state !== 'game');
  gameOverScreen.classList.toggle('hidden', state !== 'over');
}

function updateHud() {
  playerScoreEl.textContent = String(playerScore);
  aiScoreEl.textContent = String(aiScore);
  bestScoreEl.textContent = String(bestScore);
}

function showRallyMessage() {
  const message = STATUS_MESSAGES[Math.floor(Math.random() * STATUS_MESSAGES.length)];
  statusOverlay.textContent = message;
  statusOverlay.classList.remove('hidden');
  clearTimeout(overlayTimer);
  overlayTimer = window.setTimeout(() => {
    statusOverlay.classList.add('hidden');
  }, 850);
}

function launchBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  const angle = (Math.random() * 60 - 30) * Math.PI / 180;
  const dir = Math.random() < 0.5 ? 1 : -1;
  ball.speed = CONFIG.BALL_SPEED_INITIAL;
  ball.vx = Math.sin(angle) * ball.speed;
  ball.vy = dir * Math.cos(angle) * ball.speed;
}

function checkWin() {
  const diff = Math.abs(playerScore - aiScore);
  if ((playerScore >= CONFIG.WIN_SCORE || aiScore >= CONFIG.WIN_SCORE) && diff >= CONFIG.WIN_BY) {
    endGame(playerScore > aiScore ? 'player' : 'ai');
  }
}

function updateBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - CONFIG.BALL_RADIUS < 0 || ball.x + CONFIG.BALL_RADIUS > canvas.width) {
    ball.vx *= -1;
    ball.x = Math.max(CONFIG.BALL_RADIUS, Math.min(canvas.width - CONFIG.BALL_RADIUS, ball.x));
  }

  if (
    ball.vy > 0
    && ball.y + CONFIG.BALL_RADIUS >= playerPaddle.y
    && ball.y - CONFIG.BALL_RADIUS <= playerPaddle.y + playerPaddle.height
    && ball.x >= playerPaddle.x
    && ball.x <= playerPaddle.x + playerPaddle.width
  ) {
    ball.speed *= (1 + CONFIG.BALL_SPEED_INCREASE);
    const hitPos = (ball.x - (playerPaddle.x + playerPaddle.width / 2)) / (playerPaddle.width / 2);
    ball.vx = hitPos * ball.speed * 0.8;
    ball.vy = -Math.sqrt(ball.speed * ball.speed - ball.vx * ball.vx);
    ball.y = playerPaddle.y - CONFIG.BALL_RADIUS;
  }

  if (
    ball.vy < 0
    && ball.y - CONFIG.BALL_RADIUS <= aiPaddle.y + aiPaddle.height
    && ball.y + CONFIG.BALL_RADIUS >= aiPaddle.y
    && ball.x >= aiPaddle.x
    && ball.x <= aiPaddle.x + aiPaddle.width
  ) {
    ball.speed *= (1 + CONFIG.BALL_SPEED_INCREASE);
    const hitPos = (ball.x - (aiPaddle.x + aiPaddle.width / 2)) / (aiPaddle.width / 2);
    ball.vx = hitPos * ball.speed * 0.8;
    ball.vy = Math.sqrt(ball.speed * ball.speed - ball.vx * ball.vx);
    ball.y = aiPaddle.y + aiPaddle.height + CONFIG.BALL_RADIUS;
  }

  if (ball.y > canvas.height) {
    aiScore += 1;
    showRallyMessage();
    updateHud();
    checkWin();
    if (gameState === 'PLAYING') launchBall();
  }

  if (ball.y < 0) {
    playerScore += 1;
    showRallyMessage();
    updateHud();
    checkWin();
    if (gameState === 'PLAYING') launchBall();
  }
}

function updateAI() {
  if (ball.vy < 0 && Math.random() < 0.12) {
    const accurate = Math.random() < 0.7;
    const error = (Math.random() - 0.5) * 120;
    aiAimX = accurate ? ball.x : ball.x + error;
  }

  const aiCenter = aiPaddle.x + aiPaddle.width / 2;
  const diff = aiAimX - aiCenter;
  const move = Math.sign(diff) * Math.min(Math.abs(diff), CONFIG.AI_SPEED);
  aiPaddle.x = Math.max(0, Math.min(canvas.width - aiPaddle.width, aiPaddle.x + move));
}

function updatePlayer() {
  const speed = 5;
  if (keys.ArrowLeft || keys.a || keys.A) {
    playerPaddle.x = Math.max(0, playerPaddle.x - speed);
  }
  if (keys.ArrowRight || keys.d || keys.D) {
    playerPaddle.x = Math.min(canvas.width - playerPaddle.width, playerPaddle.x + speed);
  }
}

function draw() {
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height);

  ctx.fillStyle = '#C1FF00';
  ctx.fillRect(playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, CONFIG.BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#050505';
  ctx.font = 'bold 9px Courier New';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', ball.x, ball.y);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(aiScore, canvas.width / 2, canvas.height * 0.25);
  ctx.fillText(playerScore, canvas.width / 2, canvas.height * 0.75);

  ctx.font = '11px Courier New';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText('PROCESSOR', canvas.width / 2, 20);
  ctx.fillStyle = '#C1FF00';
  ctx.fillText('MERCHANT', canvas.width / 2, canvas.height - 20);
}

function endGame(winner) {
  if (gameState !== 'PLAYING') return;
  gameState = 'GAME_OVER';

  const previousBest = bestScore;
  if (playerScore > bestScore) {
    bestScore = playerScore;
    localStorage.setItem('dodo_pong_highscore', String(playerScore));
  }

  if (typeof DodoAnalytics !== 'undefined') {
    DodoAnalytics.gameOver('Dodo Pong', playerScore);
    if (playerScore > previousBest) DodoAnalytics.newHighScore('Dodo Pong', playerScore);
  }

  finalPlayerScoreEl.textContent = String(playerScore);
  finalAiScoreEl.textContent = String(aiScore);
  overBestScoreEl.textContent = String(bestScore);
  resultTitle.textContent = winner === 'player' ? 'Merchant Wins!' : 'Processor Wins!';
  updateHud();
  setScreen('over');
}

function startGame() {
  gameState = 'PLAYING';
  playerScore = 0;
  aiScore = 0;
  statusOverlay.classList.add('hidden');

  playerPaddle.x = (canvas.width - playerPaddle.width) / 2;
  playerPaddle.y = canvas.height - 24;
  aiPaddle.x = (canvas.width - aiPaddle.width) / 2;
  aiPaddle.y = 12;
  aiAimX = canvas.width / 2;

  launchBall();
  updateHud();
  setScreen('game');

  if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart('Dodo Pong');
}

function gameLoop() {
  if (gameState === 'PLAYING') {
    updateBall();
    updateAI();
    updatePlayer();
  }
  draw();
  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const touchY = touch.clientY - rect.top;
  if (touchY > canvas.height * 0.6) {
    const touchX = touch.clientX - rect.left;
    playerPaddle.x = Math.max(0, Math.min(canvas.width - playerPaddle.width, touchX - playerPaddle.width / 2));
  }
}, { passive: false });

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

resizeCanvas();
updateHud();
setScreen('start');
gameLoop();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CONFIG = {
  PADDLE_WIDTH: 90,
  PADDLE_HEIGHT: 12,
  BALL_RADIUS: 7,
  BALL_SPEED_INITIAL: 4.5,
  LIVES: 3,
  BLOCK_ROWS: 4,
  BLOCK_COLS: 8,
  BLOCK_HEIGHT: 22,
  BLOCK_PADDING: 4,
  POWERUP_CHANCE: 0.2,
  POWERUP_SPEED: 2,
  POWERUP_DURATION: { shield: 10000, twofa: 15000, ratelimiter: 8000 },
};

const BLOCK_TYPES = [
  { label: 'Critical Fraud', color: '#ff4444', hp: 3, score: 50 },
  { label: 'Suspicious', color: '#ff8c00', hp: 2, score: 30 },
  { label: 'Anomaly', color: '#ffd700', hp: 1, score: 20 },
  { label: 'Low Risk', color: '#44ff88', hp: 1, score: 10 },
];

const POWERUP_TYPES = [
  { id: 'shield', label: 'PCI Shield', color: '#44ff88', effect: 'wider paddle' },
  { id: 'twofa', label: '2FA Ball', color: '#4488ff', effect: 'extra ball' },
  { id: 'ratelimiter', label: 'Rate Limiter', color: '#ffd700', effect: 'slow ball' },
];

const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const finalScoreEl = document.getElementById('finalScore');
const overBestScoreEl = document.getElementById('overBestScore');

const keys = {};

let gameState = 'START';
let score = 0;
let lives = CONFIG.LIVES;
let level = 1;
const MAX_LEVELS = 3;
let bestScore = parseInt(localStorage.getItem('dodo_firewall_breaker_highscore') || '0', 10);

let paddle = {
  x: 0,
  y: 0,
  width: CONFIG.PADDLE_WIDTH,
  height: CONFIG.PADDLE_HEIGHT,
};

let balls = [];
let blocks = [];
let powerups = [];
let activePowerups = {};
let rateLimiterApplied = false;

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth, 480);
  canvas.height = Math.min(window.innerHeight - 80, 640);
}

function setScreen(state) {
  startScreen.classList.toggle('hidden', state !== 'start');
  gameScreen.classList.toggle('hidden', state !== 'game');
  gameOverScreen.classList.toggle('hidden', state !== 'over');
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestScoreEl.textContent = String(bestScore);
  livesEl.textContent = String(lives);
  levelEl.textContent = `${level}/${MAX_LEVELS}`;
}

function resetPaddle() {
  paddle.width = CONFIG.PADDLE_WIDTH;
  paddle.height = CONFIG.PADDLE_HEIGHT;
  paddle.y = canvas.height - 24;
  paddle.x = (canvas.width - paddle.width) / 2;
}

function clampPaddle() {
  paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x));
}

function createBall() {
  const speed = CONFIG.BALL_SPEED_INITIAL + (level - 1) * 0.5;
  const angle = (Math.random() * 70 - 35) * Math.PI / 180;
  return {
    x: paddle.x + paddle.width / 2,
    y: paddle.y - CONFIG.BALL_RADIUS - 2,
    vx: Math.sin(angle) * speed,
    vy: -Math.abs(Math.cos(angle) * speed),
    speed,
  };
}

function clearPowerupTimers() {
  Object.values(activePowerups).forEach((id) => clearTimeout(id));
  activePowerups = {};
}

function initLevel() {
  blocks = [];
  const rows = CONFIG.BLOCK_ROWS + (level - 1);
  const blockWidth = (canvas.width - CONFIG.BLOCK_PADDING * (CONFIG.BLOCK_COLS + 1)) / CONFIG.BLOCK_COLS;
  const topOffset = 60;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < CONFIG.BLOCK_COLS; col += 1) {
      const type = row < BLOCK_TYPES.length ? BLOCK_TYPES[row] : BLOCK_TYPES[0];
      blocks.push({
        x: CONFIG.BLOCK_PADDING + col * (blockWidth + CONFIG.BLOCK_PADDING),
        y: topOffset + row * (CONFIG.BLOCK_HEIGHT + CONFIG.BLOCK_PADDING),
        width: blockWidth,
        height: CONFIG.BLOCK_HEIGHT,
        hp: type.hp + (level - 1),
        maxHp: type.hp + (level - 1),
        color: type.color,
        score: type.score,
        alive: true,
      });
    }
  }

  paddle.y = canvas.height - 24;
  clampPaddle();
}

function spawnPowerup(block) {
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  powerups.push({
    x: block.x + block.width / 2,
    y: block.y + block.height,
    type,
    vy: CONFIG.POWERUP_SPEED,
  });
}

function applyPowerup(type) {
  if (type.id === 'shield') {
    paddle.width = CONFIG.PADDLE_WIDTH * 1.6;
    clampPaddle();
    clearTimeout(activePowerups.shield);
    activePowerups.shield = setTimeout(() => {
      paddle.width = CONFIG.PADDLE_WIDTH;
      clampPaddle();
    }, CONFIG.POWERUP_DURATION.shield);
  } else if (type.id === 'twofa') {
    if (balls.length < 2) {
      balls.push({
        x: balls[0].x,
        y: balls[0].y,
        vx: -balls[0].vx,
        vy: balls[0].vy,
        speed: balls[0].speed,
      });
    }
    clearTimeout(activePowerups.twofa);
    activePowerups.twofa = setTimeout(() => {
      if (balls.length > 1) balls.pop();
    }, CONFIG.POWERUP_DURATION.twofa);
  } else if (type.id === 'ratelimiter') {
    if (!rateLimiterApplied) {
      balls.forEach((b) => {
        b.speed *= 0.6;
        b.vx *= 0.6;
        b.vy *= 0.6;
      });
      rateLimiterApplied = true;
    }
    clearTimeout(activePowerups.ratelimiter);
    activePowerups.ratelimiter = setTimeout(() => {
      balls.forEach((b) => {
        b.speed /= 0.6;
        b.vx /= 0.6;
        b.vy /= 0.6;
      });
      rateLimiterApplied = false;
    }, CONFIG.POWERUP_DURATION.ratelimiter);
  }
}

function updatePowerups() {
  const next = [];
  for (const pu of powerups) {
    pu.y += pu.vy;
    const caught = pu.y + 8 >= paddle.y
      && pu.x >= paddle.x
      && pu.x <= paddle.x + paddle.width
      && pu.y - 8 <= paddle.y + paddle.height;
    if (caught) {
      applyPowerup(pu.type);
      continue;
    }
    if (pu.y < canvas.height + 20) next.push(pu);
  }
  powerups = next;
}

function updateBall(ball) {
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - CONFIG.BALL_RADIUS < 0 || ball.x + CONFIG.BALL_RADIUS > canvas.width) {
    ball.vx *= -1;
    ball.x = Math.max(CONFIG.BALL_RADIUS, Math.min(canvas.width - CONFIG.BALL_RADIUS, ball.x));
  }
  if (ball.y - CONFIG.BALL_RADIUS < 0) {
    ball.vy *= -1;
    ball.y = CONFIG.BALL_RADIUS;
  }

  if (
    ball.vy > 0
    && ball.y + CONFIG.BALL_RADIUS >= paddle.y
    && ball.y - CONFIG.BALL_RADIUS <= paddle.y + paddle.height
    && ball.x >= paddle.x
    && ball.x <= paddle.x + paddle.width
  ) {
    ball.vy = -Math.abs(ball.vy);
    const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    ball.vx = hitPos * ball.speed * 0.8;
    ball.vy = -Math.sqrt(Math.max(0.1, ball.speed * ball.speed - ball.vx * ball.vx));
    ball.y = paddle.y - CONFIG.BALL_RADIUS;
  }

  for (const block of blocks) {
    if (!block.alive) continue;
    if (
      ball.x + CONFIG.BALL_RADIUS > block.x
      && ball.x - CONFIG.BALL_RADIUS < block.x + block.width
      && ball.y + CONFIG.BALL_RADIUS > block.y
      && ball.y - CONFIG.BALL_RADIUS < block.y + block.height
    ) {
      ball.vy *= -1;
      block.hp -= 1;
      if (block.hp <= 0) {
        block.alive = false;
        score += block.score;
        if (Math.random() < CONFIG.POWERUP_CHANCE) spawnPowerup(block);
      }
      break;
    }
  }

  if (ball.y > canvas.height + CONFIG.BALL_RADIUS) return false;
  return true;
}

function checkLevelComplete() {
  if (blocks.every((b) => !b.alive)) {
    if (level >= MAX_LEVELS) {
      endGame(true);
    } else {
      level += 1;
      balls = [createBall()];
      powerups = [];
      clearPowerupTimers();
      paddle.width = CONFIG.PADDLE_WIDTH;
      rateLimiterApplied = false;
      initLevel();
      balls[0].speed = CONFIG.BALL_SPEED_INITIAL + (level - 1) * 0.5;
      const signX = balls[0].vx >= 0 ? 1 : -1;
      balls[0].vx = Math.abs(balls[0].vx) * signX;
      const vySign = balls[0].vy >= 0 ? 1 : -1;
      balls[0].vy = Math.abs(balls[0].vy) * vySign;
    }
  }
}

function draw() {
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const block of blocks) {
    if (!block.alive) continue;
    const alpha = 0.4 + 0.6 * (block.hp / block.maxHp);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = block.color;
    ctx.fillRect(block.x, block.y, block.width, block.height);
    ctx.globalAlpha = 1;
    ctx.shadowColor = block.color;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = block.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(block.x, block.y, block.width, block.height);
    ctx.shadowBlur = 0;
  }

  ctx.shadowColor = '#C1FF00';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#C1FF00';
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.shadowBlur = 0;

  for (const ball of balls) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, CONFIG.BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const pu of powerups) {
    ctx.fillStyle = pu.type.color;
    ctx.fillRect(pu.x - 15, pu.y - 8, 30, 16);
    ctx.fillStyle = '#000';
    ctx.font = '8px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(pu.type.label.slice(0, 6), pu.x, pu.y + 3);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Lives: ${'❤️'.repeat(lives)}`, canvas.width - 10, 20);
  ctx.textAlign = 'center';
  ctx.fillText(`Level ${level}/${MAX_LEVELS}`, canvas.width / 2, 20);
}

function endGame(won) {
  if (gameState !== 'PLAYING') return;
  gameState = 'GAME_OVER';

  const previousBest = bestScore;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('dodo_firewall_breaker_highscore', String(score));
  }

  if (typeof DodoAnalytics !== 'undefined') {
    DodoAnalytics.gameOver('Firewall Breaker Dodo', score);
    if (score > previousBest) DodoAnalytics.newHighScore('Firewall Breaker Dodo', score);
  }

  clearPowerupTimers();
  powerups = [];
  resultTitle.textContent = won ? 'Firewall Breached' : 'Firewall Locked Down';
  resultMessage.textContent = won
    ? 'All fraud layers destroyed across all levels.'
    : 'A payment packet escaped below the paddle.';
  finalScoreEl.textContent = String(score);
  overBestScoreEl.textContent = String(bestScore);
  updateHud();
  setScreen('over');
}

function resetRound() {
  clearPowerupTimers();
  powerups = [];
  rateLimiterApplied = false;
  paddle.width = CONFIG.PADDLE_WIDTH;
  clampPaddle();
  balls = [createBall()];
}

function startGame() {
  gameState = 'PLAYING';
  score = 0;
  lives = CONFIG.LIVES;
  level = 1;
  resetPaddle();
  balls = [createBall()];
  powerups = [];
  clearPowerupTimers();
  rateLimiterApplied = false;
  initLevel();
  updateHud();
  setScreen('game');

  if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart('Firewall Breaker Dodo');
}

function updatePaddle() {
  const speed = 6;
  if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - speed);
  if (keys.ArrowRight) paddle.x = Math.min(canvas.width - paddle.width, paddle.x + speed);
}

function gameLoop() {
  if (gameState === 'PLAYING') {
    updatePaddle();
    const aliveBalls = [];
    for (const ball of balls) {
      if (updateBall(ball)) aliveBalls.push(ball);
    }
    balls = aliveBalls;

    if (!balls.length) {
      lives -= 1;
      if (lives <= 0) {
        endGame(false);
      } else {
        resetRound();
      }
    }

    updatePowerups();
    checkLevelComplete();
    updateHud();
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

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, e.clientX - rect.left - paddle.width / 2));
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, e.touches[0].clientX - rect.left - paddle.width / 2));
}, { passive: false });

window.addEventListener('resize', () => {
  resizeCanvas();
  initLevel();
});

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

resizeCanvas();
resetPaddle();
initLevel();
updateHud();
setScreen('start');
gameLoop();

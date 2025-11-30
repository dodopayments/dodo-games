// --- CONFIGURATION ---
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

const COLORS = {
    purple: '#b026ff',
    pink: '#ff00ff',
    green: '#39ff14',
    yellow: '#fff01f',
    white: '#ffffff',
    red: '#ff2a2a'
};

const PHRASES = [
    "Fraudster vaporized.",
    "Clean flow. Happy merchants.",
    "Uptime stable. Carry on!",
    "Chargeback denied!",
    "Liquidated damages.",
    "KYC Compliant!",
    "Payment Authorized."
];

// --- GAME STATE ---
const state = {
    screen: 'start', // start, playing, gameover
    score: 0,
    highScore: parseFloat(localStorage.getItem('dodoHighscore')) || 0,
    integrity: 100,
    shield: 0,
    riskLevel: 0, // 0 to 100
    frameCount: 0,
    keys: {},
    lastTime: 0
};

// --- SETUP CANVAS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Handle High DPI displays
function resize() {
    // Keep aspect ratio but scale to fit window with padding
    const aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    const windowAspect = window.innerWidth / window.innerHeight;
    
    let finalWidth, finalHeight;

    if (windowAspect < aspect) {
        finalWidth = window.innerWidth * 0.95;
        finalHeight = finalWidth / aspect;
    } else {
        finalHeight = window.innerHeight * 0.95;
        finalWidth = finalHeight * aspect;
    }

    canvas.style.width = `${finalWidth}px`;
    canvas.style.height = `${finalHeight}px`;
}

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
window.addEventListener('resize', resize);
resize();

// --- INPUT HANDLING ---
window.addEventListener('keydown', (e) => {
    state.keys[e.code] = true;
    if(state.screen === 'playing') {
        if(e.code === 'Space') fireBullet();
        if(e.code === 'ShiftLeft' || e.code === 'ShiftRight') activateShield();
    }
});
window.addEventListener('keyup', (e) => state.keys[e.code] = false);

// --- ENTITY CLASSES ---

class Player {
    constructor() {
        this.width = 50;
        this.height = 30;
        this.x = 100;
        this.y = CANVAS_HEIGHT / 2;
        this.speed = 8;
        this.dy = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
    }

    update() {
        if (state.keys['ArrowUp']) this.dy = -this.speed;
        else if (state.keys['ArrowDown']) this.dy = this.speed;
        else this.dy *= 0.9; // Friction

        this.y += this.dy;

        // Boundaries
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > CANVAS_HEIGHT) this.y = CANVAS_HEIGHT - this.height;

        // Shield Logic
        if (this.shieldActive) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) this.shieldActive = false;
        } else {
            // Recharge shield
            if (state.shield < 100) state.shield += 0.2;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw Ship (Geometric Futuristic Shape)
        ctx.fillStyle = COLORS.green;
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.green;
        
        ctx.beginPath();
        ctx.moveTo(40, 15); // Nose
        ctx.lineTo(0, 0); // Top Wing
        ctx.lineTo(10, 15); // Body center
        ctx.lineTo(0, 30); // Bottom Wing
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(15, 10, 10, 10);

        // Engine Trail
        ctx.fillStyle = COLORS.pink;
        ctx.globalAlpha = 0.6 + Math.random() * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(-20 - Math.random()*20, 15);
        ctx.lineTo(0, 20);
        ctx.fill();

        // Shield Visual
        if (this.shieldActive) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = COLORS.purple;
            ctx.beginPath();
            ctx.arc(20, 15, 50, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = COLORS.white;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 15;
        this.radius = 4;
        this.markedForDeletion = false;
    }
    update() {
        this.x += this.speed;
        if (this.x > CANVAS_WIDTH) this.markedForDeletion = true;
    }
    draw() {
        ctx.beginPath();
        ctx.fillStyle = COLORS.yellow;
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.yellow;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Enemy {
    constructor(type) {
        this.type = type; // 'comet', 'phantom', 'drone'
        this.markedForDeletion = false;
        this.x = CANVAS_WIDTH + 50;
        this.y = Math.random() * (CANVAS_HEIGHT - 50);
        
        if (type === 'comet') {
            this.speedX = -6 - Math.random() * 4;
            this.speedY = (Math.random() - 0.5) * 2;
            this.width = 40;
            this.height = 40;
            this.color = COLORS.red;
            this.hp = 1;
            this.name = "Chargeback";
            this.scoreVal = 100;
        } else if (type === 'phantom') {
            this.speedX = -4;
            this.speedY = 0;
            this.width = 30;
            this.height = 30;
            this.color = COLORS.purple;
            this.hp = 3;
            this.name = "Fraud";
            this.scoreVal = 300;
        } else {
            // Drone
            this.speedX = -3;
            this.speedY = 0;
            this.width = 25;
            this.height = 25;
            this.color = COLORS.yellow;
            this.hp = 1;
            this.name = "Bug";
            this.scoreVal = 50;
        }
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.type === 'phantom') {
            // Slowly track player Y
            if (player.y > this.y) this.y += 1;
            else this.y -= 1;
        }
        
        // Oscillation for Drones
        if (this.type === 'drone') {
            this.y += Math.sin(state.frameCount * 0.05) * 2;
        }

        if (this.x < -100) this.markedForDeletion = true;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        if (this.type === 'comet') {
            // Circle with jagged tail
            ctx.beginPath();
            ctx.arc(20, 20, 15, 0, Math.PI*2);
            ctx.fill();
        } else if (this.type === 'phantom') {
            // Ghost shape
            ctx.fillRect(0, 0, 30, 30);
            ctx.fillStyle = 'black';
            ctx.fillRect(5, 5, 5, 5); // Eyes
            ctx.fillRect(20, 5, 5, 5);
        } else {
            // Bug
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(15, 25);
            ctx.lineTo(30, 0);
            ctx.fill();
        }

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 1;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.life = 1.0;
        this.markedForDeletion = false;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.05;
        if(this.life <= 0) this.markedForDeletion = true;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class Star {
    constructor() {
        this.x = Math.random() * CANVAS_WIDTH;
        this.y = Math.random() * CANVAS_HEIGHT;
        this.size = Math.random() * 2;
        this.speed = Math.random() * 3 + 0.5;
        this.isCode = Math.random() > 0.9; // 10% chance to be binary
    }
    update() {
        this.x -= this.speed;
        if (this.x < 0) {
            this.x = CANVAS_WIDTH;
            this.y = Math.random() * CANVAS_HEIGHT;
        }
    }
    draw() {
        ctx.fillStyle = `rgba(176, 38, 255, ${this.isCode ? 0.8 : 0.3})`;
        if (this.isCode) {
            ctx.font = "10px monospace";
            ctx.fillText(Math.random() > 0.5 ? "1" : "0", this.x, this.y);
        } else {
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }
}

// --- GLOBALS ---
let player;
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];

// --- FUNCTIONS ---

function initGame() {
    player = new Player();
    bullets = [];
    enemies = [];
    particles = [];
    state.score = 0;
    state.integrity = 100;
    state.shield = 100;
    state.riskLevel = 0;
    state.frameCount = 0;
    
    // Background stars
    stars = [];
    for(let i=0; i<100; i++) stars.push(new Star());
    
    updateHUD();
}

function fireBullet() {
    // Cooldown check could go here
    bullets.push(new Bullet(player.x + 40, player.y + 15));
}

function activateShield() {
    if (state.shield >= 50 && !player.shieldActive) {
        player.shieldActive = true;
        player.shieldTimer = 180; // 3 seconds at 60fps
        state.shield -= 50;
        showToast("KYC Shield Activated!");
    }
}

function spawnEnemy() {
    // Difficulty scaling
    const difficulty = 1 + (state.score / 5000);
    const spawnRate = Math.max(20, 100 - (difficulty * 5));

    if (state.frameCount % Math.floor(spawnRate) === 0) {
        const rand = Math.random();
        let type = 'drone';
        if (rand > 0.7) type = 'comet';
        if (rand > 0.9) type = 'phantom';
        enemies.push(new Enemy(type));
    }
}

function createExplosion(x, y, color) {
    for(let i=0; i<10; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function checkCollisions() {
    // Bullets hitting Enemies
    bullets.forEach(bullet => {
        enemies.forEach(enemy => {
            if (!bullet.markedForDeletion && !enemy.markedForDeletion) {
                const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
                if (dist < enemy.width) {
                    bullet.markedForDeletion = true;
                    enemy.hp--;
                    createExplosion(enemy.x, enemy.y, COLORS.white);
                    if (enemy.hp <= 0) {
                        enemy.markedForDeletion = true;
                        state.score += enemy.scoreVal;
                        createExplosion(enemy.x, enemy.y, enemy.color);
                        if(Math.random() > 0.8) showToast(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
                    }
                }
            }
        });
    });

    // Enemies hitting Player
    enemies.forEach(enemy => {
        if (!enemy.markedForDeletion) {
            // Simple box collision
            if (
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y
            ) {
                if (player.shieldActive) {
                    enemy.markedForDeletion = true;
                    createExplosion(enemy.x, enemy.y, COLORS.purple);
                    state.score += 50; // Bonus for shield kill
                    showToast("Blocked by KYC!");
                } else {
                    enemy.markedForDeletion = true;
                    state.integrity -= 20;
                    createExplosion(player.x, player.y, COLORS.red);
                    // Screen shake effect
                    canvas.style.transform = `translate(${Math.random()*10-5}px, ${Math.random()*10-5}px)`;
                    setTimeout(() => canvas.style.transform = 'none', 50);
                    
                    if (state.integrity <= 0) {
                        gameOver();
                    }
                }
            }
        }
    });
}

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerText = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

function updateHUD() {
    document.getElementById('score-display').innerText = '$' + state.score.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('integrity-bar').style.width = state.integrity + '%';
    document.getElementById('shield-bar').style.width = state.shield + '%';
    
    // Risk Logic
    let risk = "LOW";
    let color = COLORS.green;
    if (enemies.length > 5) { risk = "MEDIUM"; color = COLORS.yellow; }
    if (enemies.length > 10) { risk = "HIGH"; color = COLORS.red; }
    
    const riskEl = document.getElementById('risk-display');
    riskEl.innerText = risk;
    riskEl.style.color = color;
}

function update() {
    if (state.screen !== 'playing') return;
    
    state.frameCount++;
    
    // Passive score generation (Transaction Volume)
    if(state.frameCount % 10 === 0) state.score += 10.50;

    player.update();
    stars.forEach(s => s.update());
    
    bullets.forEach(b => b.update());
    bullets = bullets.filter(b => !b.markedForDeletion);

    spawnEnemy();
    enemies.forEach(e => e.update());
    enemies = enemies.filter(e => !e.markedForDeletion);

    checkCollisions();

    particles.forEach(p => p.update());
    particles = particles.filter(p => !p.markedForDeletion);

    updateHUD();
}

function draw() {
    // Clear Screen
    ctx.fillStyle = state.screen === 'start' ? '#090011' : 'rgba(9, 0, 17, 0.3)'; // Trail effect
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw elements
    stars.forEach(s => s.draw());
    if (state.screen === 'playing') {
        player.draw();
        enemies.forEach(e => e.draw());
        bullets.forEach(b => b.draw());
        particles.forEach(p => p.draw());
    }
}

function loop(timestamp) {
    // Delta time calculation could go here for smoother movement on different Hz monitors
    update();
    draw();
    requestAnimationFrame(loop);
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    state.screen = 'playing';
    initGame();
}

function gameOver() {
    state.screen = 'gameover';
    
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('dodoHighscore', state.highScore);
    }

    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = '$' + state.score.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('high-score').innerText = '$' + state.highScore.toLocaleString('en-US', {minimumFractionDigits: 2});
}

// --- INITIALIZATION ---
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// Start Loop
requestAnimationFrame(loop);

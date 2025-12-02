const AudioSys = {
    ctx: null,
    init: function() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },
    playTone: function(freq, type, duration, vol=0.1) {
        if(!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playSuccess: function() { 
        this.playTone(600, 'sine', 0.1, 0.1); 
        setTimeout(() => this.playTone(1200, 'sine', 0.2, 0.1), 50);
    },
    playError: function() { 
        this.playTone(150, 'sawtooth', 0.3, 0.2); 
    },
    playPowerup: function() {
        this.playTone(400, 'square', 0.1, 0.1);
        setTimeout(() => this.playTone(800, 'square', 0.1, 0.1), 100);
        setTimeout(() => this.playTone(1200, 'square', 0.4, 0.1), 200);
    }
};

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const GAME_WIDTH = 800; // Virtual width
const GAME_HEIGHT = 600; // Virtual height

// Assets
const logoImg = new Image();
logoImg.src = 'assets/images/dodo-logo.png';

// State
let gameState = {
    active: false,
    score: 0,
    customersProcessed: 0,
    maxStreak: 0,
    currentStreak: 0,
    timeLeft: 60,
    customers: [],
    particles: [],
    floaters: [], // Floating texts
    spawnTimer: 0,
    spawnRate: 120, // Frames between spawn
    baseSpeed: 2,
    gameOver: false,
    powerUpActive: false,
    powerUpTimer: 0
};

const TYPES = ['CARD', 'CRYPTO', 'QR'];
const ICONS = { 'CARD': '💳', 'CRYPTO': '₿', 'QR': '📱' };
const COLORS = { 'CARD': '#2563eb', 'CRYPTO': '#f97316', 'QR': '#9333ea' };

// Resize Logic
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Customer {
    constructor() {
        this.type = TYPES[Math.floor(Math.random() * TYPES.length)];
        // Spawn randomly on X axis within a lane
        const laneWidth = canvas.width / 3;
        // We actually want them to walk to the center counter, not lanes.
        // Let's have them spawn from top in random positions but converge slightly
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = -60;
        this.size = 50;
        this.speed = gameState.baseSpeed + (Math.random() * 0.5);
        this.wobble = Math.random() * Math.PI * 2;
        this.id = Math.random();
    }

    update() {
        this.y += this.speed;
        this.wobble += 0.1;
        this.x += Math.sin(this.wobble) * 0.5; // Slight walking sway
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw Body
        ctx.fillStyle = COLORS[this.type];
        ctx.beginPath();
        ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw Outline
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw Bubble with Requirement
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.roundRect(15, -40, 40, 40, 5);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ICONS[this.type], 35, -20);
        
        // Bubble tail
        ctx.beginPath();
        ctx.moveTo(15, -10);
        ctx.lineTo(25, -10);
        ctx.lineTo(10, 5);
        ctx.fillStyle = 'white';
        ctx.fill();

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 8, 8);
        ctx.globalAlpha = 1.0;
    }
}

class FloatingText {
    constructor(text, x, y, color) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.vy = -2;
        this.life = 1.0;
    }
    update() {
        this.y += this.vy;
        this.life -= 0.02;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 24px "JetBrains Mono"';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }
}

// --- Core Functions ---

function initGame() {
    gameState.active = true;
    gameState.score = 0;
    gameState.customersProcessed = 0;
    gameState.timeLeft = 60;
    gameState.customers = [];
    gameState.particles = [];
    gameState.floaters = [];
    gameState.currentStreak = 0;
    gameState.gameOver = false;
    gameState.spawnRate = 100;
    gameState.baseSpeed = 2; // Mobile friendly speed
    
    // Adjust difficulty based on screen height
    gameState.baseSpeed = window.innerHeight < 800 ? 3 : 4;

    AudioSys.init();
    updateUI();
    
    // Analytics: Track game start
    if (typeof DodoAnalytics !== 'undefined') {
        DodoAnalytics.gameStart('Checkout Rush');
    }
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    
    requestAnimationFrame(loop);
    
    // Timer Loop
    gameState.timerInterval = setInterval(() => {
        if(gameState.active && !gameState.gameOver) {
            gameState.timeLeft--;
            if(gameState.powerUpActive) {
                gameState.powerUpTimer--;
                if(gameState.powerUpTimer <= 0) deactivatePowerUp();
            }
            if(gameState.timeLeft <= 0) endGame();
            updateUI();
        }
    }, 1000);
}

function activatePowerUp() {
    gameState.powerUpActive = true;
    gameState.powerUpTimer = 5; // 5 seconds of instant clear
    AudioSys.playPowerup();
    spawnFloater("INSTANT SETTLEMENT!", canvas.width/2, canvas.height/2, '#facc15');
    
    // Visual flair
    const container = document.getElementById('game-container');
    container.classList.add('ring-4', 'ring-yellow-400', 'ring-inset');
}

function deactivatePowerUp() {
    gameState.powerUpActive = false;
    const container = document.getElementById('game-container');
    container.classList.remove('ring-4', 'ring-yellow-400', 'ring-inset');
}

function spawnFloater(text, x, y, color) {
    gameState.floaters.push(new FloatingText(text, x, y, color));
}

function spawnParticles(x, y, color) {
    for(let i=0; i<10; i++) {
        gameState.particles.push(new Particle(x, y, color));
    }
}

function processAction(type) {
    if(!gameState.active || gameState.gameOver) return;

    // Find nearest customer
    // Sort by Y position (closest to bottom)
    const sortedCustomers = [...gameState.customers].sort((a,b) => b.y - a.y);
    const target = sortedCustomers[0];

    if(!target) return; // No customers

    const isMatch = target.type === type;
    
    if (isMatch) {
        // Success
        gameState.customers = gameState.customers.filter(c => c.id !== target.id);
        
        // Score calc
        const baseValue = 15;
        const multiplier = 1 + (gameState.currentStreak * 0.1);
        const points = Math.round(baseValue * multiplier);
        
        gameState.score += points;
        gameState.customersProcessed++;
        gameState.currentStreak++;
        if(gameState.currentStreak > gameState.maxStreak) gameState.maxStreak = gameState.currentStreak;

        AudioSys.playSuccess();
        spawnParticles(target.x, target.y, COLORS[type]);
        spawnFloater(`+$${points}`, target.x, target.y - 20, '#4ade80');

        // Check Powerup (Every 10 streak)
        if(gameState.currentStreak > 0 && gameState.currentStreak % 10 === 0) {
            activatePowerUp();
        }

        // Difficulty Ramp
        if(gameState.customersProcessed % 5 === 0) {
            gameState.baseSpeed += 0.2;
            gameState.spawnRate = Math.max(30, gameState.spawnRate - 5);
        }

    } else {
        // Fail
        AudioSys.playError();
        gameState.currentStreak = 0;
        gameState.timeLeft = Math.max(0, gameState.timeLeft - 3); // Penalty
        
        spawnFloater("CHARGEBACK!", target.x, target.y - 20, '#ef4444');
        
        // Shake Screen
        const body = document.body;
        body.classList.add('shake');
        setTimeout(() => body.classList.remove('shake'), 500);
    }

    updateUI();
}

function updateUI() {
    document.getElementById('score-display').innerText = `$${gameState.score.toFixed(2)}`;
    document.getElementById('timer-display').innerText = `${gameState.timeLeft}s`;
    
    const streakEl = document.getElementById('streak-display');
    streakEl.innerText = `x${gameState.currentStreak}`;
    
    if(gameState.currentStreak >= 5) streakEl.classList.add('pulse-text');
    else streakEl.classList.remove('pulse-text');
}

function endGame() {
    gameState.gameOver = true;
    gameState.active = false;
    clearInterval(gameState.timerInterval);
    
    document.getElementById('final-count').innerText = gameState.customersProcessed;
    document.getElementById('final-streak').innerText = gameState.maxStreak;
    document.getElementById('final-score').innerText = `$${gameState.score.toFixed(2)}`;
    
    document.getElementById('game-over-screen').classList.remove('hidden');
    
    // Analytics: Track game over
    if (typeof DodoAnalytics !== 'undefined') {
        DodoAnalytics.gameOver('Checkout Rush', gameState.score, { 
            customersProcessed: gameState.customersProcessed, 
            maxStreak: gameState.maxStreak 
        });
    }
}

function loop() {
    if(!gameState.active) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Auto-Spawn logic
    gameState.spawnTimer++;
    if(gameState.spawnTimer > gameState.spawnRate) {
        gameState.customers.push(new Customer());
        gameState.spawnTimer = 0;
    }

    // Power Up Logic (Auto clear)
    if(gameState.powerUpActive && gameState.spawnTimer % 10 === 0 && gameState.customers.length > 0) {
        // Automatically process closest customer
        const closest = [...gameState.customers].sort((a,b) => b.y - a.y)[0];
        if(closest) processAction(closest.type);
    }

    // Draw Background "Desk" area
    const deskHeight = 150;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, canvas.height - deskHeight, canvas.width, deskHeight);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - deskHeight);
    ctx.lineTo(canvas.width, canvas.height - deskHeight);
    ctx.stroke();

    // Draw Logo on Desk
    if(logoImg.complete) {
        const logoSize = 60;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(logoImg, (canvas.width/2) - (logoSize/2), canvas.height - deskHeight + 20, logoSize, logoSize);
        ctx.globalAlpha = 1.0;
    }

    // Process Customers
    for(let i = gameState.customers.length - 1; i >= 0; i--) {
        const c = gameState.customers[i];
        c.update();
        c.draw();

        // Fail condition: Reached desk without payment
        if(c.y > canvas.height - deskHeight + 20) {
            gameState.customers.splice(i, 1);
            AudioSys.playError();
            gameState.currentStreak = 0;
            gameState.timeLeft -= 5;
            spawnFloater("TIMEOUT!", c.x, c.y, '#ef4444');
            updateUI();
        }
    }

    // Process Particles
    for(let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.update();
        p.draw();
        if(p.life <= 0) gameState.particles.splice(i, 1);
    }

    // Process Floaters
    for(let i = gameState.floaters.length - 1; i >= 0; i--) {
        const f = gameState.floaters[i];
        f.update();
        f.draw();
        if(f.life <= 0) gameState.floaters.splice(i, 1);
    }

    if(!gameState.gameOver) {
        requestAnimationFrame(loop);
    }
}

// --- Event Listeners ---

document.getElementById('btn-start').addEventListener('click', initGame);
document.getElementById('btn-restart').addEventListener('click', initGame);

// Click Handlers
document.getElementById('btn-card').addEventListener('click', () => processAction('CARD'));
document.getElementById('btn-crypto').addEventListener('click', () => processAction('CRYPTO'));
document.getElementById('btn-qr').addEventListener('click', () => processAction('QR'));

// Keyboard Controls
window.addEventListener('keydown', (e) => {
    if(!gameState.active) return;
    const key = e.key.toLowerCase();
    if(key === 'a') { 
        processAction('CARD'); 
        simulateButtonPress('btn-card');
    }
    if(key === 's') { 
        processAction('CRYPTO');
        simulateButtonPress('btn-crypto');
    }
    if(key === 'd') { 
        processAction('QR');
        simulateButtonPress('btn-qr');
    }
});

// Touch handling hack for fast response
const addTouch = (id, type) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Stop zoom
        processAction(type);
        el.classList.add('bg-opacity-80', 'scale-95');
        setTimeout(() => el.classList.remove('bg-opacity-80', 'scale-95'), 100);
    }, {passive: false});
};

addTouch('btn-card', 'CARD');
addTouch('btn-crypto', 'CRYPTO');
addTouch('btn-qr', 'QR');

function simulateButtonPress(id) {
    const btn = document.getElementById(id);
    btn.classList.add('brightness-125', 'translate-y-1');
    setTimeout(() => btn.classList.remove('brightness-125', 'translate-y-1'), 100);
}

// ==========================================
// PAYMENT INVADERS - FULL GAME
// Powered by DodoPay Security
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Responsive canvas
function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const maxWidth = Math.min(800, window.innerWidth - 40);
    const maxHeight = Math.min(600, window.innerHeight - 200);
    const ratio = Math.min(maxWidth / 800, maxHeight / 600);
    canvas.style.width = (800 * ratio) + 'px';
    canvas.style.height = (600 * ratio) + 'px';
}
window.addEventListener('resize', resizeCanvas);

// ==========================================
// AUDIO SYSTEM (Web Audio API for retro sounds)
// ==========================================
class AudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch(e) {
            this.enabled = false;
        }
    }
    
    playTone(frequency, duration, type = 'square', volume = 0.1) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }
    
    shoot() {
        this.playTone(880, 0.1, 'square', 0.08);
        setTimeout(() => this.playTone(440, 0.05, 'square', 0.05), 50);
    }
    
    kycShoot() {
        this.playTone(660, 0.15, 'sawtooth', 0.08);
        this.playTone(880, 0.1, 'sawtooth', 0.06);
    }
    
    explosion() {
        this.playTone(150, 0.2, 'sawtooth', 0.15);
        setTimeout(() => this.playTone(100, 0.15, 'sawtooth', 0.1), 50);
        setTimeout(() => this.playTone(60, 0.2, 'sawtooth', 0.08), 100);
    }
    
    powerUp() {
        [523, 659, 784, 1047].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.1), i * 80);
        });
    }
    
    hit() {
        this.playTone(200, 0.1, 'square', 0.12);
    }
    
    shield() {
        this.playTone(300, 0.3, 'sine', 0.08);
        this.playTone(450, 0.3, 'sine', 0.06);
    }
    
    bossAlert() {
        [200, 150, 200, 150, 300].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'square', 0.12), i * 200);
        });
    }
    
    gameOver() {
        [400, 350, 300, 200].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, 'sawtooth', 0.1), i * 200);
        });
    }
    
    waveComplete() {
        [523, 659, 784, 880, 1047].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.08), i * 100);
        });
    }
}

const audio = new AudioSystem();

// ==========================================
// PARTICLE SYSTEM
// ==========================================
class Particle {
    constructor(x, y, color, velocity, size, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = velocity.x;
        this.vy = velocity.y;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.gravity = 0.1;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
        this.size *= 0.98;
    }
    
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==========================================
// GAME STATE
// ==========================================
const game = {
    state: 'menu', // menu, playing, paused, gameOver
    score: 0,
    highScore: parseInt(localStorage.getItem('paymentInvadersHighScore')) || 0,
    wave: 1,
    lives: 3,
    combo: 1,
    comboTimer: 0,
    shieldEnergy: 100,
    kycEnergy: 100,
    shieldActive: false,
    shieldTimer: 0,
    screenShake: 0,
    stats: {
        chargebacks: 0,
        fraudsters: 0,
        bugs: 0,
        bosses: 0
    },
    achievements: [],
    slogans: [
        "🔒 Encrypted with 256-bit AES!",
        "💳 PCI DSS Level 1 Compliant!",
        "🚀 99.99% Uptime Guaranteed!",
        "🛡️ Real-time Fraud Detection!",
        "⚡ Instant Payment Processing!",
        "🌍 200+ Countries Supported!",
        "🔐 2FA Enabled Successfully!",
        "✅ KYC Verification Complete!",
        "💎 Premium Security Active!",
        "🎯 Zero-tolerance Fraud Policy!"
    ],
    currentSlogan: '',
    sloganTimer: 0
};

// ==========================================
// GAME OBJECTS
// ==========================================
let player = null;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let powerUps = [];
let particles = [];
let stars = [];

// Initialize starfield
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 1 + 0.5,
            color: ['#a855f7', '#ec4899', '#84cc16', '#ffffff'][Math.floor(Math.random() * 4)]
        });
    }
}

// Player class
class Player {
    constructor() {
        this.width = 60;
        this.height = 40;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 80;
        this.speed = 6;
        this.shootCooldown = 0;
        this.kycCooldown = 0;
        this.invulnerable = 0;
    }
    
    draw() {
        ctx.save();
        
        // Invulnerability flash
        if (this.invulnerable > 0 && Math.floor(this.invulnerable / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Shield effect
        if (game.shieldActive) {
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 45, 0, Math.PI * 2);
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#22c55e';
            ctx.stroke();
            ctx.closePath();
        }
        
        // Main body (payment gateway shape)
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#a855f7');
        gradient.addColorStop(0.5, '#ec4899');
        gradient.addColorStop(1, '#7c3aed');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#a855f7';
        
        // Ship body
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width - 10, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 15);
        ctx.lineTo(this.x + 10, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // Cockpit
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + 15, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Engine glow
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height + 5, 8 + Math.random() * 3, 12 + Math.random() * 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    update(keys) {
        if (keys['ArrowLeft'] || keys['a']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['d']) this.x += this.speed;
        
        // Bounds
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        
        // Cooldowns
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.kycCooldown > 0) this.kycCooldown--;
        if (this.invulnerable > 0) this.invulnerable--;
    }
    
    shoot() {
        if (this.shootCooldown > 0) return;
        this.shootCooldown = 12;
        
        bullets.push(new Bullet(
            this.x + this.width / 2 - 3,
            this.y,
            0, -12,
            'normal'
        ));
        
        audio.shoot();
    }
    
    kycShoot() {
        if (this.kycCooldown > 0 || game.kycEnergy < 25) return;
        this.kycCooldown = 30;
        game.kycEnergy -= 25;
        
        // Spread shot
        for (let angle = -30; angle <= 30; angle += 15) {
            const rad = angle * Math.PI / 180;
            bullets.push(new Bullet(
                this.x + this.width / 2 - 3,
                this.y,
                Math.sin(rad) * 8,
                Math.cos(rad) * -10,
                'kyc'
            ));
        }
        
        audio.kycShoot();
    }
    
    activateShield() {
        if (game.shieldEnergy < 30 || game.shieldActive) return;
        game.shieldActive = true;
        game.shieldTimer = 180; // 3 seconds
        game.shieldEnergy -= 30;
        audio.shield();
    }
}

// Bullet class
class Bullet {
    constructor(x, y, vx, vy, type) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.width = type === 'kyc' ? 8 : 6;
        this.height = type === 'kyc' ? 15 : 20;
    }
    
    draw() {
        ctx.save();
        
        if (this.type === 'normal') {
            // 2FA Laser
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#84cc16');
            gradient.addColorStop(1, '#22c55e');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#84cc16';
        } else if (this.type === 'kyc') {
            // KYC Beam
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#f97316');
            gradient.addColorStop(1, '#eab308');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#f97316';
        }
        
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
}

// Enemy Bullet class
class EnemyBullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = 8;
        this.height = 8;
    }
    
    draw() {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.arc(this.x + 4, this.y + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
}

// Enemy types
const ENEMY_TYPES = {
    chargeback: {
        width: 40,
        height: 35,
        health: 1,
        score: 100,
        color1: '#ef4444',
        color2: '#dc2626',
        shootChance: 0.002,
        symbol: '💸'
    },
    fraudster: {
        width: 45,
        height: 40,
        health: 2,
        score: 250,
        color1: '#f97316',
        color2: '#ea580c',
        shootChance: 0.004,
        symbol: '🎭'
    },
    bug: {
        width: 35,
        height: 30,
        health: 1,
        score: 150,
        color1: '#eab308',
        color2: '#ca8a04',
        shootChance: 0.003,
        symbol: '🐛'
    },
    boss: {
        width: 100,
        height: 80,
        health: 50,
        score: 5000,
        color1: '#7c3aed',
        color2: '#6d28d9',
        shootChance: 0.02,
        symbol: '☠️'
    }
};

// Enemy class
class Enemy {
    constructor(x, y, type) {
        this.type = type;
        const config = ENEMY_TYPES[type];
        this.width = config.width;
        this.height = config.height;
        this.x = x;
        this.y = y;
        this.health = config.health;
        this.maxHealth = config.health;
        this.score = config.score;
        this.color1 = config.color1;
        this.color2 = config.color2;
        this.shootChance = config.shootChance;
        this.symbol = config.symbol;
        this.animOffset = Math.random() * Math.PI * 2;
        this.originalX = x;
    }
    
    draw() {
        ctx.save();
        
        const wobble = Math.sin(Date.now() / 200 + this.animOffset) * 3;
        
        // Main body
        const gradient = ctx.createRadialGradient(
            this.x + this.width / 2, this.y + this.height / 2, 0,
            this.x + this.width / 2, this.y + this.height / 2, this.width / 2
        );
        gradient.addColorStop(0, this.color1);
        gradient.addColorStop(1, this.color2);
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color1;
        
        if (this.type === 'boss') {
            // Boss shape (menacing skull-like)
            ctx.beginPath();
            ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2 + wobble, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.ellipse(this.x + this.width / 3, this.y + this.height / 2.5, 10, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(this.x + this.width * 2 / 3, this.y + this.height / 2.5, 10, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Health bar
            const barWidth = 80;
            const barHeight = 8;
            const barX = this.x + this.width / 2 - barWidth / 2;
            const barY = this.y - 15;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        } else {
            // Regular enemy (pixelated invader style)
            ctx.beginPath();
            
            // Body
            ctx.fillRect(this.x + 5, this.y + 5 + wobble, this.width - 10, this.height - 15);
            
            // "Antennae"
            ctx.fillRect(this.x + 8, this.y + wobble, 6, 8);
            ctx.fillRect(this.x + this.width - 14, this.y + wobble, 6, 8);
            
            // "Legs"
            ctx.fillRect(this.x, this.y + this.height - 10 + wobble, 8, 10);
            ctx.fillRect(this.x + this.width - 8, this.y + this.height - 10 + wobble, 8, 10);
            
            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 5;
            ctx.fillRect(this.x + 10, this.y + 12 + wobble, 6, 6);
            ctx.fillRect(this.x + this.width - 16, this.y + 12 + wobble, 6, 6);
        }
        
        ctx.restore();
    }
    
    update(direction, speed) {
        this.x += direction * speed;
        
        // Shooting
        if (Math.random() < this.shootChance) {
            this.shoot();
        }
    }
    
    shoot() {
        if (this.type === 'boss') {
            // Boss shoots multiple bullets
            for (let i = -2; i <= 2; i++) {
                enemyBullets.push(new EnemyBullet(
                    this.x + this.width / 2 - 4 + i * 20,
                    this.y + this.height,
                    i * 0.5,
                    4
                ));
            }
        } else {
            enemyBullets.push(new EnemyBullet(
                this.x + this.width / 2 - 4,
                this.y + this.height,
                0,
                5
            ));
        }
    }
    
    hit() {
        this.health--;
        
        // Particles
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.color1,
                { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 },
                3,
                20
            ));
        }
        
        return this.health <= 0;
    }
}

// PowerUp types
const POWERUP_TYPES = {
    ssl: { color: '#22c55e', symbol: '🔐', effect: 'shield', label: 'SSL Certificate' },
    encryption: { color: '#3b82f6', symbol: '🔑', effect: 'rapidFire', label: 'Encryption Key' },
    compliance: { color: '#eab308', symbol: '⭐', effect: 'scoreMultiplier', label: 'Compliance Boost' },
    life: { color: '#ef4444', symbol: '❤️', effect: 'life', label: 'Extra Gateway' }
};

// PowerUp class
class PowerUp {
    constructor(x, y, type) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.vy = 2;
        this.config = POWERUP_TYPES[type];
        this.rotation = 0;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        this.rotation += 0.05;
        
        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.config.color;
        
        // Background circle
        ctx.fillStyle = this.config.color + '40';
        ctx.beginPath();
        ctx.arc(0, 0, 18 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = this.config.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Symbol
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.config.symbol, 0, 0);
        
        ctx.restore();
    }
    
    update() {
        this.y += this.vy;
    }
}

// ==========================================
// WAVE MANAGEMENT
// ==========================================
function spawnWave() {
    enemies = [];
    
    const isBossWave = game.wave % 5 === 0;
    
    if (isBossWave) {
        // Boss wave
        audio.bossAlert();
        showSlogan("⚠️ MEGA BREACH DETECTED! ⚠️");
        
        enemies.push(new Enemy(
            canvas.width / 2 - 50,
            50,
            'boss'
        ));
        
        // Add minions
        const minionCount = Math.min(game.wave / 5, 4);
        for (let i = 0; i < minionCount; i++) {
            enemies.push(new Enemy(
                100 + i * 150,
                150,
                'fraudster'
            ));
        }
    } else {
        // Regular wave
        const rows = Math.min(3 + Math.floor(game.wave / 3), 6);
        const cols = Math.min(6 + Math.floor(game.wave / 2), 10);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let type;
                if (row === 0) type = 'fraudster';
                else if (row === 1) type = Math.random() < 0.5 ? 'bug' : 'chargeback';
                else type = 'chargeback';
                
                enemies.push(new Enemy(
                    80 + col * 65,
                    50 + row * 50,
                    type
                ));
            }
        }
        
        showSlogan(game.slogans[Math.floor(Math.random() * game.slogans.length)]);
    }
}

// ==========================================
// COLLISION DETECTION
// ==========================================
function checkCollisions() {
    // Player bullets vs enemies
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            if (rectCollision(bullet, enemy)) {
                bullets.splice(i, 1);
                
                if (enemy.hit()) {
                    // Enemy destroyed
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color1);
                    
                    // Score with combo
                    const points = Math.floor(enemy.score * game.combo);
                    game.score += points;
                    game.comboTimer = 120;
                    game.combo = Math.min(game.combo + 0.1, 5);
                    
                    // Stats
                    if (enemy.type === 'chargeback') game.stats.chargebacks++;
                    else if (enemy.type === 'fraudster') game.stats.fraudsters++;
                    else if (enemy.type === 'bug') game.stats.bugs++;
                    else if (enemy.type === 'boss') game.stats.bosses++;
                    
                    // PowerUp drop chance
                    if (Math.random() < 0.1 || enemy.type === 'boss') {
                        const types = Object.keys(POWERUP_TYPES);
                        const type = types[Math.floor(Math.random() * types.length)];
                        powerUps.push(new PowerUp(enemy.x, enemy.y, type));
                    }
                    
                    enemies.splice(j, 1);
                    audio.explosion();
                    
                    // Achievement checks
                    checkAchievements();
                } else {
                    audio.hit();
                }
                break;
            }
        }
    }
    
    // Enemy bullets vs player
    if (player.invulnerable <= 0) {
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const bullet = enemyBullets[i];
            
            if (rectCollision(bullet, player)) {
                enemyBullets.splice(i, 1);
                
                if (!game.shieldActive) {
                    playerHit();
                } else {
                    // Shield absorbed
                    createExplosion(player.x + player.width / 2, player.y, '#22c55e');
                }
            }
        }
    }
    
    // Enemies reaching player
    for (const enemy of enemies) {
        if (enemy.y + enemy.height >= player.y) {
            playerHit();
            break;
        }
    }
    
    // PowerUps vs player
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        
        if (rectCollision(powerUp, player)) {
            applyPowerUp(powerUp);
            powerUps.splice(i, 1);
        }
    }
}

function rectCollision(a, b) {
    return a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
}

function playerHit() {
    game.lives--;
    player.invulnerable = 120;
    game.combo = 1;
    game.screenShake = 20;
    createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ec4899');
    audio.hit();
    
    if (game.lives <= 0) {
        gameOver();
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 / 20) * i;
        const speed = 3 + Math.random() * 4;
        particles.push(new Particle(
            x, y, color,
            { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            4 + Math.random() * 4,
            40 + Math.random() * 20
        ));
    }
}

function applyPowerUp(powerUp) {
    audio.powerUp();
    
    switch (powerUp.config.effect) {
        case 'shield':
            game.shieldEnergy = Math.min(100, game.shieldEnergy + 50);
            break;
        case 'rapidFire':
            player.shootCooldown = 0;
            // Temporary rapid fire would need a timer system
            break;
        case 'scoreMultiplier':
            game.combo = Math.min(5, game.combo + 1);
            break;
        case 'life':
            game.lives = Math.min(5, game.lives + 1);
            break;
    }
    
    showSlogan(`⬆️ ${powerUp.config.label} Acquired!`);
}

// ==========================================
// ACHIEVEMENTS
// ==========================================
const ACHIEVEMENTS = {
    firstBlood: { name: 'First Blood', desc: 'Destroy your first threat', check: () => game.stats.chargebacks + game.stats.fraudsters + game.stats.bugs > 0 },
    fraudHunter: { name: 'Fraud Hunter', desc: 'Destroy 10 fraudsters', check: () => game.stats.fraudsters >= 10 },
    bossSlayer: { name: 'Boss Slayer', desc: 'Defeat a Mega Breach', check: () => game.stats.bosses >= 1 },
    comboMaster: { name: 'Combo Master', desc: 'Reach 5x combo', check: () => game.combo >= 5 },
    wave10: { name: 'Gateway Defender', desc: 'Reach wave 10', check: () => game.wave >= 10 },
    score10k: { name: 'High Roller', desc: 'Score 10,000 points', check: () => game.score >= 10000 }
};

function checkAchievements() {
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
        if (!game.achievements.includes(key) && achievement.check()) {
            game.achievements.push(key);
            showAchievement(achievement);
        }
    }
}

function showAchievement(achievement) {
    const container = document.getElementById('achievementContainer');
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
        <p class="text-orange-400 text-xs font-bold">🏆 ACHIEVEMENT UNLOCKED</p>
        <p class="text-white font-bold">${achievement.name}</p>
        <p class="text-gray-400 text-xs">${achievement.desc}</p>
    `;
    container.appendChild(popup);
    
    setTimeout(() => popup.remove(), 3000);
}

// ==========================================
// SLOGAN SYSTEM
// ==========================================
function showSlogan(text) {
    game.currentSlogan = text;
    game.sloganTimer = 180;
}

function drawSlogan() {
    if (game.sloganTimer <= 0) return;
    
    const alpha = Math.min(1, game.sloganTimer / 60);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#84cc16';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#84cc16';
    ctx.fillText(game.currentSlogan, canvas.width / 2, 30);
    ctx.restore();
}

// ==========================================
// GAME LOOP
// ==========================================
let keys = {};
let enemyDirection = 1;
let enemySpeed = 1;
let lastTime = 0;

function gameLoop(timestamp) {
    if (game.state !== 'playing') {
        if (game.state === 'menu' || game.state === 'gameOver' || game.state === 'paused') {
            requestAnimationFrame(gameLoop);
        }
        return;
    }
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    update();
    render();
    
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update player
    player.update(keys);
    
    // Shooting
    if (keys[' '] || keys['Space']) player.shoot();
    if (keys['z'] || keys['Z']) player.kycShoot();
    if (keys['x'] || keys['X']) player.activateShield();
    
    // Update shield
    if (game.shieldActive) {
        game.shieldTimer--;
        if (game.shieldTimer <= 0) {
            game.shieldActive = false;
        }
    }
    
    // Regenerate energy
    game.shieldEnergy = Math.min(100, game.shieldEnergy + 0.05);
    game.kycEnergy = Math.min(100, game.kycEnergy + 0.1);
    
    // Update combo
    if (game.comboTimer > 0) {
        game.comboTimer--;
    } else {
        game.combo = Math.max(1, game.combo - 0.01);
    }
    
    // Update slogan
    if (game.sloganTimer > 0) game.sloganTimer--;
    
    // Update screen shake
    if (game.screenShake > 0) game.screenShake--;
    
    // Update bullets
    bullets.forEach(b => b.update());
    bullets = bullets.filter(b => b.y > -50 && b.y < canvas.height + 50 && b.x > -50 && b.x < canvas.width + 50);
    
    enemyBullets.forEach(b => b.update());
    enemyBullets = enemyBullets.filter(b => b.y < canvas.height + 50);
    
    // Update enemies
    let needsReverse = false;
    let lowestEnemy = 0;
    
    enemies.forEach(enemy => {
        enemy.update(enemyDirection, enemySpeed);
        
        if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
            needsReverse = true;
        }
        lowestEnemy = Math.max(lowestEnemy, enemy.y + enemy.height);
    });
    
    if (needsReverse) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            enemy.y += 15;
        });
    }
    
    // Update powerups
    powerUps.forEach(p => p.update());
    powerUps = powerUps.filter(p => p.y < canvas.height + 50);
    
    // Update particles
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
    
    // Update stars
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
    
    // Check collisions
    checkCollisions();
    
    // Wave complete
    if (enemies.length === 0) {
        game.wave++;
        enemySpeed = 1 + game.wave * 0.1;
        audio.waveComplete();
        spawnWave();
        updateUI();
    }
    
    // Update UI
    updateUI();
}

function render() {
    ctx.save();
    
    // Screen shake
    if (game.screenShake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * game.screenShake,
            (Math.random() - 0.5) * game.screenShake
        );
    }
    
    // Clear
    ctx.fillStyle = '#0a0412';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    stars.forEach(star => {
        ctx.fillStyle = star.color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // Draw grid lines (subtle cyberpunk effect)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    // Draw game objects
    particles.forEach(p => p.draw(ctx));
    powerUps.forEach(p => p.draw());
    bullets.forEach(b => b.draw());
    enemyBullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    player.draw();
    
    // Draw slogan
    drawSlogan();
    
    // Draw DodoPay branding in corner
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.font = '10px Orbitron';
    ctx.fillStyle = '#a855f7';
    ctx.textAlign = 'right';
    ctx.fillText('Secured by DodoPay™', canvas.width - 10, canvas.height - 10);
    ctx.restore();
    
    ctx.restore();
}

function updateUI() {
    document.getElementById('scoreDisplay').textContent = game.score.toLocaleString();
    document.getElementById('waveDisplay').textContent = game.wave;
    document.getElementById('comboDisplay').textContent = 'x' + game.combo.toFixed(1);
    document.getElementById('livesDisplay').textContent = '❤️'.repeat(Math.max(0, game.lives));
    document.getElementById('shieldBar').style.width = game.shieldEnergy + '%';
    document.getElementById('kycBar').style.width = game.kycEnergy + '%';
}

// ==========================================
// GAME STATE MANAGEMENT
// ==========================================
function startGame() {
    audio.init();
    
    game.state = 'playing';
    game.score = 0;
    game.wave = 1;
    game.lives = 3;
    game.combo = 1;
    game.comboTimer = 0;
    game.shieldEnergy = 100;
    game.kycEnergy = 100;
    game.shieldActive = false;
    game.stats = { chargebacks: 0, fraudsters: 0, bugs: 0, bosses: 0 };
    game.achievements = [];
    
    player = new Player();
    enemies = [];
    bullets = [];
    enemyBullets = [];
    powerUps = [];
    particles = [];
    enemyDirection = 1;
    enemySpeed = 1;
    
    initStars();
    spawnWave();
    
    document.getElementById('menuOverlay').style.display = 'none';
    document.getElementById('gameOverOverlay').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'flex';
    
    resizeCanvas();
    updateUI();
    requestAnimationFrame(gameLoop);
    
    // Analytics: Track game start
    if (typeof DodoAnalytics !== 'undefined') {
        DodoAnalytics.gameStart('Payment Invaders');
    }
}

function gameOver() {
    game.state = 'gameOver';
    
    // Update high score
    const isNewHighScore = game.score > game.highScore;
    if (isNewHighScore) {
        game.highScore = game.score;
        localStorage.setItem('paymentInvadersHighScore', game.highScore);
    }
    
    audio.gameOver();
    
    // Update game over screen
    document.getElementById('finalScore').textContent = game.score.toLocaleString();
    document.getElementById('finalWave').textContent = game.wave;
    document.getElementById('statChargebacks').textContent = game.stats.chargebacks;
    document.getElementById('statFraudsters').textContent = game.stats.fraudsters;
    document.getElementById('statBugs').textContent = game.stats.bugs;
    document.getElementById('statBosses').textContent = game.stats.bosses;
    
    // Analytics: Track game over and high score
    if (typeof DodoAnalytics !== 'undefined') {
        DodoAnalytics.gameOver('Payment Invaders', game.score, { wave: game.wave, ...game.stats });
        if (isNewHighScore) {
            DodoAnalytics.newHighScore('Payment Invaders', game.score);
        }
    }
    
    const messages = [
        "Your payment system has been compromised!",
        "The fraudsters have won this round...",
        "Gateway offline! Time to reboot!",
        "Security breach detected!",
        "Transaction failed! Try again?"
    ];
    document.getElementById('gameOverMessage').textContent = messages[Math.floor(Math.random() * messages.length)];
    
    document.getElementById('gameOverOverlay').style.display = 'flex';
}

function togglePause() {
    if (game.state === 'playing') {
        game.state = 'paused';
        document.getElementById('pauseOverlay').style.display = 'flex';
    } else if (game.state === 'paused') {
        game.state = 'playing';
        document.getElementById('pauseOverlay').style.display = 'none';
        requestAnimationFrame(gameLoop);
    }
}

// ==========================================
// INPUT HANDLING
// ==========================================
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (e.key === 'Escape') {
        e.preventDefault();
        togglePause();
    }
    
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Button handlers
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('resumeBtn').addEventListener('click', togglePause);

// Mobile controls
let mobileInterval = null;

function startMobileControl(action) {
    if (game.state !== 'playing') return;
    
    if (action === 'left') {
        keys['ArrowLeft'] = true;
    } else if (action === 'right') {
        keys['ArrowRight'] = true;
    } else if (action === 'fire') {
        keys[' '] = true;
    }
}

function stopMobileControl(action) {
    if (action === 'left') {
        keys['ArrowLeft'] = false;
    } else if (action === 'right') {
        keys['ArrowRight'] = false;
    } else if (action === 'fire') {
        keys[' '] = false;
    }
}

document.getElementById('mobileLeft').addEventListener('touchstart', (e) => { e.preventDefault(); startMobileControl('left'); });
document.getElementById('mobileLeft').addEventListener('touchend', (e) => { e.preventDefault(); stopMobileControl('left'); });
document.getElementById('mobileRight').addEventListener('touchstart', (e) => { e.preventDefault(); startMobileControl('right'); });
document.getElementById('mobileRight').addEventListener('touchend', (e) => { e.preventDefault(); stopMobileControl('right'); });
document.getElementById('mobileFire').addEventListener('touchstart', (e) => { e.preventDefault(); startMobileControl('fire'); });
document.getElementById('mobileFire').addEventListener('touchend', (e) => { e.preventDefault(); stopMobileControl('fire'); });

// Initialize high score display
document.getElementById('menuHighScore').textContent = game.highScore.toLocaleString();

// Start background animation
initStars();

// Background animation for menu
function menuAnimation() {
    if (game.state !== 'menu') return;
    
    ctx.fillStyle = '#0a0412';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    stars.forEach(star => {
        star.y += star.speed * 0.5;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        
        ctx.fillStyle = star.color;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    requestAnimationFrame(menuAnimation);
}

menuAnimation();

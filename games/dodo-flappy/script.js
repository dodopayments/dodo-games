// --- GAME BALANCING CONFIGURATION (Tweak these!) ---
const CONFIG = {
    collisionBuffer: 4,   // Pixels of "forgiveness" on collisions (higher = easier)
    initialSpeed: 3.0,     // Starting horizontal speed (lower = easier)
    initialGap: 260,       // Starting vertical gap size (higher = easier)
    gravity: 0.12,         // Gravity force (lower = floatier/easier)
    jumpStrength: -4.5,    // Jump height

    // Progressive Difficulty
    rampUpInterval: 5,     // Increase difficulty every X points
    speedIncrease: 0.25,   // How much speed increases per level
    gapDecrease: 5,        // How much the gap shrinks per level
    minGap: 130,           // The tightest the gap can ever get
    maxSpeed: 6.5          // The fastest the game can go
};

// --- DEV CONFIG ---
const DEBUG_MODE = false;

// --- ASSET LOADING ---
const dodoSprites = {
    normal: new Image(),
    dead: new Image()
};

dodoSprites.normal.src = 'assets/dodo-logo.svg';
dodoSprites.dead.src = 'assets/dodo-dead.svg';

let assetsLoaded = false;
let loadedCount = 0;
setTimeout(() => { if (!assetsLoaded) assetsLoaded = true; }, 1000);

for (let key in dodoSprites) {
    dodoSprites[key].onload = () => {
        loadedCount++;
        if (loadedCount === 2) assetsLoaded = true;
    };
    dodoSprites[key].onerror = () => {
        // console.warn("Failed to load " + key);
        loadedCount++;
        if (loadedCount === 2) assetsLoaded = true;
    }
}

// --- AUDIO SYSTEM ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let audioCtx = null;

function initAudio() {
    if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'score') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now); gain.gain.setValueAtTime(0.05, now);
        osc.frequency.setValueAtTime(1200, now + 0.08);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'levelup') {
        // New Sound for Level Up
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.1);
        osc.frequency.linearRampToValueAtTime(1760, now + 0.3);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'die') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    } else if (type === 'closeCall') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(300, now + 0.2);
        gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'chomp') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    }
}

// --- GAME STATE ---
let frames = 0;
let score = 0;
let bestScore = localStorage.getItem('dodo_best_mrr') || 0;
let gameState = 'START';
let currentSpeed = CONFIG.initialSpeed;
let currentGap = CONFIG.initialGap;
let particles = [];
let rainParticles = [];
const weather = { cycle: 0, raining: false, stormIntensity: 0, flashOpacity: 0 };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- TEXT & MESSAGES ---
const quips = {
    normal: ["GROWTH HACKING", "UP & TO THE RIGHT", "SCALING", "TERM SHEET"],
    closeCall: ["BURN RATE HIGH", "BRIDGE ROUND", "RUNWAY LOW", "DUE DILIGENCE"],
    easy: ["CASH FLOW +", "ZEN MODE", "PASSIVE INCOME"],
    chargebackWon: ["DISPUTE WON!", "FRAUD BLOCKED"],
    hostileAvoided: ["HOSTILE DODGED", "POISON PILL"],
    levelUp: ["SERIES A RAISED!", "TECHCRUNCH FEATURE!", "ACQUIRED COMPETITOR", "IPO ROADSHOW", "UNICORN STATUS!", "HIRING SPREE!"]
};

const deathReasons = [
    { title: "PAYMENT DECLINED", message: "Payment gateway timeout." },
    { title: "TRANSACTION FAILED", message: "Forgot to integrate Dodo Payments?" },
    { title: "HIGH CHURN", message: "Failed to find product-market fit." },
    { title: "FRAUD DETECTED", message: "High dispute rate detected." },
    { title: "API ERROR", message: "AWS bill couldn't be paid." },
    { title: "COMPLIANCE BREACH", message: "Compliance violation shut you down." },
    { title: "RUNWAY OUT", message: "VCs stopped replying to emails." },
    { title: "COMPETITION CRUSHED", message: "Zuck copied your entire feature set." },
    { title: "HACKED", message: "Your server was hacked." },
    { title: "STOLEN TRADE SECRETS", message: "Your trade secrets were stolen." },
];

// --- OBJECTS ---
const bird = {
    x: 120,
    y: 150,
    targetSize: 65,
    radius: 24,  // Radius for physics
    velocity: 0,
    rotation: 0,
    currentSprite: dodoSprites.normal,
    sweatTimer: 0,

    draw: function () {
        if (!assetsLoaded) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        let targetRotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 3, (this.velocity * 0.12)));
        this.rotation += (targetRotation - this.rotation) * 0.15;
        ctx.rotate(this.rotation);

        // --- CIRCLE CLIPPING MASK ---
        ctx.beginPath();
        // Draw a circle at 0,0
        ctx.arc(0, 0, this.targetSize / 2, 0, Math.PI * 2);
        ctx.clip(); // Clip subsequent drawing to this circle

        // Draw image centered within the clip
        ctx.drawImage(this.currentSprite, -this.targetSize / 2, -this.targetSize / 2, this.targetSize, this.targetSize);

        // Optional: Add a border to the circle to make it pop
        ctx.strokeStyle = "#0C0C0C";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore(); // Remove clip

        // --- DEBUG: DRAW HITBOX ---
        if (DEBUG_MODE) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            // Draw the actual collision radius (smaller due to buffer)
            ctx.arc(0, 0, this.radius - CONFIG.collisionBuffer, 0, Math.PI * 2);
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
    },

    flap: function () {
        this.velocity = CONFIG.jumpStrength;
        this.currentSprite = dodoSprites.normal;
        playSound('jump');
        for (let i = 0; i < 6; i++) particles.push(new Particle(this.x - 10, this.y + 10, '#C1FF00'));
    },

    update: function () {
        this.velocity += CONFIG.gravity;
        this.y += this.velocity;
        if (this.velocity > 8) this.velocity = 8;

        // this.currentSprite = dodoSprites.normal; // Removed to allow dead sprite to persist

        if (this.y + this.radius >= canvas.height - fg.h) {
            this.y = canvas.height - fg.h - this.radius;
            gameOver();
        }
        if (this.y - this.radius <= 0) {
            this.velocity = 0;
            this.y = this.radius;
        }
    }
};

const fg = {
    h: 80,
    x: 0,
    draw: function () {
        ctx.fillStyle = '#0C0C0C';
        ctx.fillRect(0, canvas.height - this.h, canvas.width, this.h);
        ctx.fillStyle = '#C1FF00';
        ctx.fillRect(0, canvas.height - this.h, canvas.width, 8);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        for (let i = 0; i < canvas.width + 50; i += 30) {
            let startX = (i + this.x) % (canvas.width + 50);
            ctx.beginPath();
            ctx.moveTo(startX, canvas.height - this.h + 8);
            ctx.lineTo(startX - 20, canvas.height - this.h + 30);
            ctx.lineTo(startX + 10, canvas.height - this.h + 30);
            ctx.lineTo(startX - 10, canvas.height);
            ctx.stroke();
        }
    },
    update: function () {
        this.x -= currentSpeed;
        if (this.x <= -(canvas.width)) this.x = 0;
    }
};

const pipes = {
    items: [],
    width: 75,
    lastTop: 0,
    pixelsSinceLastSpawn: 350, // Start ready to spawn

    draw: function () {
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            let currentX = p.x + p.offsetX;
            let currentTopY = p.top + p.offsetY + p.chompY;
            let currentBottomY = canvas.height - fg.h - p.bottom + p.offsetY - p.chompY;
            if (p.mode === 'drop') currentTopY += p.dropY;

            ctx.save();
            if (p.mode === 'ghost') ctx.globalAlpha = 0.4 + (Math.sin(frames * 0.1) * 0.2);

            let mainColorStart = '#2ecc71';
            let mainColorEnd = '#27ae60';
            let capColor = '#1e8449';

            if (p.mode === 'drop') {
                mainColorStart = '#e74c3c';
                mainColorEnd = '#c0392b';
                capColor = '#922b21';
            } else if (p.mode === 'chomp') {
                mainColorStart = '#8e44ad';
                mainColorEnd = '#6c3483';
                capColor = '#512e5f';
            } else if (p.mode === 'ghost') {
                mainColorStart = '#bdc3c7';
                mainColorEnd = '#95a5a6';
                capColor = '#7f8c8d';
            }

            let gradient = ctx.createLinearGradient(currentX, 0, currentX + this.width, 0);
            gradient.addColorStop(0, mainColorStart);
            gradient.addColorStop(1, mainColorEnd);

            ctx.fillStyle = gradient;

            // Top Pipe
            ctx.fillRect(currentX, 0, this.width, currentTopY);
            ctx.fillStyle = capColor;
            ctx.fillRect(currentX - 4, currentTopY - 20, this.width + 8, 20);

            // Teeth (Chomp)
            if (p.mode === 'chomp') {
                ctx.fillStyle = '#f0f0f0';
                ctx.beginPath();
                for (let j = 0; j < this.width; j += 15) {
                    ctx.lineTo(currentX + j, currentTopY);
                    ctx.lineTo(currentX + j + 7.5, currentTopY + 15);
                }
                ctx.fill();
            }

            // Bottom Pipe
            ctx.fillStyle = gradient;
            ctx.fillRect(currentX, currentBottomY, this.width, p.bottom + p.chompY + fg.h);
            ctx.fillStyle = capColor;
            ctx.fillRect(currentX - 4, currentBottomY, this.width + 8, 20);

            // Teeth (Chomp bottom)
            if (p.mode === 'chomp') {
                ctx.fillStyle = '#f0f0f0';
                ctx.beginPath();
                for (let j = 0; j < this.width; j += 15) {
                    ctx.lineTo(currentX + j, currentBottomY);
                    ctx.lineTo(currentX + j + 7.5, currentBottomY - 15);
                }
                ctx.fill();
            }

            // Eyes
            if (p.hasEyes || p.mode === 'drop' || p.mode === 'chomp') {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                let eyeY = currentTopY - 40;
                ctx.beginPath();
                ctx.arc(currentX + 20, eyeY, 8, 0, Math.PI * 2);
                ctx.arc(currentX + this.width - 20, eyeY, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#0C0C0C';
                // Tracking Pupils
                let angle = Math.atan2(bird.y - eyeY, bird.x - (currentX + this.width / 2));
                ctx.beginPath();
                ctx.arc(currentX + 20 + Math.cos(angle) * 3, eyeY + Math.sin(angle) * 3, 3, 0, Math.PI * 2);
                ctx.arc(currentX + this.width - 20 + Math.cos(angle) * 3, eyeY + Math.sin(angle) * 3, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // --- DEBUG: HITBOXES ---
            if (DEBUG_MODE) {
                ctx.strokeStyle = "red";
                ctx.lineWidth = 1;
                ctx.strokeRect(currentX, 0, this.width, currentTopY);
                ctx.strokeRect(currentX, currentBottomY, this.width, p.bottom + p.chompY);
            }

            ctx.restore();
        }
    },

    update: function () {
        // Spawn Rate depends on speed to keep distance consistent
        let spawnDistance = 350;
        this.pixelsSinceLastSpawn += currentSpeed;

        if (this.pixelsSinceLastSpawn >= spawnDistance) {
            this.pixelsSinceLastSpawn = 0;

            let maxY = canvas.height - fg.h - currentGap - 50;
            let minY = 50;
            let safeJumpRange = 220;
            let spawnMin = minY, spawnMax = maxY;
            let topHeight;

            if (this.items.length > 0) {
                // Subsequent pipes: spawn within safe jump range of last pipe
                spawnMin = Math.max(minY, this.lastTop - safeJumpRange);
                spawnMax = Math.min(maxY, this.lastTop + safeJumpRange);
                topHeight = Math.floor(Math.random() * (spawnMax - spawnMin + 1) + spawnMin);
            } else {
                // First pipe: center gap around bird's starting position
                // Bird starts at canvas.height / 2, so position gap center there
                topHeight = Math.floor(canvas.height / 2 - currentGap / 2);
                // Clamp to valid range to avoid edge cases
                topHeight = Math.max(minY, Math.min(maxY, topHeight));
            }
            this.lastTop = topHeight;

            let mode = 'normal';
            let r = Math.random();
            // Special pipes appear more often as score gets higher
            if (score > 5) {
                if (r > 0.92) mode = 'drop';
                else if (r > 0.85) mode = 'chomp';
                else if (r > 0.78) mode = 'ghost';
                else if (r > 0.65) mode = 'wiggle_v';
                else if (r > 0.55) mode = 'wiggle_h';
            }

            this.items.push({
                x: canvas.width,
                top: topHeight,
                bottom: canvas.height - fg.h - topHeight - currentGap,
                passed: false,
                hasEyes: Math.random() > 0.6,
                mode: mode,
                offsetX: 0, offsetY: 0, dropY: 0, dropSpeed: 0, chompY: 0
            });
        }

        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];

            if (p.mode === 'wiggle_v') p.offsetY = Math.sin(frames * 0.08) * 35;
            if (p.mode === 'wiggle_h') p.offsetX = Math.sin(frames * 0.12) * 20;

            if (p.mode === 'chomp') {
                if (p.x - bird.x < 200 && p.x + this.width > bird.x) {
                    if (p.chompY < 35) {
                        p.chompY += 2;
                        if (frames % 8 === 0) playSound('chomp');
                    }
                } else if (p.chompY > 0) p.chompY -= 1;
            }

            if (p.mode === 'drop') {
                if (p.x - bird.x < 180 && p.x - bird.x > -50 && p.dropSpeed === 0) {
                    p.dropSpeed = 2;
                    createFloatingText(p.x, p.top + 80, "CHARGEBACK!", "#e74c3c");
                }
                if (p.dropSpeed > 0) {
                    p.dropSpeed *= 1.05;
                    p.dropY += p.dropSpeed;
                }
            }

            p.x -= currentSpeed;

            // --- IMPROVED COLLISION LOGIC ---
            // We subtract the buffer from the bird's hit radius logic for the checks.
            let pLeft = p.x + p.offsetX;
            let pRight = pLeft + this.width;
            let pTopEdge = p.top + p.offsetY + p.chompY + (p.mode === 'drop' ? p.dropY : 0);
            let pBottomEdge = canvas.height - fg.h - p.bottom + p.offsetY - p.chompY;

            // For the collision check, we pretend the bird is smaller than it looks (The Buffer)
            let effectiveBirdRadius = bird.radius - CONFIG.collisionBuffer;

            // Check Horizontal overlap
            if (bird.x + effectiveBirdRadius > pLeft && bird.x - effectiveBirdRadius < pRight) {
                // Check Vertical overlap (Top Pipe OR Bottom Pipe)
                if ((bird.y - effectiveBirdRadius < pTopEdge) || (bird.y + effectiveBirdRadius > pBottomEdge)) {
                    gameOver();
                }
            }

            // Scoring & Pass Logic
            if (pLeft + this.width < bird.x && !p.passed) {
                score++;
                p.passed = true;
                playSound('score');

                // --- PROGRESSIVE DIFFICULTY & MESSAGING ---
                if (score > 0 && score % CONFIG.rampUpInterval === 0) {
                    // Increase speed, Decrease gap
                    if (currentSpeed < CONFIG.maxSpeed) currentSpeed += CONFIG.speedIncrease;
                    if (currentGap > CONFIG.minGap) currentGap -= CONFIG.gapDecrease;

                    // Play special sound and flash message
                    playSound('levelup');
                    let lvlMsg = quips.levelUp[Math.floor(Math.random() * quips.levelUp.length)];
                    createFloatingText(bird.x, bird.y - 100, lvlMsg, "#FFF", 40); // Larger text

                    // Visual flare
                    toggleRain(true);
                    setTimeout(() => toggleRain(false), 3000);
                }

                // Normal messages
                let distToTop = Math.abs((bird.y - bird.radius) - pTopEdge);
                let distToBottom = Math.abs((bird.y + bird.radius) - pBottomEdge);

                let msg = ""; let color = "#C1FF00";
                let textX = bird.x; let textY = bird.y - 50;

                if (p.mode === 'drop') {
                    msg = quips.chargebackWon[Math.floor(Math.random() * quips.chargebackWon.length)];
                }
                else if (p.mode === 'chomp') {
                    msg = quips.hostileAvoided[Math.floor(Math.random() * quips.hostileAvoided.length)];
                }
                else if (distToTop < 30 || distToBottom < 30) {
                    msg = quips.closeCall[Math.floor(Math.random() * quips.closeCall.length)];
                    color = "#ff3333";
                    bird.sweatTimer = 90;
                    playSound('closeCall');
                } else if (score % CONFIG.rampUpInterval !== 0) { // Don't overwrite level up msg
                    if (distToTop > 60 && distToBottom > 60 && Math.random() > 0.7) {
                        msg = quips.easy[Math.floor(Math.random() * quips.easy.length)];
                    } else if (Math.random() > 0.7) {
                        msg = quips.normal[Math.floor(Math.random() * quips.normal.length)];
                    }
                }

                if (msg) createFloatingText(textX, textY, msg, color);
            }

            if (p.x + this.width < -100) {
                this.items.shift(); i--;
            }
        }
    },

    reset: function () {
        this.items = [];
        currentSpeed = CONFIG.initialSpeed;
        currentGap = CONFIG.initialGap;
        this.lastTop = canvas.height / 2 - 100;
        this.pixelsSinceLastSpawn = 350;
    }
};

// --- WEATHER & ENVIRONMENT ---
class RainDrop {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.speed = Math.random() * 15 + 10;
        this.wind = Math.random() * 3 + 2;
        this.length = Math.random() * 30 + 10;
    }
    update() {
        this.y += this.speed;
        this.x -= this.wind + (currentSpeed * 0.5);
        if (this.y > canvas.height) {
            this.y = -this.length;
            this.x = Math.random() * canvas.width + 300;
        }
    }
    draw() {
        ctx.beginPath();
        ctx.strokeStyle = '#C1FF00';
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.wind, this.y + this.length);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

function toggleRain(enable) {
    weather.raining = enable;
    if (enable) {
        rainParticles = [];
        for (let i = 0; i < 120; i++) rainParticles.push(new RainDrop());
    }
}

function updateWeather() {
    weather.cycle += 0.002;
    if (weather.raining && Math.random() < 0.02) weather.flashOpacity = 0.8;
    if (weather.flashOpacity > 0) weather.flashOpacity -= 0.04;
}

function drawBackground() {
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#1a1a1a");
    grad.addColorStop(1, "#000000");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(193, 255, 0, 0.05)';
    ctx.lineWidth = 1;
    let gridSize = 60;
    let offsetX = (frames * 0.5) % gridSize;
    let offsetY = (frames * 0.5) % gridSize;

    for (let x = -offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = -offsetY; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    ctx.fillStyle = "rgba(193, 255, 0, 0.03)";
    for (let i = 0; i < 3; i++) {
        let x = ((frames * 0.8) + (i * 400)) % (canvas.width + 400) - 200;
        let y = canvas.height / 2 + Math.sin(frames * 0.01 + i) * 100;
        ctx.beginPath();
        ctx.moveTo(x, canvas.height);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 100, y - 50);
        ctx.lineTo(x + 200, canvas.height);
        ctx.fill();
    }

    if (weather.flashOpacity > 0) {
        ctx.fillStyle = `rgba(193, 255, 0, ${weather.flashOpacity * 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// --- PARTICLES & UI ---
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.size = Math.random() * 6 + 3;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 + 1;
        this.color = color || '#C1FF00';
        this.life = 1.0;
    }
    update() {
        this.x -= this.speedX + currentSpeed;
        this.y += this.speedY;
        this.life -= 0.04;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size / 2);
        ctx.lineTo(this.x + this.size / 2, this.y);
        ctx.lineTo(this.x, this.y + this.size / 2);
        ctx.lineTo(this.x - this.size / 2, this.y);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function handleParticles() {
    for (let i = 0; i < particles.length; i++) {
        particles[i].update(); particles[i].draw();
        if (particles[i].life <= 0) { particles.splice(i, 1); i--; }
    }
    if (weather.raining) {
        for (let p of rainParticles) { p.update(); p.draw(); }
    }
}

function createFloatingText(x, y, text, color, fontSize) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.left = (x - 100) + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    if (fontSize) el.style.fontSize = fontSize + 'px';
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 1500);
}

// --- INPUT & GAME LOOPS ---
function inputAction(e) {
    if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'ArrowUp')) e.preventDefault();
    const isClick = e.type === 'touchstart' || e.type === 'mousedown';
    const isKey = e.type === 'keydown' && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW');
    if (!isClick && !isKey) return;

    initAudio();
    if (gameState === 'START' && assetsLoaded) startGame();
    else if (gameState === 'PLAYING') bird.flap();
    else if (gameState === 'GAMEOVER' && Date.now() - lastDeathTime > 500) resetGame();
}

window.addEventListener('keydown', inputAction);
canvas.addEventListener('touchstart', inputAction, { passive: false });
canvas.addEventListener('mousedown', inputAction);

let lastDeathTime = 0;
let shakeDuration = 0;

function startGame() {
    gameState = 'PLAYING';
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('mrr-display').classList.remove('hidden');
    toggleRain(false);
    bird.y = canvas.height / 2;
    loop();
}

function gameOver() {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';
    bird.currentSprite = dodoSprites.dead;
    playSound('die');
    lastDeathTime = Date.now();
    shakeDuration = 30;

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('dodo_best_mrr', bestScore);
    }

    document.getElementById('finalScore').innerText = `$${score}k`;
    document.getElementById('bestScore').innerText = `$${bestScore}k MRR`;

    const reason = deathReasons[Math.floor(Math.random() * deathReasons.length)];
    document.getElementById('deathTitle').innerText = reason.title;
    document.getElementById('deathMessage').innerText = reason.message;

    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('mrr-display').classList.add('hidden');
}

function resetGame() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    bird.sweatTimer = 0;
    bird.currentSprite = dodoSprites.normal;
    pipes.reset();
    score = 0;
    frames = 0;
    particles = [];
    toggleRain(false);
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('mrr-display').classList.remove('hidden');
    gameState = 'PLAYING';
}

function updateScoreDisplay() {
    document.getElementById('mrr-display').innerText = `$${score}k MRR`;
}

function loop() {
    if (!assetsLoaded) {
        ctx.fillStyle = '#0C0C0C'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#C1FF00'; ctx.textAlign = 'center'; ctx.font = "30px Impact";
        ctx.fillText("LOADING ASSETS...", canvas.width / 2, canvas.height / 2);
        requestAnimationFrame(loop);
        return;
    }

    updateWeather();
    drawBackground();

    if (shakeDuration > 0) {
        let dx = (Math.random() - 0.5) * 25;
        let dy = (Math.random() - 0.5) * 25;
        ctx.save();
        ctx.translate(dx, dy);
        shakeDuration--;
    }

    pipes.draw();
    fg.draw();
    bird.draw();
    handleParticles();

    if (gameState === 'PLAYING') {
        pipes.update();
        fg.update();
        bird.update();
        updateScoreDisplay();
        frames++;
    }

    if (shakeDuration > -1 && shakeDuration < 29) ctx.restore();
    requestAnimationFrame(loop);
}

resizeCanvas();
loop(); 

// --- Game Configuration & Assets ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Responsive Canvas
function resizeCanvas() {
    const size = Math.min(window.innerWidth - 32, window.innerHeight - 150, 600);
    canvas.width = size;
    canvas.height = size;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const CONFIG = {
    gridCount: 20, // 20x20 grid
    speedStart: 150, // ms per tick
    speedMin: 70,    // Max speed
    colorSnakeHead: '#06b6d4', // Cyan 500
    colorSnakeBody: '#0891b2', // Cyan 600
    colorFood: '#4ade80',      // Green 400
    colorFraud: '#ef4444',     // Red 500
    colorShield: '#facc15'     // Yellow 400
};

const MO_R_TIPS = [
    "Enable 3D Secure 2.0 to shift liability away from your business.",
    "Use velocity checks to block fraudsters testing multiple cards rapidly.",
    "Regularly update your PCI-DSS compliance to avoid heavy fines.",
    "Implement AVS (Address Verification) to match billing addresses.",
    "Tokenize sensitive data! Never store raw credit card numbers.",
    "Monitor chargeback ratios. Exceeding 1% can get your account frozen.",
    "Use a multi-acquirer strategy to ensure transaction uptime.",
    "Geo-fencing can prevent fraud from high-risk regions.",
    "Machine learning models can detect fraud patterns human rules miss.",
    "Always refund suspicious transactions before they become chargebacks."
];

// --- Asset Loading ---
const dodoImg = new Image();
dodoImg.src = 'assets/images/dodo-logo.png'; 
let dodoLoaded = false;
dodoImg.onload = () => { dodoLoaded = true; };
// Fallback handled in draw function

// --- Game State ---
let state = {
    status: 'START', // START, PLAYING, PAUSED, GAMEOVER
    score: 0,
    highScore: 0,
    gridSize: 0, // Calculated based on canvas width
    tick: 0,
    speed: CONFIG.speedStart,
    lastFrameTime: 0,
    timer: 0,
    
    snake: [],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    
    food: null,
    fraudBlocks: [],
    shield: null,
    isShielded: false,
    shieldTimer: 0,
    
    particles: []
};

// --- Audio Context (Synthesized SFX for single file portability) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playEatSound() { playTone(600, 'sine', 0.1); playTone(1200, 'sine', 0.1); }
function playCrashSound() { playTone(150, 'sawtooth', 0.5); }
function playShieldSound() { playTone(400, 'square', 0.2); playTone(800, 'square', 0.4); }

// --- Core Logic ---

function initGame() {
    state.gridSize = canvas.width / CONFIG.gridCount;
    state.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    state.direction = { x: 1, y: 0 };
    state.nextDirection = { x: 1, y: 0 };
    state.score = 0;
    state.speed = CONFIG.speedStart;
    state.fraudBlocks = [];
    state.isShielded = false;
    state.shield = null;
    state.particles = [];
    spawnFood();
    spawnFraud(3); // Start with 3 obstacles
    updateUI();
}

function spawnFood() {
    let valid = false;
    while (!valid) {
        state.food = {
            x: Math.floor(Math.random() * CONFIG.gridCount),
            y: Math.floor(Math.random() * CONFIG.gridCount)
        };
        valid = !isCollision(state.food, state.snake) && !isCollision(state.food, state.fraudBlocks);
    }
}

function spawnFraud(count) {
    for(let i=0; i<count; i++) {
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 50) {
            const block = {
                x: Math.floor(Math.random() * CONFIG.gridCount),
                y: Math.floor(Math.random() * CONFIG.gridCount)
            };
            // Don't spawn too close to head
            const dist = Math.abs(block.x - state.snake[0].x) + Math.abs(block.y - state.snake[0].y);
            
            if (dist > 5 && !isCollision(block, state.snake) && !isCollision(block, state.fraudBlocks) && (state.food.x !== block.x || state.food.y !== block.y)) {
                state.fraudBlocks.push(block);
                valid = true;
            }
            attempts++;
        }
    }
}

function spawnShield() {
    // 10% chance to spawn shield if one doesn't exist and not active
    if (!state.shield && !state.isShielded && Math.random() < 0.1) {
        let valid = false;
        while(!valid) {
            const s = {
                x: Math.floor(Math.random() * CONFIG.gridCount),
                y: Math.floor(Math.random() * CONFIG.gridCount)
            };
            if(!isCollision(s, state.snake) && !isCollision(s, state.fraudBlocks) && (s.x !== state.food.x)) {
                state.shield = s;
                valid = true;
            }
        }
    }
}

function isCollision(pt, array) {
    if (Array.isArray(array)) {
        return array.some(p => p.x === pt.x && p.y === pt.y);
    }
    return false; // single object handled differently if needed
}

function createParticles(x, y, color) {
    const px = x * state.gridSize + state.gridSize/2;
    const py = y * state.gridSize + state.gridSize/2;
    for(let i=0; i<8; i++) {
        state.particles.push({
            x: px, y: py,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1.0,
            color: color
        });
    }
}

function update(timestamp) {
    if (state.status !== 'PLAYING') return;

    // Shield Timer Logic
    if (state.isShielded) {
        state.shieldTimer -= (timestamp - state.lastFrameTime);
        if (state.shieldTimer <= 0) {
            state.isShielded = false;
            document.getElementById('shield-status').style.opacity = '0';
        }
    }

    // Movement Logic Tick
    state.timer += (timestamp - state.lastFrameTime);
    state.lastFrameTime = timestamp;

    if (state.timer > state.speed) {
        state.timer = 0;
        
        state.direction = state.nextDirection;
        const head = { x: state.snake[0].x + state.direction.x, y: state.snake[0].y + state.direction.y };

        // 1. Wall Collision
        if (head.x < 0 || head.x >= CONFIG.gridCount || head.y < 0 || head.y >= CONFIG.gridCount) {
            gameOver("Network Timeout: Boundary Error");
            return;
        }

        // 2. Self Collision
        // Ignore the tail since it will move, unless we just ate
        if (isCollision(head, state.snake.slice(0, -1))) { // Slicing to allow chasing tail
                gameOver("Internal Loop: Self-Reference Error");
                return;
        }

        // 3. Fraud Collision
        if (isCollision(head, state.fraudBlocks)) {
            if (state.isShielded) {
                // Destroy fraud block
                playCrashSound();
                state.fraudBlocks = state.fraudBlocks.filter(b => b.x !== head.x || b.y !== head.y);
                createParticles(head.x, head.y, CONFIG.colorFraud);
            } else {
                gameOver("Security Breach: Fraud Detected");
                return;
            }
        }

        // Move Snake
        state.snake.unshift(head);

        // 4. Eat Food
        if (head.x === state.food.x && head.y === state.food.y) {
            state.score += 100;
            // Increase speed slightly
            state.speed = Math.max(CONFIG.speedMin, state.speed - 2);
            
            playEatSound();
            createParticles(head.x, head.y, CONFIG.colorFood);
            
            spawnFood();
            
            // Every 500 points, add more fraud
            if (state.score % 500 === 0) spawnFraud(1);
            
            // Chance for shield
            if (state.score % 300 === 0) spawnShield();

        } else if (state.shield && head.x === state.shield.x && head.y === state.shield.y) {
            // 5. Collect Shield
            state.isShielded = true;
            state.shieldTimer = 5000; // 5 seconds
            state.shield = null; // Remove from map
            playShieldSound();
            document.getElementById('shield-status').style.opacity = '1';
            // Don't pop tail, free growth? No, standard snake rules apply usually. 
            // Let's pop tail to maintain length unless eating food.
            state.snake.pop();
        } else {
            state.snake.pop();
        }

        updateUI();
    }

    // Particle Physics
    state.particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if(p.life <= 0) state.particles.splice(index, 1);
    });
}

function draw() {
    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gs = state.gridSize;

    // Draw Fraud (Obstacles)
    ctx.fillStyle = CONFIG.colorFraud;
    ctx.shadowBlur = 10;
    ctx.shadowColor = CONFIG.colorFraud;
    state.fraudBlocks.forEach(b => {
        ctx.fillRect(b.x * gs + 1, b.y * gs + 1, gs - 2, gs - 2);
        // Draw 'X'
        ctx.fillStyle = '#000';
        ctx.font = `${gs-4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', b.x * gs + gs/2, b.y * gs + gs/2 + 2);
        ctx.fillStyle = CONFIG.colorFraud;
    });
    ctx.shadowBlur = 0;

    // Draw Food
    ctx.shadowBlur = 15;
    ctx.shadowColor = CONFIG.colorFood;
    ctx.fillStyle = CONFIG.colorFood;
    ctx.beginPath();
    ctx.arc(state.food.x * gs + gs/2, state.food.y * gs + gs/2, gs/2 - 2, 0, Math.PI*2);
    ctx.fill();
    // Dollar sign
    ctx.fillStyle = '#064e3b';
    ctx.font = `bold ${gs-6}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', state.food.x * gs + gs/2, state.food.y * gs + gs/2 + 1);
    ctx.shadowBlur = 0;

    // Draw Shield Item
    if (state.shield) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = CONFIG.colorShield;
        ctx.fillStyle = CONFIG.colorShield;
        ctx.beginPath();
        ctx.arc(state.shield.x * gs + gs/2, state.shield.y * gs + gs/2, gs/2 - 2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `bold ${gs-8}px monospace`;
        ctx.fillText('S', state.shield.x * gs + gs/2, state.shield.y * gs + gs/2 + 1);
        ctx.shadowBlur = 0;
    }

    // Draw Snake
    state.snake.forEach((seg, index) => {
        const x = seg.x * gs;
        const y = seg.y * gs;
        
        if (index === 0) {
            // Head
            if (state.isShielded) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = CONFIG.colorShield;
                ctx.strokeStyle = CONFIG.colorShield;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, gs, gs);
            }
            
            if (dodoLoaded) {
                ctx.drawImage(dodoImg, x, y, gs, gs);
            } else {
                // Fallback Head
                ctx.fillStyle = CONFIG.colorSnakeHead;
                ctx.fillRect(x, y, gs, gs);
                // Eye
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(x + gs*0.7, y + gs*0.3, 2, 0, Math.PI*2);
                ctx.fill();
            }
        } else {
            // Body (Data Packets)
            ctx.fillStyle = CONFIG.colorSnakeBody;
            ctx.fillRect(x + 1, y + 1, gs - 2, gs - 2);
            
            // Decorate body to look like packets
            ctx.fillStyle = '#155e75'; // Darker cyan
            ctx.font = `${gs/2}px monospace`;
            ctx.fillText(index % 2 === 0 ? '1' : '0', x + gs/2, y + gs/2 + 1);
        }
        ctx.shadowBlur = 0;
    });

    // Draw Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1.0;
    });
}

function gameLoop(timestamp) {
    update(timestamp);
    draw();
    if (state.status === 'PLAYING') {
        requestAnimationFrame(gameLoop);
    }
}

// --- Game Flow Control ---

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    state.status = 'PLAYING';
    state.lastFrameTime = performance.now();
    initGame();
    requestAnimationFrame(gameLoop);
}

function gameOver(reason) {
    playCrashSound();
    state.status = 'GAMEOVER';
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('death-reason').innerText = reason;
    document.getElementById('final-score').innerText = '$' + state.score.toFixed(2);
    
    // Select relevant tip
    const tipIndex = Math.floor(Math.random() * MO_R_TIPS.length);
    document.getElementById('security-tip').innerText = `"${MO_R_TIPS[tipIndex]}"`;
}

function updateUI() {
    document.getElementById('score-display').innerText = '$' + state.score.toFixed(2);
}

// --- Input Handling ---

document.addEventListener('keydown', (e) => {
    if (state.status === 'START' || state.status === 'GAMEOVER') {
        if (e.code === 'Enter' || e.code === 'Space') startGame();
        return;
    }

    // Pause
    if (e.code === 'KeyP') {
        state.status = state.status === 'PAUSED' ? 'PLAYING' : 'PAUSED';
        if(state.status === 'PLAYING') {
            state.lastFrameTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    }
    // Restart
    if (e.code === 'KeyR') startGame();

    // Direction
    const goingUp = state.direction.y === -1;
    const goingDown = state.direction.y === 1;
    const goingRight = state.direction.x === 1;
    const goingLeft = state.direction.x === -1;

    if ((e.key === 'ArrowUp' || e.key === 'w') && !goingDown) {
        state.nextDirection = { x: 0, y: -1 };
    }
    if ((e.key === 'ArrowDown' || e.key === 's') && !goingUp) {
        state.nextDirection = { x: 0, y: 1 };
    }
    if ((e.key === 'ArrowLeft' || e.key === 'a') && !goingRight) {
        state.nextDirection = { x: -1, y: 0 };
    }
    if ((e.key === 'ArrowRight' || e.key === 'd') && !goingLeft) {
        state.nextDirection = { x: 1, y: 0 };
    }
});

// Touch Controls (Swipe)
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, false);

canvas.addEventListener('touchmove', function(e) { e.preventDefault(); }, false); // Prevent scrolling

canvas.addEventListener('touchend', function(e) {
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
}, false);

function handleSwipe(sx, sy, ex, ey) {
    const dx = ex - sx;
    const dy = ey - sy;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        const goingRight = state.direction.x === 1;
        const goingLeft = state.direction.x === -1;
        if (dx > 0 && !goingLeft) state.nextDirection = { x: 1, y: 0 };
        if (dx < 0 && !goingRight) state.nextDirection = { x: -1, y: 0 };
    } else {
        // Vertical
        const goingUp = state.direction.y === -1;
        const goingDown = state.direction.y === 1;
        if (dy > 0 && !goingUp) state.nextDirection = { x: 0, y: 1 };
        if (dy < 0 && !goingDown) state.nextDirection = { x: 0, y: -1 };
    }
}

// Button Bindings
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// Initial Draw
initGame();
draw(); // Draw static first frame
state.status = 'START';

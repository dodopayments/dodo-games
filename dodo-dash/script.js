const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GAME_SPEED_START = 5;
const GAME_SPEED_MAX = 15;
const SPEED_INCREMENT = 0.001;
const GRAVITY = 0.6;
const JUMP_STRENGTH = -12; // Increased from -10 for higher jump
const GROUND_HEIGHT = 20;

let gameSpeed = GAME_SPEED_START;
let score = 0;
let highScore = localStorage.getItem('dodo_dash_highscore') || 0;
let frame = 0;
let gameOver = false;
let obstacles = [];

// Canvas Size
function resizeCanvas() {
    canvas.width = 800;
    canvas.height = 300;
}
resizeCanvas();

// Assets
const dodoImg = new Image();
dodoImg.src = 'assets/dodo.svg';

// Player Object
const dodo = {
    x: 50,
    y: canvas.height - GROUND_HEIGHT - 50,
    width: 40,
    height: 40,
    dy: 0,
    jumpForce: JUMP_STRENGTH,
    grounded: false,
    ducking: false,
    originalHeight: 40,
    duckHeight: 20,

    draw: function () {
        ctx.fillStyle = '#C1FF00'; // Fallback color
        // ctx.fillRect(this.x, this.y, this.width, this.height);

        if (dodoImg.complete) {
            ctx.drawImage(dodoImg, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    },

    update: function () {
        // Jump
        if (keys['Space'] || keys['ArrowUp']) {
            this.jump();
        }

        // Duck
        if (keys['ArrowDown']) {
            if (!this.ducking) {
                this.height = this.duckHeight;
                this.y += (this.originalHeight - this.duckHeight);
                this.ducking = true;
            }
        } else {
            if (this.ducking) {
                this.height = this.originalHeight;
                this.y -= (this.originalHeight - this.duckHeight);
                this.ducking = false;
            }
        }

        this.y += this.dy;

        // Gravity
        if (this.y + this.height < canvas.height - GROUND_HEIGHT) {
            this.dy += GRAVITY;
            this.grounded = false;
        } else {
            this.dy = 0;
            this.grounded = true;
            this.y = canvas.height - GROUND_HEIGHT - this.height;
        }
    },

    jump: function () {
        if (this.grounded && !this.ducking) {
            this.dy = this.jumpForce;
            this.grounded = false;
        }
    }
};

// Obstacle Class
class Obstacle {
    constructor() {
        this.width = 20 + Math.random() * 30;
        this.height = 30 + Math.random() * 30;
        this.x = canvas.width;
        this.y = canvas.height - GROUND_HEIGHT - this.height;
        this.markedForDeletion = false;
        this.color = '#FF4757'; // Reddish for danger
    }

    update() {
        this.x -= gameSpeed;
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.fillStyle = this.color;

        // Draw a cactus-like shape
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Add some details to look like a cactus
        ctx.fillStyle = '#CC3340';
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
    }
}

// Input Handling
const keys = {};
window.addEventListener('keydown', function (e) {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (gameOver) {
            resetGame();
        }
    }
});
window.addEventListener('keyup', function (e) {
    keys[e.code] = false;
});

// Game Functions
// Spawning Logic
let spawnTimer = 0;

function spawnObstacle() {
    obstacles.push(new Obstacle());

    // Calculate minimum frames needed to jump over an obstacle and land
    // Air time is roughly 2 * (JUMP_STRENGTH / GRAVITY)
    // With JUMP_STRENGTH = 12 and GRAVITY = 0.6, air time is ~40 frames
    const minFrames = 45;
    const randomFrames = Math.random() * 50 + 20;

    spawnTimer = minFrames + randomFrames;
}

function handleObstacles() {
    spawnTimer--;
    if (spawnTimer <= 0) {
        spawnObstacle();
    }

    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].update();
        obstacles[i].draw();

        // Collision Detection (with hitbox padding)
        const padding = 5;
        if (
            dodo.x + padding < obstacles[i].x + obstacles[i].width &&
            dodo.x + dodo.width - padding > obstacles[i].x &&
            dodo.y + padding < obstacles[i].y + obstacles[i].height &&
            dodo.y + dodo.height - padding > obstacles[i].y
        ) {
            gameOver = true;
            document.getElementById('game-over-screen').style.display = 'block';
        }
    }
    obstacles = obstacles.filter(obstacle => !obstacle.markedForDeletion);
}

function drawGround() {
    ctx.fillStyle = '#888';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);

    // Add some noise/texture to ground
    ctx.fillStyle = '#555';
    for (let i = 0; i < canvas.width; i += 20) {
        if ((i + frame * gameSpeed) % 100 < 50) {
            ctx.fillRect(i - (frame * gameSpeed) % 20, canvas.height - GROUND_HEIGHT + 5, 5, 5);
        }
    }
}

function drawScore() {
    ctx.fillStyle = '#888';
    ctx.font = '16px "Press Start 2P"';
    // ctx.fillText('Score: ' + Math.floor(score), 10, 30);

    document.getElementById('current-score').innerText = Math.floor(score).toString().padStart(5, '0');
    document.getElementById('high-score').innerText = Math.floor(highScore).toString().padStart(5, '0');
}

function resetGame() {
    dodo.y = canvas.height - GROUND_HEIGHT - dodo.height;
    dodo.dy = 0;
    obstacles = [];
    score = 0;
    gameSpeed = GAME_SPEED_START;
    gameOver = false;
    document.getElementById('game-over-screen').style.display = 'none';
    animate();
}

function animate() {
    if (gameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    dodo.update();
    dodo.draw();

    handleObstacles();
    drawGround();

    score += 0.1;
    if (gameSpeed < GAME_SPEED_MAX) {
        gameSpeed += SPEED_INCREMENT;
    }

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('dodo_dash_highscore', highScore);
    }

    drawScore();

    frame++;
    requestAnimationFrame(animate);
}

// Start
document.getElementById('high-score').innerText = Math.floor(highScore).toString().padStart(5, '0');
animate();

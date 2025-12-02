document.addEventListener("DOMContentLoaded", function() {
    /**
     * AUDIO ENGINE (Synthesizer)
     * No external files needed. Creates beeps/boops with Web Audio API.
     */
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const SoundFX = {
        playTone: (freq, type, duration) => {
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
        },
        shoot: () => SoundFX.playTone(600, 'square', 0.1),
        explosion: () => SoundFX.playTone(100, 'sawtooth', 0.3),
        powerup: () => {
            SoundFX.playTone(400, 'sine', 0.1);
            setTimeout(() => SoundFX.playTone(800, 'sine', 0.2), 100);
        },
        damage: () => SoundFX.playTone(60, 'sawtooth', 0.5)
    };

    /**
     * GAME ENGINE
     */
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Branding Colors
    const COLORS = {
        lime: '#ccff00',
        bg: '#111',
        enemy: '#ff3333',
        text: '#fff',
        grid: '#222'
    };

    // Load Image (with fallback)
    const dodoImg = new Image();
    dodoImg.src = 'assets/images/dodo-logo.png';
    let imageLoaded = false;
    dodoImg.onload = () => { imageLoaded = true; };

    class Game {
        constructor() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.centerX = this.width / 2;
            this.centerY = this.height / 2;
            
            this.state = 'START'; // START, PLAYING, GAMEOVER
            this.score = 0;
            this.credits = 0;
            this.health = 100;
            this.wave = 1;
            this.enemies = [];
            this.particles = [];
            this.projectiles = []; // For firewall
            
            this.spawnRate = 60; // Frames between spawns
            this.frameCount = 0;
            this.difficultyMultiplier = 1;

            // Upgrades
            this.upgrades = {
                firewall: { level: 0, cost: 500, range: 150, speed: 40 }, // Auto turret
                limiter: { level: 0, cost: 800, slowFactor: 0 }, // Slows enemies
            };

            // Event Listeners
            window.addEventListener('resize', () => this.resize());
            canvas.addEventListener('mousedown', (e) => this.handleInput(e.clientX, e.clientY));
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling
                this.handleInput(e.touches[0].clientX, e.touches[0].clientY);
            }, {passive: false});

            this.resize();
            this.loop = this.loop.bind(this);
            requestAnimationFrame(this.loop);

            // High Score Load
            this.highScore = localStorage.getItem('dodo_highscore') || 0;
            document.getElementById('highScore').innerText = this.highScore;
        }

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            canvas.width = this.width;
            canvas.height = this.height;
            this.centerX = this.width / 2;
            this.centerY = this.height / 2;
        }

        start() {
            document.getElementById('startScreen').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.add('hidden');
            document.getElementById('hud').classList.remove('hidden');
            document.getElementById('upgrade-menu').classList.remove('hidden');
            
            this.state = 'PLAYING';
            this.resetGameData();
            SoundFX.powerup();
            
            // Analytics: Track game start
            if (typeof DodoAnalytics !== 'undefined') {
                DodoAnalytics.gameStart('Gateway Defender Dodo');
            }
        }

        resetGameData() {
            this.score = 0;
            this.credits = 0;
            this.health = 100;
            this.wave = 1;
            this.enemies = [];
            this.particles = [];
            this.projectiles = [];
            this.spawnRate = 60;
            this.difficultyMultiplier = 1;
            this.upgrades.firewall.level = 0;
            this.upgrades.limiter.level = 0;
            this.updateUI();
        }

        reset() {
            this.start();
        }

        gameOver() {
            this.state = 'GAMEOVER';
            document.getElementById('gameOverScreen').classList.remove('hidden');
            document.getElementById('hud').classList.add('hidden');
            document.getElementById('upgrade-menu').classList.add('hidden');
            document.getElementById('finalScore').innerText = this.score;
            
            const isNewHighScore = this.score > this.highScore;
            if (isNewHighScore) {
                this.highScore = this.score;
                localStorage.setItem('dodo_highscore', this.highScore);
            }
            document.getElementById('highScore').innerText = this.highScore;
            SoundFX.damage();
            
            // Analytics: Track game over and high score
            if (typeof DodoAnalytics !== 'undefined') {
                DodoAnalytics.gameOver('Gateway Defender Dodo', this.score, { wave: this.wave });
                if (isNewHighScore) {
                    DodoAnalytics.newHighScore('Gateway Defender Dodo', this.score);
                }
            }
        }

        handleInput(x, y) {
            if (this.state !== 'PLAYING') return;

            // Create click ripple
            this.createParticles(x, y, 5, COLORS.lime);
            SoundFX.shoot();

            // Check collision with enemies (Reverse loop to remove correctly)
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];
                const dist = Math.hypot(e.x - x, e.y - y);
                if (dist < e.radius + 20) { // +20 for generous hit box
                    this.killEnemy(i);
                }
            }
        }

        killEnemy(index) {
            const e = this.enemies[index];
            this.createParticles(e.x, e.y, 10, COLORS.enemy);
            this.enemies.splice(index, 1);
            this.score += 1;
            this.credits += 10;
            SoundFX.explosion();
            this.updateUI();
        }

        createParticles(x, y, count, color) {
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    life: 1.0,
                    color: color
                });
            }
        }

        spawnEnemy() {
            // Spawn from random edge
            let x, y;
            if (Math.random() < 0.5) {
                x = Math.random() < 0.5 ? -20 : this.width + 20;
                y = Math.random() * this.height;
            } else {
                x = Math.random() * this.width;
                y = Math.random() < 0.5 ? -20 : this.height + 20;
            }

            // Difficulty scaling
            const speedBase = 1 + (this.wave * 0.2);
            const speed = speedBase * (1 - (this.upgrades.limiter.level * 0.15)); // Rate limiter slows them

            this.enemies.push({
                x: x,
                y: y,
                radius: 10 + Math.random() * 5,
                speed: Math.max(0.5, speed),
                id: Math.floor(Math.random() * 9999) // For "bot_123" text
            });
        }

        firewallLogic() {
            if (this.upgrades.firewall.level === 0) return;
            
            // Auto shoot closest enemy
            if (this.frameCount % (60 - this.upgrades.firewall.level * 10) === 0) {
                // Find closest
                let closestDist = Infinity;
                let closestIndex = -1;
                
                this.enemies.forEach((e, index) => {
                    const dist = Math.hypot(e.x - this.centerX, e.y - this.centerY);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestIndex = index;
                    }
                });

                if (closestIndex !== -1 && closestDist < 300) { // Range
                    const target = this.enemies[closestIndex];
                    this.projectiles.push({
                        x: this.centerX,
                        y: this.centerY,
                        targetId: target.id, // Homing missile logic simplified
                        speed: 10,
                        active: true
                    });
                }
            }
        }

        buyUpgrade(type) {
            if (type === 'heal') {
                if (this.credits >= 300 && this.health < 100) {
                    this.credits -= 300;
                    this.health = Math.min(100, this.health + 20);
                    SoundFX.powerup();
                }
            } else {
                const upg = this.upgrades[type];
                if (this.credits >= upg.cost && upg.level < 5) {
                    this.credits -= upg.cost;
                    upg.level++;
                    upg.cost = Math.floor(upg.cost * 1.5);
                    SoundFX.powerup();
                }
            }
            this.updateUI();
        }

        updateUI() {
            document.getElementById('scoreDisplay').innerText = this.credits;
            document.getElementById('healthDisplay').innerText = Math.floor(this.health) + '%';
            document.getElementById('waveDisplay').innerText = this.wave;

            // Update buttons visuals
            document.getElementById('btn-firewall').querySelector('.upgrade-cost').innerText = this.upgrades.firewall.level >= 5 ? 'MAX' : this.upgrades.firewall.cost + ' pts';
            document.getElementById('btn-limiter').querySelector('.upgrade-cost').innerText = this.upgrades.limiter.level >= 5 ? 'MAX' : this.upgrades.limiter.cost + ' pts';
            
            // Toggle color if affordable
            ['firewall', 'limiter', 'heal'].forEach(type => {
                const btn = document.getElementById('btn-' + type);
                const cost = type === 'heal' ? 300 : this.upgrades[type].cost;
                if (this.credits >= cost) btn.classList.add('affordable');
                else btn.classList.remove('affordable');
            });
        }

        share() {
            const text = `I defended DoDo Payments from ${this.score} bot requests before the gateway crashed! 🛡️💀 #DefendTheGateway #DoDoPayments`;
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
            
            // Analytics: Track share
            if (typeof DodoAnalytics !== 'undefined') {
                DodoAnalytics.shareScore('Gateway Defender Dodo', 'twitter');
            }
        }

        update() {
            if (this.state !== 'PLAYING') return;

            this.frameCount++;

            // Wave Logic
            if (this.frameCount % 600 === 0) { // Every 10 seconds
                this.wave++;
                this.spawnRate = Math.max(10, 60 - (this.wave * 2));
                SoundFX.powerup(); // Wave complete sound
                this.updateUI();
            }

            // Spawn Enemies
            if (this.frameCount % Math.floor(this.spawnRate) === 0) {
                this.spawnEnemy();
            }

            // Update Enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];
                const angle = Math.atan2(this.centerY - e.y, this.centerX - e.x);
                e.x += Math.cos(angle) * e.speed;
                e.y += Math.sin(angle) * e.speed;

                // Hit Core
                const distToCore = Math.hypot(e.x - this.centerX, e.y - this.centerY);
                if (distToCore < 40) { // Core Radius
                    this.health -= 10;
                    this.enemies.splice(i, 1);
                    SoundFX.damage();
                    this.createParticles(this.centerX, this.centerY, 10, COLORS.lime);
                    
                    // Screen shake effect (visual only logic handled in draw)
                    canvas.style.transform = `translate(${Math.random()*10-5}px, ${Math.random()*10-5}px)`;
                    setTimeout(() => canvas.style.transform = 'none', 50);

                    this.updateUI();
                    if (this.health <= 0) this.gameOver();
                }
            }

            // Update Projectiles (Firewall)
            this.firewallLogic();
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const p = this.projectiles[i];
                // Find target
                const target = this.enemies.find(e => e.id === p.targetId);
                if (target) {
                        const angle = Math.atan2(target.y - p.y, target.x - p.x);
                        p.x += Math.cos(angle) * p.speed;
                        p.y += Math.sin(angle) * p.speed;
                        
                        if (Math.hypot(target.x - p.x, target.y - p.y) < 20) {
                            // Hit
                            this.projectiles.splice(i, 1);
                            const tIndex = this.enemies.indexOf(target);
                            if(tIndex > -1) this.killEnemy(tIndex);
                        }
                } else {
                    this.projectiles.splice(i, 1); // Target lost
                }
            }

            // Update Particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.05;
                if (p.life <= 0) this.particles.splice(i, 1);
            }
        }

        draw() {
            // Clear
            ctx.fillStyle = COLORS.bg;
            ctx.fillRect(0, 0, this.width, this.height);

            // Draw Grid (Retro style)
            ctx.strokeStyle = COLORS.grid;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x < this.width; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, this.height); }
            for (let y = 0; y < this.height; y += 50) { ctx.moveTo(0, y); ctx.lineTo(this.width, y); }
            ctx.stroke();

            // Draw Core (The Dodo)
            ctx.save();
            ctx.translate(this.centerX, this.centerY);
            
            // Pulse effect
            const pulse = 1 + Math.sin(this.frameCount * 0.1) * 0.05;
            ctx.scale(pulse, pulse);

            if (imageLoaded) {
                ctx.beginPath();
                ctx.arc(0, 0, 40, 0, Math.PI * 2);
                ctx.fillStyle = COLORS.lime;
                ctx.fill();
                ctx.clip();
                ctx.drawImage(dodoImg, -40, -40, 80, 80);
            } else {
                // Fallback graphic if image not found
                ctx.beginPath();
                ctx.arc(0, 0, 40, 0, Math.PI * 2);
                ctx.fillStyle = COLORS.lime;
                ctx.fill();
                ctx.fillStyle = 'black';
                ctx.font = 'bold 12px Courier';
                ctx.textAlign = 'center';
                ctx.fillText("DODO", 0, 5);
            }

            // Draw Ring (Health)
            ctx.restore();
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, 50, 0, Math.PI * 2 * (this.health / 100));
            ctx.strokeStyle = this.health > 30 ? COLORS.lime : 'red';
            ctx.lineWidth = 5;
            ctx.stroke();

            // Draw Firewall (if active)
            if (this.upgrades.firewall.level > 0) {
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, 150, 0, Math.PI*2);
                ctx.strokeStyle = `rgba(204, 255, 0, 0.2)`;
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 15]);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Rotating turret bit
                ctx.save();
                ctx.translate(this.centerX, this.centerY);
                ctx.rotate(this.frameCount * 0.05);
                ctx.fillStyle = COLORS.lime;
                ctx.fillRect(50, -2, 10, 4);
                ctx.restore();
            }

            // Draw Enemies
            this.enemies.forEach(e => {
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.fillStyle = COLORS.enemy;
                ctx.fill();
                
                // Bot eyes
                ctx.fillStyle = 'white';
                ctx.fillRect(e.x - 3, e.y - 3, 2, 2);
                ctx.fillRect(e.x + 1, e.y - 3, 2, 2);

                // Bot name (Tech humor)
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.font = '10px Courier';
                ctx.fillText(`bot_${e.id}`, e.x, e.y - 15);
            });

            // Draw Projectiles
            this.projectiles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
                ctx.fillStyle = COLORS.lime;
                ctx.fill();
            });

            // Draw Particles
            this.particles.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, 3, 3);
                ctx.globalAlpha = 1;
            });
        }

        loop() {
            this.update();
            this.draw();
            requestAnimationFrame(this.loop);
        }
    }

    const game = new Game();

    // Upgrade menu buttons
    document.getElementById('btn-firewall').addEventListener('click', function() {
        game.buyUpgrade('firewall');
    });

    document.getElementById('btn-limiter').addEventListener('click', function() {
        game.buyUpgrade('limiter');
    });

    document.getElementById('btn-heal').addEventListener('click', function() {
        game.buyUpgrade('heal');
    });

    // Start screen button
    document.getElementById('startBtn').addEventListener('click', function() {
        game.start();
    });

    // Game over screen buttons
    document.getElementById('rebootBtn').addEventListener('click', function() {
        game.reset();
    });

    document.getElementById('shareBtn').addEventListener('click', function() {
        game.share();
    });
});



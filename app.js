const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const UI = {
    menu: document.getElementById('menu-overlay'),
    gameOver: document.getElementById('game-over-overlay'),
    mutation: document.getElementById('mutation-overlay'),
    score: document.getElementById('current-score'),
    highScore: document.getElementById('high-score'),
    level: document.getElementById('current-level'),
    finalScore: document.getElementById('final-score'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn')
};

// Game Settings & State
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

let snake = [];
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let food = { x: 15, y: 15 };
let powerUpObject = null;
let obstacles = [];

let score = 0;
let level = 1;
let baseSpeed = 100; // ms per frame (lower is faster)
let currentSpeed = baseSpeed;
let gameLoopRef = null;
let isGameOver = false;
let isPaused = false;
let frameCount = 0;

// Powerup state
let activePowerUp = null; // 'shield', '2x', 'slow'
let powerUpTimer = 0;

// High Score
let highScore = localStorage.getItem('neonSnakeHighScore') || 0;
UI.highScore.innerText = highScore;

// Initialize the game state
function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    dx = 0;
    dy = -1;
    nextDx = 0;
    nextDy = -1;
    score = 0;
    level = 1;
    baseSpeed = 100;
    currentSpeed = baseSpeed;
    isGameOver = false;
    isPaused = false;
    activePowerUp = null;
    obstacles = [];
    powerUpObject = null;
    
    updateScoreBoard();
    spawnFood();
    
    UI.menu.classList.add('hidden');
    UI.gameOver.classList.add('hidden');
    UI.mutation.classList.add('hidden');
    
    if (gameLoopRef) clearTimeout(gameLoopRef);
    requestAnimationFrame(gameLoop);
}

// Spawning Logic
function spawnFood() {
    let valid = false;
    while (!valid) {
        food = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        valid = !isPositionOccupied(food.x, food.y);
    }
}

function spawnPowerUp() {
    if (powerUpObject) return;
    const types = ['shield', '2x', 'slow'];
    const type = types[Math.floor(Math.random() * types.length)];
    let valid = false;
    let pos = {};
    while (!valid) {
        pos = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        valid = !isPositionOccupied(pos.x, pos.y) && (pos.x !== food.x || pos.y !== food.y);
    }
    powerUpObject = { x: pos.x, y: pos.y, type: type, age: 0 };
}

function spawnObstacle() {
    let valid = false;
    let pos = {};
    let attempts = 0;
    while (!valid && attempts < 50) {
        pos = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        valid = !isPositionOccupied(pos.x, pos.y) && manhattanDistance(pos, snake[0]) > 5;
        attempts++;
    }
    if(valid) {
        obstacles.push({ x: pos.x, y: pos.y, life: 50 }); // life in frames
    }
}

function manhattanDistance(p1, p2) {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

function isPositionOccupied(x, y) {
    for (let part of snake) {
        if (part.x === x && part.y === y) return true;
    }
    for (let obs of obstacles) {
        if (obs.x === x && obs.y === y) return true;
    }
    return false;
}

// Main Game Loop - Using setTimeout alongside requestAnimationFrame for controlled tick rate
let lastTime = 0;
function gameLoop(timestamp) {
    if (isGameOver || isPaused) return;

    if (timestamp - lastTime >= currentSpeed) {
        update();
        lastTime = timestamp;
    }
    
    draw();
    gameLoopRef = requestAnimationFrame(gameLoop);
}

function update() {
    frameCount++;
    dx = nextDx;
    dy = nextDy;
    
    let head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Screen Wrap Logic (or Death, here let's do Screen Wrap but walls are dynamic obstacles)
    if (head.x < 0) head.x = TILE_COUNT - 1;
    if (head.x >= TILE_COUNT) head.x = 0;
    if (head.y < 0) head.y = TILE_COUNT - 1;
    if (head.y >= TILE_COUNT) head.y = 0;

    // Check Self Collision
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y && activePowerUp !== 'shield') {
            triggerGameOver();
            return;
        }
    }
    
    // Check Obstacle Collision
    for (let obs of obstacles) {
        if (head.x === obs.x && head.y === obs.y && activePowerUp !== 'shield') {
            triggerGameOver();
            return;
        }
    }

    snake.unshift(head); // Add new head

    // Food Collision
    if (head.x === food.x && head.y === food.y) {
        SoundEngine.playEatSound();
        let points = activePowerUp === '2x' ? 2 : 1;
        score += points;
        updateScoreBoard();
        spawnFood();
        
        // Maybe spawn powerups/obstacles randomly
        if(Math.random() < 0.2) spawnObstacle();
        if(Math.random() < 0.1) spawnPowerUp();
        
        checkLevelUp();
    } else {
        snake.pop(); // Remove tail if no food eaten
    }
    
    // PowerUp Collision
    if (powerUpObject && head.x === powerUpObject.x && head.y === powerUpObject.y) {
        SoundEngine.playPowerUpSound();
        activePowerUp = powerUpObject.type;
        powerUpTimer = 50; // Active for 50 ticks
        powerUpObject = null;
        applyPowerUp();
    }
    
    updatePowerUp();
    updateObstacles();
}

function applyPowerUp() {
    if (activePowerUp === 'slow') {
        currentSpeed = baseSpeed * 1.5;
    } else {
        currentSpeed = baseSpeed;
    }
}

function updatePowerUp() {
    if (powerUpTimer > 0) {
        powerUpTimer--;
        if (powerUpTimer <= 0) {
            activePowerUp = null;
            currentSpeed = baseSpeed; // reset speed
        }
    }
    
    // age powerUp on map
    if (powerUpObject) {
        powerUpObject.age++;
        if (powerUpObject.age > 100) {
             powerUpObject = null; // disappears after 100 ticks
        }
    }
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].life--;
        if (obstacles[i].life <= 0) {
            obstacles.splice(i, 1);
        }
    }
}

function checkLevelUp() {
    if (score > 0 && score % 10 === 0) {
        level++;
        baseSpeed = Math.max(30, baseSpeed - 5); // Increase speed per level slightly
        currentSpeed = baseSpeed;
        UI.level.innerText = level;
        SoundEngine.playLevelUpSound();
        
        // Show Mutation Screen
        isPaused = true;
        showMutationScreen();
    }
}

function triggerGameOver() {
    isGameOver = true;
    SoundEngine.playDieSound();
    
    // Screen Shake via CSS
    document.body.classList.add('shake');
    setTimeout(() => {
        document.body.classList.remove('shake');
    }, 300);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('neonSnakeHighScore', highScore);
        UI.highScore.innerText = highScore;
    }
    
    UI.finalScore.innerText = score;
    UI.gameOver.classList.remove('hidden');
}

function updateScoreBoard() {
    UI.score.innerText = score;
}

// Rendering
function draw() {
    // Clear bg with slight trailing effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Obstacles
    obstacles.forEach(obs => {
        drawCell(obs.x, obs.y, '#ff003c', '#ff003c', true, 10);
    });
    
    // Draw Powerup
    if (powerUpObject) {
        let color = powerUpObject.type === 'shield' ? '#0ff' : 
                   (powerUpObject.type === '2x' ? '#ff0' : '#f0f');
        if (frameCount % 2 === 0) { // Blink effect
            drawCell(powerUpObject.x, powerUpObject.y, color, color, true, 15);
        }
    }

    // Draw Food
    drawCell(food.x, food.y, '#b026ff', '#b026ff', true, 20);

    // Draw Snake
    let snakeColor = activePowerUp === 'shield' ? '#0ff' : '#0f0';
    snake.forEach((part, index) => {
        let alpha = 1 - (index / snake.length) * 0.5;
        ctx.globalAlpha = alpha;
        
        if (index === 0) {
            // Head is brighter
            drawCell(part.x, part.y, snakeColor, snakeColor, true, 20);
        } else {
            drawCell(part.x, part.y, snakeColor, snakeColor, false);
        }
        ctx.globalAlpha = 1.0;
    });
}

function drawCell(x, y, color, shadowColor, shadow = false, blur = 10) {
    ctx.fillStyle = color;
    if (shadow) {
        ctx.shadowBlur = blur;
        ctx.shadowColor = shadowColor;
    } else {
        ctx.shadowBlur = 0;
    }
    // slightly smaller than grid size for margins
    ctx.fillRect(x * GRID_SIZE + 1, y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    ctx.shadowBlur = 0; // reset
}

// Input Handling
function changeDirection(newDx, newDy) {
    // Prevent 180-degree turns
    if (newDx !== 0 && dx === -newDx) return;
    if (newDy !== 0 && dy === -newDy) return;
    
    // Cannot change direction if already stationary (game not started yet) unless dx/dy tracking allows
    nextDx = newDx;
    nextDy = newDy;
}

window.addEventListener('keydown', e => {
    if (isGameOver) return;
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            changeDirection(0, -1); break;
        case 'ArrowDown':
        case 's':
        case 'S':
            changeDirection(0, 1); break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            changeDirection(-1, 0); break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            changeDirection(1, 0); break;
    }
});

// Touch / Mobile Controls
document.getElementById('dpad-up').addEventListener('pointerdown', () => changeDirection(0, -1));
document.getElementById('dpad-down').addEventListener('pointerdown', () => changeDirection(0, 1));
document.getElementById('dpad-left').addEventListener('pointerdown', () => changeDirection(-1, 0));
document.getElementById('dpad-right').addEventListener('pointerdown', () => changeDirection(1, 0));

// Swipe mechanics for mobile
let touchStartX = 0;
let touchStartY = 0;
canvas.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, {passive:true});

canvas.addEventListener('touchend', e => {
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
}, {passive:true});

function handleSwipe(startX, startY, endX, endY) {
    const diffX = endX - startX;
    const diffY = endY - startY;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 30) {
            changeDirection(diffX > 0 ? 1 : -1, 0);
        }
    } else {
        if (Math.abs(diffY) > 30) {
            changeDirection(0, diffY > 0 ? 1 : -1);
        }
    }
}

// Mutation System Setup
const mutations = [
    { title: "Speed+", desc: "Increase base speed by 10%", apply: () => { baseSpeed *= 0.9; } },
    { title: "Slow Start", desc: "Decrease base speed by 10%", apply: () => { baseSpeed *= 1.1; } },
    { title: "Shorter Tail", desc: "Lose 3 segments", apply: () => { 
        if (snake.length > 3) {
            // we do this safely
            let diff = Math.min(3, snake.length - 1);
            for(let i=0; i<diff; i++) snake.pop(); 
        } 
    } },
    { title: "Points+", desc: "Instant +5 Score", apply: () => { score+=5; updateScoreBoard(); } }
];

function showMutationScreen() {
    UI.mutation.classList.remove('hidden');
    
    // Pick two random mutations
    let options = [];
    let pot = [...mutations];
    for (let i = 0; i < 2; i++) {
        let idx = Math.floor(Math.random() * pot.length);
        options.push(pot.splice(idx, 1)[0]);
    }
    
    // Bind to UI
    for (let i = 0; i < 2; i++) {
        document.getElementById(`mut${i+1}-title`).innerText = options[i].title;
        document.getElementById(`mut${i+1}-desc`).innerText = options[i].desc;
        
        let card = document.getElementById(`mutation-${i+1}`);
        // Remove old event listeners by cloning
        let newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        newCard.addEventListener('click', () => {
            options[i].apply();
            UI.mutation.classList.add('hidden');
            isPaused = false;
            lastTime = performance.now(); // reset time to prevent instant tick jump
            requestAnimationFrame(gameLoop);
        });
    }
}

// Button Events
UI.startBtn.addEventListener('click', initGame);
UI.restartBtn.addEventListener('click', initGame);

// Start Screen Initial Draw Background
draw();

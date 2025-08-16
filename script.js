// Vibe Coding Game - Main JavaScript File

// DOM elements
const startBtn = document.getElementById('start-btn');
const app = document.getElementById('app');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game state
let gameStarted = false;
let animationId = null;
let currentScale = 1;

// Game constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;
const GRAVITY = 0.8;
const GROUND_Y = CANVAS_HEIGHT - 30; // Ground level (canvas height - ground thickness)
const PLAYER_SPEED = 5;
const JUMP_FORCE = -15;

// Player object
const player = {
    x: 100,
    y: 100,
    width: 30,
    height: 30,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    color: '#FF6B6B'
};

// Input state
const keys = {
    a: false,
    d: false,
    w: false
};

// Calculate the best integer scale factor for the current window size
function calculateScale() {
    const margin = 40; // Leave some margin around the canvas
    const maxWidth = window.innerWidth - margin;
    const maxHeight = window.innerHeight - margin;
    
    const scaleX = Math.floor(maxWidth / CANVAS_WIDTH);
    const scaleY = Math.floor(maxHeight / CANVAS_HEIGHT);
    
    // Use the smaller scale factor to ensure it fits in both dimensions
    return Math.max(1, Math.min(scaleX, scaleY));
}

// Apply scaling to the canvas
function applyCanvasScale() {
    const scale = calculateScale();
    currentScale = scale;
    
    const scaledWidth = CANVAS_WIDTH * scale;
    const scaledHeight = CANVAS_HEIGHT * scale;
    
    canvas.style.width = scaledWidth + 'px';
    canvas.style.height = scaledHeight + 'px';
    
    console.log(`Canvas scaled to ${scale}x (${scaledWidth}×${scaledHeight})`);
}

// Initialize the game
function init() {
    console.log('Vibe Coding Game initialized!');
    
    // Add event listeners
    startBtn.addEventListener('click', startGame);
    setupKeyboardControls();
    
    // Add window resize handler
    window.addEventListener('resize', () => {
        if (gameStarted) {
            applyCanvasScale();
        }
    });
}

// Setup keyboard event listeners
function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key in keys) {
            keys[key] = true;
            e.preventDefault();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (key in keys) {
            keys[key] = false;
            e.preventDefault();
        }
    });
}

// Start the game
function startGame() {
    if (gameStarted) return;
    
    gameStarted = true;
    console.log('Game started!');
    
    // Update UI - enter game mode
    startBtn.textContent = 'Game Running...';
    startBtn.disabled = true;
    startBtn.style.display = 'none';
    document.body.classList.add('game-mode');
    app.classList.add('game-mode');
    canvas.style.display = 'block';
    
    // Apply integer scaling
    applyCanvasScale();
    
    // Start game loop
    gameLoop();
}

// Main game loop
function gameLoop() {
    if (!gameStarted) return;
    
    // Update game state
    updatePlayer();
    
    // Render everything
    render();
    
    // Continue the loop
    animationId = requestAnimationFrame(gameLoop);
}

// Update player physics and movement
function updatePlayer() {
    // Handle horizontal movement
    if (keys.a) {
        player.velocityX = -PLAYER_SPEED;
    } else if (keys.d) {
        player.velocityX = PLAYER_SPEED;
    } else {
        player.velocityX = 0;
    }
    
    // Handle jumping
    if (keys.w && player.onGround) {
        player.velocityY = JUMP_FORCE;
        player.onGround = false;
    }
    
    // Apply gravity
    if (!player.onGround) {
        player.velocityY += GRAVITY;
    }
    
    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Keep player within horizontal bounds
    if (player.x < 0) {
        player.x = 0;
    } else if (player.x + player.width > CANVAS_WIDTH) {
        player.x = CANVAS_WIDTH - player.width;
    }
    
    // Ground collision
    if (player.y + player.height >= GROUND_Y) {
        player.y = GROUND_Y - player.height;
        player.velocityY = 0;
        player.onGround = true;
    } else {
        player.onGround = false;
    }
    
    // Prevent falling off bottom (safety check)
    if (player.y > CANVAS_HEIGHT) {
        player.y = 100;
        player.x = 100;
        player.velocityY = 0;
    }
}

// Render the game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw ground
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player border for better visibility
    ctx.strokeStyle = '#D63031';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
    
    // Draw controls instructions
    ctx.fillStyle = '#2D3436';
    ctx.font = '16px Arial';
    ctx.fillText('Controls: A (left), D (right), W (jump)', 10, 30);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);


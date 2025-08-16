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
let currentWorld = 'light'; // Current active world: 'light' or 'dark'
let platforms = []; // Array of platform objects

// Game constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;
const GRAVITY = 0.8;
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
    w: false,
    space: false
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

// Load test platforms for development
function loadTestPlatforms() {
    platforms = [
        // Wide ground platform (both worlds)
        { id: 'ground', x: 0, y: 320, width: 640, height: 40, world: 'both' },
        // Light world platform (mid-height)
        { id: 'light-platform', x: 120, y: 260, width: 140, height: 12, world: 'light' },
        // Dark world platform (mid-height)
        { id: 'dark-platform', x: 360, y: 220, width: 140, height: 12, world: 'dark' },
        // Additional test platforms
        { id: 'light-upper', x: 50, y: 180, width: 100, height: 12, world: 'light' },
        { id: 'dark-upper', x: 490, y: 160, width: 100, height: 12, world: 'dark' }
    ];
    console.log('Test platforms loaded:', platforms.length);
}

// Get platforms that are active in the current world
function getActivePlatforms() {
    return platforms.filter(platform => 
        platform.world === 'both' || platform.world === currentWorld
    );
}

// Check if two rectangles overlap
function rectanglesOverlap(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Resolve horizontal collision with platforms
function resolveHorizontalCollision(newX, activePlatforms) {
    const playerRect = {
        x: newX,
        y: player.y,
        width: player.width,
        height: player.height
    };
    
    for (const platform of activePlatforms) {
        if (rectanglesOverlap(playerRect, platform)) {
            // Moving right, hit left side of platform
            if (player.velocityX > 0) {
                player.x = platform.x - player.width;
                player.velocityX = 0;
                return player.x;
            }
            // Moving left, hit right side of platform
            else if (player.velocityX < 0) {
                player.x = platform.x + platform.width;
                player.velocityX = 0;
                return player.x;
            }
        }
    }
    
    return newX; // No collision, use new position
}

// Resolve vertical collision with platforms
function resolveVerticalCollision(newY, activePlatforms) {
    const playerRect = {
        x: player.x,
        y: newY,
        width: player.width,
        height: player.height
    };
    
    for (const platform of activePlatforms) {
        if (rectanglesOverlap(playerRect, platform)) {
            // Moving down, landing on top of platform
            if (player.velocityY > 0) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.onGround = true;
                return player.y;
            }
            // Moving up, hitting bottom of platform (head bump)
            else if (player.velocityY < 0) {
                player.y = platform.y + platform.height;
                player.velocityY = 0;
                return player.y;
            }
        }
    }
    
    return newY; // No collision, use new position
}

// Switch between light and dark worlds (temporary for testing)
function switchWorld() {
    currentWorld = currentWorld === 'light' ? 'dark' : 'light';
    console.log('Switched to:', currentWorld);
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
    
    // Load test platforms
    loadTestPlatforms();
    
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

// Update player physics and movement with platform collision
function updatePlayer() {
    // Handle horizontal movement input
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
    
    // Handle world switching (temporary - for testing)
    if (keys.space) {
        switchWorld();
        keys.space = false; // Prevent rapid switching
    }
    
    // Apply gravity
    player.velocityY += GRAVITY;
    
    // Get active platforms for collision detection
    const activePlatforms = getActivePlatforms();
    
    // Reset ground state (will be set to true if landing on platform)
    player.onGround = false;
    
    // TWO-PASS COLLISION RESOLUTION:
    
    // 1) Horizontal pass: move horizontally and resolve collisions
    const newX = player.x + player.velocityX;
    
    // Keep player within horizontal bounds
    let clampedX = Math.max(0, Math.min(newX, CANVAS_WIDTH - player.width));
    if (clampedX !== newX) {
        player.velocityX = 0; // Hit screen boundary
    }
    
    // Resolve horizontal platform collisions
    player.x = resolveHorizontalCollision(clampedX, activePlatforms);
    
    // 2) Vertical pass: move vertically and resolve collisions
    const newY = player.y + player.velocityY;
    
    // Resolve vertical platform collisions
    player.y = resolveVerticalCollision(newY, activePlatforms);
    
    // Safety check: prevent falling off bottom of screen
    if (player.y > CANVAS_HEIGHT) {
        player.y = 100;
        player.x = 100;
        player.velocityY = 0;
        player.onGround = false;
    }
}

// Render the game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw platforms
    renderPlatforms();
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player border for better visibility
    ctx.strokeStyle = '#D63031';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
    
    // Draw controls and world info
    ctx.fillStyle = '#2D3436';
    ctx.font = '16px Arial';
    ctx.fillText('Controls: A (left), D (right), W (jump)', 10, 30);
    ctx.fillText(`Current World: ${currentWorld} (SPACE to switch)`, 10, 50);
}

// Render platforms based on current world
function renderPlatforms() {
    const activePlatforms = getActivePlatforms();
    
    for (const platform of activePlatforms) {
        // Set color based on world type
        switch (platform.world) {
            case 'both':
                ctx.fillStyle = '#808080'; // Neutral gray
                break;
            case 'light':
                ctx.fillStyle = '#E6D56E'; // Warm yellowish
                break;
            case 'dark':
                ctx.fillStyle = '#8E7BB8'; // Cool purplish
                break;
            default:
                ctx.fillStyle = '#CCCCCC'; // Fallback gray
        }
        
        // Draw platform
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Draw platform border for clarity
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);


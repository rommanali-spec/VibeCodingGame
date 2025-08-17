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
let movers = []; // Array of moving platform objects

// Frame timing for smooth mover motion
let lastFrameTime = 0;

// World swapping state
let lastSwapTime = 0;
let spaceKeyPressed = false; // Track Space key state for edge detection

// Swap failed message state
let swapFailedMessage = {
    visible: false,
    hideTime: 0
};

// Physics debug state
let physicsDebug = {
    standingOnMover: null,
    moverDx: 0,
    moverDy: 0,
    pushedByMoverThisFrame: false
};

// Game constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;
const GRAVITY_LIGHT = 0.8;
const GRAVITY_DARK = 0.6; // Reduced gravity in dark world (75% of light)
const PLAYER_SPEED = 5;
const JUMP_FORCE = -15;
const SWAP_COOLDOWN_MS = 500;
const COLLISION_EPS = 0.001; // Numerical stability epsilon
const GROUND_STICK_EPS = 2; // Ground stick epsilon in pixels

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

// Add test moving platforms for development
function addTestMovers() {
    movers = [
        // Horizontal mover (both worlds) - travels under mid-height area
        {
            id: 'horizontal-both',
            x: 200, y: 280, w: 80, h: 12,
            world: 'both',
            axis: 'horizontal',
            speed: 60, // pixels per second
            from: { x: 200, y: 280 },
            to: { x: 360, y: 280 },
            _prevX: 200, _prevY: 280,
            _dir: 1
        },
        
        // Vertical mover (light world) - tests vertical carry and head-bumps
        {
            id: 'vertical-light',
            x: 480, y: 200, w: 60, h: 12,
            world: 'light',
            axis: 'vertical',
            speed: 40, // pixels per second
            from: { x: 480, y: 200 },
            to: { x: 480, y: 280 },
            _prevX: 480, _prevY: 200,
            _dir: 1
        },
        
        // Vertical mover (dark world) - alternate for dark world testing
        {
            id: 'vertical-dark',
            x: 100, y: 140, w: 60, h: 12,
            world: 'dark',
            axis: 'vertical',
            speed: 50, // pixels per second
            from: { x: 100, y: 140 },
            to: { x: 100, y: 200 },
            _prevX: 100, _prevY: 140,
            _dir: 1
        }
    ];
    console.log('Test movers loaded:', movers.length);
}



// Update moving platforms with ping-pong motion
function updateMovers(dt) {
    for (const mover of movers) {
        // Store previous position for delta calculation
        mover._prevX = mover.x;
        mover._prevY = mover.y;
        
        // Calculate movement distance this frame
        const distanceThisFrame = mover.speed * dt;
        
        if (mover.axis === 'horizontal') {
            // Move horizontally
            const targetX = mover.x + (distanceThisFrame * mover._dir);
            
            // Check for endpoint collision and ping-pong
            if (mover._dir > 0 && targetX >= mover.to.x) {
                // Hit right endpoint
                mover.x = mover.to.x;
                mover._dir = -1;
            } else if (mover._dir < 0 && targetX <= mover.from.x) {
                // Hit left endpoint
                mover.x = mover.from.x;
                mover._dir = 1;
            } else {
                // Normal movement
                mover.x = targetX;
            }
        } else if (mover.axis === 'vertical') {
            // Move vertically
            const targetY = mover.y + (distanceThisFrame * mover._dir);
            
            // Check for endpoint collision and ping-pong
            if (mover._dir > 0 && targetY >= mover.to.y) {
                // Hit bottom endpoint
                mover.y = mover.to.y;
                mover._dir = -1;
            } else if (mover._dir < 0 && targetY <= mover.from.y) {
                // Hit top endpoint
                mover.y = mover.from.y;
                mover._dir = 1;
            } else {
                // Normal movement
                mover.y = targetY;
            }
        }
    }
}

// Check if two rectangles overlap
function rectanglesOverlap(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Resolve horizontal collision with all solids (platforms + movers)
function resolveHorizontalCollision(newX, activeSolids) {
    const playerRect = {
        x: newX,
        y: player.y,
        width: player.width,
        height: player.height
    };
    
    for (const solid of activeSolids) {
        if (rectanglesOverlap(playerRect, solid)) {
            // Moving right, hit left side of solid
            if (player.velocityX > 0) {
                player.x = solid.x - player.width;
                player.velocityX = 0;
                return player.x;
            }
            // Moving left, hit right side of solid
            else if (player.velocityX < 0) {
                player.x = solid.x + solid.width;
                player.velocityX = 0;
                return player.x;
            }
        }
    }
    
    return newX; // No collision, use new position
}

// Resolve vertical collision with all solids (platforms + movers)
// Returns { y: finalY, standingOnMover: moverSolidOrNull }
function resolveVerticalCollision(newY, activeSolids) {
    const epsilon = 2; // Small tolerance for landing detection
    const playerRect = {
        x: player.x,
        y: newY,
        width: player.width,
        height: player.height
    };
    
    let standingOnMover = null;
    
    for (const solid of activeSolids) {
        if (rectanglesOverlap(playerRect, solid)) {
            // Moving down, landing on top of solid
            if (player.velocityY > 0) {
                const landingY = solid.y - player.height;
                player.y = landingY;
                player.velocityY = 0;
                player.onGround = true;
                
                // Check if we're standing on a mover (with small epsilon for float precision)
                const playerFeetY = landingY + player.height;
                if (Math.abs(solid.y - playerFeetY) <= epsilon && solid._isMover) {
                    standingOnMover = solid;
                }
                
                return { y: player.y, standingOnMover };
            }
            // Moving up, hitting bottom of solid (head bump)
            else if (player.velocityY < 0) {
                player.y = solid.y + solid.height;
                player.velocityY = 0;
                return { y: player.y, standingOnMover: null };
            }
        }
    }
    
    return { y: newY, standingOnMover: null }; // No collision, use new position
}

// KINEMATIC-PUSH PHASE: Handle movers pushing INTO the player
function applyKinematicPush() {
    physicsDebug.pushedByMoverThisFrame = false;
    
    const activeSolids = getActiveSolidsForWorld(currentWorld);
    const activeMovers = activeSolids.filter(solid => solid._isMover);
    
    for (const mover of activeMovers) {
        const moverRef = mover._moverRef;
        const dx = mover._moverDx;
        const dy = mover._moverDy;
        
        // Skip if mover didn't move this frame
        if (Math.abs(dx) < COLLISION_EPS && Math.abs(dy) < COLLISION_EPS) continue;
        
        // Current mover AABB
        const currentMoverAABB = {
            x: mover.x,
            y: mover.y,
            width: mover.width,
            height: mover.height
        };
        
        // Previous mover AABB
        const prevMoverAABB = {
            x: mover.x - dx,
            y: mover.y - dy,
            width: mover.width,
            height: mover.height
        };
        
        const playerAABB = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        // Check if mover now overlaps player but didn't before (kinematic push case)
        const nowOverlaps = rectanglesOverlap(currentMoverAABB, playerAABB);
        const prevOverlaps = rectanglesOverlap(prevMoverAABB, playerAABB);
        
        if (nowOverlaps && !prevOverlaps) {
            physicsDebug.pushedByMoverThisFrame = true;
            
            // Horizontal push
            if (Math.abs(dx) > COLLISION_EPS) {
                const pushDirection = dx > 0 ? 1 : -1;
                const pushDistance = Math.abs(dx) + 1; // Push slightly more than mover moved
                
                // Sweep player by push distance using horizontal collision resolution
                const targetX = player.x + (pushDistance * pushDirection);
                player.x = sweepHorizontal(player.x, targetX, activeSolids);
            }
            
            // Vertical push
            if (Math.abs(dy) > COLLISION_EPS) {
                const pushDirection = dy > 0 ? 1 : -1;
                const pushDistance = Math.abs(dy) + 1; // Push slightly more than mover moved
                
                // Sweep player by push distance using vertical collision resolution
                const targetY = player.y + (pushDistance * pushDirection);
                player.y = sweepVertical(player.y, targetY, activeSolids);
            }
        }
    }
}

// Horizontal sweep with collision resolution (for kinematic push and carry)
function sweepHorizontal(startX, targetX, activeSolids) {
    const playerRect = {
        x: targetX,
        y: player.y,
        width: player.width,
        height: player.height
    };
    
    // Clamp to screen bounds
    let clampedX = Math.max(0, Math.min(targetX, CANVAS_WIDTH - player.width));
    
    // Check collisions
    for (const solid of activeSolids) {
        const testRect = { ...playerRect, x: clampedX };
        if (rectanglesOverlap(testRect, solid)) {
            // Moving right, hit left side
            if (targetX > startX) {
                clampedX = Math.min(clampedX, solid.x - player.width);
            }
            // Moving left, hit right side
            else if (targetX < startX) {
                clampedX = Math.max(clampedX, solid.x + solid.width);
            }
        }
    }
    
    return clampedX;
}

// Vertical sweep with collision resolution (for kinematic push and carry)
function sweepVertical(startY, targetY, activeSolids) {
    const playerRect = {
        x: player.x,
        y: targetY,
        width: player.width,
        height: player.height
    };
    
    let finalY = targetY;
    
    // Check collisions
    for (const solid of activeSolids) {
        if (rectanglesOverlap(playerRect, solid)) {
            // Moving down, hit top
            if (targetY > startY) {
                finalY = Math.min(finalY, solid.y - player.height);
            }
            // Moving up, hit bottom
            else if (targetY < startY) {
                finalY = Math.max(finalY, solid.y + solid.height);
            }
        }
    }
    
    return finalY;
}

// GROUND STICK EPSILON: Prevent kick-off on vertical movers when pressing A/D
function applyGroundStickEpsilon() {
    if (player.onGround) return; // Already grounded
    
    const activeSolids = getActiveSolidsForWorld(currentWorld);
    const playerFeetY = player.y + player.height;
    
    // Look for solid surfaces within epsilon distance below player's feet
    for (const solid of activeSolids) {
        const solidTopY = solid.y;
        const distanceToSurface = solidTopY - playerFeetY;
        
        // Check if we're close above a surface and horizontally aligned
        if (distanceToSurface > 0 && distanceToSurface <= GROUND_STICK_EPS) {
            // Check horizontal overlap
            if (player.x < solid.x + solid.width && player.x + player.width > solid.x) {
                // Snap down to surface
                player.y = solid.y - player.height;
                player.onGround = true;
                return;
            }
        }
    }
}

// COLLISION-AWARE CARRY: Apply mover deltas through collision system
function applyCollisionAwareCarry(standingOnMover) {
    if (!standingOnMover || !standingOnMover._isMover) {
        physicsDebug.standingOnMover = null;
        physicsDebug.moverDx = 0;
        physicsDebug.moverDy = 0;
        return;
    }
    
    const dx = standingOnMover._moverDx;
    const dy = standingOnMover._moverDy;
    
    physicsDebug.standingOnMover = standingOnMover.id;
    physicsDebug.moverDx = dx;
    physicsDebug.moverDy = dy;
    
    const activeSolids = getActiveSolidsForWorld(currentWorld);
    
    // Horizontal carry through collision system
    if (Math.abs(dx) > COLLISION_EPS) {
        const targetX = player.x + dx;
        player.x = sweepHorizontal(player.x, targetX, activeSolids);
    }
    
    // Vertical carry through collision system
    if (Math.abs(dy) > COLLISION_EPS) {
        const targetY = player.y + dy;
        const newY = sweepVertical(player.y, targetY, activeSolids);
        
        // If moving up and hit ceiling, lose ground contact
        if (dy < 0 && newY > targetY) {
            player.onGround = false;
            physicsDebug.standingOnMover = null;
        }
        
        player.y = newY;
    }
}

// Core world swapping function with safe-swap check
function swapWorld() {
    // Determine target world
    const targetWorld = currentWorld === 'light' ? 'dark' : 'light';
    
    // Check if swap would be safe (no overlap with solid objects)
    if (!canSwapToWorld(targetWorld)) {
        // Swap would cause overlap - show failed message and abort
        showSwapFailedMessage();
        console.log('Swap failed - would overlap with solid object');
        return false; // Swap failed
    }
    
    // Safe to swap - toggle world
    currentWorld = targetWorld;
    
    // Record swap time for cooldown (only on successful swap)
    lastSwapTime = Date.now();
    
    console.log('Swapped to:', currentWorld);
    return true; // Swap succeeded
}

// Check if world swapping is available (not in cooldown)
function canSwapWorld() {
    const timeSinceLastSwap = Date.now() - lastSwapTime;
    return timeSinceLastSwap >= SWAP_COOLDOWN_MS;
}

// Get remaining cooldown time in ms
function getSwapCooldownRemaining() {
    const timeSinceLastSwap = Date.now() - lastSwapTime;
    return Math.max(0, SWAP_COOLDOWN_MS - timeSinceLastSwap);
}

// Get current world's gravity value
function getCurrentGravity() {
    return currentWorld === 'light' ? GRAVITY_LIGHT : GRAVITY_DARK;
}

// SINGLE SOURCE OF TRUTH: Get all solid AABBs for collision and safe-swap checks
// Returns unified array of platforms + movers with consistent x,y,width,height format
// This is the ONLY function that should be used for collision detection and safe-swap checks
function getActiveSolidsForWorld(world) {
    const solids = [];
    
    // Add static platforms (already in correct x,y,width,height format)
    const activePlatforms = platforms.filter(platform => 
        platform.world === 'both' || platform.world === world
    );
    
    for (const platform of activePlatforms) {
        solids.push({
            id: platform.id,
            x: platform.x,
            y: platform.y,
            width: platform.width,
            height: platform.height,
            world: platform.world,
            _isStatic: true
        });
    }
    
    // Add active movers (convert w,h to width,height for consistency)
    const activeMovers = movers.filter(mover => 
        mover.world === 'both' || mover.world === world
    );
    
    for (const mover of activeMovers) {
        // Calculate mover delta for carrying (from previous frame position)
        const dx = mover.x - (mover._prevX || mover.x);
        const dy = mover.y - (mover._prevY || mover.y);
        
        solids.push({
            id: mover.id,
            x: mover.x,
            y: mover.y,
            width: mover.w,
            height: mover.h,
            world: mover.world,
            _isMover: true,
            _moverRef: mover,
            _moverDx: dx,
            _moverDy: dy
        });
    }
    
    return solids;
}

// Check if player can safely swap to target world (no overlap with solid objects)
function canSwapToWorld(targetWorld) {
    // Get player's current rectangle
    const playerRect = {
        x: player.x,
        y: player.y,
        width: player.width,
        height: player.height
    };
    
    // Get all solid objects that would be active in target world
    const solidObjects = getActiveSolidsForWorld(targetWorld);
    
    // Check for overlaps (not just touching at edges)
    for (const solid of solidObjects) {
        if (rectanglesOverlap(playerRect, solid)) {
            return false; // Overlap found - swap would be unsafe
        }
    }
    
    return true; // No overlaps - swap is safe
}

// Show "Swap Failed" message
function showSwapFailedMessage() {
    swapFailedMessage.visible = true;
    swapFailedMessage.hideTime = Date.now() + 1000; // Hide after 1000ms
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
        
        // Handle Space key for world swapping (edge detection)
        if (e.code === 'Space') {
            if (!spaceKeyPressed && canSwapWorld()) {
                swapWorld();
            }
            spaceKeyPressed = true;
            e.preventDefault();
            return;
        }
        
        // Handle movement keys
        if (key in keys) {
            keys[key] = true;
            e.preventDefault();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        
        // Handle Space key release
        if (e.code === 'Space') {
            spaceKeyPressed = false;
            e.preventDefault();
            return;
        }
        
        // Handle movement key releases
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
    
    // Load test platforms and movers
    loadTestPlatforms();
    addTestMovers();
    
    // Initialize frame timing
    lastFrameTime = performance.now();
    
    // Start game loop
    gameLoop();
}

// Main game loop
function gameLoop() {
    if (!gameStarted) return;
    
    // Calculate frame delta time
    const currentTime = performance.now();
    const dt = Math.min((currentTime - lastFrameTime) / 1000, 1/30); // Cap at 30fps minimum
    lastFrameTime = currentTime;
    
    // 1) UPDATE MOVERS FIRST: Update to new positions and store mover.dx, mover.dy
    updateMovers(dt);
    
    // 2) KINEMATIC-PUSH PHASE: Handle movers pushing INTO the player
    applyKinematicPush();
    
    // 3-6) Player physics with strict collision order
    updatePlayer();
    
    // Render everything
    render();
    
    // Continue the loop
    animationId = requestAnimationFrame(gameLoop);
}

// UPDATED PLAYER PHYSICS: Strict order implementation  
// 2) KINEMATIC-PUSH PHASE - already called from game loop
// 3) Read input and integrate player velocities
// 4) Player collision passes against ACTIVE solids
// 5) Ground stick epsilon
// 6) Collision-aware carry
function updatePlayer() {
    // 3) READ INPUT AND INTEGRATE VELOCITIES
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
    
    // Apply gravity (world-specific)
    player.velocityY += getCurrentGravity();
    
    // Get all active solids (platforms + movers) for collision detection
    const activeSolids = getActiveSolidsForWorld(currentWorld);
    
    // Reset ground state (will be set to true if landing on solid)
    player.onGround = false;
    
    // 4) PLAYER COLLISION PASSES AGAINST ACTIVE SOLIDS:
    
    // 4.1) HORIZONTAL collision pass
    const newX = player.x + player.velocityX;
    
    // Keep player within horizontal bounds
    let clampedX = Math.max(0, Math.min(newX, CANVAS_WIDTH - player.width));
    if (clampedX !== newX) {
        player.velocityX = 0; // Hit screen boundary
    }
    
    // Resolve horizontal collisions (includes movers)
    player.x = resolveHorizontalCollision(clampedX, activeSolids);
    
    // 5) GROUND STICK EPSILON: Apply after horizontal pass, before vertical
    applyGroundStickEpsilon();
    
    // 4.2) VERTICAL collision pass
    const newY = player.y + player.velocityY;
    
    // Resolve vertical collisions and detect mover standing
    const verticalResult = resolveVerticalCollision(newY, activeSolids);
    player.y = verticalResult.y;
    const standingOnMover = verticalResult.standingOnMover;
    
    // 6) COLLISION-AWARE CARRY: Apply mover deltas through collision system
    applyCollisionAwareCarry(standingOnMover);
    
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
    
    // Draw moving platforms
    renderMovers();
    
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
    ctx.fillText('Controls: A (left), D (right), W (jump), SPACE (swap world)', 10, 30);
    
    // Developer debug overlay
    renderDebugOverlay();
    
    // Render swap failed message if visible
    renderSwapFailedMessage();
}

// Render platforms based on current world
function renderPlatforms() {
    const activeSolids = getActiveSolidsForWorld(currentWorld);
    const activePlatforms = activeSolids.filter(solid => solid._isStatic);
    
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

// Render moving platforms based on current world
function renderMovers() {
    const activeSolids = getActiveSolidsForWorld(currentWorld);
    const activeMovers = activeSolids.filter(solid => solid._isMover);
    
    for (const mover of activeMovers) {
        const moverRef = mover._moverRef;
        
        // Set color based on world type (distinct from static platforms)
        // Use semi-transparent fills to show they're solid colliders
        switch (mover.world) {
            case 'both':
                ctx.fillStyle = 'rgba(102, 102, 102, 0.8)'; // Mid-gray with transparency
                break;
            case 'light':
                ctx.fillStyle = 'rgba(212, 182, 54, 0.8)'; // Warm golden with transparency
                break;
            case 'dark':
                ctx.fillStyle = 'rgba(123, 104, 163, 0.8)'; // Cool purple with transparency
                break;
            default:
                ctx.fillStyle = 'rgba(153, 153, 153, 0.8)'; // Fallback gray
        }
        
        // Draw mover as filled rectangle (not just outline)
        ctx.fillRect(mover.x, mover.y, mover.width, mover.height);
        
        // Draw mover border for clarity
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 2;
        ctx.strokeRect(mover.x, mover.y, mover.width, mover.height);
        
        // Draw movement path (debug visualization)
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        if (moverRef.axis === 'horizontal') {
            // Draw horizontal path line
            const y = moverRef.from.y + moverRef.h / 2;
            ctx.beginPath();
            ctx.moveTo(moverRef.from.x, y);
            ctx.lineTo(moverRef.to.x + moverRef.w, y);
            ctx.stroke();
        } else if (moverRef.axis === 'vertical') {
            // Draw vertical path line
            const x = moverRef.from.x + moverRef.w / 2;
            ctx.beginPath();
            ctx.moveTo(x, moverRef.from.y);
            ctx.lineTo(x, moverRef.to.y + moverRef.h);
            ctx.stroke();
        }
        
        ctx.setLineDash([]); // Reset line dash
    }
}

// Developer debug overlay (temporary for testing)
function renderDebugOverlay() {
    ctx.fillStyle = '#2D3436';
    ctx.font = '14px Arial';
    
    // Current world
    ctx.fillText(`World: ${currentWorld}`, 10, 80);
    
    // Cooldown status
    const cooldownRemaining = getSwapCooldownRemaining();
    if (cooldownRemaining > 0) {
        ctx.fillText(`Swap CD: ${cooldownRemaining}ms`, 10, 100);
    } else {
        ctx.fillText('Swap CD: ready', 10, 100);
    }
    
    // Current gravity (for reference)
    const currentGrav = getCurrentGravity();
    ctx.fillText(`Gravity: ${currentGrav}`, 10, 120);
    
    // Solids count debug aid
    const activeSolids = getActiveSolidsForWorld(currentWorld);
    const moversCount = activeSolids.filter(solid => solid._isMover).length;
    const platformsCount = activeSolids.filter(solid => solid._isStatic).length;
    ctx.fillText(`Solids: ${activeSolids.length} (${platformsCount} platforms + ${moversCount} movers)`, 10, 140);
    
    // Physics debug aid: Push/carry state
    ctx.fillText(`Standing on: ${physicsDebug.standingOnMover || 'null'}`, 10, 160);
    if (physicsDebug.standingOnMover) {
        ctx.fillText(`Mover dx: ${physicsDebug.moverDx.toFixed(2)}, dy: ${physicsDebug.moverDy.toFixed(2)}`, 10, 180);
    }
    ctx.fillText(`Pushed this frame: ${physicsDebug.pushedByMoverThisFrame}`, 10, 200);
}

// Render "Swap Failed" message when visible
function renderSwapFailedMessage() {
    // Update message visibility based on time
    if (swapFailedMessage.visible && Date.now() >= swapFailedMessage.hideTime) {
        swapFailedMessage.visible = false;
    }
    
    // Render message if visible
    if (swapFailedMessage.visible) {
        ctx.fillStyle = '#FF4444';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        
        // Draw text with white outline for visibility
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.strokeText('Swap Failed', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        ctx.fillText('Swap Failed', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        // Reset text alignment
        ctx.textAlign = 'left';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);


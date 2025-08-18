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

// Level system arrays (populated from level data)
let platforms = [];
let movers = [];
let spikes = [];
let doors = [];

// Level management
let currentLevelIndex = 0;
let levelTimeMs = 0;
let levelStartMonotonic = 0;

// Run timer system
let levelRunMs = 0; // Accumulator for level run time (reset on load/reset, incremented each frame)
let levelBestMs = null; // Current level's best time (loaded from localStorage)

// Level completion state
let levelCompleting = false; // True when level completion sequence is active
let completionStartTime = 0; // When the completion sequence started
let completionMessage = ''; // Message to display during completion

// Countdown state
let countdownActive = false; // True when countdown is active
let countdownValue = 3; // Current countdown value (3, 2, 1)
let countdownStartTime = 0; // When the countdown started

// Camera system
let camera = { x: 0, y: 0 };

// Frame timing
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

// World-specific movement traits
const LIGHT_SPEED = 4;           // Light world horizontal speed (pixels per frame)
const DARK_SPEED = 3;            // Dark world horizontal speed (pixels per frame)
const LIGHT_GRAVITY = 0.8;       // Light world gravity
const DARK_GRAVITY = 0.6;        // Dark world gravity (75% of light gravity)

const JUMP_FORCE = -15;
const SWAP_COOLDOWN_MS = 500;
const COLLISION_EPS = 0.001; // Numerical stability epsilon
const GROUND_STICK_EPS = 2; // Ground stick epsilon in pixels

// Camera constants
const CAMERA_DEADZONE_WIDTH = 160; // Horizontal deadzone width in pixels
const CAMERA_SMOOTHING = 0.15; // Camera smoothing factor

// Debug flag
const DEBUG = false;

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
    r: false, // Reset level (debug)
    1: false, // Load level 1 (debug)
    2: false, // Load level 2 (debug)
    3: false  // Load level 3 (debug) - Wide Canyon Test
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
    

}

// LEVELMANAGER: Manages level loading, resetting, and completion
const LevelManager = {
    // Load a level by index
    load(index) {
        if (index < 0 || index >= LEVELS.length) {

            return;
        }
        
        const level = LEVELS[index];

        
        // Clear all runtime arrays
        platforms = [];
        movers = [];
        spikes = [];
        doors = [];
        
        // Set level state
        currentLevelIndex = index;
        levelTimeMs = 0;
        levelStartMonotonic = performance.now();
        
        // Initialize run timer for this level
        levelRunMs = 0;
        levelBestMs = loadBestTime(index); // Read best time from localStorage
        
        // Reset completion state
        levelCompleting = false;
        completionStartTime = 0;
        completionMessage = '';
        
        // Start countdown
        countdownActive = true;
        countdownValue = 3;
        countdownStartTime = performance.now();
        
        // Set spawn state
        currentWorld = level.spawn.world;
        player.x = level.spawn.x;
        player.y = level.spawn.y;
        player.velocityX = 0;
        player.velocityY = 0;
        player.onGround = false;
        
        // Build runtime arrays from level data (convert w,h to width,height for consistency)
        level.platforms.forEach(plat => {
            platforms.push({
                id: plat.id || `platform_${platforms.length}`,
                x: plat.x,
                y: plat.y,
                width: plat.w,
                height: plat.h,
                world: plat.world
            });
        });
        
        level.movers.forEach(mover => {
            movers.push({
                id: mover.id || `mover_${movers.length}`,
                x: mover.x,
                y: mover.y,
                w: mover.w,
                h: mover.h,
                world: mover.world,
                axis: mover.axis,
                speed: mover.speed,
                from: { ...mover.from },
                to: { ...mover.to },
                cycleMs: mover.cycleMs,
                _prevX: mover.x,
                _prevY: mover.y
            });
        });
        
        level.spikes.forEach(spike => {
            // Find the platform this spike is attached to
            let attachedPlatform = null;
            let inheritedWorld = spike.world; // Default to spike's own world
            
            if (spike.attachedTo) {
                // Find the platform by ID
                attachedPlatform = platforms.find(p => p.id === spike.attachedTo);
                
                if (attachedPlatform) {
                    // Validate that it's a stationary platform (not a mover)
                    const attachedMover = movers.find(m => m.id === spike.attachedTo);
                    if (attachedMover) {

                        return; // Skip this spike
                    }
                    
                    // Inherit world from attached platform
                    inheritedWorld = attachedPlatform.world;
                } else {

                }
            }
            
            spikes.push({
                id: spike.id || `spike_${spikes.length}`,
                x: spike.x,
                y: spike.y,
                width: spike.w,
                height: spike.h,
                world: inheritedWorld,
                attachedTo: spike.attachedTo || null
            });
        });
        
        level.doors.forEach(door => {
            doors.push({
                id: door.id,
                type: door.type, // Only 'exit' type supported
                x: door.x,
                y: door.y,
                width: door.w,
                height: door.h,
                world: door.world
            });
        });
        
        // Initialize camera
        this.updateCamera();
        

    },
    
    // Reset current level (death/manual reset)
    reset() {
        if (currentLevelIndex < 0 || currentLevelIndex >= LEVELS.length) return;
        

        
        const level = LEVELS[currentLevelIndex];
        
        // Reset timing
        levelTimeMs = 0;
        levelStartMonotonic = performance.now();
        
        // Reset run timer (death/manual reset)
        levelRunMs = 0;
        
        // Reset completion state
        levelCompleting = false;
        completionStartTime = 0;
        completionMessage = '';
        
        // Start countdown
        countdownActive = true;
        countdownValue = 3;
        countdownStartTime = performance.now();
        
        // Reset player to spawn
        currentWorld = level.spawn.world;
        player.x = level.spawn.x;
        player.y = level.spawn.y;
        player.velocityX = 0;
        player.velocityY = 0;
        player.onGround = false;
        
        // Exit doors don't need reset logic (no state to toggle)
        

        
        // Reset camera
        this.updateCamera();
        
        // Clear physics debug state
        physicsDebug.standingOnMover = null;
        physicsDebug.moverDx = 0;
        physicsDebug.moverDy = 0;
        physicsDebug.pushedByMoverThisFrame = false;
    },
    
    // Complete current level
    complete() {

        
        // Stop the run timer and check for new best time
        const finalTime = levelRunMs;

        
        // Save best time if this run was better (or no best exists)
        if (levelBestMs === null || finalTime < levelBestMs) {
            levelBestMs = finalTime;
            saveBestTime(currentLevelIndex, finalTime);

        }
        
        // Start completion sequence
        levelCompleting = true;
        completionStartTime = performance.now();
        
        // Set completion message based on whether there are more levels
        if (currentLevelIndex >= LEVELS.length - 1) {
            completionMessage = 'YOU WIN!';
        } else {
            completionMessage = 'LEVEL COMPLETE';
        }
        
        // Stop player physics
        player.velocityX = 0;
        player.velocityY = 0;
    },
    
    // Get current level metadata
    getCurrent() {
        if (currentLevelIndex < 0 || currentLevelIndex >= LEVELS.length) return null;
        return LEVELS[currentLevelIndex];
    },
    
    // Update camera based on player position (horizontal tracking only)
    updateCamera() {
        const level = this.getCurrent();
        if (!level) return;
        
        // During countdown, keep camera at spawn position
        if (countdownActive) {
            const targetX = Math.max(0, Math.min(level.spawn.x - CANVAS_WIDTH / 2, level.meta.width - CANVAS_WIDTH));
            camera.x = targetX;
            camera.y = 0;
            return;
        }
        
        // Calculate deadzone boundaries
        const deadzoneLeft = camera.x + (CANVAS_WIDTH - CAMERA_DEADZONE_WIDTH) / 2;
        const deadzoneRight = deadzoneLeft + CAMERA_DEADZONE_WIDTH;
        
        let targetCameraX = camera.x;
        
        // Adjust target if player is outside deadzone
        if (player.x < deadzoneLeft) {
            targetCameraX = player.x - (CANVAS_WIDTH - CAMERA_DEADZONE_WIDTH) / 2;
        } else if (player.x > deadzoneRight) {
            targetCameraX = player.x - (CANVAS_WIDTH + CAMERA_DEADZONE_WIDTH) / 2;
        }
        
        // Apply smoothing
        camera.x += (targetCameraX - camera.x) * CAMERA_SMOOTHING;
        
        // Clamp to level bounds
        camera.x = Math.max(0, Math.min(camera.x, level.meta.width - CANVAS_WIDTH));
        camera.y = 0; // No vertical camera movement
    }
};

// Handle countdown sequence
function updateCountdown(currentTime) {
    const elapsed = currentTime - countdownStartTime;
    
    // Each number shows for 1 second (1000ms)
    if (elapsed >= 3000) {
        // Countdown finished
        countdownActive = false;
        // Reset timers to start fresh
        levelTimeMs = 0;
        levelRunMs = 0;
        levelStartMonotonic = performance.now();
    } else if (elapsed >= 2000) {
        countdownValue = 1;
    } else if (elapsed >= 1000) {
        countdownValue = 2;
    } else {
        countdownValue = 3;
    }
}

// Handle level completion sequence timing and progression
function updateCompletionSequence(currentTime) {
    const elapsed = currentTime - completionStartTime;
    const COMPLETION_DISPLAY_TIME = 2000; // Show message for 2 seconds
    
    if (elapsed >= COMPLETION_DISPLAY_TIME) {
        // End completion sequence and progress to next level
        levelCompleting = false;
        
        if (currentLevelIndex >= LEVELS.length - 1) {
            // Last level completed - return to menu or restart

            // TODO: Return to main menu or show final score screen
            LevelManager.load(0); // For now, restart from first level
        } else {
            // Progress to next level
            LevelManager.load(currentLevelIndex + 1);
        }
    }
}

// DETERMINISTIC TIME-BASED MOVERS: Update moving platforms from elapsed level time
function updateMovers() {
    for (const mover of movers) {
        // Store previous position for delta calculation
        mover._prevX = mover.x;
        mover._prevY = mover.y;
        
        // Calculate position from elapsed level time (deterministic)
        const elapsed = levelTimeMs;
        const T = mover.cycleMs;
        const t = (elapsed % T) / T; // 0..1 cycle progress
        
        // Map t through ping-pong curve: 0..1..0
        const u = t <= 0.5 ? (t * 2) : (1 - (t - 0.5) * 2);
        
        // Interpolate between endpoints
        if (mover.axis === 'horizontal') {
            mover.x = mover.from.x + u * (mover.to.x - mover.from.x);
        } else if (mover.axis === 'vertical') {
            mover.y = mover.from.y + u * (mover.to.y - mover.from.y);
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

// Timer formatting utility - converts milliseconds to mm:ss:ms format
function formatTime(milliseconds) {
    const totalMs = Math.floor(milliseconds);
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
}

// localStorage functions for best times (namespaced by host)
function getBestTimeKey(levelIndex) {
    return `${window.location.host}:bestTime:${levelIndex}`;
}

function saveBestTime(levelIndex, timeMs) {
    try {
        const key = getBestTimeKey(levelIndex);
        localStorage.setItem(key, timeMs.toString());
    } catch (e) {
        // Silently fail if localStorage is not available
    }
}

function loadBestTime(levelIndex) {
    try {
        const key = getBestTimeKey(levelIndex);
        let saved = localStorage.getItem(key);
        
        // Migrate old format if exists
        if (!saved) {
            const oldKey = `bestTime_${levelIndex}`;
            const oldValue = localStorage.getItem(oldKey);
            if (oldValue) {
                // Migrate to new format
                localStorage.setItem(key, oldValue);
                localStorage.removeItem(oldKey);
                saved = oldValue;
            }
        }
        
        return saved ? parseInt(saved, 10) : null;
    } catch (e) {
        // Silently fail if localStorage is not available
        return null;
    }
}

// World-specific movement trait functions
function getCurrentSpeed() {
    return currentWorld === 'light' ? LIGHT_SPEED : DARK_SPEED;
}

function getCurrentGravity() {
    return currentWorld === 'light' ? LIGHT_GRAVITY : DARK_GRAVITY;
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
    
    // Clamp to level bounds (not screen bounds)
    const currentLevel = LevelManager.getCurrent();
    let clampedX = targetX;
    if (currentLevel) {
        clampedX = Math.max(0, Math.min(targetX, currentLevel.meta.width - player.width));
    }
    
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

        return false; // Swap failed
    }
    
    // Safe to swap - toggle world
    currentWorld = targetWorld;
    
    // Movement traits are automatically applied:
    // - getCurrentSpeed() and getCurrentGravity() read from currentWorld
    // - Next frame will use new world's speed/gravity values
    // - Existing velocities preserved, but new input uses new world traits
    
    // Record swap time for cooldown (only on successful swap)
    lastSwapTime = Date.now();
    

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

// SINGLE SOURCE OF TRUTH: Get all solid AABBs for collision and safe-swap checks
// Returns unified array of platforms + movers + invisible borders + spikes (for death)
// This is the ONLY function that should be used for collision detection and safe-swap checks
function getActiveSolidsForWorld(world, includeSpikes = false) {
    const solids = [];
    const level = LevelManager.getCurrent();
    
    // Add invisible borders (vertical only) to prevent leaving viewport top/bottom
    if (level) {
        // Top ceiling (prevent jumping above screen)
        solids.push({
            id: 'invisible-ceiling',
            x: 0,
            y: camera.y - 4,
            width: level.meta.width,
            height: 4,
            world: 'both',
            _isInvisibleBorder: true
        });
        
        // NOTE: No horizontal borders - players can fall off sides into death pits
        // NOTE: No bottom border - players die by falling below level height (see death pit mechanic)
    }
    
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
    
    // Add spikes if requested (for death collision detection)
    if (includeSpikes) {
        const activeSpikes = spikes.filter(spike => 
            spike.world === 'both' || spike.world === world
        );
        
        for (const spike of activeSpikes) {
            solids.push({
                id: spike.id,
                x: spike.x,
                y: spike.y,
                width: spike.width,
                height: spike.height,
                world: spike.world,
                _isSpike: true
            });
        }
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

// Clear all localStorage records for fresh start
function clearAllRecords() {
    const keysToRemove = [];
    const host = window.location.host;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            // Remove old format keys
            if (key.startsWith('bestTime_')) {
                keysToRemove.push(key);
            }
            // Remove new format keys for current host
            if (key.startsWith(`${host}:bestTime:`)) {
                keysToRemove.push(key);
            }
        }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Initialize the game
function init() {

    
    // Migrate old localStorage keys if needed (automatic on first load of each level)
    
    // Check if LEVELS is available
    if (typeof LEVELS === 'undefined') {

        return;
    }

    
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
        
        // Handle number keys for level selection (1-3) and R for reset
        if (gameStarted) {
            // Level switching allowed during countdown
            if (e.key === '1') {
                LevelManager.load(0);
                e.preventDefault();
                return;
            } else if (e.key === '2') {
                LevelManager.load(1);
                e.preventDefault();
                return;
            } else if (e.key === '3') {
                LevelManager.load(2);
                e.preventDefault();
                return;
            } else if (key === 'r' && !countdownActive && !levelCompleting) {
                // R for reset only works during gameplay
                LevelManager.reset();
                e.preventDefault();
                return;
            }
        }
        
        // Handle Space key for world swapping (edge detection)
        if (e.code === 'Space') {
            // Disable swap during countdown
            if (!countdownActive && !spaceKeyPressed && canSwapWorld()) {
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

    
    if (gameStarted) {

        return;
    }
    
    try {
    gameStarted = true;
    
    
        // Update UI - enter game mode
    startBtn.textContent = 'Game Running...';
    startBtn.disabled = true;
        startBtn.style.display = 'none';
        document.body.classList.add('game-mode');
        app.classList.add('game-mode');
        canvas.style.display = 'block';
        
        // Apply integer scaling
        applyCanvasScale();
        
        // Load first level

        LevelManager.load(0);
        
        // Initialize frame timing
        lastFrameTime = performance.now();
        
        // Start game loop

        gameLoop();
        

        
    } catch (error) {

        gameStarted = false; // Reset on error
        startBtn.disabled = false;
        startBtn.style.display = 'block';
        startBtn.textContent = 'Start Game';
    }
}

// Main game loop
function gameLoop() {
    if (!gameStarted) return;
    
    // Calculate frame delta time
    const currentTime = performance.now();
    const dt = Math.min((currentTime - lastFrameTime) / 1000, 1/30); // Cap at 30fps minimum
    lastFrameTime = currentTime;
    
    // Handle countdown sequence
    if (countdownActive) {
        updateCountdown(currentTime);
        render(); // Still render but don't update game logic
        animationId = requestAnimationFrame(gameLoop);
        return;
    }
    
    // Handle level completion sequence
    if (levelCompleting) {
        updateCompletionSequence(currentTime);
        render(); // Still render but don't update game logic
        animationId = requestAnimationFrame(gameLoop);
        return;
    }
    
    // TICK/UPDATE WIRING: Advance deterministic level time
    const dtMs = Math.min(dt * 1000, 1000/30); // Cap at 30fps minimum
    levelTimeMs += dtMs;
    
    // Accumulate run timer for current level (only when not completing or counting down)
    levelRunMs += dtMs;
    
    // 1) UPDATE MOVERS FIRST: Deterministic time-based positioning
    updateMovers();
    
    // 2) KINEMATIC-PUSH PHASE: Handle movers pushing INTO the player
    applyKinematicPush();
    
    // 3-6) Player physics with strict collision order
    updatePlayer();
    
    // Update camera after player movement
    LevelManager.updateCamera();
    
    // Check for spike collisions (death)
    checkSpikeCollisions();
    
    // Check for door interactions
    checkDoorInteractions();
    
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
    // Skip input processing during level completion or countdown
    if (levelCompleting || countdownActive) {
        return;
    }
    
    // Get current level once for this function
    const level = LevelManager.getCurrent();
    
    // 3) READ INPUT AND INTEGRATE VELOCITIES
    // Handle horizontal movement input (use current world's speed)
    const worldSpeed = getCurrentSpeed();
    if (keys.a) {
        player.velocityX = -worldSpeed;
    } else if (keys.d) {
        player.velocityX = worldSpeed;
    } else {
        player.velocityX = 0;
    }
    
    // Handle jumping
    if (keys.w && player.onGround) {
        player.velocityY = JUMP_FORCE;
        player.onGround = false;
    }
    
    // Debug controls
    if (DEBUG) {
        if (keys.r) {
            LevelManager.reset();
            keys.r = false; // Prevent rapid resets
        }
        if (keys[1]) {
            LevelManager.load(0);
            keys[1] = false;
        }
        if (keys[2] && LEVELS.length > 1) {
            LevelManager.load(1);
            keys[2] = false;
        }
        if (keys[3] && LEVELS.length > 2) {
            LevelManager.load(2); // Wide Canyon Test
            keys[3] = false;
        }
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
    
    // Keep player within level bounds (not screen bounds - camera handles that)
    let clampedX = newX;
    if (level) {
        clampedX = Math.max(0, Math.min(newX, level.meta.width - player.width));
        if (clampedX !== newX) {
            player.velocityX = 0; // Hit level boundary
        }
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
    
    // DEATH PIT MECHANIC: Player dies if they fall below the level boundary
    // Check if player's bottom edge is below level height (entire bounding box offscreen)
    if (level && player.y + player.height > level.meta.height) {

        LevelManager.reset();
        return;
    }
}

// Check for spike collisions (causes death/reset)
function checkSpikeCollisions() {
    const playerRect = {
        x: player.x,
        y: player.y,
        width: player.width,
        height: player.height
    };
    
    // Get spikes in current world
    const activeSpikes = spikes.filter(spike => 
        spike.world === 'both' || spike.world === currentWorld
    );
    
    for (const spike of activeSpikes) {
        if (rectanglesOverlap(playerRect, spike)) {

            LevelManager.reset();
            return;
        }
    }
}

// Check for door interactions (level completion)
function checkDoorInteractions() {
    const playerRect = {
        x: player.x,
        y: player.y,
        width: player.width,
        height: player.height
    };
    
    // Get doors in current world
    const activeDoors = doors.filter(door => 
        door.world === 'both' || door.world === currentWorld
    );
    
    for (const door of activeDoors) {
        // Exit door overlap check - immediate completion on touch
        if (rectanglesOverlap(playerRect, door) && door.type === 'exit') {

            LevelManager.complete();
            return;
        }
    }
}



// Render the game with camera transforms and culling
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw sky background (before camera transform)
    renderSkyBackground();
    
    // Draw background elements (clouds/stars) with parallax
    renderBackgroundElements();
    
    // Save context for camera transforms
    ctx.save();
    
    // Apply camera transform
    ctx.translate(-camera.x, -camera.y);
    
    // Render tutorial text if in Level 1
    if (currentLevelIndex === 0 && gameStarted) {
        renderTutorialText();
    }
    
    // Draw level objects (with culling)
    renderPlatforms();
    renderMovers(); 
    renderSpikes();
    renderDoors();
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player border for better visibility
    ctx.strokeStyle = '#D63031';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
    
    // Draw atmospheric effects (mist/fog for dark world)
    if (currentWorld === 'dark') {
        renderDarkWorldMist();
    }
    
    // Restore context (back to screen coordinates)
    ctx.restore();
    
    // Draw UI elements in screen coordinates (no camera transform)
    renderTimerHUD();
    
    // Render countdown if active
    if (countdownActive) {
        renderCountdown();
    }
    
    // Render completion message if active
    if (levelCompleting) {
        renderCompletionMessage();
    }
    
    // Render swap failed message if visible
    renderSwapFailedMessage();
}

// Check if object AABB intersects viewport (for culling)
function isInViewport(obj) {
    const viewLeft = camera.x;
    const viewRight = camera.x + CANVAS_WIDTH;
    const viewTop = camera.y;
    const viewBottom = camera.y + CANVAS_HEIGHT;
    
    return obj.x < viewRight && 
           obj.x + (obj.width || obj.w) > viewLeft &&
           obj.y < viewBottom &&
           obj.y + (obj.height || obj.h) > viewTop;
}

// Render sky background gradient based on current world
function renderSkyBackground() {
    let gradient;
    if (currentWorld === 'light') {
        // Light world: Bright sky-blue gradient
        gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#87CEEB');    // Sky blue at top
        gradient.addColorStop(0.6, '#98D8E8');  // Lighter blue
        gradient.addColorStop(1, '#E0F6FF');    // Very light blue at horizon
    } else {
        // Dark world: Bluish-grey gradient
        gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');    // Dark blue-grey at top
        gradient.addColorStop(0.5, '#2d3561');  // Medium blue-grey
        gradient.addColorStop(1, '#4a5f7a');    // Lighter blue-grey at horizon
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// Render background elements (clouds/stars/moon) with parallax
function renderBackgroundElements() {
    ctx.save();
    
    if (currentWorld === 'light') {
        // Light world: Draw clouds with parallax
        const cloudParallax = camera.x * 0.3; // Clouds move slower than foreground
        
        // Simple cloud shapes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        // Cloud 1
        drawCloud(100 - cloudParallax % (CANVAS_WIDTH + 200), 50, 60);
        
        // Cloud 2
        drawCloud(300 - cloudParallax % (CANVAS_WIDTH + 200), 80, 45);
        
        // Cloud 3
        drawCloud(500 - cloudParallax % (CANVAS_WIDTH + 200), 40, 55);
        
        // Cloud 4
        drawCloud(700 - cloudParallax % (CANVAS_WIDTH + 200), 70, 50);
        
    } else {
        // Dark world: Draw stars and moon
        
        // Moon
        const moonX = CANVAS_WIDTH - 100;
        const moonY = 60;
        ctx.fillStyle = '#F0E68C';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Moon craters
        ctx.fillStyle = '#E0D68C';
        ctx.beginPath();
        ctx.arc(moonX - 8, moonY - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(moonX + 6, moonY + 8, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Stars (static positions but twinkle effect)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const time = levelTimeMs / 1000;
        
        // Draw multiple stars
        for (let i = 0; i < 20; i++) {
            const x = (i * 73 + 37) % CANVAS_WIDTH;
            const y = (i * 41 + 20) % (CANVAS_HEIGHT / 2);
            const twinkle = Math.sin(time * 2 + i) * 0.3 + 0.7;
            
            ctx.save();
            ctx.globalAlpha = twinkle;
            ctx.fillRect(x, y, 2, 2);
            ctx.restore();
        }
    }
    
    ctx.restore();
}

// Helper function to draw a cloud
function drawCloud(x, y, size) {
    // Draw cloud using multiple circles
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.2, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
}

// Render dark world atmospheric mist/fog effect
function renderDarkWorldMist() {
    const level = LevelManager.getCurrent();
    if (!level) return;
    
    ctx.save();
    
    // Ground-level mist
    const mistHeight = 60;
    const mistY = level.meta.height - mistHeight;
    
    // Create gradient for mist
    const gradient = ctx.createLinearGradient(0, mistY, 0, mistY + mistHeight);
    gradient.addColorStop(0, 'rgba(148, 130, 180, 0)');
    gradient.addColorStop(0.5, 'rgba(148, 130, 180, 0.2)');
    gradient.addColorStop(1, 'rgba(148, 130, 180, 0.4)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(camera.x, mistY, CANVAS_WIDTH, mistHeight);
    
    // Shadow particles floating upward (keeping these for subtle atmosphere)
    const time = levelTimeMs / 1000;
    ctx.fillStyle = 'rgba(100, 80, 120, 0.4)';
    for (let i = 0; i < 5; i++) {
        const baseX = camera.x + (i * 140 + 70);
        const x = baseX + Math.sin(time * 0.8 + i * 3) * 30;
        const y = mistY - 30 - ((time * 30 + i * 50) % 200);
        
        ctx.globalAlpha = 0.3 * (1 - (y - (mistY - 230)) / 200);
        ctx.fillRect(x, y, 3, 8);
    }
    
    ctx.restore();
}

// Render platforms based on current world (with culling)
function renderPlatforms() {
    const activePlatforms = platforms.filter(platform => 
        (platform.world === 'both' || platform.world === currentWorld) && 
        isInViewport(platform)
    );
    
    for (const platform of activePlatforms) {
        // Check if this is ground (large platform at bottom of level)
        const isGround = platform.id && (platform.id.includes('ground') || 
                                         platform.y >= 320 && platform.width >= 400);
        
        if (isGround) {
            // Ground renders based on CURRENT world, not platform world
            if (currentWorld === 'light') {
                renderGrassPlatform(platform);
            } else {
                renderRockyPlatform(platform);
            }
        } else if (platform.world === 'both') {
            // Both-world platforms: simple neutral gray (no glow)
            renderBothWorldPlatform(platform);
        } else if (platform.world === 'light') {
            // Light world platforms: green grass tiles
            renderGrassPlatform(platform);
        } else if (platform.world === 'dark') {
            // Dark world platforms: purple rocky tiles
            renderRockyPlatform(platform);
        }
    }
}

// Render a both-world platform - simple neutral gray
function renderBothWorldPlatform(platform) {
    // Main platform body - neutral gray (distinct from world-specific colors)
    ctx.fillStyle = '#707070';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    
    // Simple border for definition
    ctx.strokeStyle = '#505050';
    ctx.lineWidth = 1;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
}

// Render a grass platform with pixel details
function renderGrassPlatform(platform) {
    // Base green color
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    
    // Add grass texture details
    const tileSize = 16;
    ctx.save();
    ctx.beginPath();
    ctx.rect(platform.x, platform.y, platform.width, platform.height);
    ctx.clip();
    
    for (let x = platform.x; x < platform.x + platform.width; x += tileSize) {
        for (let y = platform.y; y < platform.y + platform.height; y += tileSize) {
            // Darker green base
            ctx.fillStyle = '#388E3C';
            ctx.fillRect(x, y, tileSize, tileSize);
            
            // Grass blades
            ctx.fillStyle = '#66BB6A';
            // Random grass tufts
            const grassPattern = (x + y) % 3;
            if (grassPattern === 0) {
                // Tall grass
                ctx.fillRect(x + 2, y + 8, 1, 4);
                ctx.fillRect(x + 5, y + 6, 1, 6);
                ctx.fillRect(x + 8, y + 7, 1, 5);
                ctx.fillRect(x + 11, y + 9, 1, 3);
                ctx.fillRect(x + 14, y + 8, 1, 4);
            } else if (grassPattern === 1) {
                // Short grass
                ctx.fillRect(x + 3, y + 10, 1, 2);
                ctx.fillRect(x + 7, y + 9, 1, 3);
                ctx.fillRect(x + 10, y + 10, 1, 2);
                ctx.fillRect(x + 13, y + 11, 1, 1);
            }
            
            // Tiny flowers (occasional)
            if ((x + y * 2) % 7 === 0) {
                ctx.fillStyle = '#FFEB3B';
                ctx.fillRect(x + 6, y + 6, 2, 2);
                ctx.fillStyle = '#FFC107';
                ctx.fillRect(x + 6, y + 6, 1, 1);
            } else if ((x * 3 + y) % 11 === 0) {
                ctx.fillStyle = '#E91E63';
                ctx.fillRect(x + 10, y + 7, 2, 2);
            }
            
            // Dirt patches at bottom
            if (y >= platform.y + platform.height - tileSize) {
                ctx.fillStyle = '#6D4C41';
                ctx.fillRect(x, y + tileSize - 4, tileSize, 4);
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(x + 2, y + tileSize - 2, 3, 2);
                ctx.fillRect(x + 8, y + tileSize - 3, 4, 2);
            }
        }
    }
    
    ctx.restore();
    
    // Platform edge highlight
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 1;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
}

// Render a rocky platform with cracks and glowing lines
function renderRockyPlatform(platform) {
    // Base purple-gray rock color
    ctx.fillStyle = '#4A3C5C';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    
    // Add rocky texture
    const tileSize = 16;
    ctx.save();
    ctx.beginPath();
    ctx.rect(platform.x, platform.y, platform.width, platform.height);
    ctx.clip();
    
    for (let x = platform.x; x < platform.x + platform.width; x += tileSize) {
        for (let y = platform.y; y < platform.y + platform.height; y += tileSize) {
            // Rock base with variation
            const variation = (x * 3 + y * 7) % 4;
            if (variation === 0) {
                ctx.fillStyle = '#5A4A6A';
            } else if (variation === 1) {
                ctx.fillStyle = '#4A3C5C';
            } else {
                ctx.fillStyle = '#3A2C4C';
            }
            ctx.fillRect(x, y, tileSize, tileSize);
            
            // Cracks
            ctx.strokeStyle = '#2A1C3C';
            ctx.lineWidth = 1;
            const crackPattern = (x + y * 2) % 5;
            if (crackPattern === 0) {
                ctx.beginPath();
                ctx.moveTo(x + 2, y + 4);
                ctx.lineTo(x + 8, y + 10);
                ctx.lineTo(x + 14, y + 8);
                ctx.stroke();
            } else if (crackPattern === 1) {
                ctx.beginPath();
                ctx.moveTo(x + 12, y + 2);
                ctx.lineTo(x + 10, y + 8);
                ctx.lineTo(x + 6, y + 14);
                ctx.stroke();
            }
            
            // Glowing energy lines (occasional)
            if ((x * 2 + y) % 13 === 0) {
                ctx.strokeStyle = '#9C27B0';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.moveTo(x + 4, y + tileSize);
                ctx.lineTo(x + 4, y + tileSize - 4);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            
            // Crystal fragments (rare)
            if ((x + y * 3) % 17 === 0) {
                ctx.fillStyle = '#E91E63';
                ctx.globalAlpha = 0.8;
                ctx.fillRect(x + 7, y + 9, 3, 3);
                ctx.fillStyle = '#F06292';
                ctx.fillRect(x + 8, y + 10, 1, 1);
                ctx.globalAlpha = 1;
            }
        }
    }
    
    ctx.restore();
    
    // Platform edge
    ctx.strokeStyle = '#311B92';
    ctx.lineWidth = 1;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
}

// Render moving platforms based on current world (with culling)
function renderMovers() {
    const activeMovers = movers.filter(mover => 
        (mover.world === 'both' || mover.world === currentWorld) && 
        isInViewport(mover)
    );
    
    for (const mover of activeMovers) {
        // Convert mover format to platform format for rendering
        const platformFormat = {
            x: mover.x,
            y: mover.y,
            width: mover.w,
            height: mover.h,
            world: mover.world,
            id: mover.id
        };
        
        // Check if this is a ground mover
        const isGround = mover.id && (mover.id.includes('ground') || 
                                      mover.y >= 320 && mover.w >= 400);
        
        if (isGround) {
            // Ground movers render based on CURRENT world
            if (currentWorld === 'light') {
                renderGrassPlatform(platformFormat);
            } else {
                renderRockyPlatform(platformFormat);
            }
        } else if (mover.world === 'both') {
            renderBothWorldPlatform(platformFormat);
        } else if (mover.world === 'light') {
            renderGrassPlatform(platformFormat);
        } else if (mover.world === 'dark') {
            renderRockyPlatform(platformFormat);
        }
        
        // Add moving platform indicator (gears/arrows)
        ctx.save();
        // Use contrasting color for visibility
        const indicatorColor = currentWorld === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.4)';
        ctx.fillStyle = indicatorColor;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        const centerX = mover.x + mover.w / 2;
        const centerY = mover.y + mover.h / 2;
        
        if (mover.axis === 'horizontal') {
            ctx.fillText('◄►', centerX, centerY + 3);
        } else {
            ctx.fillText('▲▼', centerX, centerY + 3);
        }
        ctx.restore();
        
        // Movement path debug visualization removed for cleaner visuals
    }
}

// Render triangular spikes based on current world (with culling)
function renderSpikes() {
    const activeSpikes = spikes.filter(spike => 
        (spike.world === 'both' || spike.world === currentWorld) &&
        isInViewport(spike)
    );
    
    for (const spike of activeSpikes) {
        // Set spike color based on world
        let fillColor, strokeColor;
        switch (spike.world) {
            case 'light':
                fillColor = '#2E7D32';   // Darker green for light world spikes
                strokeColor = '#1B5E20'; // Even darker green border
                break;
            case 'dark':
                fillColor = '#4A3B5A';   // Darker purple for dark world spikes  
                strokeColor = '#3A2C48'; // Even darker purple border
                break;
            case 'both':
                fillColor = '#424242';   // Neutral grey for both-world spikes
                strokeColor = '#212121'; // Darker grey border
                break;
            default:
                fillColor = '#FF0000';   // Fallback red
                strokeColor = '#CC0000';
        }
        
        // Draw individual triangular spikes
        const spikeSize = 16; // Size of each triangular spike
        const spikeHeight = Math.sqrt(3) / 2 * spikeSize; // Height of equilateral triangle
        
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        
        // Calculate how many spikes fit in the width
        const numSpikes = Math.floor(spike.width / spikeSize);
        const startX = spike.x + (spike.width - numSpikes * spikeSize) / 2; // Center the spikes
        
        for (let i = 0; i < numSpikes; i++) {
            const spikeX = startX + i * spikeSize;
            
            // Draw equilateral triangle spike pointing up
            ctx.beginPath();
            ctx.moveTo(spikeX, spike.y + spike.height);                    // Bottom left
            ctx.lineTo(spikeX + spikeSize, spike.y + spike.height);        // Bottom right  
            ctx.lineTo(spikeX + spikeSize / 2, spike.y + spike.height - spikeHeight); // Top point
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
        }
    }
}

// Render exit doors based on current world (with culling)
function renderDoors() {
    const activeDoors = doors.filter(door => 
        (door.world === 'both' || door.world === currentWorld) &&
        isInViewport(door)
    );
    
    for (const door of activeDoors) {
        // Set exit door colors based on world
        let fillColor, strokeColor, glowColor;
        switch (door.world) {
            case 'light':
                fillColor = '#32CD32';   // Bright green for light world exit
                strokeColor = '#228B22'; // Darker green border
                glowColor = '#90EE90';   // Light green glow
                break;
            case 'dark':
                fillColor = '#9370DB';   // Purple for dark world exit
                strokeColor = '#663399'; // Darker purple border
                glowColor = '#DDA0DD';   // Light purple glow
                break;
            case 'both':
                fillColor = '#FFD700';   // Gold for both-world exit
                strokeColor = '#FFA500'; // Orange border
                glowColor = '#FFFF99';   // Light yellow glow
                break;
            default:
                fillColor = '#228B22';   // Fallback green
                strokeColor = '#006600';
                glowColor = '#90EE90';
        }
        
        // Draw glow effect (larger, semi-transparent)
        ctx.fillStyle = glowColor + '40'; // Add alpha for transparency
        ctx.fillRect(door.x - 3, door.y - 3, door.width + 6, door.height + 6);
        
        // Draw main door body
        ctx.fillStyle = fillColor;
        ctx.fillRect(door.x, door.y, door.width, door.height);
        
        // Draw door frame (inner border)
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(door.x + 2, door.y + 2, door.width - 4, door.height - 4);
        
        // Draw door panels (decorative)
        const panelMargin = 4;
        const panelWidth = (door.width - panelMargin * 3) / 2;
        const panelHeight = door.height - panelMargin * 2;
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        // Left panel
        ctx.strokeRect(door.x + panelMargin, door.y + panelMargin, panelWidth, panelHeight);
        // Right panel
        ctx.strokeRect(door.x + panelMargin * 2 + panelWidth, door.y + panelMargin, panelWidth, panelHeight);
        
        // Draw EXIT text with background
        const centerX = door.x + door.width / 2;
        const centerY = door.y + door.height / 2;
        
        // Text background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(centerX - 20, centerY - 8, 40, 16);
        
        // EXIT text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', centerX, centerY + 4);
        
        // Draw arrow pointing up
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 15);
        ctx.lineTo(centerX - 5, centerY - 10);
        ctx.lineTo(centerX + 5, centerY - 10);
        ctx.closePath();
        ctx.fill();
    }
}

// Render tutorial text for Level 1
function renderTutorialText() {
    const level = LevelManager.getCurrent();
    if (!level || !level.tutorialTexts) return;
    
    // Set up text styling
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Render each tutorial text
    for (const tutText of level.tutorialTexts) {
        // Only show text when player is within the specified range
        if (tutText.minX !== undefined && tutText.maxX !== undefined) {
            if (player.x < tutText.minX || player.x > tutText.maxX) {
                continue;
            }
        }
        
        // Only render if in camera view
        if (tutText.x < camera.x - 100 || tutText.x > camera.x + CANVAS_WIDTH + 100) {
            continue;
        }
        
        // Fade in/out based on player distance
        let opacity = 1.0;
        if (tutText.minX !== undefined && tutText.maxX !== undefined) {
            const fadeDistance = 50;
            if (player.x < tutText.minX + fadeDistance) {
                opacity = (player.x - tutText.minX) / fadeDistance;
            } else if (player.x > tutText.maxX - fadeDistance) {
                opacity = (tutText.maxX - player.x) / fadeDistance;
            }
            opacity = Math.max(0, Math.min(1, opacity));
        }
        
        // Set font based on size from tutorial text
        const fontSize = tutText.size || 18;
        ctx.font = `bold ${fontSize}px monospace`;
        
        // Measure text for background sizing
        const textWidth = ctx.measureText(tutText.text).width;
        const boxHeight = fontSize + 6; // Tighter padding for smaller text
        const boxPadding = 6;
        
        // Create semi-transparent background for readability
        ctx.globalAlpha = opacity * 0.9;
        ctx.fillStyle = currentWorld === 'light' 
            ? 'rgba(255, 255, 255, 1)' 
            : 'rgba(0, 0, 0, 1)';
        ctx.fillRect(
            tutText.x - textWidth/2 - boxPadding, 
            tutText.y - boxHeight/2, 
            textWidth + boxPadding * 2, 
            boxHeight
        );
        
        // Draw border
        ctx.globalAlpha = opacity * 0.8;
        ctx.strokeStyle = currentWorld === 'light' 
            ? 'rgba(46, 204, 113, 1)' 
            : 'rgba(155, 89, 182, 1)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
            tutText.x - textWidth/2 - boxPadding, 
            tutText.y - boxHeight/2, 
            textWidth + boxPadding * 2, 
            boxHeight
        );
        
        // Draw text
        ctx.globalAlpha = opacity;
        ctx.fillStyle = currentWorld === 'light' ? '#2D3436' : '#FFFFFF';
        ctx.fillText(tutText.text, tutText.x, tutText.y);
    }
    
    ctx.restore();
}

// Render timer HUD (live timer, best time, level number, and progress)
function renderTimerHUD() {
    // Choose text color based on current world for readability
    const textColor = currentWorld === 'light' ? '#2D3436' : '#FFFFFF';
    
    // Level number (top-left, above timer)
    ctx.fillStyle = textColor;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${currentLevelIndex + 1}`, 20, 25);
    
    // Live run timer (below level number, large)
    // Show 00:00:000 during countdown, actual time during gameplay
    ctx.font = 'bold 24px Arial';
    const timerValue = countdownActive ? 0 : levelRunMs;
    ctx.fillText(formatTime(timerValue), 20, 55);
    
    // Best time (below live timer, smaller)
    ctx.font = '16px Arial';
    const bestTimeText = levelBestMs !== null ? `Best: ${formatTime(levelBestMs)}` : 'Best: — — : — — : — — —';
    ctx.fillText(bestTimeText, 20, 80);
    
    // Progress percentage (below best time)
    const level = LevelManager.getCurrent();
    if (level && level.meta) {
        const progress = Math.max(0, Math.min(100, Math.floor((player.x / level.meta.width) * 100)));
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Progress: ${progress}%`, 20, 105);
    }
}

// Render countdown overlay
function renderCountdown() {
    // Draw semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw countdown number
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 120px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    
    // Draw the number
    ctx.fillText(countdownValue.toString(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    
    // Add a subtitle on first countdown
    if (countdownValue === 3) {
        ctx.font = 'bold 24px monospace';
        ctx.fillText('GET READY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
    }
    
    ctx.restore();
}

// Render level completion message
function renderCompletionMessage() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Completion message text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(completionMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    
    // Time display
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Time: ${formatTime(levelRunMs)}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    
    // Best time if improved
    if (levelBestMs !== null && levelRunMs <= levelBestMs) {
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFD700'; // Gold color for new best
        ctx.fillText('NEW BEST TIME!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    }
}

// Developer debug overlay (temporary for testing)
function renderDebugOverlay() {
    if (!DEBUG) return;
    
    const textColor = currentWorld === 'light' ? '#2D3436' : '#FFFFFF';
    ctx.fillStyle = textColor;
    ctx.font = '14px Arial';
    
    const currentLevel = LevelManager.getCurrent();
    let lineY = 70;
    
    // Level info
    if (currentLevel) {
        ctx.fillText(`Level: ${currentLevelIndex} - ${currentLevel.meta.name}`, 10, lineY);
        lineY += 20;
    }
    
    // Camera info
    ctx.fillText(`Camera X: ${Math.round(camera.x)}`, 10, lineY);
    lineY += 20;
    
    // Player info
    ctx.fillText(`Player X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`, 10, lineY);
    lineY += 20;
    
    // Level time
    ctx.fillText(`Level Time: ${Math.round(levelTimeMs)}ms`, 10, lineY);
    lineY += 20;
    
    // Current world
    ctx.fillText(`World: ${currentWorld}`, 10, lineY);
    lineY += 20;
    
    // Cooldown status
    const cooldownRemaining = getSwapCooldownRemaining();
    if (cooldownRemaining > 0) {
        ctx.fillText(`Swap CD: ${cooldownRemaining}ms`, 10, lineY);
    } else {
        ctx.fillText(`Swap CD: ready`, 10, lineY);
    }
    lineY += 20;
    
    // Physics debug aid: Push/carry state
    ctx.fillText(`Standing on: ${physicsDebug.standingOnMover || 'null'}`, 10, lineY);
    lineY += 20;
    
    if (physicsDebug.standingOnMover) {
        ctx.fillText(`Mover dx: ${physicsDebug.moverDx.toFixed(2)}, dy: ${physicsDebug.moverDy.toFixed(2)}`, 10, lineY);
        lineY += 20;
    }
    
    ctx.fillText(`Pushed this frame: ${physicsDebug.pushedByMoverThisFrame}`, 10, lineY);
}

// Render "Swap Failed" message when visible
function renderSwapFailedMessage() {
    // Update message visibility based on time
    if (swapFailedMessage.visible && Date.now() >= swapFailedMessage.hideTime) {
        swapFailedMessage.visible = false;
    }
    
    // Render message if visible
    if (swapFailedMessage.visible) {
        ctx.save();
        
        // Position slightly above center to not interfere with gameplay
        const messageX = CANVAS_WIDTH / 2;
        const messageY = CANVAS_HEIGHT / 2 - 40;
        const text = 'Swap Failed';
        
        // Set up text styling (matching tutorial text)
        const fontSize = 18;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Measure text for background sizing
        const textWidth = ctx.measureText(text).width;
        const boxHeight = fontSize + 6; // Same padding as tutorial text
        const boxPadding = 6;
        
        // Create semi-transparent background for readability (matching tutorial)
        ctx.fillStyle = currentWorld === 'light' 
            ? 'rgba(255, 255, 255, 0.9)' 
            : 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(
            messageX - textWidth/2 - boxPadding, 
            messageY - boxHeight/2, 
            textWidth + boxPadding * 2, 
            boxHeight
        );
        
        // Draw border (matching tutorial colors)
        ctx.strokeStyle = currentWorld === 'light' 
            ? 'rgba(46, 204, 113, 1)' 
            : 'rgba(155, 89, 182, 1)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
            messageX - textWidth/2 - boxPadding, 
            messageY - boxHeight/2, 
            textWidth + boxPadding * 2, 
            boxHeight
        );
        
        // Draw text (matching tutorial colors)
        ctx.fillStyle = currentWorld === 'light' ? '#2D3436' : '#FFFFFF';
        ctx.fillText(text, messageX, messageY);
        
        ctx.restore();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);


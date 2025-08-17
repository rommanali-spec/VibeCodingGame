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
const DEBUG = true;

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
    
    console.log(`Canvas scaled to ${scale}x (${scaledWidth}×${scaledHeight})`);
}

// LEVELMANAGER: Manages level loading, resetting, and completion
const LevelManager = {
    // Load a level by index
    load(index) {
        if (index < 0 || index >= LEVELS.length) {
            console.error('Invalid level index:', index);
            return;
        }
        
        const level = LEVELS[index];
        console.log(`Loading level ${index}: ${level.meta.name}`);
        
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
                        console.warn(`Spike ${spike.id} cannot attach to moving platform ${spike.attachedTo} - skipping`);
                        return; // Skip this spike
                    }
                    
                    // Inherit world from attached platform
                    inheritedWorld = attachedPlatform.world;
                } else {
                    console.warn(`Spike ${spike.id} references unknown platform ${spike.attachedTo} - using spike's own world`);
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
        
        console.log(`Level loaded: ${platforms.length} platforms, ${movers.length} movers, ${spikes.length} spikes, ${doors.length} doors`);
    },
    
    // Reset current level (death/manual reset)
    reset() {
        if (currentLevelIndex < 0 || currentLevelIndex >= LEVELS.length) return;
        
        console.log('Resetting level');
        
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
        console.log('Level completed!');
        
        // Stop the run timer and check for new best time
        const finalTime = levelRunMs;
        console.log(`Level completed in: ${formatTime(finalTime)}`);
        
        // Save best time if this run was better (or no best exists)
        if (levelBestMs === null || finalTime < levelBestMs) {
            levelBestMs = finalTime;
            saveBestTime(currentLevelIndex, finalTime);
            console.log(`New best time: ${formatTime(finalTime)}`);
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

// Handle level completion sequence timing and progression
function updateCompletionSequence(currentTime) {
    const elapsed = currentTime - completionStartTime;
    const COMPLETION_DISPLAY_TIME = 2000; // Show message for 2 seconds
    
    if (elapsed >= COMPLETION_DISPLAY_TIME) {
        // End completion sequence and progress to next level
        levelCompleting = false;
        
        if (currentLevelIndex >= LEVELS.length - 1) {
            // Last level completed - return to menu or restart
            console.log('All levels completed!');
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

// localStorage functions for best times
function saveBestTime(levelIndex, timeMs) {
    try {
        localStorage.setItem(`bestTime_${levelIndex}`, timeMs.toString());
    } catch (e) {
        console.warn('Could not save best time to localStorage:', e);
    }
}

function loadBestTime(levelIndex) {
    try {
        const saved = localStorage.getItem(`bestTime_${levelIndex}`);
        return saved ? parseInt(saved, 10) : null;
    } catch (e) {
        console.warn('Could not load best time from localStorage:', e);
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
        console.log('Swap failed - would overlap with solid object');
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

// Initialize the game
function init() {
    console.log('Vibe Coding Game initialized!');
    
    // Check if LEVELS is available
    if (typeof LEVELS === 'undefined') {
        console.error('LEVELS not found - make sure levels.js is loaded first');
        return;
    }
    console.log('LEVELS loaded successfully:', LEVELS.length, 'levels found');
    
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
    console.log('Start button clicked!');
    
    if (gameStarted) {
        console.log('Game already started, ignoring click');
        return;
    }
    
    try {
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
        
        // Load first level
        console.log('Loading first level...');
        LevelManager.load(0);
        
        // Initialize frame timing
        lastFrameTime = performance.now();
        
        // Start game loop
        console.log('Starting game loop...');
        gameLoop();
        
        console.log('Game initialization complete!');
        
    } catch (error) {
        console.error('Error starting game:', error);
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
    
    // Accumulate run timer for current level (only when not completing)
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
    // Skip input processing during level completion
    if (levelCompleting) {
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
        console.log('Player fell into death pit - resetting');
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
            console.log('Player hit spikes - resetting');
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
            console.log('Player reached exit door - level complete');
            LevelManager.complete();
            return;
        }
    }
}



// Render the game with camera transforms and culling
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Save context for camera transforms
    ctx.save();
    
    // Apply camera transform
    ctx.translate(-camera.x, -camera.y);
    
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
    
    // Restore context (back to screen coordinates)
    ctx.restore();
    
    // Draw UI elements in screen coordinates (no camera transform)
    renderTimerHUD();
    
    // Render completion message if active
    if (levelCompleting) {
        renderCompletionMessage();
    }
    
    if (DEBUG) {
        renderDebugOverlay();
    }
    
    // Draw controls info
    ctx.fillStyle = '#2D3436';
    ctx.font = '16px Arial';
    if (DEBUG) {
        ctx.fillText('Controls: A/D (move), W (jump), SPACE (swap), R (reset), 1/2/3 (levels)', 10, 30);
    } else {
        ctx.fillText('Controls: A (left), D (right), W (jump), SPACE (swap world)', 10, 30);
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

// Render platforms based on current world (with culling)
function renderPlatforms() {
    const activePlatforms = platforms.filter(platform => 
        (platform.world === 'both' || platform.world === currentWorld) && 
        isInViewport(platform)
    );
    
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

// Render moving platforms based on current world (with culling)
function renderMovers() {
    const activeMovers = movers.filter(mover => 
        (mover.world === 'both' || mover.world === currentWorld) && 
        isInViewport(mover)
    );
    
    for (const mover of activeMovers) {
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
        ctx.fillRect(mover.x, mover.y, mover.w, mover.h);
        
        // Draw mover border for clarity
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 2;
        ctx.strokeRect(mover.x, mover.y, mover.w, mover.h);
        
        // Draw movement path (debug visualization)
        if (DEBUG) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            
            if (mover.axis === 'horizontal') {
                // Draw horizontal path line
                const y = mover.from.y + mover.h / 2;
                ctx.beginPath();
                ctx.moveTo(mover.from.x, y);
                ctx.lineTo(mover.to.x + mover.w, y);
                ctx.stroke();
            } else if (mover.axis === 'vertical') {
                // Draw vertical path line
                const x = mover.from.x + mover.w / 2;
                ctx.beginPath();
                ctx.moveTo(x, mover.from.y);
                ctx.lineTo(x, mover.to.y + mover.h);
                ctx.stroke();
            }
            
            ctx.setLineDash([]); // Reset line dash
        }
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

// Render timer HUD (live timer and best time)
function renderTimerHUD() {
    // Live run timer (top-left, large)
    ctx.fillStyle = '#2D3436';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(formatTime(levelRunMs), 20, 40);
    
    // Best time (below live timer, smaller)
    ctx.font = '16px Arial';
    const bestTimeText = levelBestMs !== null ? `Best: ${formatTime(levelBestMs)}` : 'Best: — — : — — : — — —';
    ctx.fillText(bestTimeText, 20, 65);
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
    
    ctx.fillStyle = '#2D3436';
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


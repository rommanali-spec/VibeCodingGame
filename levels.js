// levels.js - Three handcrafted challenge levels for VibeCodingGame
// Level 1 is a tutorial (5000px), Levels 2-3 are long challenges (10,000+ px)

const LEVELS = [
    // ==========================================
    // LEVEL 1: TUTORIAL (5000px introduction)
    // ==========================================
    {
        meta: { 
            name: "Tutorial", 
            width: 5000, 
            height: 360 
        },
        
        spawn: { 
            x: 100, 
            y: 280, 
            world: 'light' 
        },

        platforms: [
            // === TUTORIAL SECTION (0-1200px) ===
            // Full ground for tutorial area
            { id: 'ground-tutorial', x: 0, y: 332, w: 1200, h: 28, world: 'both' },
            
            // Small tutorial platforms to practice on
            { id: 'tutorial-plat1', x: 300, y: 280, w: 60, h: 12, world: 'both' },
            { id: 'tutorial-plat2', x: 500, y: 250, w: 60, h: 12, world: 'light' },
            { id: 'tutorial-plat3', x: 700, y: 250, w: 60, h: 12, world: 'dark' },
            { id: 'tutorial-plat4', x: 900, y: 280, w: 80, h: 12, world: 'both' },
            
            // === SECTION 1: BASIC CHALLENGES (1200-2500px) ===
            // First real gap with pit
            { id: 'ground-1', x: 1300, y: 332, w: 400, h: 28, world: 'both' },
            
            // Easy jump sequence
            { id: 'intro1', x: 1800, y: 290, w: 80, h: 12, world: 'both' },
            { id: 'intro2', x: 1950, y: 270, w: 80, h: 12, world: 'both' },
            { id: 'intro3', x: 2100, y: 250, w: 80, h: 12, world: 'both' },
            
            { id: 'ground-2', x: 2250, y: 332, w: 500, h: 28, world: 'both' },
            
            // === SECTION 2: WORLD MECHANICS (2500-3800px) ===
            // Light-only platforms (need speed)
            { id: 'light-1', x: 2850, y: 280, w: 100, h: 12, world: 'light' },
            { id: 'light-2', x: 3050, y: 240, w: 100, h: 12, world: 'light' },
            
            // Dark-only platforms (need float)
            { id: 'dark-1', x: 3250, y: 260, w: 100, h: 12, world: 'dark' },
            { id: 'dark-2', x: 3450, y: 220, w: 120, h: 12, world: 'dark' },
            
            // Safe landing
            { id: 'ground-3', x: 3650, y: 332, w: 350, h: 28, world: 'both' },
            
            // === SECTION 3: FINAL CHALLENGE (4000-5000px) ===
            // Alternating world platforms
            { id: 'final-l1', x: 4100, y: 290, w: 80, h: 12, world: 'light' },
            { id: 'final-d1', x: 4250, y: 270, w: 80, h: 12, world: 'dark' },
            { id: 'final-l2', x: 4400, y: 250, w: 80, h: 12, world: 'light' },
            { id: 'final-d2', x: 4550, y: 230, w: 80, h: 12, world: 'dark' },
            
            // Victory platform
            { id: 'ground-end', x: 4700, y: 332, w: 300, h: 28, world: 'both' }
        ],

        movers: [
            // Moving platform helper
            {
                id: 'mover1',
                x: 2750, y: 320, w: 80, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 2750, y: 320 },
                to: { x: 2950, y: 320 },
                cycleMs: 4000
            }
        ],

        spikes: [
            // Spike demonstrations with proper gaps (60px+ between spike clusters)
            { id: 'spike1', x: 2300, y: 320, w: 64, h: 12, attachedTo: 'ground-2' },
            { id: 'spike2', x: 2430, y: 320, w: 64, h: 12, attachedTo: 'ground-2' },
            // 66px gap for safe landing
            { id: 'spike3', x: 2560, y: 320, w: 64, h: 12, attachedTo: 'ground-2' },
            { id: 'spike4', x: 2690, y: 320, w: 48, h: 12, attachedTo: 'ground-2' },
            // On ground-3
            { id: 'spike5', x: 3700, y: 320, w: 64, h: 12, attachedTo: 'ground-3' },
            // 70px gap for safe landing
            { id: 'spike6', x: 3834, y: 320, w: 64, h: 12, attachedTo: 'ground-3' },
            // 62px gap for safe landing
            { id: 'spike7', x: 3960, y: 320, w: 34, h: 12, attachedTo: 'ground-3' }
        ],

        // Tutorial text (will be rendered in script.js)
        tutorialTexts: [
            { x: 250, y: 200, text: "A = Left", size: 24, minX: 150, maxX: 350 },
            { x: 500, y: 200, text: "D = Right", size: 24, minX: 400, maxX: 600 },
            { x: 750, y: 180, text: "W = Jump", size: 24, minX: 650, maxX: 850 },
            { x: 1000, y: 180, text: "Space = Swap Worlds", size: 24, minX: 900, maxX: 1100 },
            { x: 1150, y: 200, text: "Light = Faster", size: 20, minX: 1100, maxX: 1200 },
            { x: 1150, y: 230, text: "Dark = Float", size: 20, minX: 1100, maxX: 1200 },
            { x: 1150, y: 260, text: "Use keys 1-3 to change levels", size: 18, minX: 1100, maxX: 1200 }
        ],

        doors: [
            {
                id: 'exit',
                type: 'exit',
                x: 4900, y: 280, w: 40, h: 52,
                world: 'both'
            }
        ]
    },

    // ==========================================
    // LEVEL 2: RHYTHM ZONE (11000px challenge)
    // ==========================================
    {
        meta: { 
            name: "Rhythm Zone", 
            width: 11000, 
            height: 360 
        },
        
        spawn: { 
            x: 80, 
            y: 280, 
            world: 'dark' 
        },

        platforms: [
            // === SECTION 1: RHYTHM INTRO (0-2500px) ===
            { id: 'ground-start', x: 0, y: 332, w: 400, h: 28, world: 'both' },
            
            // Rhythmic platform sequence
            { id: 'rhythm1', x: 550, y: 280, w: 80, h: 12, world: 'light' },
            { id: 'rhythm2', x: 750, y: 280, w: 80, h: 12, world: 'dark' },
            { id: 'rhythm3', x: 950, y: 280, w: 80, h: 12, world: 'light' },
            { id: 'rhythm4', x: 1150, y: 280, w: 80, h: 12, world: 'dark' },
            { id: 'rhythm5', x: 1350, y: 280, w: 80, h: 12, world: 'light' },
            
            { id: 'ground-2', x: 1550, y: 332, w: 350, h: 28, world: 'both' },
            
            // === SECTION 2: MOVING PLATFORM CORRIDOR (2000-5000px) ===
            { id: 'corridor-start', x: 2000, y: 332, w: 200, h: 28, world: 'both' },
            
            // Static platforms between movers
            { id: 'static1', x: 2500, y: 280, w: 60, h: 12, world: 'light' },
            { id: 'static2', x: 2900, y: 260, w: 60, h: 12, world: 'dark' },
            { id: 'static3', x: 3300, y: 240, w: 60, h: 12, world: 'light' },
            { id: 'static4', x: 3700, y: 220, w: 60, h: 12, world: 'dark' },
            { id: 'static5', x: 4100, y: 260, w: 60, h: 12, world: 'light' },
            { id: 'static6', x: 4500, y: 280, w: 60, h: 12, world: 'dark' },
            
            { id: 'ground-3', x: 4800, y: 332, w: 200, h: 28, world: 'both' },
            
            // === SECTION 3: MIDAIR SWAP CHALLENGE (5000-7500px) ===
            // Long jumps requiring midair swaps
            { id: 'launch1', x: 5150, y: 290, w: 80, h: 12, world: 'light' },
            { id: 'catch1', x: 5450, y: 270, w: 80, h: 12, world: 'dark' },
            
            { id: 'launch2', x: 5750, y: 290, w: 80, h: 12, world: 'dark' },
            { id: 'catch2', x: 6050, y: 270, w: 80, h: 12, world: 'light' },
            
            { id: 'launch3', x: 6350, y: 290, w: 60, h: 12, world: 'light' },
            { id: 'midair1', x: 6550, y: 250, w: 50, h: 12, world: 'dark' },
            { id: 'catch3', x: 6750, y: 270, w: 80, h: 12, world: 'light' },
            
            { id: 'ground-4', x: 6950, y: 332, w: 250, h: 28, world: 'both' },
            
            // === SECTION 4: SYNCHRONIZED MOVERS (7500-9500px) ===
            // Static platforms for mover section
            { id: 'sync-start', x: 7400, y: 280, w: 60, h: 12, world: 'both' },
            { id: 'sync-mid1', x: 7900, y: 260, w: 60, h: 12, world: 'both' },
            { id: 'sync-mid2', x: 8400, y: 240, w: 60, h: 12, world: 'both' },
            { id: 'sync-end', x: 8900, y: 280, w: 100, h: 12, world: 'both' },
            
            // === SECTION 5: FINALE (9500-11000px) ===
            { id: 'ground-5', x: 9100, y: 332, w: 200, h: 28, world: 'both' },
            
            // Complex rhythm sequence
            { id: 'finale1', x: 9400, y: 290, w: 50, h: 12, world: 'light' },
            { id: 'finale2', x: 9500, y: 270, w: 50, h: 12, world: 'dark' },
            { id: 'finale3', x: 9600, y: 250, w: 50, h: 12, world: 'light' },
            { id: 'finale4', x: 9700, y: 230, w: 50, h: 12, world: 'dark' },
            { id: 'finale5', x: 9800, y: 210, w: 50, h: 12, world: 'light' },
            { id: 'finale6', x: 9900, y: 230, w: 50, h: 12, world: 'dark' },
            { id: 'finale7', x: 10000, y: 250, w: 50, h: 12, world: 'light' },
            { id: 'finale8', x: 10100, y: 270, w: 50, h: 12, world: 'dark' },
            
            { id: 'ground-end', x: 10250, y: 332, w: 750, h: 28, world: 'both' }
        ],

        movers: [
            // Corridor movers - carefully timed
            {
                id: 'corridor-mover1',
                x: 2300, y: 280, w: 80, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 2300, y: 280 },
                to: { x: 2700, y: 280 },
                cycleMs: 3000
            },
            {
                id: 'corridor-mover2',
                x: 2700, y: 260, w: 80, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 2700, y: 260 },
                to: { x: 3100, y: 260 },
                cycleMs: 3000
            },
            {
                id: 'corridor-mover3',
                x: 3100, y: 240, w: 80, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 3100, y: 240 },
                to: { x: 3500, y: 240 },
                cycleMs: 3000
            },
            {
                id: 'corridor-mover4',
                x: 3500, y: 220, w: 80, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 3500, y: 220 },
                to: { x: 3900, y: 220 },
                cycleMs: 3000
            },
            {
                id: 'corridor-mover5',
                x: 3900, y: 260, w: 80, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 3900, y: 260 },
                to: { x: 4300, y: 260 },
                cycleMs: 3000
            },
            {
                id: 'corridor-mover6',
                x: 4300, y: 280, w: 80, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 4300, y: 280 },
                to: { x: 4700, y: 280 },
                cycleMs: 3000
            },
            
            // Synchronized vertical movers
            {
                id: 'sync-mover1',
                x: 7600, y: 200, w: 60, h: 12,
                world: 'light',
                axis: 'vertical',
                from: { x: 7600, y: 200 },
                to: { x: 7600, y: 320 },
                cycleMs: 2500
            },
            {
                id: 'sync-mover2',
                x: 7700, y: 320, w: 60, h: 12,
                world: 'dark',
                axis: 'vertical',
                from: { x: 7700, y: 320 },
                to: { x: 7700, y: 200 },
                cycleMs: 2500
            },
            {
                id: 'sync-mover3',
                x: 8100, y: 200, w: 60, h: 12,
                world: 'light',
                axis: 'vertical',
                from: { x: 8100, y: 200 },
                to: { x: 8100, y: 320 },
                cycleMs: 2500
            },
            {
                id: 'sync-mover4',
                x: 8200, y: 320, w: 60, h: 12,
                world: 'dark',
                axis: 'vertical',
                from: { x: 8200, y: 320 },
                to: { x: 8200, y: 200 },
                cycleMs: 2500
            },
            {
                id: 'sync-mover5',
                x: 8600, y: 200, w: 60, h: 12,
                world: 'light',
                axis: 'vertical',
                from: { x: 8600, y: 200 },
                to: { x: 8600, y: 320 },
                cycleMs: 2500
            },
            {
                id: 'sync-mover6',
                x: 8700, y: 320, w: 60, h: 12,
                world: 'dark',
                axis: 'vertical',
                from: { x: 8700, y: 320 },
                to: { x: 8700, y: 200 },
                cycleMs: 2500
            }
        ],

        spikes: [
            // Fixed spike gaps - all gaps are now 60px+ for safe landing
            { id: 'spike1', x: 1600, y: 320, w: 64, h: 12, attachedTo: 'ground-2' },
            // 66px gap
            { id: 'spike2', x: 1730, y: 320, w: 64, h: 12, attachedTo: 'ground-2' },
            // 66px gap
            { id: 'spike3', x: 1860, y: 320, w: 32, h: 12, attachedTo: 'ground-2' },
            
            { id: 'spike4', x: 2050, y: 320, w: 48, h: 12, attachedTo: 'corridor-start' },
            // 72px gap
            { id: 'spike5', x: 2170, y: 320, w: 24, h: 12, attachedTo: 'corridor-start' },
            
            { id: 'spike6', x: 4850, y: 320, w: 64, h: 12, attachedTo: 'ground-3' },
            // 66px gap
            { id: 'spike7', x: 4980, y: 320, w: 16, h: 12, attachedTo: 'ground-3' },
            
            { id: 'spike8', x: 7000, y: 320, w: 64, h: 12, attachedTo: 'ground-4' },
            // 70px gap
            { id: 'spike9', x: 7134, y: 320, w: 64, h: 12, attachedTo: 'ground-4' },
            
            { id: 'spike10', x: 9150, y: 320, w: 48, h: 12, attachedTo: 'ground-5' },
            // 62px gap
            { id: 'spike11', x: 9260, y: 320, w: 32, h: 12, attachedTo: 'ground-5' }
        ],

        doors: [
            {
                id: 'exit',
                type: 'exit',
                x: 10850, y: 280, w: 40, h: 52,
                world: 'both'
            }
        ]
    },

    // ==========================================
    // LEVEL 3: GAUNTLET (10000px ultimate challenge)
    // ==========================================
    {
        meta: { 
            name: "Gauntlet", 
            width: 10000, 
            height: 360 
        },
        
        spawn: { 
            x: 60, 
            y: 280, 
            world: 'light' 
        },

        platforms: [
            // === SECTION 1: SPIKE CORRIDOR (0-2000px) ===
            { id: 'ground-start', x: 0, y: 332, w: 200, h: 28, world: 'both' },
            
            // Spike field ground with gaps
            { id: 'spike-ground1', x: 200, y: 332, w: 200, h: 28, world: 'both' },
            { id: 'spike-ground2', x: 450, y: 332, w: 200, h: 28, world: 'both' },
            { id: 'spike-ground3', x: 700, y: 332, w: 200, h: 28, world: 'both' },
            { id: 'spike-ground4', x: 950, y: 332, w: 250, h: 28, world: 'both' },
            
            // Platforms over spike fields
            { id: 'spike-hop1', x: 250, y: 280, w: 50, h: 12, world: 'light' },
            { id: 'spike-hop2', x: 350, y: 260, w: 50, h: 12, world: 'dark' },
            { id: 'spike-hop3', x: 500, y: 240, w: 50, h: 12, world: 'light' },
            { id: 'spike-hop4', x: 600, y: 220, w: 50, h: 12, world: 'dark' },
            { id: 'spike-hop5', x: 750, y: 200, w: 50, h: 12, world: 'light' },
            { id: 'spike-hop6', x: 850, y: 220, w: 50, h: 12, world: 'dark' },
            { id: 'spike-hop7', x: 1000, y: 240, w: 50, h: 12, world: 'light' },
            { id: 'spike-hop8', x: 1100, y: 260, w: 50, h: 12, world: 'dark' },
            
            { id: 'ground-2', x: 1200, y: 332, w: 250, h: 28, world: 'both' },
            
            // === SECTION 2: HUGE GAPS (1500-4000px) ===
            { id: 'gap-start', x: 1550, y: 280, w: 80, h: 12, world: 'both' },
            
            // Multi-swap gap 1
            { id: 'swap1-light', x: 1750, y: 260, w: 50, h: 12, world: 'light' },
            { id: 'swap1-dark', x: 1900, y: 240, w: 50, h: 12, world: 'dark' },
            { id: 'swap1-light2', x: 2050, y: 220, w: 50, h: 12, world: 'light' },
            { id: 'swap1-end', x: 2200, y: 280, w: 80, h: 12, world: 'both' },
            
            // Multi-swap gap 2
            { id: 'swap2-dark', x: 2400, y: 260, w: 50, h: 12, world: 'dark' },
            { id: 'swap2-light', x: 2550, y: 240, w: 50, h: 12, world: 'light' },
            { id: 'swap2-dark2', x: 2700, y: 220, w: 50, h: 12, world: 'dark' },
            { id: 'swap2-end', x: 2850, y: 280, w: 80, h: 12, world: 'both' },
            
            { id: 'ground-3', x: 3050, y: 332, w: 300, h: 28, world: 'both' },
            
            // === SECTION 3: ALTERNATING STAIRCASES (3500-5500px) ===
            // Light-only ascending staircase
            { id: 'light-stair1', x: 3500, y: 320, w: 60, h: 12, world: 'light' },
            { id: 'light-stair2', x: 3620, y: 300, w: 60, h: 12, world: 'light' },
            { id: 'light-stair3', x: 3740, y: 280, w: 60, h: 12, world: 'light' },
            { id: 'light-stair4', x: 3860, y: 260, w: 60, h: 12, world: 'light' },
            { id: 'light-stair5', x: 3980, y: 240, w: 60, h: 12, world: 'light' },
            { id: 'light-stair6', x: 4100, y: 220, w: 60, h: 12, world: 'light' },
            { id: 'light-stair7', x: 4220, y: 200, w: 60, h: 12, world: 'light' },
            
            // Dark-only descending staircase
            { id: 'dark-stair1', x: 4380, y: 200, w: 60, h: 12, world: 'dark' },
            { id: 'dark-stair2', x: 4500, y: 220, w: 60, h: 12, world: 'dark' },
            { id: 'dark-stair3', x: 4620, y: 240, w: 60, h: 12, world: 'dark' },
            { id: 'dark-stair4', x: 4740, y: 260, w: 60, h: 12, world: 'dark' },
            { id: 'dark-stair5', x: 4860, y: 280, w: 60, h: 12, world: 'dark' },
            { id: 'dark-stair6', x: 4980, y: 300, w: 60, h: 12, world: 'dark' },
            { id: 'dark-stair7', x: 5100, y: 320, w: 60, h: 12, world: 'dark' },
            
            { id: 'ground-4', x: 5250, y: 332, w: 300, h: 28, world: 'both' },
            
            // === SECTION 4: MOVING CHAOS (5800-7800px) ===
            // Static platforms between movers
            { id: 'chaos-start', x: 5700, y: 280, w: 60, h: 12, world: 'both' },
            { id: 'chaos-mid1', x: 6200, y: 260, w: 50, h: 12, world: 'light' },
            { id: 'chaos-mid2', x: 6500, y: 240, w: 50, h: 12, world: 'dark' },
            { id: 'chaos-mid3', x: 6800, y: 220, w: 50, h: 12, world: 'light' },
            { id: 'chaos-mid4', x: 7100, y: 240, w: 50, h: 12, world: 'dark' },
            { id: 'chaos-mid5', x: 7400, y: 260, w: 50, h: 12, world: 'light' },
            { id: 'chaos-end', x: 7700, y: 280, w: 100, h: 12, world: 'both' },
            
            { id: 'ground-5', x: 7900, y: 332, w: 200, h: 28, world: 'both' },
            
            // === SECTION 5: TRIPLE-SWAP FINALE (8200-10000px) ===
            // Launch platform
            { id: 'finale-start', x: 8200, y: 290, w: 80, h: 12, world: 'light' },
            
            // Triple swap sequence
            { id: 'triple1', x: 8400, y: 250, w: 50, h: 12, world: 'dark' },
            { id: 'triple2', x: 8550, y: 210, w: 50, h: 12, world: 'light' },
            { id: 'triple3', x: 8700, y: 170, w: 50, h: 12, world: 'dark' },
            
            // Final platform before exit
            { id: 'finale-land', x: 8900, y: 200, w: 120, h: 12, world: 'both' },
            
            // Exit platform
            { id: 'ground-end', x: 9200, y: 332, w: 800, h: 28, world: 'both' }
        ],

        movers: [
            // Moving chaos section
            {
                id: 'chaos-mover1',
                x: 5900, y: 260, w: 70, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 5800, y: 260 },
                to: { x: 6100, y: 260 },
                cycleMs: 2000
            },
            {
                id: 'chaos-mover2',
                x: 6350, y: 240, w: 60, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 6300, y: 240 },
                to: { x: 6400, y: 240 },
                cycleMs: 1500
            },
            {
                id: 'chaos-mover3',
                x: 6650, y: 220, w: 60, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 6600, y: 220 },
                to: { x: 6700, y: 220 },
                cycleMs: 1500
            },
            {
                id: 'chaos-mover4',
                x: 6950, y: 240, w: 60, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 6900, y: 240 },
                to: { x: 7000, y: 240 },
                cycleMs: 1500
            },
            {
                id: 'chaos-mover5',
                x: 7250, y: 260, w: 60, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 7200, y: 260 },
                to: { x: 7300, y: 260 },
                cycleMs: 1500
            },
            {
                id: 'chaos-mover6',
                x: 7550, y: 280, w: 60, h: 12,
                world: 'both',
                axis: 'horizontal',
                from: { x: 7500, y: 280 },
                to: { x: 7600, y: 280 },
                cycleMs: 2000
            },
            
            // Vertical mover for finale approach
            {
                id: 'finale-lift',
                x: 9050, y: 200, w: 60, h: 12,
                world: 'both',
                axis: 'vertical',
                from: { x: 9050, y: 200 },
                to: { x: 9050, y: 320 },
                cycleMs: 3000
            }
        ],

        spikes: [
            // Fixed spike gaps - all gaps are now 60px+ for safe landing
            { id: 'spike1', x: 210, y: 320, w: 64, h: 12, attachedTo: 'spike-ground1' },
            // 60px gap
            { id: 'spike2', x: 334, y: 320, w: 64, h: 12, attachedTo: 'spike-ground1' },
            
            { id: 'spike3', x: 460, y: 320, w: 64, h: 12, attachedTo: 'spike-ground2' },
            // 60px gap
            { id: 'spike4', x: 584, y: 320, w: 64, h: 12, attachedTo: 'spike-ground2' },
            
            { id: 'spike5', x: 710, y: 320, w: 64, h: 12, attachedTo: 'spike-ground3' },
            // 60px gap
            { id: 'spike6', x: 834, y: 320, w: 64, h: 12, attachedTo: 'spike-ground3' },
            
            { id: 'spike7', x: 960, y: 320, w: 80, h: 12, attachedTo: 'spike-ground4' },
            // 60px gap
            { id: 'spike8', x: 1100, y: 320, w: 96, h: 12, attachedTo: 'spike-ground4' },
            
            { id: 'spike9', x: 1250, y: 320, w: 48, h: 12, attachedTo: 'ground-2' },
            // 62px gap
            { id: 'spike10', x: 1360, y: 320, w: 64, h: 12, attachedTo: 'ground-2' },
            
            { id: 'spike11', x: 3100, y: 320, w: 64, h: 12, attachedTo: 'ground-3' },
            // 66px gap
            { id: 'spike12', x: 3230, y: 320, w: 96, h: 12, attachedTo: 'ground-3' },
            
            { id: 'spike13', x: 5300, y: 320, w: 64, h: 12, attachedTo: 'ground-4' },
            // 66px gap
            { id: 'spike14', x: 5430, y: 320, w: 96, h: 12, attachedTo: 'ground-4' },
            
            { id: 'spike15', x: 7950, y: 320, w: 48, h: 12, attachedTo: 'ground-5' },
            // 62px gap
            { id: 'spike16', x: 8060, y: 320, w: 32, h: 12, attachedTo: 'ground-5' }
        ],

        doors: [
            {
                id: 'exit',
                type: 'exit',
                x: 9850, y: 280, w: 40, h: 52,
                world: 'both'
            }
        ]
    }
];
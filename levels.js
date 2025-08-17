// levels.js - Hand-authored level data for VibeCodingGame
// Each level is fully independent with no cross-level references

const LEVELS = [
    {
        meta: { 
            name: "Tutorial Valley", 
            width: 2400, 
            height: 360 
        },
        
        spawn: { 
            x: 64, 
            y: 280, 
            world: 'light' 
        },

        platforms: [
            // Full-width ground (both worlds)
            { id: 'ground', x: 0, y: 332, w: 2400, h: 28, world: 'both' },
            
            // Light world mid platforms
            { id: 'light-start', x: 200, y: 260, w: 120, h: 12, world: 'light' },
            { id: 'light-mid1', x: 500, y: 200, w: 100, h: 12, world: 'light' },
            { id: 'light-mid2', x: 800, y: 240, w: 140, h: 12, world: 'light' },
            { id: 'light-upper', x: 1200, y: 160, w: 100, h: 12, world: 'light' },
            { id: 'light-final', x: 1800, y: 200, w: 120, h: 12, world: 'light' },
            
            // Dark world mid platforms  
            { id: 'dark-start', x: 150, y: 220, w: 100, h: 12, world: 'dark' },
            { id: 'dark-mid1', x: 400, y: 280, w: 120, h: 12, world: 'dark' },
            { id: 'dark-mid2', x: 700, y: 160, w: 100, h: 12, world: 'dark' },
            { id: 'dark-upper', x: 1100, y: 240, w: 140, h: 12, world: 'dark' },
            { id: 'dark-final', x: 1900, y: 260, w: 100, h: 12, world: 'dark' },
            
            // Some both-world platforms for strategic placement
            { id: 'both-bridge1', x: 600, y: 300, w: 80, h: 12, world: 'both' },
            { id: 'both-bridge2', x: 1400, y: 280, w: 100, h: 12, world: 'both' },
        ],

        movers: [
            // Horizontal mover in mid-section (both worlds)
            {
                id: 'horizontal-shuttle',
                x: 900, y: 280, w: 80, h: 12,
                world: 'both',
                axis: 'horizontal',
                speed: 60,
                from: { x: 900, y: 280 },
                to: { x: 1050, y: 280 },
                cycleMs: 3000
            },
            
            // Vertical mover (light world only)
            {
                id: 'vertical-lift',
                x: 1600, y: 200, w: 60, h: 12,
                world: 'light',
                axis: 'vertical',
                speed: 40,
                from: { x: 1600, y: 200 },
                to: { x: 1600, y: 300 },
                cycleMs: 4000
            },
            
            // Another horizontal mover (dark world)
            {
                id: 'dark-shuttle',
                x: 300, y: 180, w: 70, h: 12,
                world: 'dark',
                axis: 'horizontal',
                speed: 45,
                from: { x: 300, y: 180 },
                to: { x: 450, y: 180 },
                cycleMs: 3500
            }
        ],

        spikes: [
            // Triangular spikes attached to ground (inherits 'both' world from ground)
            { id: 'ground-spikes1', x: 360, y: 320, w: 80, h: 12, attachedTo: 'ground' },
            { id: 'ground-spikes2', x: 750, y: 320, w: 96, h: 12, attachedTo: 'ground' },
            { id: 'ground-spikes3', x: 1300, y: 320, w: 64, h: 12, attachedTo: 'ground' },
            { id: 'ground-spikes4', x: 2000, y: 320, w: 112, h: 12, attachedTo: 'ground' },
            
            // Spikes on light world platforms (inherits 'light' world)
            { id: 'light-platform-spikes1', x: 520, y: 188, w: 48, h: 12, attachedTo: 'light-mid1' },
            { id: 'light-platform-spikes2', x: 1820, y: 188, w: 64, h: 12, attachedTo: 'light-final' },
            
            // Spikes on dark world platforms (inherits 'dark' world)  
            { id: 'dark-platform-spikes1', x: 720, y: 148, w: 64, h: 12, attachedTo: 'dark-mid2' },
            { id: 'dark-platform-spikes2', x: 420, y: 268, w: 80, h: 12, attachedTo: 'dark-mid1' },
            
            // Spikes on both-world platforms (inherits 'both' world)
            { id: 'both-bridge-spikes', x: 620, y: 288, w: 32, h: 12, attachedTo: 'both-bridge1' },
        ],

        doors: [
            // Exit door at the far right
            {
                id: 'level-exit',
                type: 'exit',
                x: 2320, y: 280, w: 20, h: 40,
                world: 'both'
            }
        ]
    },

    // Additional test level for variety
    {
        meta: { 
            name: "Spike Gauntlet", 
            width: 1800, 
            height: 360 
        },
        
        spawn: { 
            x: 80, 
            y: 280, 
            world: 'dark' 
        },

        platforms: [
            // Ground with gaps
            { id: 'ground-start', x: 0, y: 332, w: 400, h: 28, world: 'both' },
            { id: 'ground-mid', x: 600, y: 332, w: 400, h: 28, world: 'both' },
            { id: 'ground-end', x: 1200, y: 332, w: 600, h: 28, world: 'both' },
            
            // Challenging platforming section
            { id: 'challenge1', x: 450, y: 280, w: 60, h: 12, world: 'light' },
            { id: 'challenge2', x: 550, y: 240, w: 60, h: 12, world: 'dark' },
            { id: 'challenge3', x: 1050, y: 260, w: 80, h: 12, world: 'light' },
            { id: 'challenge4', x: 1400, y: 200, w: 100, h: 12, world: 'dark' },
        ],

        movers: [
            {
                id: 'danger-platform',
                x: 700, y: 200, w: 100, h: 12,
                world: 'both',
                axis: 'vertical',
                speed: 50,
                from: { x: 700, y: 200 },
                to: { x: 700, y: 320 },
                cycleMs: 2500
            }
        ],

        spikes: [
            // Triangular spikes in the deadly pits (attached to ground segments)
            { id: 'pit-spikes1', x: 400, y: 320, w: 200, h: 12, attachedTo: 'ground-start' },
            { id: 'pit-spikes2', x: 1000, y: 320, w: 200, h: 12, attachedTo: 'ground-mid' },
            
            // Ceiling spikes attached to invisible ceiling platform
            { id: 'ceiling-spikes', x: 600, y: 0, w: 400, h: 12, world: 'both' }, // No attachment - ceiling spikes
            
            // Platform-attached spikes for extra challenge
            { id: 'challenge-spikes1', x: 465, y: 268, w: 32, h: 12, attachedTo: 'challenge1' },
            { id: 'challenge-spikes2', x: 1420, y: 188, w: 64, h: 12, attachedTo: 'challenge4' },
        ],

        doors: [
            {
                id: 'level2-exit',
                type: 'exit', 
                x: 1720, y: 280, w: 20, h: 40,
                world: 'both'
            }
        ]
    },
    
    // TEST LEVEL: Wide level with scrolling camera and death pits
    {
        meta: { 
            name: "Wide Canyon Test", 
            width: 3200,  // 5x wider than screen (640px)
            height: 360 
        },
        
        spawn: { x: 80, y: 300, world: 'light' },
        
        platforms: [
            // Left ground section (safe area)
            { id: 'ground-left', x: 0, y: 332, w: 800, h: 28, world: 'both' },
            
            // Some platforms in left area for testing
            { id: 'plat-left-1', x: 200, y: 280, w: 120, h: 12, world: 'light' },
            { id: 'plat-left-2', x: 400, y: 220, w: 120, h: 12, world: 'dark' },
            { id: 'plat-left-3', x: 600, y: 260, w: 80, h: 12, world: 'both' },
            
            // BIG GAP HERE (800px to 1600px = 800px wide death pit!)
            // This tests the death pit mechanic - player will fall and die
            
            // Small island platform in the middle of the pit (optional challenge)
            { id: 'island-platform', x: 1150, y: 280, w: 100, h: 12, world: 'both' },
            
            // Right ground section (after the pit)
            { id: 'ground-right', x: 1600, y: 332, w: 1600, h: 28, world: 'both' },
            
            // Right area platforms
            { id: 'plat-right-1', x: 1800, y: 280, w: 120, h: 12, world: 'light' },
            { id: 'plat-right-2', x: 2200, y: 220, w: 120, h: 12, world: 'dark' },
            { id: 'plat-right-3', x: 2600, y: 260, w: 140, h: 12, world: 'both' },
            { id: 'plat-right-4', x: 2900, y: 200, w: 100, h: 12, world: 'light' }
        ],
        
        movers: [
            // Moving platform that helps cross part of the gap
            { 
                id: 'gap-helper', 
                x: 900, y: 300, w: 80, h: 12, 
                world: 'both', 
                axis: 'horizontal', 
                speed: 50,
                from: { x: 900, y: 300 }, 
                to: { x: 1100, y: 300 }, 
                cycleMs: 4000 
            },
            
            // Another mover in the right section
            { 
                id: 'right-mover', 
                x: 2000, y: 180, w: 60, h: 12, 
                world: 'light', 
                axis: 'vertical', 
                speed: 40,
                from: { x: 2000, y: 180 }, 
                to: { x: 2000, y: 280 }, 
                cycleMs: 3000 
            }
        ],
        
        spikes: [
            // Triangular spikes attached to ground platforms
            { id: 'left-ground-spikes', x: 300, y: 320, w: 64, h: 12, attachedTo: 'ground-left' },
            { id: 'right-ground-spikes1', x: 2400, y: 320, w: 80, h: 12, attachedTo: 'ground-right' },
            { id: 'right-ground-spikes2', x: 2800, y: 320, w: 96, h: 12, attachedTo: 'ground-right' },
            
            // Platform spikes (inherit world properties)
            { id: 'left-platform-spikes', x: 420, y: 208, w: 48, h: 12, attachedTo: 'plat-left-2' },
            { id: 'island-spikes', x: 1170, y: 268, w: 64, h: 12, attachedTo: 'island-platform' },
            { id: 'right-platform-spikes', x: 2620, y: 248, w: 80, h: 12, attachedTo: 'plat-right-3' },
        ],
        
        doors: [
            { id: 'test-exit', type: 'exit', x: 3120, y: 280, w: 40, h: 52, world: 'both' }
        ]
    }
];

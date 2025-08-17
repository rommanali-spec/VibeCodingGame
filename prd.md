# VibeCodingGame PRD

## Game Concept
- 2D 8-bit platformer with Light World and Dark World.
- Reduced gravity in Dark World.
- Progress through levels by reaching and interacting with a door.
- Optional collectibles: 3 stars per level.
- Moving platforms for traversal.
- Swap worlds mechanic works anywhere, respecting collisions.

## Player Mechanics
- Controls:
  - A → move left
  - D → move right
  - W → jump
  - Space → swap worlds
  - E → interact with doors and levers
- Start in Light World on a both-world stationary platform.
- Jump with defined initial velocity; movement and jump can combine.
- Swapping Worlds:
  - Mid-air or on ground
  - Swap fails if destination overlaps platform, hazard, or lever → Swap Failed message
  - 0.5-second cooldown
  - Gravity updates immediately

## Platforms
- Both-World Platforms: exist in Light and Dark Worlds
- Light-Only Platforms: exist only in Light World
- Dark-Only Platforms: exist only in Dark World
- Moving Platforms: horizontal/vertical paths; carry player; can exist in Light, Dark, or Both Worlds
- Collisions: full on all sides; no one-way platforms

## Hazards
- Spikes kill on contact
- Exist in Light, Dark, or Both Worlds
- Player respawns at level start; timer resets

## Level Features

### Door
- Level exit; interact using E
- Can be locked/unlocked via lever
- Exists in Light, Dark, or Both Worlds

### Levers
- Interact using E
- Toggle one or more targets (doors or platforms)
- Visual indication shows current state
- Can exist in Light, Dark, or Both Worlds
- Can control multiple targets simultaneously

### Optional Stars
- 3 per level; collectible
- Exist in Light, Dark, or Both Worlds

### Level Boundaries
- Horizontal: cannot leave screen
- Vertical: falling below bottom = death

## Timer & Score
- Starts at level start; shows minutes:seconds:milliseconds
- Resets on death
- Fastest time per level is saved

## Visuals & UI
- 8-bit art style
- Light/Dark tint overlays
- Swap Failed message appears on failed swap
- Visual indicators for: moving platforms, lever states, doors, collected stars
- Optional particle effects for swaps and lever interactions

## Input Handling
- Single jump per W press
- Movement works with jump
- Swap respects cooldown
- E interacts with doors and levers

## Edge Cases & Mechanics
- Swap collision prevents appearing inside platforms, hazards, or levers
- Player can die immediately after swap if swapped into hazard
- Moving platforms carry player across gaps
- Gravity changes immediately on world swap
- Levels are fully testable individually
- Smooth movement, responsive jumps, seamless swaps

## Full Element Inventory
- Player character
- Light World overlay
- Dark World overlay
- Both-World Platforms
- Light-Only Platforms
- Dark-Only Platforms
- Moving Platforms (Light, Dark, or Both Worlds)
- Spikes hazards (Light, Dark, or Both Worlds)
- Level Door (Light, Dark, or Both Worlds; interactive via E)
- Levers (Light, Dark, or Both Worlds; interactive via E)
- Optional Stars (Light, Dark, or Both Worlds)
- Timer with milliseconds
- Fastest time saving
- Swap Failed message
- Particle effects (swap and lever interaction)
- Level boundaries
- Gravity rules
- Swap cooldown & freeze mechanics
- Collision and edge-case handling for all interactions

// Vibe Coding Game - Main JavaScript File

// DOM elements
const startBtn = document.getElementById('start-btn');
const app = document.getElementById('app');

// Game state
let gameStarted = false;

// Initialize the game
function init() {
    console.log('Vibe Coding Game initialized!');
    
    // Add event listeners
    startBtn.addEventListener('click', startGame);
}

// Start the game
function startGame() {
    if (gameStarted) return;
    
    gameStarted = true;
    console.log('Game started!');
    
    // Update UI
    startBtn.textContent = 'Game Running...';
    startBtn.disabled = true;
    
    // Add your game logic here
    setTimeout(() => {
        alert('Welcome to the Vibe Coding Game! Ready to code?');
    }, 500);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);


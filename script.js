import anime from 'animejs';

const bear = document.getElementById('bear');
const world = document.getElementById('world');
const scoreDisplay = document.getElementById('score');
const messageContainer = document.getElementById('message-container');
const messageEl = document.getElementById('message');
const gameContainer = document.getElementById('game-container');

let score = 0;
let gameState = 'start'; // 'start', 'playing', 'gameover'
let currentFish = null;
let fishAnimation = null;
let baseSpawnTime = 2000;
let minSpawnTime = 600;
let spawnTime = baseSpawnTime;

// --- Sound ---
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const soundBuffers = {};

async function loadSound(name, url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        soundBuffers[name] = audioBuffer;
    } catch (error) {
        console.error(`Failed to load sound: ${name}`, error);
    }
}

function playSound(name) {
    if (!soundBuffers[name] || audioContext.state === 'suspended') return;
    const source = audioContext.createBufferSource();
    source.buffer = soundBuffers[name];
    source.connect(audioContext.destination);
    source.start(0);
}

loadSound('catch', './catch.mp3');
loadSound('miss', './miss.mp3');

// --- Game Logic ---
function startGame() {
    gameState = 'playing';
    score = 0;
    spawnTime = baseSpawnTime;
    updateScore();
    scoreDisplay.classList.add('visible');
    messageContainer.classList.add('hidden');
    bear.className = '';
    
    setTimeout(spawnFish, 1000);
}

function gameOver() {
    gameState = 'gameover';
    playSound('miss');
    bear.classList.add('fall');
    if (currentFish) {
        currentFish.remove();
        currentFish = null;
    }
    if(fishAnimation) fishAnimation.pause();

    messageEl.innerHTML = `<h1>Game Over</h1><p>Score: ${score}</p><p>Tap to restart</p>`;
    messageContainer.classList.remove('hidden');
    scoreDisplay.classList.remove('visible');
}

function updateScore() {
    scoreDisplay.textContent = score;
}

function spawnFish() {
    if (gameState !== 'playing') return;

    currentFish = document.createElement('div');
    currentFish.classList.add('fish');
    world.appendChild(currentFish);

    const isFromLeft = Math.random() > 0.5;
    const startX = isFromLeft ? -30 : world.offsetWidth + 30;
    const endX = isFromLeft ? world.offsetWidth + 30 : -30;
    
    const arcHeight = Math.random() * (world.offsetHeight * 0.4) + (world.offsetHeight * 0.2);
    const duration = Math.random() * 500 + 1500;

    const path = [
        { value: `translateX(${startX}px) translateY(0px) rotate(${isFromLeft ? 45 : -45}deg)` },
        { value: `translateX(${world.offsetWidth / 2}px) translateY(${-arcHeight}px) rotate(0deg)` },
        { value: `translateX(${endX}px) translateY(0px) rotate(${isFromLeft ? -45 : 45}deg)` },
    ];

    fishAnimation = anime({
        targets: currentFish,
        transform: path,
        easing: 'linear',
        duration: duration,
        begin: () => {
             currentFish.style.bottom = `${Math.random() * 15 + 5}%`;
        },
        complete: () => {
            if (currentFish) {
                // Fish was missed
                gameOver();
            }
        }
    });
}

function handleCatchAttempt() {
    if (gameState !== 'playing') return;

    bear.classList.add('catch');
    setTimeout(() => bear.classList.remove('catch'), 150);

    if (!currentFish) return;

    const fishRect = currentFish.getBoundingClientRect();
    const bearRect = bear.getBoundingClientRect();
    
    // Define a catch zone relative to the bear
    const catchZone = {
        top: bearRect.top - 20,
        bottom: bearRect.top + bearRect.height * 0.7,
        left: bearRect.left,
        right: bearRect.right
    };

    const fishCenterY = fishRect.top + fishRect.height / 2;
    const fishCenterX = fishRect.left + fishRect.width / 2;

    if (
        fishCenterX > catchZone.left &&
        fishCenterX < catchZone.right &&
        fishCenterY > catchZone.top &&
        fishCenterY < catchZone.bottom
    ) {
        // Success!
        fishAnimation.pause();
        currentFish.remove();
        currentFish = null;
        
        playSound('catch');
        score++;
        updateScore();

        // Increase difficulty
        spawnTime = Math.max(minSpawnTime, spawnTime * 0.95);
        
        setTimeout(spawnFish, spawnTime);
    }
}

function handleInput() {
    // Resume audio context on user gesture
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    switch (gameState) {
        case 'start':
            startGame();
            break;
        case 'playing':
            handleCatchAttempt();
            break;
        case 'gameover':
            startGame();
            break;
    }
}

gameContainer.addEventListener('mousedown', handleInput);
gameContainer.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
});
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        handleInput();
    }
});


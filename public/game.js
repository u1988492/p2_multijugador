// Lógica del juego

// Obtener parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('game_id');
let playerId = getCookie('snake_player_id');

if (!gameId) {
  alert('No game ID provided');
  window.location.href = 'lobby.html';
}

// Estado del juego
let gameState = null;
let playerNumber = null;
let lastDirectionChange = 0;
const inputCooldown = 100; // ms entre cambios de dirección

// Canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const cellSize = 20;
const gridSize = 40;

// Polling
let pollInterval = setInterval(pollGameState, 200);
let pingInterval = setInterval(sendPing, 2000);

// Controles
document.addEventListener('keydown', handleKeyPress);

// FUNCIONES 

// Obtener cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Polling del estado del juego
async function pollGameState() {
  try {
    const response = await fetch(`snake_game.php?action=get_state&game_id=${gameId}&player_id=${playerId}`);
    const data = await response.json();
    
    if (data.error) {
      console.error('Error:', data.error);
      return;
    }
    
    gameState = data;
    playerNumber = data.player_number;
    
    // Actualizar UI
    updateUI();
    
    // Renderizar juego
    if (data.game_status === 'waiting') {
      document.getElementById('waitingScreen').style.display = 'block';
      document.getElementById('gameScreen').style.display = 'none';
    } else if (data.game_status === 'playing') {
      document.getElementById('waitingScreen').style.display = 'none';
      document.getElementById('gameScreen').style.display = 'block';
      renderGame();
    } else if (data.game_status === 'finished') {
      document.getElementById('gameScreen').style.display = 'block';
      renderGame();
      showGameOver();
      clearInterval(pollInterval);
      clearInterval(pingInterval);
    }
  } catch (error) {
    console.error('Poll error:', error);
  }
}

// Actualizar información de jugadores
function updateUI() {
  if (!gameState) return;
  
  const p1 = gameState.players.player1;
  const p2 = gameState.players.player2;
  
  document.getElementById('p1Name').textContent = p1.name;
  document.getElementById('p1Score').textContent = p1.score;
  document.getElementById('p1Color').style.background = p1.color;
  
  if (p2) {
    document.getElementById('p2Name').textContent = p2.name;
    document.getElementById('p2Score').textContent = p2.score;
    document.getElementById('p2Color').style.background = p2.color;
  }
  
  // Latencia
  if (gameState.your_latency !== null) {
    const latency = gameState.your_latency;
    const display = document.getElementById('latencyDisplay');
    display.textContent = `Ping: ${latency}ms`;
    display.className = 'latency';
    if (latency < 50) display.classList.add('good');
    else if (latency < 150) display.classList.add('fair');
    else display.classList.add('poor');
  }
}

// Renderizar juego en canvas
function renderGame() {
  if (!gameState) return;
  
  // Limpiar canvas
  ctx.fillStyle = '#ecf0f1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Dibujar grid
  ctx.strokeStyle = '#bdc3c7';
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridSize; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(canvas.width, i * cellSize);
    ctx.stroke();
  }
  
  // Dibujar frutas
  gameState.fruits.forEach(fruit => {
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(
      fruit.x * cellSize + cellSize / 2,
      fruit.y * cellSize + cellSize / 2,
      cellSize / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });
  
  // Dibujar serpiente 1
  if (gameState.players.player1.snake) {
    drawSnake(gameState.players.player1.snake, gameState.players.player1.color);
  }
  
  // Dibujar serpiente 2
  if (gameState.players.player2 && gameState.players.player2.snake) {
    drawSnake(gameState.players.player2.snake, gameState.players.player2.color);
  }
}

// Dibujar serpiente
function drawSnake(snake, color) {
  snake.forEach((cell, index) => {
    ctx.fillStyle = color;
    if (index === 0) {
      // Cabeza
      ctx.globalAlpha = 1;
      ctx.fillRect(cell.x * cellSize + 1, cell.y * cellSize + 1, cellSize - 2, cellSize - 2);
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 3;
      ctx.strokeRect(cell.x * cellSize + 1, cell.y * cellSize + 1, cellSize - 2, cellSize - 2);
    } else {
      // Cuerpo, más oscuro
      ctx.globalAlpha = 0.7;
      ctx.fillRect(cell.x * cellSize + 2, cell.y * cellSize + 2, cellSize - 4, cellSize - 4);
    }
  });
  ctx.globalAlpha = 1;
}

// Manejar teclas
async function handleKeyPress(e) {
  if (!gameState || gameState.game_status !== 'playing') return;
  if (!playerNumber) return;
  
  let direction = null;
  let isGameKey = false;
  
  // Jugador 1: WASD 
  if (playerNumber === 1) {
    const key = e.key.toLowerCase();
    if (key === 'w') { direction = 'up'; isGameKey = true; }
    else if (key === 's') { direction = 'down'; isGameKey = true; }
    else if (key === 'a') { direction = 'left'; isGameKey = true; }
    else if (key === 'd') { direction = 'right'; isGameKey = true; }
  }
  
  // Jugador 2: Flechas
  if (playerNumber === 2) {
    if (e.key === 'ArrowUp') { direction = 'up'; isGameKey = true; }
    else if (e.key === 'ArrowDown') { direction = 'down'; isGameKey = true; }
    else if (e.key === 'ArrowLeft') { direction = 'left'; isGameKey = true; }
    else if (e.key === 'ArrowRight') { direction = 'right'; isGameKey = true; }
  }
  
  // Si es una tecla del juego, prevenir comportamiento por defecto
  if (isGameKey) {
    e.preventDefault();
    
    // Cooldown para evitar spam
    const now = Date.now();
    if (now - lastDirectionChange < inputCooldown) return;
    
    lastDirectionChange = now;
    await setDirection(direction);
  }
}

// Enviar cambio de dirección al servidor
async function setDirection(direction) {
  try {
    const formData = new FormData();
    formData.append('game_id', gameId);
    formData.append('player_id', playerId);
    formData.append('direction', direction);
    
    const response = await fetch('snake_game.php?action=set_direction', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    if (data.ignored) {
      // Feedback visual breve cuando se intenta revertir
      flashFeedback('¡No puedes revertir!');
    }
  } catch (error) {
    console.error('Error setting direction:', error);
  }
}

// Mostrar feedback temporal
function flashFeedback(message) {
  const existing = document.getElementById('flashFeedback');
  if (existing) existing.remove();
  
  const feedback = document.createElement('div');
  feedback.id = 'flashFeedback';
  feedback.textContent = message;
  feedback.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(231, 76, 60, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: bold;
    z-index: 999;
    animation: fadeInOut 0.8s ease-in-out;
  `;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 800);
}

// Enviar ping
async function sendPing() {
  try {
    const clientTime = Date.now() / 1000;
    const response = await fetch(`snake_game.php?action=ping&game_id=${gameId}&player_id=${playerId}&client_timestamp=${clientTime}`);
    await response.json();
  } catch (error) {
    console.error('Ping error:', error);
  }
}

// Mostrar pantalla de game over
function showGameOver() {
  if (!gameState) return;
  
  const gameOver = document.getElementById('gameOver');
  const message = document.getElementById('gameOverMessage');
  const scores = document.getElementById('finalScores');
  
  const p1 = gameState.players.player1;
  const p2 = gameState.players.player2;
  
  if (gameState.winner === playerId) {
    message.innerHTML = '<div class="winner">¡HAS GANADO! 🎉</div>';
  } else {
    message.innerHTML = '<div class="loser">Has perdido 😢</div>';
  }
  
  scores.innerHTML = `
    <div>${p1.name}: ${p1.score} puntos</div>
    <div>${p2.name}: ${p2.score} puntos</div>
  `;
  
  gameOver.classList.add('show');
}

// Iniciar
pollGameState();
sendPing();
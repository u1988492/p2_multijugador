/**
 * Genera un color brillante aleatorio en formato hexadecimal
 * Usa HSL para garantizar colores vivos y visualmente atractivos
 * 
 * @returns {string} Color en formato #RRGGBB
 */
function randomBrightColor() {
  const h = Math.floor(Math.random() * 360); // Matiz aleatorio (0-360°)
  return `#${hslToHex(h, 90, 60)}`; // Alta saturación y luminosidad media
}

/**
 * Convierte un color HSL a formato hexadecimal
 * 
 * @param {number} h - Matiz (0-360)
 * @param {number} s - Saturación (0-100)
 * @param {number} l - Luminosidad (0-100)
 * @returns {string} Color en formato hexadecimal (sin #)
 */
function hslToHex(h, s, l) {
  l /= 100; 
  s /= 100;
  
  // Cálculo del componente de croma
  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c/2,
      r = 0, g = 0, b = 0;
  
  // Determinar RGB base según el matiz
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  // Ajustar a rango 0-255
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  // Convertir a hexadecimal
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Inicializa color al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('playerColor').value = randomBrightColor();
  loadGames();
  setInterval(loadGames, 2000);
});

/**
 * Maneja el envío del formulario para crear una nueva partida
 * Valida el nombre del jugador y crea el lobby en el servidor
 */
document.getElementById('playerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  setLoading(true);
  
  const name = document.getElementById('playerName').value.trim();
  const color = document.getElementById('playerColor').value;
  
  // Validación del nombre
  if (!name) { 
    alert('Introduce tu nombre'); 
    setLoading(false); 
    return; 
  }
  
  if (name.length > 20) { 
    alert('Nombre máximo 20 caracteres'); 
    setLoading(false); 
    return; 
  }
  
  const formData = new FormData();
  formData.append('player_name', name);
  formData.append('player_color', color);
  
  try {
    const res = await fetch('snake_game.php?action=create_lobby', { 
      method: 'POST', 
      body: formData 
    });
    
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.error) throw new Error(data.error);
    
    // Redirigir a la pantalla del juego
    window.location.href = `game.html?game_id=${data.game_id}`;
  } catch (err) {
    alert('Error al crear partida: ' + err.message);
    setLoading(false);
  }
});

// Botón actualizar lista
document.getElementById('refreshBtn').addEventListener('click', loadGames);

/**
 * Carga la lista de partidas disponibles desde el servidor
 * Se ejecuta al cargar la página y cada 2 segundos automáticamente
 * Maneja errores de red de forma elegante mostrando lista vacía
 */
async function loadGames() {
  setGamesLoading(true);
  
  try {
    const res = await fetch('snake_game.php?action=list_games');
    
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }
    
    const games = await res.json();
    updateGamesList(games);
  } catch (error) {
    // Degradación elegante: mostrar lista vacía si falla la conexión
    updateGamesList([]);
    
    // En desarrollo, loguear el error
    if (window.location.search.includes('debug=true')) {
      console.error('Error loading games:', error);
    }
  }
  
  setGamesLoading(false);
}

// Actualiza la lista de partidas solo si hay cambios (evita parpadeo)
let lastGamesHtml = '';

function updateGamesList(games) {
  const ul = document.getElementById('gamesUl');
  let html = '';
  
  if (!games.length) {
    html = '<li>No hay partidas disponibles.</li>';
  } else {
    games.forEach(game => {
      html += `<li class="game-item">
        <div style="display: flex; align-items: center;">
          <span class="color-box" style="background:${game.player1_color || '#888'}"></span>
          <span><strong>${game.player1_name}</strong></span>
          <span class="waiting-time">(${timeSince(game.created_at)})</span>
        </div>
        <button onclick="joinGame('${game.game_id}')">Unirse</button>
      </li>`;
    });
  }
  
  // Solo actualiza el DOM si el HTML cambió
  if (html !== lastGamesHtml) {
    ul.innerHTML = html;
    lastGamesHtml = html;
  }
}

/**
 * Calcula el tiempo transcurrido desde un timestamp y lo formatea
 * Muestra el tiempo en la unidad más apropiada (segundos, minutos, horas)
 * 
 * @param {number} ts - Timestamp UNIX en segundos
 * @returns {string} Tiempo formateado (ej: "45s", "3m", "2h")
 */
function timeSince(ts) {
  const now = Math.floor(Date.now() / 1000);
  const sec = now - parseInt(ts);
  
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm';
  return Math.floor(sec / 3600) + 'h';
}

/**
 * Intenta unirse a una partida existente
 * Valida el nombre y solicita al servidor añadir al jugador como player2
 * 
 * @param {string} gameId - ID de la partida a unirse
 */
async function joinGame(gameId) {
  setLoading(true);
  
  const name = document.getElementById('playerName').value.trim();
  const color = document.getElementById('playerColor').value;
  
  // Validación del nombre
  if (!name) { 
    alert('Introduce tu nombre'); 
    setLoading(false); 
    return; 
  }
  
  if (name.length > 20) { 
    alert('Nombre máximo 20 caracteres'); 
    setLoading(false); 
    return; 
  }
  
  const formData = new FormData();
  formData.append('game_id', gameId);
  formData.append('player_name', name);
  formData.append('player_color', color);
  
  try {
    const res = await fetch('snake_game.php?action=join_game', { 
      method: 'POST', 
      body: formData 
    });
    
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.error) throw new Error(data.error);
    
    // Redirigir a la pantalla del juego
    window.location.href = `game.html?game_id=${gameId}`;
  } catch (err) {
    alert('Error al unirse: ' + err.message);
    setLoading(false);
  }
}

// Estados de carga
function setLoading(loading) {
  document.getElementById('createBtn').disabled = loading;
  document.getElementById('refreshBtn').disabled = loading;
  document.getElementById('playerName').disabled = loading;
  document.getElementById('playerColor').disabled = loading;
}

function setGamesLoading(loading) {
  document.getElementById('loadingGames').style.display = loading ? 'block' : 'none';
  document.getElementById('gamesUl').style.opacity = loading ? '0.5' : '1';
}
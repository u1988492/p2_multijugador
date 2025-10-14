
// Genera un color brillante aleatorio
function randomBrightColor() {
  const h = Math.floor(Math.random() * 360);
  return `#${hslToHex(h, 90, 60)}`;
}

function hslToHex(h, s, l) {
  l /= 100; 
  s /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c/2,
      r = 0, g = 0, b = 0;
  
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Inicializa color al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('playerColor').value = randomBrightColor();
  loadGames();
  setInterval(loadGames, 2000);
});

// Formulario crear lobby
document.getElementById('playerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  setLoading(true);
  
  const name = document.getElementById('playerName').value.trim();
  const color = document.getElementById('playerColor').value;
  
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
    const data = await res.json();
    
    if (data.error) throw new Error(data.error);
    
    window.location.href = `game.html?game_id=${data.game_id}`;
  } catch (err) {
    alert('Error: ' + err.message);
  }
  
  setLoading(false);
});

// Botón actualizar lista
document.getElementById('refreshBtn').addEventListener('click', loadGames);

// Carga partidas disponibles
async function loadGames() {
  setGamesLoading(true);
  
  try {
    const res = await fetch('snake_game.php?action=list_games');
    const games = await res.json();
    updateGamesList(games);
  } catch {
    updateGamesList([]);
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

// Calcula tiempo transcurrido desde timestamp
function timeSince(ts) {
  const now = Math.floor(Date.now()/1000);
  const sec = now - parseInt(ts);
  
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec/60) + 'm';
  return Math.floor(sec/3600) + 'h';
}

// Unirse a partida
async function joinGame(gameId) {
  setLoading(true);
  
  const name = document.getElementById('playerName').value.trim();
  const color = document.getElementById('playerColor').value;
  
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
    const data = await res.json();
    
    if (data.error) throw new Error(data.error);
    
    window.location.href = `game.html?game_id=${gameId}`;
  } catch (err) {
    alert('Error: ' + err.message);
  }
  
  setLoading(false);
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
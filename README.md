# 🐍 Snake Multijugador

Implementación de Snake multijugador en tiempo real con arquitectura cliente-servidor y sincronización mediante HTTP polling.

---

---

## 📁 Estructura del Proyecto

```
p2_multijugador/
├── PHP/                      # Servidor PHP portable
├── private/                  # Archivos privados (no accesibles desde web)
│   ├── games.db             # Base de datos SQLite
│   ├── create_snake_db.sql  # Script de creación de BD
│   └── start_devserver.cmd  # Script para iniciar servidor
└── public/                   # Archivos públicos (accesibles desde web)
    ├── index.html           # Página de inicio
    ├── lobby.html           # Lobby para crear/unirse a partidas
    ├── lobby.js             # Lógica del lobby
    ├── lobby.css            # Estilos del lobby
    ├── game.html            # Interfaz del juego
    ├── game.js              # Lógica del cliente
    ├── game.css             # Estilos del juego
    └── snake_game.php       # Backend del juego (API REST)
```

---

## 🏗️ Arquitectura

### Modelo Cliente-Servidor

```
Cliente (JavaScript)          Servidor (PHP)          Base de Datos (SQLite)
       │                             │                          │
       │─── GET /get_state ────────→ │                          │
       │                             │ ── SELECT * FROM ─────→  │
       │                             │ ←─ Estado del juego ───  │
       │ ←── JSON (estado) ──────────│                          │
       │                             │                          │
       │─── POST /set_direction ───→ │                          │
       │                             │ ── UPDATE direction ──→  │
       │ ←── {success: true} ────────│                          │
```

### Estado Autoritativo en el Servidor

- **El servidor** mantiene el estado real del juego
- **Los clientes** solo renderizan y envían inputs
- **Sincronización**: HTTP polling cada 200ms
- **Movimiento**: El servidor mueve las serpientes cada 500ms

---

## 🔧 Detalles Técnicos

### Base de Datos (SQLite)

**Tabla `game_state`**: Estado completo de cada partida

- `game_id` (PRIMARY KEY): Identificador único de la partida
- `player1/2_id`, `player1/2_name`, `player1/2_color`: Datos de jugadores
- `player1/2_snake` (TEXT/JSON): Array de coordenadas `[{x, y}, ...]`
- `player1/2_direction`, `player1/2_next_direction`: Dirección actual y cola
- `fruits` (TEXT/JSON): Array de frutas `[{x, y, type}, ...]`
- `game_status`: `'waiting'` | `'playing'` | `'finished'`
- `last_update` (REAL): Timestamp con decimales para control de ticks

**Tabla `player_latency`**: Medición de latencia

- `player_id`, `game_id`: Claves compuestas
- `ping_sent`, `ping_received`: Timestamps en ms
- `latency_ms`: Latencia calculada (tiempo de ida)

### API REST (snake_game.php)

| Endpoint                | Método | Descripción                     |
| ----------------------- | ------ | ------------------------------- |
| `?action=create_lobby`  | POST   | Crea nueva partida              |
| `?action=join_game`     | POST   | Une jugador a partida existente |
| `?action=list_games`    | GET    | Lista partidas disponibles      |
| `?action=get_state`     | GET    | Obtiene estado actual (polling) |
| `?action=set_direction` | POST   | Cambia dirección de serpiente   |
| `?action=ping`          | GET    | Mide latencia del jugador       |

### Sincronización Multijugador

#### Frecuencias

- **Polling cliente**: 200ms (5 Hz) - Consulta estado al servidor
- **Tick servidor**: 500ms (2 Hz) - Actualiza lógica del juego
- **Ping latencia**: 2000ms (0.5 Hz) - Mide latencia

#### Sistema de Direcciones

```php
// Evita reversión instantánea
$opposite = ['up'=>'down', 'down'=>'up', 'left'=>'right', 'right'=>'left'];
if ($next === $opposite[$current]) { /* ignorar */ }
```

#### Cola de Input

- `current_direction`: Dirección que se aplica en el tick actual
- `next_direction`: Input del jugador pendiente de aplicar
- Solo se permite **una dirección en cola** para evitar acumulación

### Detección de Colisiones

**Orden de prioridad:**

1. ✅ Comer fruta (antes de verificar colisiones)
2. 🚫 Colisión con pared (`x/y < 0` o `x/y > 39`)
3. 🚫 Colisión con serpiente enemiga

**Resolución de conflictos simultáneos:**

- Jugador 1 se procesa primero
- Si ambos colisionan, gana el que no colisionó primero

### Medición de Latencia

```javascript
// Cliente
const clientTime = Date.now() / 1000;
fetch(`ping&client_timestamp=${clientTime}`);
```

```php
// Servidor
$server_time = microtime(true);
$latency = ($server_time - $client_timestamp) * 500; // ms
```

**Factor 500**: Convierte segundos a milisegundos (×1000) y toma solo tiempo de ida (÷2)

**Clasificación visual:**

- 🟢 **< 50ms**: Excelente
- 🟡 **50-150ms**: Aceptable
- 🔴 **> 150ms**: Problemático

---

## 🚀 Uso

### Iniciar el Servidor

```bash
cd private
start_devserver.cmd
```

El servidor estará disponible en `http://localhost:8000`

### Crear Base de Datos

```bash
cd private
create_snake_db.cmd
```

### Acceso Remoto (LAN)

Para permitir conexiones desde otros dispositivos en la red local, editar `start_devserver.cmd`:

```batch
php.exe -S 0.0.0.0:8000 -t ..\public
```

Configurar el firewall de Windows para permitir conexiones entrantes en el puerto 8000.

---

## 📊 Métricas de Rendimiento

### Consumo de Datos

- **Por jugador**: ~5.75 KB/s durante partida activa
- **Total (2 jugadores)**: ~11.5 KB/s
- **Partida de 5 minutos**: ~3.5 MB totales

### Latencia Típica

- **Localhost**: 1-5 ms
- **LAN (WiFi)**: 10-30 ms
- **Jitter**: < 10 ms

### Carga del Servidor

- **Requests/segundo (1 jugador)**: 5 req/s (polling) + ocasionales (input)
- **Tiempo de respuesta `get_state`**: 5-15 ms (P95: < 20 ms)

---

## 🎮 Controles

- **Jugador 1**: Teclas **W A S D**
- **Jugador 2**: Teclas de **flecha**
- **Cooldown**: 100ms entre cambios de dirección

---

## 📝 Notas Técnicas

### Decisiones de Diseño

**¿Por qué HTTP Polling en lugar de WebSockets?**

- ✅ Simplicidad de implementación
- ✅ Compatible con cualquier servidor HTTP
- ✅ Fácil de depurar
- ✅ Suficientemente rápido para este tipo de juego

**¿Por qué 200ms de polling?**

- 2.5 polls por cada tick del servidor (500ms)
- Balance entre responsividad y carga del servidor
- Captura todos los cambios sin desperdiciar requests

**¿Por qué no hay predicción del cliente?**

- Código más simple y mantenible
- Evita correcciones visuales bruscas
- Todos los jugadores ven exactamente lo mismo
- La latencia se compensa mostrándola al jugador

**¿Por qué JSON en lugar de tablas relacionales?**

- Consultas más rápidas (un solo SELECT)
- Estructura natural para JavaScript/PHP
- Menos JOINs = mejor rendimiento
- Siempre operamos sobre el estado completo

---

## ⚙️ Requisitos

- **PHP**: 7.4 o superior con extensión SQLite3
- **Navegador**: Cualquier navegador moderno con soporte Canvas y ES6
- **Red**: LAN o localhost

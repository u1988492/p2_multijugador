-- Tabla principal del estado del juego
CREATE TABLE game_state (
    game_id TEXT PRIMARY KEY,
    player1_id TEXT,
    player2_id TEXT,
    player1_name TEXT,
    player2_name TEXT,
    player1_color TEXT,
    player2_color TEXT,
    player1_snake TEXT, -- JSON: [{"x":int,"y":int},...]
    player2_snake TEXT, -- JSON: [{"x":int,"y":int},...]
    player1_direction TEXT,
    player2_direction TEXT,
    player1_next_direction TEXT,
    player2_next_direction TEXT,
    fruits TEXT, -- JSON: [{"x":int,"y":int,"type":text},...]
    game_status TEXT, -- 'waiting', 'playing', 'finished'
    winner TEXT, -- player_id o NULL
    last_update INTEGER,
    created_at INTEGER
);

-- Tabla para latencia de jugadores
CREATE TABLE player_latency (
    player_id TEXT,
    game_id TEXT,
    ping_sent INTEGER,
    ping_received INTEGER,
    latency_ms INTEGER,
    PRIMARY KEY (player_id, game_id, ping_sent)
);

-- Ejemplo de inserción de un estado de juego inicial
INSERT INTO game_state (
    game_id, player1_id, player2_id, player1_name, player2_name,
    player1_color, player2_color, player1_snake, player2_snake,
    player1_direction, player2_direction, player1_next_direction, player2_next_direction,
    fruits, game_status, winner, last_update, created_at
) VALUES (
    'game_001', 'p1_cookie', 'p2_cookie', 'Alice', 'Bob',
    '#FF0000', '#00FF00',
    '[{"x":20,"y":20},{"x":19,"y":20}]',
    '[{"x":20,"y":25},{"x":19,"y":25}]',
    'right', 'left', 'right', 'left',
    '[{"x":10,"y":10,"type":"apple"},{"x":30,"y":30,"type":"banana"},{"x":5,"y":35,"type":"cherry"}]',
    'waiting', NULL, 1697200000, 1697200000
);

-- Ejemplo de inserción de latencia
INSERT INTO player_latency (
    player_id, game_id, ping_sent, ping_received, latency_ms
) VALUES (
    'p1_cookie', 'game_001', 1697200000, 1697200001, 1000
);
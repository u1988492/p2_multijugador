@echo off
REM Crea la base de datos y las tablas para el juego Snake multijugador
set DB=games.db
if exist %DB% del %DB%
sqlite3.exe %DB% ".read create_snake_db.sql"
echo Base de datos Snake creada correctamente.
pause

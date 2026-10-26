@echo off
REM Arranca el ejecutable de pruebas de Bolsa de Trabajo y mantiene la
REM ventana abierta para ver el log en vivo (Ctrl+C o cerrar la ventana
REM para detenerlo). Requiere el .env junto a este archivo.
cd /d "%~dp0"
Backend.exe
echo.
echo El servidor se detuvo. Presiona una tecla para cerrar esta ventana...
pause >nul

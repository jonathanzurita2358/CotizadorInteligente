@echo off
title Cotizador Inteligente

set PORT=4000

echo ================================================
echo    COTIZADOR INTELIGENTE - Modo Desarrollo
echo ================================================
echo.
echo [1/2] Puerto configurado: %PORT%
echo [2/2] Iniciando servidor Next.js...
echo.
echo ------------------------------------------------
echo   Abre tu navegador en:  http://localhost:4000
echo   Para detener el servidor presiona: Ctrl+C
echo ------------------------------------------------
echo.

npm run dev -- -p 4000

echo.
echo El servidor se ha detenido.
pause

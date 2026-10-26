@echo off
setlocal
REM =====================================================================
REM  publicar-pruebas.bat
REM  Genera el ejecutable de pruebas de Bolsa de Trabajo: frontend
REM  compilado + backend self-contained en un solo .exe que sirve todo
REM  desde el puerto 5053.
REM
REM  Requisitos: Node.js 18+ y .NET SDK 10 instalados (ver SETUP.md).
REM
REM  Que genera:
REM    - Backend/wwwroot/          (build de la SPA, artefacto temporal)
REM    - dist-publicar/Backend.exe (ejecutable, listo para copiar/correr)
REM    - dist-publicar/.env        (copia del .env con la carga de prueba
REM                                 habilitada)
REM    - dist-publicar/iniciar-pruebas.bat
REM
REM  Uso: doble clic, o desde consola: publicar-pruebas.bat
REM =====================================================================
cd /d "%~dp0"

echo [1/5] Compilando frontend (con herramientas de desarrollo visibles)...
cd Frontend
set "VITE_MOSTRAR_HERRAMIENTAS_DEV=true"
call npm run build
if errorlevel 1 goto :error
cd ..

echo [2/5] Copiando el build de la SPA a Backend\wwwroot...
if exist Backend\wwwroot rmdir /s /q Backend\wwwroot
robocopy Frontend\dist Backend\wwwroot /e /nfl /ndl /njh /njs >nul
if errorlevel 8 goto :error

echo [3/5] Publicando backend self-contained (win-x64, single file)...
if exist dist-publicar rmdir /s /q dist-publicar
dotnet publish Backend -c Release -r win-x64 --self-contained /p:PublishSingleFile=true -o dist-publicar
if errorlevel 1 goto :error

echo [4/5] Preparando .env del ejecutable (incluye CARGA_PRUEBA_OMITIR_SESION)...
if not exist Backend\.env goto :sin-env
copy /y Backend\.env dist-publicar\.env >nul
>> dist-publicar\.env echo CARGA_PRUEBA_OMITIR_SESION=true
goto :env-listo
:sin-env
echo     AVISO: no se encontro Backend\.env — el ejecutable necesita uno con
echo     DB_HOST/DB_NAME/DB_USER/DB_PASSWORD junto al .exe para arrancar.
:env-listo

echo [5/5] Copiando el .bat de arranque...
copy /y Backend\iniciar-pruebas.bat dist-publicar\iniciar-pruebas.bat >nul

echo.
echo ============================================================
echo  Listo. Ejecutable en: dist-publicar\Backend.exe
echo  Arranque:             dist-publicar\iniciar-pruebas.bat
echo  Luego abre http://localhost:5053 en el navegador.
echo ============================================================
goto :fin

:error
echo.
echo ERROR: fallo un paso de la publicacion. Revisa los mensajes de arriba.
exit /b 1

:fin
endlocal

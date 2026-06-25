@echo off
title Servidor de Desenvolvimento PHP - MikroTik Portal SMSantos
color 0A
cls
echo =============================================================
echo   Servidor de Desenvolvimento PHP - Portal Hotspot SMSantos
echo =============================================================
echo.
echo [INFO] Iniciando o servidor PHP embutido...
echo [INFO] Escutando em todas as interfaces de rede na porta 8000.
echo [INFO] Para acessar de outros dispositivos na LAN, use o IP deste PC.
echo.
echo [DEBUG] Pressione Ctrl+C para encerrar o servidor a qualquer momento.
echo.
echo -------------------------------------------------------------
echo   Acessar localmente:  http://localhost:8000/api/create-user.php
echo -------------------------------------------------------------
echo.

php -S 0.0.0.0:8000

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERRO] O comando 'php' nao foi encontrado ou falhou ao iniciar.
    echo [ERRO] Certifique-se de que o PHP esta instalado e configurado no PATH do sistema.
    echo.
    pause
)

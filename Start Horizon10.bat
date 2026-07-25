@echo off
title Horizon10 - Investment Research Dashboard
echo.
echo   Horizon10 starting at http://localhost:8000 ...
echo   Keep this window open while using the app. Close it to stop.
echo.
cd /d "%~dp0backend"
start "" http://localhost:8000
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
pause

@echo off
cd /d %~dp0
echo ==========================================
echo    NHGOne Backend Server (FastAPI)
echo ==========================================
echo.
echo [INFO] Environment: Development
echo [INFO] Port: 8000
echo.
echo Starting server...
py -m uvicorn app.main:app --port 8000 --reload
echo.
echo [WARNING] Server stopped unexpectedly.
pause

@echo off
echo ==========================================
echo    NHGOne - Push to Production
echo ==========================================
echo.
echo [1/3] Adding changes...
git add .
echo.
echo [2/3] Committing changes...
set /p msg="Enter commit message (default: update): "
if "%msg%"=="" set msg=update
git commit -m "%msg%"
echo.
echo [3/3] Pushing to GitHub...
git push origin main
echo.
echo ==========================================
echo    DEPLOYMENT TRIGGERED!
echo ==========================================
echo Frontend: https://vercel.com/ (Check Build)
echo Backend: https://railway.app/ (Check Deploy)
echo ==========================================
pause

@echo off
cd /d "%~dp0"
echo FAIRY TAIL MAGIC ARENA - Local Server
node --version || (echo Please install Node.js 20+ & pause & exit /b)
echo Open http://localhost:3000 in your browser
npm start
pause

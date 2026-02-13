@echo off
REM Build and Prepare Next.js App for IIS Deployment
echo ========================================
echo Next.js Build Script for IIS Deployment
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [2/4] Building Next.js application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo [3/4] Verifying build output...
if not exist ".next" (
    echo ERROR: .next folder not found after build
    pause
    exit /b 1
)

if not exist "server.js" (
    echo ERROR: server.js not found
    pause
    exit /b 1
)

if not exist "web.config" (
    echo ERROR: web.config not found
    pause
    exit /b 1
)

echo.
echo [4/4] Build completed successfully!
echo.
echo ========================================
echo Files ready for FTP upload:
echo ========================================
echo.
echo REQUIRED FILES/FOLDERS:
echo   [X] .next/          (built files)
echo   [X] public/         (static files)
echo   [X] node_modules/   (dependencies - OR install on server)
echo   [X] server.js       (Node.js server)
echo   [X] web.config      (IIS configuration)
echo   [X] package.json    (dependencies list)
echo   [X] package-lock.json
echo   [X] next.config.js
echo   [X] .env.local      (or create .env.production on server)
echo.
echo ========================================
echo NEXT STEPS:
echo ========================================
echo.
echo 1. Upload all files/folders listed above via FTP
echo 2. On server: Install iisnode
echo 3. On server: Configure IIS (see IISNODE_DEPLOYMENT_STEPS.md)
echo 4. On server: Run 'npm install --production' (if node_modules not uploaded)
echo 5. On server: Start website in IIS Manager
echo.
echo See IISNODE_DEPLOYMENT_STEPS.md for detailed instructions
echo.
pause

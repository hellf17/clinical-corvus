@echo off
REM Demo Script for Clinical Helper on Windows
REM This script helps run the Clinical Helper project for demonstration purposes

echo.
echo =============================================
echo    Clinical Helper - Demo Launcher Script   
echo =============================================
echo.

REM Check if Docker is installed
echo [INFO] Checking if Docker is installed...
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Docker is not installed. Please install Docker and try again.
  pause
  exit /b 1
)
echo [SUCCESS] Docker is installed.

REM Check if .env file exists
echo [INFO] Checking for .env file...
if not exist ".env" (
  echo [WARNING] .env file not found. Creating from .env.example...
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo [SUCCESS] Created .env file from .env.example.
    echo [WARNING] Please edit the .env file with your configuration if needed.
  ) else (
    echo [ERROR] .env.example file not found. Please create a .env file manually.
    pause
    exit /b 1
  )
) else (
  echo [SUCCESS] .env file found.
)

REM Ask if user wants to rebuild containers
echo.
set /p rebuild_choice="Do you want to rebuild the containers? (y/n): "
if /i "%rebuild_choice%"=="y" (
  echo [INFO] Rebuilding containers...
  docker-compose build
  if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build containers.
    pause
    exit /b 1
  )
  echo [SUCCESS] Containers rebuilt successfully.
) else (
  echo [INFO] Skipping container rebuild.
)

REM Start the services
echo [INFO] Starting Clinical Helper services...
docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to start containers.
  pause
  exit /b 1
)
echo [SUCCESS] Services started successfully!

REM Display access information
echo.
echo =============================================
echo    Clinical Helper is now running!   
echo =============================================
echo.

echo Access the application at:
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:8000/api
echo   API Documentation: http://localhost:8000/docs
echo   MCP Server: http://localhost:8765
echo.
echo To view logs, run: docker-compose logs -f
echo To stop the services, run: docker-compose down
echo.
echo For additional information, refer to the README.md file.
echo.

pause 
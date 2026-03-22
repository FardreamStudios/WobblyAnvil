@echo off
setlocal enabledelayedexpansion

:: ============================================
:: DEPLOY - Wobbly Anvil
:: 1. Bumps version in buildInfo.js
:: 2. git add .
:: 3. git commit (custom or auto message)
:: 4. git push
:: 5. Asks to run npm run deploy
:: ============================================

set "FILE=src\config\buildInfo.js"

:: Check file exists
if not exist "%FILE%" (
    echo ERROR: Could not find %FILE%
    echo Make sure you run this from your project root folder.
    pause
    exit /b 1
)

:: ---- STEP 1: BUMP VERSION ----

:: Extract the version string
for /f "tokens=2 delims=:""" %%a in ('findstr /C:"version:" "%FILE%"') do (
    set "OLD_VERSION=%%a"
)
set "OLD_VERSION=!OLD_VERSION: =!"

:: Split into major.minor.patch
for /f "tokens=1-3 delims=." %%a in ("!OLD_VERSION!") do (
    set "MAJOR=%%a"
    set "MINOR=%%b"
    set "PATCH=%%c"
)

:: Remove leading zeros for math
set /a "PATCH_NUM=1!PATCH! - 100"
set /a "MINOR_NUM=1!MINOR! - 100"
set /a "MAJOR_NUM=!MAJOR!"

:: Bump patch
set /a "PATCH_NUM=!PATCH_NUM! + 1"

:: Roll over patch -> minor
if !PATCH_NUM! GEQ 100 (
    set "PATCH_NUM=0"
    set /a "MINOR_NUM=!MINOR_NUM! + 1"
)

:: Roll over minor -> major
if !MINOR_NUM! GEQ 100 (
    set "MINOR_NUM=0"
    set /a "MAJOR_NUM=!MAJOR_NUM! + 1"
)

:: Format with leading zeros
if !PATCH_NUM! LSS 10 (set "NEW_PATCH=0!PATCH_NUM!") else (set "NEW_PATCH=!PATCH_NUM!")
if !MINOR_NUM! LSS 10 (set "NEW_MINOR=0!MINOR_NUM!") else (set "NEW_MINOR=!MINOR_NUM!")
set "NEW_MAJOR=!MAJOR_NUM!"

set "NEW_VERSION=!NEW_MAJOR!.!NEW_MINOR!.!NEW_PATCH!"

:: Write the updated file
(
    echo var BUILD_INFO = {
    echo     version: "!NEW_VERSION!",
    echo     env: "dev",
    echo };
    echo.
    echo export default BUILD_INFO;
) > "%FILE%"

echo.
echo   Wobbly Anvil Deploy
echo   -------------------------
echo   Version: !OLD_VERSION! -^> !NEW_VERSION!
echo.

:: ---- STEP 2: ASK FOR COMMIT MESSAGE ----

set "COMMIT_MSG="
set /p "COMMIT_MSG=  Commit message (leave blank for auto): "

if "!COMMIT_MSG!"=="" (
    set "COMMIT_MSG=Build !NEW_VERSION!"
)

echo.
echo   Commit: !COMMIT_MSG!
echo   -------------------------
echo.

:: ---- STEP 3: GIT ADD + COMMIT + PUSH ----

git add .
if !errorlevel! NEQ 0 (
    echo ERROR: git add failed.
    pause
    exit /b 1
)

git commit -m "!COMMIT_MSG!"
if !errorlevel! NEQ 0 (
    echo ERROR: git commit failed.
    pause
    exit /b 1
)

git push
if !errorlevel! NEQ 0 (
    echo ERROR: git push failed.
    pause
    exit /b 1
)

echo.
echo   Pushed !NEW_VERSION!
echo.

:: ---- STEP 4: ASK TO DEPLOY ----

set "DEPLOY_CHOICE="
set /p "DEPLOY_CHOICE=  Run npm run deploy? (Y/N): "

if /i "!DEPLOY_CHOICE!"=="Y" (
    npm run deploy
    if !errorlevel! NEQ 0 (
        echo ERROR: npm run deploy failed.
        pause
        exit /b 1
    )
    echo.
    echo   Deployed !NEW_VERSION!
    echo.
) else (
    echo.
    echo   Skipped deploy.
    echo.
)

pause
endlocal
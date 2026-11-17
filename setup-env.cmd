@echo off
setlocal
set "ROOT=%~dp0"

if not exist "%ROOT%backend\.env" (
    copy /Y "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
    echo Created backend\.env
) else (
    echo Preserved existing backend\.env
)

if not exist "%ROOT%frontend\.env" (
    copy /Y "%ROOT%frontend\.env.example" "%ROOT%frontend\.env" >nul
    echo Created frontend\.env
) else (
    echo Preserved existing frontend\.env
)

if not exist "%ROOT%infrastructure\keycloak\.env" (
    copy /Y "%ROOT%infrastructure\keycloak\.env.example" "%ROOT%infrastructure\keycloak\.env" >nul
    echo Created infrastructure\keycloak\.env
) else (
    echo Preserved existing infrastructure\keycloak\.env
)

if exist "%ROOT%frontend\.env.local" (
    echo NOTE: frontend\.env.local exists and takes precedence over frontend\.env in Next.js.
)

echo.
echo Set the database password in backend\.env and local Keycloak admin password in infrastructure\keycloak\.env.
echo Keep all .env files local and ignored by Git. See ENV_SETUP.md.
endlocal

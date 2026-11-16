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

if exist "%ROOT%frontend\.env.local" (
    echo NOTE: frontend\.env.local exists and takes precedence over frontend\.env in Next.js.
)

echo.
echo Edit backend\.env with your actual PostgreSQL password and OYS JWT issuer/JWKS URLs.
echo Keep .env files local: they are ignored by Git. See ENV_SETUP.md.
endlocal

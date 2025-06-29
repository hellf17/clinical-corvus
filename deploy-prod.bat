@echo off
REM Script de deploy para ambiente de produção do Clinical Helper no Windows

echo.
echo =============================================
echo   Clinical Helper - Deploy de Producao
echo =============================================
echo.

REM Verificar se o Docker está instalado
echo [INFO] Verificando instalacao do Docker...
docker --version > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Docker nao esta instalado. Por favor, instale o Docker e tente novamente.
    exit /b 1
)
echo [SUCESSO] Docker esta instalado.

REM Verificar se o Docker Compose está disponível
echo [INFO] Verificando disponibilidade do Docker Compose...
docker-compose --version > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [SUCESSO] Docker Compose esta instalado.
    set COMPOSE_COMMAND=docker-compose
) else (
    echo [AVISO] Comando docker-compose nao encontrado. Verificando se esta incluido no Docker...
    docker compose version > nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERRO] Docker Compose nao esta disponivel. Por favor, instale o Docker Compose e tente novamente.
        exit /b 1
    ) else (
        echo [SUCESSO] Docker Compose esta incluido no Docker.
        set COMPOSE_COMMAND=docker compose
    )
)

REM Verificar se o arquivo .env existe
echo [INFO] Verificando arquivo .env...
if not exist .env (
    echo [AVISO] Arquivo .env nao encontrado.
    echo [AVISO] Criando arquivo .env a partir de .env.example...
    if exist .env.example (
        copy .env.example .env
        echo [SUCESSO] Arquivo .env criado a partir de .env.example.
        echo [AVISO] Por favor, edite o arquivo .env com suas configuracoes antes de continuar.
        echo [AVISO] Execute este script novamente apos configurar o arquivo .env.
        exit /b 0
    ) else (
        echo [ERRO] Arquivo .env.example nao encontrado. Por favor, crie um arquivo .env manualmente.
        exit /b 1
    )
) else (
    echo [SUCESSO] Arquivo .env encontrado.
)

REM Construir as imagens de produção
echo [INFO] Construindo imagens Docker para producao...
%COMPOSE_COMMAND% -f docker-compose.prod.yml build
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao construir as imagens Docker.
    exit /b 1
)
echo [SUCESSO] Imagens Docker construidas com sucesso.

REM Iniciar os serviços
echo [INFO] Iniciando servicos em modo de producao...
%COMPOSE_COMMAND% -f docker-compose.prod.yml up -d
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao iniciar os servicos.
    exit /b 1
)
echo [SUCESSO] Servicos iniciados com sucesso em modo de producao!

REM Verificar se os serviços estão em execução
echo [INFO] Verificando status dos servicos...
%COMPOSE_COMMAND% -f docker-compose.prod.yml ps

echo.
echo =============================================
echo   Clinical Helper esta em execucao!
echo =============================================
echo.

echo Acesse a aplicacao em:
echo   Frontend: https://seu-dominio.com
echo   Backend API: https://seu-dominio.com/api
echo   API Documentation: https://seu-dominio.com/api/docs

echo.
echo Para visualizar logs, execute: %COMPOSE_COMMAND% -f docker-compose.prod.yml logs -f
echo Para parar os servicos, execute: %COMPOSE_COMMAND% -f docker-compose.prod.yml down
echo. 
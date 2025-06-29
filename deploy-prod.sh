#!/bin/bash
# Script de deploy para ambiente de produção do Clinical Helper

# Definição de cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para exibir mensagens de status
echo_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

# Função para exibir mensagens de sucesso
echo_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Função para exibir avisos
echo_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Função para exibir erros e sair
echo_error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

# Exibir banner de boas-vindas
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Clinical Helper - Deploy de Produção  ${NC}"
echo -e "${GREEN}=============================================${NC}\n"

# Verificar se o Docker está instalado
echo_status "Verificando instalação do Docker..."
if ! command -v docker &> /dev/null; then
  echo_error "Docker não está instalado. Por favor, instale o Docker e tente novamente."
fi
echo_success "Docker está instalado."

# Verificar se o Docker Compose está instalado
echo_status "Verificando instalação do Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
  echo_warning "Comando docker-compose não encontrado. Verificando se está incluído no Docker..."
  if ! docker compose version &> /dev/null; then
    echo_error "Docker Compose não está instalado. Por favor, instale o Docker Compose e tente novamente."
  else
    echo_success "Docker Compose está incluído no Docker."
    COMPOSE_COMMAND="docker compose"
  fi
else
  echo_success "Docker Compose está instalado."
  COMPOSE_COMMAND="docker-compose"
fi

# Verificar se o arquivo .env existe
echo_status "Verificando arquivo .env..."
if [ ! -f ".env" ]; then
  echo_warning "Arquivo .env não encontrado."
  echo_warning "Criando arquivo .env a partir de .env.example..."
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo_success "Arquivo .env criado a partir de .env.example."
    echo_warning "Por favor, edite o arquivo .env com suas configurações antes de continuar."
    echo_warning "Execute este script novamente após configurar o arquivo .env."
    exit 0
  else
    echo_error "Arquivo .env.example não encontrado. Por favor, crie um arquivo .env manualmente."
  fi
else
  echo_success "Arquivo .env encontrado."
fi

# Verificar variáveis críticas no arquivo .env
echo_status "Verificando variáveis de ambiente críticas..."
if ! grep -q "SECRET_KEY=" .env || grep -q "SECRET_KEY=generate_a_secure_random_key_here" .env; then
  echo_warning "A variável SECRET_KEY não está configurada corretamente no arquivo .env."
  echo_warning "Por favor, configure um valor seguro para SECRET_KEY antes de continuar."
  exit 0
fi
echo_success "Variáveis de ambiente críticas verificadas."

# Construir as imagens de produção
echo_status "Construindo imagens Docker para produção..."
$COMPOSE_COMMAND -f docker-compose.prod.yml build || echo_error "Falha ao construir as imagens Docker."
echo_success "Imagens Docker construídas com sucesso."

# Iniciar os serviços
echo_status "Iniciando serviços em modo de produção..."
$COMPOSE_COMMAND -f docker-compose.prod.yml up -d || echo_error "Falha ao iniciar os serviços."
echo_success "Serviços iniciados com sucesso em modo de produção!"

# Verificar se os serviços estão em execução
echo_status "Verificando status dos serviços..."
$COMPOSE_COMMAND -f docker-compose.prod.yml ps

# Exibir informações de acesso
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}   Clinical Helper está em execução!   ${NC}"
echo -e "${GREEN}=============================================${NC}\n"

echo -e "Acesse a aplicação em:"
echo -e "  ${BLUE}Frontend:${NC} https://seu-dominio.com"
echo -e "  ${BLUE}Backend API:${NC} https://seu-dominio.com/api"
echo -e "  ${BLUE}API Documentation:${NC} https://seu-dominio.com/api/docs"

echo -e "\nPara visualizar logs, execute: ${YELLOW}$COMPOSE_COMMAND -f docker-compose.prod.yml logs -f${NC}"
echo -e "Para parar os serviços, execute: ${YELLOW}$COMPOSE_COMMAND -f docker-compose.prod.yml down${NC}\n" 
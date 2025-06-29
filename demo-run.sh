#!/bin/bash
# Demo Script for Clinical Helper
# This script helps run the Clinical Helper project for demonstration purposes

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display status
function echo_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to display success
function echo_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to display warning
function echo_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to display error and exit
function echo_error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

# Display welcome message
echo -e "\n${GREEN}==============================================${NC}"
echo -e "${GREEN}   Clinical Helper - Demo Launcher Script   ${NC}"
echo -e "${GREEN}==============================================${NC}\n"

# Check if Docker is installed
echo_status "Checking if Docker is installed..."
if ! command -v docker &> /dev/null; then
  echo_error "Docker is not installed. Please install Docker and try again."
fi
echo_success "Docker is installed."

# Check if Docker Compose is installed
echo_status "Checking if Docker Compose is installed..."
if ! command -v docker-compose &> /dev/null; then
  echo_warning "Docker Compose command not found. Checking if it's included in Docker..."
  if ! docker compose version &> /dev/null; then
    echo_error "Docker Compose is not installed. Please install Docker Compose and try again."
  else
    echo_success "Docker Compose is included in Docker."
    COMPOSE_COMMAND="docker compose"
  fi
else
  echo_success "Docker Compose is installed."
  COMPOSE_COMMAND="docker-compose"
fi

# Check if .env file exists
echo_status "Checking for .env file..."
if [ ! -f ".env" ]; then
  echo_warning ".env file not found. Creating from .env.example..."
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo_success "Created .env file from .env.example."
    echo_warning "Please edit the .env file with your configuration if needed."
  else
    echo_error ".env.example file not found. Please create a .env file manually."
  fi
else
  echo_success ".env file found."
fi

# Ask if user wants to rebuild containers
echo -e "\n${YELLOW}Do you want to rebuild the containers? (y/n)${NC}"
read -r rebuild_choice
if [[ $rebuild_choice == "y" || $rebuild_choice == "Y" ]]; then
  echo_status "Rebuilding containers..."
  $COMPOSE_COMMAND build || echo_error "Failed to build containers."
  echo_success "Containers rebuilt successfully."
else
  echo_status "Skipping container rebuild."
fi

# Start the services
echo_status "Starting Clinical Helper services..."
$COMPOSE_COMMAND up -d || echo_error "Failed to start containers."
echo_success "Services started successfully!"

# Display access information
echo -e "\n${GREEN}==============================================${NC}"
echo -e "${GREEN}   Clinical Helper is now running!   ${NC}"
echo -e "${GREEN}==============================================${NC}\n"

echo -e "Access the application at:"
echo -e "  ${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "  ${BLUE}Backend API:${NC} http://localhost:8000/api"
echo -e "  ${BLUE}API Documentation:${NC} http://localhost:8000/docs"
echo -e "  ${BLUE}MCP Server:${NC} http://localhost:8765"

echo -e "\nTo view logs, run: ${YELLOW}docker-compose logs -f${NC}"
echo -e "To stop the services, run: ${YELLOW}docker-compose down${NC}\n"

echo -e "For additional information, refer to the README.md file.\n" 
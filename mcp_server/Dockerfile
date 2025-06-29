FROM python:3.10-slim

WORKDIR /app

# Instalar dependências do sistema incluindo git para dependências do GitHub
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências (a ordem importa!)
COPY requirements-shared.txt .
COPY mcp_server/requirements.txt ./mcp-requirements.txt

# Instalar dependências Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-shared.txt && \
    pip install --no-cache-dir -r mcp-requirements.txt

# Copiar o código da aplicação
COPY mcp_server/ .

# Copiar o cliente BAML se necessário
COPY baml_client /app/baml_client

# Expor porta do servidor
EXPOSE 7777

# Comando para inicialização
CMD ["python", "mcp_server.py"] 
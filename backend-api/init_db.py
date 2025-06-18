"""
Script para inicializar o banco de dados.
Este script cria as tabelas definidas nos modelos SQLAlchemy.
Pode ser executado diretamente: python -m backend-api.init_db
"""

import logging
from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError

from .database import engine, Base
from . import db_models  # Importa todos os modelos
from .config import get_settings

settings = get_settings()

# Configurar o logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_tables():
    """Create all database tables defined in models."""
    try:
        logger.info("Criando tabelas do banco de dados...")
        
        # Criar todas as tabelas
        Base.metadata.create_all(bind=engine)
        
        # Verificar quais tabelas foram criadas
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        logger.info(f"Tabelas criadas/existentes: {', '.join(tables)}")
        return True
    except OperationalError as e:
        logger.error(f"Erro ao conectar ao banco de dados: {e}")
        logger.error(f"Verifique se o banco de dados está rodando e se a URL está correta: {settings.database_url}")
        return False
    except Exception as e:
        logger.error(f"Erro ao criar tabelas: {e}")
        return False

def test_connection():
    """Test database connection."""
    try:
        logger.info("Testando conexão com o banco de dados...")
        conn = engine.connect()
        conn.close()
        logger.info("Conexão com o banco de dados estabelecida com sucesso!")
        return True
    except Exception as e:
        logger.error(f"Erro ao conectar ao banco de dados: {e}")
        return False

def init_db():
    """Main function to initialize the database."""
    if test_connection():
        create_tables()
    else:
        logger.error("Inicialização do banco de dados falhou devido a erro de conexão.")

if __name__ == "__main__":
    init_db() 
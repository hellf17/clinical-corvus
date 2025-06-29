from logging.config import fileConfig

# Explicitly load .env file from the parent directory (project root)
import os
from dotenv import load_dotenv

# Construct the path to the .env file relative to this script's location
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env') 
if os.path.exists(dotenv_path):
    print(f"Loading environment variables from: {dotenv_path}")
    load_dotenv(dotenv_path=dotenv_path)
else:
    print(f"Warning: .env file not found at {dotenv_path}")

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Import Base and models for autogenerate support
import sys
# Add project root to path to find modules
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from database import Base
from database import models # Import all models to ensure they are registered

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Manually set the sqlalchemy.url in the config object
# after loading .env, overriding alembic.ini's value
db_url = os.getenv('DATABASE_URL')
if db_url:
    print(f"Explicitly setting sqlalchemy.url to: {db_url}")
    config.set_main_option('sqlalchemy.url', db_url)
elif not config.get_main_option('sqlalchemy.url'):
     print("ERROR: DATABASE_URL not found in environment and sqlalchemy.url not set in alembic.ini")
     # Optionally raise an error here
     # raise ValueError("Database URL not configured.")

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

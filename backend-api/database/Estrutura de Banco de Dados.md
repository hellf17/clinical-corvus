# Estrutura de Banco de Dados

Este diretório contém a definição unificada dos modelos de banco de dados para o Clinical Helper.

## Organização

- `__init__.py` - Configuração do banco de dados (engine, Base, SessionLocal, get_db)
- `models.py` - Definição de todos os modelos SQLAlchemy

## Migração Realizada

A estrutura anterior do projeto tinha modelos definidos em vários lugares:

- `db_models.py` (raiz)
- `database.py` (raiz)
- `models/*.py` (diretório models)

Isso estava causando problemas de sobreposição e inconsistências, especialmente com testes de integração.

## Nova Estrutura

Todos os modelos agora estão unificados em `database/models.py`, seguindo as melhores práticas:

- Um único local para todas as definições de modelos
- Organização clara por categorias (User, Patient, Lab, Medication, etc.)
- Consistência nas convenções de nomenclatura
- Compatibilidade entre os modelos reais e os usados nos testes

## Uso

Para usar os modelos em seu código:

```python
# Forma recomendada - importar do pacote models
from models import User, Patient, LabResult

# Alternativamente, importar diretamente do módulo database
from database.models import User, Patient, LabResult

# NÃO RECOMENDADO (mantido para compatibilidade)
from db_models import User, Patient, LabResult
```

## Compatibilidade

Para manter a compatibilidade com o código existente:

- `db_models.py` e `database.py` na raiz foram mantidos como arquivos de compatibilidade
- Eles importam do novo local e emitem avisos de depreciação
- O código existente continua funcionando sem alterações

## Testes

Os testes de integração foram atualizados para usar a nova estrutura, resolvendo problemas com:

- Conversão de IDs entre inteiros e UUIDs
- Campos ausentes nos modelos
- Inconsistências entre modelos de teste e banco de dados

## Próximos Passos

- Remover gradualmente as referências aos arquivos antigos (`db_models.py`, `database.py`)
- Atualizar todos os testes para usar a nova estrutura
- Remover diretórios e arquivos redundantes (`models/*.py`) 
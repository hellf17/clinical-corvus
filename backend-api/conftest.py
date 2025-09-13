# conftest.py - Add to Python path before imports
import sys
import os

# Add the backend-api directory to Python path FIRST
current_dir = os.path.dirname(__file__)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Add the root project directory to Python path so baml_client can be found
root_dir = os.path.abspath(os.path.join(current_dir, '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Now we can safely import the original conftest content
from tests.conftest import *
#!/usr/bin/env python3
"""
Startup script with enhanced CORS debugging
"""
import uvicorn
import logging
import sys
import os

# Add the backend-api directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    settings = get_settings()
    
    logger.info("=" * 50)
    logger.info("Starting Clinical Corvus API with CORS debugging")
    logger.info("=" * 50)
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"CORS Origins: {settings.cors_origins}")
    logger.info(f"Frontend URL: {settings.frontend_url}")
    
    # Start the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="debug"
    )

if __name__ == "__main__":
    main()
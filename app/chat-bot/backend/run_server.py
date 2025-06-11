#!/usr/bin/env python3
"""
Production-ready startup script for Ubuntu VPS deployment
"""

import os
import sys
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_python_path():
    """Setup Python path for proper imports"""
    current_dir = Path(__file__).parent.absolute()
    if str(current_dir) not in sys.path:
        sys.path.insert(0, str(current_dir))
    logger.info(f"Python path setup: {current_dir}")

def verify_env_file():
    """Verify .env file exists and is readable"""
    current_dir = Path(__file__).parent
    # Check multiple possible locations for .env file
    possible_env_paths = [
        current_dir.parent.parent.parent / ".env",  # Root directory
        current_dir.parent.parent / ".env",         # app directory
        current_dir.parent / ".env",                # chat-bot directory
        current_dir / ".env",                       # backend directory
        Path.cwd() / ".env",                        # Current working directory
    ]
    
    logger.info("🔍 Searching for .env file...")
    for env_path in possible_env_paths:
        if env_path.exists():
            logger.info(f"✅ Found .env file at: {env_path}")
            logger.info(f"📊 .env file size: {env_path.stat().st_size} bytes")
            return env_path
    
    logger.warning("⚠️  No .env file found in expected locations:")
    for path in possible_env_paths:
        logger.warning(f"   - {path}")
    return None

def main():
    """Main startup function"""
    logger.info("🚀 Starting Chatbot Backend API for Ubuntu VPS...")
    logger.info(f"🐍 Python version: {sys.version}")
    logger.info(f"📁 Working directory: {os.getcwd()}")
    logger.info(f"🖥️  Platform: {sys.platform}")
    
    # Setup Python path
    setup_python_path()
    
    # Verify environment file
    env_path = verify_env_file()
    if not env_path:
        logger.error("❌ No .env file found! Please ensure .env file exists in the root directory.")
        logger.info("💡 Expected .env location: /path/to/your/project/root/.env")
        return 1
    
    try:
        # Import after path setup
        import uvicorn
        from config import settings
        
        logger.info("✅ Configuration loaded successfully")
        logger.info(f"🌍 Host: {settings.host}")
        logger.info(f"🔌 Port: {settings.port}")
        logger.info(f"🐛 Debug: {settings.debug}")
        logger.info(f"📚 API Docs: http://{settings.host}:{settings.port}/docs")
        logger.info("-" * 60)
        
        # For production, we want to use the module path
        app_module = "main:app"
        
        logger.info(f"🎯 Starting server with module: {app_module}")
        
        uvicorn.run(
            app_module,
            host=settings.host,
            port=settings.port,
            reload=settings.debug,
            log_level="info",
            access_log=True,
            use_colors=True,
            # Production settings
            workers=1 if settings.debug else 2,
        )
        
    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        logger.info("💡 Make sure all dependencies are installed:")
        logger.info("   pip install -r requirements.txt")
        return 1
    except Exception as e:
        logger.error(f"❌ Startup error: {e}")
        logger.exception("Full error details:")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code or 0) 
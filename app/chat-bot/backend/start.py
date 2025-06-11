#!/usr/bin/env python3
"""
Startup script for the Chatbot Backend API
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

def main():
    """Main startup function"""
    try:
        import uvicorn
        from config import settings
        
        print("🤖 Starting Chatbot Backend API...")
        print(f"📍 Host: {settings.host}")
        print(f"🔌 Port: {settings.port}")
        print(f"🐛 Debug: {settings.debug}")
        print(f"📚 Docs: http://{settings.host}:{settings.port}/docs")
        print("-" * 50)
        
        uvicorn.run(
    "app.chat-bot.backend.main:app",
    host=settings.host,
    port=settings.port,
    reload=settings.debug,
    log_level="info"
)
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure all dependencies are installed: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Startup error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 
    
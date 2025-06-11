#!/usr/bin/env python3
"""
Deployment check script for Ubuntu VPS
Verifies all requirements are met before running the server
"""

import os
import sys
import subprocess
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    logger.info("🐍 Checking Python version...")
    version = sys.version_info
    if version.major == 3 and version.minor >= 8:
        logger.info(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
        return True
    else:
        logger.error(f"❌ Python {version.major}.{version.minor}.{version.micro} is not compatible. Need Python 3.8+")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    logger.info("📦 Checking dependencies...")
    required_packages = [
        'fastapi',
        'uvicorn',
        'python-dotenv',
        'pydantic',
        'pydantic-settings',
        'supabase',
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            logger.info(f"✅ {package} is installed")
        except ImportError:
            logger.error(f"❌ {package} is missing")
            missing_packages.append(package)
    
    if missing_packages:
        logger.error("🚨 Missing packages found!")
        logger.info("💡 Install missing packages with:")
        logger.info(f"   pip install {' '.join(missing_packages)}")
        return False
    
    logger.info("✅ All required dependencies are installed")
    return True

def check_env_file():
    """Check for .env file"""
    logger.info("🔍 Checking for .env file...")
    current_dir = Path(__file__).parent
    
    # Check possible locations
    possible_paths = [
        current_dir.parent.parent.parent / ".env",  # Root
        current_dir.parent.parent / ".env",         # app
        current_dir.parent / ".env",                # chat-bot
        current_dir / ".env",                       # backend
        Path.cwd() / ".env",                        # CWD
    ]
    
    for env_path in possible_paths:
        if env_path.exists():
            logger.info(f"✅ Found .env file at: {env_path}")
            logger.info(f"📊 File size: {env_path.stat().st_size} bytes")
            
            # Check if file is readable
            try:
                with open(env_path, 'r') as f:
                    content = f.read()
                    lines = [line.strip() for line in content.split('\n') if line.strip() and not line.startswith('#')]
                    logger.info(f"📝 Environment variables found: {len(lines)}")
                return True
            except Exception as e:
                logger.error(f"❌ Cannot read .env file: {e}")
                return False
    
    logger.error("❌ No .env file found!")
    logger.info("💡 Please create a .env file in your project root with required variables")
    return False

def check_ports():
    """Check if the port is available"""
    logger.info("🔌 Checking port availability...")
    
    # Import after checking dependencies
    sys.path.insert(0, str(Path(__file__).parent))
    try:
        from config import settings
        port = settings.port
        
        # Try to bind to the port
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        
        if result == 0:
            logger.warning(f"⚠️  Port {port} is already in use")
            logger.info("💡 Either stop the service using this port or change PORT in .env")
            return False
        else:
            logger.info(f"✅ Port {port} is available")
            return True
            
    except Exception as e:
        logger.error(f"❌ Cannot check port: {e}")
        return False

def check_environment_variables():
    """Check critical environment variables"""
    logger.info("🌍 Checking environment variables...")
    
    sys.path.insert(0, str(Path(__file__).parent))
    try:
        from config import settings
        
        critical_vars = [
            ('SUPABASE_URL', settings.supabase_url, 'Supabase database URL'),
            ('SUPABASE_ANON_KEY', settings.supabase_anon_key, 'Supabase anonymous key'),
        ]
        
        optional_vars = [
            ('COHERE_API_KEY', settings.cohere_api_key, 'Cohere API key'),
            ('OPENROUTER_API_KEY', settings.openrouter_api_key, 'OpenRouter API key'),
        ]
        
        all_good = True
        
        # Check critical variables
        for var_name, var_value, description in critical_vars:
            if var_value and var_value.strip():
                logger.info(f"✅ {var_name} is set ({description})")
            else:
                logger.error(f"❌ {var_name} is missing ({description})")
                all_good = False
        
        # Check optional variables
        for var_name, var_value, description in optional_vars:
            if var_value and var_value.strip():
                logger.info(f"✅ {var_name} is set ({description})")
            else:
                logger.warning(f"⚠️  {var_name} is not set ({description}) - Optional but recommended")
        
        return all_good
        
    except Exception as e:
        logger.error(f"❌ Cannot load configuration: {e}")
        return False

def main():
    """Main deployment check function"""
    logger.info("🚀 Ubuntu VPS Deployment Check")
    logger.info("=" * 50)
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Environment File", check_env_file),
        ("Environment Variables", check_environment_variables),
        ("Port Availability", check_ports),
    ]
    
    all_passed = True
    for check_name, check_func in checks:
        logger.info(f"\n📋 Running {check_name} check...")
        if not check_func():
            all_passed = False
    
    logger.info("\n" + "=" * 50)
    if all_passed:
        logger.info("🎉 All checks passed! Your Ubuntu VPS is ready to run the server.")
        logger.info("💡 Start the server with: python run_server.py")
        return 0
    else:
        logger.error("🚨 Some checks failed. Please fix the issues above before deploying.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 
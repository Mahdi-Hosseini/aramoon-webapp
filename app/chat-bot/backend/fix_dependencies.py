#!/usr/bin/env python3
"""
Fix dependencies for Ubuntu VPS deployment
This script helps resolve the jose package compatibility issue
"""

import subprocess
import sys
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_command(command, description):
    """Run a shell command and return success status"""
    try:
        logger.info(f"🔧 {description}...")
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            logger.info(f"✅ {description} successful")
            if result.stdout.strip():
                logger.info(f"Output: {result.stdout.strip()}")
            return True
        else:
            logger.error(f"❌ {description} failed")
            logger.error(f"Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        logger.error(f"❌ {description} failed with exception: {e}")
        return False

def main():
    """Main function to fix dependencies"""
    logger.info("🚀 Fixing Dependencies for Ubuntu VPS")
    logger.info("=" * 50)
    
    # Commands to fix the jose package issue
    commands = [
        # First, uninstall the problematic jose package
        ("pip uninstall jose -y", "Removing incompatible 'jose' package"),
        
        # Install the correct python-jose package
        ("pip install python-jose[cryptography]", "Installing python-jose with cryptography support"),
        
        # Alternative: install PyJWT as backup
        ("pip install PyJWT[crypto]", "Installing PyJWT as backup JWT library"),
        
        # Update other potentially problematic packages
        ("pip install --upgrade pydantic", "Upgrading Pydantic to latest version"),
        ("pip install --upgrade fastapi", "Upgrading FastAPI to latest version"),
        ("pip install --upgrade uvicorn", "Upgrading Uvicorn to latest version"),
        
        # Install any missing dependencies
        ("pip install python-dotenv", "Ensuring python-dotenv is installed"),
        ("pip install supabase", "Ensuring supabase client is installed"),
    ]
    
    success_count = 0
    total_commands = len(commands)
    
    for command, description in commands:
        if run_command(command, description):
            success_count += 1
        else:
            logger.warning(f"⚠️  Command failed but continuing: {command}")
    
    logger.info("\n" + "=" * 50)
    logger.info(f"📊 Results: {success_count}/{total_commands} commands successful")
    
    if success_count == total_commands:
        logger.info("🎉 All dependency fixes applied successfully!")
        logger.info("💡 Try starting your server now:")
        logger.info("   cd /var/www/aramoon-webapp/app/chat-bot/backend")
        logger.info("   python run_server.py")
    else:
        logger.warning("⚠️  Some commands failed. Manual intervention may be required.")
        logger.info("💡 Common solutions:")
        logger.info("   1. Activate your virtual environment first")
        logger.info("   2. Use pip3 instead of pip if needed")
        logger.info("   3. Try with --user flag: pip install --user package_name")
    
    # Additional checks
    logger.info("\n🔍 Checking Python and package versions...")
    version_commands = [
        ("python --version", "Python version"),
        ("pip list | grep jose", "Jose packages installed"),
        ("pip list | grep pydantic", "Pydantic version"),
        ("pip list | grep fastapi", "FastAPI version"),
    ]
    
    for command, description in version_commands:
        run_command(command, f"Checking {description}")

if __name__ == "__main__":
    main() 
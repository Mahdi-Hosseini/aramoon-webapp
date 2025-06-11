#!/usr/bin/env python3
"""
Test script to verify environment variables are loading correctly
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def test_env_loading():
    """Test environment variable loading"""
    print("🔍 Testing Environment Variable Loading")
    print("=" * 50)
    
    # Show current working directory
    print(f"📁 Current working directory: {os.getcwd()}")
    print(f"📂 Script directory: {current_dir}")
    
    # Calculate root directory path
    root_dir = current_dir.parent.parent.parent
    env_path = root_dir / ".env"
    print(f"🔧 Looking for .env file at: {env_path}")
    print(f"📄 .env file exists: {env_path.exists()}")
    
    if env_path.exists():
        print(f"📊 .env file size: {env_path.stat().st_size} bytes")
    
    print("\n🌍 Loading settings...")
    try:
        from config import settings
        print("✅ Settings loaded successfully!")
        
        # Test some key environment variables
        env_vars_to_test = [
            ("SUPABASE_URL", settings.supabase_url),
            ("SUPABASE_ANON_KEY", settings.supabase_anon_key[:20] + "..." if settings.supabase_anon_key else ""),
            ("COHERE_API_KEY", settings.cohere_api_key[:20] + "..." if settings.cohere_api_key else ""),
            ("OPENROUTER_API_KEY", settings.openrouter_api_key[:20] + "..." if settings.openrouter_api_key else ""),
            ("HOST", settings.host),
            ("PORT", str(settings.port)),
            ("DEBUG", str(settings.debug)),
        ]
        
        print("\n📋 Environment Variables Status:")
        print("-" * 50)
        for var_name, var_value in env_vars_to_test:
            status = "✅ SET" if var_value and var_value != "" else "❌ NOT SET"
            # Only show first 30 chars for security
            display_value = var_value[:30] + "..." if len(var_value) > 30 else var_value
            print(f"{var_name:<25} | {status:<10} | {display_value}")
        
    except Exception as e:
        print(f"❌ Error loading settings: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Environment loading test completed!")
    return True

if __name__ == "__main__":
    test_env_loading() 
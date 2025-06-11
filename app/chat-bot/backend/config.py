import os
from typing import Optional
from pydantic_settings import BaseSettings
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv

# Function to find and load .env file from multiple possible locations
def load_environment_variables():
    """Load environment variables from .env file, trying multiple locations"""
    current_dir = Path(__file__).parent
    
    # Check multiple possible locations for .env file
    possible_env_paths = [
        current_dir.parent.parent.parent / ".env",  # Root directory (most likely)
        current_dir.parent.parent / ".env",         # app directory
        current_dir.parent / ".env",                # chat-bot directory
        current_dir / ".env",                       # backend directory
        Path.cwd() / ".env",                        # Current working directory
    ]
    
    for env_path in possible_env_paths:
        if env_path.exists():
            load_dotenv(dotenv_path=env_path, override=True)
            return env_path
    
    # If no .env file found, load from environment variables only
    load_dotenv(override=True)
    return None

# Load environment variables
env_file_path = load_environment_variables()


class Settings(BaseSettings):
    # Supabase Configuration
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    jwt_secret: str = os.getenv("JWT_SECRET", "your-default-jwt-secret-CHANGE-ME")
    
    # Cohere Configuration
    cohere_api_key: str = os.getenv("COHERE_API_KEY", "")
    
    # OpenRouter Configuration
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_api_base: str = "https://openrouter.ai/api/v1"
    openrouter_model_name: str = "deepseek/deepseek-chat" # Or your specific DeepSeek V2 model ID
    # Optionally, for site identification on OpenRouter leaderboards
    your_site_url: Optional[str] = os.getenv("YOUR_SITE_URL", None) 
    your_site_name: Optional[str] = os.getenv("YOUR_SITE_NAME", None)
    
    # FastAPI Configuration
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Server Configuration
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    debug: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # LLM Configuration
    max_tokens: int = 1000
    temperature: float = 0.7
    max_conversation_length: int = 50  # Maximum messages before summarization
    max_conversations_per_user: int = 20
    
    class Config:
        env_file = str(env_file_path) if env_file_path else None
        case_sensitive = False


settings = Settings() 
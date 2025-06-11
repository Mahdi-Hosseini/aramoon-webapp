from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import settings
import uuid
from typing import Optional
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()


def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return user ID"""
    try:
        payload = jwt.decode(
            token, 
            settings.secret_key, 
            algorithms=[settings.algorithm]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    user_id = verify_token(token)
    
    if user_id is None:
        raise credentials_exception
    
    try:
        # Validate UUID format
        uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception
    
    return user_id


# For Supabase JWT tokens (updated approach)
def verify_supabase_token(token: str) -> Optional[str]:
    """Verify Supabase JWT token - more flexible for web and mobile"""
    try:
        # First, try without verification (to extract info for debugging)
        unverified_payload = jwt.get_unverified_claims(token)
        logger.info(f"Token payload (unverified): {unverified_payload}")
        
        # Get the JWT secret - try different possible values
        jwt_secrets_to_try = [
            settings.jwt_secret,
            settings.supabase_service_role_key,
            settings.supabase_anon_key,
        ]
        
        # Try different verification approaches
        for jwt_secret in jwt_secrets_to_try:
            if not jwt_secret:
                continue
                
            try:
                # Try with minimal verification first
                payload = jwt.decode(
                    token, 
                    jwt_secret,
                    algorithms=["HS256"], 
                    options={"verify_aud": False, "verify_iss": False}  # More permissive
                )
                user_id: str = payload.get("sub")
                if user_id:
                    logger.info(f"Successfully verified token with secret type")
                    return user_id
            except JWTError as e:
                logger.debug(f"JWT verification failed with this secret: {e}")
                continue
        
        # If all verification attempts fail, try without any verification (for development)
        if settings.debug:
            logger.warning("Using unverified token in debug mode")
            user_id = unverified_payload.get("sub")
            if user_id:
                return user_id
        
        logger.error("All JWT verification attempts failed")
        return None
        
    except Exception as e:
        logger.error(f"JWT Validation Error: {e}")
        return None


def get_supabase_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> tuple[str, str]:
    """Get current user_id and token from Supabase JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please check authentication.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    logger.info(f"Attempting to verify token for user authentication")
    
    user_id = verify_supabase_token(token)
    
    if user_id is None:
        logger.error("Token verification failed")
        raise credentials_exception
    
    logger.info(f"Successfully authenticated user: {user_id}")
    return user_id, token # Return both user_id and token 
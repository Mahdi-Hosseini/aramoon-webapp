from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.routes import router
from config import settings  # Environment loading happens here
import logging
import uvicorn
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup
    logger.info("Starting up chatbot API...")
    try:
        # Initialize services (they're already initialized as singletons)
        from database.connection import supabase_client
        from services.llm_service import llm_service
        
        # Test connections
        db_healthy = await supabase_client.health_check()
        llm_healthy = await llm_service.health_check()
        
        if not db_healthy:
            logger.warning("Database connection issue detected")
        if not llm_healthy:
            logger.warning("LLM service issue detected")
        
        logger.info("Chatbot API startup complete")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down chatbot API...")


# Create FastAPI app
app = FastAPI(
    title="Chatbot API",
    description="AI Chatbot with LangChain, Cohere, and Supabase",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

    # allow_origins=[
    #     "http://localhost:8081", # Common Expo Web port
    #     "http://localhost:19006", # Another common Expo port
    #     # Add any other origins your frontend might be served from
    # ],


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development (more permissive for mobile testing)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred"
        }
    )


# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "code": exc.status_code
        }
    )


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Chatbot API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }


# Include API routes
app.include_router(router, prefix="/api/v1", tags=["Chatbot API"])


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    ) 
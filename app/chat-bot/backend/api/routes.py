from fastapi import APIRouter, Depends, HTTPException, status
from services.chat_service import chat_service
from services.database_service import database_service
from utils.auth import get_supabase_user
from models.schemas import (
    ChatRequest, ChatResponse, CreateConversationRequest, ConversationResponse,
    ConversationWithMessagesResponse, UpdateConversationRequest, UpdateMessageRequest,
    MessageResponse, ErrorResponse, HealthResponse
)
from database.connection import supabase_client
from services.llm_service import llm_service
from typing import List
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/test")
async def test_endpoint():
    """Simple test endpoint for connectivity checks"""
    return {
        "message": "Backend is reachable",
        "timestamp": datetime.now().isoformat(),
        "status": "ok"
    }


@router.get("/test-auth")
async def test_auth_endpoint(auth_details: tuple[str, str] = Depends(get_supabase_user)):
    """Test endpoint that requires authentication - helps debug mobile auth issues"""
    user_id, token = auth_details
    return {
        "message": "Authentication successful",
        "user_id": user_id,
        "timestamp": datetime.now().isoformat(),
        "status": "authenticated",
        "platform": "mobile" if "mobile" in token.lower() else "web"
    }


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        db_healthy = await supabase_client.health_check()
        llm_healthy = await llm_service.health_check()
        
        return HealthResponse(
            status="healthy" if db_healthy and llm_healthy else "unhealthy",
            database="healthy" if db_healthy else "unhealthy",
            llm="healthy" if llm_healthy else "unhealthy",
            timestamp=datetime.now()
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            database="unknown",
            llm="unknown",
            timestamp=datetime.now()
        )


# Chat endpoints
@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Main chat endpoint"""
    user_id, token = auth_details
    try:
        response = await chat_service.chat(user_id, token, request)
        return response
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {str(e)}"
        )


# Conversation management endpoints
@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    request: CreateConversationRequest,
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Create a new conversation"""
    user_id, token = auth_details
    try:
        conversation = await database_service.create_conversation(user_id, token, request)
        return conversation
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create conversation: {str(e)}"
        )


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Get all conversations for the current user"""
    user_id, token = auth_details
    try:
        conversations = await database_service.get_user_conversations(user_id, token)
        return conversations
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch conversations: {str(e)}"
        )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Get a specific conversation"""
    user_id, token = auth_details
    try:
        conversation = await database_service.get_conversation_by_id(
            conversation_id, 
            user_id,
            token
        )
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch conversation: {str(e)}"
        )


@router.get("/conversations/{conversation_id}/messages", response_model=ConversationWithMessagesResponse)
async def get_conversation_with_messages(
    conversation_id: str,
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Get a conversation with all its messages"""
    user_id, token = auth_details
    try:
        conversation = await database_service.get_conversation_with_messages(
            conversation_id, 
            user_id,
            token 
        )
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching conversation with messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch conversation with messages: {str(e)}"
        )


@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    request: UpdateConversationRequest,
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Update a conversation"""
    user_id, token = auth_details
    try:
        conversation = await database_service.update_conversation(
            conversation_id,
            user_id,
            token,
            request
        )
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update conversation: {str(e)}"
        )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Delete a conversation"""
    user_id, token = auth_details
    try:
        success = await database_service.delete_conversation(conversation_id, user_id, token)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        return {"message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}"
        )


# Message management endpoints
@router.get("/conversations/{conversation_id}/messages/{message_id}", response_model=MessageResponse)
async def get_message(
    conversation_id: str,
    message_id: str,
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Get a specific message"""
    user_id, _ = auth_details
    try:
        # First verify conversation belongs to user
        conversation = await database_service.get_conversation_by_id(
            conversation_id, 
            user_id
        )
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Get all messages and find the specific one
        messages = await database_service.get_conversation_messages(
            conversation_id, 
            user_id
        )
        
        message = next((m for m in messages if str(m.id) == message_id), None)
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        return message
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch message: {str(e)}"
        )


@router.put("/messages/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: str,
    request: UpdateMessageRequest,
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Update a message"""
    user_id, token = auth_details
    try:
        updated_msg = await database_service.update_message(message_id, user_id, token, request)
        if not updated_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        return updated_msg
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update message: {str(e)}"
        )


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Delete a message"""
    user_id, token = auth_details
    try:
        success = await database_service.delete_message(message_id, user_id, token)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        return {"message": "Message deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete message: {str(e)}"
        )


# Utility endpoints
@router.get("/conversations/{conversation_id}/history", response_model=ConversationWithMessagesResponse)
async def get_conversation_history(
    conversation_id: str,
    auth_details: tuple[str, str] = Depends(get_supabase_user)
):
    """Get conversation history (alias for get_conversation_with_messages)"""
    user_id, _ = auth_details
    return await get_conversation_with_messages(conversation_id, (user_id, "")) 
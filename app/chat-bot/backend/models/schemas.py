from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ConversationStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


# Base models
class MessageBase(BaseModel):
    role: MessageRole
    content: str
    metadata: Optional[Dict[str, Any]] = {}


class ConversationBase(BaseModel):
    title: str = "New Conversation"
    status: ConversationStatus = ConversationStatus.ACTIVE


# Request models
class CreateConversationRequest(ConversationBase):
    pass


class CreateMessageRequest(MessageBase):
    conversation_id: uuid.UUID


class UpdateConversationRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[ConversationStatus] = None
    summary: Optional[str] = None
    entity_memory: Optional[Dict[str, Any]] = None


class UpdateMessageRequest(BaseModel):
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    conversation_id: Optional[uuid.UUID] = None
    message: str
    title: Optional[str] = None


# Response models
class MessageResponse(MessageBase):
    id: uuid.UUID
    conversation_id: uuid.UUID
    tokens_used: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class ConversationResponse(ConversationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    message_count: int
    summary: Optional[str] = None
    entity_memory: Optional[Dict[str, Any]] = {}
    
    class Config:
        orm_mode = True


class ConversationWithMessagesResponse(ConversationResponse):
    messages: List[MessageResponse] = []


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message: MessageResponse
    response: MessageResponse


class EntityMemoryResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    entity_name: str
    entity_type: str
    entity_value: str
    context: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class ConversationSummaryResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    summary_text: str
    messages_summarized: int
    created_at: datetime
    
    class Config:
        orm_mode = True


# Error models
class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


# Health check model
class HealthResponse(BaseModel):
    status: str
    database: str
    llm: str
    timestamp: datetime 
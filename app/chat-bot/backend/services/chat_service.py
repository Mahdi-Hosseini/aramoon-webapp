from services.llm_service import llm_service
from services.database_service import database_service
from models.schemas import (
    ChatRequest, ChatResponse, CreateConversationRequest, CreateMessageRequest,
    MessageRole, ConversationWithMessagesResponse, MessageResponse
)
from langchain.schema import HumanMessage, AIMessage
from config import settings
from typing import Optional
import logging
import uuid

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self):
        self.llm_service = llm_service
        self.db_service = database_service
    
    async def chat(self, user_id: str, token: str, request: ChatRequest) -> ChatResponse:
        logger.info(f"Chat request received for user {user_id}, conversation_id: {request.conversation_id}")
        try:
            logger.info("Step 1: Getting or creating conversation...")
            conversation = await self._get_or_create_conversation(
                user_id, 
                token,
                request.conversation_id, 
                request.title
            )
            logger.info(f"Step 1a: Conversation ID: {conversation.id}")
            
            logger.info("Step 2: Saving user message...")
            user_message = await self._save_user_message(
                user_id, 
                token,
                conversation.id, 
                request.message
            )
            logger.info(f"Step 2a: User message saved. ID: {user_message.id}")
            
            logger.info("Step 3: Getting conversation context with messages...")
            conversation_with_messages = await self.db_service.get_conversation_with_messages(
                str(conversation.id), 
                user_id,
                token 
            )
            logger.info(f"Step 3a: Conversation context fetched. Message count: {len(conversation_with_messages.messages)}")
            
            if len(conversation_with_messages.messages) > settings.max_conversation_length:
                logger.info("Step 4: Conversation length exceeds max, attempting summarization...")
                await self._handle_conversation_summarization(conversation_with_messages, token)
                logger.info("Step 4a: Reloading conversation after summarization...")
                conversation_with_messages = await self.db_service.get_conversation_with_messages(
                    str(conversation.id), 
                    user_id,
                    token
                )
                logger.info(f"Step 4b: Conversation reloaded. Message count: {len(conversation_with_messages.messages)}")
            
            logger.info("Step 5: Preparing messages for LLM...")
            summary = conversation.summary
            entity_memory = conversation.entity_memory or {}
            langchain_messages = self._prepare_messages_for_llm(
                conversation_with_messages.messages
            )
            logger.info(f"Step 5a: Prepared {len(langchain_messages)} messages for LLM.")
            
            logger.info(f"Step 6: Attempting to generate response via LLMService for conversation {conversation.id}")
            response_text, tokens_used = await self.llm_service.generate_response(
                langchain_messages,
                summary,
                entity_memory
            )
            logger.info(f"Step 6a: LLMService generated response. Tokens used: {tokens_used}")
            
            logger.info("Step 7: Saving assistant message...")
            assistant_message = await self._save_assistant_message(
                user_id,
                token,
                conversation.id,
                response_text,
                tokens_used
            )
            logger.info(f"Step 7a: Assistant message saved. ID: {assistant_message.id}")
            
            # Update entity memory if needed (ensure this method exists and works)
            logger.info("Step 8: Updating entity memory...")
            try:
                await self._update_entity_memory(conversation_with_messages, token)
                logger.info("Step 8a: Entity memory update process completed successfully.")
            except Exception as entity_error:
                logger.error(f"Step 8a: Entity memory update failed: {entity_error}", exc_info=True)
                # Don't fail the whole chat if entity update fails

            chat_response_obj = ChatResponse(
                conversation_id=conversation.id,
                message=user_message, # This should be the user's input message object
                response=assistant_message # This should be the assistant's response message object
            )
            logger.info(f"Chat request for user {user_id} completed successfully.")
            return chat_response_obj
            
        except Exception as e:
            logger.error(f"Error in chat service for user {user_id}: {e}", exc_info=True) # Log full traceback
            raise # Re-raise the exception to be caught by FastAPI error handlers
    
    async def _get_or_create_conversation(
        self, 
        user_id: str, 
        token: str,
        conversation_id: Optional[uuid.UUID], 
        title: Optional[str]
    ):
        """Get existing conversation or create a new one"""
        if conversation_id:
            conversation = await self.db_service.get_conversation_by_id(
                str(conversation_id), 
                user_id,
                token
            )
            if conversation:
                return conversation
            else:
                raise Exception("Conversation not found or access denied")
        else:
            # Create new conversation
            create_request = CreateConversationRequest(
                title=title or "New Conversation"
            )
            return await self.db_service.create_conversation(user_id, token, create_request)
    
    async def _save_user_message(
        self, 
        user_id: str, 
        token: str,
        conversation_id: uuid.UUID, 
        content: str
    ) -> MessageResponse:
        """Save user message to database"""
        message_request = CreateMessageRequest(
            conversation_id=conversation_id,
            role=MessageRole.USER,
            content=content
        )
        return await self.db_service.create_message(user_id, token, message_request)
    
    async def _save_assistant_message(
        self, 
        user_id: str, 
        token: str,
        conversation_id: uuid.UUID, 
        content: str,
        tokens_used: int
    ) -> MessageResponse:
        """Save assistant message to database"""
        message_request = CreateMessageRequest(
            conversation_id=conversation_id,
            role=MessageRole.ASSISTANT,
            content=content,
            metadata={"tokens_used": tokens_used}
        )
        return await self.db_service.create_message(user_id, token, message_request)
    
    def _prepare_messages_for_llm(
        self, 
        messages: list[MessageResponse]
    ) -> list:
        """Convert database messages to LangChain format"""
        langchain_messages = []
        
        for message in messages:
            if message.role == MessageRole.USER:
                langchain_messages.append(HumanMessage(content=message.content))
            elif message.role == MessageRole.ASSISTANT:
                langchain_messages.append(AIMessage(content=message.content))
        
        return langchain_messages
    
    async def _handle_conversation_summarization(
        self, 
        conversation: ConversationWithMessagesResponse,
        token: str
    ):
        """Handle conversation summarization when it gets too long"""
        try:
            messages = conversation.messages
            
            # Take the first batch of messages for summarization (keep recent ones)
            messages_to_summarize = messages[:-20]  # Keep last 20 messages
            
            if len(messages_to_summarize) < 5:  # Don't summarize if too few messages
                return
            
            # Convert to LangChain format
            langchain_messages = self._prepare_messages_for_llm(messages_to_summarize)
            
            # Generate summary
            summary = await self.llm_service.summarize_conversation(langchain_messages)
            
            # Save summary
            await self.db_service.save_conversation_summary(
                str(conversation.id),
                summary,
                len(messages_to_summarize),
                token
            )
            
            # Update conversation with summary
            from models.schemas import UpdateConversationRequest
            update_request = UpdateConversationRequest(summary=summary)
            await self.db_service.update_conversation(
                str(conversation.id),
                conversation.user_id,
                token,
                update_request
            )
            
            # Remove old messages (keep recent ones)
            for message in messages_to_summarize:
                await self.db_service.delete_message(str(message.id), conversation.user_id, token)
            
            logger.info(f"Summarized {len(messages_to_summarize)} messages for conversation {conversation.id}")
            
        except Exception as e:
            logger.error(f"Error during summarization: {e}")
            # Don't fail the chat if summarization fails
    
    async def _update_entity_memory(
        self, 
        conversation: ConversationWithMessagesResponse,
        token: str
    ):
        """Update entity memory based on recent messages"""
        try:
            logger.info(f"Entity memory update started for conversation {conversation.id}")
            
            # Get recent messages for entity extraction
            recent_messages = conversation.messages[-5:]  # Last 5 messages
            logger.info(f"Recent messages count for entity extraction: {len(recent_messages)}")
            
            if len(recent_messages) < 2:  # Need at least some conversation
                logger.info("Not enough recent messages for entity extraction (< 2), skipping")
                return
            
            # Convert to LangChain format
            langchain_messages = self._prepare_messages_for_llm(recent_messages)
            logger.info(f"Prepared {len(langchain_messages)} LangChain messages for entity extraction")
            
            # Extract entities
            logger.info("Calling llm_service.extract_entities...")
            entities = await self.llm_service.extract_entities(langchain_messages)
            logger.info(f"Entity extraction completed. Result: {entities}")
            
            if entities:
                logger.info(f"Found {len(entities)} entities to save: {list(entities.keys())}")
                
                # Save entity memory
                logger.info("Saving entities to entity_memory table...")
                await self.db_service.save_entity_memory(
                    str(conversation.id),
                    entities,
                    conversation.user_id,
                    token
                )
                logger.info("Entities saved to entity_memory table successfully")
                
                # Update conversation entity memory field
                logger.info("Updating conversation entity_memory field...")
                await self.db_service.update_conversation_entity_memory(
                    str(conversation.id),
                    conversation.user_id,
                    token,
                    entities
                )
                logger.info("Conversation entity_memory field updated successfully")
                
                logger.info(f"Updated entity memory for conversation {conversation.id}")
            else:
                logger.warning(f"No entities extracted for conversation {conversation.id}. LLM returned empty or None.")
            
        except Exception as e:
            logger.error(f"Error updating entity memory: {e}", exc_info=True)
            # Don't fail the chat if entity extraction fails
    
    async def get_conversation_history(
        self, 
        user_id: str, 
        token: str,
        conversation_id: str
    ) -> Optional[ConversationWithMessagesResponse]:
        """Get full conversation history"""
        try:
            return await self.db_service.get_conversation_with_messages(
                conversation_id, 
                user_id,
                token
            )
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            raise
    
    async def get_user_conversations(self, user_id: str, token: str):
        """Get all conversations for the current user"""
        try:
            return await self.db_service.get_user_conversations(user_id, token)
        except Exception as e:
            logger.error(f"Error fetching user conversations: {e}")
            raise
    
    async def delete_conversation(self, user_id: str, token: str, conversation_id: str) -> bool:
        """Delete a conversation"""
        try:
            return await self.db_service.delete_conversation(conversation_id, user_id, token)
        except Exception as e:
            logger.error(f"Error deleting conversation: {e}")
            raise


# Singleton instance
chat_service = ChatService() 
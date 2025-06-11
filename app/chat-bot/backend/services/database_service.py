from database.connection import supabase_client
from models.schemas import (
    ConversationResponse, MessageResponse, ConversationWithMessagesResponse,
    EntityMemoryResponse, ConversationSummaryResponse, CreateConversationRequest,
    CreateMessageRequest, UpdateConversationRequest, UpdateMessageRequest,
    MessageRole, ConversationStatus
)
from typing import List, Optional, Dict, Any
import uuid
import logging
from datetime import datetime
from config import settings
import asyncio

logger = logging.getLogger(__name__)


class DatabaseService:
    def __init__(self):
        self.client = supabase_client.client
        self.header_lock = asyncio.Lock()
        self._original_headers: Optional[Dict[str, Any]] = None
    
    def _set_user_auth_headers_direct(self, token: str):
        """Sets headers directly on the underlying httpx.AsyncClient session for user context."""
        http_session = self.client.postgrest.session # Get the httpx.AsyncClient
        
        if self._original_headers is not None:
            logger.warning("Original httpx session headers were not cleared before _set_user_auth_headers_direct.")
        
        self._original_headers = http_session.headers.copy() # Store original httpx session headers

        # Construct new headers for the httpx session
        new_headers = self._original_headers.copy() # Start with a copy of current httpx session headers
        new_headers["apikey"] = settings.supabase_anon_key # Ensure this is the project anon key
        new_headers["Authorization"] = f"Bearer {token}"   # User's JWT
        
        http_session.headers = new_headers # Set the modified headers directly on the httpx.AsyncClient

    def _reset_auth_headers_direct(self):
        """Resets httpx session headers to its original state or a default anonymous state."""
        http_session = self.client.postgrest.session # Get the httpx.AsyncClient

        if self._original_headers is not None:
            http_session.headers = self._original_headers # Restore original httpx session headers
            self._original_headers = None
        else:
            logger.warning("No original httpx session headers to restore. Setting to default anonymous state.")
            # Reconstruct headers for a default anonymous session
            # Get X-Client-Info, usually present in default httpx session headers or client.options
            # Prefer it from existing http_session.headers if possible, otherwise from client.options as fallback.
            x_client_info = http_session.headers.get('x-client-info') or self.client.options.headers.get('X-Client-Info') or f'supabase-py/1.2.0' # Default if not found
            
            default_anon_headers = {
                "x-client-info": x_client_info,
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {settings.supabase_anon_key}" 
            }
            http_session.headers = default_anon_headers

    # Conversation CRUD operations
    async def create_conversation(
        self, 
        user_id: str, 
        token: str,
        request: CreateConversationRequest
    ) -> ConversationResponse:
        async with self.header_lock:
            self._set_user_auth_headers_direct(token)
            try:
                # Check conversation limit
                existing_conversations = self.client.table('conversations')\
                    .select('id', count='exact')\
                    .eq('user_id', user_id)\
                    .eq('status', 'active')\
                    .execute()
                
                if existing_conversations.count is not None and existing_conversations.count >= settings.max_conversations_per_user:
                    raise Exception(f"Maximum number of conversations ({settings.max_conversations_per_user}) reached")
                
                conversation_data = {
                    'user_id': user_id,
                    'title': request.title,
                    'status': request.status.value if request.status else ConversationStatus.ACTIVE.value,
                    'entity_memory': {}
                }
                
                # Log headers from the actual httpx session
                logger.info(f"HTTPX Headers before insert: {self.client.postgrest.session.headers}")

                result = self.client.table('conversations')\
                    .insert(conversation_data)\
                    .execute()
                
                if not result.data:
                    error = getattr(result, 'error', None)
                    db_error_message = getattr(error, 'message', str(error) if error else 'Unknown error')
                    # Log the full result on error for more details from Supabase/PostgREST
                    logger.error(f"Supabase DB Response on create_conversation fail: {result}") 
                    raise Exception(f"Failed to create conversation. DB Error: {db_error_message}")
                
                return ConversationResponse(**result.data[0])
                
            except Exception as e:
                logger.error(f"Error creating conversation: {e}")
                raise
            finally:
                self._reset_auth_headers_direct()
    
    async def get_user_conversations(self, user_id: str, token: str) -> List[ConversationResponse]:
        async with self.header_lock:
            self._set_user_auth_headers_direct(token)
            try:
                result = self.client.table('conversations')\
                    .select('*')\
                    .eq('user_id', user_id)\
                    .eq('status', 'active')\
                    .order('updated_at', desc=True)\
                    .execute()
                return [ConversationResponse(**conv) for conv in result.data]
            except Exception as e:
                logger.error(f"Error fetching conversations: {e}")
                raise
            finally:
                self._reset_auth_headers_direct()
    
    async def _internal_get_conversation_by_id(
        self,
        conversation_id: str,
        user_id: str,
        # No token here, assumes headers are already set by caller
    ) -> Optional[ConversationResponse]:
        """Internal method: Fetches conversation assuming lock is held and headers are set."""
        logger.info(f"[DB_SERVICE] _internal_get_conversation_by_id for conv {conversation_id}, user {user_id}")
        try:
            result = self.client.table('conversations')\
                .select('*')\
                .eq('id', conversation_id)\
                .eq('user_id', user_id)\
                .execute()
            if not result.data:
                logger.info(f"[DB_SERVICE] _internal_get_conversation_by_id: No data found for conv {conversation_id}")
                return None
            logger.info(f"[DB_SERVICE] _internal_get_conversation_by_id: Data found for conv {conversation_id}")
            return ConversationResponse(**result.data[0])
        except Exception as e:
            # Log the specific Supabase/PostgREST error if available
            if hasattr(e, 'code') and hasattr(e, 'message'): 
                logger.error(f"[DB_SERVICE] Supabase error in _internal_get_conversation_by_id for conv {conversation_id}: Code {e.code}, Msg: {e.message}", exc_info=True)
            else:
                logger.error(f"[DB_SERVICE] Error in _internal_get_conversation_by_id for conv {conversation_id}: {e}", exc_info=True)
            raise # Re-raise to be caught by the calling context (e.g., create_message)

    async def get_conversation_by_id(
        self, 
        conversation_id: str, 
        user_id: str,
        token: str
    ) -> Optional[ConversationResponse]:
        logger.info(f"[DB_SERVICE] get_conversation_by_id (public) for conv {conversation_id}, user {user_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] get_conversation_by_id: Acquired lock for conv {conversation_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] get_conversation_by_id: Set headers for conv {conversation_id}")
            try:
                return await self._internal_get_conversation_by_id(conversation_id, user_id)
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] get_conversation_by_id: Reset headers and released lock for conv {conversation_id}")
    
    async def update_conversation(
        self, 
        conversation_id: str, 
        user_id: str, 
        token: str,
        request: UpdateConversationRequest
    ) -> Optional[ConversationResponse]:
        async with self.header_lock:
            self._set_user_auth_headers_direct(token)
            try:
                update_data = {}
                if request.title is not None: update_data['title'] = request.title
                if request.status is not None: update_data['status'] = request.status.value
                if request.entity_memory is not None: update_data['entity_memory'] = request.entity_memory
                if not update_data: 
                    logger.info(f"[DB_SERVICE] update_conversation: No actual data to update for conv {conversation_id}. Fetching current.")
                    # Instead of calling public get_conversation_by_id, use internal if headers are already set.
                    # However, since we are in a new lock scope, we can just call the public one or _internal if we ensure atomicity.
                    # For simplicity, let's assume we might want to fetch fresh if no update_data.
                    # This path needs careful review if it's hit often.
                    return await self._internal_get_conversation_by_id(conversation_id, user_id) # Call internal, as lock is held
                logger.info(f"[DB_SERVICE] update_conversation: Updating conv {conversation_id} with data: {update_data}")
                result = self.client.table('conversations')\
                    .update(update_data)\
                    .eq('id', conversation_id)\
                    .eq('user_id', user_id)\
                    .execute()
                if not result.data: 
                    logger.warning(f"[DB_SERVICE] update_conversation: No data returned after update for conv {conversation_id}")
                    return None
                logger.info(f"[DB_SERVICE] update_conversation: Successfully updated conv {conversation_id}")
                return ConversationResponse(**result.data[0])
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error updating conversation {conversation_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] update_conversation: Reset headers and released lock for conv {conversation_id}")
    
    async def delete_conversation(self, conversation_id: str, user_id: str, token: str) -> bool:
        logger.info(f"[DB_SERVICE] delete_conversation called for conv {conversation_id}, user {user_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] delete_conversation: Acquired lock for conv {conversation_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] delete_conversation: Set headers for conv {conversation_id}")
            try:
                result = self.client.table('conversations')\
                    .update({'status': 'deleted'})\
                    .eq('id', conversation_id)\
                    .eq('user_id', user_id)\
                    .execute()
                logger.info(f"[DB_SERVICE] delete_conversation: Supabase update executed for conv {conversation_id}. Data length: {len(result.data) if result.data else 0}")
                return len(result.data) > 0 if result.data else False # Check if data is not None before len()
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error deleting conversation {conversation_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] delete_conversation: Reset headers and released lock for conv {conversation_id}")
    
    # Message CRUD operations
    async def create_message(
        self, 
        user_id: str,
        token: str,
        request: CreateMessageRequest
    ) -> MessageResponse:
        logger.info(f"[DB_SERVICE] create_message called for user {user_id}, conversation {request.conversation_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] create_message: Acquired header_lock for user {user_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] create_message: Set user auth headers for user {user_id}")
            try:
                logger.info(f"[DB_SERVICE] create_message: Calling _internal_get_conversation_by_id for conv {request.conversation_id}")
                # Calls the internal method directly, as lock is held and headers are set
                conversation = await self._internal_get_conversation_by_id(str(request.conversation_id), user_id)
                logger.info(f"[DB_SERVICE] create_message: _internal_get_conversation_by_id returned for conv {request.conversation_id}. Found: {conversation is not None}")
                if not conversation:
                    logger.warning(f"[DB_SERVICE] create_message: Conversation {request.conversation_id} not found or access denied for user {user_id} (called from create_message).")
                    raise Exception("Conversation not found or access denied for message creation")
                
                message_data = {
                    'conversation_id': str(request.conversation_id),
                    'role': request.role.value,
                    'content': request.content,
                    'metadata': request.metadata or {},
                    'tokens_used': self._estimate_tokens(request.content)
                }
                logger.info(f"[DB_SERVICE] create_message: Prepared message_data for insert: {message_data}")
                
                logger.info(f"[DB_SERVICE] create_message: Attempting to insert message into Supabase table 'messages' for conv {request.conversation_id}")
                result = self.client.table('messages')\
                    .insert(message_data)\
                    .execute()
                logger.info(f"[DB_SERVICE] create_message: Supabase insert executed for conv {request.conversation_id}. Result success: {result.data is not None}")
                
                if not result.data: 
                    error = getattr(result, 'error', None)
                    db_error_message = getattr(error, 'message', str(error) if error else 'Unknown error')
                    logger.error(f"[DB_SERVICE] create_message: Supabase DB Response on create_message fail: {result}") 
                    raise Exception(f"Failed to create message. DB Error: {db_error_message}")
                
                response_obj = MessageResponse(**result.data[0])
                logger.info(f"[DB_SERVICE] create_message: Message created successfully for conv {request.conversation_id}. Message ID: {response_obj.id}")
                return response_obj
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error in create_message for user {user_id}, conv {request.conversation_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] create_message: Reset auth headers and released lock for user {user_id}")
    
    async def get_conversation_messages(
        self, 
        conversation_id: str, 
        user_id: str,
        token: str,
        limit: int = 50
    ) -> List[MessageResponse]:
        logger.info(f"[DB_SERVICE] get_conversation_messages (public) for conv {conversation_id}, user {user_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] get_conversation_messages: Acquired lock for conv {conversation_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] get_conversation_messages: Set headers for conv {conversation_id}")
            try:
                # It needs to check conversation existence first
                logger.info(f"[DB_SERVICE] get_conversation_messages: Calling _internal_get_conversation_by_id for conv {conversation_id}")
                conversation = await self._internal_get_conversation_by_id(conversation_id, user_id)
                logger.info(f"[DB_SERVICE] get_conversation_messages: _internal_get_conversation_by_id returned. Found: {conversation is not None}")
                if not conversation:
                    logger.warning(f"[DB_SERVICE] get_conversation_messages: Conversation {conversation_id} not found or access denied for user {user_id}.")
                    raise Exception("Conversation not found or access denied for fetching messages")
                
                logger.info(f"[DB_SERVICE] get_conversation_messages: Fetching messages for conv {conversation_id}")
                result = self.client.table('messages')\
                    .select('*')\
                    .eq('conversation_id', conversation_id)\
                    .order('created_at', desc=False)\
                    .limit(limit)\
                    .execute()
                logger.info(f"[DB_SERVICE] get_conversation_messages: Supabase select executed. Count: {len(result.data) if result.data else 0}")
                return [MessageResponse(**msg) for msg in result.data]
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error fetching messages for conv {conversation_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] get_conversation_messages: Reset headers and released lock for conv {conversation_id}")
    
    async def get_conversation_with_messages(
        self, 
        conversation_id: str, 
        user_id: str,
        token: str
    ) -> Optional[ConversationWithMessagesResponse]:
        logger.info(f"[DB_SERVICE] get_conversation_with_messages (public) for conv {conversation_id}, user {user_id}")
        async with self.header_lock: # Manages its own lock scope
            logger.info(f"[DB_SERVICE] get_conversation_with_messages: Acquired lock for conv {conversation_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] get_conversation_with_messages: Set headers for conv {conversation_id}")
            try:
                logger.info(f"[DB_SERVICE] get_conversation_with_messages: Calling _internal_get_conversation_by_id for conv {conversation_id}")
                conversation_dict = await self._internal_get_conversation_by_id(conversation_id, user_id)
                logger.info(f"[DB_SERVICE] get_conversation_with_messages: _internal_get_conversation_by_id returned. Found: {conversation_dict is not None}")

                if not conversation_dict:
                    logger.warning(f"[DB_SERVICE] get_conversation_with_messages: Conversation {conversation_id} not found or access denied.")
                    return None

                # Convert Pydantic model to dict to add messages to it
                conversation_data = conversation_dict.dict() # Use .model_dump() in Pydantic V2

                logger.info(f"[DB_SERVICE] get_conversation_with_messages: Fetching messages for conv {conversation_id}")
                messages_result = self.client.table('messages')\
                    .select('*')\
                    .eq('conversation_id', conversation_id)\
                    .order('created_at', desc=False)\
                    .execute()
                logger.info(f"[DB_SERVICE] get_conversation_with_messages: Supabase select for messages executed. Count: {len(messages_result.data) if messages_result.data else 0}")
                
                conversation_data['messages'] = [MessageResponse(**msg) for msg in messages_result.data]
                
                response_obj = ConversationWithMessagesResponse(**conversation_data)
                logger.info(f"[DB_SERVICE] get_conversation_with_messages: Successfully fetched conv {conversation_id} with messages.")
                return response_obj
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error fetching conversation with messages {conversation_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] get_conversation_with_messages: Reset headers and released lock for conv {conversation_id}")
    
    async def update_message(
        self, 
        message_id: str, 
        user_id: str, 
        token: str,
        request: UpdateMessageRequest
    ) -> Optional[MessageResponse]:
        logger.info(f"[DB_SERVICE] update_message called for msg {message_id}, user {user_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] update_message: Acquired lock for msg {message_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] update_message: Set headers for msg {message_id}")
            try:
                # Optional: Verify message ownership if needed by fetching it first
                # existing_message = await self._internal_get_message_by_id(message_id, user_id) # Needs this method
                # if not existing_message: raise Exception("Message not found or access denied")

                update_data = request.dict(exclude_unset=True)
                if not update_data:
                    logger.info(f"[DB_SERVICE] update_message: No data to update for msg {message_id}")
                    # Potentially fetch and return current message if no update_data
                    # This would require a get_message_by_id method
                    return None # Or fetch and return 

                logger.info(f"[DB_SERVICE] update_message: Updating msg {message_id} with data: {update_data}")
                result = self.client.table('messages')\
                    .update(update_data)\
                    .eq('id', message_id)\
                    .eq('user_id', user_id)\
                    .execute()
                    # Assuming messages table has user_id for RLS/policy check

                if not result.data:
                    logger.warning(f"[DB_SERVICE] update_message: No data returned after update for msg {message_id}")
                    return None
                logger.info(f"[DB_SERVICE] update_message: Successfully updated msg {message_id}")
                return MessageResponse(**result.data[0])
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error updating message {message_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] update_message: Reset headers and released lock for msg {message_id}")
    
    async def delete_message(self, message_id: str, user_id: str, token: str) -> bool:
        logger.info(f"[DB_SERVICE] delete_message called for msg {message_id}, user {user_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] delete_message: Acquired lock for msg {message_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] delete_message: Set headers for msg {message_id}")
            try:
                # Optional: Verify message ownership if needed
                logger.info(f"[DB_SERVICE] delete_message: Deleting msg {message_id}")
                result = self.client.table('messages')\
                    .delete()\
                    .eq('id', message_id)\
                    .eq('user_id', user_id)\
                    .execute()

                    # Assuming messages table has user_id for RLS/policy check

                logger.info(f"[DB_SERVICE] delete_message: Supabase delete executed for msg {message_id}. Success: {result.data is not None and len(result.data) > 0}") # Check result.data
                # For delete, success is often indicated by the number of rows affected, 
                # or simply by not throwing an error if the item existed and was accessible.
                # Supabase delete().execute() typically returns data of the deleted row(s).
                return bool(result.data) # True if data (deleted row) is returned
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error deleting message {message_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] delete_message: Reset headers and released lock for msg {message_id}")
    
    # Memory management operations
    async def save_conversation_summary(
        self, 
        conversation_id: str, 
        summary_text: str, 
        messages_summarized: int,
        token: str
    ) -> ConversationSummaryResponse:
        logger.info(f"[DB_SERVICE] save_conversation_summary for conv {conversation_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] save_conversation_summary: Acquired lock for conv {conversation_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] save_conversation_summary: Set headers for conv {conversation_id}")
            try:
                # Check if user owns conversation (implicit via RLS if get_conversation_by_id is used)
                # Or, for direct insert, rely on RLS based on user_id in summary_data if table has it.
                # For simplicity, assuming direct insert with RLS on 'conversation_summaries' based on user_id from 'conversations' table.

                summary_data = {
                    'conversation_id': conversation_id,
                    'summary_text': summary_text,
                    'messages_summarized': messages_summarized
                }
                logger.info(f"[DB_SERVICE] save_conversation_summary: Inserting summary data: {summary_data}")
                result = self.client.table('conversation_summaries')\
                    .insert(summary_data)\
                    .execute()
                
                if not result.data:
                    error = getattr(result, 'error', None)
                    db_error_message = getattr(error, 'message', str(error) if error else 'Unknown error')
                    logger.error(f"[DB_SERVICE] save_conversation_summary: Supabase DB Response on fail: {result}") 
                    raise Exception(f"Failed to save conversation summary. DB Error: {db_error_message}")
                
                logger.info(f"[DB_SERVICE] save_conversation_summary: Summary saved for conv {conversation_id}")
                return ConversationSummaryResponse(**result.data[0])
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error saving conversation summary for conv {conversation_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] save_conversation_summary: Reset headers and released lock for conv {conversation_id}")
    
    async def get_conversation_summary(
        self, 
        conversation_id: str,
        # user_id: str, # To verify ownership if RLS isn't solely based on conv_id linked to user
        token: str
    ) -> Optional[ConversationSummaryResponse]:
        logger.info(f"[DB_SERVICE] get_conversation_summary for conv {conversation_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] get_conversation_summary: Acquired lock for conv {conversation_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] get_conversation_summary: Set headers for conv {conversation_id}")
            try:
                # Assuming 'conversation_summaries' can be queried by 'conversation_id'
                # and RLS ensures user can only access summaries linked to their conversations.
                result = self.client.table('conversation_summaries')\
                    .select('*')\
                    .eq('conversation_id', conversation_id)\
                    .order('created_at', desc=True)\
                    .limit(1)\
                    .execute()
                
                if not result.data:
                    logger.info(f"[DB_SERVICE] get_conversation_summary: No summary found for conv {conversation_id}")
                    return None
                logger.info(f"[DB_SERVICE] get_conversation_summary: Summary found for conv {conversation_id}")
                return ConversationSummaryResponse(**result.data[0])
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error fetching conversation summary for conv {conversation_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] get_conversation_summary: Reset headers and released lock for conv {conversation_id}")
    
    async def save_entity_memory(
        self, 
        conversation_id: str, 
        entities: Dict[str, Any],
        user_id: str, # Added user_id for explicit check
        token: str
    ) -> List[EntityMemoryResponse]:
        logger.info(f"[DB_SERVICE] save_entity_memory for conv {conversation_id}, user {user_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] save_entity_memory: Acquired lock for conv {conversation_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] save_entity_memory: Set headers for conv {conversation_id}")
            try:
                # Ensure user owns the conversation
                conversation = await self._internal_get_conversation_by_id(conversation_id, user_id)
                if not conversation:
                    raise Exception(f"Conversation {conversation_id} not found or access denied for user {user_id}.")

                records_to_insert = []
                for entity_type, entity_details_list in entities.items():
                    if not isinstance(entity_details_list, list):
                        entity_details_list = [entity_details_list] # Handle single entity as list
                    for entity_detail in entity_details_list:
                        # Handle different entity structures
                        if isinstance(entity_detail, dict):
                            entity_name = entity_detail.get('name', entity_detail.get('description', entity_detail.get('event', entity_type)))
                            entity_value = str(entity_detail)
                        else:
                            entity_name = str(entity_detail)
                            entity_value = str(entity_detail)
                        
                        records_to_insert.append({
                            'conversation_id': conversation_id,
                            'entity_name': entity_name,
                            'entity_type': entity_type,
                            'entity_value': entity_value,
                            # 'user_id': user_id # If entity_memory table has user_id directly
                        })
                
                if not records_to_insert:
                    logger.info(f"[DB_SERVICE] save_entity_memory: No entities to save for conv {conversation_id}")
                    return []

                logger.info(f"[DB_SERVICE] save_entity_memory: Inserting {len(records_to_insert)} entity records for conv {conversation_id}")
                result = self.client.table('entity_memory')\
                    .upsert(records_to_insert, on_conflict='conversation_id,entity_name,entity_type')\
                    .execute()

                if not result.data:
                    error = getattr(result, 'error', None)
                    db_error_message = getattr(error, 'message', str(error) if error else 'Unknown error')
                    logger.error(f"[DB_SERVICE] save_entity_memory: Supabase DB Response on fail: {result}") 
                    raise Exception(f"Failed to save entity memory. DB Error: {db_error_message}")
                
                logger.info(f"[DB_SERVICE] save_entity_memory: Entities saved for conv {conversation_id}")
                return [EntityMemoryResponse(**record) for record in result.data]
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error saving entity memory for conv {conversation_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] save_entity_memory: Reset headers and released lock for conv {conversation_id}")
    
    async def get_entity_memory(
        self, 
        conversation_id: str,
        user_id: str, # Added user_id for explicit check
        token: str
    ) -> List[EntityMemoryResponse]:
        logger.info(f"[DB_SERVICE] get_entity_memory for conv {conversation_id}, user {user_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] get_entity_memory: Acquired lock for conv {conversation_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] get_entity_memory: Set headers for conv {conversation_id}")
            try:
                # Ensure user owns the conversation before fetching its entities
                conversation = await self._internal_get_conversation_by_id(conversation_id, user_id)
                if not conversation:
                    raise Exception(f"Conversation {conversation_id} not found or access denied for user {user_id}.")

                result = self.client.table('entity_memory')\
                    .select('*')\
                    .eq('conversation_id', conversation_id)\
                    .execute()
                
                logger.info(f"[DB_SERVICE] get_entity_memory: Fetched {len(result.data) if result.data else 0} entity records for conv {conversation_id}")
                return [EntityMemoryResponse(**record) for record in result.data]
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error fetching entity memory for conv {conversation_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] get_entity_memory: Reset headers and released lock for conv {conversation_id}")
    
    async def update_conversation_entity_memory(
        self, 
        conversation_id: str, 
        user_id: str, 
        token: str,
        entity_memory: Dict[str, Any] # This is the new full entity memory to set
    ) -> bool:
        logger.info(f"[DB_SERVICE] update_conversation_entity_memory for conv {conversation_id}, user {user_id}")
        async with self.header_lock:
            logger.info(f"[DB_SERVICE] update_conversation_entity_memory: Acquired lock for conv {conversation_id}")
            self._set_user_auth_headers_direct(token)
            logger.info(f"[DB_SERVICE] update_conversation_entity_memory: Set headers for conv {conversation_id}")
            try:
                # This directly updates the 'entity_memory' JSONB field in the 'conversations' table.
                result = self.client.table('conversations')\
                    .update({'entity_memory': entity_memory})\
                    .eq('id', conversation_id)\
                    .eq('user_id', user_id)\
                    .execute()

                    # Crucial for ensuring user owns the conversation
                
                logger.info(f"[DB_SERVICE] update_conversation_entity_memory: Supabase update executed for conv {conversation_id}. Data length: {len(result.data) if result.data else 0}")
                # Update is successful if it doesn't error and RLS allows it.
                # result.data will contain the updated conversation record(s).
                return bool(result.data) # True if update affected rows and returned them
            except Exception as e:
                logger.error(f"[DB_SERVICE] Error updating conversation entity_memory for conv {conversation_id}: {e}", exc_info=True)
                raise
            finally:
                self._reset_auth_headers_direct()
                logger.info(f"[DB_SERVICE] update_conversation_entity_memory: Reset headers and released lock for conv {conversation_id}")

    def _estimate_tokens(self, text: str) -> int:
        return max(1, len(text) // 4)


# Singleton instance
database_service = DatabaseService() 
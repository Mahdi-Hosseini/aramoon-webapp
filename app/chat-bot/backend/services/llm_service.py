import openai # Will be used via LangChain's ChatOpenAI
from langchain_openai import ChatOpenAI # Use the new package
from langchain.schema import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain.memory import ConversationSummaryBufferMemory, ConversationEntityMemory
from typing import List, Dict, Any, Optional, Tuple
import logging
import json
from config import settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY is not set in the environment/configuration.")

        # Initialize ChatOpenAI for OpenRouter
        model_params = {
            "model_name": settings.openrouter_model_name,
            "openai_api_key": settings.openrouter_api_key,
            "openai_api_base": settings.openrouter_api_base,
            "temperature": settings.temperature,
            "max_tokens": settings.max_tokens,
            # "streaming": False, # Default is False
        }

        model_kwargs_headers = {}
        if settings.your_site_url:
            model_kwargs_headers["HTTP-Referer"] = settings.your_site_url
        if settings.your_site_name:
            model_kwargs_headers["X-Title"] = settings.your_site_name
        
        if model_kwargs_headers: # Only add model_kwargs if headers are present
            model_params["model_kwargs"] = {"headers": model_kwargs_headers}
        
        self.chat_model = ChatOpenAI(**model_params)
        
    async def generate_response(
        self, 
        messages: List[BaseMessage], 
        conversation_summary: Optional[str] = None,
        entity_memory: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, int]:
        """
        Generate response using OpenRouter (via ChatOpenAI) with memory context
        Returns: (response_text, tokens_used) - token estimation will be rough
        """
        try:
            system_context = self._build_system_context(conversation_summary, entity_memory)
            
            final_messages = []
            if system_context:
                final_messages.append(SystemMessage(content=system_context))
            final_messages.extend(messages)
            
            response = await self.chat_model.ainvoke(final_messages)
            
            response_text = response.content
            # Token usage for OpenRouter models is not directly available in the response object
            # like it is for some other direct integrations. We'll estimate.
            # Actual token usage might be available if OpenRouter adds it to usage metadata.
            tokens_used = self._estimate_tokens(response_text) # Rough estimation
            
            return response_text, tokens_used
            
        except Exception as e:
            logger.error(f"Error generating response from OpenRouter: {e}")
            # Check if the error is an APIAuthenticationError from OpenAI SDK
            if isinstance(e, openai.APIAuthenticationError):
                 logger.error(f"OpenRouter API Authentication Error: {e}. Check your OPENROUTER_API_KEY.")
                 raise Exception(f"OpenRouter authentication failed. Please check your API key.")
            elif isinstance(e, openai.APIConnectionError):
                logger.error(f"OpenRouter API Connection Error: {e}. Check network or OpenRouter status.")
                raise Exception(f"Could not connect to OpenRouter. Please check network or OpenRouter status.")
            elif isinstance(e, openai.RateLimitError):
                logger.error(f"OpenRouter Rate Limit Error: {e}.")
                raise Exception(f"OpenRouter rate limit exceeded. Please check your plan or try again later.")
            elif isinstance(e, openai.APIStatusError): # For other API errors (4xx, 5xx)
                logger.error(f"OpenRouter API Status Error: Status {e.status_code}, Response: {e.response}")
                raise Exception(f"OpenRouter API error: {e.status_code}. Details: {e.message}")

            raise Exception(f"Failed to generate response from OpenRouter: {str(e)}")
    
    async def summarize_conversation(self, messages: List[BaseMessage]) -> str:
        """Summarize a conversation for memory management using OpenRouter"""
        try:
            conversation_text = "\n".join([
                f"{msg.__class__.__name__}: {msg.content}" 
                for msg in messages
            ])
            
            summary_prompt = f"""
            Please provide a concise summary of the following conversation, focusing on:
            1. Main topics discussed
            2. Important decisions or conclusions
            3. Key information that should be remembered for future conversations
            
            Conversation:
            {conversation_text}
            
            Summary:
            """
            
            summary_messages = [HumanMessage(content=summary_prompt)]
            response = await self.chat_model.ainvoke(summary_messages)
            return response.content.strip()
            
        except Exception as e:
            logger.error(f"Error summarizing conversation with OpenRouter: {e}")
            return "Unable to generate summary via OpenRouter"
    
    async def extract_entities(self, messages: List[BaseMessage]) -> Dict[str, Any]:
        """Extract important entities from conversation using OpenRouter"""
        try:
            conversation_text = "\n".join([
                f"{msg.__class__.__name__}: {msg.content}" 
                for msg in messages
            ])
            
            entity_prompt = f"""
            Extract important entities from the following conversation. 
            Return a JSON object with entity types as keys and their details as values.
            Focus on: people, places, organizations, dates, preferences, goals, and other important information.
            
            Conversation:
            {conversation_text}
            
            Entities (JSON format):
            """
            
            entity_messages = [HumanMessage(content=entity_prompt)]
            response = await self.chat_model.ainvoke(entity_messages)
            
            try:
                # Attempt to strip markdown and then parse JSON
                content_to_parse = response.content.strip()
                if content_to_parse.startswith("```json"):
                    content_to_parse = content_to_parse[7:]
                if content_to_parse.endswith("```"):
                    content_to_parse = content_to_parse[:-3]
                
                entities = json.loads(content_to_parse.strip())
                return entities
            except json.JSONDecodeError as je:
                logger.warning(f"Failed to parse entities JSON from OpenRouter: {je}. Response was: {response.content.strip()}")
                return {}
            
        except Exception as e:
            logger.error(f"Error extracting entities with OpenRouter: {e}")
            return {}
    
    def _build_system_context(
        self, 
        summary: Optional[str] = None, 
        entity_memory: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build system context from summary and entity memory"""
        context_parts = []
        
        context_parts.append(
            "You are a helpful AI assistant. Use the following context to provide "
            "relevant and personalized responses."

            "If you are asked to provide information about yourself (e.g., who you are, what your name is), respond that you are Manna, an AI assistant created to help with user queries."

        ) # Added personality
        
        if summary:
            context_parts.append(f"\nConversation Summary:\n{summary}")
        
        if entity_memory:
            entities_text = "\n".join([
                f"- {key}: {value}" 
                for key, value in entity_memory.items()
            ])
            context_parts.append(f"\nImportant Information:\n{entities_text}")
        
        return "\n".join(context_parts)
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token usage (approximate) - more accurate tokenizers can be used if needed"""
        return max(1, len(text) // 4) # A very rough estimate
    
    def convert_to_langchain_messages(self, messages_data: List[Dict[str, Any]]) -> List[BaseMessage]:
        """Convert message data to LangChain message objects"""
        langchain_messages = []
        for msg_data in messages_data:
            role = msg_data.get('role', 'user')
            content = msg_data.get('content', '')
            
            if role == 'user':
                langchain_messages.append(HumanMessage(content=content))
            elif role == 'assistant':
                langchain_messages.append(AIMessage(content=content))
            elif role == 'system':
                langchain_messages.append(SystemMessage(content=content))
        return langchain_messages
    
    async def health_check(self) -> bool:
        """Check if LLM service (OpenRouter) is healthy"""
        try:
            test_messages = [HumanMessage(content="Hello, this is a health check.")]
            response = await self.chat_model.ainvoke(test_messages)
            return len(response.content) > 0
        except openai.APIAuthenticationError as auth_err:
            logger.error(f"OpenRouter Health Check - API Authentication Error: {auth_err}. Check your OPENROUTER_API_KEY.")
            return False
        except openai.APIConnectionError as conn_err:
            logger.error(f"OpenRouter Health Check - API Connection Error: {conn_err}. Check network or OpenRouter status.")
            return False
        except Exception as e:
            logger.error(f"OpenRouter LLM health check failed: {e}")
            return False

# Make llm_service a singleton
llm_service = LLMService() 
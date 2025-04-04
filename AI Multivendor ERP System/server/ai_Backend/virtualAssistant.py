import logging
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError
import openai
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    handlers=[
        logging.FileHandler('virtual_assistant.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class VirtualAssistant:
    def __init__(self):
        """Initialize the virtual assistant with necessary configurations."""
        self.bedrock = boto3.client('bedrock-runtime')
        self.conversation_history = []
        self.max_history_length = 10
        self.load_config()

    def load_config(self) -> None:
        """Load configuration from environment variables."""
        self.model_id = os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-v2')
        self.temperature = float(os.getenv('AI_TEMPERATURE', '0.7'))
        self.max_tokens = int(os.getenv('MAX_TOKENS', '500'))

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def generate_ai_response(self, prompt: str) -> str:
        """
        Generate response using Amazon Bedrock.
        
        Args:
            prompt (str): The input prompt for the AI model.
            
        Returns:
            str: Generated response from the AI model.
        """
        try:
            body = json.dumps({
                "prompt": self._format_prompt(prompt),
                "max_tokens_to_sample": self.max_tokens,
                "temperature": self.temperature,
                "anthropic_version": "bedrock-2023-05-31"
            })

            response = self.bedrock.invoke_model(
                modelId=self.model_id,
                body=body
            )
            
            response_body = json.loads(response.get('body').read())
            return response_body.get('completion', '')
            
        except ClientError as e:
            logger.error(f"AWS Bedrock error: {str(e)}")
            raise

    def _format_prompt(self, query: str) -> str:
        """Format the prompt with conversation history and context."""
        context = "\n".join([f"Human: {h['query']}\nAssistant: {h['response']}"
                           for h in self.conversation_history[-3:]])
        return f"{context}\nHuman: {query}\nAssistant:"

    def _update_conversation_history(self, query: str, response: str) -> None:
        """Update conversation history with new interaction."""
        self.conversation_history.append({
            'query': query,
            'response': response,
            'timestamp': datetime.now().isoformat()
        })
        
        # Maintain history length
        if len(self.conversation_history) > self.max_history_length:
            self.conversation_history.pop(0)

    def process_query(self, query: str) -> Dict[str, Any]:
        """
        Process a user's query and generate a response.

        Args:
            query (str): The user's input query.

        Returns:
            Dict[str, Any]: Response object containing status and message.
        """
        try:
            # Input validation
            if not self._validate_input(query):
                raise ValueError("Invalid query. It must be a non-empty string.")

            # Log the received query
            logger.info(f"Processing query: {query}")

            # Preprocess query
            processed_query = self._preprocess_query(query)

            # Generate response using AI
            ai_response = self.generate_ai_response(processed_query)

            # Post-process response
            final_response = self._postprocess_response(ai_response)

            # Update conversation history
            self._update_conversation_history(query, final_response)

            # Log the generated response
            logger.info(f"Generated response: {final_response}")

            return {
                'status': 'success',
                'message': final_response,
                'timestamp': datetime.now().isoformat()
            }

        except ValueError as e:
            logger.error(f"Input validation error: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'error_type': 'validation_error'
            }
        except Exception as e:
            logger.error(f"Unexpected error during query processing: {e}", exc_info=True)
            return {
                'status': 'error',
                'message': "An error occurred while processing your query.",
                'error_type': 'processing_error'
            }

    def _validate_input(self, query: str) -> bool:
        """Validate the input query."""
        return isinstance(query, str) and bool(query.strip())

    def _preprocess_query(self, query: str) -> str:
        """Preprocess the input query."""
        # Remove extra whitespace
        query = ' '.join(query.split())
        # Convert to lowercase
        query = query.lower()
        return query

    def _postprocess_response(self, response: str) -> str:
        """Post-process the AI-generated response."""
        # Remove any unwanted characters or formatting
        response = response.strip()
        # Ensure response ends with proper punctuation
        if response and response[-1] not in '.!?':
            response += '.'
        return response

    def get_conversation_history(self) -> list:
        """Return the conversation history."""
        return self.conversation_history

    def clear_conversation_history(self) -> None:
        """Clear the conversation history."""
        self.conversation_history = []

# Usage example
if __name__ == "__main__":
    assistant = VirtualAssistant()
    
    try:
        response = assistant.process_query("What's the weather like today?")
        print(json.dumps(response, indent=2))
    except Exception as e:
        logger.error(f"Error in main execution: {e}", exc_info=True)

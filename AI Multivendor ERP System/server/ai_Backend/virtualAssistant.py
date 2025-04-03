import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def process_query(query):
    """
    Process a user's query and generate a response.

    Args:
        query (str): The user's input query.

    Returns:
        str: The virtual assistant's response.
    """
    try:
        # Validate input
        if not query or not isinstance(query, str):
            raise ValueError("Invalid query. It must be a non-empty string.")

        # Log the received query
        logging.info(f"Processing query: {query}")

        # Placeholder for virtual assistant logic
        # Replace this with actual logic (e.g., NLP model, rule-based responses, etc.)
        response = f"Response to: {query}"

        # Log the generated response
        logging.info(f"Generated response: {response}")

        return response

    except ValueError as e:
        logging.error(f"Input validation error: {e}")
        return "Invalid query. Please provide a valid input."
    except Exception as e:
        logging.error(f"Unexpected error during query processing: {e}", exc_info=True)
        return "An error occurred while processing your query."
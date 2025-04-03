import logging
from textblob import TextBlob  # For basic sentiment analysis

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def validate_input(message):
    """
    Validate the user's input message.

    Args:
        message (str): The user's input message.

    Returns:
        str: Sanitized message if valid, or an error message.
    """
    if not message or not message.strip():
        return None, "Please provide a valid input."
    sanitized_message = message.strip()
    return sanitized_message, None

def analyze_sentiment(message):
    """
    Analyze the sentiment of the input message.

    Args:
        message (str): The sanitized input message.

    Returns:
        dict: Sentiment analysis results (polarity and subjectivity).
    """
    sentiment = TextBlob(message).sentiment
    return {
        "polarity": sentiment.polarity,
        "subjectivity": sentiment.subjectivity
    }

def generate_response(message, sentiment):
    """
    Generate a chatbot response based on the input message and sentiment.

    Args:
        message (str): The sanitized input message.
        sentiment (dict): Sentiment analysis results.

    Returns:
        str: The chatbot's response.
    """
    response = f"Response to: {message}"
    if sentiment["polarity"] > 0:
        response += " (You seem positive!)"
    elif sentiment["polarity"] < 0:
        response += " (You seem negative!)"
    else:
        response += " (Neutral tone detected.)"
    return response

def get_response(message):
    """
    Process the input message and generate a chatbot response.

    Args:
        message (str): The user's input message.

    Returns:
        str: The chatbot's response.
    """
    try:
        # Validate input
        sanitized_message, error = validate_input(message)
        if error:
            return error

        # Log sanitized input
        logging.info(f"Sanitized message: {sanitized_message}")

        # Perform sentiment analysis
        sentiment = analyze_sentiment(sanitized_message)
        logging.info(f"Sentiment analysis: Polarity={sentiment['polarity']}, Subjectivity={sentiment['subjectivity']}")

        # Generate response
        response = generate_response(sanitized_message, sentiment)
        logging.info(f"Generated response: {response}")
        return response

    except Exception as e:
        logging.error(f"Chatbot error: {e}", exc_info=True)
        return "An error occurred while processing your request."
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def detect_fraud(transaction):
    """
    Detect potential fraud in a transaction.

    Args:
        transaction (dict): A dictionary containing transaction details (e.g., amount, user_id, etc.).

    Returns:
        str: A message indicating whether fraud is detected or not.
    """
    try:
        # Validate transaction input
        if not isinstance(transaction, dict):
            raise ValueError("Transaction must be a dictionary.")
        if "amount" not in transaction:
            raise KeyError("Transaction must contain an 'amount' field.")

        # Log transaction details (excluding sensitive information)
        logging.info(f"Processing transaction: {transaction.get('id', 'unknown')}")

        # Fraud detection logic
        amount = transaction["amount"]
        if amount > 10000:
            logging.warning(f"Fraud detected for transaction ID: {transaction.get('id', 'unknown')}")
            return "Fraud detected"
        else:
            logging.info(f"No fraud detected for transaction ID: {transaction.get('id', 'unknown')}")
            return "No fraud detected"

    except KeyError as e:
        logging.error(f"Missing key in transaction: {e}")
        return "Invalid transaction data: Missing required fields."
    except ValueError as e:
        logging.error(f"Invalid transaction data: {e}")
        return "Invalid transaction data: Incorrect format."
    except Exception as e:
        logging.error(f"Unexpected error during fraud detection: {e}", exc_info=True)
        return "An error occurred while detecting fraud."
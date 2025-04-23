import logging
from datetime import datetime, timedelta
import numpy as np
from typing import Dict, Optional, List
from dataclasses import dataclass
import json

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    handlers=[
        logging.FileHandler('fraud_detection.log'),
        logging.StreamHandler()
    ]
)

@dataclass
class TransactionRisk:
    score: float
    flags: List[str]
    is_fraudulent: bool

class FraudDetector:
    def __init__(self):
        self.transaction_history = {}
        self.suspicious_ips = set()
        self.high_risk_countries = {'XX', 'YY', 'ZZ'}  # Replace with actual high-risk countries
        
        # Configure thresholds
        self.amount_threshold = 10000
        self.velocity_threshold = 5
        self.velocity_window = timedelta(hours=1)

    def validate_transaction(self, transaction: Dict) -> Optional[str]:
        """Validate transaction data structure and required fields."""
        required_fields = {'id', 'amount', 'user_id', 'timestamp', 'ip_address', 'country'}
        
        if not isinstance(transaction, dict):
            return "Transaction must be a dictionary"
            
        missing_fields = required_fields - transaction.keys()
        if missing_fields:
            return f"Missing required fields: {', '.join(missing_fields)}"
            
        if not isinstance(transaction['amount'], (int, float)) or transaction['amount'] <= 0:
            return "Invalid amount value"
            
        try:
            datetime.fromisoformat(transaction['timestamp'])
        except ValueError:
            return "Invalid timestamp format"
            
        return None

    def calculate_risk_score(self, transaction: Dict) -> TransactionRisk:
        """Calculate risk score based on multiple factors."""
        risk_flags = []
        base_score = 0.0
        
        # Check transaction amount
        if transaction['amount'] > self.amount_threshold:
            base_score += 0.4
            risk_flags.append('high_amount')

        # Check transaction velocity
        recent_transactions = self.get_recent_transactions(
            transaction['user_id'], 
            transaction['timestamp']
        )
        if len(recent_transactions) > self.velocity_threshold:
            base_score += 0.3
            risk_flags.append('high_velocity')

        # Check location risk
        if transaction['country'] in self.high_risk_countries:
            base_score += 0.3
            risk_flags.append('high_risk_location')

        # Check IP risk
        if transaction['ip_address'] in self.suspicious_ips:
            base_score += 0.4
            risk_flags.append('suspicious_ip')

        # Pattern analysis
        if self.detect_unusual_patterns(transaction):
            base_score += 0.2
            risk_flags.append('unusual_pattern')

        return TransactionRisk(
            score=min(base_score, 1.0),
            flags=risk_flags,
            is_fraudulent=base_score >= 0.7
        )

    def get_recent_transactions(self, user_id: str, timestamp: str) -> List[Dict]:
        """Get recent transactions for a user within the velocity window."""
        current_time = datetime.fromisoformat(timestamp)
        window_start = current_time - self.velocity_window
        
        return [
            tx for tx in self.transaction_history.get(user_id, [])
            if datetime.fromisoformat(tx['timestamp']) > window_start
        ]

    def detect_unusual_patterns(self, transaction: Dict) -> bool:
        """Detect unusual patterns in user behavior."""
        user_history = self.transaction_history.get(transaction['user_id'], [])
        if not user_history:
            return False

        # Calculate statistical measures
        amounts = [tx['amount'] for tx in user_history]
        mean_amount = np.mean(amounts)
        std_amount = np.std(amounts) if len(amounts) > 1 else 0

        # Check if current transaction amount is significantly different
        z_score = (transaction['amount'] - mean_amount) / (std_amount if std_amount > 0 else 1)
        return abs(z_score) > 3  # More than 3 standard deviations

    def update_transaction_history(self, transaction: Dict):
        """Update transaction history for the user."""
        user_id = transaction['user_id']
        if user_id not in self.transaction_history:
            self.transaction_history[user_id] = []
        self.transaction_history[user_id].append(transaction)

    def detect_fraud(self, transaction: Dict) -> str:
        """
        Enhanced fraud detection with multiple validation checks and risk scoring.

        Args:
            transaction (dict): Transaction details including amount, user_id, timestamp, etc.

        Returns:
            str: Detailed fraud detection result
        """
        try:
            # Validate transaction
            validation_error = self.validate_transaction(transaction)
            if validation_error:
                logging.error(f"Validation error: {validation_error}")
                return f"Invalid transaction data: {validation_error}"

            # Log transaction (excluding sensitive data)
            safe_log_data = {
                'id': transaction['id'],
                'timestamp': transaction['timestamp'],
                'country': transaction['country']
            }
            logging.info(f"Processing transaction: {json.dumps(safe_log_data)}")

            # Perform fraud detection
            risk_assessment = self.calculate_risk_score(transaction)
            
            # Update transaction history
            self.update_transaction_history(transaction)

            # Prepare result message
            if risk_assessment.is_fraudulent:
                logging.warning(
                    f"Fraud detected for transaction {transaction['id']}. "
                    f"Risk score: {risk_assessment.score:.2f}, "
                    f"Flags: {', '.join(risk_assessment.flags)}"
                )
                return "Fraud detected"
            else:
                logging.info(
                    f"No fraud detected for transaction {transaction['id']}. "
                    f"Risk score: {risk_assessment.score:.2f}"
                )
                return "No fraud detected"

        except Exception as e:
            logging.error(
                f"Unexpected error during fraud detection: {str(e)}", 
                exc_info=True
            )
            return "An error occurred while detecting fraud."

# Usage example
if __name__ == "__main__":
    detector = FraudDetector()
    
    # Example transaction
    transaction = {
        "id": "tx123",
        "amount": 5000.00,
        "user_id": "user456",
        "timestamp": "2023-12-01T10:00:00",
        "ip_address": "192.168.1.1",
        "country": "US"
    }
    
    result = detector.detect_fraud(transaction)
    print(result)

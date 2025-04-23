import logging
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('recommendations.log'),
        logging.StreamHandler()
    ]
)

class RecommendationEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.product_vectors = None
        self.products = []
        self.product_descriptions = []

    def fit(self, products: List[Dict]):
        """
        Train the recommendation engine with product data.

        Args:
            products (List[Dict]): List of product dictionaries containing 'id', 'name', 
                                 'description', and other relevant fields
        """
        try:
            self.products = products
            self.product_descriptions = [p['description'] for p in products]
            self.product_vectors = self.vectorizer.fit_transform(self.product_descriptions)
            logging.info(f"Recommendation engine trained with {len(products)} products")
        except Exception as e:
            logging.error(f"Error during training: {e}", exc_info=True)
            raise

    def get_recommendations(
        self, 
        user_id: str, 
        user_profile: Dict,
        n_recommendations: int = 5
    ) -> List[Dict]:
        """
        Generate personalized product recommendations for a given user.

        Args:
            user_id (str): The ID of the user
            user_profile (Dict): User profile containing interests and preferences
            n_recommendations (int): Number of recommendations to return

        Returns:
            List[Dict]: List of recommended products with scores
        """
        try:
            # Input validation
            if not user_id or not isinstance(user_id, str):
                raise ValueError("Invalid user_id. It must be a non-empty string.")
            
            if not user_profile or not isinstance(user_profile, dict):
                raise ValueError("Invalid user_profile. It must be a non-empty dictionary.")

            logging.info(f"Generating recommendations for user_id: {user_id}")

            # Convert user profile to vector space
            user_interests = user_profile.get('interests', '')
            user_vector = self.vectorizer.transform([user_interests])

            # Calculate similarity scores
            similarity_scores = cosine_similarity(user_vector, self.product_vectors).flatten()

            # Get top N recommendations
            top_indices = np.argsort(similarity_scores)[-n_recommendations:][::-1]
            
            recommendations = []
            for idx in top_indices:
                product = self.products[idx].copy()
                product['similarity_score'] = float(similarity_scores[idx])
                recommendations.append(product)

            logging.info(f"Generated {len(recommendations)} recommendations for user {user_id}")
            
            return recommendations

        except ValueError as e:
            logging.error(f"Input validation error: {e}")
            return []
        except Exception as e:
            logging.error(f"Unexpected error during recommendation generation: {e}", exc_info=True)
            return []

    def update_product_catalog(self, new_products: List[Dict]):
        """
        Update the product catalog with new products.

        Args:
            new_products (List[Dict]): List of new products to add
        """
        try:
            # Add new products to existing catalog
            self.products.extend(new_products)
            new_descriptions = [p['description'] for p in new_products]
            self.product_descriptions.extend(new_descriptions)
            
            # Recompute TF-IDF vectors
            self.product_vectors = self.vectorizer.fit_transform(self.product_descriptions)
            
            logging.info(f"Product catalog updated with {len(new_products)} new products")
        except Exception as e:
            logging.error(f"Error updating product catalog: {e}", exc_info=True)
            raise

# Usage example:
if __name__ == "__main__":
    # Initialize the recommendation engine
    engine = RecommendationEngine()

    # Sample product data
    sample_products = [
        {
            "id": "1",
            "name": "Laptop",
            "description": "High-performance laptop with latest processor",
            "price": 999.99
        },
        # Add more products...
    ]

    # Train the engine
    engine.fit(sample_products)

    # Sample user profile
    user_profile = {
        "interests": "computing technology laptops",
        "preferences": {"price_range": "premium"}
    }

    # Get recommendations
    recommendations = engine.get_recommendations("user123", user_profile)

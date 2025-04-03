export const fetchRecommendations = async (userId) => {
    const API_URL = `/api/recommendations/${userId}`;
    const MAX_RETRIES = 3; // Retry mechanism
    const TIMEOUT_MS = 8000; // Timeout for API calls

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Implement timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            const response = await fetch(API_URL, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal, // Attach timeout signal
            });

            clearTimeout(timeoutId); // Clear timeout if successful

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`Recommendation API Warning [Attempt ${attempt}]:`, errorText);
                throw new Error(`Server responded with ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            if (err.name === 'AbortError') {
                console.error(`Recommendation API Timeout [Attempt ${attempt}]`);
            } else {
                console.error(`Recommendation API Error [Attempt ${attempt}]:`, err.message);
            }

            if (attempt === MAX_RETRIES) {
                return { recommendations: [], message: "Unable to fetch recommendations at this time. Please try again later." };
            }
        }
    }
};

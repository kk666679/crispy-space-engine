export const fetchVirtualAssistantResponse = async (query) => {
    const API_URL = '/api/virtual-assistant';
    const MAX_RETRIES = 3; // Retry mechanism
    const TIMEOUT_MS = 8000; // Timeout for API calls

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Implement request timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
                signal: controller.signal, // Attach timeout signal
            });

            clearTimeout(timeoutId); // Clear timeout if successful

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`Virtual Assistant API Warning [Attempt ${attempt}]:`, errorText);
                throw new Error(`Server responded with ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            if (err.name === 'AbortError') {
                console.error(`Virtual Assistant API Timeout [Attempt ${attempt}]`);
            } else {
                console.error(`Virtual Assistant API Error [Attempt ${attempt}]:`, err.message);
            }

            if (attempt === MAX_RETRIES) {
                return { response: "I'm currently unable to respond. Please try again later." };
            }
        }
    }
};

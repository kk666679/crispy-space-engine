export const sendMessageToChatbot = async (message) => {
    const API_URL = '/api/chatbot';
    const MAX_RETRIES = 3; // Retry mechanism for API failures
    const TIMEOUT_MS = 8000; // Timeout limit to avoid infinite waits

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Implement request timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
                signal: controller.signal, // Attach timeout signal
            });

            clearTimeout(timeoutId); // Clear timeout if successful

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`Chatbot API Warning [Attempt ${attempt}]:`, errorText);
                throw new Error(`Server responded with ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            if (err.name === 'AbortError') {
                console.error(`Chatbot API Timeout [Attempt ${attempt}]`);
            } else {
                console.error(`Chatbot API Error [Attempt ${attempt}]:`, err.message);
            }

            if (attempt === MAX_RETRIES) {
                return { response: "Sorry, I’m having trouble responding right now. Please try again later." };
            }
        }
    }
};

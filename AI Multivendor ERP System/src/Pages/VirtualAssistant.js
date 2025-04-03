import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from '../components/Header';

const VirtualAssistant = () => {
    const [message, setMessage] = useState('');
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const chatRef = useRef(null);

    const handleSendMessage = useCallback(async () => {
        if (!message.trim()) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/virtual-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                throw new Error('Failed to get a response from the assistant.');
            }

            const data = await response.json();
            setResponses((prev) => [...prev, { user: message, bot: data.response }]);
            setMessage('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        chatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [responses]);

    return (
        <div style={styles.container}>
            <Header title="Virtual Assistant" />

            <div style={styles.chatBox}>
                {responses.map((res, index) => (
                    <div key={index} ref={chatRef}>
                        <div style={styles.userMessage}><strong>You:</strong> {res.user}</div>
                        <div style={styles.botMessage}><strong>Bot:</strong> {res.bot}</div>
                    </div>
                ))}
                {loading && <p style={styles.loading}>Assistant is typing...</p>}
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <div style={styles.inputContainer}>
                <input
                    type="text"
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    style={styles.input}
                    disabled={loading}
                />
                <button onClick={handleSendMessage} style={styles.button} disabled={loading}>
                    {loading ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    );
};

// Styles for better UI
const styles = {
    container: {
        padding: '2rem',
        textAlign: 'center',
    },
    chatBox: {
        border: '1px solid #ccc',
        borderRadius: '10px',
        padding: '1rem',
        height: '400px',
        overflowY: 'auto',
        backgroundColor: '#f9f9f9',
        marginBottom: '1rem',
    },
    userMessage: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '0.75rem',
        borderRadius: '10px',
        maxWidth: '70%',
        alignSelf: 'flex-end',
        margin: '0.5rem 0',
    },
    botMessage: {
        backgroundColor: '#e9ecef',
        color: 'black',
        padding: '0.75rem',
        borderRadius: '10px',
        maxWidth: '70%',
        alignSelf: 'flex-start',
        margin: '0.5rem 0',
    },
    loading: {
        fontSize: '1rem',
        color: '#007bff',
    },
    error: {
        color: 'red',
        fontSize: '1.1rem',
        fontWeight: 'bold',
    },
    inputContainer: {
        display: 'flex',
        gap: '0.5rem',
    },
    input: {
        flex: 1,
        padding: '0.75rem',
        borderRadius: '5px',
        border: '1px solid #ccc',
    },
    button: {
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: '0.3s',
    },
};

export default VirtualAssistant;

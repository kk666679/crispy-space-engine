import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = useCallback(async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                throw new Error('Invalid email or password.');
            }

            const data = await response.json();
            localStorage.setItem('token', data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [email, password, navigate]);

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2>Login</h2>
                {error && <p style={styles.error} aria-live="polite">{error}</p>}
                
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                />

                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />

                <button 
                    onClick={handleLogin} 
                    style={styles.button} 
                    disabled={loading}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </div>
        </div>
    );
};

// Inline styles for a modern card-style layout
const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f4f4f4',
    },
    card: {
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        minWidth: '300px',
    },
    input: {
        margin: '0.5rem 0',
        padding: '0.7rem',
        width: '100%',
        border: '1px solid #ccc',
        borderRadius: '5px',
        fontSize: '1rem',
    },
    button: {
        marginTop: '1rem',
        padding: '0.7rem',
        width: '100%',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1rem',
    },
    error: {
        color: 'red',
        fontWeight: 'bold',
        marginBottom: '1rem',
    },
};

export default Login;

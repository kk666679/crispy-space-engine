import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchUser = useCallback(async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch('/api/user', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user data.');
            }

            const data = await response.json();
            setUser(data);
        } catch (err) {
            setError(err.message);
            localStorage.removeItem('token'); // Remove invalid token
            navigate('/login'); // Redirect to login if authentication fails
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return (
        <div style={styles.container}>
            <Header title="Dashboard" />
            
            {loading ? (
                <p style={styles.loading}>Loading...</p>
            ) : error ? (
                <p style={styles.error}>{error}</p>
            ) : (
                <div style={styles.card}>
                    <h2>Welcome back, {user.name}!</h2>
                    <p>Email: {user.email}</p>
                </div>
            )}
        </div>
    );
};

// Inline styles for better UI
const styles = {
    container: {
        padding: '2rem',
        textAlign: 'center',
    },
    loading: {
        fontSize: '1.2rem',
        color: '#007bff',
    },
    error: {
        fontSize: '1.2rem',
        color: 'red',
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        display: 'inline-block',
        marginTop: '1rem',
    },
};

export default Dashboard;

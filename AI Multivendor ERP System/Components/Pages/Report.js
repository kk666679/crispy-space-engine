import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const Reports = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleDownload = useCallback(async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            navigate('/login');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/reports/download', {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to download report.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'report.pdf'; // Adjust filename dynamically if needed
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    return (
        <div style={styles.container}>
            <Header title="Reports" />

            {error && <p style={styles.error}>{error}</p>}

            <button 
                onClick={handleDownload} 
                style={styles.button} 
                disabled={loading}
            >
                {loading ? 'Downloading...' : 'Download Report'}
            </button>
        </div>
    );
};

// Styles for better UI
const styles = {
    container: {
        padding: '2rem',
        textAlign: 'center',
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
        marginTop: '1rem',
    },
    error: {
        color: 'red',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
    },
};

export default Reports;

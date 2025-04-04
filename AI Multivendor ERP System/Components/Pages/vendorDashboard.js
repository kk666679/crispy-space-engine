import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const VendorDashboard = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchProducts = useCallback(async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch('/api/vendor/products', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch products.');
            }

            const data = await response.json();
            setProducts(data);
        } catch (err) {
            setError(err.message);
            localStorage.removeItem('token');
            navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return (
        <div style={styles.container}>
            <Header title="Vendor Dashboard" />

            {loading ? (
                <p style={styles.loading}>Loading products...</p>
            ) : error ? (
                <p style={styles.error}>{error}</p>
            ) : (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? (
                                products.map((product) => (
                                    <tr key={product.id}>
                                        <td>{product.name}</td>
                                        <td>${product.price.toFixed(2)}</td>
                                        <td>{product.stock}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" style={styles.noData}>No products available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Styles for enhanced UI
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
    tableContainer: {
        overflowX: 'auto',
        marginTop: '1rem',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: '400px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#fff',
    },
    th: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '10px',
        textAlign: 'left',
    },
    td: {
        padding: '10px',
        borderBottom: '1px solid #ddd',
    },
    noData: {
        textAlign: 'center',
        padding: '1rem',
        fontSize: '1.1rem',
    },
};

export default VendorDashboard;

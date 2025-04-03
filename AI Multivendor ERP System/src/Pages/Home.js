import React, { memo } from 'react';
import Header from '../components/Header';

const Home = () => {
    return (
        <main 
            style={{ 
                padding: '2rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textAlign: 'center' 
            }}
        >
            <Header title="Welcome to the AI Multivendor ERP System" />
            <p style={{ fontSize: '1.2rem', maxWidth: '600px', marginTop: '1rem' }}>
                Explore the powerful features of our AI-driven ERP system, 
                designed to streamline multivendor business operations.
            </p>
        </main>
    );
};

// Optimizes performance by preventing unnecessary re-renders
export default memo(Home);


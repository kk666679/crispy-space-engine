import React, { memo } from 'react';
import PropTypes from 'prop-types';

const Header = ({ 
    title = "AI Multivendor ERP System", 
    logo, 
    bgColor = "#282c34", 
    textColor = "white" 
}) => {
    return (
        <header 
            style={{ 
                backgroundColor: bgColor, 
                color: textColor, 
                padding: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '10px'
            }}
            aria-label="Main Header"
        >
            {logo && <img src={logo} alt="Logo" style={{ height: '50px' }} />}
            <h1 style={{ margin: 0 }}>{title}</h1>
        </header>
    );
};

Header.propTypes = {
    title: PropTypes.string,
    logo: PropTypes.string, // URL to the logo image
    bgColor: PropTypes.string,
    textColor: PropTypes.string
};

// Optimizes performance by preventing unnecessary re-renders
export default memo(Header);

import React, { memo } from 'react';
import PropTypes from 'prop-types';

const Header = ({ 
    title = "AI Multivendor ERP System", 
    logo,
    bgColor = "#282c34",
    textColor = "white",
    height = "80px",
    onLogoClick,
    className = "",
    children
}) => {
    const headerStyles = {
        backgroundColor: bgColor,
        color: textColor,
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between', // Changed to space-between for better layout
        minHeight: height,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // Added subtle shadow
        position: 'sticky', // Makes header sticky
        top: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease' // Smooth transitions
    };

    const logoStyles = {
        height: '50px',
        cursor: onLogoClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease',
        ':hover': {
            transform: 'scale(1.05)'
        }
    };

    const titleStyles = {
        margin: 0,
        fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', // Responsive font size
        fontWeight: 600,
        letterSpacing: '0.5px'
    };

    return (
        <header 
            style={headerStyles}
            className={`main-header ${className}`.trim()}
            aria-label="Main Header"
            role="banner"
        >
            <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {logo && (
                    <img 
                        src={logo} 
                        alt="Company Logo"
                        style={logoStyles}
                        onClick={onLogoClick}
                        onKeyPress={(e) => e.key === 'Enter' && onLogoClick?.()}
                        tabIndex={onLogoClick ? 0 : -1}
                    />
                )}
                <h1 style={titleStyles}>{title}</h1>
            </div>
            
            {/* Right side content container */}
            <div className="header-right">
                {children}
            </div>
        </header>
    );
};

Header.propTypes = {
    title: PropTypes.string,
    logo: PropTypes.string,
    bgColor: PropTypes.string,
    textColor: PropTypes.string,
    height: PropTypes.string,
    onLogoClick: PropTypes.func,
    className: PropTypes.string,
    children: PropTypes.node
};

export default memo(Header);

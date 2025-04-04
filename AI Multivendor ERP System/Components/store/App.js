import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VendorDashboard from './pages/VendorDashboard';
import AIRecommendations from './pages/AIRecommendations';
import Reports from './pages/Reports';
import VirtualAssistant from './pages/VirtualAssistant';

const ProtectedRoute = ({ element, roles }) => {
    const { user, setUser } = useContext(UserContext);

    useEffect(() => {
        // Restore session from localStorage
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);
    }, [setUser]);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return element;
};

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} roles={['user', 'admin', 'vendor']} />} />
                <Route path="/vendor-dashboard" element={<ProtectedRoute element={<VendorDashboard />} roles={['vendor', 'admin']} />} />
                <Route path="/ai-recommendations" element={<ProtectedRoute element={<AIRecommendations />} roles={['user', 'vendor', 'admin']} />} />
                <Route path="/reports" element={<ProtectedRoute element={<Reports />} roles={['admin']} />} />
                <Route path="/virtual-assistant" element={<ProtectedRoute element={<VirtualAssistant />} />} />
            </Routes>
        </Router>
    );
};

export default App;

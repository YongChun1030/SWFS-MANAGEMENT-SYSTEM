import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import Monitor from './components/Monitor';
import ReportPage from './components/ReportPage'; // Import the ReportPage component

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/home" element={<Home />} />
                <Route path="/monitor" element={<Monitor />} />
                <Route path="/report" element={<ReportPage />} /> {/* Add ReportPage route */}
            </Routes>
        </Router>
    );
};

export default App;

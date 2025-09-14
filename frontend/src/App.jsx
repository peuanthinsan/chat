import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { refreshToken } from './api.js';

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    refreshToken().then(data => setToken(data.accessToken)).catch(() => {});
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setToken(null);
  };

  return (
    <>
      <nav>
        <Link to="/">Home</Link>
        {token ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <h1>Welcome</h1>} />
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={token ? <Dashboard token={token} /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;

import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { refreshToken, logout as apiLogout, getAuthToken } from './api.js';

function App() {
  const token = getAuthToken();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      refreshToken().catch(() => {});
    }
  }, [token]);

  const logout = async () => {
    await apiLogout();
    navigate('/login');
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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;

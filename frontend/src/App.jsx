import { Routes, Route, Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CssBaseline,
  Box
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { refreshToken, logout as apiLogout, getAuthToken } from './api.js';

function App() {
  const token = getAuthToken();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      refreshToken().catch(() => {});
    }
  }, [token]);

  const logout = async () => {
    await apiLogout();
    navigate('/login');
  };

  const toggleDrawer = () => setOpen(prev => !prev);

  return (
    <>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleDrawer}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Chat App
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer anchor="left" open={open} onClose={toggleDrawer}>
        <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer}>
          <List>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/">
                <ListItemText primary="Home" />
              </ListItemButton>
            </ListItem>
            {token ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton component={RouterLink} to="/dashboard">
                    <ListItemText primary="Dashboard" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton onClick={logout}>
                    <ListItemText primary="Logout" />
                  </ListItemButton>
                </ListItem>
              </>
            ) : (
              <>
                <ListItem disablePadding>
                  <ListItemButton component={RouterLink} to="/login">
                    <ListItemText primary="Login" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component={RouterLink} to="/register">
                    <ListItemText primary="Register" />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
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

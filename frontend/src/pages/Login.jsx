import { useState } from 'react';
import { login } from '../api.js';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box, Snackbar, Alert } from '@mui/material';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'error' });
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const value = identifier.trim();
      if (!value) {
        setToast({ open: true, message: 'Please enter your email or username', severity: 'error' });
        return;
      }
      if (value !== identifier) {
        setIdentifier(value);
      }
      await login(value, password);
      navigate('/dashboard');
    } catch (err) {
      setToast({ open: true, message: 'Invalid credentials', severity: 'error' });
    }
  };

  const handleToastClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5">Login</Typography>
        <TextField
          label="Email or Username"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          fullWidth
          required
          autoComplete="username"
        />
        <TextField
          type="password"
          label="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          required
          autoComplete="current-password"
        />
        <Button type="submit" variant="contained">Login</Button>
      </Box>
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleToastClose} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

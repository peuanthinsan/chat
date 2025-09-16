import { useState } from 'react';
import { register } from '../api.js';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box, Snackbar, Alert } from '@mui/material';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setToast({ open: true, message: 'Passwords do not match', severity: 'error' });
      return;
    }
    try {
      await register(email, password);
      setToast({ open: true, message: 'Registered, please login', severity: 'success' });
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setToast({ open: true, message, severity: 'error' });
    }
  };

  const handleToastClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5">Register</Typography>
        <TextField
          label="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          fullWidth
          required
        />
        <TextField
          type="password"
          label="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          required
        />
        <TextField
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          fullWidth
          required
          error={confirmPassword !== '' && confirmPassword !== password}
          helperText={
            confirmPassword !== '' && confirmPassword !== password ? 'Passwords must match' : ''
          }
        />
        <Button type="submit" variant="contained">Register</Button>
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

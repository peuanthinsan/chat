import { useState } from 'react';
import { register } from '../api.js';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box } from '@mui/material';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await register(email, password);
      setMessage('Registered, please login');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setMessage('Registration failed');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5">Register</Typography>
        {message && (
          <Typography color="primary">
            {message}
          </Typography>
        )}
        <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
        <TextField type="password" label="Password" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
        <Button type="submit" variant="contained">Register</Button>
      </Box>
    </Container>
  );
}

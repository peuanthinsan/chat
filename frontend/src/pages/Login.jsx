import { useState } from 'react';
import { login } from '../api.js';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box } from '@mui/material';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5">Login</Typography>
        {error && (
          <Typography color="error">
            {error}
          </Typography>
        )}
        <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
        <TextField type="password" label="Password" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
        <Button type="submit" variant="contained">Login</Button>
      </Box>
    </Container>
  );
}

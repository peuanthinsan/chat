import { useState, useEffect, useRef } from 'react';
import { getProfile, uploadAvatar } from '../api.js';
import { Container, Typography, Avatar, Button, Snackbar, Alert } from '@mui/material';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const fileInput = useRef();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        setUser(data);
        setError('');
      } catch (err) {
        setError('Failed to load profile');
        setToast({ open: true, message: 'Failed to load profile', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleFile = async e => {
    const file = e.target.files[0];
    if (file) {
      try {
        const updated = await uploadAvatar(file);
        setUser(updated);
        setError('');
        setToast({ open: true, message: 'Avatar updated', severity: 'success' });
      } catch (err) {
        setError('Upload failed');
        setToast({ open: true, message: 'Upload failed', severity: 'error' });
      } finally {
        if (fileInput.current) {
          fileInput.current.value = '';
        }
      }
    }
  };

  const handleUploadClick = () => {
    fileInput.current?.click();
  };

  const handleToastClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5">Dashboard</Typography>
      {loading && <Typography>Loading...</Typography>}
      {!loading && error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      {!loading && user && (
        <>
          <Typography>{user.email}</Typography>
          {user.avatarUrl && (
            <Avatar src={user.avatarUrl} alt="avatar" sx={{ width: 100, height: 100, my: 2 }} />
          )}
          <input type="file" ref={fileInput} onChange={handleFile} style={{ display: 'none' }} />
          <Button variant="contained" onClick={handleUploadClick} sx={{ mt: 2 }}>
            Upload Avatar
          </Button>
        </>
      )}
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

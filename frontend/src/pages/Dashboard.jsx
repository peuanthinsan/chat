import { useState, useEffect, useRef } from 'react';
import { getProfile, uploadAvatar, updateProfile } from '../api.js';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';

const MAX_AVATAR_SIZE_MB = 5;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const fileInput = useRef();

  const applyUserData = data => {
    if (!data) return;
    setUser(data);
    setFirstName(data.firstName || '');
    setLastName(data.lastName || '');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        applyUserData(data);
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
      if (!file.type.startsWith('image/')) {
        setToast({ open: true, message: 'Only image files are allowed', severity: 'error' });
        if (fileInput.current) {
          fileInput.current.value = '';
        }
        return;
      }

      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        setToast({
          open: true,
          message: `Avatar must be ${MAX_AVATAR_SIZE_MB}MB or smaller`,
          severity: 'error'
        });
        if (fileInput.current) {
          fileInput.current.value = '';
        }
        return;
      }

      try {
        const updated = await uploadAvatar(file);
        applyUserData(updated);
        setError('');
        setToast({ open: true, message: 'Avatar updated', severity: 'success' });
      } catch (err) {
        const message = err.response?.data?.message || 'Upload failed';
        setError(message);
        setToast({ open: true, message, severity: 'error' });
      } finally {
        if (fileInput.current) {
          fileInput.current.value = '';
        }
      }
    }
  };

  const handleProfileSubmit = async event => {
    event.preventDefault();
    if (!user) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    setSaving(true);
    try {
      const updated = await updateProfile({ firstName: trimmedFirstName, lastName: trimmedLastName });
      applyUserData(updated);
      setError('');
      setToast({ open: true, message: 'Profile updated', severity: 'success' });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile';
      setError(message);
      setToast({ open: true, message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadClick = () => {
    fileInput.current?.click();
  };

  const handleToastClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5">Edit Profile</Typography>
      {loading && <Typography sx={{ mt: 2 }}>Loading...</Typography>}
      {!loading && error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      {!loading && user && (
        <>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ mt: 3 }}
          >
            <Avatar
              src={user.avatarUrl || undefined}
              alt="avatar"
              sx={{ width: 120, height: 120 }}
            >
              {!user.avatarUrl && (user.username || user.email || '?').charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1">{user.email}</Typography>
              <Typography variant="body2" color="text.secondary">
                Role: {user.role}
              </Typography>
              {fullName && (
                <Typography variant="body2" color="text.secondary">
                  Name: {fullName}
                </Typography>
              )}
              <input
                type="file"
                ref={fileInput}
                onChange={handleFile}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <Button variant="outlined" onClick={handleUploadClick} sx={{ mt: 2 }}>
                Upload Avatar
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Images up to {MAX_AVATAR_SIZE_MB}MB.
              </Typography>
            </Box>
          </Stack>

          <Box
            component="form"
            onSubmit={handleProfileSubmit}
            sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}
          >
            <TextField label="Email" value={user.email} fullWidth disabled />
            <TextField
              label="Username"
              value={user.username || ''}
              fullWidth
              disabled
              helperText="Usernames cannot be changed"
            />
            <TextField
              label="First Name"
              value={firstName}
              onChange={event => setFirstName(event.target.value)}
              fullWidth
              inputProps={{ maxLength: 100 }}
              autoComplete="given-name"
            />
            <TextField
              label="Last Name"
              value={lastName}
              onChange={event => setLastName(event.target.value)}
              fullWidth
              inputProps={{ maxLength: 100 }}
              autoComplete="family-name"
            />
            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </Stack>
          </Box>
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

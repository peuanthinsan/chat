import { useEffect, useRef, useState } from 'react';
import { register } from '../api.js';
import { useNavigate } from 'react-router-dom';
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
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const normalizedUsername = username.trim().toLowerCase();
  const usernameError = username !== '' && !USERNAME_REGEX.test(normalizedUsername);
  const usernameHelperText = usernameError
    ? 'Usernames must be 3-30 characters and use only letters, numbers or underscores'
    : 'Usernames are lowercase and cannot be changed later.';

  useEffect(() => () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

  const handleToastClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleAvatarChange = event => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setToast({ open: true, message: 'Only image files are allowed', severity: 'error' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setToast({
        open: true,
        message: `Avatar must be ${MAX_AVATAR_SIZE_MB}MB or smaller`,
        severity: 'error'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const clearAvatar = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatar(null);
    setAvatarPreview('');
  };

  const handleSubmit = async event => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setToast({ open: true, message: 'Passwords do not match', severity: 'error' });
      return;
    }

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      setToast({
        open: true,
        message: 'Username must be 3-30 characters and use only letters, numbers or underscores',
        severity: 'error'
      });
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setToast({ open: true, message: 'Email is required', severity: 'error' });
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (trimmedEmail !== email) {
      setEmail(trimmedEmail);
    }
    if (normalizedUsername !== username) {
      setUsername(normalizedUsername);
    }
    if (trimmedFirstName !== firstName) {
      setFirstName(trimmedFirstName);
    }
    if (trimmedLastName !== lastName) {
      setLastName(trimmedLastName);
    }

    try {
      const data = await register({
        email: trimmedEmail,
        password,
        username: normalizedUsername,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        avatar
      });
      const message = data?.role === 'admin'
        ? 'Registered as the first admin. Please login'
        : 'Registered, please login';
      setToast({ open: true, message, severity: 'success' });
      setEmail('');
      setUsername('');
      setFirstName('');
      setLastName('');
      setPassword('');
      setConfirmPassword('');
      clearAvatar();
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setToast({ open: true, message, severity: 'error' });
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Typography variant="h5">Register</Typography>
        <TextField
          type="email"
          label="Email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          fullWidth
          required
          autoComplete="email"
        />
        <TextField
          label="Username"
          value={username}
          onChange={event => setUsername(event.target.value.toLowerCase())}
          fullWidth
          required
          autoComplete="username"
          error={usernameError}
          helperText={username ? usernameHelperText : 'Usernames are lowercase and cannot be changed later.'}
          inputProps={{ maxLength: 30 }}
        />
        <TextField
          label="First Name"
          value={firstName}
          onChange={event => setFirstName(event.target.value)}
          fullWidth
          autoComplete="given-name"
          inputProps={{ maxLength: 100 }}
        />
        <TextField
          label="Last Name"
          value={lastName}
          onChange={event => setLastName(event.target.value)}
          fullWidth
          autoComplete="family-name"
          inputProps={{ maxLength: 100 }}
        />
        <TextField
          type="password"
          label="Password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          fullWidth
          required
          autoComplete="new-password"
        />
        <TextField
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)}
          fullWidth
          required
          autoComplete="new-password"
          error={confirmPassword !== '' && confirmPassword !== password}
          helperText={
            confirmPassword !== '' && confirmPassword !== password
              ? 'Passwords must match'
              : ''
          }
        />
        <Box>
          <Typography variant="subtitle1">Avatar</Typography>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={avatarPreview || undefined}
                alt="Avatar preview"
                sx={{ width: 72, height: 72 }}
              >
                {!avatarPreview && normalizedUsername ? normalizedUsername.charAt(0).toUpperCase() : ''}
              </Avatar>
              <Stack direction="row" spacing={1}>
                <Button type="button" variant="outlined" onClick={() => fileInputRef.current?.click()}>
                  Choose Avatar
                </Button>
                {avatar && (
                  <Button type="button" variant="text" color="secondary" onClick={clearAvatar}>
                    Remove
                  </Button>
                )}
              </Stack>
            </Stack>
            {avatar?.name && (
              <Typography variant="body2" color="text.secondary">
                {avatar.name}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Optional. Images up to {MAX_AVATAR_SIZE_MB}MB.
            </Typography>
          </Stack>
        </Box>
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

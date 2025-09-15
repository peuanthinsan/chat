import { useState, useEffect, useRef } from 'react';
import { getProfile, uploadAvatar } from '../api.js';
import { Container, Typography, Avatar, Button } from '@mui/material';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const fileInput = useRef();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        setUser(data);
      } catch (err) {
        setError('Failed to load profile');
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
      } catch (err) {
        setError('Upload failed');
      }
    }
  };

  const handleUploadClick = () => {
    fileInput.current.click();
  };

  if (error) return <Typography color="error">{error}</Typography>;
  if (!user) return <Typography>Loading...</Typography>;

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5">Dashboard</Typography>
      <Typography>{user.email}</Typography>
      {user.avatarUrl && (
        <Avatar src={user.avatarUrl} alt="avatar" sx={{ width: 100, height: 100, my: 2 }} />
      )}
      <input type="file" ref={fileInput} onChange={handleFile} style={{ display: 'none' }} />
      <Button variant="contained" onClick={handleUploadClick} sx={{ mt: 2 }}>
        Upload Avatar
      </Button>
    </Container>
  );
}

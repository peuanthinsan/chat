import { useState, useEffect } from 'react';
import { getProfile, uploadAvatar } from '../api.js';

export default function Dashboard({ token }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile(token);
        setUser(data);
      } catch (err) {
        setError('Failed to load profile');
      }
    };
    fetchProfile();
  }, [token]);

  const handleFile = async e => {
    const file = e.target.files[0];
    if (file) {
      try {
        const updated = await uploadAvatar(token, file);
        setUser(updated);
      } catch (err) {
        setError('Upload failed');
      }
    }
  };

  if (error) return <p>{error}</p>;
  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <h2>Dashboard</h2>
      <p>{user.email}</p>
      {user.avatarUrl && <img src={user.avatarUrl} alt="avatar" width="100" />}
      <input type="file" onChange={handleFile} />
    </div>
  );
}

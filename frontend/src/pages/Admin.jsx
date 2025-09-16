import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { getUsers, updateUserRole } from '../api.js';

const ROLE_OPTIONS = ['user', 'admin'];

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [updating, setUpdating] = useState({});
  const adminCount = users.filter(user => user.role === 'admin').length;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to load users';
        setToast({ open: true, message, severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleToastClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleRoleChange = async (userId, role) => {
    const current = users.find(user => user._id === userId);
    if (!current || current.role === role) return;
    setUpdating(prev => ({ ...prev, [userId]: true }));
    try {
      const updated = await updateUserRole(userId, role);
      setUsers(prev => prev.map(user => (user._id === userId ? { ...user, role: updated.role } : user)));
      setToast({ open: true, message: 'Role updated', severity: 'success' });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update role';
      setToast({ open: true, message, severity: 'error' });
    } finally {
      setUpdating(prev => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Administration
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ width: '100%', overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user._id} hover>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={user.role}
                        onChange={event => handleRoleChange(user._id, event.target.value)}
                        disabled={Boolean(updating[user._id]) || (user.role === 'admin' && adminCount <= 1)}
                      >
                        {ROLE_OPTIONS.map(option => (
                          <MenuItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
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

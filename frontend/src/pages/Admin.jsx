import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  IconButton,
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
import DeleteIcon from '@mui/icons-material/Delete';
import { deleteUser, getAuthToken, getUsers, updateUserRole } from '../api.js';

const ROLE_OPTIONS = ['user', 'admin'];

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [updating, setUpdating] = useState({});
  const [deleting, setDeleting] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUserId(null);
      return;
    }

    try {
      const [, payloadSegment] = token.split('.');
      if (!payloadSegment) throw new Error('Invalid token');
      const payload = JSON.parse(atob(payloadSegment));
      setCurrentUserId(payload?.id || null);
    } catch {
      setCurrentUserId(null);
    }
  }, []);

  const adminCount = useMemo(
    () => users.filter(user => user.role === 'admin').length,
    [users]
  );

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

  const handleDelete = async user => {
    if (!user?._id) return;

    if (user._id === currentUserId) {
      setToast({ open: true, message: 'You cannot delete your own account', severity: 'warning' });
      return;
    }

    if (user.role === 'admin' && adminCount <= 1) {
      setToast({ open: true, message: 'At least one admin is required', severity: 'error' });
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm(`Delete ${user.username || user.email}? This cannot be undone.`)) {
      return;
    }

    setDeleting(prev => ({ ...prev, [user._id]: true }));
    try {
      await deleteUser(user._id);
      setUsers(prev => prev.filter(existing => existing._id !== user._id));
      setToast({ open: true, message: 'User deleted', severity: 'success' });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete user';
      setToast({ open: true, message, severity: 'error' });
    } finally {
      setDeleting(prev => ({ ...prev, [user._id]: false }));
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
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => {
                  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                  const isUpdating = Boolean(updating[user._id]);
                  const isDeleting = Boolean(deleting[user._id]);
                  const disableDelete = isDeleting || user._id === currentUserId || (user.role === 'admin' && adminCount <= 1);
                  return (
                    <TableRow key={user._id} hover>
                      <TableCell>{user.username || '—'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{fullName || '—'}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={user.role}
                          onChange={event => handleRoleChange(user._id, event.target.value)}
                          disabled={isUpdating || isDeleting || (user.role === 'admin' && adminCount <= 1)}
                        >
                          {ROLE_OPTIONS.map(option => (
                            <MenuItem key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label={`Delete ${user.username || user.email}`}
                          color="error"
                          onClick={() => handleDelete(user)}
                          disabled={disableDelete}
                        >
                          {isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
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

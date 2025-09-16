import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getProfile,
  uploadAvatar,
  createCheckoutSession,
  createBillingPortalSession,
  getSubscriptionStatus
} from '../api.js';
import { Container, Typography, Avatar, Button, Snackbar, Alert, Box } from '@mui/material';
import { getStripe } from '../stripe.js';

const MAX_AVATAR_SIZE_MB = 5;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'incomplete']);

const formatSubscriptionStatus = status => {
  if (!status) return 'Not subscribed';
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
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

  const refreshSubscription = useCallback(async () => {
    try {
      const status = await getSubscriptionStatus();
      setUser(prev => (prev ? { ...prev, ...status } : prev));
      return status;
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    const finalizeCheckout = async () => {
      try {
        await refreshSubscription();
        setToast({ open: true, message: 'Subscription updated successfully', severity: 'success' });
      } catch (err) {
        setToast({
          open: true,
          message: 'Subscription is processing. Refresh in a moment.',
          severity: 'info'
        });
      } finally {
        params.delete('session_id');
        const newSearch = params.toString();
        const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`;
        window.history.replaceState({}, '', newUrl);
      }
    };

    finalizeCheckout();
  }, [refreshSubscription]);

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
        setUser(updated);
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

  const handleUploadClick = () => {
    fileInput.current?.click();
  };

  const handleSubscribe = async () => {
    setSubscriptionLoading(true);
    try {
      const { id, url } = await createCheckoutSession();
      const stripe = await getStripe();
      if (stripe && id) {
        const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: id });
        if (stripeError) {
          throw stripeError;
        }
      } else if (url) {
        window.location.href = url;
      } else {
        throw new Error('Unable to start checkout session');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to start checkout';
      setToast({ open: true, message, severity: 'error' });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { url } = await createBillingPortalSession();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Unable to open billing portal');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to open billing portal';
      setToast({ open: true, message, severity: 'error' });
    } finally {
      setPortalLoading(false);
    }
  };

  const hasActiveSubscription = user && ACTIVE_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus);
  const renewalDate = user?.subscriptionCurrentPeriodEnd
    ? new Date(user.subscriptionCurrentPeriodEnd)
    : null;

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
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Role: {user.role}
          </Typography>
          {user.avatarUrl && (
            <Avatar src={user.avatarUrl} alt="avatar" sx={{ width: 100, height: 100, my: 2 }} />
          )}
          <input
            type="file"
            ref={fileInput}
            onChange={handleFile}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <Button variant="contained" onClick={handleUploadClick} sx={{ mt: 2 }}>
            Upload Avatar
          </Button>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Subscription
            </Typography>
            <Typography>
              Status: {formatSubscriptionStatus(user.subscriptionStatus)}
            </Typography>
            {renewalDate && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Renews on {renewalDate.toLocaleString()}
              </Typography>
            )}
            {hasActiveSubscription ? (
              <Button
                variant="outlined"
                onClick={handleManageSubscription}
                sx={{ mt: 2 }}
                disabled={portalLoading}
              >
                {portalLoading ? 'Opening...' : 'Manage Subscription'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubscribe}
                sx={{ mt: 2 }}
                disabled={subscriptionLoading}
              >
                {subscriptionLoading ? 'Redirecting...' : 'Subscribe'}
              </Button>
            )}
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

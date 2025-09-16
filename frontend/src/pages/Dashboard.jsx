import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createCheckoutSession,
  createPortalSession,
  getProfile,
  getSubscriptionPlan,
  updateProfile,
  uploadAvatar
} from '../api.js';
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
const SUBSCRIPTION_MANAGE_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);

const formatDate = value => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

const formatSubscriptionStatus = status => {
  if (!status || status === 'inactive') return 'Not subscribed';
  return status
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatPlanPrice = plan => {
  if (!plan?.unitAmount) return '';
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (plan.currency || 'usd').toUpperCase()
    });
    const amount = formatter.format(plan.unitAmount / 100);
    const interval = plan.recurring?.interval?.replace(/_/g, ' ') || 'month';
    const intervalCount = plan.recurring?.interval_count || 1;
    const intervalDescription = intervalCount === 1
      ? interval
      : `${intervalCount} ${interval}${interval.endsWith('s') ? '' : 's'}`;
    return `${amount} every ${intervalDescription}`;
  } catch {
    return '';
  }
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [plan, setPlan] = useState(null);
  const [planError, setPlanError] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const fileInput = useRef();

  const applyUserData = useCallback(data => {
    if (!data) return;
    setUser(data);
    setFirstName(data.firstName || '');
    setLastName(data.lastName || '');
  }, []);

  const fetchProfile = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setLoading(true);
    }
    try {
      const data = await getProfile();
      applyUserData(data);
      setError('');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load profile';
      setError(message);
      setToast({ open: true, message, severity: 'error' });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [applyUserData, setToast]);

  const fetchPlan = useCallback(async () => {
    setPlanLoading(true);
    try {
      const data = await getSubscriptionPlan();
      setPlan(data);
      setPlanError('');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || 'Failed to load subscription plan';
      setPlan(null);
      setPlanError(message);
      if (status !== 503) {
        setToast({ open: true, message, severity: 'error' });
      }
    } finally {
      setPlanLoading(false);
    }
  }, [setToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const checkoutStatus = url.searchParams.get('checkout');
    if (!checkoutStatus) return;

    if (checkoutStatus === 'success') {
      setToast({ open: true, message: 'Subscription updated successfully', severity: 'success' });
      fetchProfile({ silent: true });
      fetchPlan();
    } else if (checkoutStatus === 'cancelled') {
      setToast({ open: true, message: 'Checkout was cancelled', severity: 'info' });
    }

    url.searchParams.delete('checkout');
    url.searchParams.delete('session_id');
    const newUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }, [fetchPlan, fetchProfile]);

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

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const { url } = await createCheckoutSession();
      if (url && typeof window !== 'undefined') {
        window.location.assign(url);
        return;
      }
      throw new Error('Missing checkout URL');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to start checkout';
      setToast({ open: true, message, severity: 'error' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      if (url && typeof window !== 'undefined') {
        window.location.assign(url);
        return;
      }
      throw new Error('Missing billing portal URL');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to open billing portal';
      setToast({ open: true, message, severity: 'error' });
    } finally {
      setPortalLoading(false);
    }
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const normalizedStatus = typeof user?.subscriptionStatus === 'string'
    ? user.subscriptionStatus.toLowerCase()
    : 'inactive';
  const statusLabel = formatSubscriptionStatus(normalizedStatus);
  const canManageSubscription = SUBSCRIPTION_MANAGE_STATUSES.has(normalizedStatus);
  const renewalDate = formatDate(user?.subscriptionCurrentPeriodEnd);
  const cancelDateRaw = user?.subscriptionCancelAt || (user?.subscriptionCancelAtPeriodEnd ? user?.subscriptionCurrentPeriodEnd : null);
  const cancelDate = formatDate(cancelDateRaw);
  const cancelScheduled = Boolean(user?.subscriptionCancelAtPeriodEnd && cancelDate);
  const planPrice = formatPlanPrice(plan);
  const planName = plan?.product?.name || plan?.nickname || 'Subscription';

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

          <Box sx={{ mt: 6, maxWidth: 520 }}>
            <Typography variant="h6" gutterBottom>
              Subscription
            </Typography>
            {planLoading && <Typography>Loading subscription details…</Typography>}
            {!planLoading && plan && (
              <>
                <Typography variant="body1">
                  Plan: {planName}
                  {planPrice && ` — ${planPrice}`}
                </Typography>
                {plan.product?.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {plan.product.description}
                  </Typography>
                )}
              </>
            )}
            {!planLoading && !plan && !planError && (
              <Typography variant="body2" color="text.secondary">
                No subscription plan is currently available.
              </Typography>
            )}
            {!planLoading && planError && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {planError}
              </Alert>
            )}
            <Typography variant="body1" sx={{ mt: 2 }}>
              Status: {statusLabel}
            </Typography>
            {renewalDate && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Renews on {renewalDate}
              </Typography>
            )}
            {cancelScheduled && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Scheduled to cancel on {cancelDate}
              </Typography>
            )}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mt: 2 }}
            >
              <Button
                variant="contained"
                onClick={canManageSubscription ? handleManageBilling : handleSubscribe}
                disabled={canManageSubscription ? portalLoading : checkoutLoading}
              >
                {canManageSubscription
                  ? portalLoading ? 'Opening…' : 'Manage Billing'
                  : checkoutLoading ? 'Redirecting…' : 'Subscribe'}
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

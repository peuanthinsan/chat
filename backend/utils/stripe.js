import Stripe from 'stripe';

let stripeClient;

const STRIPE_API_VERSION = '2024-06-20';

export const getStripeClient = () => {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'STRIPE_SECRET_KEY') {
    return null;
  }
  stripeClient = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
  return stripeClient;
};

export const requireStripeClient = () => {
  const client = getStripeClient();
  if (!client) {
    throw new Error('Stripe secret key is not configured');
  }
  return client;
};

export const getStripePriceId = () => {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId || priceId === 'STRIPE_PRICE_ID') {
    throw new Error('Stripe price id is not configured');
  }
  return priceId;
};

export const getStripeWebhookSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret === 'STRIPE_WEBHOOK_SECRET') {
    throw new Error('Stripe webhook secret is not configured');
  }
  return secret;
};

export const resolveAppUrl = req => {
  const configuredUrl = process.env.FRONTEND_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }
  const origin = req.headers?.origin;
  if (origin) {
    return origin.replace(/\/+$/, '');
  }
  const protocol = req.protocol || 'https';
  const host = req.get?.('host');
  if (host) {
    return `${protocol}://${host}`.replace(/\/+$/, '');
  }
  return '';
};

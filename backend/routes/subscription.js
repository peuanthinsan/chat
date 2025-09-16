import { Router } from 'express';
import Stripe from 'stripe';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
  : null;

const ensureStripeConfigured = () => {
  if (!stripe) {
    const error = new Error('Stripe is not configured');
    error.statusCode = 500;
    throw error;
  }
};

const getBaseUrl = req => process.env.CLIENT_URL || req.headers.origin || `${req.protocol}://${req.get('host')}`;

const getDefaultDashboardUrl = req => {
  const baseUrl = getBaseUrl(req);
  return baseUrl.endsWith('/dashboard') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/dashboard`;
};

const SUBSCRIPTION_ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'incomplete']);

router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      'stripeCustomerId stripeSubscriptionId subscriptionStatus subscriptionCurrentPeriodEnd'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      stripeCustomerId: user.stripeCustomerId || null,
      stripeSubscriptionId: user.stripeSubscriptionId || null,
      subscriptionStatus: user.subscriptionStatus || null,
      subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd || null
    });
  } catch (err) {
    console.error('Failed to load subscription status', err);
    res.status(500).json({ message: 'Failed to load subscription status' });
  }
});

router.post('/checkout-session', auth, async (req, res) => {
  try {
    ensureStripeConfigured();

    const priceId = req.body?.priceId || process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return res.status(500).json({ message: 'Stripe price is not configured' });
    }

    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.subscriptionStatus && SUBSCRIPTION_ACTIVE_STATUSES.has(user.subscriptionStatus)) {
      return res.status(400).json({ message: 'You already have an active subscription' });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const successUrl = `${getDefaultDashboardUrl(req)}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = getDefaultDashboardUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user._id.toString()
      }
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    const status = err.statusCode || 500;
    const message = err.statusCode ? err.message : 'Failed to create checkout session';
    console.error(message, err);
    res.status(status).json({ message });
  }
});

router.post('/portal-session', auth, async (req, res) => {
  try {
    ensureStripeConfigured();

    const user = req.user;
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ message: 'No Stripe customer found for this user' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: getDefaultDashboardUrl(req)
    });

    res.json({ url: session.url });
  } catch (err) {
    const status = err.statusCode || 500;
    const message = err.statusCode ? err.message : 'Failed to create billing portal session';
    console.error(message, err);
    res.status(status).json({ message });
  }
});

async function updateUserFromSubscription(subscription) {
  if (!subscription?.customer) return;

  const query = { stripeCustomerId: subscription.customer };
  const update = {
    stripeCustomerId: subscription.customer,
    subscriptionStatus: subscription.status || null,
    subscriptionCurrentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null
  };

  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    update.stripeSubscriptionId = null;
  } else if (subscription.id) {
    update.stripeSubscriptionId = subscription.id;
  }

  await User.findOneAndUpdate(query, update, { new: true }).catch(err => {
    console.error('Failed to update user subscription data', err);
  });
}

async function updateUserFromCheckout(session) {
  if (!session?.customer) return;

  const query = [
    { stripeCustomerId: session.customer },
    session.customer_details?.email ? { email: session.customer_details.email.toLowerCase() } : null
  ].filter(Boolean);

  const user = await User.findOne({ $or: query }).catch(err => {
    console.error('Failed to locate user for checkout session', err);
    return null;
  });

  if (!user) {
    return;
  }

  user.stripeCustomerId = session.customer;
  if (session.subscription) {
    user.stripeSubscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;
  }

  await user.save().catch(err => {
    console.error('Failed to persist checkout session updates', err);
  });
}

export async function stripeWebhookHandler(req, res) {
  try {
    ensureStripeConfigured();
  } catch (err) {
    console.error('Stripe webhook received but Stripe is not configured');
    return res.status(500).send('Stripe not configured');
  }

  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString('utf8'));
    }
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await updateUserFromSubscription(event.data.object);
        break;
      case 'checkout.session.completed':
        await updateUserFromCheckout(event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('Error handling Stripe webhook event', err);
    return res.status(500).send('Webhook handler failure');
  }

  res.json({ received: true });
}

export default router;

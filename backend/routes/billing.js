import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
  getStripePriceId,
  resolveAppUrl,
  requireStripeClient
} from '../utils/stripe.js';

const router = Router();

const ensureStripe = res => {
  try {
    return requireStripeClient();
  } catch (err) {
    res.status(503).json({ message: 'Billing is not configured' });
    return null;
  }
};

const ensurePriceId = res => {
  try {
    return getStripePriceId();
  } catch (err) {
    res.status(503).json({ message: 'Billing is not configured' });
    return null;
  }
};

router.get('/plan', auth, async (req, res) => {
  const stripe = ensureStripe(res);
  if (!stripe) return;
  const priceId = ensurePriceId(res);
  if (!priceId) return;

  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    const product = price.product && typeof price.product === 'object'
      ? {
          id: price.product.id,
          name: price.product.name,
          description: price.product.description
        }
      : { id: price.product || null, name: null, description: null };

    res.json({
      id: price.id,
      currency: price.currency,
      unitAmount: price.unit_amount,
      recurring: price.recurring,
      nickname: price.nickname,
      product
    });
  } catch (err) {
    console.error('Failed to load subscription plan from Stripe', err);
    res.status(500).json({ message: 'Failed to load subscription plan' });
  }
});

router.post('/checkout-session', auth, async (req, res) => {
  const stripe = ensureStripe(res);
  if (!stripe) return;
  const priceId = ensurePriceId(res);
  if (!priceId) return;

  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() },
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const baseUrl = resolveAppUrl(req);
    if (!baseUrl) {
      return res.status(500).json({ message: 'Unable to determine application URL' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: user.stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      allow_promotion_codes: true,
      client_reference_id: user._id.toString(),
      subscription_data: {
        metadata: {
          userId: user._id.toString()
        }
      },
      success_url: `${baseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard?checkout=cancelled`
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('Failed to create Stripe checkout session', err);
    const message = err?.message || 'Failed to start checkout session';
    res.status(500).json({ message });
  }
});

router.post('/portal-session', auth, async (req, res) => {
  const stripe = ensureStripe(res);
  if (!stripe) return;

  const customerId = req.user?.stripeCustomerId;
  if (!customerId) {
    return res.status(400).json({ message: 'No billing information found for this user' });
  }

  const baseUrl = resolveAppUrl(req);
  if (!baseUrl) {
    return res.status(500).json({ message: 'Unable to determine application URL' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard`
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create Stripe billing portal session', err);
    const message = err?.message || 'Failed to open billing portal';
    res.status(500).json({ message });
  }
});

export default router;

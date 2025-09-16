import User from '../models/User.js';
import {
  getStripeClient,
  getStripeWebhookSecret
} from '../utils/stripe.js';

const RELEVANT_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted'
]);

const toDate = timestamp => (timestamp ? new Date(timestamp * 1000) : null);

const syncUserSubscription = async (customerId, subscription) => {
  if (!customerId) {
    return;
  }

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) {
    console.warn(`Stripe webhook received for unknown customer ${customerId}`);
    return;
  }

  if (!subscription) {
    user.subscriptionStatus = 'canceled';
    user.subscriptionCurrentPeriodEnd = null;
    user.subscriptionCancelAt = null;
    user.subscriptionCancelAtPeriodEnd = false;
    user.subscriptionPriceId = null;
    user.stripeSubscriptionId = null;
    await user.save();
    return;
  }

  user.stripeSubscriptionId = subscription.id || user.stripeSubscriptionId;
  user.subscriptionStatus = subscription.status || 'canceled';
  user.subscriptionCurrentPeriodEnd = toDate(subscription.current_period_end);
  user.subscriptionCancelAt = toDate(subscription.cancel_at);
  user.subscriptionCancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

  const price = subscription.items?.data?.[0]?.price;
  user.subscriptionPriceId = price?.id || null;

  await user.save();
};

const handleCheckoutCompleted = async (stripe, session) => {
  if (session.mode !== 'subscription') return;
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  if (!subscriptionId) {
    await syncUserSubscription(customerId, null);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncUserSubscription(customerId, subscription);
};

const handleSubscriptionEvent = async event => {
  const subscription = event.data?.object;
  if (!subscription) return;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;
  await syncUserSubscription(customerId, subscription);
};

export default async function stripeWebhook(req, res) {
  const stripe = getStripeClient();
  let webhookSecret;
  try {
    webhookSecret = getStripeWebhookSecret();
  } catch (err) {
    console.warn('Stripe webhook received but webhook secret is not configured');
    return res.status(200).send('ok');
  }

  if (!stripe) {
    console.warn('Stripe webhook received but Stripe is not configured');
    return res.status(200).send('ok');
  }

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return res.status(200).json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripe, event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('Error handling Stripe webhook event', err);
    return res.status(500).send('Webhook handler failed');
  }

  return res.status(200).json({ received: true });
}

const { User } = require('../models');
const PlanSubscription = require('../models/payment.model');
const { STRIPE_PROJECT } = require('../utils/stripeHelpers');
const { isCheckoutSessionPaid } = require('./campaignPayment.service');

const fulfillSubscriptionPayment = async (session) => {
  if (session.metadata?.project && session.metadata.project !== STRIPE_PROJECT) {
    return { ignored: true, reason: 'project mismatch' };
  }

  if (!isCheckoutSessionPaid(session)) {
    return {
      ignored: true,
      reason: 'payment not completed',
      stripeStatus: session.status,
      stripePaymentStatus: session.payment_status,
    };
  }

  const { userId, planName, duration } = session.metadata || {};

  if (!userId || !planName) {
    throw new Error('Missing subscription metadata in Stripe session');
  }

  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + 1);

  const paymentIntent =
    typeof session.payment_intent === 'object' ? session.payment_intent : null;

  const updatedSubscription = await PlanSubscription.findOneAndUpdate(
    { stripeSessionId: session.id },
    {
      userId,
      planName,
      price: session.amount_total / 100,
      duration,
      status: 'active',
      stripeSessionId: session.id,
      transactionId: paymentIntent?.id || session.payment_intent,
      expirationDate,
    },
    { new: true, upsert: true }
  );

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      isSubscribe: true,
      planName,
      subscriptionDate: new Date(),
      subscriptionId: updatedSubscription._id,
    },
    { new: true }
  );

  if (!updatedUser) {
    throw new Error(`User not found for ID: ${userId}`);
  }

  try {
    const { createNotification } = require('./notification.service');
    await createNotification({
      userId,
      title: 'Subscription activated',
      message: `Your ${planName} plan is now active.`,
      type: 'payment',
      link: '/pricing',
      meta: { planName, subscriptionId: updatedSubscription._id },
      email: true,
    });
  } catch (_) {}

  return {
    subscription: updatedSubscription,
    user: updatedUser,
  };
};

module.exports = {
  fulfillSubscriptionPayment,
};

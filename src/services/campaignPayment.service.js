const { Campaign } = require('../models');
const Transaction = require('../models/trancsaction.model');
const transactionService = require('./transaction.service');
const { campaignService } = require('./index');
const {
  STRIPE_PROJECT,
  parsePlatforms,
  FRONTEND_URL,
  toStripeMetadata,
} = require('../utils/stripeHelpers');
const { syncCampaignStatus } = require('./campaignStatus.service');

const createTransactionForCampaign = async (campaign, session) => {
  const paymentIntent =
    typeof session?.payment_intent === 'object'
      ? session.payment_intent
      : null;

  const transactionData = {
    campaignId: campaign._id,
    brandId: campaign.brandId,
    amount: campaign.totalAmount,
    transactionId: {
      transactionId: paymentIntent?.id || session?.payment_intent,
      paymentMethod: session?.payment_method_types,
      payment_status: session?.payment_status,
      paymentMood: session?.mode,
    },
  };

  return transactionService.createTransaction(transactionData);
};

const isCheckoutSessionPaid = (session) => {
  if (session.payment_status === 'paid') {
    return true;
  }

  if (session.status === 'complete') {
    return true;
  }

  if (
    typeof session.payment_intent === 'object' &&
    session.payment_intent.status === 'succeeded'
  ) {
    return true;
  }

  return false;
};

const createCheckoutSessionForCampaign = async (campaign, customerEmail) => {
  const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
  const amount = Math.round(Number(campaign.totalAmount) * 100);

  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: campaign.campaignName,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${FRONTEND_URL}/dashboard/campaigns?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/dashboard/campaigns?payment=cancelled`,
    customer_email: customerEmail,
    metadata: toStripeMetadata({
      brandId: campaign.brandId,
      budget: campaign.budget,
      campaignName: campaign.campaignName,
      totalAmount: campaign.totalAmount,
      project: STRIPE_PROJECT,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      description: campaign.description,
      influencerCount: campaign.influencerCount,
      selectedPlatforms: campaign.selectedPlatforms,
      image: campaign.image,
      campaignId: campaign._id.toString(),
    }),
  });
};

const fulfillCampaignPayment = async (session) => {
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

  let campaign =
    (session.metadata?.campaignId &&
      (await Campaign.findOne({
        _id: session.metadata.campaignId,
        status: 'pending',
      }))) ||
    (await Campaign.findOne({ stripeSessionId: session.id }));

  if (campaign) {
    if (campaign.status !== 'pending') {
      return { alreadyFulfilled: true, campaign };
    }

    syncCampaignStatus(campaign);
    await campaign.save();

    const existingTransaction = await Transaction.findOne({ campaignId: campaign._id });
    if (!existingTransaction) {
      await createTransactionForCampaign(campaign, session);
    }

    return { campaign, source: 'pending' };
  }

  const {
    brandId,
    budget,
    campaignName,
    totalAmount,
    startDate,
    endDate,
    image,
    description,
    influencerCount,
    selectedPlatforms,
  } = session.metadata || {};

  if (!brandId || !campaignName) {
    throw new Error('Missing campaign metadata in Stripe session');
  }

  const campaignData = {
    budget: Number(budget),
    brandId,
    campaignName,
    description: description || '',
    endDate: new Date(endDate).toISOString(),
    influencerCount: Number(influencerCount),
    selectedPlatforms: parsePlatforms(selectedPlatforms),
    startDate: new Date(startDate).toISOString(),
    totalAmount: Number(totalAmount),
    image,
    stripeSessionId: session.id,
  };

  campaign = await campaignService.createCampaign(campaignData);

  const existingTransaction = await Transaction.findOne({ campaignId: campaign._id });
  if (!existingTransaction) {
    await createTransactionForCampaign(campaign, session);
  }

  return { campaign, source: 'metadata' };
};

module.exports = {
  fulfillCampaignPayment,
  createCheckoutSessionForCampaign,
  isCheckoutSessionPaid,
};

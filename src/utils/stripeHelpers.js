const STRIPE_PROJECT = process.env.STRIPE_PROJECT_NAME || 'brand-marketing';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://sayed3000.sobhoy.com').replace(/\/$/, '');

const getStripeRawBody = (req) => req.rawBody || req.body;

const toStripeMetadata = (data) =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (value === undefined || value === null) {
        return [key, ''];
      }
      if (Array.isArray(value)) {
        return [key, value.join(',')];
      }
      return [key, String(value)];
    })
  );

const parsePlatforms = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value) {
    return [];
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const { syncCampaignStatus } = require('../services/campaignStatus.service');

const getCampaignStatusFromDates = (startDate, endDate) => {
  const campaign = { startDate, endDate, acceptedInfluencers: [], drafts: [], influencerCount: 1 };
  return syncCampaignStatus(campaign);
};

module.exports = {
  STRIPE_PROJECT,
  FRONTEND_URL,
  getStripeRawBody,
  toStripeMetadata,
  parsePlatforms,
  getCampaignStatusFromDates,
};

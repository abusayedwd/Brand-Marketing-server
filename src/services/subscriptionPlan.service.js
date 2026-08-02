const SubscriptionPlan = require('../models/subscriptionPlan.model');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const listPublic = async (role) => {
  const query = { isActive: true };
  if (role && role !== 'both') {
    query.$or = [{ role }, { role: 'both' }];
  }
  return SubscriptionPlan.find(query).sort({ sortOrder: 1, price: 1 });
};

const listAll = async () => SubscriptionPlan.find().sort({ sortOrder: 1, createdAt: -1 });

const createPlan = async (data) => {
  const slug =
    data.slug ||
    String(data.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const exists = await SubscriptionPlan.findOne({ slug });
  if (exists) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Plan slug already exists');
  }
  return SubscriptionPlan.create({ ...data, slug });
};

const updatePlan = async (id, data) => {
  const plan = await SubscriptionPlan.findByIdAndUpdate(id, data, { new: true });
  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, 'Plan not found');
  return plan;
};

const deletePlan = async (id) => {
  const plan = await SubscriptionPlan.findByIdAndDelete(id);
  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, 'Plan not found');
  return plan;
};

const getById = async (id) => {
  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, 'Plan not found');
  return plan;
};

const seedDefaultsIfEmpty = async () => {
  const count = await SubscriptionPlan.countDocuments();
  if (count > 0) return;
  await SubscriptionPlan.insertMany([
    {
      name: 'Starter',
      slug: 'starter',
      description: 'Essential access for creators and brands getting started.',
      price: 19,
      durationDays: 30,
      features: ['Campaign access', 'Messaging', 'Basic analytics'],
      role: 'both',
      sortOrder: 1,
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'For growing teams that need more visibility and campaigns.',
      price: 49,
      durationDays: 30,
      features: ['Everything in Starter', 'Priority listing', 'Advanced analytics'],
      role: 'both',
      isPopular: true,
      sortOrder: 2,
    },
    {
      name: 'Business',
      slug: 'business',
      description: 'Full marketplace power for serious brands and agencies.',
      price: 99,
      durationDays: 30,
      features: ['Everything in Pro', 'Dedicated support', 'Unlimited campaigns'],
      role: 'both',
      sortOrder: 3,
    },
  ]);
};

module.exports = {
  listPublic,
  listAll,
  createPlan,
  updatePlan,
  deletePlan,
  getById,
  seedDefaultsIfEmpty,
};

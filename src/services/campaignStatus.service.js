const parseCampaignDate = (value, endOfDay = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
};

const syncCampaignStatus = (campaign) => {
  if (!campaign || campaign.status === 'pending' || campaign.status === 'cancelled') {
    return campaign?.status;
  }

  const now = new Date();
  const startDate = parseCampaignDate(campaign.startDate);
  const endDate = parseCampaignDate(campaign.endDate, true);

  const acceptedCount = campaign.acceptedInfluencers?.length || 0;
  const requiredCount = Number(campaign.influencerCount) || 0;
  const drafts = campaign.drafts || [];
  const approvedDrafts = drafts.filter((draft) => draft.isApproved).length;

  if (endDate && now > endDate) {
    campaign.status = 'completed';
    return campaign.status;
  }

  if (
    requiredCount > 0 &&
    acceptedCount >= requiredCount &&
    approvedDrafts >= requiredCount
  ) {
    campaign.status = 'completed';
    return campaign.status;
  }

  if (acceptedCount > 0 || drafts.length > 0) {
    campaign.status = 'active';
    return campaign.status;
  }

  if (startDate && now >= startDate) {
    campaign.status = 'active';
    return campaign.status;
  }

  campaign.status = 'upComming';
  return campaign.status;
};

const hasObjectId = (list, id) =>
  (list || []).some((item) => item?.toString() === id?.toString());

module.exports = {
  parseCampaignDate,
  syncCampaignStatus,
  hasObjectId,
};

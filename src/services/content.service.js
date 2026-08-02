const ContentPage = require('../models/content.model');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { normalizeRichHtml } = require('../utils/htmlContent');

const defaults = {
  privacy: { title: 'Privacy Policy', body: '<p>Update your privacy policy here.</p>' },
  terms: { title: 'Terms and Conditions', body: '<p>Update your terms here.</p>' },
  about: { title: 'About Us', body: '<p>Tell your brand story here.</p>' },
};

const toPublicPage = (page) => {
  const json = page.toJSON ? page.toJSON() : page;
  return {
    ...json,
    body: normalizeRichHtml(json.body || ''),
  };
};

const getByKey = async (key) => {
  let page = await ContentPage.findOne({ key });
  if (!page && defaults[key]) {
    page = await ContentPage.create({ key, ...defaults[key] });
  }
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Content not found');
  }

  // Auto-heal previously double-encoded bodies
  const clean = normalizeRichHtml(page.body || '');
  if (clean && clean !== page.body) {
    page.body = clean;
    await page.save();
  }

  return toPublicPage(page);
};

const getAll = async () => {
  const keys = Object.keys(defaults);
  const pages = await Promise.all(keys.map((key) => getByKey(key)));
  return pages;
};

const upsert = async (key, { title, body }, adminId) => {
  if (!defaults[key]) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid content key');
  }
  const cleanBody = normalizeRichHtml(body ?? defaults[key].body);
  const page = await ContentPage.findOneAndUpdate(
    { key },
    {
      title: title || defaults[key].title,
      body: cleanBody,
      updatedBy: adminId,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return toPublicPage(page);
};

module.exports = { getByKey, getAll, upsert };

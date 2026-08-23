/**
 * Rewrite stored image fields to a Cloudinary https URL string.
 * Old { url: "/uploads/...", path } objects become a public URL.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const {
  DEFAULT_IMAGE_URL,
  isHttpUrl,
} = require('../utils/uploadToCloudinary');

const toUrl = (image, emptyAsDefault = true) => {
  if (image == null || image === '') {
    return emptyAsDefault ? DEFAULT_IMAGE_URL : '';
  }
  if (typeof image === 'string') {
    return isHttpUrl(image) ? image : DEFAULT_IMAGE_URL;
  }
  if (typeof image === 'object') {
    const url = image.url || '';
    if (isHttpUrl(url)) return url;
    return emptyAsDefault ? DEFAULT_IMAGE_URL : '';
  }
  return emptyAsDefault ? DEFAULT_IMAGE_URL : '';
};

const needsRewrite = (image) => {
  if (image == null) return false;
  if (typeof image === 'object') return true;
  if (typeof image === 'string' && !isHttpUrl(image)) return true;
  return false;
};

async function migrateCollection(name, emptyAsDefault) {
  const col = mongoose.connection.collection(name);
  const docs = await col.find({ image: { $exists: true } }).toArray();
  let updated = 0;
  for (const doc of docs) {
    if (!needsRewrite(doc.image)) continue;
    await col.updateOne(
      { _id: doc._id },
      { $set: { image: toUrl(doc.image, emptyAsDefault) } }
    );
    updated += 1;
  }
  return { total: docs.length, updated };
}

async function migrateCampaignDrafts() {
  const col = mongoose.connection.collection('campaigns');
  const docs = await col.find({ 'drafts.image': { $exists: true } }).toArray();
  let updated = 0;
  for (const doc of docs) {
    let changed = false;
    const drafts = (doc.drafts || []).map((draft) => {
      if (!needsRewrite(draft.image)) return draft;
      changed = true;
      return { ...draft, image: toUrl(draft.image, true) };
    });
    if (changed) {
      await col.updateOne({ _id: doc._id }, { $set: { drafts } });
      updated += 1;
    }
  }
  return { total: docs.length, updated };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL);
  const names = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name);
  console.log('collections', names.join(', '));

  const jobs = [
    ['users', true],
    ['campaigns', true],
    ['withdrawalrequests', false],
    ['draftapproves', true],
  ];

  for (const [name, emptyAsDefault] of jobs) {
    if (!names.includes(name)) {
      console.log(`skip missing collection: ${name}`);
      continue;
    }
    const result = await migrateCollection(name, emptyAsDefault);
    console.log(`${name}: scanned ${result.total}, updated ${result.updated}`);
  }

  if (names.includes('campaigns')) {
    const drafts = await migrateCampaignDrafts();
    console.log(`campaign drafts: scanned ${drafts.total}, updated ${drafts.updated}`);
  }

  await mongoose.disconnect();
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

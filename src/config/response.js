const { normalizeImagesDeep } = require('../utils/uploadToCloudinary');

const response = (response = {}) => {
  const responseObject = {
    code: response.statusCode,
    message: response.message,
    data: {},
  };

  if (response.type) {
    responseObject.data.type = response.type;
  }

  if (response.data) {
    const raw =
      typeof response.data.toJSON === 'function' ? response.data.toJSON() : response.data;
    const payload = JSON.parse(JSON.stringify(raw));
    normalizeImagesDeep(payload);
    responseObject.data.attributes = payload;
  }

  if (response.token) {
    responseObject.data.token = response.tokens;
  }

  return responseObject;
};

module.exports = response;

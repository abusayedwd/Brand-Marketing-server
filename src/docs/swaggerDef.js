const { version } = require('../../package.json');
const config = require('../config/config');

const host = process.env.BACKEND_IP || 'localhost';
const port = config.port || process.env.PORT || 3050;

const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'Brivio API',
    version,
    description:
      'Brand × Creator marketing platform API — auth, campaigns, payments, wallet, notifications, CMS, support.',
  },
  servers: [
    {
      url: `http://${host}:${port}/v1`,
      description: 'Local / configured API',
    },
  ],
};

module.exports = swaggerDef;

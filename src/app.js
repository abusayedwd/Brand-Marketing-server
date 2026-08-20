const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');
const { subscriptionController, campaignController } = require('./controllers');

const app = express();

app.set('trust proxy', 1);

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.options('*', cors());

// Stripe webhooks need the raw body for signature verification
app.post(
  '/v1/payments/webhook-subscription',
  express.raw({ type: 'application/json' }),
  subscriptionController.stripeWebhook
);
app.post(
  '/v1/payments/webhook-createCampaign',
  express.raw({ type: 'application/json' }),
  campaignController.stripeCampaignWebhook
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(xss());
app.use(mongoSanitize());
app.use(compression());
app.use(express.static('public'));

app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'API is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/v1', routes);

app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, `Route ${req.originalUrl} not found`));
});

app.use(errorConverter);
app.use(errorHandler);

module.exports = app;

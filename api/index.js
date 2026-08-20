// Optional serverless entry (Vercel / similar). Prefer `npm start` / Railway for production.
try {
  module.exports = require('../src/main');
} catch (error) {
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Failed to load application',
      message: error.message,
    });
  };
}

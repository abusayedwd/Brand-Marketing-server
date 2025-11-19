// Vercel serverless function entry point
try {
  module.exports = require('../src/index');
} catch (error) {
  console.error('Error loading index:', error);
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Failed to load application',
      message: error.message,
      stack: error.stack
    });
  };
}

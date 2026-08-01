// Vercel serverless function entry point
console.log('API/index.js loading...');

try {
  console.log('Requiring src/index...');
  module.exports = require('../src/main');
  console.log('src/index loaded successfully');
} catch (error) {
  console.error('FATAL ERROR loading index:', error);
  module.exports = (req, res) => {
    console.error('Fallback handler called due to load error');
    res.status(500).json({
      error: 'Failed to load application',
      message: error.message,
      stack: error.stack
    });
  };
}

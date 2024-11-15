const { sequelize, checkConnection, isConnected } = require('../config/db.config');

const checkDatabaseConnection = async (req, res, next) => {
  try {
    if (!isConnected) {
      const connected = await checkConnection();
      if (!connected) {
        return res.status(503).json({ 
          message: 'Database connection is currently unavailable. Please try again in a few moments.' 
        });
      }
    }
    next();
  } catch (error) {
    console.error('Database connection check failed:', error);
    return res.status(503).json({ 
      message: 'Database connection error. Please try again in a few moments.' 
    });
  }
};

module.exports = checkDatabaseConnection; 
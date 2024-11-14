const sequelize = require('../config/db.config');

const cleanupConnections = async () => {
  try {
    await sequelize.connectionManager.close();
    await sequelize.connectionManager.initPools();
    console.log('Database connections cleaned up');
  } catch (error) {
    console.error('Error cleaning up connections:', error);
  }
};

// Clean up connections every 30 minutes
setInterval(cleanupConnections, 30 * 60 * 1000);

module.exports = { cleanupConnections }; 
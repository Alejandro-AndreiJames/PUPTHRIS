const sequelize = require('../config/db.config');

const cleanupConnections = async () => {
  try {
    if (sequelize.connectionManager.pool) {
      await sequelize.connectionManager.pool.drain();
      await sequelize.connectionManager.pool.clear();
      console.log('Idle database connections cleaned up');
    }
  } catch (error) {
    console.error('Error cleaning up connections:', error);
  }
};

setInterval(cleanupConnections, 60 * 60 * 1000);

module.exports = { cleanupConnections }; 
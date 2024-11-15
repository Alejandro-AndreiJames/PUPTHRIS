const { sequelize, isConnected } = require('../config/db.config');

const cleanupConnections = async () => {
  if (!isConnected) return;

  try {
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM information_schema.processlist WHERE command = "Sleep"');
    const sleepingConnections = results[0].count;

    if (sleepingConnections > 5) {
      await sequelize.query('KILL CONNECTION_ID()');
      console.log(`Cleaned up ${sleepingConnections - 5} idle connections`);
    }
  } catch (error) {
    console.error('Error during connection cleanup:', error);
  }
};

const cleanupInterval = 30 * 60 * 1000; // 30 minutes
setInterval(cleanupConnections, cleanupInterval);

module.exports = { cleanupConnections }; 
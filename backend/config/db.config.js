const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  pool: {
    max: 20,
    min: 5,
    acquire: 60000,
    idle: 30000
  },
  dialectOptions: {
    connectTimeout: 60000
  },
  retry: {
    max: 5,
    timeout: 30000
  },
  logging: false
});

// Enhanced connection management
let isConnected = false;

const checkConnection = async () => {
  try {
    await sequelize.authenticate();
    isConnected = true;
    return true;
  } catch (error) {
    console.error('❌ Connection check failed:', error);
    isConnected = false;
    return false;
  }
};

// Initial connection
const initializeConnection = async () => {
  try {
    await sequelize.authenticate();
    isConnected = true;
    console.log('🐬 Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    isConnected = false;
    process.exit(1);
  }
};

// Periodic connection check
setInterval(checkConnection, 30000);

// Initialize connection
initializeConnection();

module.exports = {
  sequelize,
  checkConnection,
  isConnected
};

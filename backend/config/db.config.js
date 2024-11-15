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
    idle: 30000,
  },
  dialectOptions: {
    connectTimeout: 60000,
  },
  retry: {
    max: 3,
    timeout: 30000
  },
  logging: false
});

// Add connection error handling
const maxRetries = 5;
let retries = 0;

const connectWithRetry = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    retries = 0; // Reset retries on successful connection
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    if (retries < maxRetries) {
      retries++;
      console.log(`Retrying connection... Attempt ${retries} of ${maxRetries}`);
      setTimeout(connectWithRetry, 5000); // Wait 5 seconds before retrying
    }
  }
};

// Initial connection attempt
connectWithRetry();

module.exports = sequelize;

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,          
    acquire: 60000,   
    idle: 10000,     
  },
  dialectOptions: {
    connectTimeout: 60000,
    // Add query timeout
    options: {
      requestTimeout: 30000
    }
  },
  retry: {
    max: 3 
  }
});

module.exports = sequelize;

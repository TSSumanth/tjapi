const mysql = require('mysql2/promise');

// Create a function to get a pool with custom configuration
const createPool = (config) => {
  return mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    connectTimeout: 30000,
    acquireTimeout: 30000,
    timeout: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    debug: false
  });
};

// Create the production pool with production configuration
const productionPool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Test the production connection
productionPool.getConnection()
  .then(connection => {
    console.log('Successfully connected to the production database');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the production database:', err);
  });

// Export both the pool and a function to create new pools
module.exports = {
  pool: productionPool,
  getConnection: async (config) => {
    // If no config is provided, use the production pool
    if (!config) {
      return productionPool.getConnection();
    }
    // Otherwise create a new pool with the provided config
    const pool = createPool(config);
    return pool.getConnection();
  }
};

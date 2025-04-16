const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../../app');
const { getConnection } = require('../../db');
const fs = require('fs');
const path = require('path');

chai.use(chaiHttp);
const expect = chai.expect;

// Test database configuration
const TEST_DB_CONFIG = {
    host: process.env.TEST_DB_HOST,
    user: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD,
    database: process.env.TEST_DB_NAME
};

// Helper function to setup test database
async function setupTestDatabase() {
    let connection;
    try {
        // First connect without selecting a database
        connection = await getConnection({
            ...TEST_DB_CONFIG,
            database: null
        });

        // Create the database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${TEST_DB_CONFIG.database}`);
        console.log(`Database ${TEST_DB_CONFIG.database} created or already exists`);

        // Now connect to the specific database
        await connection.release();
        connection = await getConnection(TEST_DB_CONFIG);

        // Read and execute migration script
        const migrationPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
        console.log('Reading migration file from:', migrationPath);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found at ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('Migration SQL loaded successfully');

        // Split the SQL file into individual statements
        const statements = migrationSQL.split(';').filter(statement => statement.trim());
        console.log(`Found ${statements.length} SQL statements to execute`);

        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                console.log('Executing statement:', statement.substring(0, 100) + '...');
                await connection.query(statement);
            }
        }

        // Verify tables were created
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tables in database:', tables.map(t => t[`Tables_in_${TEST_DB_CONFIG.database}`]));

        console.log('Test database setup completed successfully');
    } catch (error) {
        console.error('Error setting up test database:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.release();
        }
    }
}

// Helper function to clear test database
async function clearTestDatabase() {
    let connection;
    try {
        connection = await getConnection(TEST_DB_CONFIG);
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        const tables = [
            'strategies',
            'strategy_notes',
            'stock_trades',
            'option_trades',
            'stock_orders',
            'option_orders',
            'tags',
            'marketanalysis',
            'action_items',
            'profit_loss_report'
        ];

        for (const table of tables) {
            await connection.query(`TRUNCATE TABLE ${table}`);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
        console.error('Error clearing test database:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.release();
        }
    }
}

// Helper function to destroy test database
async function destroyTestDatabase() {
    let connection;
    try {
        connection = await getConnection({
            ...TEST_DB_CONFIG,
            database: null // Connect without selecting a database
        });
        // Drop the test database
        await connection.query(`DROP DATABASE IF EXISTS ${TEST_DB_CONFIG.database}`);
        console.log('Test database destroyed successfully');
    } catch (error) {
        console.error('Error destroying test database:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.release();
        }
    }
}

// Helper function to create test data
async function createTestData() {
    let connection;
    try {
        connection = await getConnection(TEST_DB_CONFIG);
        // Add test data here
        await connection.query(`
            INSERT INTO strategies (name, description, status, created_at, symbol) 
            VALUES ('Test Strategy', 'This is a test strategy', 'OPEN', NOW(), 'TEST');
        `);
    } catch (error) {
        console.error('Error creating test data:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.release();
        }
    }
}

module.exports = {
    setupTestDatabase,
    clearTestDatabase,
    destroyTestDatabase,
    createTestData,
    expect
}; 